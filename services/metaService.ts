import { MetaTemplate } from "../types";

// Mock data simulating Meta API response
const MOCK_TEMPLATES: MetaTemplate[] = [
  {
    id: '1',
    name: 'promocao_black_friday',
    language: 'pt_BR',
    status: 'APPROVED',
    category: 'MARKETING',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: '🔥 Oferta Imperdível!'
      },
      {
        type: 'BODY',
        text: 'Olá {{1}}, aproveite descontos de até 50% em toda a loja. A oferta é válida apenas até amanhã!'
      },
      {
        type: 'FOOTER',
        text: 'SendSales Store'
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'URL', text: 'Ver Ofertas', url: 'https://loja.com/ofertas' },
          { type: 'QUICK_REPLY', text: 'Não tenho interesse' }
        ]
      }
    ]
  },
  {
    id: '2',
    name: 'confirmacao_agendamento',
    language: 'pt_BR',
    status: 'APPROVED',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'Olá {{1}}, seu agendamento para {{2}} foi confirmado com sucesso. Caso precise reagendar, nos avise.'
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'PHONE_NUMBER', text: 'Ligar para Suporte', phone_number: '+551199999999' }
        ]
      }
    ]
  },
  {
    id: '3',
    name: 'codigo_verificacao',
    language: 'pt_BR',
    status: 'APPROVED',
    category: 'AUTHENTICATION',
    components: [
      {
        type: 'BODY',
        text: 'Seu código de verificação SendSales é {{1}}.'
      },
      {
        type: 'FOOTER',
        text: 'Não compartilhe este código.'
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'COPY_CODE', text: 'Copiar código' }
        ]
      }
    ]
  },
  {
    id: '4',
    name: 'recuperacao_carrinho',
    language: 'en_US',
    status: 'REJECTED',
    category: 'MARKETING',
    components: [
      {
        type: 'BODY',
        text: 'Hi {{1}}, you left something in your cart! Come back and finish your purchase.'
      }
    ]
  }
];

export const fetchMetaTemplates = async (): Promise<MetaTemplate[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 600));
  return MOCK_TEMPLATES;
};