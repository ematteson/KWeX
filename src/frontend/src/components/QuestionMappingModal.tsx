import { useSurveyQuestionMapping } from '../api/hooks'

interface QuestionMappingModalProps {
  surveyId: string
  isOpen: boolean
  onClose: () => void
}

const dimensionColors: Record<string, string> = {
  clarity: 'bg-blue-100 text-blue-800 border-blue-200',
  tooling: 'bg-purple-100 text-purple-800 border-purple-200',
  process: 'bg-green-100 text-green-800 border-green-200',
  rework: 'bg-orange-100 text-orange-800 border-orange-200',
  delay: 'bg-red-100 text-red-800 border-red-200',
  safety: 'bg-yellow-100 text-yellow-800 border-yellow-200',
}

const metricLabels: Record<string, string> = {
  flow: 'Flow',
  friction: 'Friction',
  safety: 'Safety',
  portfolio_balance: 'Portfolio',
}

export function QuestionMappingModal({ surveyId, isOpen, onClose }: QuestionMappingModalProps) {
  const { data: mapping, isLoading, error } = useSurveyQuestionMapping(surveyId)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold">Question to Task Mapping</h2>
              {mapping && (
                <p className="text-sm text-gray-500 mt-1">
                  {mapping.survey_name} • {mapping.occupation_name}
                  {mapping.occupation_faethm_code && (
                    <span className="font-mono ml-1">({mapping.occupation_faethm_code})</span>
                  )}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Summary Stats */}
          {mapping && (
            <div className="flex gap-4 mt-4">
              <div className="bg-gray-100 px-3 py-1.5 rounded-lg">
                <span className="text-sm text-gray-600">Total Questions: </span>
                <span className="font-semibold">{mapping.total_questions}</span>
              </div>
              <div className="bg-gray-100 px-3 py-1.5 rounded-lg">
                <span className="text-sm text-gray-600">Task-Specific: </span>
                <span className="font-semibold">{mapping.questions_with_tasks}</span>
              </div>
              <div className="bg-gray-100 px-3 py-1.5 rounded-lg">
                <span className="text-sm text-gray-600">General: </span>
                <span className="font-semibold">{mapping.total_questions - mapping.questions_with_tasks}</span>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading mapping...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              <p>Failed to load question mapping</p>
            </div>
          ) : mapping ? (
            <div className="space-y-4">
              {/* Dimension Legend */}
              <div className="flex flex-wrap gap-2 pb-4 border-b">
                <span className="text-sm text-gray-500">Friction Dimensions:</span>
                {Object.entries(dimensionColors).map(([dim, color]) => (
                  <span key={dim} className={`px-2 py-0.5 text-xs rounded border ${color}`}>
                    {dim.charAt(0).toUpperCase() + dim.slice(1)}
                  </span>
                ))}
              </div>

              {/* Questions List */}
              <div className="space-y-3">
                {mapping.questions.map((q, index) => (
                  <div
                    key={q.question_id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300"
                  >
                    <div className="flex items-start gap-3">
                      {/* Question Number */}
                      <div className="shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600">
                        {index + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Question Text */}
                        <p className="font-medium text-gray-900">{q.question_text}</p>

                        {/* Dimension and Metrics */}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className={`px-2 py-0.5 text-xs rounded border ${
                            dimensionColors[q.dimension] || 'bg-gray-100 text-gray-800'
                          }`}>
                            {q.dimension_label}
                          </span>

                          {q.metric_mapping.length > 0 && (
                            <span className="text-xs text-gray-400">→</span>
                          )}

                          {q.metric_mapping.map((metric) => (
                            <span
                              key={metric}
                              className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
                            >
                              {metricLabels[metric] || metric}
                            </span>
                          ))}
                        </div>

                        {/* Task Mapping (if any) */}
                        {q.task_id && (
                          <div className="mt-3 pl-3 border-l-2 border-blue-300 bg-blue-50 rounded-r p-2">
                            <p className="text-xs text-blue-600 font-medium">Linked to Faethm Task</p>
                            <p className="text-sm font-medium text-gray-900 mt-1">{q.task_name}</p>
                            {q.task_description && (
                              <p className="text-xs text-gray-600 mt-1">{q.task_description}</p>
                            )}
                            {q.faethm_task_id && (
                              <p className="text-xs text-gray-400 mt-1 font-mono">
                                Task ID: {q.faethm_task_id}
                              </p>
                            )}
                          </div>
                        )}

                        {/* No Task - General Question */}
                        {!q.task_id && (
                          <div className="mt-2">
                            <span className="text-xs text-gray-400 italic">
                              General question (not task-specific)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Explanation */}
              <div className="bg-gray-50 rounded-lg p-4 mt-6">
                <h4 className="font-medium text-gray-900 mb-2">Understanding the Mapping</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>
                    <strong>Friction Dimensions</strong>: Each question measures a specific type of friction
                    (Clarity, Tooling, Process, Rework, Delay, or Safety)
                  </li>
                  <li>
                    <strong>Metric Mapping</strong>: Shows which Core 4 metrics this question contributes to
                    (Flow, Friction, Safety, Portfolio Balance)
                  </li>
                  <li>
                    <strong>Task-Specific Questions</strong>: Linked to specific Faethm occupation tasks for
                    contextual relevance
                  </li>
                  <li>
                    <strong>General Questions</strong>: Apply broadly to the role without task-specific context
                  </li>
                </ul>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
