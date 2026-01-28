import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  useOccupation,
  useOccupationTasks,
  useAllocationSummary,
  useTeams,
  useSyncOccupationTasks,
} from '../api/hooks'
import { TaskCurationModal } from '../components/TaskCurationModal'
import type { OccupationTask, TaskCategory, Team } from '../api/types'

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  core: 'Core',
  support: 'Support',
  admin: 'Admin',
}

const CATEGORY_COLORS: Record<TaskCategory, string> = {
  core: 'bg-blue-100 text-blue-800',
  support: 'bg-green-100 text-green-800',
  admin: 'bg-gray-100 text-gray-800',
}

export function OccupationDetailPage() {
  const { occupationId } = useParams<{ occupationId: string }>()
  const [showCurationModal, setShowCurationModal] = useState(false)

  const { data: occupation, isLoading: loadingOccupation, error } = useOccupation(occupationId || '')
  const { data: tasks, isLoading: loadingTasks, refetch: refetchTasks } = useOccupationTasks(occupationId || '')
  const { data: summary, refetch: refetchSummary } = useAllocationSummary(occupationId || '')
  const { data: allTeams } = useTeams()
  const syncTasks = useSyncOccupationTasks(occupationId || '')

  const handleSyncTasks = async () => {
    try {
      await syncTasks.mutateAsync()
      refetchTasks()
      refetchSummary()
    } catch (err) {
      console.error('Failed to sync tasks:', err)
    }
  }

  // Filter teams using this occupation
  const teamsUsingOccupation = allTeams?.filter((team: Team) => team.occupation_id === occupationId) || []

  if (loadingOccupation) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-32 bg-gray-200 rounded mb-6"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !occupation) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Occupation not found</h2>
        <p className="text-gray-600 mb-4">The occupation you're looking for doesn't exist.</p>
        <Link to="/teams" className="text-blue-600 hover:text-blue-800">
          Back to Teams
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500">
        <Link to="/teams" className="hover:text-gray-700">
          Teams
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{occupation.name}</span>
      </nav>

      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{occupation.name}</h1>
          {occupation.faethm_code && (
            <p className="text-sm font-mono text-blue-600 mt-1">
              {occupation.faethm_code}
            </p>
          )}
          {occupation.description && (
            <p className="text-gray-600 mt-2 max-w-2xl">{occupation.description}</p>
          )}
        </div>
        <button
          onClick={() => setShowCurationModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Curate Tasks
        </button>
      </div>

      {/* Portfolio Balance Card */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Balance</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">
              {(occupation.ideal_run_percentage * 100).toFixed(0)}%
            </p>
            <p className="text-sm text-blue-800 mt-1">Run (BAU)</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">
              {(occupation.ideal_change_percentage * 100).toFixed(0)}%
            </p>
            <p className="text-sm text-green-800 mt-1">Change (Projects)</p>
          </div>
        </div>
      </div>

      {/* Tasks Summary */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Assigned Tasks</h2>
          {summary && (
            <div className="flex gap-2 text-sm">
              <span className="px-2 py-1 bg-gray-100 rounded">
                {summary.total_tasks} tasks
              </span>
              <span className={`px-2 py-1 rounded ${
                summary.total_percentage > 100
                  ? 'bg-red-100 text-red-700'
                  : summary.total_percentage === 100
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {summary.total_percentage.toFixed(0)}% allocated
              </span>
            </div>
          )}
        </div>

        {loadingTasks ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : tasks && tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.map((assignment: OccupationTask) => (
              <div
                key={assignment.id}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    CATEGORY_COLORS[assignment.category_override || assignment.global_task.category]
                  }`}>
                    {CATEGORY_LABELS[assignment.category_override || assignment.global_task.category]}
                  </span>
                  <span className="font-medium text-gray-900">
                    {assignment.global_task.name}
                  </span>
                  {assignment.global_task.is_custom && (
                    <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">
                      Custom
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className={`font-semibold ${
                    assignment.time_percentage > 0 ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {assignment.time_percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-4">No tasks assigned to this occupation</p>
            <div className="flex justify-center gap-3">
              {occupation.faethm_code && (
                <button
                  onClick={handleSyncTasks}
                  disabled={syncTasks.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300"
                >
                  {syncTasks.isPending ? 'Syncing...' : 'Sync Tasks from Faethm'}
                </button>
              )}
              <button
                onClick={() => setShowCurationModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Curate Tasks Manually
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Teams Using This Occupation */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Teams Using This Occupation</h2>
        {teamsUsingOccupation.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teamsUsingOccupation.map((team: Team) => (
              <Link
                key={team.id}
                to={`/teams/${team.id}`}
                className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <h3 className="font-medium text-gray-900">{team.name}</h3>
                <p className="text-sm text-gray-600">{team.function}</p>
                <p className="text-xs text-gray-500 mt-1">{team.member_count} members</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">
            No teams are using this occupation yet
          </p>
        )}
      </div>

      {/* Task Curation Modal */}
      <TaskCurationModal
        occupationId={occupationId || ''}
        occupationName={occupation.name}
        isOpen={showCurationModal}
        onClose={() => setShowCurationModal(false)}
      />
    </div>
  )
}
