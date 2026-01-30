import styled from 'styled-components'
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
import { Card, Heading, Text } from '../design-system/components'

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

// Styled Components
const ChartCard = styled(Card)`
  padding: ${({ theme }) => theme.v1.spacing.spacingXL};
`

const ChartHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const ChartContainer = styled.div`
  height: 256px;
`

const LoadingContainer = styled.div`
  height: 256px;
  display: flex;
  align-items: center;
  justify-content: center;
`

const LoadingPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.neutral.dark};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`

const EmptyContainer = styled.div`
  height: 256px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const EmptyContent = styled.div`
  text-align: center;
`

const ChartFooter = styled.div`
  margin-top: ${({ theme }) => theme.v1.spacing.spacingLG};
  padding-top: ${({ theme }) => theme.v1.spacing.spacingLG};
  border-top: 1px solid ${({ theme }) => theme.v1.semanticColors.border.divider.light};
`

const FooterNote = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  text-align: center;
  margin: 0;
`

// Use Fredly chart colors from the theme
const METRIC_COLORS = {
  flow: '#1C826A',      // Success green
  friction: '#C53312',  // Error red (higher is worse)
  safety: '#245FA8',    // Info blue
  portfolio: '#5B4599', // Help purple
}

export function MetricsTrendChart({ data, isLoading }: MetricsTrendChartProps) {
  if (isLoading) {
    return (
      <ChartCard>
        <ChartHeader>
          <Heading $level={4}>Metrics Trends</Heading>
        </ChartHeader>
        <LoadingContainer>
          <LoadingPlaceholder />
        </LoadingContainer>
      </ChartCard>
    )
  }

  if (!data || data.length === 0) {
    return (
      <ChartCard>
        <ChartHeader>
          <Heading $level={4}>Metrics Trends</Heading>
        </ChartHeader>
        <EmptyContainer>
          <EmptyContent>
            <Text>No historical data available yet.</Text>
            <Text $variant="bodySmall" $color="subtle" style={{ marginTop: '0.25rem' }}>
              Trends will appear after multiple survey cycles.
            </Text>
          </EmptyContent>
        </EmptyContainer>
      </ChartCard>
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
    <ChartCard>
      <ChartHeader>
        <Heading $level={4}>Metrics Trends</Heading>
      </ChartHeader>
      <ChartContainer>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E6E6E6" />
            <XAxis
              dataKey="displayDate"
              tick={{ fontSize: 12, fill: '#737373' }}
              tickLine={{ stroke: '#E6E6E6' }}
              axisLine={{ stroke: '#E6E6E6' }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: '#737373' }}
              tickLine={{ stroke: '#E6E6E6' }}
              axisLine={{ stroke: '#E6E6E6' }}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E6E6E6',
                borderRadius: '8px',
                boxShadow: '0px 6px 10px rgba(0, 0, 0, 0.11)',
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
      </ChartContainer>
      <ChartFooter>
        <FooterNote>
          Higher is better for Flow, Safety, and Portfolio Balance. Lower is better for Friction.
        </FooterNote>
      </ChartFooter>
    </ChartCard>
  )
}
