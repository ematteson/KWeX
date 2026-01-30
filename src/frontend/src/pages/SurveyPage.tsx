import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { useSurveyByToken, useSubmitSurvey, useSaveProgress } from '../api/hooks'
import { ProgressBar } from '../components/ProgressBar'
import { LikertScale } from '../components/LikertScale'
import { Button, Card, Badge, TextArea, Label, Spinner, Alert } from '../design-system/components'
import type { AnswerSubmission } from '../api/types'

// Auto-save interval (5 seconds)
const AUTO_SAVE_INTERVAL = 5000

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

const PageContainer = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
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

const HeaderTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingMD};
`

const SurveyTitle = styled.h1`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0;
`

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.v1.spacing.spacingMD};
`

const SaveStatusIndicator = styled.span<{ $variant?: 'saving' | 'saved' | 'error' }>`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.v1.spacing.spacingXS};

  color: ${({ theme, $variant }) => {
    switch ($variant) {
      case 'saving':
        return theme.v1.semanticColors.text.body.subtle;
      case 'saved':
        return theme.v1.semanticColors.text.feedback.success.vibrant;
      case 'error':
        return theme.v1.semanticColors.text.feedback.error.vibrant;
      default:
        return theme.v1.semanticColors.text.body.subtle;
    }
  }};
`

const TimeRemaining = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const ProgressInfo = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  margin-top: ${({ theme }) => theme.v1.spacing.spacingXS};
`

const ResumeNoticeContainer = styled.div`
  max-width: 672px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.v1.spacing.spacingLG};
  padding-bottom: 0;
`

const MainContent = styled.main`
  max-width: 672px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.v1.spacing.spacingLG};
  padding-top: ${({ theme }) => theme.v1.spacing.spacing3XL};
  padding-bottom: ${({ theme }) => theme.v1.spacing.spacing3XL};
`

const QuestionCard = styled(Card)`
  animation: ${fadeIn} 0.3s ease-out;
`

const DimensionBadge = styled(Badge)`
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingLG};
  text-transform: capitalize;
`

const QuestionText = styled.h2`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacing3XL} 0;
`

const SliderContainer = styled.div`
  width: 100%;
`

const SliderLabels = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingSM};
`

const SliderInput = styled.input`
  width: 100%;
  height: 12px;
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.neutral.dark};
  border-radius: ${({ theme }) => theme.v1.radius.radiusPill};
  appearance: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 24px;
    height: 24px;
    background-color: ${({ theme }) => theme.v1.semanticColors.fill.action.brand.default};
    border-radius: 50%;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: ${({ theme }) => theme.v1.semanticColors.fill.action.brand.hover};
    }
  }

  &::-moz-range-thumb {
    width: 24px;
    height: 24px;
    background-color: ${({ theme }) => theme.v1.semanticColors.fill.action.brand.default};
    border-radius: 50%;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: ${({ theme }) => theme.v1.semanticColors.fill.action.brand.hover};
    }
  }
`

const SliderValue = styled.div`
  text-align: center;
  margin-top: ${({ theme }) => theme.v1.spacing.spacingMD};
`

const SliderValueText = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleM};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.accent.primary};
`

const CommentSection = styled.div`
  margin-top: ${({ theme }) => theme.v1.spacing.spacing2XL};
`

const CommentLabel = styled(Label)`
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingSM};
`

const OptionalText = styled.span`
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  font-weight: ${({ theme }) => theme.v1.typography.weights.regular};
`

const CommentTextArea = styled(TextArea)`
  resize: none;
`

const NavigationContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: ${({ theme }) => theme.v1.spacing.spacing3XL};
  padding-top: ${({ theme }) => theme.v1.spacing.spacing2XL};
  border-top: 1px solid ${({ theme }) => theme.v1.semanticColors.border.divider.light};
`

const QuestionDots = styled.div`
  display: flex;
  justify-content: center;
  margin-top: ${({ theme }) => theme.v1.spacing.spacing2XL};
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
  flex-wrap: wrap;
`

const QuestionDot = styled.button<{ $isCurrent: boolean; $isAnswered: boolean }>`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  touch-action: manipulation;

  background-color: ${({ theme, $isCurrent, $isAnswered }) => {
    if ($isCurrent) {
      return theme.v1.semanticColors.fill.action.brand.default;
    }
    if ($isAnswered) {
      return theme.v1.semanticColors.fill.feedback.success.bold;
    }
    return theme.v1.semanticColors.fill.neutral.dark;
  }};

  ${({ theme, $isCurrent }) =>
    $isCurrent &&
    `
    box-shadow: 0 0 0 2px ${theme.v1.semanticColors.canvas.default},
                0 0 0 4px ${theme.v1.semanticColors.fill.action.brand.default};
  `}

  &:hover {
    background-color: ${({ theme, $isCurrent, $isAnswered }) => {
      if ($isCurrent) {
        return theme.v1.semanticColors.fill.action.brand.default;
      }
      if ($isAnswered) {
        return theme.v1.semanticColors.fill.feedback.success.bold;
      }
      return theme.v1.semanticColors.border.neutral.dark;
    }};
  }
`

