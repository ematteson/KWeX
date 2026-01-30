import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
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
import { Card, Button, Spinner } from '../design-system'

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

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const PageContainer = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
  display: flex;
  flex-direction: column;
`

const Header = styled.header`
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  border-bottom: 1px solid ${({ theme }) => theme.v1.semanticColors.border.neutral.default};
  position: sticky;
  top: 0;
  z-index: 10;
`

const HeaderContent = styled.div`
  max-width: 672px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingMD};
`

const HeaderTitle = styled.h1`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0;
`

const HeaderStatus = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const ProgressContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
  justify-content: center;
`

interface ProgressDotProps {
  $isCovered: boolean
  $isCurrent: boolean
}

const ProgressDot = styled.div<ProgressDotProps>`
  width: 32px;
  height: 8px;
  border-radius: ${({ theme }) => theme.v1.radius.radiusPill};
  transition: background-color 0.2s ease;
  background-color: ${({ theme, $isCovered, $isCurrent }) =>
    $isCovered
      ? theme.v1.semanticColors.fill.feedback.success.bold
      : $isCurrent
      ? theme.v1.semanticColors.fill.action.brand.default
      : theme.v1.semanticColors.fill.neutral.dark};
`

const MainContent = styled.main`
  flex: 1;
  overflow-y: auto;
  padding: ${({ theme }) => theme.v1.spacing.spacing2XL} ${({ theme }) => theme.v1.spacing.spacingLG};
`

const MessagesContainer = styled.div`
  max-width: 672px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const Footer = styled.footer`
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  border-top: 1px solid ${({ theme }) => theme.v1.semanticColors.border.neutral.default};
  padding: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const FooterContent = styled.div`
  max-width: 672px;
  margin: 0 auto;
`

const InputContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.v1.spacing.spacingMD};
`

const ChatInput = styled.input`
  flex: 1;
  padding: ${({ theme }) => theme.v1.spacing.spacingMD} ${({ theme }) => theme.v1.spacing.spacingLG};
  border: 1px solid ${({ theme }) => theme.v1.semanticColors.border.neutral.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusPill};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.bold};
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &::placeholder {
    color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.v1.semanticColors.border.inputs.typing};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.v1.semanticColors.fill.highlight.brand.default};
  }

  &:disabled {
    background-color: ${({ theme }) => theme.v1.semanticColors.fill.neutral.light};
    cursor: not-allowed;
  }
`

const SendButton = styled(Button)`
  border-radius: ${({ theme }) => theme.v1.radius.radiusPill};
  padding: ${({ theme }) => theme.v1.spacing.spacingMD} ${({ theme }) => theme.v1.spacing.spacing2XL};
`

const FooterText = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  text-align: center;
  margin-top: ${({ theme }) => theme.v1.spacing.spacingMD};
`

// Loading and Error states
const CenteredContainer = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const LoadingContent = styled.div`
  text-align: center;
`

const LoadingText = styled.p`
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  margin-top: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const ErrorContent = styled.div`
  text-align: center;
  max-width: 448px;
`

const ErrorIconContainer = styled.div`
  width: 64px;
  height: 64px;
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.feedback.error.subtle};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto ${({ theme }) => theme.v1.spacing.spacingLG};
`

const ErrorIcon = styled.svg`
  width: 32px;
  height: 32px;
  color: ${({ theme }) => theme.v1.semanticColors.icon.feedback.error.vibrant};
`

const ErrorTitle = styled.h2`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingSM};
`

const ErrorDescription = styled.p`
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  margin: 0;
`

// Message Bubble Components
interface MessageContainerProps {
  $isUser: boolean
}

const MessageContainer = styled.div<MessageContainerProps>`
  display: flex;
  gap: ${({ theme }) => theme.v1.spacing.spacingMD};
  flex-direction: ${({ $isUser }) => ($isUser ? 'row-reverse' : 'row')};
