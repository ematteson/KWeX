import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { MetricResult } from '../api/types'

interface MetricsTrendChartProps {
  data: MetricResult[]
  isLoading?: boolean
}

interface ChartDataPoint {
  date: string
  displayDate: string
  flow: number | null
  friction: number | null
  safety: number | null
  portfolio: number | null
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const METRIC_COLORS = {
  flow: '#047857',      // Pearson green (emerald-700)
  friction: '#DC2626',  // Red for friction (higher is worse)
  safety: '#2563EB',    // Blue
  portfolio: '#7C3AED', // Purple
}

export function MetricsTrendChart({ data, isLoading }: MetricsTrendChartProps) {
  if (isLoading) {
    return (
      <div className="card">
        <h3 className="card-header">Metrics Trends</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse bg-pearson-gray-200 rounded w-full h-full"></div>
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="card">
        <h3 className="card-header">Metrics Trends</h3>
        <div className="h-64 flex items-center justify-center text-pearson-gray-500">
          <div className="text-center">
            <p>No historical data available yet.</p>
            <p className="text-sm mt-1">Trends will appear after multiple survey cycles.</p>
          </div>
        </div>
      </div>
    )
  }

  // Transform data for chart - sort by date ascending
  const chartData: ChartDataPoint[] = [...data]
    .sort((a, b) => new Date(a.calculation_date).getTime() - new Date(b.calculation_date).getTime())
    .map((result) => ({
      date: result.calculation_date,
      displayDate: formatDate(result.calculation_date),
      flow: result.meets_privacy_threshold ? result.flow_score : null,
      friction: result.meets_privacy_threshold ? result.friction_score : null,
      safety: result.meets_privacy_threshold ? result.safety_score : null,
      portfolio: result.meets_privacy_threshold ? result.portfolio_balance_score : null,
    }))

  return (
    <div className="card">
      <h3 className="card-header">Metrics Trends</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="displayDate"
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickLine={{ stroke: '#E5E7EB' }}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickLine={{ stroke: '#E5E7EB' }}
              axisLine={{ stroke: '#E5E7EB' }}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
              labelStyle={{ fontWeight: 600, marginBottom: 4 }}
            />
            <Legend
              iconType="line"
              wrapperStyle={{ paddingTop: 16 }}
            />
            <Line
              type="monotone"
              dataKey="flow"
              name="Flow"
              stroke={METRIC_COLORS.flow}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="friction"
              name="Friction"
              stroke={METRIC_COLORS.friction}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="safety"
              name="Safety"
              stroke={METRIC_COLORS.safety}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="portfolio"
              name="Portfolio Balance"
              stroke={METRIC_COLORS.portfolio}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 pt-4 border-t border-pearson-gray-100">
        <p className="text-xs text-pearson-gray-500 text-center">
          Higher is better for Flow, Safety, and Portfolio Balance. Lower is better for Friction.
        </p>
      </div>
    </div>
  )
}
