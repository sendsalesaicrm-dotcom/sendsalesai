export type EvolutionGetBase64Params = {
  baseUrl: string;
  apiKey: string;
  instance: string;
  messageId: string;
  convertToMp4?: boolean;
};

export type EvolutionBase64Result = {
  base64: string;
  mimeType?: string;
  dataUrl: string;
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

const normalizeBase64 = (input: string): { base64: string; mimeType?: string; dataUrl?: string } => {
  const raw = String(input || '').trim();
  if (!raw) return { base64: '' };

  // If it's already a data URL, keep it.
  if (raw.startsWith('data:')) {
    const comma = raw.indexOf(',');
    const header = comma >= 0 ? raw.slice(0, comma) : '';
    const b64 = comma >= 0 ? raw.slice(comma + 1) : '';
    const mimeMatch = /^data:([^;]+);base64$/i.exec(header);
    return { base64: b64, mimeType: mimeMatch?.[1], dataUrl: raw };
  }

  // Some APIs return "base64,<...>" or "...;base64,<...>"
  const idx = raw.indexOf('base64,');
  if (idx >= 0) {
    const prefix = raw.slice(0, idx + 'base64,'.length);
    const b64 = raw.slice(idx + 'base64,'.length);
    const mimeMatch = /^data:([^;]+);base64,$/i.exec(prefix);
    return {
      base64: b64,
      mimeType: mimeMatch?.[1],
      dataUrl: mimeMatch?.[1] ? `data:${mimeMatch[1]};base64,${b64}` : undefined,
    };
  }

  // Assume it's a plain base64 string.
  return { base64: raw };
};

const pickFirstString = (...candidates: any[]): string => {
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return '';
};

export const getBase64FromMediaMessage = async (
  params: EvolutionGetBase64Params
): Promise<EvolutionBase64Result> => {
  const base = ensureAbsoluteUrl(params.baseUrl);
  const instance = encodeURIComponent(params.instance);

  const url = `${base}/chat/getBase64FromMediaMessage/${instance}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: params.apiKey,
    },
    body: JSON.stringify({
      message: {
        key: {
          id: params.messageId,
        },
      },
      convertToMp4: Boolean(params.convertToMp4),
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

  // Try multiple shapes (Evolution versions vary)
  const base64Raw = pickFirstString(
    (data as any)?.base64,
    (data as any)?.data?.base64,
    (data as any)?.media?.base64,
    (data as any)?.result?.base64,
    typeof data === 'string' ? data : ''
  );

  const mimeTypeRaw = pickFirstString(
    (data as any)?.mimetype,
    (data as any)?.mimeType,
    (data as any)?.data?.mimetype,
    (data as any)?.data?.mimeType,
    (data as any)?.media?.mimetype,
    (data as any)?.media?.mimeType
  );

  const normalized = normalizeBase64(base64Raw);
  const base64 = normalized.base64;
  const mimeType = normalized.mimeType || mimeTypeRaw || undefined;

  const dataUrl =
    normalized.dataUrl ||
    (mimeType ? `data:${mimeType};base64,${base64}` : `data:application/octet-stream;base64,${base64}`);

  if (!base64) throw new Error('Evolution retornou base64 vazio.');

  return { base64, mimeType, dataUrl };
};
