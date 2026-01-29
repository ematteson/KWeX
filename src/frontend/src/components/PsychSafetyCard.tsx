import { useState } from 'react'
import {
  useTeamPsychSafetySurveys,
  useCreatePsychSafetySurvey,
  usePsychSafetyResults,
  useActivateSurvey,
  useCloseSurvey,
  useGenerateSurveyLink,
  useSurveyStats,
} from '../api/hooks'
import type { Survey } from '../api/types'

interface PsychSafetyCardProps {
  teamId: string
}

// Shortened labels for Edmondson's 7 items
const PSYCH_SAFETY_ITEM_LABELS: Record<number, string> = {
  1: 'Safe to take risks',
  2: 'OK to raise problems',
  3: 'Accepting differences',
  4: 'Safe to be vulnerable',
  5: 'Easy to ask for help',
  6: 'No undermining',
  7: 'Skills are valued',
}

function ScoreGauge({ score, label }: { score: number; label: string }) {
  // Score is on 1-7 scale
  const percentage = ((score - 1) / 6) * 100
  const color = score >= 5.5 ? 'bg-emerald-500' : score >= 4.0 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-pearson-gray-600 w-32 truncate" title={label}>{label}</span>
      <div className="flex-1 h-2 bg-pearson-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-medium text-pearson-gray-700 w-10 text-right">{score.toFixed(1)}</span>
    </div>
  )
}

