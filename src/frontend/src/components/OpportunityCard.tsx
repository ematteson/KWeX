import clsx from 'clsx'
import type { Opportunity, OpportunityStatus, FrictionType } from '../api/types'

interface OpportunityCardProps {
  opportunity: Opportunity
  onStatusChange?: (newStatus: OpportunityStatus) => void
  compact?: boolean
}

const frictionTypeLabels: Record<FrictionType, string> = {
  clarity: 'Clarity',
  tooling: 'Tooling',
  process: 'Process',
  rework: 'Rework',
  delay: 'Delay',
  safety: 'Safety',
}

const frictionTypeColors: Record<FrictionType, string> = {
  clarity: 'bg-blue-100 text-blue-800',
  tooling: 'bg-purple-100 text-purple-800',
  process: 'bg-amber-100 text-amber-800',
  rework: 'bg-red-100 text-red-800',
  delay: 'bg-orange-100 text-orange-800',
  safety: 'bg-emerald-100 text-emerald-800',
}

const statusLabels: Record<OpportunityStatus, string> = {
  identified: 'Identified',
  in_progress: 'In Progress',
  completed: 'Completed',
  deferred: 'Deferred',
}

const statusColors: Record<OpportunityStatus, string> = {
  identified: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  deferred: 'bg-yellow-100 text-yellow-800',
}

export function OpportunityCard({ opportunity, onStatusChange, compact = false }: OpportunityCardProps) {
  const { title, description, friction_type, rice_score, status, reach, impact, confidence, effort } = opportunity

  return (
    <div className={clsx('card', compact ? 'p-4' : 'p-6')}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <h3 className={clsx('font-semibold text-pearson-gray-800', compact ? 'text-sm' : 'text-base')}>
          {title}
        </h3>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-lg font-bold text-pearson-blue">{rice_score.toFixed(1)}</span>
          <span className="text-xs text-pearson-gray-500">RICE</span>
        </div>
      </div>

      {!compact && description && (
        <p className="text-sm text-pearson-gray-600 mb-4">{description}</p>
      )}

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {friction_type && (
          <span className={clsx(
            'px-2 py-0.5 text-xs font-medium rounded-full',
            frictionTypeColors[friction_type]
          )}>
            {frictionTypeLabels[friction_type]}
          </span>
        )}
        <span className={clsx(
          'px-2 py-0.5 text-xs font-medium rounded-full',
          statusColors[status]
        )}>
          {statusLabels[status]}
        </span>
      </div>

      {/* RICE breakdown */}
      {!compact && (
        <div className="grid grid-cols-4 gap-2 text-center border-t border-pearson-gray-100 pt-4">
          <div>
            <div className="text-lg font-semibold text-pearson-gray-800">{reach}</div>
            <div className="text-xs text-pearson-gray-500">Reach</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-pearson-gray-800">{impact}</div>
            <div className="text-xs text-pearson-gray-500">Impact</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-pearson-gray-800">{(confidence * 100).toFixed(0)}%</div>
            <div className="text-xs text-pearson-gray-500">Confidence</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-pearson-gray-800">{effort}w</div>
            <div className="text-xs text-pearson-gray-500">Effort</div>
          </div>
        </div>
      )}

      {/* Status change buttons */}
      {onStatusChange && status !== 'completed' && status !== 'deferred' && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-pearson-gray-100">
          {status === 'identified' && (
            <button
              onClick={() => onStatusChange('in_progress')}
              className="btn-primary text-sm flex-1"
            >
              Start Working
            </button>
          )}
          {status === 'in_progress' && (
            <>
              <button
                onClick={() => onStatusChange('completed')}
                className="btn-primary text-sm flex-1"
              >
                Mark Complete
              </button>
              <button
                onClick={() => onStatusChange('deferred')}
                className="btn-secondary text-sm"
              >
                Defer
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
