/**
 * Column Templates Library
 * Pre-built column configurations for various use cases
 */

import { ColumnDefinition, ColumnType } from '@/types/spreadsheet';

// Template Category Types
export type TemplateCategory = 
  | 'sales_development'
  | 'marketing_qualified'
  | 'account_based'
  | 'ecommerce'
  | 'saas'
  | 'recruiting'
  | 'real_estate'
  | 'finance'
  | 'general';

// Template Interface
export interface ColumnTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  icon: string;
  columns: Omit<ColumnDefinition, 'id'>[];
  tags: string[];
  popularity: number;
  isCustom: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Template Set Interface
export interface TemplateSet {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  templates: ColumnTemplate[];
  isDefault: boolean;
}

// Column Templates Library
export class ColumnTemplatesLibrary {
  private static templates: ColumnTemplate[] = [];

  // Initialize with default templates
  static initialize(): void {
    this.templates = [
      ...this.getSalesDevelopmentTemplates(),
      ...this.getMarketingQualifiedTemplates(),
      ...this.getAccountBasedTemplates(),
      ...this.getEcommerceTemplates(),
      ...this.getSaasTemplates(),
      ...this.getRecruitingTemplates(),
      ...this.getRealEstateTemplates(),
      ...this.getFinanceTemplates(),
      ...this.getGeneralTemplates()
    ];
  }

  // Get all templates
  static getAll(): ColumnTemplate[] {
    return [...this.templates];
  }

  // Get templates by category
  static getByCategory(category: TemplateCategory): ColumnTemplate[] {
    return this.templates.filter(t => t.category === category);
  }

  // Get template by ID
  static getById(id: string): ColumnTemplate | undefined {
    return this.templates.find(t => t.id === id);
  }

  // Search templates
  static search(query: string, category?: TemplateCategory): ColumnTemplate[] {
    let filtered = category ? this.getByCategory(category) : this.templates;
    
    if (!query.trim()) return filtered;

    const lowerQuery = query.toLowerCase();
    return filtered.filter(t => 
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      t.columns.some(col => 
        col.name.toLowerCase().includes(lowerQuery) ||
        col.key.toLowerCase().includes(lowerQuery)
      )
    );
  }