function PsychSafetyResults({ survey }: { survey: Survey }) {
  const { data: results, isLoading } = usePsychSafetyResults(survey.id)
  const { data: stats } = useSurveyStats(survey.id)

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-16 bg-pearson-gray-200 rounded"></div>
        <div className="h-4 bg-pearson-gray-200 rounded w-3/4"></div>
      </div>
    )
  }

  if (!results?.meets_privacy_threshold) {
    return (
      <div className="text-center py-4">
        <p className="text-pearson-gray-600">Privacy threshold not met</p>
        <p className="text-sm text-pearson-gray-500 mt-1">
          {stats?.complete_responses || 0} of 7 minimum responses received
        </p>
      </div>
    )
  }

  const interpretationColors: Record<string, string> = {
    Low: 'text-red-600 bg-red-50',
    Moderate: 'text-amber-600 bg-amber-50',
    High: 'text-emerald-600 bg-emerald-50',
  }

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-3xl font-bold text-pearson-gray-900">
            {results.overall_score?.toFixed(1)}
            <span className="text-lg font-normal text-pearson-gray-500">/7</span>
          </div>
          <div className="text-sm text-pearson-gray-500">
            Based on {results.respondent_count} responses
          </div>
        </div>
        <div className="text-right">
          {results.interpretation && (
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${interpretationColors[results.interpretation] || ''}`}>
              {results.interpretation}
            </span>
          )}
          {results.benchmark_percentile && (
            <div className="text-xs text-pearson-gray-500 mt-1">
              {results.benchmark_percentile}th percentile
            </div>
          )}
        </div>
      </div>

      {/* Item Scores */}
      {results.item_scores && results.item_scores.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-pearson-gray-100">
          {results.item_scores.map((item) => (
            <ScoreGauge
              key={item.item_number}
              score={item.score}
              label={PSYCH_SAFETY_ITEM_LABELS[item.item_number] || `Item ${item.item_number}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ActiveSurveyCard({ survey, onClose }: { survey: Survey; onClose: (id: string) => void }) {
  const { data: stats } = useSurveyStats(survey.id)
  const generateLink = useGenerateSurveyLink()
  const [surveyUrl, setSurveyUrl] = useState<string | null>(null)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  const handleGetLink = async () => {
    const result = await generateLink.mutateAsync(survey.id)
    const fullUrl = `${window.location.origin}/respond/${result.token}`
    setSurveyUrl(fullUrl)
  }

  const [copied, setCopied] = useState(false)

  const handleCopyLink = () => {
    if (surveyUrl) {
      navigator.clipboard.writeText(surveyUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="border border-pearson-blue/30 bg-pearson-blue/5 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-pearson-gray-800">{survey.name}</h4>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 bg-pearson-blue text-white rounded-full">Active</span>
          <button
            onClick={() => setShowCloseConfirm(true)}
            className="text-xs text-pearson-gray-500 hover:text-pearson-gray-700"
            title="Close survey"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="text-sm text-pearson-gray-600 mb-3">
        {stats?.complete_responses || 0} responses collected
        {stats && !stats.meets_privacy_threshold && (
          <span className="text-amber-600 ml-2">
            (need {7 - (stats.complete_responses || 0)} more)
          </span>
        )}
      </div>

      {!surveyUrl ? (
        <button
          onClick={handleGetLink}
          disabled={generateLink.isPending}
          className="text-sm text-pearson-blue hover:underline"
        >
          {generateLink.isPending ? 'Generating...' : 'Get Survey Link'}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={surveyUrl}
            readOnly
            className="flex-1 text-xs p-2 bg-white border border-pearson-gray-200 rounded"
          />
          <button
            onClick={handleCopyLink}
            className={`text-xs px-3 py-2 rounded transition-colors ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-pearson-blue text-white hover:bg-pearson-blue/90'
            }`}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}

      {/* Close confirmation dialog */}
      {showCloseConfirm && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800 mb-2">
            Close this assessment? Results will be calculated with current responses.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onClose(survey.id)
                setShowCloseConfirm(false)
              }}
              className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded hover:bg-amber-700"
            >
              Close Assessment
            </button>
            <button
              onClick={() => setShowCloseConfirm(false)}
              className="text-xs px-3 py-1.5 bg-white text-amber-700 border border-amber-300 rounded hover:bg-amber-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ClosedSurveyCard({ survey }: { survey: Survey }) {
  return (
    <div className="border border-pearson-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-pearson-gray-800">{survey.name}</h4>
        <span className="text-xs px-2 py-1 bg-pearson-gray-200 text-pearson-gray-600 rounded-full">
          Closed
        </span>
      </div>
      <PsychSafetyResults survey={survey} />
    </div>
  )
}

export function PsychSafetyCard({ teamId }: PsychSafetyCardProps) {
  const { data: surveys, isLoading, refetch } = useTeamPsychSafetySurveys(teamId)
  const createSurvey = useCreatePsychSafetySurvey()
  const activateSurvey = useActivateSurvey()
  const closeSurvey = useCloseSurvey()
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeSurveys = surveys?.filter(s => s.status === 'active') || []
  const closedSurveys = surveys?.filter(s => s.status === 'closed') || []
  const draftSurveys = surveys?.filter(s => s.status === 'draft') || []
  const latestClosed = closedSurveys.length > 0 ? closedSurveys[0] : null

  const handleCreateAndActivate = async () => {
    setIsCreating(true)
    setError(null)
    try {
      const survey = await createSurvey.mutateAsync({ team_id: teamId })
      await activateSurvey.mutateAsync(survey.id)
      refetch()
    } catch (err) {
      setError('Failed to create assessment. Please try again.')
      console.error('Failed to create psych safety survey:', err)
    } finally {
      setIsCreating(false)
    }
  }

  const handleCloseSurvey = async (surveyId: string) => {
    try {
      await closeSurvey.mutateAsync(surveyId)
      refetch()
    } catch (err) {
      setError('Failed to close assessment. Please try again.')
      console.error('Failed to close psych safety survey:', err)
    }
  }

  return (
    <section className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="card-header mb-0">Psychological Safety</h2>
          <p className="text-xs text-pearson-gray-500 mt-1">
            Edmondson's 7-item validated scale
          </p>
        </div>
        {activeSurveys.length === 0 && (
          <button
            onClick={handleCreateAndActivate}
            disabled={isCreating}
            className="btn-primary text-sm"
          >
            {isCreating ? 'Creating...' : 'Start Assessment'}
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-20 bg-pearson-gray-200 rounded"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active Surveys */}
          {activeSurveys.map(survey => (
            <ActiveSurveyCard key={survey.id} survey={survey} onClose={handleCloseSurvey} />
          ))}

          {/* Draft Surveys (shouldn't normally exist, but handle) */}
          {draftSurveys.map(survey => (
            <div key={survey.id} className="border border-amber-200 bg-amber-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-amber-800">{survey.name} (Draft)</span>
                <button
                  onClick={() => activateSurvey.mutate(survey.id)}
                  className="text-sm text-pearson-blue hover:underline"
                >
                  Activate
                </button>
              </div>
            </div>
          ))}

          {/* Latest Results */}
          {activeSurveys.length === 0 && latestClosed && (
            <ClosedSurveyCard survey={latestClosed} />
          )}

          {/* No surveys yet */}
          {surveys?.length === 0 && (
            <div className="text-center py-6 text-pearson-gray-500">
              <p>No psychological safety assessments yet</p>
              <p className="text-sm mt-1">
                Run an assessment to measure team psychological safety using Edmondson's validated scale
              </p>
            </div>
          )}

          {/* Historical surveys link */}
          {closedSurveys.length > 1 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-pearson-blue hover:underline">
                View {closedSurveys.length - 1} previous assessment{closedSurveys.length > 2 ? 's' : ''}
              </summary>
              <div className="mt-3 space-y-3">
                {closedSurveys.slice(1).map(survey => (
                  <ClosedSurveyCard key={survey.id} survey={survey} />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </section>
  )
}
