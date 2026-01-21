import { supabase } from './supabaseClient';

const getFunctionsErrorMessage = (error: any): string => {
  const context = error?.context;
  const body = context?.body;
  const status = context?.status;
  const statusText = context?.statusText;

  const asStatus = () => {
    if (status) return `HTTP ${status}${statusText ? ` (${statusText})` : ''}`;
    return '';
  };

  if (typeof body === 'string' && body.trim()) {
    try {
      const parsed = JSON.parse(body);
      return (
        parsed?.error_description ||
        parsed?.error ||
        parsed?.message ||
        parsed?.msg ||
        `${asStatus()} ${body}`.trim()
      );
    } catch {
      return `${asStatus()} ${body}`.trim();
    }
  }

  if (body && typeof body === 'object') {
    const msg =
      (body as any).error_description ||
      (body as any).error ||
      (body as any).message ||
      (body as any).msg;

    if (typeof msg === 'string' && msg.trim()) return msg;

    // Avoid showing '{}' as an error message
    const asJson = (() => {
      try {
        return JSON.stringify(body);
      } catch {
        return '';
      }
    })();

    if (asJson && asJson !== '{}' && asJson !== '[]') return `${asStatus()} ${asJson}`.trim();
  }

  return asStatus() || error?.message || 'Erro desconhecido ao enviar mensagem.';
};

type SendTextParams = {
  type?: 'text';
  organizationId: string;
  phone: string;
  message: string;
};

export type SendMediaParams = {
  type: 'media';
  organizationId: string;
  phone: string;
  media: string; // url or base64
  mediatype: 'image' | 'video' | 'document';
  mimetype: string;
  caption?: string;
  fileName?: string;
  delay?: number;
};

export type SendMessageParams = SendTextParams | SendMediaParams;

export const sendMessage = async (params: SendMessageParams) => {
  const { data, error } = await supabase.functions.invoke('bright-handler', {
    body: {
      type: params.type ?? 'text',
      organization_id: params.organizationId,
      phone: params.phone,
      ...(params.type === 'media'
        ? {
            media: params.media,
            mediatype: params.mediatype,
            mimetype: params.mimetype,
            caption: params.caption,
            fileName: params.fileName,
            delay: params.delay,
          }
        : {
            message: params.message,
          }),
    }
  });

  if (error) {
    console.error('bright-handler invoke error:', error);
    throw new Error(getFunctionsErrorMessage(error));
  }
  
  if (data && data.success === false) {
      throw new Error(data.error || 'Erro desconhecido ao enviar mensagem.');
  }
  
  return data;
};