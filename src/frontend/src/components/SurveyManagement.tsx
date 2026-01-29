import { useState } from 'react'
import {
  useTeamSurveys,
  useCreateSurvey,
  useGenerateQuestions,
  useActivateSurvey,
  useCloseSurvey,
  useGenerateSurveyLink,
  useSurveyStats,
  useCloneSurvey,
} from '../api/hooks'
import type { Survey, Team } from '../api/types'
import { QuestionMappingModal } from './QuestionMappingModal'
import { SurveyPreviewModal } from './SurveyPreviewModal'

interface SurveyManagementProps {
  team: Team
}

function SurveyCard({
  survey,
  onGenerateQuestions,
  onActivate,
  onClose,
  onGenerateLink: _onGenerateLink,
  onClone,
  isGeneratingQuestions,
  isActivating,
  isClosing,
  isCloning,
}: {
  survey: Survey
  onGenerateQuestions: (surveyId: string, useTaskSpecific: boolean) => void
  onActivate: (surveyId: string) => void
  onClose: (surveyId: string) => void
  onGenerateLink: (surveyId: string) => void
  onClone: (surveyId: string, newName?: string) => void
  isGeneratingQuestions: boolean
  isActivating: boolean
  isClosing: boolean
  isCloning: boolean
}) {
  const { data: stats } = useSurveyStats(survey.id)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [showMappingModal, setShowMappingModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showGenerateOptions, setShowGenerateOptions] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [useTaskSpecific, setUseTaskSpecific] = useState(true)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const generateLink = useGenerateSurveyLink()

  const handleGenerateLink = async () => {
    try {
      const result = await generateLink.mutateAsync(survey.id)
      const fullUrl = `${window.location.origin}/survey/${result.token}`
      setGeneratedLink(fullUrl)
      setShowLinkModal(true)
    } catch (err) {
      console.error('Failed to generate link:', err)
    }
  }

  const copyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink)
    }
  }

  const statusColors = {
    draft: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
  }

  const hasQuestions = survey.questions && survey.questions.length > 0

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{survey.name}</h3>
          <p className="text-sm text-gray-500">
            Created {new Date(survey.created_at).toLocaleDateString()}
          </p>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[survey.status]}`}>
          {survey.status.charAt(0).toUpperCase() + survey.status.slice(1)}
        </span>
      </div>

      {/* Survey Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
          <div className="bg-gray-50 rounded p-2">
            <p className="text-lg font-bold text-gray-900">{stats.complete_responses}</p>
            <p className="text-xs text-gray-500">Responses</p>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <p className="text-lg font-bold text-gray-900">{survey.questions?.length || 0}</p>
            <p className="text-xs text-gray-500">Questions</p>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <p className="text-lg font-bold text-gray-900">{survey.estimated_completion_minutes || '-'}</p>
            <p className="text-xs text-gray-500">Est. Minutes</p>
          </div>
        </div>
      )}

      {/* Privacy Threshold Indicator */}
      {stats && survey.status === 'active' && (
        <div className={`mb-4 p-2 rounded text-sm ${
          stats.meets_privacy_threshold
            ? 'bg-green-50 text-green-700'
            : 'bg-yellow-50 text-yellow-700'
        }`}>
          {stats.meets_privacy_threshold ? (
            <span>Privacy threshold met - metrics available</span>
          ) : (
            <span>Need {7 - stats.complete_responses} more responses for metrics</span>
          )}
        </div>
      )}

      {/* Actions based on status */}
      <div className="flex flex-wrap gap-2">
        {survey.status === 'draft' && !hasQuestions && !showGenerateOptions && (
          <button
            onClick={() => setShowGenerateOptions(true)}
            disabled={isGeneratingQuestions}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Generate Questions
          </button>
        )}

        {survey.status === 'draft' && !hasQuestions && showGenerateOptions && (
          <div className="w-full bg-blue-50 rounded-lg p-3 space-y-3">
            <p className="text-sm font-medium text-blue-900">Question Generation Options</p>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={useTaskSpecific}
                onChange={(e) => setUseTaskSpecific(e.target.checked)}
                className="mt-1 rounded border-gray-300"
              />
              <span className="text-sm text-blue-800">
                <strong>Include task-specific questions</strong>
                <br />
                <span className="text-blue-600">Links questions to Faethm occupation tasks for contextual relevance</span>
              </span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onGenerateQuestions(survey.id, useTaskSpecific)
                  setShowGenerateOptions(false)
                }}
                disabled={isGeneratingQuestions}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isGeneratingQuestions ? 'Generating...' : 'Generate'}
              </button>
              <button
                onClick={() => setShowGenerateOptions(false)}
                className="px-3 py-1.5 text-sm bg-white text-blue-700 border border-blue-300 rounded hover:bg-blue-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {survey.status === 'draft' && hasQuestions && (
          <button
            onClick={() => onActivate(survey.id)}
            disabled={isActivating}
            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {isActivating ? 'Activating...' : 'Activate Survey'}
          </button>
        )}

        {survey.status === 'active' && (
          <>
            <button
              onClick={handleGenerateLink}
              disabled={generateLink.isPending}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {generateLink.isPending ? 'Generating...' : 'Get Response Link'}
            </button>
            <button
              onClick={() => setShowCloseConfirm(true)}
              disabled={isClosing}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              {isClosing ? 'Closing...' : 'Close Survey'}
            </button>
          </>
        )}

        {/* Close Survey Confirmation */}
        {showCloseConfirm && (
          <div className="w-full mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800 mb-2">
              <strong>Close this survey?</strong> No more responses can be collected. Results will be calculated with {stats?.complete_responses || 0} responses.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onClose(survey.id)
                  setShowCloseConfirm(false)
                }}
                disabled={isClosing}
                className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50"
              >
                {isClosing ? 'Closing...' : 'Yes, Close Survey'}
              </button>
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="px-3 py-1.5 text-sm bg-white text-amber-700 border border-amber-300 rounded hover:bg-amber-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {survey.status === 'closed' && stats && stats.meets_privacy_threshold && (
          <span className="px-3 py-1.5 text-sm text-green-700">
            Metrics calculated
          </span>
        )}

        {/* View Mapping button - show if survey has questions */}
        {hasQuestions && (
          <>
            <button
              onClick={() => setShowPreviewModal(true)}
              className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview All
            </button>
            <button
              onClick={() => setShowMappingModal(true)}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              View Mapping
            </button>
            <button
              onClick={() => onClone(survey.id)}
              disabled={isCloning}
              className="px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 disabled:opacity-50 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {isCloning ? 'Cloning...' : 'Clone'}
            </button>
          </>
        )}
      </div>

      {/* Survey Preview Modal */}
      <SurveyPreviewModal
        survey={survey}
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
      />

      {/* Question Mapping Modal */}
      <QuestionMappingModal
        surveyId={survey.id}
        isOpen={showMappingModal}
        onClose={() => setShowMappingModal(false)}
      />

      {/* Link Modal */}
      {showLinkModal && generatedLink && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Survey Response Link</h3>
            <p className="text-sm text-gray-600 mb-4">
              Share this unique link with a team member. Each link can only be used once.
            </p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                readOnly
                value={generatedLink}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
              />
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Copy
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleGenerateLink}
                className="flex-1 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Generate Another
              </button>
              <button
                onClick={() => {
                  setShowLinkModal(false)
                  setGeneratedLink(null)
                }}
                className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function SurveyManagement({ team }: SurveyManagementProps) {
  const { data: surveys, isLoading, refetch } = useTeamSurveys(team.id)
  const createSurvey = useCreateSurvey()
  const generateQuestions = useGenerateQuestions()
  const activateSurvey = useActivateSurvey()
  const closeSurvey = useCloseSurvey()
  const cloneSurvey = useCloneSurvey()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newSurveyName, setNewSurveyName] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [cloningId, setCloningId] = useState<string | null>(null)

  const handleCreateSurvey = async () => {
    if (!newSurveyName.trim()) return

    try {
      await createSurvey.mutateAsync({
        name: newSurveyName,
        team_id: team.id,
        occupation_id: team.occupation_id,
      })
      setShowCreateModal(false)
      setNewSurveyName('')
      refetch()
    } catch (err) {
      console.error('Failed to create survey:', err)
    }
  }

  const handleGenerateQuestions = async (surveyId: string, useTaskSpecific: boolean) => {
    setProcessingId(surveyId)
    try {
      await generateQuestions.mutateAsync({ surveyId, useTaskSpecific })
      refetch()
    } catch (err) {
      console.error('Failed to generate questions:', err)
    } finally {
      setProcessingId(null)
    }
  }

  const handleActivate = async (surveyId: string) => {
    setProcessingId(surveyId)
    try {
      await activateSurvey.mutateAsync(surveyId)
      refetch()
    } catch (err) {
      console.error('Failed to activate survey:', err)
    } finally {
      setProcessingId(null)
    }
  }

  const handleClose = async (surveyId: string) => {
    setProcessingId(surveyId)
    try {
      await closeSurvey.mutateAsync(surveyId)
      refetch()
    } catch (err) {
      console.error('Failed to close survey:', err)
    } finally {
      setProcessingId(null)
    }
  }

  const handleClone = async (surveyId: string, newName?: string) => {
    setCloningId(surveyId)
    try {
      await cloneSurvey.mutateAsync({ surveyId, newName })
      refetch()
    } catch (err) {
      console.error('Failed to clone survey:', err)
    } finally {
      setCloningId(null)
    }
  }

  const activeSurveys = surveys?.filter(s => s.status === 'active') || []
  const draftSurveys = surveys?.filter(s => s.status === 'draft') || []
  const closedSurveys = surveys?.filter(s => s.status === 'closed') || []

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Surveys</h2>
          <p className="text-sm text-gray-500">Create and manage team surveys</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          New Survey
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading surveys...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Surveys */}
          {activeSurveys.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Active Surveys</h3>
              <div className="space-y-3">
                {activeSurveys.map(survey => (
                  <SurveyCard
                    key={survey.id}
                    survey={survey}
                    onGenerateQuestions={handleGenerateQuestions}
                    onActivate={handleActivate}
                    onClose={handleClose}
                    onGenerateLink={() => {}}
                    onClone={handleClone}
                    isGeneratingQuestions={processingId === survey.id && generateQuestions.isPending}
                    isActivating={processingId === survey.id && activateSurvey.isPending}
                    isClosing={processingId === survey.id && closeSurvey.isPending}
                    isCloning={cloningId === survey.id && cloneSurvey.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Draft Surveys */}
          {draftSurveys.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Draft Surveys</h3>
              <div className="space-y-3">
                {draftSurveys.map(survey => (
                  <SurveyCard
                    key={survey.id}
                    survey={survey}
                    onGenerateQuestions={handleGenerateQuestions}
                    onActivate={handleActivate}
                    onClose={handleClose}
                    onGenerateLink={() => {}}
                    onClone={handleClone}
                    isGeneratingQuestions={processingId === survey.id && generateQuestions.isPending}
                    isActivating={processingId === survey.id && activateSurvey.isPending}
                    isClosing={processingId === survey.id && closeSurvey.isPending}
                    isCloning={cloningId === survey.id && cloneSurvey.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Closed Surveys */}
          {closedSurveys.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Closed Surveys</h3>
              <div className="space-y-3">
                {closedSurveys.map(survey => (
                  <SurveyCard
                    key={survey.id}
                    survey={survey}
                    onGenerateQuestions={handleGenerateQuestions}
                    onActivate={handleActivate}
                    onClose={handleClose}
                    onGenerateLink={() => {}}
                    onClone={handleClone}
                    isGeneratingQuestions={processingId === survey.id && generateQuestions.isPending}
                    isActivating={processingId === survey.id && activateSurvey.isPending}
                    isClosing={processingId === survey.id && closeSurvey.isPending}
                    isCloning={cloningId === survey.id && cloneSurvey.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {(!surveys || surveys.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <p>No surveys yet. Create one to start collecting feedback.</p>
            </div>
          )}
        </div>
      )}

      {/* Create Survey Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Create New Survey</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Survey Name
              </label>
              <input
                type="text"
                value={newSurveyName}
                onChange={(e) => setNewSurveyName(e.target.value)}
                placeholder="e.g., Q1 2026 KWeX Survey"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <p className="text-sm text-gray-500 mb-4">
              The survey will be created for team "{team.name}" using their assigned occupation's friction dimensions.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewSurveyName('')
                }}
                className="flex-1 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSurvey}
                disabled={!newSurveyName.trim() || createSurvey.isPending}
                className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {createSurvey.isPending ? 'Creating...' : 'Create Survey'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
