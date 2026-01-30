import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import {
  useChatSession,
  useSendChatMessage,
  useConfirmRating,
  useCompleteChat,
} from '../api/hooks'
import type {
  ChatMessage,
  ChatExtractedRating,
  FrictionType,
} from '../api/types'

// Dimension labels for display
const DIMENSION_LABELS: Record<FrictionType, string> = {
  clarity: 'Clarity',
  tooling: 'Tooling',
  process: 'Process',
  rework: 'Rework',
  delay: 'Delay',
  safety: 'Safety',
}

// Dimension order for progress indicator
const DIMENSION_ORDER: FrictionType[] = [
  'clarity',
  'tooling',
  'process',
  'rework',
  'delay',
  'safety',
]

export function ChatSurveyPage() {
  const { token } = useParams<{ token: string }>()

  const { data, isLoading, error, refetch } = useChatSession(token || '')
  const sendMessage = useSendChatMessage(token || '')
  const confirmRating = useConfirmRating(token || '')
  const completeChat = useCompleteChat(token || '')

  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [pendingRating, setPendingRating] = useState<{
    dimension: FrictionType
    score: number
    reasoning: string | null
  } | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [data?.messages, scrollToBottom])

  // Focus input when ready
  useEffect(() => {
    if (!isTyping && data?.session.status !== 'completed') {
      inputRef.current?.focus()
    }
  }, [isTyping, data?.session.status])

  // Handle message submission
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return

    const content = inputValue.trim()
    setInputValue('')
    setIsTyping(true)

    try {
      const result = await sendMessage.mutateAsync({ content })

      // Check if we're entering rating confirmation phase
      if (result.pending_rating_confirmation) {
        setPendingRating(result.pending_rating_confirmation)
      }

      await refetch()
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setIsTyping(false)
    }
  }

  // Handle rating confirmation
  const handleConfirmRating = async (confirmed: boolean, adjustedScore?: number) => {
    if (!pendingRating) return

    setIsTyping(true)

    try {
      const result = await confirmRating.mutateAsync({
        dimension: pendingRating.dimension,
        confirmed,
        adjusted_score: adjustedScore,
      })

      if (result.all_confirmed) {
        // All ratings confirmed, complete the session
        setPendingRating(null)
        await completeChat.mutateAsync()
        await refetch()
      } else if (result.next_dimension) {
        // Show next rating for confirmation
        const nextRating = data?.extracted_ratings.find(
          (r) => r.dimension === result.next_dimension && !r.user_confirmed
        )
        if (nextRating) {
          setPendingRating({
            dimension: nextRating.dimension,
            score: nextRating.ai_inferred_score,
            reasoning: nextRating.ai_reasoning,
          })
        }
        await refetch()
      }
    } catch (err) {
      console.error('Failed to confirm rating:', err)
    } finally {
      setIsTyping(false)
    }
  }

  // Handle key press (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-pearson-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-pearson-blue border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-pearson-gray-600">Loading chat...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !data) {
    return (
      <div className="min-h-screen bg-pearson-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-pearson-gray-900 mb-2">Chat Session Not Found</h2>
          <p className="text-pearson-gray-600">
            This chat link may be invalid or expired. Please contact your team administrator for a new link.
          </p>
        </div>
      </div>
    )
  }

  const { session, messages } = data
  const isCompleted = session.status === 'completed'
  const isRatingPhase = session.status === 'rating_confirmation'

  // Calculate progress
  const coveredCount = Object.values(session.dimensions_covered).filter(Boolean).length
  const totalDimensions = DIMENSION_ORDER.length

  return (
    <div className="min-h-screen bg-pearson-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-pearson-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold text-pearson-gray-900">
              {isCompleted ? 'Chat Complete' : 'Work Experience Chat'}
            </h1>
            <span className="text-sm text-pearson-gray-500">
              {isCompleted ? 'Thank you!' : `${coveredCount}/${totalDimensions} topics`}
            </span>
          </div>

          {/* Dimension progress indicator */}
          <div className="flex gap-2 justify-center">
            {DIMENSION_ORDER.map((dim) => {
              const isCovered = session.dimensions_covered[dim]
              const isCurrent = session.current_dimension === dim

              return (
                <div
                  key={dim}
                  className={`w-8 h-2 rounded-full transition-all ${
                    isCovered
                      ? 'bg-pearson-green'
                      : isCurrent
                      ? 'bg-pearson-blue'
                      : 'bg-pearson-gray-200'
                  }`}
                  title={`${DIMENSION_LABELS[dim]}${isCovered ? ' (covered)' : ''}`}
                />
              )
            })}
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-pearson-blue flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                AI
              </div>
              <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-pearson-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-pearson-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-pearson-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {/* Rating confirmation UI */}
          {isRatingPhase && pendingRating && !isTyping && (
            <RatingConfirmationCard
              dimension={pendingRating.dimension}
              score={pendingRating.score}
              reasoning={pendingRating.reasoning}
              onConfirm={handleConfirmRating}
            />
          )}

          {/* Completion summary */}
          {isCompleted && data.extracted_ratings.length > 0 && (
            <CompletionSummary ratings={data.extracted_ratings} />
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input area */}
      {!isCompleted && !isRatingPhase && (
        <footer className="bg-white border-t border-pearson-gray-200 p-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isTyping}
                className="flex-1 px-4 py-3 border border-pearson-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-pearson-blue focus:border-transparent disabled:bg-pearson-gray-100"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
                className="px-6 py-3 bg-pearson-blue text-white rounded-full font-medium hover:bg-pearson-blue-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>
            <p className="text-xs text-pearson-gray-500 text-center mt-3">
              Your responses are anonymous and will be aggregated with others.
            </p>
          </div>
        </footer>
      )}
    </div>
  )
}

