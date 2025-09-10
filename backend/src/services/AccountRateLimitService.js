const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * AccountRateLimitService - Sophisticated email account rate limiting and rotation system
 * 
 * Features:
 * - Smart account rotation with multiple algorithms
 * - Real-time rate limit tracking
 * - Health-based account selection
 * - Atomic usage recording
 * - Comprehensive analytics
 */
class AccountRateLimitService {
  constructor() {
    this.rotationStrategies = {
      ROUND_ROBIN: 'round_robin',
      WEIGHTED: 'weighted',
      PRIORITY_BASED: 'priority_based',
      HEALTH_BASED: 'health_based',
      HYBRID: 'hybrid'
    };
  }

  /**
   * Check if a specific account can send emails
   * @param {string} accountId - Email account ID
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Availability information
   */
  async checkAccountAvailability(accountId, organizationId) {
    try {
      console.log(`📊 Checking availability for account ${accountId}`);

      // First check if account exists in OAuth2 accounts
      let { data: oauth2Account } = await supabase
        .from('oauth2_tokens')
        .select('*')
        .eq('id', accountId)
        .eq('organization_id', organizationId)
        .single();

      // If not OAuth2, check email_accounts table
      let { data: emailAccount } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('id', accountId)
        .eq('organization_id', organizationId)
        .single();

      const accountData = oauth2Account || emailAccount;

      if (!accountData) {
        console.error('❌ Account not found in oauth2_tokens or email_accounts');
        return {
          canSend: false,
          reason: 'Account not found or error occurred',
          dailyRemaining: 0,
          hourlyRemaining: 0,
          nextAvailableTime: null
        };
      }

      // For OAuth2 accounts, check status
      if (oauth2Account && oauth2Account.status !== 'linked_to_account') {
        console.log(`⚠️ OAuth2 account ${accountData.email} status: ${oauth2Account.status}`);
        return {
          canSend: false,
          reason: `OAuth2 account not linked (status: ${oauth2Account.status})`,
          dailyRemaining: 0,
          hourlyRemaining: 0,
          nextAvailableTime: null
        };
      }

      // Get current usage counts for rate limiting (all in UTC to match database)
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentHour = now.getUTCHours(); // Use UTC hour to match database timestamps
      
      const { data: dailyUsage } = await supabase
        .from('scheduled_emails')
        .select('id')
        .eq('email_account_id', accountId)
        .eq('organization_id', organizationId)
        .gte('send_at', `${today}T00:00:00Z`)
        .lte('send_at', `${today}T23:59:59Z`)
        .in('status', ['sent', 'sending']);

      const { data: hourlyUsage } = await supabase
        .from('scheduled_emails')
        .select('id')
        .eq('email_account_id', accountId)
        .eq('organization_id', organizationId)
        .gte('send_at', `${today}T${String(currentHour).padStart(2, '0')}:00:00Z`)
        .lte('send_at', `${today}T${String(currentHour).padStart(2, '0')}:59:59Z`)
        .in('status', ['sent', 'sending']);

      // Default limits (can be made configurable later)
      const dailyLimit = oauth2Account ? 500 : 100; // OAuth2 has higher limits
      const hourlyLimit = oauth2Account ? 50 : 20;

      const dailySent = dailyUsage?.length || 0;
      const hourlySent = hourlyUsage?.length || 0;
      const dailyRemaining = Math.max(0, dailyLimit - dailySent);
      const hourlyRemaining = Math.max(0, hourlyLimit - hourlySent);

      const canSend = dailyRemaining > 0 && hourlyRemaining > 0;

      let reason = 'Available';
      if (!canSend) {
        reason = dailyRemaining <= 0 ? 'Daily limit reached' : 'Hourly limit reached';
      }

      console.log(`📈 Account ${accountData.email}: ${canSend ? 'Available' : 'Limited'} - ${dailyRemaining}/${dailyLimit} daily, ${hourlyRemaining}/${hourlyLimit} hourly (UTC hour: ${currentHour})`);

      return {
        canSend,
        reason,
        dailyRemaining,
        hourlyRemaining,
        dailyLimit,
        hourlyLimit,
        healthScore: 1.0,
        status: accountData.status || 'active',
        nextAvailableTime: canSend ? null : new Date(Date.now() + 60 * 60 * 1000), // Next hour
        maxAllowed: Math.min(dailyRemaining, hourlyRemaining)
      };
    } catch (error) {
      console.error('❌ Error in checkAccountAvailability:', error);
      return {
        canSend: false,
        reason: 'System error',
        dailyRemaining: 0,
        hourlyRemaining: 0,
        nextAvailableTime: null
      };
    }
  }

