import clsx from 'clsx'
import type { FrictionDimension } from '../api/hooks'

interface FrictionHeatmapProps {
  dimensions: FrictionDimension[]
  overallScore?: number
  isLoading?: boolean
}

function getScoreColor(score: number): string {
  // For friction, lower is BETTER (less friction)
  // So we invert: high score = red (bad), low score = green (good)
  if (score >= 75) return 'bg-red-500'      // High friction - bad
  if (score >= 60) return 'bg-orange-400'   // Medium-high friction
  if (score >= 40) return 'bg-yellow-400'   // Medium friction
  if (score >= 25) return 'bg-lime-400'     // Low-medium friction
  return 'bg-green-500'                      // Low friction - good
}

function getScoreLabel(score: number): string {
  if (score >= 75) return 'High Friction'
  if (score >= 60) return 'Elevated'
  if (score >= 40) return 'Moderate'
  if (score >= 25) return 'Low'
  return 'Minimal'
}

export function FrictionHeatmap({ dimensions, overallScore, isLoading }: FrictionHeatmapProps) {
  if (isLoading) {
    return (
      <div className="card">
        <h3 className="card-header">Friction Heatmap</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse bg-pearson-gray-200 rounded-lg h-24"></div>
          ))}
        </div>
      </div>
    )
  }

  if (!dimensions || dimensions.length === 0) {
    return (
      <div className="card">
        <h3 className="card-header">Friction Heatmap</h3>
        <div className="text-center py-8 text-pearson-gray-500">
          <p>No friction data available yet.</p>
          <p className="text-sm mt-1">Complete a survey to see friction breakdown by dimension.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="card-header mb-0">Friction Heatmap</h3>
        {overallScore !== undefined && (
          <div className="text-right">
            <span className="text-sm text-pearson-gray-500">Overall: </span>
            <span className="font-semibold text-pearson-gray-800">{Math.round(overallScore)}</span>
          </div>
        )}
      </div>

      {/* Heatmap grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {dimensions.map((dim) => (
          <div
            key={dim.dimension}
            className={clsx(
              'relative rounded-lg p-4 transition-all hover:scale-105 cursor-default',
              getScoreColor(dim.score)
            )}
            title={dim.description}
          >
            <div className="text-white">
              <div className="text-2xl font-bold">{Math.round(dim.score)}</div>
              <div className="text-sm font-medium opacity-90">{dim.label}</div>
              <div className="text-xs opacity-75 mt-1">{getScoreLabel(dim.score)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-pearson-gray-100">
        <div className="flex items-center justify-between text-xs text-pearson-gray-500">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-500"></div>
              <span>Low Friction (Good)</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span>High Friction (Needs Attention)</span>
          </div>
        </div>
      </div>

      {/* Dimension details on hover */}
      <div className="mt-4 text-xs text-pearson-gray-500 text-center">
        Hover over a dimension to see its description
      </div>
    </div>
  )
}
