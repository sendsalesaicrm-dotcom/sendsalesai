

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
  lead_limit?: number | null;
  // Evolution API optional configuration
  evolution_url?: string;
  evolution_api_key?: string;
  evolution_instance?: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'agent';
  created_at?: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Lead {
  id: string;
  organization_id: string;
  name: string;
  phone: string;
  status: 'new' | 'contacted' | 'qualified' | 'lost' | 'customer';
  tags: string[]; // Stored as JSONB in Supabase
  notes: string;
  avatar_url?: string;
  last_active?: string;
  created_at?: string;
  status_changed_at?: string;
  updated_at?: string;
}

export interface Template {
  id: string;
  name: string;
  body_text: string;
  variables: string[];
  created_at?: string;
}

export interface Campaign {
  id: string;
  organization_id: string;
  name: string;
  template_id: string;
  target_list: string[]; // Array of lead IDs
  status: 'draft' | 'scheduled' | 'sent';
  scheduled_at: string | null;
  ai_enabled: boolean;
  created_at?: string;
}

export interface Message {
  id: string;
  lead_id: string;
  sender_type: 'user' | 'contact'; // 'user' is agent/AI, 'contact' is the lead
  is_ai_generated: boolean;
  content: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  lead_id: string;
  agent_id?: string; // Assigned agent
  last_message: string;
  last_message_at: string;
  unread_count: number;
  status: 'open' | 'closed' | 'archived';
  // Joined fields for UI convenience
  lead?: Lead;
}

// Stats for dashboard (Aggregated data)
export interface DashboardMetrics {
  activeLeads: number;
  messagesSentToday: number;
  conversionRate: number;
}

// Chart data
export interface AttendanceData {
  name: string;
  human: number;
  ai: number;
}

// Campaign specific types
export interface ButtonConfig {
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE';
    text: string;
    value?: string; // URL or Phone number
}

export type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
export type TemplateType = 'STANDARD' | 'CATALOG' | 'FLOWS';

// Meta API Specific Types
export interface MetaComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE';
    text: string;
    url?: string;
    phone_number?: string;
  }>;
}

export interface MetaTemplate {
  name: string;
  language: string;
  status: 'APPROVED' | 'REJECTED' | 'PENDING' | 'PAUSED';
  category: TemplateCategory;
  components: MetaComponent[];
  id?: string;
}

export interface WhatsAppConfig {
  id?: string;
  organization_id: string; // Changed from user_id to organization_id
  waba_id: string;
  phone_number_id: string;
  verify_token: string;
  access_token: string;
  updated_at?: string;
}