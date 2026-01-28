import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSurveyByToken, useSubmitSurvey, useSaveProgress } from '../api/hooks'
import { ProgressBar } from '../components/ProgressBar'
import { LikertScale } from '../components/LikertScale'
import type { AnswerSubmission } from '../api/types'

// Auto-save interval (5 seconds)
const AUTO_SAVE_INTERVAL = 5000

export function SurveyPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { data, isLoading, error } = useSurveyByToken(token || '')
  const submitSurvey = useSubmitSurvey(token || '')
  const saveProgress = useSaveProgress(token || '')

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Map<string, AnswerSubmission>>(new Map())
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Track if we've initialized from existing answers
  const initializedRef = useRef(false)

  // Sort questions by order
  const sortedQuestions = useMemo(() => {
    if (!data?.questions) return []
    return [...data.questions].sort((a, b) => a.order - b.order)
  }, [data?.questions])

  const currentQuestion = sortedQuestions[currentQuestionIndex]
  const totalQuestions = sortedQuestions.length
  const progress = currentQuestionIndex + 1

  // Initialize answers from existing saved answers (resume functionality)
  useEffect(() => {
    if (data?.existing_answers && data.existing_answers.length > 0 && !initializedRef.current) {
      const existingAnswers = new Map<string, AnswerSubmission>()

      for (const answer of data.existing_answers) {
        const question = sortedQuestions.find(q => q.id === answer.question_id)
        if (question) {
          const numericValue = parseFloat(answer.value)
          existingAnswers.set(answer.question_id, {
            question_id: answer.question_id,
            value: answer.value,
            numeric_value: isNaN(numericValue) ? null : numericValue,
          })
        }
      }

      setAnswers(existingAnswers)

      // Find the first unanswered question to resume from
      const firstUnansweredIndex = sortedQuestions.findIndex(q => !existingAnswers.has(q.id))
      if (firstUnansweredIndex > 0) {
        setCurrentQuestionIndex(firstUnansweredIndex)
      } else if (firstUnansweredIndex === -1 && existingAnswers.size > 0) {
        // All questions answered, go to last question
        setCurrentQuestionIndex(sortedQuestions.length - 1)
      }

      initializedRef.current = true
    }
  }, [data?.existing_answers, sortedQuestions])

  // Auto-save functionality
  const saveCurrentProgress = useCallback(async () => {
    if (!hasUnsavedChanges || answers.size === 0) return

    setSaveStatus('saving')
    try {
      await saveProgress.mutateAsync(Array.from(answers.values()))
      setHasUnsavedChanges(false)
      setLastSaved(new Date())
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      console.error('Failed to save progress:', err)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }, [hasUnsavedChanges, answers, saveProgress])

  // Auto-save on interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (hasUnsavedChanges) {
        saveCurrentProgress()
      }
    }, AUTO_SAVE_INTERVAL)

    return () => clearInterval(interval)
  }, [hasUnsavedChanges, saveCurrentProgress])

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        // Try to save synchronously (best effort)
        if (token && answers.size > 0) {
          navigator.sendBeacon(
            `/api/v1/respond/${token}`,
            JSON.stringify({ answers: Array.from(answers.values()) })
          )
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges, token, answers])

  // Check if current question has been answered
  const currentAnswer = currentQuestion ? answers.get(currentQuestion.id) : null
  const canProceed = currentAnswer !== null && currentAnswer !== undefined

  // Auto-register default value for percentage_slider questions
  useEffect(() => {
    if (currentQuestion?.type === 'percentage_slider' && !answers.has(currentQuestion.id)) {
      const defaultValue = 50
      const answerSubmission: AnswerSubmission = {
        question_id: currentQuestion.id,
        value: String(defaultValue),
        numeric_value: defaultValue,
      }
      setAnswers((prev) => new Map(prev).set(currentQuestion.id, answerSubmission))
      setHasUnsavedChanges(true)
    }
  }, [currentQuestion])

  // Handle answer selection
  const handleAnswer = (value: number) => {
    if (!currentQuestion) return

    const answerSubmission: AnswerSubmission = {
      question_id: currentQuestion.id,
      value: String(value),
      numeric_value: value,
    }

    setAnswers((prev) => new Map(prev).set(currentQuestion.id, answerSubmission))
    setHasUnsavedChanges(true)
  }

  // Navigate to next question (and save progress)
  const handleNext = async () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      // Save progress when moving to next question
      if (hasUnsavedChanges) {
        await saveCurrentProgress()
      }
      setCurrentQuestionIndex((prev) => prev + 1)
    }
  }

  // Navigate to previous question
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1)
    }
  }

  // Submit survey
  const handleSubmit = async () => {
    const allAnswers = Array.from(answers.values())

    try {
      await submitSurvey.mutateAsync(allAnswers)
      navigate('/survey/complete')
    } catch (err) {
      console.error('Failed to submit survey:', err)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-pearson-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-pearson-blue border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-pearson-gray-600">Loading survey...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !data) {
    const errorMessage = (error as any)?.response?.data?.detail || 'Unknown error'
    const isAlreadySubmitted = errorMessage.includes('already submitted')

    if (isAlreadySubmitted) {
      return (
        <div className="min-h-screen bg-pearson-gray-50 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-pearson-gray-900 mb-2">Survey Already Completed</h2>
            <p className="text-pearson-gray-600">
              You have already submitted your response for this survey. Thank you for your participation!
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-pearson-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-pearson-gray-900 mb-2">Survey Not Found</h2>
          <p className="text-pearson-gray-600">
            This survey link may be invalid or expired. Please contact your team administrator for a new link.
          </p>
        </div>
      </div>
    )
  }

  // Calculate estimated time remaining
  const estimatedTimePerQuestion = (data.estimated_completion_minutes * 60) / totalQuestions
  const remainingQuestions = totalQuestions - currentQuestionIndex
  const estimatedTimeRemaining = Math.ceil((remainingQuestions * estimatedTimePerQuestion) / 60)

  // Count answered questions
  const answeredCount = answers.size

  return (
    <div className="min-h-screen bg-pearson-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-pearson-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold text-pearson-gray-900">{data.survey_name}</h1>
            <div className="flex items-center gap-3">
              {/* Save status indicator */}
              {saveStatus === 'saving' && (
                <span className="text-xs text-pearson-gray-500 flex items-center gap-1">
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="text-xs text-red-600">Save failed</span>
              )}
              <span className="text-sm text-pearson-gray-500">
                ~{estimatedTimeRemaining} min remaining
              </span>
            </div>
          </div>
          <ProgressBar current={progress} total={totalQuestions} />
          <div className="flex justify-between text-xs text-pearson-gray-500 mt-1">
            <span>{answeredCount} of {totalQuestions} answered</span>
            {lastSaved && (
              <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
            )}
          </div>
        </div>
      </header>

      {/* Resume notice */}
      {initializedRef.current && answeredCount > 0 && currentQuestionIndex > 0 && (
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <strong>Welcome back!</strong> Your previous progress has been restored. You can continue from where you left off.
          </div>
        </div>
      )}

      {/* Question */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {currentQuestion && (
          <div className="card animate-fade-in">
            {/* Dimension badge */}
            <div className="mb-4">
              <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-pearson-gray-100 text-pearson-gray-600 capitalize">
                {currentQuestion.dimension.replace('_', ' ')}
              </span>
            </div>

            {/* Question text */}
            <h2 className="text-xl font-medium text-pearson-gray-900 mb-8">
              {currentQuestion.text}
            </h2>

            {/* Answer options */}
            {(currentQuestion.type === 'likert_5' || currentQuestion.type === 'likert_7') && (
              <LikertScale
                value={currentAnswer?.numeric_value ?? null}
                onChange={handleAnswer}
                scale={currentQuestion.type === 'likert_5' ? 5 : 7}
                labels={currentQuestion.options?.choices}
              />
            )}

            {/* Percentage slider */}
            {currentQuestion.type === 'percentage_slider' && (
              <div className="w-full">
                <div className="flex justify-between text-sm text-pearson-gray-600 mb-2">
                  <span>{currentQuestion.options?.low_label || '0%'}</span>
                  <span>{currentQuestion.options?.high_label || '100%'}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={currentAnswer?.numeric_value ?? 50}
                  onChange={(e) => handleAnswer(parseInt(e.target.value, 10))}
                  className="w-full h-3 bg-pearson-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                />
                <div className="text-center mt-3">
                  <span className="text-2xl font-semibold text-pearson-blue">
                    {currentAnswer?.numeric_value ?? 50}%
                  </span>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t border-pearson-gray-100">
              <button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {currentQuestionIndex < totalQuestions - 1 ? (
                <button
                  onClick={handleNext}
                  disabled={!canProceed}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!canProceed || submitSurvey.isPending}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitSurvey.isPending ? 'Submitting...' : 'Submit Survey'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Question navigation dots */}
        <div className="flex justify-center mt-6 gap-1 flex-wrap">
          {sortedQuestions.map((q, index) => {
            const isAnswered = answers.has(q.id)
            const isCurrent = index === currentQuestionIndex

            return (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  isCurrent
                    ? 'bg-pearson-blue scale-125'
                    : isAnswered
                    ? 'bg-pearson-green'
                    : 'bg-pearson-gray-300'
                }`}
                title={`Question ${index + 1}${isAnswered ? ' (answered)' : ''}`}
              />
            )
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-pearson-gray-200 py-3">
        <div className="max-w-2xl mx-auto px-4 text-center text-xs text-pearson-gray-500">
          Your responses are anonymous and will be aggregated with at least 6 others before being visible.
          {hasUnsavedChanges && ' • Progress auto-saves every few seconds.'}
        </div>
      </footer>
    </div>
  )
}
