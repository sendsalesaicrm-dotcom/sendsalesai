export type EvolutionFetchProfilePictureParams = {
  baseUrl: string;
  apiKey: string;
  instance: string;
  remoteJid: string; // e.g. 5511999999999@s.whatsapp.net
};

const ensureAbsoluteUrl = (url: string) => {
  let cleaned = (url || '').trim().replace(/^\/+/, '');
  if (cleaned.startsWith('https:/') && !cleaned.startsWith('https://')) {
    cleaned = cleaned.replace('https:/', 'https://');
  }
  cleaned = cleaned.replace('http://', 'https://');
  if (!cleaned.startsWith('http')) cleaned = 'https://' + cleaned;
  return cleaned.replace(/\/+$/, '');
};

const pickFirstString = (...candidates: any[]): string => {
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return '';
};

export const normalizePhoneDigits = (raw: string): string => String(raw || '').replace(/\D/g, '');

export const toWhatsAppRemoteJid = (phone: string): string => {
  const digits = normalizePhoneDigits(phone);
  return digits ? `${digits}@s.whatsapp.net` : '';
};

export const fetchProfilePictureUrl = async (
  params: EvolutionFetchProfilePictureParams
): Promise<string | null> => {
  const base = ensureAbsoluteUrl(params.baseUrl);
  const instance = encodeURIComponent(params.instance);
  const url = `${base}/chat/fetchProfilePictureUrl/${instance}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: params.apiKey,
    },
    body: JSON.stringify({
      number: params.remoteJid,
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      (data as any)?.message ||
      (data as any)?.error ||
      (data as any)?.msg ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }

  // Evolution versions vary. Try common shapes.
  const candidate = pickFirstString(
    (data as any)?.profilePictureUrl,
    (data as any)?.profilePicture,
    (data as any)?.url,
    (data as any)?.data?.profilePictureUrl,
    (data as any)?.data?.url,
    (data as any)?.result?.profilePictureUrl,
    (data as any)?.result?.url,
    typeof data === 'string' ? data : ''
  );

  return candidate || null;
};