const Footer = styled.footer`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  border-top: 1px solid ${({ theme }) => theme.v1.semanticColors.border.neutral.default};
  padding: ${({ theme }) => theme.v1.spacing.spacingMD} 0;
`

const FooterContent = styled.div`
  max-width: 672px;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.v1.spacing.spacingLG};
  text-align: center;
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const LoadingContainer = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
  display: flex;
  align-items: center;
  justify-content: center;
`

const LoadingContent = styled.div`
  text-align: center;
`

const LoadingSpinner = styled(Spinner)`
  margin: 0 auto ${({ theme }) => theme.v1.spacing.spacingLG};
`

const LoadingText = styled.p`
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  margin: 0;
`

const ErrorContainer = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const ErrorContent = styled.div`
  text-align: center;
  max-width: 448px;
`

const IconCircle = styled.div<{ $variant: 'success' | 'error' }>`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto ${({ theme }) => theme.v1.spacing.spacingLG};

  background-color: ${({ theme, $variant }) =>
    $variant === 'success'
      ? theme.v1.semanticColors.fill.feedback.success.subtle
      : theme.v1.semanticColors.fill.feedback.error.subtle};
`

const CheckIcon = styled.svg`
  width: 32px;
  height: 32px;
  color: ${({ theme }) => theme.v1.semanticColors.icon.feedback.success.vibrant};
`

const WarningIcon = styled.svg`
  width: 32px;
  height: 32px;
  color: ${({ theme }) => theme.v1.semanticColors.icon.feedback.error.vibrant};
`

const ErrorTitle = styled.h2`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingSM} 0;
`

const ErrorMessage = styled.p`
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  margin: 0;
`

const SmallSpinner = styled.svg`
  width: 12px;
  height: 12px;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`

const SmallCheckIcon = styled.svg`
  width: 12px;
  height: 12px;
`

