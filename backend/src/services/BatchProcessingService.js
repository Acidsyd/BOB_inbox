const { createClient } = require('@supabase/supabase-js');

class BatchProcessingService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL, 
      process.env.SUPABASE_SERVICE_KEY
    );
    this.progressTracking = new Map(); // Track progress for multiple uploads
  }

  /**
   * Process leads in batches for optimal performance with CSV-level duplicate removal
   * @param {Array} leads - Array of lead objects
   * @param {string} leadListId - Lead list ID
   * @param {string} organizationId - Organization ID  
   * @param {string} createdBy - User ID
   * @param {Function} progressCallback - Progress callback function
   * @returns {Object} Processing results
   */
  async processBatchLeads(leads, leadListId, organizationId, createdBy, progressCallback = null) {
    console.log(`🚀 Starting batch processing: ${leads.length} leads`);

    // Step 1: Remove CSV-level duplicates (10% of progress)
    if (progressCallback) progressCallback(0, 'Removing duplicate emails from CSV...');
    
    const { uniqueLeads, csvDuplicates } = this.removeCsvDuplicates(leads);
    console.log(`📊 Removed ${csvDuplicates} duplicate emails from CSV, processing ${uniqueLeads.length} unique leads`);

    const results = {
      total: leads.length,
      inserted: 0,
      csvDuplicates: csvDuplicates,
      failed: 0,
      errors: []
    };

    if (uniqueLeads.length === 0) {
      if (progressCallback) progressCallback(100, 'Complete - no leads to process');
      return results;
    }

    const BATCH_SIZE = 50; // Process 50 leads at a time (reduced for parameter limit safety)
    const totalBatches = Math.ceil(uniqueLeads.length / BATCH_SIZE);

    if (progressCallback) progressCallback(10, 'Processing leads in batches...');

    try {
      // Step 2: Process leads in batches (10% - 90% progress)
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startIdx = batchIndex * BATCH_SIZE;
        const endIdx = Math.min(startIdx + BATCH_SIZE, uniqueLeads.length);
        const batch = uniqueLeads.slice(startIdx, endIdx);

        console.log(`📦 Processing batch ${batchIndex + 1}/${totalBatches} (${batch.length} leads)`);

        // Prepare leads for insertion
        const batchToInsert = batch.map(lead => ({
          ...lead,
          lead_list_id: leadListId,
          organization_id: organizationId,
          created_by: createdBy,
          status: 'active',
          created_at: new Date().toISOString()
        }));

        // Batch insert leads
        const insertResult = await this.batchInsertLeads(batchToInsert);
        results.inserted += insertResult.inserted;
        results.failed += insertResult.failed;
        
        if (insertResult.errors.length > 0) {
          results.errors.push(...insertResult.errors);
        }

        // Update progress (10% + batch progress * 80%)
        const batchProgress = ((batchIndex + 1) / totalBatches) * 80;
        if (progressCallback) {
          progressCallback(
            10 + batchProgress, 
            `Processed batch ${batchIndex + 1}/${totalBatches} - ${results.inserted} inserted`
          );
        }
      }

      // Step 3: Finalization (90% - 100% progress)
      if (progressCallback) progressCallback(95, 'Finalizing...');

      console.log(`✅ Batch processing complete: ${results.inserted} inserted, ${csvDuplicates} CSV duplicates removed, ${results.failed} failed`);
      
      if (progressCallback) progressCallback(100, 'Complete!');

      return results;

    } catch (error) {
      console.error('❌ Batch processing error:', error);
      if (progressCallback) progressCallback(-1, `Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove duplicate emails within the CSV file itself
   * @param {Array} leads - Array of leads from CSV
   * @returns {Object} {uniqueLeads, csvDuplicates}
   */
  removeCsvDuplicates(leads) {
    const uniqueEmails = new Set();
    const uniqueLeads = [];
    let csvDuplicates = 0;

    for (const lead of leads) {
      if (!lead.email) continue; // Skip leads without email
      
      const normalizedEmail = lead.email.toLowerCase().trim();
      
      if (uniqueEmails.has(normalizedEmail)) {
        csvDuplicates++;
        console.log(`📋 Duplicate in CSV: ${lead.email}`);
      } else {
        uniqueEmails.add(normalizedEmail);
        uniqueLeads.push(lead);
      }
    }

    return { uniqueLeads, csvDuplicates };
  }

  /**
   * Batch insert leads using Supabase bulk insert
   * @param {Array} leadsToInsert - Prepared leads for insertion
   * @returns {Object} Insert results
   */
  async batchInsertLeads(leadsToInsert) {
    console.log(`💾 Batch inserting ${leadsToInsert.length} leads`);

    try {
      const { data, error } = await this.supabase
        .from('leads')
        .insert(leadsToInsert)
        .select('id, email');

      if (error) {
        console.error('Batch insert error:', error);
        throw error;
      }

      const insertedCount = data ? data.length : 0;
      console.log(`✅ Successfully inserted ${insertedCount} leads`);

      return {
        inserted: insertedCount,
        failed: Math.max(0, leadsToInsert.length - insertedCount),
        errors: []
      };

    } catch (error) {
      console.error('Batch insert failed:', error);
      return {
        inserted: 0,
        failed: leadsToInsert.length,
        errors: [`❌ Failed to process ${leadsToInsert.length} leads: ${error.message}`]
      };
    }
  }

  /**
   * Store progress for tracking
   * @param {string} uploadId - Unique upload identifier
   * @param {number} progress - Progress percentage (0-100)
   * @param {string} message - Progress message
   */
  updateProgress(uploadId, progress, message) {
    this.progressTracking.set(uploadId, {
      progress,
      message,
      timestamp: Date.now()
    });
  }

  /**
   * Get progress for an upload
   * @param {string} uploadId - Upload identifier
   * @returns {Object} Progress data
   */
  getProgress(uploadId) {
    return this.progressTracking.get(uploadId) || { 
      progress: 0, 
      message: 'Not started', 
      timestamp: Date.now() 
    };
  }

  /**
   * Clean up old progress data
   * @param {number} maxAgeMs - Maximum age in milliseconds
   */
  cleanupProgress(maxAgeMs = 3600000) { // 1 hour default
    const cutoff = Date.now() - maxAgeMs;
    for (const [uploadId, data] of this.progressTracking.entries()) {
      if (data.timestamp < cutoff) {
        this.progressTracking.delete(uploadId);
      }
    }
  }
}

module.exports = new BatchProcessingService();