import { useState } from 'react'
import type { Survey, Question } from '../api/types'

interface SurveyPreviewModalProps {
  survey: Survey
  isOpen: boolean
  onClose: () => void
}

function getQuestionTypeLabel(type: string): string {
  switch (type) {
    case 'likert_5':
      return '5-point scale'
    case 'likert_7':
      return '7-point scale'
    case 'percentage_slider':
      return 'Percentage slider'
    case 'multiple_choice':
      return 'Multiple choice'
    case 'free_text':
      return 'Free text'
    default:
      return type
  }
}

function getDefaultOptions(type: string): string[] {
  if (type === 'likert_5') {
    return ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']
  }
  if (type === 'likert_7') {
    return ['Strongly Disagree', 'Disagree', 'Somewhat Disagree', 'Neutral', 'Somewhat Agree', 'Agree', 'Strongly Agree']
  }
  return []
}

function QuestionPreview({ question, index }: { question: Question; index: number }) {
  const options = question.options?.choices || getDefaultOptions(question.type)

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded capitalize">
          {question.dimension.replace('_', ' ')}
        </span>
        <span className="text-xs text-gray-400">
          {getQuestionTypeLabel(question.type)}
        </span>
      </div>

      <p className="font-medium text-gray-900 mb-3">
        {index + 1}. {question.text}
      </p>

      {/* Show answer options */}
      {(question.type === 'likert_5' || question.type === 'likert_7') && (
        <div className="flex flex-wrap gap-2">
          {options.map((option, i) => (
            <span
              key={i}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-full"
            >
              {i + 1}. {option}
            </span>
          ))}
        </div>
      )}

      {question.type === 'percentage_slider' && (
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>{question.options?.low_label || '0%'}</span>
          <div className="flex-1 h-2 bg-gray-200 rounded-full" />
          <span>{question.options?.high_label || '100%'}</span>
        </div>
      )}

      {question.type === 'free_text' && (
        <div className="border border-gray-200 rounded p-3 bg-gray-50 text-sm text-gray-400 italic">
          Free text response...
        </div>
      )}
    </div>
  )
}

export function SurveyPreviewModal({ survey, isOpen, onClose }: SurveyPreviewModalProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle')

  if (!isOpen) return null

  const sortedQuestions = [...(survey.questions || [])].sort((a, b) => a.order - b.order)

  // Group questions by dimension
  const groupedQuestions = sortedQuestions.reduce((acc, q) => {
    const dim = q.dimension
    if (!acc[dim]) acc[dim] = []
    acc[dim].push(q)
    return acc
  }, {} as Record<string, Question[]>)

  // Generate shareable text format
  const generateShareableText = () => {
    let text = `# ${survey.name}\n\n`
    text += `Estimated completion time: ${survey.estimated_completion_minutes} minutes\n`
    text += `Total questions: ${sortedQuestions.length}\n\n`
    text += `---\n\n`

    sortedQuestions.forEach((q, i) => {
      const options = q.options?.choices || getDefaultOptions(q.type)
      text += `**Q${i + 1}. [${q.dimension.replace('_', ' ').toUpperCase()}]**\n`
      text += `${q.text}\n\n`

      if (q.type === 'likert_5' || q.type === 'likert_7') {
        text += `*Options:*\n`
        options.forEach((opt, j) => {
          text += `  ${j + 1}. ${opt}\n`
        })
      } else if (q.type === 'percentage_slider') {
        text += `*Slider:* ${q.options?.low_label || '0%'} to ${q.options?.high_label || '100%'}\n`
      } else if (q.type === 'free_text') {
        text += `*Type:* Free text response\n`
      }
      text += `\n`
    })

    return text
  }

  const handleCopyText = async () => {
    const text = generateShareableText()
    await navigator.clipboard.writeText(text)
    setCopyStatus('copied')
    setTimeout(() => setCopyStatus('idle'), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-50 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white p-6 border-b flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{survey.name}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {sortedQuestions.length} questions | ~{survey.estimated_completion_minutes} min to complete
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Action Bar */}
        <div className="bg-white px-6 py-3 border-b flex gap-2 flex-wrap">
          <button
            onClick={handleCopyText}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            {copyStatus === 'copied' ? 'Copied!' : 'Copy as Text'}
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>

          {/* Dimension summary */}
          <div className="ml-auto flex gap-2 items-center">
            <span className="text-sm text-gray-500">Dimensions:</span>
            {Object.keys(groupedQuestions).map(dim => (
              <span key={dim} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded capitalize">
                {dim.replace('_', ' ')} ({groupedQuestions[dim].length})
              </span>
            ))}
          </div>
        </div>

        {/* Questions List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {sortedQuestions.map((question, index) => (
              <QuestionPreview key={question.id} question={question} index={index} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white p-4 border-t">
          <p className="text-xs text-gray-500 text-center">
            Responses are anonymous and will be aggregated with at least 6 others before being visible.
          </p>
        </div>
      </div>
    </div>
  )
}
