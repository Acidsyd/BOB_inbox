const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Helper function to get date range based on period
const getDateRange = (period, customStart, customEnd) => {
  let startDate, endDate;

  switch(period) {
    case 'today':
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'week':
      // Get Monday of current week
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(now);
      startDate.setDate(diff);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      break;
    case 'month':
      const monthNow = new Date();
      startDate = new Date(monthNow.getFullYear(), monthNow.getMonth(), 1);
      endDate = new Date(monthNow.getFullYear(), monthNow.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case 'custom':
      if (customStart && customEnd) {
        startDate = new Date(customStart);
        endDate = new Date(customEnd);
      } else {
        // Fallback to last 30 days
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
      }
      break;
    default:
      // Default to last 30 days
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
  }

  return { startDate, endDate };
};

// Real analytics data from database with period filtering
const getDashboardAnalytics = async (organizationId, period = 'month', customStart = null, customEnd = null) => {
  try {
    const { startDate, endDate } = getDateRange(period, customStart, customEnd);
    
    // Get campaign stats
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, status, created_at')
      .eq('organization_id', organizationId);
    
    if (campaignsError) throw campaignsError;

    // Get full campaign data including config to extract lead_list_id
    const { data: fullCampaigns, error: fullCampaignsError } = await supabase
      .from('campaigns')
      .select('id, config')
      .eq('organization_id', organizationId)
      .eq('status', 'active');

    if (fullCampaignsError) throw fullCampaignsError;

    console.log('📊 Active campaigns for lead filtering:', {
      campaignCount: fullCampaigns?.length || 0,
      campaigns: fullCampaigns?.map(c => ({ id: c.id, config: c.config }))
    });

    // Extract lead_list_ids from active campaigns
    const leadListIds = fullCampaigns
      .map(c => c.config?.leadListId)
      .filter(id => id);

    console.log('📊 Lead list IDs from active campaigns:', leadListIds);

    // Get leads count from those lists (use count query to avoid 1000 row limit)
    let totalLeadsCount = 0;
    let leads = [];
    if (leadListIds.length > 0) {
      // Use count query to get accurate total
      const { count, error: countError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .in('lead_list_id', leadListIds);

      if (countError) throw countError;
      totalLeadsCount = count || 0;

      // Still fetch some lead data for status breakdown (limited to 1000 is fine for this)
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('id, status, created_at')
        .eq('organization_id', organizationId)
        .in('lead_list_id', leadListIds)
        .limit(1000);

      if (leadsError) throw leadsError;
      leads = leadsData || [];
      console.log('📊 Leads from active campaign lists:', totalLeadsCount, '(fetched', leads.length, 'for analysis)');
    } else {
      console.log('⚠️ No active campaigns with lead lists found - leads will be 0');
    }

    // Get email stats from scheduled_emails with period filter
    // Query for emails where sent_at falls in the period (for sent emails)
    // OR send_at falls in the period (for scheduled emails)
    const { data: sentEmails, error: sentEmailsError } = await supabase
      .from('scheduled_emails')
      .select('id, status, send_at, sent_at, to_email')
      .eq('organization_id', organizationId)
      .not('sent_at', 'is', null)
      .gte('sent_at', startDate.toISOString())
      .lte('sent_at', endDate.toISOString());

    const { data: scheduledEmails, error: scheduledEmailsError } = await supabase
      .from('scheduled_emails')
      .select('id, status, send_at, sent_at, to_email')
      .eq('organization_id', organizationId)
      .is('sent_at', null)
      .gte('send_at', startDate.toISOString())
      .lte('send_at', endDate.toISOString());

    if (sentEmailsError) throw sentEmailsError;
    if (scheduledEmailsError) throw scheduledEmailsError;

    // Combine both result sets
    const emails = [...(sentEmails || []), ...(scheduledEmails || [])];

    console.log('📧 Email query results:', {
      period: { start: startDate.toISOString(), end: endDate.toISOString() },
      sentEmails: sentEmails?.length || 0,
      scheduledEmails: scheduledEmails?.length || 0,
      totalEmails: emails.length,
      sentWithStatusDelivered: emails.filter(e => e.status === 'sent' || e.status === 'delivered').length,
      sampleSentEmail: sentEmails?.[0],
      sampleScheduledEmail: scheduledEmails?.[0]
    });


    // Get total sent emails count (for accurate reply rate calculation)
    const { data: totalSentEmails, error: totalSentError } = await supabase
      .from('scheduled_emails')
      .select('id')
      .eq('organization_id', organizationId)
      .in('status', ['sent', 'delivered']);

    if (totalSentError) console.error('Error fetching total sent emails:', totalSentError);

    // Get total replies count (all time, for accurate reply rate)
    // Count all received messages (both campaign and organic)
    const { data: totalReplies, error: totalRepliesError } = await supabase
      .from('conversation_messages')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('direction', 'received')
      .not('received_at', 'is', null);

    if (totalRepliesError) console.error('Error fetching total replies:', totalRepliesError);

    // Get replies received in current period (for period-specific metrics)
    // Count all received messages in the period
    const { data: periodReplies, error: periodRepliesError } = await supabase
      .from('conversation_messages')
      .select('id, direction, received_at, from_email, to_email')
      .eq('organization_id', organizationId)
      .eq('direction', 'received')
      .gte('received_at', startDate.toISOString())
      .lte('received_at', endDate.toISOString())
      .not('received_at', 'is', null);

    if (periodRepliesError) console.error('Error fetching period replies:', periodRepliesError);

    const replies = periodReplies || [];


    // Get label statistics (fetch all label assignments - not limited)
    const { data: labelAssignments, error: labelError } = await supabase
      .from('conversation_label_assignments')
      .select(`
        conversation_id,
        label_id,
        conversation_labels!inner(name, color)
      `)
      .eq('organization_id', organizationId);

    if (labelError) console.error('Error fetching labels:', labelError);

    // Get total conversations count (use count query to avoid 1000 limit)
    const { count: totalConversationsCount, error: convCountError } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    if (convCountError) console.error('Error counting conversations:', convCountError);
    console.log('📊 Conversations count result:', { totalConversationsCount, error: convCountError });

    // Get email accounts stats
    const { data: accounts, error: accountsError } = await supabase
      .from('email_accounts')
      .select('id, status')
      .eq('organization_id', organizationId);
    
    if (accountsError) throw accountsError;

    // Get daily activity for the period (for chart)
    const dailyActivity = [];
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i <= Math.min(daysDiff, 30); i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const nextDate = new Date(currentDate);
      nextDate.setDate(currentDate.getDate() + 1);
      
      const daySent = emails.filter(e => {
        const sentDate = new Date(e.sent_at || e.send_at);
        return sentDate >= currentDate && sentDate < nextDate && (e.status === 'sent' || e.status === 'delivered');
      }).length;
      
      const dayReplies = replies ? replies.filter(r => {
        const replyDate = new Date(r.received_at);
        return replyDate >= currentDate && replyDate < nextDate;
      }).length : 0;
      
      dailyActivity.push({
        date: currentDate.toISOString().split('T')[0],
        sent: daySent,
        replies: dayReplies
      });
    }

    // Process label distribution
    const labelCounts = {};
    if (labelAssignments) {
      labelAssignments.forEach(assignment => {
        const labelName = assignment.conversation_labels.name;
        const labelColor = assignment.conversation_labels.color;
        if (!labelCounts[labelName]) {
          labelCounts[labelName] = { count: 0, color: labelColor };
        }
        labelCounts[labelName].count++;
      });
    }
    
    // Calculate unlabeled conversations
    const totalConversations = totalConversationsCount || 0;
    const labeledConversations = labelAssignments ? new Set(labelAssignments.map(a => a.conversation_id)).size : 0;
    const unlabeledCount = Math.max(0, totalConversations - labeledConversations);
    
    if (unlabeledCount > 0) {
      labelCounts['No Label'] = { count: unlabeledCount, color: '#9CA3AF' };
    }

    // Calculate stats
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    const totalLeads = totalLeadsCount; // Use the count query result, not the limited array length
    const activeLeads = leads.filter(l => l.status === 'active' || !l.status).length;
    
    // Email stats for period
    const sentEmailCount = emails.filter(e => e.status === 'sent' || e.status === 'delivered').length;
    const bouncedEmails = emails.filter(e => e.status === 'bounced' || e.status === 'failed').length;
    const repliedEmails = replies ? replies.length : 0;

    // Calculate rates using PERIOD data (not all-time)
    // Reply rate: replies in period / emails sent in period
    const replyRate = sentEmailCount > 0 ? ((repliedEmails / sentEmailCount) * 100).toFixed(1) : '0.0';
    const bounceRate = sentEmailCount > 0 ? ((bouncedEmails / sentEmailCount) * 100).toFixed(1) : '0.0';

    console.log('📊 Metrics calculation:', {
      sentEmailCount,
      repliedEmails,
      replyRate,
      totalLeads: leads.length,
      activeCampaigns: campaigns.filter(c => c.status === 'active').length
    });

    
    // Account health
    const totalAccounts = accounts.length;
    const activeAccounts = accounts.filter(a => a.status === 'active').length;
    const avgHealth = totalAccounts > 0 ? Math.round((activeAccounts / totalAccounts) * 100) : 0;

    // Get inbox unread count
    const { data: unreadMessages, error: unreadError } = await supabase
      .from('conversation_messages')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('direction', 'received')
      .eq('is_read', false);
    
    const unreadCount = unreadMessages ? unreadMessages.length : 0;

    return {
      period: {
        type: period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      metrics: {
        emailsSent: sentEmailCount,
        replyRate: parseFloat(replyRate),
        activeCampaigns: activeCampaigns,
        totalLeads: totalLeads,
        inboxActivity: unreadCount
      },
      campaigns: {
        total: totalCampaigns,
        active: activeCampaigns
      },
      leads: {
        total: totalLeads,
        active: activeLeads,
        replied: repliedEmails,
        bounced: bouncedEmails
      },
      emails: {
        sent: sentEmails,
        opened: 0, // TODO: Add when tracking available
        clicked: 0, // TODO: Add when tracking available
        replied: repliedEmails,
        bounced: bouncedEmails
      },
      accounts: {
        total: totalAccounts,
        avgHealth: avgHealth
      },
      rates: {
        openRate: '0%', // TODO: Add when tracking available
        clickRate: '0%', // TODO: Add when tracking available
        replyRate: replyRate + '%',
        bounceRate: bounceRate + '%'
      },
      labels: labelCounts,
      dailyActivity: dailyActivity
    };
  } catch (error) {
    console.error('Error fetching analytics:', error);
    // Return empty stats if there's an error
    return {
      period: { type: period, startDate: '', endDate: '' },
      metrics: { emailsSent: 0, replyRate: 0, activeCampaigns: 0, totalLeads: 0, inboxActivity: 0 },
      campaigns: { total: 0, active: 0 },
      leads: { total: 0, active: 0, replied: 0, bounced: 0 },
      emails: { sent: 0, opened: 0, clicked: 0, replied: 0, bounced: 0 },
      accounts: { total: 0, avgHealth: 0 },
      rates: { openRate: '0%', clickRate: '0%', replyRate: '0%', bounceRate: '0%' },
      labels: {},
      dailyActivity: []
    };
  }
};

// GET /api/analytics/dashboard - Dashboard overview statistics with period filtering
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { period = 'month', startDate, endDate } = req.query;

    console.log('📊 Dashboard analytics request:', {
      organizationId,
      period,
      startDate,
      endDate,
      user: req.user.email
    });

    const analytics = await getDashboardAnalytics(organizationId, period, startDate, endDate);

    console.log('📊 Dashboard analytics response:', {
      organizationId,
      metrics: analytics.metrics,
      leads: analytics.leads,
      campaigns: analytics.campaigns
    });

    // Return the data directly without wrapping in data property
    // The frontend expects res.data to be the analytics object
    res.json(analytics);
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard analytics'
    });
  }
});

