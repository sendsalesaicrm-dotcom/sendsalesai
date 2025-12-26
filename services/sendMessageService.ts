import { supabase } from './supabaseClient';

interface SendMessageParams {
  organizationId: string;
  phone: string;
  message: string;
}

export const sendMessage = async ({ organizationId, phone, message }: SendMessageParams) => {
  const { data, error } = await supabase.functions.invoke('bright-handler', {
    body: {
      organization_id: organizationId,
      phone,
      message
    }
  });

  if (error) throw error;
  
  if (data && data.success === false) {
      throw new Error(data.error || 'Erro desconhecido ao enviar mensagem.');
  }
  
  return data;
};