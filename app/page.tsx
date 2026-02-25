'use client';

import { createClient } from '../utils/supabase/client';
import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { PulseCheck } from '@/types/pulse';

import Tabs from '@/components/dashboard/Tabs';
import PulseHeroCards from '@/components/dashboard/PulseHeroCards';
import ResolutionChart from '@/components/dashboard/ResolutionChart';
import RatesTrendChart from '@/components/dashboard/RatesTrendChart';
import TopCategories from '@/components/dashboard/TopCategories';
import OpsNotes from '@/components/dashboard/OpsNotes';
import WorkloadChart from '@/components/dashboard/WorkloadChart';
import TagTrendsChart from '@/components/dashboard/TagTrendsChart';
import P90TrendChart from '@/components/dashboard/P90TrendChart';
import OpsNotesHistory from '@/components/dashboard/OpsNotesHistory';

// --- AI PERFORMANCE TYPES ---
interface ROIMetrics {
  cost_per_action: number;
  total_successful_actions: number;
  total_spend: number;
}

interface HealthMetrics {
  workflow_id: string;
  success_rate_pct: number;
  avg_execution_ms: number;
}

interface TopIssue {
  user_query: string;
  frequency: number;
  last_asked: string;
}

interface DailyTrend {
  date: string;
  daily_cost: number;
  daily_tokens: number;
  interactions_count: number;
  cost_display?: number;
}

interface IntentDist {
  workflow_name: string;
  usage_count: number;
}