  /**
   * Get next available accounts using smart rotation
   * @param {string} organizationId - Organization ID
   * @param {number} requiredCount - Number of accounts needed
   * @param {string} strategy - Rotation strategy to use
   * @returns {Promise<Array>} Available accounts
   */
  async getNextAvailableAccounts(organizationId, requiredCount = 1, strategy = this.rotationStrategies.HYBRID) {
    try {
      console.log(`🔄 Getting ${requiredCount} accounts for organization ${organizationId} using ${strategy} strategy`);

      // Get all available accounts
      const availableAccounts = await this.getAvailableAccountsFromDB(organizationId);

      if (availableAccounts.length === 0) {
        console.log('📭 No available accounts found');
        return [];
      }

      // Apply rotation strategy
      const selectedAccounts = await this.applyRotationStrategy(availableAccounts, requiredCount, strategy, organizationId);

      // Log rotation decision
      await this.logRotationDecision(organizationId, selectedAccounts, strategy);

      console.log(`✅ Selected ${selectedAccounts.length} accounts for sending:`, selectedAccounts.map(a => a.email));
      return selectedAccounts;

    } catch (error) {
      console.error('❌ Error in getNextAvailableAccounts:', error);
      return [];
    }
  }

  /**
   * Get available accounts from database
   * @private
   */
  async getAvailableAccountsFromDB(organizationId) {
    const { data: accounts, error } = await supabase
      .from('account_usage_summary')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('availability_status', 'available')
      .order('rotation_priority', { ascending: false })
      .order('health_score', { ascending: false });

    if (error) {
      console.error('❌ Error fetching available accounts:', error);
      return [];
    }

    return accounts || [];
  }

  /**
   * Apply rotation strategy to select accounts
   * @private
   */
  async applyRotationStrategy(availableAccounts, requiredCount, strategy, organizationId) {
    switch (strategy) {
      case this.rotationStrategies.ROUND_ROBIN:
        return this.applyRoundRobinStrategy(availableAccounts, requiredCount, organizationId);
      
      case this.rotationStrategies.WEIGHTED:
        return this.applyWeightedStrategy(availableAccounts, requiredCount);
      
      case this.rotationStrategies.PRIORITY_BASED:
        return this.applyPriorityBasedStrategy(availableAccounts, requiredCount);
      
      case this.rotationStrategies.HEALTH_BASED:
        return this.applyHealthBasedStrategy(availableAccounts, requiredCount);
      
      case this.rotationStrategies.HYBRID:
      default:
        return this.applyHybridStrategy(availableAccounts, requiredCount, organizationId);
    }
  }

  /**
   * Round Robin Strategy - Cycle through accounts evenly
   * @private
   */
  async applyRoundRobinStrategy(availableAccounts, requiredCount, organizationId) {
    // Get last used account from rotation log
    const { data: lastRotation } = await supabase
      .from('account_rotation_log')
      .select('email_account_id')
      .eq('organization_id', organizationId)
      .order('rotation_timestamp', { ascending: false })
      .limit(1);

    let startIndex = 0;
    if (lastRotation && lastRotation.length > 0) {
      const lastAccountId = lastRotation[0].email_account_id;
      const lastIndex = availableAccounts.findIndex(acc => acc.id === lastAccountId);
      startIndex = lastIndex >= 0 ? (lastIndex + 1) % availableAccounts.length : 0;
    }

    const selectedAccounts = [];
    for (let i = 0; i < Math.min(requiredCount, availableAccounts.length); i++) {
      const index = (startIndex + i) % availableAccounts.length;
      selectedAccounts.push(availableAccounts[index]);
    }

    return selectedAccounts;
  }

