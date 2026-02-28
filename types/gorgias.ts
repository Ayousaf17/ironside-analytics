// Gorgias webhook payload types
// Docs: https://developers.gorgias.com/reference/the-ticket-object

export interface GorgiasWebhookPayload {
  event_type: string;
  ticket?: GorgiasTicket;
  message?: GorgiasMessage;
  satisfaction?: GorgiasSatisfaction;
  assignee_user?: GorgiasUser;
}

export interface GorgiasTicket {
  id: number;
  subject: string;
  status: string;
  channel: string;
  created_datetime: string;
  tags?: Array<{ name: string }>;
  customer?: { email: string; name?: string };
  assignee_user?: GorgiasUser;
}

export interface GorgiasMessage {
  id: number;
  body_text?: string;
  created_datetime: string;
  sender?: GorgiasUser;
  source?: {
    type: string; // "agent" | "customer" | "rule" | "workflow"
  };
  macros?: Array<{ id: number; name: string }>;
}

export interface GorgiasSatisfaction {
  score: number; // 1–5
  created_datetime?: string;
}

export interface GorgiasUser {
  id: number;
  name: string;
  email?: string;
}
