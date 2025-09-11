const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

class PlanLimitsService {
  constructor() {
    this.planLimits = {
      free: {
        emailAccounts: 5,
        emailsPerDay: 50,
        campaigns: 1,
        leadLists: 3,
        leadsPerList: 5000,
        features: ['basic_analytics', 'email_sequences']
      },
      basic: {
        emailAccounts: 10,
        emailsPerDay: 200,
        campaigns: 5,
        leadLists: 10,
        leadsPerList: 5000,
        features: ['basic_analytics', 'email_sequences', 'a_b_testing']
      },
      pro: {
        emailAccounts: 25,
        emailsPerDay: 500,
        campaigns: 20,
        leadLists: 50,
        leadsPerList: 25000,
        features: ['basic_analytics', 'email_sequences', 'a_b_testing', 'advanced_analytics', 'custom_domains']
      },
      enterprise: {
        emailAccounts: 100,
        emailsPerDay: 5000,
        campaigns: -1, // unlimited
        leadLists: -1, // unlimited
        leadsPerList: -1, // unlimited
        features: ['all']
      }
    };
  }

  /**
   * Get plan limits for an organization
   */
  async getPlanLimits(organizationId) {
    try {
      const { data: organization, error } = await supabase
        .from('organizations')
        .select('plan_type, settings')
        .eq('id', organizationId)
        .single();

      if (error || !organization) {
        throw new Error('Organization not found');
      }

      const planType = organization.plan_type || 'free';
      const limits = this.planLimits[planType] || this.planLimits.free;

      // Check if it's a beta user with enhanced limits
      const isBetaUser = organization.settings?.beta_access === true;
      if (isBetaUser) {
        // Beta users get pro-level limits regardless of their plan
        return {
          ...this.planLimits.pro,
          planType,
          isBeta: true,
          betaExpiresAt: organization.settings?.beta_expires_at
        };
      }

      return {
        ...limits,
        planType,
        isBeta: false
      };
    } catch (error) {
      console.error('Error getting plan limits:', error);
      return {
        ...this.planLimits.free,
        planType: 'free',
        isBeta: false
      };
    }
  }

  /**
   * Check if organization can perform an action
   */
  async canPerformAction(organizationId, actionType, currentCount = 0) {
    const limits = await this.getPlanLimits(organizationId);
    
    switch (actionType) {
      case 'create_email_account':
        return limits.emailAccounts === -1 || currentCount < limits.emailAccounts;
      
      case 'create_campaign':
        return limits.campaigns === -1 || currentCount < limits.campaigns;
      
      case 'create_lead_list':
        return limits.leadLists === -1 || currentCount < limits.leadLists;
      
      case 'send_email':
        return limits.emailsPerDay === -1 || currentCount < limits.emailsPerDay;
      
      default:
        return true;
    }
  }

  /**
   * Get current usage for an organization
   */
  async getCurrentUsage(organizationId) {
    try {
      const [
        emailAccountsResult,
        campaignsResult,
        leadListsResult,
        todayEmailsResult
      ] = await Promise.all([
        supabase
          .from('email_accounts')
          .select('id', { count: 'exact' })
          .eq('organization_id', organizationId),
        
        supabase
          .from('campaigns')
          .select('id', { count: 'exact' })
          .eq('organization_id', organizationId),
        
        supabase
          .from('lead_lists')
          .select('id', { count: 'exact' })
          .eq('organization_id', organizationId),
        
        supabase
          .from('scheduled_emails')
          .select('id', { count: 'exact' })
          .eq('organization_id', organizationId)
          .gte('created_at', new Date().toISOString().split('T')[0] + 'T00:00:00.000Z')
      ]);

      return {
        emailAccounts: emailAccountsResult.count || 0,
        campaigns: campaignsResult.count || 0,
        leadLists: leadListsResult.count || 0,
        emailsSentToday: todayEmailsResult.count || 0
      };
    } catch (error) {
      console.error('Error getting current usage:', error);
      return {
        emailAccounts: 0,
        campaigns: 0,
        leadLists: 0,
        emailsSentToday: 0
      };
    }
  }

  /**
   * Get complete plan status for an organization
   */
  async getPlanStatus(organizationId) {
    const [limits, usage] = await Promise.all([
      this.getPlanLimits(organizationId),
      this.getCurrentUsage(organizationId)
    ]);

    return {
      plan: limits,
      usage,
      canCreateEmailAccount: await this.canPerformAction(organizationId, 'create_email_account', usage.emailAccounts),
      canCreateCampaign: await this.canPerformAction(organizationId, 'create_campaign', usage.campaigns),
      canCreateLeadList: await this.canPerformAction(organizationId, 'create_lead_list', usage.leadLists),
      canSendEmail: await this.canPerformAction(organizationId, 'send_email', usage.emailsSentToday),
    };
  }

  /**
   * Check if a feature is available for the plan
   */
  hasFeature(limits, featureName) {
    if (limits.features.includes('all')) {
      return true;
    }
    return limits.features.includes(featureName);
  }

  /**
   * Middleware to check plan limits before actions
   */
  checkLimits(actionType) {
    return async (req, res, next) => {
      try {
        const organizationId = req.user?.organizationId;
        if (!organizationId) {
          return res.status(401).json({ error: 'Organization ID required' });
        }

        const usage = await this.getCurrentUsage(organizationId);
        const canPerform = await this.canPerformAction(organizationId, actionType, usage[this.getUsageKey(actionType)]);

        if (!canPerform) {
          const limits = await this.getPlanLimits(organizationId);
          return res.status(429).json({ 
            error: 'Plan limit exceeded',
            message: `Your ${limits.planType} plan limit has been reached for ${actionType.replace('_', ' ')}`,
            planType: limits.planType,
            isBeta: limits.isBeta,
            upgradeRequired: !limits.isBeta
          });
        }

        next();
      } catch (error) {
        console.error('Error checking plan limits:', error);
        next(); // Allow request to proceed on error
      }
    };
  }

  /**
   * Helper to map action types to usage keys
   */
  getUsageKey(actionType) {
    const mapping = {
      'create_email_account': 'emailAccounts',
      'create_campaign': 'campaigns',
      'create_lead_list': 'leadLists',
      'send_email': 'emailsSentToday'
    };
    return mapping[actionType];
  }
}

module.exports = new PlanLimitsService();