  /**
   * Weighted Strategy - Select based on rotation weights
   * @private
   */
  applyWeightedStrategy(availableAccounts, requiredCount) {
    // Calculate total weight
    const totalWeight = availableAccounts.reduce((sum, acc) => sum + parseFloat(acc.rotation_weight), 0);
    
    const selectedAccounts = [];
    const accountsCopy = [...availableAccounts];

    for (let i = 0; i < Math.min(requiredCount, accountsCopy.length); i++) {
      const randomValue = Math.random() * totalWeight;
      let currentWeight = 0;
      
      for (let j = 0; j < accountsCopy.length; j++) {
        currentWeight += parseFloat(accountsCopy[j].rotation_weight);
        if (randomValue <= currentWeight) {
          selectedAccounts.push(accountsCopy[j]);
          accountsCopy.splice(j, 1);
          break;
        }
      }
    }

    return selectedAccounts;
  }

  /**
   * Priority-Based Strategy - Select highest priority accounts first
   * @private
   */
  applyPriorityBasedStrategy(availableAccounts, requiredCount) {
    return availableAccounts
      .sort((a, b) => b.rotation_priority - a.rotation_priority)
      .slice(0, requiredCount);
  }

  /**
   * Health-Based Strategy - Select accounts with best health scores
   * @private
   */
  applyHealthBasedStrategy(availableAccounts, requiredCount) {
    return availableAccounts
      .sort((a, b) => b.health_score - a.health_score)
      .slice(0, requiredCount);
  }

  /**
   * Hybrid Strategy - Combine multiple factors for optimal selection
   * @private
   */
  async applyHybridStrategy(availableAccounts, requiredCount, organizationId) {
    // Calculate composite scores based on multiple factors
    const scoredAccounts = availableAccounts.map(account => {
      const priorityScore = (account.rotation_priority / 10) * 0.3; // 30% weight
      const healthScore = (account.health_score / 100) * 0.4; // 40% weight
      const capacityScore = (Math.min(account.daily_remaining, account.hourly_remaining) / Math.max(account.daily_limit, account.hourly_limit)) * 0.2; // 20% weight
      const weightScore = (parseFloat(account.rotation_weight) / 10) * 0.1; // 10% weight
      
      const compositeScore = priorityScore + healthScore + capacityScore + weightScore;
      
      return {
        ...account,
        compositeScore
      };
    });

    // Sort by composite score and apply some randomization to top candidates
    scoredAccounts.sort((a, b) => b.compositeScore - a.compositeScore);
    
    // Take top candidates (up to 150% of required) and add some randomization
    const topCandidates = Math.min(Math.ceil(requiredCount * 1.5), scoredAccounts.length);
    const candidates = scoredAccounts.slice(0, topCandidates);
    
    // Randomly select from top candidates to add variety
    const selectedAccounts = [];
    for (let i = 0; i < Math.min(requiredCount, candidates.length); i++) {
      const randomIndex = Math.floor(Math.random() * candidates.length);
      selectedAccounts.push(candidates[randomIndex]);
      candidates.splice(randomIndex, 1);
    }

    return selectedAccounts;
  }

  /**
   * Record email sent - atomic operation
   * @param {string} accountId - Email account ID
   * @param {string} organizationId - Organization ID
   * @param {number} emailCount - Number of emails sent
   * @returns {Promise<boolean>} Success status
   */
  async recordEmailSent(accountId, organizationId, emailCount = 1) {
    try {
      console.log(`📊 Recording ${emailCount} email(s) sent for account ${accountId}`);

      const { data, error } = await supabase.rpc('record_email_sent', {
        account_id: accountId,
        org_id: organizationId,
        emails_count: emailCount
      });

      if (error) {
        console.error('❌ Error recording email sent:', error);
        return false;
      }

      console.log(`✅ Successfully recorded ${emailCount} email(s) for account ${accountId}`);
      return true;

    } catch (error) {
      console.error('❌ Error in recordEmailSent:', error);
      return false;
    }
  }