export default function SupportCommandCenter() {
  const [activeTab, setActiveTab] = useState('operations');

  // --- Pulse Check State ---
  const [pulseData, setPulseData] = useState<PulseCheck[]>([]);

  // --- AI Performance State ---
  const [roiData, setRoiData] = useState<ROIMetrics | null>(null);
  const [healthData, setHealthData] = useState<HealthMetrics[]>([]);
  const [topIssues, setTopIssues] = useState<TopIssue[]>([]);
  const [dailyTrends, setDailyTrends] = useState<DailyTrend[]>([]);
  const [intentDist, setIntentDist] = useState<IntentDist[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      // --- Fetch Pulse Checks ---
      const { data: pulses } = await supabase
        .from('pulse_checks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (pulses) setPulseData(pulses);

      // --- Fetch AI Performance Data ---
      const { data: roi } = await supabase.from('view_ai_roi_metrics').select('*').single();
      if (roi) setRoiData(roi);

      const { data: health } = await supabase.from('view_ai_health_metrics').select('*');
      if (health) setHealthData(health);

      const { data: issues } = await supabase.from('view_ai_top_issues').select('*');
      if (issues) setTopIssues(issues);

      const { data: trends } = await supabase
        .from('view_ai_daily_trends')
        .select('*')
        .limit(30);
      if (trends) {
        const formattedTrends = trends
          .map((t) => ({
            ...t,
            date: new Date(t.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            }),
            cost_display: parseFloat(t.daily_cost.toFixed(4)),
          }))
          .reverse();
        setDailyTrends(formattedTrends);
      }

      const { data: intents } = await supabase.from('view_ai_intent_distribution').select('*');
      if (intents) setIntentDist(intents);

      setLoading(false);
    };

    fetchData();
  }, []);

  // --- Derived data for Operations tab ---
  const latestPulse = pulseData.length > 0 ? pulseData[0] : null;
  const previousPulse = pulseData.length > 1 ? pulseData[1] : null;

  // --- AI Performance calculations ---
  const routerStats = healthData.find((w) => w.workflow_id === 'NGGnOS5zS3pzBSx7') || {
    success_rate_pct: 0,
    avg_execution_ms: 0,
  };
  const writeOpsStats = healthData.find((w) => w.workflow_id === 'SW2') || {
    success_rate_pct: 0,
  };
  const humanCostPerAction = 5.0;
  const aiCost = roiData?.cost_per_action || 0;
  const totalActions = roiData?.total_successful_actions || 0;
  const totalSavings = (humanCostPerAction - aiCost) * totalActions;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
          <p className="mt-4 text-gray-500 text-sm">Loading Command Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Ironside Support Command Center
            </h1>
            <p className="text-gray-500 mt-1">
              Live support operations insights for Ironside Computers
            </p>
          </div>
          <Tabs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* TAB CONTENT */}
        {activeTab === 'operations' && (
          <div className="space-y-8">
            {/* Row 1: Hero Cards */}
            <PulseHeroCards latest={latestPulse} previous={previousPulse} />

            {/* Row 2: Resolution + Rates Charts */}
            <div className="grid gap-8 md:grid-cols-2">
              <ResolutionChart data={pulseData} />
              <RatesTrendChart data={pulseData} />
            </div>

            {/* Row 3: Top Categories + Ops Notes */}
            <div className="grid gap-8 md:grid-cols-2">
              <TopCategories data={latestPulse?.top_questions || []} />
              <OpsNotes
                notes={latestPulse?.ops_notes || []}
                timestamp={latestPulse?.created_at || ''}
              />
            </div>
          </div>
        )}

        {activeTab === 'ai-performance' && (
          <div className="space-y-8">
            {/* SECTION 1: VALUE & ROI */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
                Value & Financial Performance
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-500">Cost Per Action</h3>
                  <div className="text-2xl font-bold text-gray-900">
                    ${roiData?.cost_per_action?.toFixed(4) || '0.0000'}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">vs ~$5.00 Human Cost</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-500">Total Actions</h3>
                  <div className="text-2xl font-bold text-gray-900">{totalActions}</div>
                  <p className="text-xs text-gray-500 mt-1">Write Operations (SW2)</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-500">Est. Value Created</h3>
                  <div className="text-2xl font-bold text-green-600">
                    ${totalSavings.toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Net Savings</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-500">Total AI Spend</h3>
                  <div className="text-2xl font-bold text-gray-900">
                    ${roiData?.total_spend?.toFixed(2) || '0.00'}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">LLM Token Usage</p>
                </div>
              </div>
            </section>

            {/* SECTION 2: CHARTS & TRENDS */}
            <div className="grid gap-8 md:grid-cols-2">
              {/* CHART 1: Daily Sessions & Cost */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Daily Sessions & Cost
                  </h3>
                  <p className="text-xs text-gray-500">
                    Volume vs. Spend over last 30 days
                  </p>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyTrends}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        yAxisId="left"
                        orientation="left"
                        stroke="#8884d8"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#82ca9d"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        unit="$"
                      />
                      <Tooltip />
                      <Legend />
                      <Bar
                        yAxisId="left"
                        dataKey="interactions_count"
                        name="Sessions"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="cost_display"
                        name="Cost ($)"
                        fill="#22c55e"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CHART 2: Intent Distribution */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Intent Distribution
                  </h3>
                  <p className="text-xs text-gray-500">
                    Which workflows are being used most?
                  </p>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={intentDist}
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={true}
                        vertical={false}
                      />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis
                        dataKey="workflow_name"
                        type="category"
                        width={150}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip />
                      <Bar
                        dataKey="usage_count"
                        name="Usage Count"
                        fill="#8884d8"
                        radius={[0, 4, 4, 0]}
                        barSize={30}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* SECTION 3: RELIABILITY & STRATEGY */}
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
              {/* Operational Health List */}
              <div className="col-span-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Operational Health
                  </h3>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Router Uptime</p>
                      <p className="text-xs text-gray-500">Main entry point success rate</p>
                    </div>
                    <div className="font-bold text-green-600 text-xl">
                      {Math.round(routerStats.success_rate_pct)}%
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Write Ops Success
                      </p>
                      <p className="text-xs text-gray-500">Modifications (SW2)</p>
                    </div>
                    <div className="font-bold text-green-600 text-xl">
                      {Math.round(writeOpsStats.success_rate_pct)}%
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Avg Latency</p>
                      <p className="text-xs text-gray-500">Processing speed</p>
                    </div>
                    <div className="font-bold text-gray-900 text-xl">
                      {Math.round(routerStats.avg_execution_ms)} ms
                    </div>
                  </div>
                </div>
              </div>

              {/* Top User Intents List */}
              <div className="col-span-3 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Top User Intents
                  </h3>
                  <p className="text-xs text-gray-500">
                    What your team is asking for
                  </p>
                </div>
                <div className="space-y-4 max-h-[300px] overflow-y-auto">
                  {topIssues?.map((issue: TopIssue, i: number) => (
                    <div
                      key={i}
                      className="flex items-center p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-bold text-xs mr-3">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium text-gray-900 truncate"
                          title={issue.user_query}
                        >
                          {issue.user_query}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(issue.last_asked).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-sm font-medium text-gray-600 ml-2">
                        {issue.frequency}x
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'deep-dive' && (
          <div className="space-y-8">
            {/* Row 1: Workload Chart (full width) */}
            <WorkloadChart data={pulseData} />

            {/* Row 2: Tag Trends + P90 Trend */}
            <div className="grid gap-8 md:grid-cols-2">
              <TagTrendsChart data={pulseData} />
              <P90TrendChart data={pulseData} />
            </div>

            {/* Row 3: Ops Notes History (full width) */}
            <OpsNotesHistory data={pulseData} />
          </div>
        )}
      </div>
    </div>
  );
}
