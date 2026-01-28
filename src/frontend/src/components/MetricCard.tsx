import clsx from 'clsx'
import type { TrendDirection } from '../api/types'

interface MetricCardProps {
  title: string
  value: number | null
  description: string
  trend?: TrendDirection | null
  isLoading?: boolean
  invertColors?: boolean // For metrics where lower is better (like Friction)
}

function getScoreStatus(score: number, invert = false): 'excellent' | 'good' | 'warning' | 'poor' {
  const adjustedScore = invert ? 100 - score : score
  if (adjustedScore >= 75) return 'excellent'
  if (adjustedScore >= 50) return 'good'
  if (adjustedScore >= 25) return 'warning'
  return 'poor'
}

function TrendIndicator({ direction }: { direction: TrendDirection }) {
  if (direction === 'up') {
    return (
      <span className="flex items-center text-metric-excellent text-sm">
        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
        Improving
      </span>
    )
  }
  if (direction === 'down') {
    return (
      <span className="flex items-center text-metric-poor text-sm">
        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
        Declining
      </span>
    )
  }
  return (
    <span className="flex items-center text-pearson-gray-500 text-sm">
      <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
      Stable
    </span>
  )
}

export function MetricCard({ title, value, description, trend, isLoading, invertColors = false }: MetricCardProps) {
  const status = value !== null ? getScoreStatus(value, invertColors) : null

  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-4 bg-pearson-gray-200 rounded w-24 mb-3"></div>
        <div className="h-10 bg-pearson-gray-200 rounded w-20 mb-2"></div>
        <div className="h-3 bg-pearson-gray-200 rounded w-32"></div>
      </div>
    )
  }

  return (
    <div
      className={clsx(
        'card',
        status === 'excellent' && 'metric-excellent',
        status === 'good' && 'metric-good',
        status === 'warning' && 'metric-warning',
        status === 'poor' && 'metric-poor'
      )}
    >
      <h3 className="text-sm font-medium text-pearson-gray-600 mb-1">{title}</h3>

      <div className="flex items-baseline gap-2 mb-2">
        {value !== null ? (
          <>
            <span className="text-3xl font-bold text-pearson-gray-900">{Math.round(value)}</span>
            <span className="text-sm text-pearson-gray-500">/100</span>
          </>
        ) : (
          <span className="text-lg text-pearson-gray-400">Insufficient data</span>
        )}
      </div>

      <p className="text-xs text-pearson-gray-500 mb-3">{description}</p>

      {trend && <TrendIndicator direction={trend} />}
    </div>
  )
}
