import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import type { GorgiasWebhookPayload } from '@/types/gorgias';

// Use service role key for webhook writes — bypasses RLS, appropriate for server-side inserts
function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL! || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// System/noise tags we skip when extracting ticket category
const SYSTEM_TAGS = new Set(['auto-close', 'spam', 'ai-draft', 'ai-reviewed']);

function extractCategory(tags?: Array<{ name: string }>): string | null {
  if (!tags || tags.length === 0) return null;
  const meaningful = tags.find((t) => !SYSTEM_TAGS.has(t.name));
  return meaningful?.name ?? null;
}

function isAgentMessage(message: GorgiasWebhookPayload['message']): boolean {
  if (!message) return false;
  const sourceType = message.source?.type?.toLowerCase() ?? '';
  // Only log actual agent replies — not customer messages, not automation
  return sourceType === 'agent' || sourceType === 'email';
}

function diffMinutes(start: string, end: string): number {
  return (new Date(end).getTime() - new Date(start).getTime()) / 60000;
}

// Gorgias templates send all values as strings — coerce IDs to numbers for Supabase bigint columns
function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

export async function POST(req: NextRequest) {
  // --- Security: verify shared secret ---
  const secret = req.nextUrl.searchParams.get('secret');
  if (!secret || secret !== process.env.GORGIAS_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: GorgiasWebhookPayload;
  try {
    payload = await req.json();
  } catch {
    console.error('[gorgias-webhook] Failed to parse JSON body');
    return NextResponse.json({ success: true }); // don't trigger Gorgias retries
  }

  const { event_type, ticket, message, satisfaction, assignee_user } = payload;

  // Always return 200 after this point — parse/DB errors are logged but not surfaced
  // to prevent Gorgias from hammering us with retries
  try {
    const supabase = getSupabase();

    switch (event_type) {
      case 'ticket-message-created': {
        if (!ticket || !message) break;
        // isAgentMessage filter temporarily disabled — logging all messages to
        // inspect raw_payload and confirm what source.type Gorgias sends
        // TODO: re-enable once source type values are confirmed
        // if (!isAgentMessage(message)) break;

        // Count prior agent replies for position tracking and first-reply detection
        const { data: existing } = await supabase
          .from('agent_behavior_log')
          .select('id')
          .eq('ticket_id', toNum(ticket.id))
          .eq('event_type', 'ticket-message-created');

        const isFirstReply = !existing || existing.length === 0;
        const firstResponseMin =
          isFirstReply && ticket.created_datetime && message.created_datetime
            ? parseFloat(diffMinutes(ticket.created_datetime, message.created_datetime).toFixed(1))
            : null;

        const macro = message.macros?.[0] ?? null;
        const messagePosition = (existing?.length ?? 0) + 1;
        const allTags = ticket.tags?.map((t) => t.name) ?? [];

        await supabase.from('agent_behavior_log').insert({
          event_id: `msg-${message.id}`,
          event_type: 'ticket-message-created',
          ticket_id: toNum(ticket.id),
          ticket_subject: ticket.subject ?? null,
          ticket_channel: ticket.channel ?? null,
          ticket_category: extractCategory(ticket.tags),
          ticket_tags: allTags.length > 0 ? allTags : null,
          ticket_created_at: ticket.created_datetime ?? null,
          agent_id: toNum(message.sender?.id),
          agent_name: message.sender?.name ?? null,
          agent_email: message.sender?.email ?? null,
          response_text: message.body_text ?? null,
          response_char_count: message.body_text?.length ?? null,
          is_macro: macro !== null,
          macro_id: toNum(macro?.id),
          macro_name: macro?.name ?? null,
          message_position: messagePosition,
          time_to_first_response_min: firstResponseMin,
          raw_payload: payload,
        });
        break;
      }

      // Gorgias sends ticket-updated for both status changes and assignment changes
      case 'ticket-updated': {
        if (!ticket) break;

        const ticketStatus = (ticket as unknown as Record<string, unknown>).status as string | undefined;
        const isClosed = ticketStatus === 'closed';

        if (isClosed) {
          // Ticket closed — enrich existing rows with touches_to_resolution
          const ticketId = toNum(ticket.id);
          const { count } = await supabase
            .from('agent_behavior_log')
            .select('*', { count: 'exact', head: true })
            .eq('ticket_id', ticketId)
            .eq('event_type', 'ticket-message-created');

          const touches = count ?? 0;
          const resolvedAt = new Date().toISOString();

          if (touches > 0) {
            await supabase
              .from('agent_behavior_log')
              .update({ touches_to_resolution: touches, resolved_at: resolvedAt })
              .eq('ticket_id', ticketId);
          } else {
            // Closed with no logged messages (spam auto-close etc.)
            await supabase.from('agent_behavior_log').insert({
              event_id: `close-${ticket.id}-${Date.now()}`,
              event_type: 'ticket-closed',
              ticket_id: ticketId,
              ticket_subject: ticket.subject ?? null,
              ticket_channel: ticket.channel ?? null,
              ticket_category: extractCategory(ticket.tags),
              ticket_tags: ticket.tags?.map((t) => t.name) ?? null,
              ticket_created_at: ticket.created_datetime ?? null,
              touches_to_resolution: 0,
              resolved_at: resolvedAt,
              raw_payload: payload,
            });
          }
        } else if (assignee_user) {
          // Assignment change — log routing decision
          await supabase.from('agent_behavior_log').insert({
            event_id: `assign-${ticket.id}-${Date.now()}`,
            event_type: 'ticket-assigned',
            ticket_id: toNum(ticket.id),
            ticket_subject: ticket.subject ?? null,
            ticket_channel: ticket.channel ?? null,
            ticket_category: extractCategory(ticket.tags),
            ticket_tags: ticket.tags?.map((t) => t.name) ?? null,
            ticket_created_at: ticket.created_datetime ?? null,
            agent_id: toNum(assignee_user.id),
            agent_name: assignee_user.name ?? null,
            agent_email: assignee_user.email ?? null,
            raw_payload: payload,
          });
        }
        break;
      }

      case 'satisfaction-created': {
        if (!ticket || !satisfaction) break;

        await supabase
          .from('agent_behavior_log')
          .update({ csat_score: satisfaction.score })
          .eq('ticket_id', toNum(ticket.id));
        break;
      }

      default:
        // Unknown event type — ignore silently
        break;
    }
  } catch (err) {
    console.error(`[gorgias-webhook] Error processing ${event_type}:`, err);
  }

  return NextResponse.json({ success: true });
}