  // Add custom template
  static addCustomTemplate(template: Omit<ColumnTemplate, 'id' | 'isCustom' | 'createdAt' | 'updatedAt'>): ColumnTemplate {
    const newTemplate: ColumnTemplate = {
      ...template,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isCustom: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.templates.push(newTemplate);
    return newTemplate;
  }

  // Update template
  static updateTemplate(id: string, updates: Partial<ColumnTemplate>): ColumnTemplate | null {
    const index = this.templates.findIndex(t => t.id === id);
    if (index === -1) return null;
    
    this.templates[index] = {
      ...this.templates[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    return this.templates[index];
  }

  // Delete template
  static deleteTemplate(id: string): boolean {
    const index = this.templates.findIndex(t => t.id === id && t.isCustom);
    if (index === -1) return false;
    
    this.templates.splice(index, 1);
    return true;
  }

  // Get popular templates
  static getPopular(limit = 10): ColumnTemplate[] {
    return [...this.templates]
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);
  }

  // Sales Development Templates
  private static getSalesDevelopmentTemplates(): ColumnTemplate[] {
    return [
      {
        id: 'sdr_basic',
        name: 'SDR Basics',
        description: 'Essential columns for sales development representatives',
        category: 'sales_development',
        icon: '🎯',
        popularity: 95,
        isCustom: false,
        tags: ['sales', 'outbound', 'leads', 'basic'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        columns: [
          {
            key: 'lead_score',
            name: 'Lead Score',
            type: 'formula',
            width: 100,
            minWidth: 80,
            resizable: true,
            sortable: true,
            filterable: true,
            editable: false,
            hidden: false,
            formula: {
              expression: 'LEAD_SCORE()',
              dependencies: ['company', 'jobTitle', 'email', 'linkedinUrl'],
              resultType: 'number'
            },
            formatting: {
              numberFormat: { decimals: 0, suffix: '/100' }
            }
          },
          {
            key: 'contact_status',
            name: 'Contact Status',
            type: 'select',
            width: 120,
            minWidth: 100,
            resizable: true,
            sortable: true,
            filterable: true,
            editable: true,
            hidden: false,
            selectOptions: [
              { value: 'not_contacted', label: 'Not Contacted', color: '#gray' },
              { value: 'contacted', label: 'Contacted', color: '#blue' },
              { value: 'responded', label: 'Responded', color: '#green' },
              { value: 'interested', label: 'Interested', color: '#purple' },
              { value: 'not_interested', label: 'Not Interested', color: '#red' },
              { value: 'unqualified', label: 'Unqualified', color: '#yellow' }
            ]
          },
          {
            key: 'last_contacted',
            name: 'Last Contacted',
            type: 'date',
            width: 120,
            minWidth: 100,
            resizable: true,
            sortable: true,
            filterable: true,
            editable: true,
            hidden: false,
            formatting: {
              dateFormat: 'MM/dd/yyyy'
            }
          },
          {
            key: 'next_follow_up',
            name: 'Next Follow-up',
            type: 'date',
            width: 120,
            minWidth: 100,
            resizable: true,
            sortable: true,
            filterable: true,
            editable: true,
            hidden: false,
            formatting: {
              dateFormat: 'MM/dd/yyyy'
            }
          },
          {
            key: 'email_sequence_stage',
            name: 'Email Stage',
            type: 'number',
            width: 100,
            minWidth: 80,
            resizable: true,
            sortable: true,
            filterable: true,
            editable: true,
            hidden: false,
            validation: {
              minLength: 1,
              maxLength: 10
            }
          }
        ]
      },
      {
        id: 'sdr_advanced',
        name: 'SDR Advanced',
        description: 'Advanced tracking for experienced SDRs with enrichment',
        category: 'sales_development',
        icon: '🚀',
        popularity: 78,
        isCustom: false,
        tags: ['sales', 'advanced', 'enrichment', 'tracking'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        columns: [
          {
            key: 'intent_signal',
            name: 'Intent Signal',
            type: 'enrichment',
            width: 120,
            minWidth: 100,
            resizable: true,
            sortable: true,
            filterable: true,
            editable: false,
            hidden: false,
            enrichment: {
              provider: 'custom_ai',
              endpoint: '/api/intent-analysis',
              mapping: { company: 'company_name', jobTitle: 'job_title' },
              autoRun: true
            }
          },
          {
            key: 'company_growth',
            name: 'Company Growth',
            type: 'enrichment',
            width: 120,
            minWidth: 100,
            resizable: true,
            sortable: true,
            filterable: true,
            editable: false,
            hidden: false,
            enrichment: {
              provider: 'clearbit',
              endpoint: '/company/growth',
              mapping: { domain: 'company_domain' },
              autoRun: false
            }
          },
          {
            key: 'personalization_note',
            name: 'Personalization',
            type: 'formula',
            width: 200,
            minWidth: 150,
            resizable: true,
            sortable: false,
            filterable: true,
            editable: false,
            hidden: false,
            formula: {
              expression: 'AI_PERSONALIZE(firstName, company, jobTitle, recentNews)',
              dependencies: ['firstName', 'company', 'jobTitle'],
              resultType: 'text'
            }
          },
          {
            key: 'engagement_score',
            name: 'Engagement Score',
            type: 'formula',
            width: 120,
            minWidth: 100,
            resizable: true,
            sortable: true,
            filterable: true,
            editable: false,
            hidden: false,
            formula: {
              expression: 'IF(replies > 0, 100, IF(emailsOpened > 0, 50, IF(emailsSent > 0, 25, 0)))',
              dependencies: ['replies', 'emailsOpened', 'emailsSent'],
              resultType: 'number'
            }
          }
        ]
      }
    ];
  }

  // Marketing Qualified Templates
  private static getMarketingQualifiedTemplates(): ColumnTemplate[] {
    return [
      {
        id: 'mql_scoring',
        name: 'MQL Scoring',
        description: 'Marketing qualified lead scoring and attribution',
        category: 'marketing_qualified',
        icon: '📊',
        popularity: 85,
        isCustom: false,
        tags: ['marketing', 'scoring', 'qualification', 'attribution'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        columns: [
          {
            key: 'mql_score',
            name: 'MQL Score',
            type: 'formula',
            width: 100,
            minWidth: 80,
            resizable: true,
            sortable: true,
            filterable: true,
            editable: false,
            hidden: false,
            formula: {
              expression: 'SUM(website_visits * 5, content_downloads * 10, email_clicks * 3, form_fills * 15)',
              dependencies: ['website_visits', 'content_downloads', 'email_clicks', 'form_fills'],
              resultType: 'number'
            }
          },
          {
            key: 'lead_source',
            name: 'Lead Source',
            type: 'select',
            width: 120,
            minWidth: 100,
            resizable: true,
            sortable: true,
            filterable: true,
            editable: true,
            hidden: false,
            selectOptions: [
              { value: 'website', label: 'Website', color: '#blue' },
              { value: 'social_media', label: 'Social Media', color: '#purple' },
              { value: 'email_campaign', label: 'Email Campaign', color: '#green' },
              { value: 'paid_ads', label: 'Paid Ads', color: '#orange' },
              { value: 'referral', label: 'Referral', color: '#pink' },
              { value: 'event', label: 'Event', color: '#indigo' }
            ]
          },
          {
            key: 'utm_campaign',
            name: 'Campaign',
            type: 'text',
            width: 150,
            minWidth: 120,
            resizable: true,
            sortable: true,
            filterable: true,
            editable: true,
            hidden: false
          },
          {
            key: 'lifecycle_stage',
            name: 'Lifecycle Stage',
            type: 'select',
            width: 120,
            minWidth: 100,
            resizable: true,
            sortable: true,
            filterable: true,
            editable: true,
            hidden: false,
            selectOptions: [
              { value: 'subscriber', label: 'Subscriber', color: '#gray' },
              { value: 'lead', label: 'Lead', color: '#blue' },
              { value: 'mql', label: 'MQL', color: '#green' },
              { value: 'sql', label: 'SQL', color: '#purple' },
              { value: 'opportunity', label: 'Opportunity', color: '#orange' },
              { value: 'customer', label: 'Customer', color: '#pink' }
            ]
          }
        ]
      }
    ];
  }

  // Account-Based Marketing Templates
  private static getAccountBasedTemplates(): ColumnTemplate[] {
    return [
      {
        id: 'abm_targeting',
        name: 'ABM Targeting',
        description: 'Account-based marketing with account intelligence',
        category: 'account_based',
        icon: '🏢',
        popularity: 72,
        isCustom: false,
        tags: ['abm', 'accounts', 'targeting', 'enterprise'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        columns: [
          {
            key: 'account_tier',
            name: 'Account Tier',
            type: 'select',
            width: 100,
            minWidth: 80,
            resizable: true,
            sortable: true,
            filterable: true,
            editable: true,
            hidden: false,
            selectOptions: [
              { value: 'tier_1', label: 'Tier 1', color: '#green' },
              { value: 'tier_2', label: 'Tier 2', color: '#blue' },
              { value: 'tier_3', label: 'Tier 3', color: '#yellow' }
            ]
          },
          {
            key: 'account_penetration',
            name: 'Penetration',
            type: 'formula',
            width: 100,
            minWidth: 80,
            resizable: true,
            sortable: true,
            filterable: true,
            editable: false,
            hidden: false,
            formula: {
              expression: 'contacts_in_account / estimated_company_size * 100',
              dependencies: ['contacts_in_account', 'estimated_company_size'],
              resultType: 'number'
            },
            formatting: {
              numberFormat: { decimals: 1, suffix: '%' }
            }
          },
          {
            key: 'buying_committee_role',
            name: 'Committee Role',
            type: 'select',
            width: 120,
            minWidth: 100,
            resizable: true,
            sortable: true,
            filterable: true,
            editable: true,
            hidden: false,
            selectOptions: [
              { value: 'economic_buyer', label: 'Economic Buyer', color: '#green' },
              { value: 'technical_buyer', label: 'Technical Buyer', color: '#blue' },
              { value: 'user_buyer', label: 'User Buyer', color: '#purple' },
              { value: 'coach', label: 'Coach', color: '#orange' },
              { value: 'influencer', label: 'Influencer', color: '#pink' }
            ]
          },
          {
            key: 'account_engagement',
            name: 'Account Engagement',
            type: 'formula',
            width: 120,
            minWidth: 100,
            resizable: true,
            sortable: true,
            filterable: true,
            editable: false,
            hidden: false,
            formula: {
              expression: 'AVERAGE(website_visits, email_engagement, content_consumption)',
              dependencies: ['website_visits', 'email_engagement', 'content_consumption'],
              resultType: 'number'
            }
          }
        ]
      }
    ];
  }

  // E-commerce Templates
  private static getEcommerceTemplates(): ColumnTemplate[] {
    return [
      {
        id: 'ecommerce_customers',
        name: 'E-commerce Customers',
        description: 'Customer segmentation and lifetime value tracking',
        category: 'ecommerce',
        icon: '🛒',
        popularity: 68,
        isCustom: false,
        tags: ['ecommerce', 'customers', 'clv', 'segmentation'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        columns: [
          {
            key: 'customer_ltv',
            name: 'Customer LTV',
            type: 'formula',
            width: 120,
            minWidth: 100,
            resizable: true,
            sortable: true,
            filterable: true,
            editable: false,
            hidden: false,
            formula: {
              expression: 'average_order_value * order_frequency * customer_lifespan',
              dependencies: ['average_order_value', 'order_frequency', 'customer_lifespan'],
              resultType: 'number'
            },
            formatting: {
              currency: 'USD',
              numberFormat: { decimals: 2, prefix: '$' }
            }
          },
          {
            key: 'rfm_segment',
            name: 'RFM Segment',
            type: 'formula',
            width: 120,
            minWidth: 100,
            resizable: true,
            sortable: true,
            filterable: true,
            editable: false,
            hidden: false,
            formula: {
              expression: 'RFM_SEGMENT(recency, frequency, monetary)',
              dependencies: ['recency', 'frequency', 'monetary'],
              resultType: 'text'
            }
          },
          {
            key: 'purchase_probability',
            name: 'Purchase Probability',
            type: 'formula',
            width: 120,
            minWidth: 100,
            resizable: true,
            sortable: true,
            filterable: true,
            editable: false,
            hidden: false,
            formula: {
              expression: 'AI_PREDICT_PURCHASE(recency, frequency, monetary, browsing_behavior)',
              dependencies: ['recency', 'frequency', 'monetary', 'browsing_behavior'],
              resultType: 'number'
            },
            formatting: {
              numberFormat: { decimals: 1, suffix: '%' }
            }
          }
        ]
      }
    ];
  }

  // SaaS Templates
  private static getSaasTemplates(): ColumnTemplate[] {
    return [
      {
        id: 'saas_subscription',
        name: 'SaaS Subscription',
        description: 'SaaS customer metrics and churn prediction',
        category: 'saas',
        icon: '💻',
        popularity: 79,
        isCustom: false,
        tags: ['saas', 'subscription', 'churn', 'mrr'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        columns: [
          {
            key: 'mrr',
            name: 'MRR',
            type: 'formula',
            width: 100,
            minWidth: 80,
            resizable: true,
            sortable: true,
            filterable: true,
            editable: false,
            hidden: false,
            formula: {
              expression: 'subscription_price * (billing_frequency = "monthly" ? 1 : billing_frequency = "yearly" ? 12 : 1)',
              dependencies: ['subscription_price', 'billing_frequency'],
              resultType: 'number'
            },
            formatting: {
              currency: 'USD',
              numberFormat: { decimals: 2, prefix: '$' }
            }
          },
          {
            key: 'churn_risk',
            name: 'Churn Risk',
            type: 'formula',
            width: 100,
            minWidth: 80,
            resizable: true,
            sortable: true,
            filterable: true,
            editable: false,
            hidden: false,
            formula: {
              expression: 'AI_CHURN_RISK(usage_trend, support_tickets, payment_issues, engagement_score)',
              dependencies: ['usage_trend', 'support_tickets', 'payment_issues', 'engagement_score'],
              resultType: 'number'
            },
            formatting: {
              numberFormat: { decimals: 1, suffix: '%' }
            }
          },
          {
            key: 'usage_health',
            name: 'Usage Health',
            type: 'formula',
            width: 120,
            minWidth: 100,
            resizable: true,
            sortable: true,
            filterable: true,
            editable: false,
            hidden: false,
            formula: {
              expression: 'IF(daily_active_users > 0.7 * seat_count, "Healthy", IF(daily_active_users > 0.3 * seat_count, "At Risk", "Critical"))',
              dependencies: ['daily_active_users', 'seat_count'],
              resultType: 'text'
            }
          }
        ]
      }
    ];
  }

  // Recruiting Templates
  private static getRecruitingTemplates(): ColumnTemplate[] {
    return [
      {
        id: 'talent_pipeline',
        name: 'Talent Pipeline',
        description: 'Candidate tracking and qualification for recruiting',
        category: 'recruiting',
        icon: '👥',
        popularity: 54,
        isCustom: false,
        tags: ['recruiting', 'candidates', 'hiring', 'pipeline'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        columns: [
          {
            key: 'candidate_fit_score',
            name: 'Fit Score',
            type: 'formula',
            width: 100,
            minWidth: 80,
            resizable: true,
            sortable: true,
            filterable: true,
            editable: false,
            hidden: false,
            formula: {
              expression: 'AI_CANDIDATE_FIT(skills, experience, culture_fit, salary_expectations)',
              dependencies: ['skills', 'experience', 'culture_fit', 'salary_expectations'],
              resultType: 'number'
            },
            formatting: {
              numberFormat: { decimals: 0, suffix: '/100' }
            }
          },
          {
            key: 'interview_stage',
            name: 'Interview Stage',
            type: 'select',
            width: 120,
            minWidth: 100,
            resizable: true,
            sortable: true,
            filterable: true,
            editable: true,
            hidden: false,
            selectOptions: [
              { value: 'applied', label: 'Applied', color: '#gray' },
              { value: 'screening', label: 'Phone Screen', color: '#blue' },
              { value: 'technical', label: 'Technical', color: '#purple' },
              { value: 'onsite', label: 'On-site', color: '#green' },
              { value: 'reference', label: 'Reference', color: '#orange' },
              { value: 'offer', label: 'Offer', color: '#pink' },
              { value: 'hired', label: 'Hired', color: '#green' },
              { value: 'rejected', label: 'Rejected', color: '#red' }
            ]
          }
        ]
      }
    ];
  }

  // Real Estate Templates
  private static getRealEstateTemplates(): ColumnTemplate[] {
    return [
      {
        id: 'real_estate_leads',
        name: 'Real Estate Leads',
        description: 'Property leads with valuation and qualification',
        category: 'real_estate',
        icon: '🏠',
        popularity: 43,
        isCustom: false,
        tags: ['real_estate', 'property', 'valuation', 'leads'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        columns: [
          {
            key: 'property_value_estimate',
            name: 'Est. Value',
            type: 'enrichment',
            width: 120,
            minWidth: 100,
            resizable: true,
            sortable: true,
            filterable: true,
            editable: false,
            hidden: false,
            enrichment: {
              provider: 'zillow_api',
              endpoint: '/property/estimate',
              mapping: { address: 'property_address' },
              autoRun: true
            },
            formatting: {
              currency: 'USD',
              numberFormat: { decimals: 0, prefix: '$' }
            }
          },
          {
            key: 'lead_urgency',
            name: 'Urgency',
            type: 'select',
            width: 100,
            minWidth: 80,
            resizable: true,
            sortable: true,
            filterable: true,
            editable: true,
            hidden: false,
            selectOptions: [
              { value: 'hot', label: 'Hot', color: '#red' },
              { value: 'warm', label: 'Warm', color: '#orange' },
              { value: 'cold', label: 'Cold', color: '#blue' }
            ]
          }
        ]
      }
    ];
  }

  // Finance Templates
  private static getFinanceTemplates(): ColumnTemplate[] {
    return [
      {
        id: 'financial_leads',
        name: 'Financial Services',
        description: 'Financial services leads with risk assessment',
        category: 'finance',
        icon: '💰',
        popularity: 38,
        isCustom: false,
        tags: ['finance', 'risk', 'wealth', 'advisory'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        columns: [
          {
            key: 'risk_profile',
            name: 'Risk Profile',
            type: 'select',
            width: 120,
            minWidth: 100,
            resizable: true,
            sortable: true,
            filterable: true,
            editable: true,
            hidden: false,
            selectOptions: [
              { value: 'conservative', label: 'Conservative', color: '#green' },
              { value: 'moderate', label: 'Moderate', color: '#blue' },
              { value: 'aggressive', label: 'Aggressive', color: '#red' }
            ]
          },
          {
            key: 'investment_capacity',
            name: 'Investment Capacity',
            type: 'formula',
            width: 150,
            minWidth: 120,
            resizable: true,
            sortable: true,
            filterable: true,
            editable: false,
            hidden: false,
            formula: {
              expression: 'estimated_income * 0.15',
              dependencies: ['estimated_income'],
              resultType: 'number'
            },
            formatting: {
              currency: 'USD',
              numberFormat: { decimals: 0, prefix: '$' }
            }
          }
        ]
      }
    ];
  }

  // General Templates
  private static getGeneralTemplates(): ColumnTemplate[] {
    return [
      {
        id: 'data_quality',
        name: 'Data Quality',
        description: 'Data validation and quality indicators',
        category: 'general',
        icon: '✅',
        popularity: 62,
        isCustom: false,
        tags: ['data', 'quality', 'validation', 'cleanup'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        columns: [
          {
            key: 'data_completeness',
            name: 'Data Completeness',
            type: 'formula',
            width: 120,
            minWidth: 100,
            resizable: true,
            sortable: true,
            filterable: true,
            editable: false,
            hidden: false,
            formula: {
              expression: '((!ISBLANK(firstName) ? 1 : 0) + (!ISBLANK(lastName) ? 1 : 0) + (!ISBLANK(email) ? 1 : 0) + (!ISBLANK(company) ? 1 : 0) + (!ISBLANK(phone) ? 1 : 0)) / 5 * 100',
              dependencies: ['firstName', 'lastName', 'email', 'company', 'phone'],
              resultType: 'number'
            },
            formatting: {
              numberFormat: { decimals: 0, suffix: '%' }
            }
          },
          {
            key: 'email_validity',
            name: 'Email Valid',
            type: 'formula',
            width: 100,
            minWidth: 80,
            resizable: true,
            sortable: true,
            filterable: true,
            editable: false,
            hidden: false,
            formula: {
              expression: 'ISEMAIL(email)',
              dependencies: ['email'],
              resultType: 'boolean'
            }
          },
          {
            key: 'phone_validity',
            name: 'Phone Valid',
            type: 'formula',
            width: 100,
            minWidth: 80,
            resizable: true,
            sortable: true,
            filterable: true,
            editable: false,
            hidden: false,
            formula: {
              expression: 'ISPHONE(phone)',
              dependencies: ['phone'],
              resultType: 'boolean'
            }
          }
        ]
      }
    ];
  }
}

// Initialize the library
ColumnTemplatesLibrary.initialize();

export default ColumnTemplatesLibrary;