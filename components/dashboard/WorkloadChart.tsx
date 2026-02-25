'use client';

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

interface WorkloadChartProps {
  data: PulseCheck[];
}

// Consistent color palette for agents
const AGENT_COLORS: Record<string, string> = {
  Unassigned: '#9ca3af',
  'Danni-Jean': '#3b82f6',
  Spencer: '#22c55e',
  Gabe: '#f97316',
  Tyler: '#8b5cf6',
  Alex: '#ec4899',
  Jordan: '#14b8a6',
  Morgan: '#eab308',
  Casey: '#6366f1',
  Riley: '#ef4444',
};

const FALLBACK_COLORS = [
  '#06b6d4',
  '#84cc16',
  '#f43f5e',
  '#a855f7',
  '#0ea5e9',
  '#d946ef',
  '#10b981',
  '#f59e0b',
];

export default function WorkloadChart({ data }: WorkloadChartProps) {
  // Sort data chronologically
  const sorted = data
    .slice()
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  // Collect all unique agent names across all pulse checks
  const allAgents = new Set<string>();
  sorted.forEach((p) => {
    if (p.workload) {
      Object.keys(p.workload).forEach((agent) => allAgents.add(agent));
    }
  });

  // Put "Unassigned" last
  const agentList = Array.from(allAgents)
    .filter((a) => a !== 'Unassigned')
    .sort();
  if (allAgents.has('Unassigned')) {
    agentList.push('Unassigned');
  }

  // Build chart data
  const chartData = sorted.map((p) => {
    const entry: Record<string, string | number> = {
      date: new Date(p.date_range_end).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    };
    agentList.forEach((agent) => {
      entry[agent] = p.workload?.[agent] || 0;
    });
    return entry;
  });

  // Assign colors
  let fallbackIndex = 0;
  const getColor = (agent: string): string => {
    if (AGENT_COLORS[agent]) return AGENT_COLORS[agent];
    const color = FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length];
    fallbackIndex++;
    return color;
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Agent Workload Distribution</h3>
        <p className="text-xs text-gray-500">Ticket assignments per agent over time</p>
      </div>
      {chartData.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
          No workload data available
        </div>
      ) : (
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                label={{
                  value: 'Tickets',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 12, fill: '#6b7280' },
                }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              />
              <Legend />
              {agentList.map((agent) => (
                <Bar
                  key={agent}
                  dataKey={agent}
                  stackId="workload"
                  fill={getColor(agent)}
                  radius={agentList.indexOf(agent) === 0 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
