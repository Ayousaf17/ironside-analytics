# Ironside Support Command Center — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the Ironside Analytics dashboard into a tabbed Support Command Center that tracks pulse check insights from the n8n self-router workflow, persisted in Supabase.

**Architecture:** Fork the SW3 n8n workflow after "Calculate Analytics" to write structured metrics to a new `pulse_checks` Supabase table. Rebuild the Next.js dashboard with three tabs: Operations (daily pulse), AI Performance (existing), Deep Dive (workload/trends/history).

**Tech Stack:** Next.js 16, React 19, Recharts, Supabase, Tailwind CSS, shadcn/ui, n8n

---

## Phase 1: Data Layer

### Task 1: Create `pulse_checks` table in Supabase

**Action:** Run SQL in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

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

-- Enable Row Level Security but allow anon read
ALTER TABLE pulse_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read" ON pulse_checks FOR SELECT USING (true);
CREATE POLICY "Allow service insert" ON pulse_checks FOR INSERT WITH CHECK (true);

-- Index for date-based queries
CREATE INDEX idx_pulse_checks_created_at ON pulse_checks (created_at DESC);
```

**Verify:** Table appears in Supabase Table Editor with correct columns.

---

### Task 2: Update SW3 n8n workflow — add Supabase Insert node

**Workflow:** `SKoyXjxdD6JrpJDJ` (SW3 - Ticket Analytics & Insights)
**Action:** Add a new Code node ("Prepare Pulse Data") + Supabase Insert node ("Save to Supabase") forked from "Calculate Analytics" output, running in parallel with "Generate Insights".

**New node 1: "Prepare Pulse Data"** (Code node)
Extracts flat fields from the analytics JSON for the `pulse_checks` table columns.

```javascript
const analytics = $input.first().json;
const meta = analytics.meta || {};
const resolution = analytics.resolutionTime || {};
const spam = analytics.spamRatio || {};
const status = analytics.statusDistribution || {};
const channels = analytics.channelDistribution || {};
const workload = analytics.assigneeWorkload || [];

// Calculate unassigned percentage
const unassignedAgent = workload.find(a => a.email === 'unassigned');
const unassignedPct = unassignedAgent ? unassignedAgent.percentOfTotal : 0;

// Build workload map: {name: count}
const workloadMap = {};
workload.forEach(a => { workloadMap[a.name] = a.count; });

// Build tags map: {tag: count}
const tagsMap = {};
(analytics.topTags || []).forEach(t => { tagsMap[t.tag] = t.count; });

// Build top questions array
const topQuestions = (analytics.recurringQuestions || []).map(q => ({
  question: q.question,
  count: q.count,
  ticket_ids: q.ids
}));

return {
  json: {
    date_range_start: meta.actualStartDate ? meta.actualStartDate.split('T')[0] : null,
    date_range_end: meta.actualEndDate ? meta.actualEndDate.split('T')[0] : null,
    ticket_count: meta.ticketCount || 0,
    open_count: status.open || 0,
    closed_count: status.closed || 0,
    resolution_avg_min: resolution.avg || null,
    resolution_p50_min: resolution.p50 || null,
    resolution_p90_min: resolution.p90 || null,
    tickets_analyzed: resolution.count || 0,
    spam_pct: spam.percent || 0,
    unassigned_pct: unassignedPct,
    channel_email: channels.email || 0,
    channel_chat: channels.chat || 0,
    workload: JSON.stringify(workloadMap),
    top_questions: JSON.stringify(topQuestions),
    tags: JSON.stringify(tagsMap),
    ops_notes: JSON.stringify([])  // Ops notes come from LLM, not raw analytics
  }
};
```

**New node 2: "Save to Supabase"** (Supabase node)
- Table: `pulse_checks`
- Operation: Create (insert)
- Credential: Supabase account (xapu3wcO3s3Vehps)
- Map all fields from Prepare Pulse Data output

**Connection changes:**
- "Calculate Analytics" success output → connects to BOTH "Generate Insights" AND "Prepare Pulse Data"
- "Prepare Pulse Data" → "Save to Supabase"
- Existing flow to Generate Insights → Format Output stays unchanged

**Verify:** Trigger a pulse check in Slack. Check Supabase table for new row.

**Commit:** `feat: add pulse check persistence to Supabase in SW3 workflow`

---

## Phase 2: Dashboard Foundation

### Task 3: Set up environment

**Files:**
- Create: `ironside-analytics/.env.local`

**Step 1:** Create env file with Supabase credentials

```
NEXT_PUBLIC_SUPABASE_URL=https://jpfzafujsswrdwuenijt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<key from existing n8n credential or Supabase dashboard>
```

**Step 2:** Verify the app starts

Run: `cd /Users/ayu/ws/special-projects/ironside-analytics && npm install && npm run dev`
Expected: App starts on localhost:3000

---

### Task 4: Create tab layout component

**Files:**
- Create: `components/dashboard/Tabs.tsx`

```tsx
'use client';
import { useState } from 'react';