`

interface AvatarProps {
  $isUser: boolean
}

const Avatar = styled.div<AvatarProps>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.v1.semanticColors.text.inverse};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  flex-shrink: 0;
  background-color: ${({ theme, $isUser }) =>
    $isUser
      ? theme.v1.semanticColors.fill.feedback.success.bold
      : theme.v1.semanticColors.fill.action.brand.default};
`

interface MessageBubbleContainerProps {
  $isUser: boolean
}

const MessageBubbleContainer = styled.div<MessageBubbleContainerProps>`
  max-width: 75%;
  border-radius: ${({ theme }) => theme.v1.radius.radius2XL};
  padding: ${({ theme }) => theme.v1.spacing.spacingMD} ${({ theme }) => theme.v1.spacing.spacingLG};
  box-shadow: ${({ theme }) => theme.v1.shadows.xs};

  ${({ theme, $isUser }) =>
    $isUser
      ? `
        background-color: ${theme.v1.semanticColors.fill.action.brand.default};
        color: ${theme.v1.semanticColors.text.inverse};
        border-top-right-radius: ${theme.v1.radius.radiusMD};
      `
      : `
        background-color: ${theme.v1.semanticColors.canvas.default};
        border-top-left-radius: ${theme.v1.radius.radiusMD};
      `}
`

interface MessageTextProps {
  $isUser: boolean
}

const MessageText = styled.p<MessageTextProps>`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  line-height: 1.6;
  margin: 0;
  color: ${({ theme, $isUser }) =>
    $isUser ? theme.v1.semanticColors.text.inverse : theme.v1.semanticColors.text.body.bold};
`

const DimensionBadge = styled.span`
  display: inline-block;
  margin-top: ${({ theme }) => theme.v1.spacing.spacingSM};
  padding: ${({ theme }) => theme.v1.spacing.spacingXXS} ${({ theme }) => theme.v1.spacing.spacingSM};
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.neutral.light};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusPill};
`

// Typing Indicator
const bounce = keyframes`
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-4px);
  }
`

const TypingContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.v1.spacing.spacingMD};
`

const TypingBubble = styled.div`
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  border-radius: ${({ theme }) => theme.v1.radius.radius2XL};
  border-top-left-radius: ${({ theme }) => theme.v1.radius.radiusMD};
  padding: ${({ theme }) => theme.v1.spacing.spacingMD} ${({ theme }) => theme.v1.spacing.spacingLG};
  box-shadow: ${({ theme }) => theme.v1.shadows.xs};
`

const TypingDots = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.v1.spacing.spacingXS};
`

interface TypingDotProps {
  $delay: number
}

const TypingDot = styled.span<TypingDotProps>`
  width: 8px;
  height: 8px;
  background-color: ${({ theme }) => theme.v1.semanticColors.border.neutral.dark};
  border-radius: 50%;
  animation: ${bounce} 1.2s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay}ms;
`

// Rating Confirmation Card
const RatingCard = styled(Card)`
  border: 1px solid ${({ theme }) => theme.v1.semanticColors.border.neutral.default};
`

const RatingTitle = styled.h3`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingSM};
`

const RatingReasoning = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingLG};
`

const RatingPrompt = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.bold};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingLG};
`

const RatingPromptScore = styled.span`
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
`

const RatingButtonsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingLG};
`

interface RatingButtonProps {
  $isSelected: boolean
}

const RatingButton = styled.button<RatingButtonProps>`
  flex: 1;
  padding: ${({ theme }) => theme.v1.spacing.spacingMD};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;

  ${({ theme, $isSelected }) =>
    $isSelected
      ? `
        background-color: ${theme.v1.semanticColors.fill.action.brand.default};
        color: ${theme.v1.semanticColors.text.inverse};
      `
      : `
        background-color: ${theme.v1.semanticColors.fill.neutral.light};
        color: ${theme.v1.semanticColors.text.body.bold};

        &:hover {
          background-color: ${theme.v1.semanticColors.fill.neutral.dark};
        }
      `}
`

const ScoreLabelsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacing2XL};
`

const ScoreLabel = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const ActionButtonsContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.v1.spacing.spacingMD};
`

const ConfirmButton = styled(Button)`
  flex: 1;
