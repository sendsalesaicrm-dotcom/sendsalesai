import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ohgcufkcrpehkvxavmhw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oZ2N1ZmtjcnBlaGt2eGF2bWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDYzOTQsImV4cCI6MjA4MDUyMjM5NH0.vNW3laRLyWW066zzYddPKQYzQ6YGCFkPeW3HlOs5aHg';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Placeholder for future auth context or session management
 */
export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.user || null;
};