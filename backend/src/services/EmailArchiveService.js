const { createClient } = require('@supabase/supabase-js');

/**
 * Email Archive Service
 *
 * Manages archiving old email content to Supabase Storage to reduce database size.
 * - Uploads email content (HTML/plain text) to storage buckets
 * - Downloads archived emails when needed
 * - Caches frequently accessed emails
 * - Transparent to the application - emails appear the same whether in DB or storage
 */

class EmailArchiveService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    this.bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'email-archives';
    this.cache = new Map(); // Simple in-memory cache
    this.cacheMaxSize = 100; // Cache up to 100 emails
    this.cacheMaxAge = 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Initialize the storage bucket
   * Creates the bucket if it doesn't exist
   */
  async initializeBucket() {
    try {
      // Check if bucket exists
      const { data: buckets, error: listError } = await this.supabase.storage.listBuckets();

      if (listError) {
        console.error('Error listing buckets:', listError);
        return { error: listError };
      }

      const bucketExists = buckets.some(b => b.name === this.bucketName);

      if (!bucketExists) {
        // Create bucket
        const { data, error } = await this.supabase.storage.createBucket(this.bucketName, {
          public: false, // Private bucket - requires authentication
          fileSizeLimit: 10485760, // 10MB max per file
          allowedMimeTypes: ['text/html', 'text/plain']
        });

        if (error) {
          console.error('Error creating bucket:', error);
          return { error };
        }

        console.log(`✅ Created storage bucket: ${this.bucketName}`);
      } else {
        console.log(`✅ Storage bucket exists: ${this.bucketName}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Error initializing bucket:', error);
      return { error };
    }
  }

  /**
   * Generate storage path for an email
   * Format: YYYY/MM/message_id.html (or .txt)
   */
  generateStoragePath(messageId, type = 'html') {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const extension = type === 'html' ? 'html' : 'txt';

    return `${year}/${month}/${messageId}.${extension}`;
  }

  /**
   * Upload email content to storage
   * @param {string} messageId - The message ID
   * @param {string} contentHtml - HTML content
   * @param {string} contentPlain - Plain text content
   * @returns {object} - { htmlPath, plainPath } or { error }
   */
  async uploadEmailContent(messageId, contentHtml, contentPlain) {
    try {
      const results = {};

      // Upload HTML content
      if (contentHtml) {
        const htmlPath = this.generateStoragePath(messageId, 'html');
        const { data: htmlData, error: htmlError } = await this.supabase.storage
          .from(this.bucketName)
          .upload(htmlPath, contentHtml, {
            contentType: 'text/html',
            upsert: true // Overwrite if exists
          });

        if (htmlError) {
          console.error('Error uploading HTML:', htmlError);
          return { error: htmlError };
        }

        results.htmlPath = htmlPath;
      }

      // Upload plain text content
      if (contentPlain) {
        const plainPath = this.generateStoragePath(messageId, 'txt');
        const { data: plainData, error: plainError } = await this.supabase.storage
          .from(this.bucketName)
          .upload(plainPath, contentPlain, {
            contentType: 'text/plain',
            upsert: true
          });

        if (plainError) {
          console.error('Error uploading plain text:', plainError);
          return { error: plainError };
        }

        results.plainPath = plainPath;
      }

      return results;
    } catch (error) {
      console.error('Error in uploadEmailContent:', error);
      return { error };
    }
  }

  /**
   * Download email content from storage
   * @param {string} storagePath - Path in storage (e.g., "2025/01/message-id.html")
   * @returns {string} - Content or null
   */
  async downloadEmailContent(storagePath) {
    try {
      // Check cache first
      const cached = this.getFromCache(storagePath);
      if (cached) {
        return cached;
      }

      // Download from storage
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .download(storagePath);

      if (error) {
        console.error('Error downloading from storage:', error);
        return null;
      }

      // Convert blob to text
      const content = await data.text();

      // Cache the content
      this.addToCache(storagePath, content);

      return content;
    } catch (error) {
      console.error('Error in downloadEmailContent:', error);
      return null;
    }
  }

  /**
   * Archive a conversation message
   * Uploads content to storage and returns storage URLs
   */
  async archiveMessage(message) {
    try {
      const { id, content_html, content_plain } = message;

      // Upload to storage
      const uploadResult = await this.uploadEmailContent(id, content_html, content_plain);

      if (uploadResult.error) {
        return { error: uploadResult.error };
      }

      return {
        storage_html_path: uploadResult.htmlPath,
        storage_plain_path: uploadResult.plainPath
      };
    } catch (error) {
      console.error('Error archiving message:', error);
      return { error };
    }
  }

  /**
   * Retrieve archived message content
   * Returns content from storage if needed
   */
  async retrieveMessage(message) {
    try {
      const result = { ...message };

      // If content is in storage, fetch it
      if (message.storage_html_path && !message.content_html) {
        result.content_html = await this.downloadEmailContent(message.storage_html_path);
      }

      if (message.storage_plain_path && !message.content_plain) {
        result.content_plain = await this.downloadEmailContent(message.storage_plain_path);
      }

      return result;
    } catch (error) {
      console.error('Error retrieving message:', error);
      return message; // Return original if error
    }
  }

  /**
   * Delete archived content from storage
   */
  async deleteArchivedContent(storagePath) {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([storagePath]);

      if (error) {
        console.error('Error deleting from storage:', error);
        return { error };
      }

      // Remove from cache
      this.removeFromCache(storagePath);

      return { success: true };
    } catch (error) {
      console.error('Error in deleteArchivedContent:', error);
      return { error };
    }
  }

  /**
   * Cache management
   */
  addToCache(key, value) {
    // Implement simple LRU-style cache
    if (this.cache.size >= this.cacheMaxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  getFromCache(key) {
    const cached = this.cache.get(key);

    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > this.cacheMaxAge) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  removeFromCache(key) {
    this.cache.delete(key);
  }

  clearCache() {
    this.cache.clear();
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    try {
      // Get bucket info
      const { data: buckets } = await this.supabase.storage.listBuckets();
      const bucket = buckets?.find(b => b.name === this.bucketName);

      if (!bucket) {
        return { error: 'Bucket not found' };
      }

      // List all files in bucket
      const { data: files, error } = await this.supabase.storage
        .from(this.bucketName)
        .list('', {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        return { error };
      }

      // Calculate total size
      const totalSize = files.reduce((sum, file) => sum + (file.metadata?.size || 0), 0);
      const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);

      return {
        bucketName: this.bucketName,
        fileCount: files.length,
        totalSize: totalSizeMB + ' MB',
        cacheSize: this.cache.size,
        cacheMaxSize: this.cacheMaxSize
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return { error };
    }
  }
}

module.exports = EmailArchiveService;
