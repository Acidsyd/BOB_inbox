#!/usr/bin/env node

/**
 * Real-time Rate Limiting Monitor
 * 
 * This script monitors the rate limiting system in real-time
 * Run this while your system is sending emails to see rotation in action
 */

const { createClient } = require('@supabase/supabase-js');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m'
};

class RateLimitingMonitor {
  constructor() {
    this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    this.isRunning = false;
    this.previousData = new Map();
  }

  log(message, color = colors.reset) {
    const timestamp = new Date().toISOString().substring(11, 19);
    console.log(`${colors.cyan}[${timestamp}]${color} ${message}${colors.reset}`);
  }

  async getCurrentUsage() {
    try {
      const { data: accounts, error } = await this.supabase
        .from('account_usage_summary')
        .select('id, email, organization_id, daily_sent, hourly_sent, daily_limit, hourly_limit, daily_remaining, hourly_remaining, availability_status, health_score')
        .order('email');

      if (error) {
        throw error;
      }

      return accounts || [];
    } catch (error) {
      this.log(`❌ Error fetching usage data: ${error.message}`, colors.red);
      return [];
    }
  }

  async getRecentRotationLog() {
    try {
      const { data: rotations, error } = await this.supabase
        .from('account_rotation_log')
        .select('email_account_id, rotation_strategy, rotation_timestamp, emails_assigned')
        .gte('rotation_timestamp', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
        .order('rotation_timestamp', { ascending: false })
        .limit(5);

      return rotations || [];
    } catch (error) {
      return [];
    }
  }

  async getScheduledEmailsCount() {
    try {
      const { data: scheduled, error } = await this.supabase
        .from('scheduled_emails')
        .select('status', { count: 'exact' })
        .eq('status', 'scheduled');

      const { data: sending, error: sendingError } = await this.supabase
        .from('scheduled_emails')
        .select('status', { count: 'exact' })
        .eq('status', 'sending');

      return {
        scheduled: scheduled?.length || 0,
        sending: sending?.length || 0
      };
    } catch (error) {
      return { scheduled: 0, sending: 0 };
    }
  }

  detectChanges(currentAccounts) {
    const changes = [];
    
    currentAccounts.forEach(account => {
      const key = account.id;
      const previous = this.previousData.get(key);
      
      if (previous) {
        if (previous.daily_sent !== account.daily_sent) {
          const diff = account.daily_sent - previous.daily_sent;
          changes.push({
            type: 'email_sent',
            account: account.email,
            change: `+${diff} emails sent (${account.daily_sent}/${account.daily_limit} daily)`
          });
        }
        
        if (previous.hourly_sent !== account.hourly_sent) {
          const diff = account.hourly_sent - previous.hourly_sent;
          changes.push({
            type: 'hourly_update',
            account: account.email,
            change: `+${diff} this hour (${account.hourly_sent}/${account.hourly_limit} hourly)`
          });
        }
        
        if (previous.availability_status !== account.availability_status) {
          changes.push({
            type: 'status_change',
            account: account.email,
            change: `${previous.availability_status} → ${account.availability_status}`
          });
        }
      }
      
      this.previousData.set(key, { ...account });
    });
    
    return changes;
  }

  async displayCurrentStatus() {
    const accounts = await this.getCurrentUsage();
    const emailCounts = await this.getScheduledEmailsCount();
    const recentRotations = await this.getRecentRotationLog();
    
    // Clear screen and show header
    console.clear();
    this.log(`📊 Email Rate Limiting System - Live Monitor`, colors.cyan);
    this.log(`${'='.repeat(50)}`, colors.cyan);
    
    // Show email queue status
    this.log(`\n📬 Email Queue Status:`, colors.blue);
    this.log(`   Scheduled: ${emailCounts.scheduled} emails`);
    this.log(`   Sending: ${emailCounts.sending} emails`);
    
    // Show account status
    this.log(`\n📧 Account Status (${accounts.length} accounts):`, colors.blue);
    
    if (accounts.length === 0) {
      this.log(`   No accounts found`, colors.yellow);
      return;
    }
    
    accounts.forEach(account => {
      const status = account.availability_status;
      const color = status === 'available' ? colors.green : 
                   status.includes('limit') ? colors.red : colors.yellow;
      
      this.log(`   ${account.email}:`, color);
      this.log(`      Daily: ${account.daily_sent || 0}/${account.daily_limit || 50} (${account.daily_remaining || 0} remaining)`);
      this.log(`      Hourly: ${account.hourly_sent || 0}/${account.hourly_limit || 5} (${account.hourly_remaining || 0} remaining)`);
      this.log(`      Status: ${status} | Health: ${account.health_score || 0}%`);
    });

    // Show recent rotations
    if (recentRotations.length > 0) {
      this.log(`\n🔄 Recent Account Rotations (last 5 minutes):`, colors.blue);
      recentRotations.forEach(rotation => {
        const timestamp = new Date(rotation.rotation_timestamp).toLocaleTimeString();
        this.log(`   ${timestamp}: Account rotated (${rotation.rotation_strategy} strategy)`);
      });
    }
    
    // Detect and show changes
    const changes = this.detectChanges(accounts);
    if (changes.length > 0) {
      this.log(`\n📈 Recent Changes:`, colors.magenta);
      changes.forEach(change => {
        const color = change.type === 'email_sent' ? colors.green :
                     change.type === 'status_change' ? colors.yellow : colors.blue;
        this.log(`   ${change.account}: ${change.change}`, color);
      });
    }
    
    this.log(`\n🕐 Last updated: ${new Date().toLocaleTimeString()}`, colors.cyan);
    this.log(`Press Ctrl+C to stop monitoring`, colors.yellow);
  }

  async start() {
    if (this.isRunning) {
      this.log('Monitor already running', colors.yellow);
      return;
    }

    this.isRunning = true;
    this.log('🚀 Starting rate limiting monitor...', colors.green);
    this.log('Monitoring every 5 seconds. Press Ctrl+C to stop.', colors.blue);

    // Initial display
    await this.displayCurrentStatus();

    // Set up interval
    const interval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(interval);
        return;
      }
      
      try {
        await this.displayCurrentStatus();
      } catch (error) {
        this.log(`Error updating display: ${error.message}`, colors.red);
      }
    }, 5000); // Update every 5 seconds

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.log('\n👋 Stopping monitor...', colors.yellow);
      this.isRunning = false;
      clearInterval(interval);
      process.exit(0);
    });
  }
}

// Helper function (moved outside class for simplicity)
async function getScheduledEmailsCount() {
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    
    const { count: scheduled } = await supabase
      .from('scheduled_emails')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'scheduled');

    const { count: sending } = await supabase
      .from('scheduled_emails')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sending');

    return {
      scheduled: scheduled || 0,
      sending: sending || 0
    };
  } catch (error) {
    return { scheduled: 0, sending: 0 };
  }
}

// Run the monitor
if (require.main === module) {
  const monitor = new RateLimitingMonitor();
  monitor.start().catch(error => {
    console.error(`${colors.red}💥 Monitor failed to start: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = RateLimitingMonitor;