import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import clsx from 'clsx'
import { useTeam, useTeamOpportunities, useUpdateOpportunity } from '../api/hooks'
import { OpportunityCard } from '../components/OpportunityCard'
import type { OpportunityStatus } from '../api/types'

const STATUS_TABS: { value: OpportunityStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'identified', label: 'Identified' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'deferred', label: 'Deferred' },
]

export function OpportunitiesPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const [statusFilter, setStatusFilter] = useState<OpportunityStatus | 'all'>('all')

  const { data: team, isLoading: teamLoading } = useTeam(teamId || '')
  const { data: opportunities, isLoading: oppsLoading } = useTeamOpportunities(
    teamId || '',
    statusFilter === 'all' ? undefined : statusFilter
  )
  const updateOpportunity = useUpdateOpportunity(teamId || '')

  const handleStatusChange = async (opportunityId: string, newStatus: OpportunityStatus) => {
    try {
      await updateOpportunity.mutateAsync({
        opportunityId,
        updates: { status: newStatus },
      })
    } catch (err) {
      console.error('Failed to update opportunity status:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to={`/teams/${teamId}`} className="text-sm text-pearson-blue hover:underline mb-2 inline-block">
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-pearson-gray-900">
          Improvement Opportunities
        </h1>
        {team && (
          <p className="text-pearson-gray-600 mt-1">{team.name}</p>
        )}
      </div>

      {/* Status filter tabs */}
      <div className="border-b border-pearson-gray-200">
        <nav className="flex gap-4 -mb-px">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={clsx(
                'py-2 px-1 text-sm font-medium border-b-2 transition-colors',
                statusFilter === tab.value
                  ? 'border-pearson-blue text-pearson-blue'
                  : 'border-transparent text-pearson-gray-600 hover:text-pearson-gray-900 hover:border-pearson-gray-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Opportunities list */}
      {oppsLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-5 bg-pearson-gray-200 rounded w-64 mb-3"></div>
              <div className="h-4 bg-pearson-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-pearson-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : opportunities && opportunities.length > 0 ? (
        <div className="space-y-4">
          {opportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              onStatusChange={(newStatus) => handleStatusChange(opportunity.id, newStatus)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border border-pearson-gray-200">
          <svg className="w-12 h-12 text-pearson-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <h2 className="text-lg font-medium text-pearson-gray-900 mb-2">
            {statusFilter === 'all' ? 'No opportunities found' : `No ${statusFilter.replace('_', ' ')} opportunities`}
          </h2>
          <p className="text-pearson-gray-600 max-w-md mx-auto">
            {statusFilter === 'all'
              ? 'Complete a survey to generate improvement opportunities based on team feedback.'
              : 'Opportunities will appear here as they move through the workflow.'}
          </p>
        </div>
      )}

      {/* RICE Score explanation */}
      <div className="card bg-pearson-gray-50">
        <h3 className="font-medium text-pearson-gray-800 mb-2">About RICE Scoring</h3>
        <p className="text-sm text-pearson-gray-600 mb-3">
          Opportunities are prioritized using the RICE framework:
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium text-pearson-gray-700">Reach</span>
            <p className="text-pearson-gray-500">Team members affected</p>
          </div>
          <div>
            <span className="font-medium text-pearson-gray-700">Impact</span>
            <p className="text-pearson-gray-500">Potential improvement</p>
          </div>
          <div>
            <span className="font-medium text-pearson-gray-700">Confidence</span>
            <p className="text-pearson-gray-500">Data reliability</p>
          </div>
          <div>
            <span className="font-medium text-pearson-gray-700">Effort</span>
            <p className="text-pearson-gray-500">Implementation time</p>
          </div>
        </div>
        <p className="text-xs text-pearson-gray-500 mt-3">
          RICE Score = (Reach × Impact × Confidence) / Effort
        </p>
      </div>
    </div>
  )
}