  /**
   * Reset daily counters (called by cron job)
   * @returns {Promise<number>} Number of accounts reset
   */
  async resetDailyCounters() {
    try {
      console.log('🔄 Resetting daily rate limit counters...');

      const { data: resetCount, error } = await supabase.rpc('reset_daily_rate_limits');

      if (error) {
        console.error('❌ Error resetting daily counters:', error);
        return 0;
      }

      console.log(`✅ Reset daily counters for ${resetCount} accounts`);
      return resetCount || 0;

    } catch (error) {
      console.error('❌ Error in resetDailyCounters:', error);
      return 0;
    }
  }

  /**
   * Reset hourly counters
   * @returns {Promise<number>} Number of accounts reset
   */
  async resetHourlyCounters() {
    try {
      console.log('🔄 Resetting hourly rate limit counters...');

      const { data: resetCount, error } = await supabase.rpc('reset_hourly_rate_limits');

      if (error) {
        console.error('❌ Error resetting hourly counters:', error);
        return 0;
      }

      console.log(`✅ Reset hourly counters for ${resetCount} accounts`);
      return resetCount || 0;

    } catch (error) {
      console.error('❌ Error in resetHourlyCounters:', error);
      return 0;
    }
  }

  /**
   * Get account usage statistics
   * @param {string} accountId - Email account ID
   * @param {string} organizationId - Organization ID
   * @param {number} days - Number of days to look back
   * @returns {Promise<Object>} Usage statistics
   */
  async getAccountUsageStats(accountId, organizationId, days = 30) {
    try {
      console.log(`📊 Getting usage stats for account ${accountId} (${days} days)`);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      // Get current usage
      const { data: currentUsage } = await supabase
        .from('account_usage_summary')
        .select('*')
        .eq('id', accountId)
        .eq('organization_id', organizationId)
        .single();

      // Get historical usage
      const { data: historicalUsage } = await supabase
        .from('account_usage_history')
        .select('*')
        .eq('email_account_id', accountId)
        .eq('organization_id', organizationId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      // Calculate aggregated stats
      const totalEmailsSent = historicalUsage?.reduce((sum, day) => sum + day.emails_sent, 0) || 0;
      const avgDailyEmails = days > 0 ? Math.round(totalEmailsSent / days) : 0;
      const avgDeliveryRate = historicalUsage?.length > 0 ? 
        historicalUsage.reduce((sum, day) => sum + day.delivery_rate, 0) / historicalUsage.length : 0;
      const avgBounceRate = historicalUsage?.length > 0 ? 
        historicalUsage.reduce((sum, day) => sum + day.bounce_rate, 0) / historicalUsage.length : 0;

      return {
        currentUsage: currentUsage || {},
        historicalUsage: historicalUsage || [],
        aggregatedStats: {
          totalEmailsSent,
          avgDailyEmails,
          avgDeliveryRate: Math.round(avgDeliveryRate * 100) / 100,
          avgBounceRate: Math.round(avgBounceRate * 100) / 100,
          daysAnalyzed: days,
          healthTrend: this.calculateHealthTrend(historicalUsage)
        }
      };

    } catch (error) {
      console.error('❌ Error in getAccountUsageStats:', error);
      return {
        currentUsage: {},
        historicalUsage: [],
        aggregatedStats: {}
      };
    }
  }

  /**
   * Update account limits
   * @param {string} accountId - Email account ID
   * @param {number} dailyLimit - New daily limit
   * @param {number} hourlyLimit - New hourly limit
   * @param {Object} otherSettings - Other settings to update
   * @returns {Promise<boolean>} Success status
   */
  async updateAccountLimits(accountId, dailyLimit, hourlyLimit, otherSettings = {}) {
    try {
      console.log(`⚙️ Updating limits for account ${accountId}: ${dailyLimit} daily, ${hourlyLimit} hourly`);

      const updateData = {
        daily_limit: dailyLimit,
        hourly_limit: hourlyLimit,
        updated_at: new Date().toISOString(),
        ...otherSettings
      };

      const { error } = await supabase
        .from('email_accounts')
        .update(updateData)
        .eq('id', accountId);

      if (error) {
        console.error('❌ Error updating account limits:', error);
        return false;
      }

      console.log(`✅ Successfully updated limits for account ${accountId}`);
      return true;

    } catch (error) {
      console.error('❌ Error in updateAccountLimits:', error);
      return false;
    }
  }

  /**
   * Get rotation preview - show expected rotation order
   * @param {string} organizationId - Organization ID
   * @param {string} strategy - Rotation strategy
   * @returns {Promise<Array>} Rotation preview
   */
  async getRotationPreview(organizationId, strategy = this.rotationStrategies.HYBRID) {
    try {
      const availableAccounts = await this.getAvailableAccountsFromDB(organizationId);
      const rotationOrder = await this.applyRotationStrategy(availableAccounts, availableAccounts.length, strategy, organizationId);
      
      return rotationOrder.map((account, index) => ({
        position: index + 1,
        email: account.email,
        dailyRemaining: account.daily_remaining,
        hourlyRemaining: account.hourly_remaining,
        healthScore: account.health_score,
        priority: account.rotation_priority,
        weight: account.rotation_weight
      }));

    } catch (error) {
      console.error('❌ Error in getRotationPreview:', error);
      return [];
    }
  }

  /**
   * Calculate next available time for an account
   * @private
   */
  calculateNextAvailableTime(accountData) {
    const now = new Date();
    
    if (accountData.availability_status === 'hourly_limit_reached') {
      // Next hour
      const nextHour = new Date(now);
      nextHour.setHours(now.getHours() + 1, 0, 0, 0);
      return nextHour;
    } else if (accountData.availability_status === 'daily_limit_reached') {
      // Next day
      const nextDay = new Date(now);
      nextDay.setDate(now.getDate() + 1);
      nextDay.setHours(0, 0, 0, 0);
      return nextDay;
    } else if (accountData.availability_status === 'inactive') {
      // Account needs to be manually activated
      return null;
    }
    
    return new Date(now.getTime() + 60 * 60 * 1000); // Default: 1 hour
  }

  /**
   * Calculate health trend from historical data
   * @private
   */
  calculateHealthTrend(historicalUsage) {
    if (!historicalUsage || historicalUsage.length < 2) {
      return 'stable';
    }

    const recent = historicalUsage.slice(0, 7); // Last 7 days
    const older = historicalUsage.slice(7, 14); // Previous 7 days

    const recentAvgHealth = recent.reduce((sum, day) => sum + day.health_score_snapshot, 0) / recent.length;
    const olderAvgHealth = older.length > 0 ? 
      older.reduce((sum, day) => sum + day.health_score_snapshot, 0) / older.length : recentAvgHealth;

    const difference = recentAvgHealth - olderAvgHealth;
    
    if (difference > 5) return 'improving';
    if (difference < -5) return 'declining';
    return 'stable';
  }

  /**
   * Log rotation decision for analytics
   * @private
   */
  async logRotationDecision(organizationId, selectedAccounts, strategy) {
    try {
      const rotationLogs = selectedAccounts.map(account => ({
        organization_id: organizationId,
        email_account_id: account.id,
        rotation_strategy: strategy,
        rotation_reason: `Selected via ${strategy} strategy`,
        emails_assigned: 1, // Will be updated when emails are actually assigned
        account_health_score: account.health_score,
        rotation_timestamp: new Date().toISOString()
      }));

      await supabase
        .from('account_rotation_log')
        .insert(rotationLogs);

    } catch (error) {
      console.error('⚠️ Error logging rotation decision (non-fatal):', error);
    }
  }
}

module.exports = AccountRateLimitService;