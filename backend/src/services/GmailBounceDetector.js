const OAuth2Service = require('./OAuth2Service');
const BounceTrackingService = require('./BounceTrackingService');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Gmail Bounce Detector - Passive bounce detection via email parsing
 * Works with standard OAuth2 permissions (gmail.readonly)
 * Scans for delivery failure messages and correlates with sent emails
 */
class GmailBounceDetector {
  constructor() {
    this.oauth2Service = new OAuth2Service();
    this.bounceTracker = new BounceTrackingService();
    
    // Gmail bounce message patterns
    this.bouncePatterns = [
      'delivery to the following recipient failed',
      'message could not be delivered',
      'recipient address rejected',
      'user unknown',
      'mailbox unavailable',
      'domain not found',
      'permanent failure',
      'bounce message',
      'undelivered mail returned to sender'
    ];
    
    // Gmail bounce subject patterns
    this.bounceSubjectPatterns = [
      'delivery status notification',
      'returned mail',
      'undelivered mail',
      'mail delivery subsystem',
      'failure notice',
      'delivery failure'
    ];
  }

  /**
   * Scan Gmail account for bounce messages and detect bounces
   * @param {string} emailAccount - Email account to scan
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Scan results
   */
  async scanForBounces(emailAccount, organizationId) {
    console.log(`🔍 Scanning ${emailAccount} for bounce messages...`);
    
    try {
      // Get Gmail client
      const gmail = await this.oauth2Service.getGmailClient(emailAccount, organizationId);
      
      // Search for potential bounce messages from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const after = Math.floor(sevenDaysAgo.getTime() / 1000);
      
      // Build search query for bounce messages
      const searchQuery = [
        `after:${after}`,
        `(from:mailer-daemon OR from:"mail delivery subsystem")`,
        `(subject:"delivery status notification" OR subject:"returned mail" OR subject:"undelivered mail")`
      ].join(' ');
      
      console.log(`📬 Searching Gmail with query: ${searchQuery}`);
      
      const searchResponse = await gmail.users.messages.list({
        userId: 'me',
        q: searchQuery,
        maxResults: 50
      });
      
      const messages = searchResponse.data.messages || [];
      console.log(`📨 Found ${messages.length} potential bounce messages`);
      
      if (messages.length === 0) {
        return { bouncesDetected: 0, emailsProcessed: 0 };
      }
      
      // Process each potential bounce message
      let bouncesDetected = 0;
      
      for (const message of messages) {
        try {
          const bounceResult = await this.processPotentialBounce(gmail, message.id, emailAccount, organizationId);
          if (bounceResult.isBounce) {
            bouncesDetected++;
          }
        } catch (error) {
          console.error(`❌ Error processing message ${message.id}:`, error.message);
        }
      }
      
      console.log(`✅ Bounce scan complete: ${bouncesDetected} bounces detected from ${messages.length} messages`);
      
      return {
        bouncesDetected,
        emailsProcessed: messages.length,
        account: emailAccount
      };
      
    } catch (error) {
      console.error(`❌ Gmail bounce scan failed for ${emailAccount}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Process a potential bounce message
   * @param {Object} gmail - Gmail API client
   * @param {string} messageId - Gmail message ID
   * @param {string} emailAccount - Email account
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Processing result
   */
  async processPotentialBounce(gmail, messageId, emailAccount, organizationId) {
    try {
      // Get the full message
      const messageResponse = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });
      
      const message = messageResponse.data;
      const headers = message.payload.headers || [];
      const subject = this.getHeader(headers, 'Subject') || '';
      const from = this.getHeader(headers, 'From') || '';
      
      // Check if this looks like a bounce message
      const isBounceSubject = this.bounceSubjectPatterns.some(pattern => 
        subject.toLowerCase().includes(pattern.toLowerCase())
      );
      
      const isBounceFrom = from.toLowerCase().includes('mailer-daemon') || 
                          from.toLowerCase().includes('mail delivery subsystem');
      
      if (!isBounceSubject && !isBounceFrom) {
        return { isBounce: false, reason: 'Not a bounce message pattern' };
      }
      
      console.log(`🔍 Processing potential bounce: "${subject}" from "${from}"`);
      
      // Extract message body
      const bodyText = this.extractMessageBody(message.payload);
      
      // Look for bounced email address and original Message-ID
      const bounceInfo = this.parseBounceMessage(bodyText, subject);
      
      if (!bounceInfo.recipientEmail) {
        console.log('⚠️ Could not extract recipient email from bounce message');
        return { isBounce: false, reason: 'No recipient email found' };
      }
      
      // Find the original scheduled email in our database
      const originalEmail = await this.findOriginalEmail(bounceInfo, emailAccount, organizationId);
      
      if (!originalEmail) {
        console.log(`⚠️ Could not find original email for bounced recipient: ${bounceInfo.recipientEmail}`);
        return { isBounce: false, reason: 'Original email not found in database' };
      }
      
      console.log(`✅ Detected bounce: ${originalEmail.id} to ${bounceInfo.recipientEmail}`);
      
      // Record the bounce
      await this.bounceTracker.recordBounce({
        bounceType: bounceInfo.bounceType,
        bounceReason: bounceInfo.bounceReason,
        recipientEmail: bounceInfo.recipientEmail,
        provider: 'gmail'
      }, originalEmail.id, organizationId);
      
      return { 
        isBounce: true, 
        recipientEmail: bounceInfo.recipientEmail,
        bounceType: bounceInfo.bounceType,
        originalEmailId: originalEmail.id
      };
      
    } catch (error) {
      console.error(`❌ Error processing bounce message ${messageId}:`, error.message);
      return { isBounce: false, reason: `Processing error: ${error.message}` };
    }
  }
  
  /**
   * Extract message body text from Gmail message payload (recursive)
   */
  extractMessageBody(payload) {
    let bodyText = '';
    
    // Recursive function to extract text from all parts
    const extractFromParts = (parts) => {
      if (!parts) return '';
      
      let text = '';
      for (const part of parts) {
        // If this part has body data, try to extract it
        if (part.body && part.body.data) {
          try {
            const partText = Buffer.from(part.body.data, 'base64').toString('utf-8');
            if (partText.trim().length > 0) {
              text += partText + '\n';
            }
          } catch (error) {
            console.error('🔧 Failed to decode part:', part.mimeType, error.message);
          }
        }
        
        // Recursively check nested parts
        if (part.parts) {
          text += extractFromParts(part.parts);
        }
      }
      
      return text;
    };
    
    // Handle single part message with direct body data
    if (payload.body && payload.body.data) {
      try {
        bodyText = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      } catch (error) {
        console.error('🔧 Failed to decode payload body:', error.message);
      }
    } else if (payload.parts) {
      // Multi-part message - extract recursively from all parts
      bodyText = extractFromParts(payload.parts);
    }
    
    return bodyText;
  }
  
  /**
   * Parse bounce message to extract bounce information
   */
  parseBounceMessage(bodyText, subject) {
    const lowerBody = bodyText.toLowerCase();
    const lowerSubject = subject.toLowerCase();
    
    // Multiple strategies to extract bounced email address
    let recipientEmail = null;
    
    // Strategy 1: Look for email addresses in common bounce message patterns
    const bouncePatterns = [
      /the following address(?:es)? failed:[^a-zA-Z0-9]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /delivery to the following recipient failed:[^a-zA-Z0-9]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /recipient address rejected[^a-zA-Z0-9]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /user unknown[^a-zA-Z0-9]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/m, // Email on its own line
      /to:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /for\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /recipient.*?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
    ];
    
    for (const pattern of bouncePatterns) {
      const match = bodyText.match(pattern);
      if (match && match[1]) {
        recipientEmail = match[1];
        console.log(`📧 Extracted email using pattern: ${recipientEmail}`);
        break;
      }
    }
    
    // Strategy 2: If no specific pattern matches, look for any email addresses in the message
    if (!recipientEmail) {
      const allEmailMatches = bodyText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g);
      if (allEmailMatches) {
        // Filter out common non-recipient emails (mailer-daemon, etc.)
        const filteredEmails = allEmailMatches.filter(email => {
          const lowerEmail = email.toLowerCase();
          return !lowerEmail.includes('mailer-daemon') && 
                 !lowerEmail.includes('postmaster') &&
                 !lowerEmail.includes('noreply') &&
                 !lowerEmail.includes('no-reply') &&
                 !lowerEmail.endsWith('.googlemail.com') &&
                 !lowerEmail.endsWith('google.com');
        });
        
        if (filteredEmails.length > 0) {
          recipientEmail = filteredEmails[0]; // Take the first non-system email
          console.log(`📧 Extracted email from general search: ${recipientEmail}`);
        }
      }
    }
    
    if (!recipientEmail) {
      console.log('❌ Could not extract recipient email from bounce message');
      console.log(`📝 Subject: ${subject}`);
      console.log(`📝 Body preview: ${bodyText.substring(0, 200)}...`);
    }
    
    // Determine bounce type based on content
    let bounceType = 'soft'; // Default to soft bounce
    let bounceReason = 'Email delivery failed';
    
    // Hard bounce indicators
    const hardBounceIndicators = [
      'permanent failure',
      'user unknown',
      'recipient address rejected',
      'domain not found',
      'domain name not found',
      'mailbox unavailable',
      'invalid recipient',
      'no such user',
      'nxdomain',
      'inesistente', // Italian: non-existent
      'indirizzo non trovato' // Italian: address not found
    ];
    
    // Soft bounce indicators
    const softBounceIndicators = [
      'temporary failure',
      'mailbox full',
      'try again later',
      'temporarily unavailable',
      'quota exceeded'
    ];
    
    for (const indicator of hardBounceIndicators) {
      if (lowerBody.includes(indicator) || lowerSubject.includes(indicator)) {
        bounceType = 'hard';
        bounceReason = `Hard bounce: ${indicator}`;
        break;
      }
    }
    
    if (bounceType === 'soft') {
      for (const indicator of softBounceIndicators) {
        if (lowerBody.includes(indicator) || lowerSubject.includes(indicator)) {
          bounceReason = `Soft bounce: ${indicator}`;
          break;
        }
      }
    }
    
    return {
      recipientEmail,
      bounceType,
      bounceReason
    };
  }
  
  /**
   * Find original email in database by recipient and timeframe
   */
  async findOriginalEmail(bounceInfo, senderEmail, organizationId) {
    try {
      // Look for emails sent to this recipient in the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: emails, error } = await supabase
        .from('scheduled_emails')
        .select('*')
        .eq('to_email', bounceInfo.recipientEmail)
        .eq('organization_id', organizationId)
        .eq('status', 'sent')
        .gte('sent_at', sevenDaysAgo.toISOString())
        .order('sent_at', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('❌ Error finding original email:', error);
        return null;
      }
      
      return emails && emails.length > 0 ? emails[0] : null;
      
    } catch (error) {
      console.error('❌ Error in findOriginalEmail:', error.message);
      return null;
    }
  }
  
  /**
   * Get header value from Gmail message headers
   */
  getHeader(headers, name) {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : null;
  }
  
  /**
   * Run bounce detection for all email accounts in an organization
   */
  async runBounceDetectionForOrganization(organizationId) {
    console.log(`🔍 Running bounce detection for organization: ${organizationId}`);
    
    try {
      // Get all OAuth2 Gmail accounts for this organization
      const { data: accounts, error } = await supabase
        .from('oauth2_tokens')
        .select('email')
        .eq('organization_id', organizationId)
        .eq('provider', 'gmail')
        .eq('status', 'linked_to_account');
      
      if (error) {
        console.error('❌ Error fetching accounts:', error);
        return;
      }
      
      if (!accounts || accounts.length === 0) {
        console.log('ℹ️ No Gmail accounts found for bounce detection');
        return;
      }
      
      console.log(`📧 Found ${accounts.length} Gmail accounts to scan`);
      
      let totalBounces = 0;
      let totalMessages = 0;
      
      // Scan each account
      for (const account of accounts) {
        try {
          const result = await this.scanForBounces(account.email, organizationId);
          totalBounces += result.bouncesDetected;
          totalMessages += result.emailsProcessed;
        } catch (error) {
          console.error(`❌ Error scanning ${account.email}:`, error.message);
        }
      }
      
      console.log(`✅ Bounce detection complete: ${totalBounces} bounces detected from ${totalMessages} messages`);
      
      return {
        accountsScanned: accounts.length,
        totalBounces,
        totalMessages
      };
      
    } catch (error) {
      console.error('❌ Error in runBounceDetectionForOrganization:', error.message);
      throw error;
    }
  }
}

module.exports = GmailBounceDetector;