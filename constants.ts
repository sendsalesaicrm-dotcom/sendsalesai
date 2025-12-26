// This file now only contains configuration constants, not data.

export const STATUS_MAP: Record<string, string> = {
  new: 'Novo',
  contacted: 'Contatado',
  qualified: 'Qualificado',
  customer: 'Cliente',
  lost: 'Perdido'
};

export const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  qualified: 'bg-purple-100 text-purple-800',
  customer: 'bg-green-100 text-green-800',
  lost: 'bg-gray-100 text-gray-800'
};