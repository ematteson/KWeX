import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSurveyByToken } from '../api/hooks'
import { apiClient } from '../api/client'

type SurveyMode = 'traditional' | 'chat'

export function SurveyLandingPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { data, isLoading, error } = useSurveyByToken(token || '')

  const [selectedMode, setSelectedMode] = useState<SurveyMode | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  // Handle mode selection and start
  const handleStartSurvey = async (mode: SurveyMode) => {
    if (!token) return

    setSelectedMode(mode)
    setIsStarting(true)
    setStartError(null)

    try {
      if (mode === 'traditional') {
        // Traditional survey - just navigate to the form
        navigate(`/survey/${token}/form`)
      } else {
        // Chat survey - create chat session via API
        const { data: chatData } = await apiClient.post<{
          session: { anonymous_token: string }
          chat_url: string
        }>(`/respond/${token}/start-chat`)

        // Navigate to chat page with the new chat token
        navigate(`/chat/${chatData.session.anonymous_token}`)
      }
    } catch (err: any) {
      console.error('Failed to start survey:', err)
      setStartError(err.response?.data?.detail || 'Failed to start survey. Please try again.')
      setIsStarting(false)
      setSelectedMode(null)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pearson-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-pearson-blue border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-pearson-gray-600">Loading survey...</p>
        </div>
      </div>
    )
  }

  // Error state - check for already submitted
  if (error || !data) {
    const errorMessage = (error as any)?.response?.data?.detail || 'Unknown error'
    const isAlreadySubmitted = errorMessage.includes('already submitted')

    if (isAlreadySubmitted) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-pearson-gray-50 to-green-50 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-pearson-gray-900 mb-3">Already Completed</h2>
            <p className="text-pearson-gray-600">
              You have already submitted your response for this survey. Thank you for your participation!
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-pearson-gray-50 to-red-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-pearson-gray-900 mb-3">Survey Not Found</h2>
          <p className="text-pearson-gray-600">
            This survey link may be invalid or expired. Please contact your team administrator for a new link.
          </p>
        </div>
      </div>
    )
  }

  // Check if user has existing answers (resume scenario)
  const hasExistingAnswers = data.existing_answers && data.existing_answers.length > 0
  if (hasExistingAnswers) {
    // They've started the traditional survey, redirect there
    navigate(`/survey/${token}/form`, { replace: true })
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pearson-gray-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="pt-8 pb-4 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur rounded-full shadow-sm mb-6">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-pearson-gray-600">Anonymous & Confidential</span>
          </div>
          <h1 className="text-3xl font-bold text-pearson-gray-900 mb-3">
            {data.survey_name}
          </h1>
          <p className="text-lg text-pearson-gray-600">
            Share your work experience to help improve team effectiveness
          </p>
        </div>
      </header>

      {/* Mode Selection */}
      <main className="px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-center text-pearson-gray-700 mb-8 font-medium">
            Choose how you'd like to share your feedback
          </h2>

          {startError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-center">
              {startError}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Traditional Survey Option */}
            <button
              onClick={() => handleStartSurvey('traditional')}
              disabled={isStarting}
              className={`group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 text-left border-2 ${
                selectedMode === 'traditional'
                  ? 'border-pearson-blue ring-4 ring-pearson-blue/20'
                  : 'border-transparent hover:border-pearson-gray-200'
              } ${isStarting && selectedMode !== 'traditional' ? 'opacity-50' : ''}`}
            >
              {/* Icon */}
              <div className="w-16 h-16 bg-gradient-to-br from-pearson-blue to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>

              <h3 className="text-xl font-bold text-pearson-gray-900 mb-2">
                Quick Survey
              </h3>

              <p className="text-pearson-gray-600 mb-6">
                Answer structured questions at your own pace. Navigate back and forth,
                save progress automatically.
              </p>

              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-pearson-gray-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  ~{data.estimated_completion_minutes} minutes
                </span>
                <span className="flex items-center gap-1.5 text-pearson-gray-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {data.questions.length} questions
                </span>
              </div>

              {/* Loading state */}
              {isStarting && selectedMode === 'traditional' && (
                <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 border-4 border-pearson-blue border-t-transparent rounded-full"></div>
                </div>
              )}

              {/* Hover arrow */}
              <div className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-6 h-6 text-pearson-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
            </button>

            {/* Chat Survey Option */}
            <button
              onClick={() => handleStartSurvey('chat')}
              disabled={isStarting}
              className={`group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 text-left border-2 ${
                selectedMode === 'chat'
                  ? 'border-pearson-green ring-4 ring-pearson-green/20'
                  : 'border-transparent hover:border-pearson-gray-200'
              } ${isStarting && selectedMode !== 'chat' ? 'opacity-50' : ''}`}
            >
              {/* Badge */}
              <div className="absolute -top-3 -right-3 px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-xs font-bold rounded-full shadow-lg">
                NEW
              </div>

              {/* Icon */}
              <div className="w-16 h-16 bg-gradient-to-br from-pearson-green to-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>

              <h3 className="text-xl font-bold text-pearson-gray-900 mb-2">
                Chat with AI
              </h3>

              <p className="text-pearson-gray-600 mb-6">
                Have a natural conversation about your work experience.
                The AI adapts to your responses and digs deeper where it matters.
              </p>

              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-pearson-gray-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  ~10-15 minutes
                </span>
                <span className="flex items-center gap-1.5 text-pearson-gray-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                  Conversational
                </span>
              </div>

              {/* Loading state */}
              {isStarting && selectedMode === 'chat' && (
                <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 border-4 border-pearson-green border-t-transparent rounded-full"></div>
                </div>
              )}

              {/* Hover arrow */}
              <div className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-6 h-6 text-pearson-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
            </button>
          </div>

          {/* Info section */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-6 text-sm text-pearson-gray-500">
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 text-pearson-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                100% Anonymous
              </span>
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 text-pearson-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Aggregated with 6+ responses
              </span>
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Instant insights
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4">
        <p className="text-center text-xs text-pearson-gray-400">
          Your honest feedback helps identify friction and improve how your team works.
          <br />
          Results are only visible when at least 6 people respond.
        </p>
      </footer>
    </div>
  )
}