// =============================================================================
// COMPONENT
// =============================================================================

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

    const existing = answers.get(currentQuestion.id)
    const answerSubmission: AnswerSubmission = {
      question_id: currentQuestion.id,
      value: String(value),
      numeric_value: value,
      comment: existing?.comment || null,
    }

    setAnswers((prev) => new Map(prev).set(currentQuestion.id, answerSubmission))
    setHasUnsavedChanges(true)
  }

  // Handle comment change
  const handleCommentChange = (comment: string) => {
    if (!currentQuestion) return

    const existing = answers.get(currentQuestion.id)
    if (!existing) return // Need an answer first

    const answerSubmission: AnswerSubmission = {
      ...existing,
      comment: comment || null,
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
      <LoadingContainer>
        <LoadingContent>
          <LoadingSpinner $size="lg" />
          <LoadingText>Loading survey...</LoadingText>
        </LoadingContent>
      </LoadingContainer>
    )
  }

  // Error state
  if (error || !data) {
    const errorMessage = (error as any)?.response?.data?.detail || 'Unknown error'
    const isAlreadySubmitted = errorMessage.includes('already submitted')

    if (isAlreadySubmitted) {
      return (
        <ErrorContainer>
          <ErrorContent>
            <IconCircle $variant="success">
              <CheckIcon fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </CheckIcon>
            </IconCircle>
            <ErrorTitle>Survey Already Completed</ErrorTitle>
            <ErrorMessage>
              You have already submitted your response for this survey. Thank you for your participation!
            </ErrorMessage>
          </ErrorContent>
        </ErrorContainer>
      )
    }

    return (
      <ErrorContainer>
        <ErrorContent>
          <IconCircle $variant="error">
            <WarningIcon fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </WarningIcon>
          </IconCircle>
          <ErrorTitle>Survey Not Found</ErrorTitle>
          <ErrorMessage>
            This survey link may be invalid or expired. Please contact your team administrator for a new link.
          </ErrorMessage>
        </ErrorContent>
      </ErrorContainer>
    )
  }

  // Calculate estimated time remaining
  const estimatedTimePerQuestion = (data.estimated_completion_minutes * 60) / totalQuestions
  const remainingQuestions = totalQuestions - currentQuestionIndex
  const estimatedTimeRemaining = Math.ceil((remainingQuestions * estimatedTimePerQuestion) / 60)

  // Count answered questions
  const answeredCount = answers.size

  return (
    <PageContainer>
      {/* Header */}
      <Header>
        <HeaderContent>
          <HeaderTopRow>
            <SurveyTitle>{data.survey_name}</SurveyTitle>
            <HeaderActions>
              {/* Save status indicator */}
              {saveStatus === 'saving' && (
                <SaveStatusIndicator $variant="saving">
                  <SmallSpinner fill="none" viewBox="0 0 24 24">
                    <circle opacity={0.25} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path opacity={0.75} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </SmallSpinner>
                  Saving...
                </SaveStatusIndicator>
              )}
              {saveStatus === 'saved' && (
                <SaveStatusIndicator $variant="saved">
                  <SmallCheckIcon fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </SmallCheckIcon>
                  Saved
                </SaveStatusIndicator>
              )}
              {saveStatus === 'error' && (
                <SaveStatusIndicator $variant="error">Save failed</SaveStatusIndicator>
              )}
              <TimeRemaining>~{estimatedTimeRemaining} min remaining</TimeRemaining>
            </HeaderActions>
          </HeaderTopRow>
          <ProgressBar current={progress} total={totalQuestions} />
          <ProgressInfo>
            <span>{answeredCount} of {totalQuestions} answered</span>
            {lastSaved && (
              <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
            )}
          </ProgressInfo>
        </HeaderContent>
      </Header>

      {/* Resume notice */}
      {initializedRef.current && answeredCount > 0 && currentQuestionIndex > 0 && (
        <ResumeNoticeContainer>
          <Alert $variant="info">
            <strong>Welcome back!</strong> Your previous progress has been restored. You can continue from where you left off.
          </Alert>
        </ResumeNoticeContainer>
      )}

      {/* Question */}
      <MainContent>
        {currentQuestion && (
          <QuestionCard $variant="default" $padding="lg">
            {/* Dimension badge */}
            <DimensionBadge $variant="default" $size="sm">
              {currentQuestion.dimension.replace('_', ' ')}
            </DimensionBadge>

            {/* Question text */}
            <QuestionText>{currentQuestion.text}</QuestionText>

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
              <SliderContainer>
                <SliderLabels>
                  <span>{currentQuestion.options?.low_label || '0%'}</span>
                  <span>{currentQuestion.options?.high_label || '100%'}</span>
                </SliderLabels>
                <SliderInput
                  type="range"
                  min="0"
                  max="100"
                  value={currentAnswer?.numeric_value ?? 50}
                  onChange={(e) => handleAnswer(parseInt(e.target.value, 10))}
                />
                <SliderValue>
                  <SliderValueText>{currentAnswer?.numeric_value ?? 50}%</SliderValueText>
                </SliderValue>
              </SliderContainer>
            )}

            {/* Optional comment field */}
            {currentAnswer && (
              <CommentSection>
                <CommentLabel htmlFor="comment">
                  Add a comment <OptionalText>(optional)</OptionalText>
                </CommentLabel>
                <CommentTextArea
                  id="comment"
                  rows={2}
                  value={currentAnswer.comment || ''}
                  onChange={(e) => handleCommentChange(e.target.value)}
                  placeholder="Share any additional context or thoughts..."
                  $fullWidth
                />
              </CommentSection>
            )}

            {/* Navigation */}
            <NavigationContainer>
              <Button
                $variant="secondary"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
              >
                Previous
              </Button>

              {currentQuestionIndex < totalQuestions - 1 ? (
                <Button
                  $variant="primary"
                  onClick={handleNext}
                  disabled={!canProceed}
                >
                  Next
                </Button>
              ) : (
                <Button
                  $variant="primary"
                  onClick={handleSubmit}
                  disabled={!canProceed || submitSurvey.isPending}
                >
                  {submitSurvey.isPending ? 'Submitting...' : 'Submit Survey'}
                </Button>
              )}
            </NavigationContainer>
          </QuestionCard>
        )}

        {/* Question navigation dots */}
        <QuestionDots>
          {sortedQuestions.map((q, index) => {
            const isAnswered = answers.has(q.id)
            const isCurrent = index === currentQuestionIndex

            return (
              <QuestionDot
                key={q.id}
                onClick={() => setCurrentQuestionIndex(index)}
                $isCurrent={isCurrent}
                $isAnswered={isAnswered}
                title={`Question ${index + 1}${isAnswered ? ' (answered)' : ''}`}
                aria-label={`Go to question ${index + 1}${isAnswered ? ' (answered)' : ''}`}
              />
            )
          })}
        </QuestionDots>
      </MainContent>

      {/* Footer */}
      <Footer>
        <FooterContent>
          Your responses are anonymous and will be aggregated with at least 6 others before being visible.
          {hasUnsavedChanges && ' - Progress auto-saves every few seconds.'}
        </FooterContent>
      </Footer>
    </PageContainer>
  )
}
