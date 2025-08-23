import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Environment variables for Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
}

// Create Supabase client for frontend (using anon key for client-side operations)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'x-application': 'ophir-frontend',
    },
  },
});

// Real-time subscription helper
export function subscribeToEmailAccounts(
  organizationId: string,
  callback: (payload: any) => void
) {
  return supabase
    .channel('email-accounts-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'email_accounts',
        filter: `organization_id=eq.${organizationId}`,
      },
      callback
    )
    .subscribe();
}

// Subscribe to campaign changes
export function subscribeToCampaigns(
  organizationId: string,
  callback: (payload: any) => void
) {
  return supabase
    .channel('campaigns-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'campaigns',
        filter: `organization_id=eq.${organizationId}`,
      },
      callback
    )
    .subscribe();
}

// Subscribe to email activities for real-time tracking
export function subscribeToEmailActivities(
  campaignId: string,
  callback: (payload: any) => void
) {
  return supabase
    .channel(`email-activities-${campaignId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'email_activities',
        filter: `campaign_id=eq.${campaignId}`,
      },
      callback
    )
    .subscribe();
}

// Helper function for authenticated requests
export async function getAuthenticatedUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error('User not authenticated');
  }
  
  return user;
}

// Helper function to handle Supabase errors
export function handleSupabaseError(error: any): string {
  if (error?.code) {
    switch (error.code) {
      case 'PGRST116':
        return 'Resource not found';
      case '23505':
        return 'This resource already exists';
      case '42501':
        return 'Access denied';
      default:
        return error.message || 'An unexpected error occurred';
    }
  }
  
  return error?.message || 'An unexpected error occurred';
}

export default supabase;