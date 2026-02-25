# Ironside Support Command Center — Dashboard Upgrade Design

**Date:** 2026-02-24
**Status:** Approved
**Client:** Bobby @ Ironside Computers

## Problem

The current dashboard tracks AI agent performance (cost, latency, uptime) but not the support operations insights Bobby needs. The n8n pulse check workflow (SW3) calculates rich analytics from Gorgias but only posts to Slack — nothing is persisted for trending or dashboarding.

## Solution

Transform the dashboard from "AI Agent Performance" into a **tabbed Support Command Center** with three views, powered by a new `pulse_checks` Supabase table.

## Architecture

### Data Pipeline

```
SW3 Calculate Analytics node (existing)
  ├── Generate Insights → Slack (existing, unchanged)
  └── NEW: Supabase Insert → pulse_checks table
```

- Fork after "Calculate Analytics" node in SW3 workflow (SKoyXjxdD6JrpJDJ)
- New Supabase node writes structured analytics to `pulse_checks` table
- Uses existing Supabase credential (xapu3wcO3s3Vehps)
- Zero impact on existing Slack flow

### Supabase Table: `pulse_checks`

```sql
CREATE TABLE pulse_checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  date_range_start DATE,
  date_range_end DATE,
  ticket_count INT,
  open_count INT,
  closed_count INT,
  resolution_avg_min NUMERIC,
  resolution_p50_min NUMERIC,
  resolution_p90_min NUMERIC,
  tickets_analyzed INT,
  spam_pct NUMERIC,
  unassigned_pct NUMERIC,
  channel_email INT,
  channel_chat INT,
  workload JSONB,
  top_questions JSONB,
  tags JSONB,
  ops_notes JSONB
);
```

Storage: ~5KB per pulse check. Free tier (500MB) = 275+ years at 1x/day.

### Dashboard UI: Three Tabs

**Tab 1: Operations (Bobby's daily view)**
- Row 1: 4 hero alert cards (Unassigned %, Spam Rate, Avg Resolution, Open Tickets) with delta arrows from previous pulse
- Row 2: Resolution Times line chart (Avg/P50/P90) + Spam & Unassigned Rate area chart
- Row 3: Top Ticket Categories bar chart + Latest Ops Notes alert list

**Tab 2: AI Performance (existing, unchanged)**
- All current metrics moved under this tab
- Cost per action, total actions, savings, daily sessions/cost, intent distribution, operational health, top intents

**Tab 3: Deep Dive**
- Row 1: Agent Workload stacked bar chart (per agent over time)
- Row 2: Tag Trends line chart + P90 Resolution Trend with SLA threshold
- Row 3: Ops Notes History table (date, severity, note) — scrollable, filterable

### Tech Stack (no changes)
- Next.js 16 + React 19
- Recharts for charts
- Supabase client (existing)
- Tailwind CSS + shadcn/ui

## Implementation Scope

1. **n8n:** Update SW3 workflow — add Supabase Insert node after Calculate Analytics
2. **Supabase:** Create `pulse_checks` table via SQL
3. **Dashboard:** Rewrite `app/page.tsx` with tab structure and three tab views
4. **Components:** New chart components for pulse check visualizations

## Key Decisions
- Flat columns for trendable metrics, JSONB for complex nested data
- n8n writes to Supabase (Option A) — cheapest, cleanest, single source of truth
- Tabbed UI (Approach C) — scalable, organized, one URL for everything