`

const AdjustButton = styled(Button)`
  flex: 1;
`

// Completion Summary
const CompletionCard = styled.div`
  background: linear-gradient(135deg, ${({ theme }) => theme.v1.semanticColors.fill.feedback.success.bold}, ${({ theme }) => theme.v1.colors.status.green[700]});
  border-radius: ${({ theme }) => theme.v1.radius.radiusXL};
  padding: ${({ theme }) => theme.v1.spacing.spacing2XL};
  color: ${({ theme }) => theme.v1.semanticColors.text.inverse};
`

const CompletionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.v1.spacing.spacingMD};
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const CompletionIconContainer = styled.div`
  width: 40px;
  height: 40px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
`

const CompletionIcon = styled.svg`
  width: 24px;
  height: 24px;
`

const CompletionTitle = styled.h3`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  margin: 0;
`

const CompletionSubtitle = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  opacity: 0.8;
  margin: 0;
`

const RatingsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.v1.spacing.spacingMD};
`

const RatingItem = styled.div`
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  padding: ${({ theme }) => theme.v1.spacing.spacingMD};
  text-align: center;
`

const RatingItemLabel = styled.div`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  opacity: 0.7;
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingXS};
`

const RatingItemScore = styled.div`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.bold};
`

// =============================================================================
// MAIN COMPONENT
// =============================================================================

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
      <CenteredContainer>
        <LoadingContent>
          <Spinner $size="lg" />
          <LoadingText>Loading chat...</LoadingText>
        </LoadingContent>
      </CenteredContainer>
    )
  }

  // Error state
  if (error || !data) {
    return (
      <CenteredContainer>
        <ErrorContent>
          <ErrorIconContainer>
            <ErrorIcon fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </ErrorIcon>
          </ErrorIconContainer>
          <ErrorTitle>Chat Session Not Found</ErrorTitle>
          <ErrorDescription>
            This chat link may be invalid or expired. Please contact your team administrator for a new link.
          </ErrorDescription>
        </ErrorContent>
      </CenteredContainer>
    )
  }

  const { session, messages } = data
  const isCompleted = session.status === 'completed'
  const isRatingPhase = session.status === 'rating_confirmation'

  // Calculate progress
  const coveredCount = Object.values(session.dimensions_covered).filter(Boolean).length
  const totalDimensions = DIMENSION_ORDER.length

  return (
    <PageContainer>
      {/* Header */}
      <Header>
        <HeaderContent>
          <HeaderRow>
            <HeaderTitle>
              {isCompleted ? 'Chat Complete' : 'Work Experience Chat'}
            </HeaderTitle>
            <HeaderStatus>
              {isCompleted ? 'Thank you!' : `${coveredCount}/${totalDimensions} topics`}
            </HeaderStatus>
          </HeaderRow>

          {/* Dimension progress indicator */}
          <ProgressContainer>
            {DIMENSION_ORDER.map((dim) => {
              const isCovered = session.dimensions_covered[dim]
              const isCurrent = session.current_dimension === dim

              return (
                <ProgressDot
                  key={dim}
                  $isCovered={isCovered}
                  $isCurrent={isCurrent}
                  title={`${DIMENSION_LABELS[dim]}${isCovered ? ' (covered)' : ''}`}
                />
              )
            })}
          </ProgressContainer>
        </HeaderContent>
      </Header>

      {/* Messages */}
      <MainContent>
        <MessagesContainer>
          {messages.map((message) => (
            <MessageBubbleComponent key={message.id} message={message} />
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <TypingContainer>
              <Avatar $isUser={false}>AI</Avatar>
              <TypingBubble>
                <TypingDots>
                  <TypingDot $delay={0} />
                  <TypingDot $delay={150} />
                  <TypingDot $delay={300} />
                </TypingDots>
              </TypingBubble>
            </TypingContainer>
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
        </MessagesContainer>
      </MainContent>

      {/* Input area */}
      {!isCompleted && !isRatingPhase && (
        <Footer>
          <FooterContent>
            <InputContainer>
              <ChatInput
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isTyping}
              />
              <SendButton
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
              >
                Send
              </SendButton>
            </InputContainer>
            <FooterText>
              Your responses are anonymous and will be aggregated with others.
            </FooterText>
          </FooterContent>
        </Footer>
      )}
    </PageContainer>
  )
}

// =============================================================================
// MESSAGE BUBBLE COMPONENT
// =============================================================================

function MessageBubbleComponent({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <MessageContainer $isUser={isUser}>
      {/* Avatar */}
      <Avatar $isUser={isUser}>
        {isUser ? 'You' : 'AI'}
      </Avatar>

      {/* Message content */}
      <MessageBubbleContainer $isUser={isUser}>
        <MessageText $isUser={isUser}>
          {message.content}
        </MessageText>

        {/* Dimension badge */}
        {message.dimension_context && !isUser && (
          <DimensionBadge>
            {DIMENSION_LABELS[message.dimension_context]}
          </DimensionBadge>
        )}
      </MessageBubbleContainer>
    </MessageContainer>
  )
}

// =============================================================================
// RATING CONFIRMATION CARD COMPONENT
// =============================================================================

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
    <RatingCard $variant="elevated" $padding="lg">
      <RatingTitle>
        Confirm: {DIMENSION_LABELS[dimension]}
      </RatingTitle>

      {reasoning && (
        <RatingReasoning>{reasoning}</RatingReasoning>
      )}

      <RatingPrompt>
        Based on our conversation, I'd rate this around{' '}
        <RatingPromptScore>{Math.round(score)}/5</RatingPromptScore>.
        Does that feel right?
      </RatingPrompt>

      {/* Rating buttons */}
      <RatingButtonsContainer>
        {[1, 2, 3, 4, 5].map((num) => (
          <RatingButton
            key={num}
            $isSelected={selectedScore === num}
            onClick={() => {
              setSelectedScore(num)
              if (num !== Math.round(score)) {
                setIsAdjusting(true)
              }
            }}
          >
            {num}
          </RatingButton>
        ))}
      </RatingButtonsContainer>

      {/* Score labels */}
      <ScoreLabelsContainer>
        <ScoreLabel>{scoreLabels[0]}</ScoreLabel>
        <ScoreLabel>{scoreLabels[4]}</ScoreLabel>
      </ScoreLabelsContainer>

      {/* Action buttons */}
      <ActionButtonsContainer>
        {isAdjusting || selectedScore !== Math.round(score) ? (
          <ConfirmButton
            $fullWidth
            onClick={() => onConfirm(false, selectedScore)}
          >
            Confirm as {selectedScore}/5
          </ConfirmButton>
        ) : (
          <>
            <ConfirmButton
              onClick={() => onConfirm(true)}
            >
              Yes, that's right
            </ConfirmButton>
            <AdjustButton
              $variant="secondary"
              onClick={() => setIsAdjusting(true)}
            >
              Adjust rating
            </AdjustButton>
          </>
        )}
      </ActionButtonsContainer>
    </RatingCard>
  )
}

// =============================================================================
// COMPLETION SUMMARY COMPONENT
// =============================================================================

function CompletionSummary({ ratings }: { ratings: ChatExtractedRating[] }) {
  return (
    <CompletionCard>
      <CompletionHeader>
        <CompletionIconContainer>
          <CompletionIcon fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </CompletionIcon>
        </CompletionIconContainer>
        <div>
          <CompletionTitle>Thank you!</CompletionTitle>
          <CompletionSubtitle>Your feedback has been recorded</CompletionSubtitle>
        </div>
      </CompletionHeader>

      <RatingsGrid>
        {ratings.map((rating) => (
          <RatingItem key={rating.id}>
            <RatingItemLabel>
              {DIMENSION_LABELS[rating.dimension]}
            </RatingItemLabel>
            <RatingItemScore>
              {Math.round(rating.final_score / 20)}/5
            </RatingItemScore>
          </RatingItem>
        ))}
      </RatingsGrid>
    </CompletionCard>
  )
}