interface TabProps {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function DashboardTabs({ tabs, activeTab, onTabChange }: TabProps) {
  return (
    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

**Commit:** `feat: add tab navigation component`

---

## Phase 3: Operations Tab

### Task 5: Build hero alert cards with deltas

**Files:**
- Create: `components/dashboard/PulseHeroCards.tsx`

4 cards showing: Unassigned %, Spam Rate, Avg Resolution, Open Tickets
Each with current value, delta from previous pulse, color-coded arrow.
Cards turn red/amber based on thresholds (unassigned > 40%, spam > 25%).

**Commit:** `feat: add pulse check hero alert cards`

---

### Task 6: Build resolution time trend chart

**Files:**
- Create: `components/dashboard/ResolutionChart.tsx`

Line chart with 3 lines: Avg, P50, P90 resolution times over pulse check history.
X-axis: pulse check dates. Y-axis: minutes.

**Commit:** `feat: add resolution time trend chart`

---

### Task 7: Build spam & unassigned rate chart

**Files:**
- Create: `components/dashboard/RatesTrendChart.tsx`

Area chart with 2 areas: spam_pct and unassigned_pct over time.
Color-coded (red for danger zones).

**Commit:** `feat: add spam and unassigned rate trend chart`

---

### Task 8: Build top categories + ops notes panels

**Files:**
- Create: `components/dashboard/TopCategories.tsx`
- Create: `components/dashboard/OpsNotes.tsx`

Left panel: horizontal bar chart of top ticket categories from latest pulse.
Right panel: ops notes list with severity color coding.

**Commit:** `feat: add top categories chart and ops notes panel`

---

## Phase 4: Integrate All Tabs

### Task 9: Rewrite main page with tabbed layout

**Files:**
- Modify: `app/page.tsx` — full rewrite with tab structure

The main page becomes the tab controller:
- Fetches pulse_checks data from Supabase
- Fetches existing AI performance data (kept from current code)
- Renders active tab content

Tab 1 (Operations): Tasks 5-8 components
Tab 2 (AI Performance): Existing dashboard code moved here
Tab 3 (Deep Dive): Tasks 10-12 components

**Commit:** `feat: rewrite main page with tabbed command center layout`

---

## Phase 5: Deep Dive Tab

### Task 10: Agent workload stacked bar chart

**Files:**
- Create: `components/dashboard/WorkloadChart.tsx`

Stacked bar chart: X = pulse check dates, Y = ticket count, segments = agents.
Shows who carries the load and how unassigned grows/shrinks.

**Commit:** `feat: add agent workload stacked bar chart`

---

### Task 11: Tag trends + P90 resolution trend

**Files:**
- Create: `components/dashboard/TagTrendsChart.tsx`
- Create: `components/dashboard/P90TrendChart.tsx`

Tag trends: multi-line chart showing tag counts over time.
P90 trend: single line with horizontal dotted threshold at 1440 min (24hr SLA).

**Commit:** `feat: add tag trends and P90 resolution charts`

---

### Task 12: Ops notes history table

**Files:**
- Create: `components/dashboard/OpsNotesHistory.tsx`

Scrollable table: Date | Severity | Note
Pulls from all pulse checks, color-coded by severity (CRITICAL = red, WARNING = amber).

**Commit:** `feat: add ops notes history table`

---

## Phase 6: Polish

### Task 13: Update layout metadata + final styling

**Files:**
- Modify: `app/layout.tsx` — update title/description to "Ironside Support Command Center"
- Modify: `app/globals.css` — any final theme adjustments

**Commit:** `feat: update metadata and polish styling`

---

### Task 14: Seed data + verify end-to-end

**Action:** Trigger a pulse check via Slack to generate the first real data row, then verify the dashboard renders correctly with live data.

**Commit:** `docs: finalize implementation`
