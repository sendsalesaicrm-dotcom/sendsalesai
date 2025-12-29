import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Placeholder for future auth context or session management
 */
export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.user || null;
};