const GmailSyncProvider = require('./GmailSyncProvider');
// const MicrosoftSyncProvider = require('./MicrosoftSyncProvider'); // Future implementation
// const SmtpSyncProvider = require('./SmtpSyncProvider'); // Future implementation

/**
 * ProviderFactory - Creates appropriate sync provider instances
 * Supports Gmail (immediate), Microsoft (future), SMTP (future)
 */
class ProviderFactory {
  
  /**
   * Provider capability definitions
   */
  static PROVIDER_CAPABILITIES = {
    gmail: {
      bidirectional_sync: true,
      real_time_updates: true,
      incremental_sync: 'history', // Uses Gmail historyId for efficiency
      max_batch_size: 50,
      supports_read_status: true,
      supports_labels: true,
      rate_limit_per_minute: 250 // Gmail API quota
    },
    
    microsoft: {
      bidirectional_sync: true,
      real_time_updates: true,
      incremental_sync: 'delta', // Uses Microsoft Graph delta queries
      max_batch_size: 100,
      supports_read_status: true,
      supports_labels: false, // Outlook uses categories, not labels
      rate_limit_per_minute: 300 // Graph API quota
    },
    
    outlook: {
      // Alias for microsoft
      bidirectional_sync: true,
      real_time_updates: true,
      incremental_sync: 'delta',
      max_batch_size: 100,
      supports_read_status: true,
      supports_labels: false,
      rate_limit_per_minute: 300
    },
    
    smtp: {
      bidirectional_sync: false, // SMTP/IMAP is read-only from provider perspective
      real_time_updates: false, // No push notifications
      incremental_sync: 'timestamp', // IMAP timestamp-based sync
      max_batch_size: 20, // Conservative for IMAP
      supports_read_status: false, // Cannot mark read in provider
      supports_labels: false, // IMAP folders, not labels
      rate_limit_per_minute: 60 // Conservative IMAP limit
    }
  };

  /**
   * Get provider capabilities for a given provider type
   * @param {string} providerType - Provider type (gmail, microsoft, smtp)
   * @returns {Object} Provider capabilities
   */
  static getProviderCapabilities(providerType) {
    const normalizedType = providerType?.toLowerCase();
    return this.PROVIDER_CAPABILITIES[normalizedType] || this.PROVIDER_CAPABILITIES.smtp;
  }

  /**
   * Create appropriate sync provider instance
   * @param {string} providerType - Provider type (gmail, microsoft, outlook, smtp)
   * @returns {BaseSyncProvider} Provider-specific sync instance
   */
  static createProvider(providerType) {
    const normalizedType = providerType?.toLowerCase();
    const capabilities = this.getProviderCapabilities(normalizedType);

    try {
      switch (normalizedType) {
        case 'gmail':
          return new GmailSyncProvider(capabilities);

        case 'microsoft':
        case 'outlook':
          // Future implementation
          throw new Error(`Microsoft/Outlook provider not yet implemented. Coming soon!`);
          // return new MicrosoftSyncProvider(capabilities);

        case 'smtp':
        case 'imap':
        default:
          // Future implementation
          throw new Error(`SMTP provider not yet implemented. Coming soon!`);
          // return new SmtpSyncProvider(capabilities);
      }
    } catch (error) {
      console.error(`❌ Failed to create provider for type: ${providerType}`, error);
      throw error;
    }
  }

  /**
   * Get list of supported provider types
   * @returns {Array} Array of supported provider types
   */
  static getSupportedProviders() {
    return ['gmail']; // Currently only Gmail is implemented
    // Future: return ['gmail', 'microsoft', 'outlook', 'smtp'];
  }

  /**
   * Check if a provider type is supported
   * @param {string} providerType - Provider type to check
   * @returns {boolean} True if provider is supported
   */
  static isProviderSupported(providerType) {
    return this.getSupportedProviders().includes(providerType?.toLowerCase());
  }

  /**
   * Get provider type from account object
   * @param {Object} account - Account object with provider field
   * @returns {string} Normalized provider type
   */
  static getProviderType(account) {
    if (!account || !account.provider) {
      console.warn('Account missing provider information, defaulting to smtp');
      return 'smtp';
    }
    
    return account.provider.toLowerCase();
  }

  /**
   * Validate provider configuration
   * @param {string} providerType - Provider type
   * @param {Object} account - Account configuration
   * @returns {Object} Validation result with success and errors
   */
  static validateProviderConfig(providerType, account) {
    const validation = {
      success: true,
      errors: [],
      warnings: []
    };

    const normalizedType = providerType?.toLowerCase();
    const capabilities = this.getProviderCapabilities(normalizedType);

    // Check if provider is supported
    if (!this.isProviderSupported(normalizedType)) {
      validation.success = false;
      validation.errors.push(`Provider '${providerType}' is not yet supported`);
      return validation;
    }

    // Provider-specific validation
    switch (normalizedType) {
      case 'gmail':
        if (!account.encrypted_tokens) {
          validation.success = false;
          validation.errors.push('Gmail account missing OAuth2 tokens');
        }
        break;

      case 'microsoft':
      case 'outlook':
        validation.success = false;
        validation.errors.push('Microsoft/Outlook provider not yet implemented');
        break;

      case 'smtp':
        validation.success = false;
        validation.errors.push('SMTP provider not yet implemented');
        break;
    }

    return validation;
  }

  /**
   * Get sync strategy recommendation for provider
   * @param {string} providerType - Provider type
   * @param {number} messageVolume - Estimated daily message volume
   * @returns {Object} Sync strategy recommendations
   */
  static getSyncStrategy(providerType, messageVolume = 10) {
    const capabilities = this.getProviderCapabilities(providerType);
    
    const strategy = {
      provider: providerType,
      capabilities,
      recommendations: {
        sync_interval_minutes: 5, // Default sync frequency
        batch_size: Math.min(capabilities.max_batch_size, Math.max(10, messageVolume)),
        use_incremental: true,
        enable_real_time: capabilities.real_time_updates
      }
    };

    // Adjust strategy based on volume
    if (messageVolume > 100) {
      strategy.recommendations.sync_interval_minutes = 2; // More frequent for high volume
      strategy.recommendations.batch_size = Math.min(capabilities.max_batch_size, 50);
    } else if (messageVolume < 5) {
      strategy.recommendations.sync_interval_minutes = 15; // Less frequent for low volume
      strategy.recommendations.batch_size = Math.max(10, messageVolume);
    }

    return strategy;
  }
}

module.exports = ProviderFactory;