// Message bubble component
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 ${
          isUser ? 'bg-pearson-green' : 'bg-pearson-blue'
        }`}
      >
        {isUser ? 'You' : 'AI'}
      </div>

      {/* Message content */}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
          isUser
            ? 'bg-pearson-blue text-white rounded-tr-md'
            : 'bg-white rounded-tl-md'
        }`}
      >
        <p className={`text-sm leading-relaxed ${isUser ? 'text-white' : 'text-pearson-gray-800'}`}>
          {message.content}
        </p>

        {/* Dimension badge */}
        {message.dimension_context && !isUser && (
          <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-pearson-gray-100 text-pearson-gray-600 rounded-full">
            {DIMENSION_LABELS[message.dimension_context]}
          </span>
        )}
      </div>
    </div>
  )
}

// Rating confirmation card component
function RatingConfirmationCard({
  dimension,
  score,
  reasoning,
  onConfirm,
}: {
  dimension: FrictionType
  score: number
  reasoning: string | null
  onConfirm: (confirmed: boolean, adjustedScore?: number) => void
}) {
  const [selectedScore, setSelectedScore] = useState<number>(Math.round(score))
  const [isAdjusting, setIsAdjusting] = useState(false)

  const scoreLabels = ['Significant issues', 'Frequent friction', 'Moderate', 'Occasional', 'Smooth']

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-pearson-gray-200">
      <h3 className="text-lg font-semibold text-pearson-gray-900 mb-2">
        Confirm: {DIMENSION_LABELS[dimension]}
      </h3>

      {reasoning && (
        <p className="text-sm text-pearson-gray-600 mb-4">{reasoning}</p>
      )}

      <p className="text-sm text-pearson-gray-700 mb-4">
        Based on our conversation, I'd rate this around{' '}
        <span className="font-semibold">{Math.round(score)}/5</span>.
        Does that feel right?
      </p>

      {/* Rating buttons */}
      <div className="flex justify-between gap-2 mb-4">
        {[1, 2, 3, 4, 5].map((num) => (
          <button
            key={num}
            onClick={() => {
              setSelectedScore(num)
              if (num !== Math.round(score)) {
                setIsAdjusting(true)
              }
            }}
            className={`flex-1 py-3 rounded-lg font-medium text-sm transition-all ${
              selectedScore === num
                ? 'bg-pearson-blue text-white'
                : 'bg-pearson-gray-100 text-pearson-gray-700 hover:bg-pearson-gray-200'
            }`}
          >
            {num}
          </button>
        ))}
      </div>

      {/* Score labels */}
      <div className="flex justify-between text-xs text-pearson-gray-500 mb-6">
        <span>{scoreLabels[0]}</span>
        <span>{scoreLabels[4]}</span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        {isAdjusting || selectedScore !== Math.round(score) ? (
          <button
            onClick={() => onConfirm(false, selectedScore)}
            className="flex-1 py-3 bg-pearson-blue text-white rounded-lg font-medium hover:bg-pearson-blue-dark transition-colors"
          >
            Confirm as {selectedScore}/5
          </button>
        ) : (
          <>
            <button
              onClick={() => onConfirm(true)}
              className="flex-1 py-3 bg-pearson-green text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Yes, that's right
            </button>
            <button
              onClick={() => setIsAdjusting(true)}
              className="flex-1 py-3 bg-pearson-gray-200 text-pearson-gray-700 rounded-lg font-medium hover:bg-pearson-gray-300 transition-colors"
            >
              Adjust rating
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// Completion summary component
function CompletionSummary({ ratings }: { ratings: ChatExtractedRating[] }) {
  return (
    <div className="bg-gradient-to-br from-pearson-green to-green-600 rounded-xl p-6 text-white">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold">Thank you!</h3>
          <p className="text-sm text-white/80">Your feedback has been recorded</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {ratings.map((rating) => (
          <div key={rating.id} className="bg-white/10 rounded-lg p-3 text-center">
            <div className="text-xs text-white/70 mb-1">
              {DIMENSION_LABELS[rating.dimension]}
            </div>
            <div className="text-xl font-bold">
              {Math.round(rating.final_score / 20)}/5
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