// GET /api/analytics/campaigns/:id - Campaign performance metrics
router.get('/campaigns/:id', (req, res) => {
  try {
    const campaignId = req.params.id;
    
    // Mock campaign analytics - in production fetch from database
    const campaignAnalytics = {
      campaignId,
      name: `Campaign ${campaignId}`,
      status: 'active',
      sent: 245,
      delivered: 240,
      bounced: 5,
      opened: 58,
      clicked: 12,
      replied: 3,
      unsubscribed: 1,
      openRate: 24.2,
      clickRate: 5.0,
      replyRate: 1.25,
      bounceRate: 2.04,
      unsubscribeRate: 0.41,
      dailyStats: Array.from({ length: 14 }, (_, i) => ({
        date: new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        sent: Math.floor(Math.random() * 20) + 5,
        opened: Math.floor(Math.random() * 8) + 1,
        clicked: Math.floor(Math.random() * 3),
        replies: Math.floor(Math.random() * 2)
      })),
      topPerformingEmails: [
        { subject: 'Introduction Email', openRate: 28.5, clickRate: 6.2 },
        { subject: 'Follow-up #1', openRate: 22.1, clickRate: 4.8 },
        { subject: 'Final Follow-up', openRate: 18.9, clickRate: 3.1 }
      ]
    };
    
    res.json({
      success: true,
      data: campaignAnalytics
    });
  } catch (error) {
    console.error('Campaign analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign analytics'
    });
  }
});

