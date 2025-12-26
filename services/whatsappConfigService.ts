import { supabase } from './supabaseClient';
import { WhatsAppConfig } from '../types';

export const getWhatsAppConfig = async (organizationId: string): Promise<WhatsAppConfig | null> => {
  if (!organizationId) return null;

  const { data, error } = await supabase
    .from('whatsapp_config')
    .select('*')
    .eq('organization_id', organizationId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
    console.error('Error fetching WhatsApp config:', error);
    return null;
  }

  return data;
};

export const saveWhatsAppConfig = async (config: WhatsAppConfig): Promise<{ success: boolean; error?: any }> => {
  if (!config.organization_id) return { success: false, error: 'Organization ID missing' };

  // Prepare data for upsert
  const payload = {
    organization_id: config.organization_id,
    waba_id: config.waba_id,
    phone_number_id: config.phone_number_id,
    verify_token: config.verify_token,
    access_token: config.access_token,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('whatsapp_config')
    .upsert(payload, { onConflict: 'organization_id' });

  if (error) {
    console.error('Error saving WhatsApp config:', error);
    return { success: false, error };
  }

  return { success: true };
};