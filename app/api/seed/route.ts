import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Check if data already exists
  const { data: existing } = await supabase
    .from('pulse_checks')
    .select('id')
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ message: 'Data already exists', count: existing.length });
  }

  const records = [
    {
      created_at: '2026-02-10T10:00:00Z',
      date_range_start: '2026-02-03',
      date_range_end: '2026-02-09',
      ticket_count: 142,
      open_count: 38,
      closed_count: 104,
      resolution_avg_min: 287,
      resolution_p50_min: 145,
      resolution_p90_min: 890,
      tickets_analyzed: 104,
      spam_pct: 18.3,
      unassigned_pct: 35.2,
      channel_email: 89,
      channel_chat: 53,
      workload: { 'Danni-Jean': 42, Spencer: 28, Gabe: 15, Tyler: 7, Unassigned: 50 },
      top_questions: [
        { question: 'Order status inquiry', count: 23, ticket_ids: [1001, 1002, 1003] },
        { question: 'Shipping delay', count: 18, ticket_ids: [1004, 1005] },
        { question: 'Return/refund request', count: 15, ticket_ids: [1006, 1007] },
        { question: 'PC build configuration', count: 12, ticket_ids: [1008, 1009] },
        { question: 'Warranty claim', count: 9, ticket_ids: [1010] },
        { question: 'Payment issue', count: 7, ticket_ids: [1011] },
      ],
      tags: {
        'order-status': 23,
        shipping: 18,
        returns: 15,
        'custom-build': 12,
        warranty: 9,
        billing: 7,
      },
      ops_notes: [
        'WARNING: Unassigned ticket rate at 35.2% - approaching danger zone of 40%',
        'Shipping delay tickets spiked due to carrier issues in Northeast region',
        'Danni-Jean handling 40% of all assigned tickets - potential burnout risk',
      ],
    },
    {
      created_at: '2026-02-17T10:00:00Z',
      date_range_start: '2026-02-10',
      date_range_end: '2026-02-16',
      ticket_count: 156,
      open_count: 42,
      closed_count: 114,
      resolution_avg_min: 312,
      resolution_p50_min: 168,
      resolution_p90_min: 945,
      tickets_analyzed: 114,
      spam_pct: 22.4,
      unassigned_pct: 41.8,
      channel_email: 95,
      channel_chat: 61,
      workload: {
        'Danni-Jean': 38,
        Spencer: 31,
        Gabe: 18,
        Tyler: 4,
        Alex: 3,
        Unassigned: 62,
      },
      top_questions: [
        {
          question: 'Order status inquiry',
          count: 28,
          ticket_ids: [2001, 2002, 2003, 2004],
        },
        { question: 'Shipping delay', count: 22, ticket_ids: [2005, 2006] },
        { question: 'Return/refund request', count: 17, ticket_ids: [2007, 2008] },
        { question: 'PC build configuration', count: 14, ticket_ids: [2009] },
        { question: 'Warranty claim', count: 11, ticket_ids: [2010] },
        { question: 'Component compatibility', count: 8, ticket_ids: [2011] },
      ],
      tags: {
        'order-status': 28,
        shipping: 22,
        returns: 17,
        'custom-build': 14,
        warranty: 11,
        compatibility: 8,
      },
      ops_notes: [
        'CRITICAL: Unassigned rate crossed 40% threshold at 41.8% - immediate action needed',
        'WARNING: Spam rate increased to 22.4% - review auto-filter rules',
        'Spencer picked up extra load this week (+3 tickets) but Tyler dropped to 4',
        'New agent Alex onboarding - assigned 3 tickets as ramp-up',
      ],
    },
    {
      created_at: '2026-02-24T10:00:00Z',
      date_range_start: '2026-02-17',
      date_range_end: '2026-02-23',
      ticket_count: 138,
      open_count: 31,
      closed_count: 107,
      resolution_avg_min: 245,
      resolution_p50_min: 122,
      resolution_p90_min: 780,
      tickets_analyzed: 107,
      spam_pct: 19.6,
      unassigned_pct: 28.4,
      channel_email: 82,
      channel_chat: 56,
      workload: {
        'Danni-Jean': 35,
        Spencer: 30,
        Gabe: 20,
        Tyler: 10,
        Alex: 8,
        Unassigned: 35,
      },
      top_questions: [
        { question: 'Order status inquiry', count: 21, ticket_ids: [3001, 3002] },
        { question: 'Return/refund request', count: 19, ticket_ids: [3003, 3004] },
        { question: 'Shipping delay', count: 14, ticket_ids: [3005] },
        { question: 'PC build configuration', count: 16, ticket_ids: [3006, 3007] },
        { question: 'Warranty claim', count: 8, ticket_ids: [3008] },
        { question: 'Component compatibility', count: 10, ticket_ids: [3009] },
      ],
      tags: {
        'order-status': 21,
        returns: 19,
        'custom-build': 16,
        shipping: 14,
        compatibility: 10,
        warranty: 8,
      },
      ops_notes: [
        'Unassigned rate improved from 41.8% to 28.4% after redistributing workload',
        'Spam rate decreased to 19.6% - new filter rules working',
        'Alex ramping up well - doubled ticket count from last week',
        'Tyler back to normal capacity with 10 tickets handled',
      ],
    },
  ];

  const { data, error } = await supabase.from('pulse_checks').insert(records).select('id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Seeded successfully', count: data.length });
}