// GET /api/analytics/accounts/:id - Email account performance
router.get('/accounts/:id', (req, res) => {
  try {
    const accountId = req.params.id;
    
    // Mock account analytics - in production fetch from database
    const accountAnalytics = {
      accountId,
      email: `account${accountId}@example.com`,
      status: 'active',
      reputation: 'good',
      dailyLimit: 50,
      sent: 127,
      delivered: 124,
      bounced: 3,
      opened: 31,
      clicked: 7,
      replied: 2,
      deliverabilityScore: 87.5,
      reputationScore: 92.0,
      warmupProgress: 75,
      dailyStats: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        sent: Math.floor(Math.random() * 20) + 10,
        delivered: Math.floor(Math.random() * 18) + 9,
        bounced: Math.floor(Math.random() * 2),
        reputation: 85 + Math.random() * 10
      }))
    };
    
    res.json({
      success: true,
      data: accountAnalytics
    });
  } catch (error) {
    console.error('Account analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch account analytics'
    });
  }
});

// GET /api/analytics/leads/:id - Lead engagement history
router.get('/leads/:id', (req, res) => {
  try {
    const leadId = req.params.id;
    
    // Mock lead analytics - in production fetch from database
    const leadAnalytics = {
      leadId,
      email: `lead${leadId}@company.com`,
      name: `Lead ${leadId}`,
      company: `Company ${leadId}`,
      status: 'active',
      engagementScore: 65,
      emailsReceived: 5,
      emailsOpened: 2,
      linksClicked: 1,
      replies: 0,
      lastActivity: new Date(Date.now() - 86400000), // 1 day ago
      engagementHistory: [
        { date: new Date(Date.now() - 86400000), action: 'email_opened', campaign: 'Campaign A' },
        { date: new Date(Date.now() - 172800000), action: 'link_clicked', campaign: 'Campaign A' },
        { date: new Date(Date.now() - 259200000), action: 'email_received', campaign: 'Campaign A' },
        { date: new Date(Date.now() - 432000000), action: 'email_opened', campaign: 'Campaign B' },
        { date: new Date(Date.now() - 518400000), action: 'email_received', campaign: 'Campaign B' }
      ]
    };
    
    res.json({
      success: true,
      data: leadAnalytics
    });
  } catch (error) {
    console.error('Lead analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lead analytics'
    });
  }
});

module.exports = router;