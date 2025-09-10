/**
 * BaseSyncProvider - Abstract base class for email provider synchronization
 * Provides common interface for Gmail, Microsoft, and SMTP providers
 */
class BaseSyncProvider {
  constructor(providerType, capabilities) {
    this.providerType = providerType;
    this.capabilities = capabilities;
  }

  /**
   * Get provider capabilities
   */
  getCapabilities() {
    return this.capabilities;
  }

  /**
   * Check if provider supports bidirectional sync
   */
  supportsBidirectionalSync() {
    return this.capabilities.bidirectional_sync || false;
  }

  /**
   * Check if provider supports real-time updates
   */
  supportsRealTimeUpdates() {
    return this.capabilities.real_time_updates || false;
  }

  /**
   * Get incremental sync strategy
   */
  getIncrementalSyncType() {
    return this.capabilities.incremental_sync || 'timestamp';
  }

  /**
   * Get maximum batch size for this provider
   */
  getMaxBatchSize() {
    return this.capabilities.max_batch_size || 20;
  }

  // ============================================================================
  // ABSTRACT METHODS - Must be implemented by provider-specific classes
  // ============================================================================

  /**
   * Initialize provider client with account credentials
   * @param {Object} account - Account object with credentials
   * @param {string} organizationId - Organization ID for isolation
   * @returns {Object} Initialized provider client
   */
  async initializeClient(account, organizationId) {
    throw new Error(`initializeClient must be implemented by ${this.providerType} provider`);
  }

  /**
   * Get incremental changes since last sync
   * @param {Object} client - Provider client
   * @param {Date|string} lastSyncTimestamp - Last successful sync time
   * @param {Object} options - Additional sync options
   * @returns {Array} Array of changed messages
   */
  async getIncrementalChanges(client, lastSyncTimestamp, options = {}) {
    throw new Error(`getIncrementalChanges must be implemented by ${this.providerType} provider`);
  }

  /**
   * Get detailed message information
   * @param {Object} client - Provider client
   * @param {string} providerMessageId - Provider-specific message ID
   * @returns {Object} Detailed message information
   */
  async getMessageDetails(client, providerMessageId) {
    throw new Error(`getMessageDetails must be implemented by ${this.providerType} provider`);
  }

  /**
   * Mark message as read in provider
   * @param {Object} client - Provider client
   * @param {string} providerMessageId - Provider-specific message ID
   * @returns {boolean} Success status
   */
  async markAsRead(client, providerMessageId) {
    if (!this.supportsBidirectionalSync()) {
      throw new Error(`${this.providerType} does not support bidirectional sync`);
    }
    throw new Error(`markAsRead must be implemented by ${this.providerType} provider`);
  }

  /**
   * Mark message as unread in provider
   * @param {Object} client - Provider client
   * @param {string} providerMessageId - Provider-specific message ID
   * @returns {boolean} Success status
   */
  async markAsUnread(client, providerMessageId) {
    if (!this.supportsBidirectionalSync()) {
      throw new Error(`${this.providerType} does not support bidirectional sync`);
    }
    throw new Error(`markAsUnread must be implemented by ${this.providerType} provider`);
  }

  /**
   * Normalize message data to universal format
   * @param {Object} providerMessage - Provider-specific message object
   * @returns {Object} Normalized message data
   */
  normalizeMessageData(providerMessage) {
    throw new Error(`normalizeMessageData must be implemented by ${this.providerType} provider`);
  }

  // ============================================================================
  // HELPER METHODS - Common utilities for all providers
  // ============================================================================

  /**
   * Extract email address from various formats
   * @param {string} emailString - Email in various formats
   * @returns {string} Clean email address
   */
  extractEmail(emailString) {
    if (!emailString) return null;
    
    // Handle formats like "John Doe <john@example.com>" or just "john@example.com"
    const match = emailString.match(/<([^>]+)>/) || emailString.match(/([^\s<>]+@[^\s<>]+)/);
    return match ? match[1].toLowerCase().trim() : emailString.toLowerCase().trim();
  }

  /**
   * Parse date string to standardized format
   * @param {string|Date} dateValue - Date in various formats
   * @returns {string|null} ISO timestamp or null
   */
  parseDate(dateValue) {
    if (!dateValue) return null;
    
    try {
      const date = new Date(dateValue);
      return date.toISOString();
    } catch (error) {
      console.warn(`Failed to parse date: ${dateValue}`, error);
      return null;
    }
  }

  /**
   * Generate unique message ID for internal use
   * @param {string} providerMessageId - Provider-specific message ID
   * @param {string} providerType - Provider type
   * @returns {string} Internal message ID
   */
  generateInternalMessageId(providerMessageId, providerType) {
    return `${providerType}_${providerMessageId}`;
  }

  /**
   * Log sync operation for monitoring
   * @param {string} operation - Operation type
   * @param {Object} details - Operation details
   */
  log(operation, details = {}) {
    console.log(`🔄 [${this.providerType.toUpperCase()}] ${operation}:`, details);
  }

  /**
   * Log error for monitoring
   * @param {string} operation - Operation that failed
   * @param {Error} error - Error object
   * @param {Object} context - Additional context
   */
  logError(operation, error, context = {}) {
    console.error(`❌ [${this.providerType.toUpperCase()}] ${operation} failed:`, {
      error: error.message,
      context,
      stack: error.stack
    });
  }
}

module.exports = BaseSyncProvider;