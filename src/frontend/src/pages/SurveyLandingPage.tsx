import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { useSurveyByToken } from '../api/hooks'
import { apiClient } from '../api/client'
import { Spinner, Text, Heading, Flex, Alert } from '../design-system/components'

type SurveyMode = 'traditional' | 'chat'

// =============================================================================
// KEYFRAME ANIMATIONS
// =============================================================================

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const PageContainer = styled.div<{ $variant?: 'default' | 'success' | 'error' }>`
  min-height: 100vh;
  background: ${({ theme, $variant }) => {
    const colors = theme.v1.semanticColors
    switch ($variant) {
      case 'success':
        return `linear-gradient(135deg, ${colors.canvas.highlight.light} 0%, ${colors.fill.feedback.success.subtle} 100%)`
      case 'error':
        return `linear-gradient(135deg, ${colors.canvas.highlight.light} 0%, ${colors.fill.feedback.error.subtle} 100%)`
      default:
        return `linear-gradient(135deg, ${colors.canvas.highlight.light} 0%, ${colors.fill.feedback.info.subtle} 50%, ${colors.fill.highlight.brand.default} 100%)`
    }
  }};
`

const CenteredContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const LoadingWrapper = styled.div`
  text-align: center;
`

const StatusIconWrapper = styled.div<{ $variant: 'success' | 'error' }>`
  width: 5rem;
  height: 5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto ${({ theme }) => theme.v1.spacing.spacing2XL};
  background-color: ${({ theme, $variant }) =>
    $variant === 'success'
      ? theme.v1.semanticColors.fill.feedback.success.subtle
      : theme.v1.semanticColors.fill.feedback.error.subtle};
`

const StatusIcon = styled.svg<{ $variant: 'success' | 'error' }>`
  width: 2.5rem;
  height: 2.5rem;
  color: ${({ theme, $variant }) =>
    $variant === 'success'
      ? theme.v1.semanticColors.fill.feedback.success.bold
      : theme.v1.semanticColors.fill.feedback.error.bold};
`

const StatusContent = styled.div`
  text-align: center;
  max-width: 28rem;
`

const Header = styled.header`
  padding: ${({ theme }) => `${theme.v1.spacing.spacing3XL} ${theme.v1.spacing.spacingLG} ${theme.v1.spacing.spacingLG}`};
`

const HeaderContent = styled.div`
  max-width: 42rem;
  margin: 0 auto;
  text-align: center;
`

const ConfidentialBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
  padding: ${({ theme }) => `${theme.v1.spacing.spacingSM} ${theme.v1.spacing.spacingLG}`};
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);
  border-radius: ${({ theme }) => theme.v1.radius.radiusPill};
  box-shadow: ${({ theme }) => theme.v1.shadows.xs};
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacing2XL};
`

const PulseDot = styled.div`
  width: 0.5rem;
  height: 0.5rem;
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.feedback.success.bold};
  border-radius: 50%;
  animation: ${pulse} 2s ease-in-out infinite;
`

const PageTitle = styled(Heading)`
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingMD};
`

const PageSubtitle = styled(Text)`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyL};
`

const Main = styled.main`
  padding: ${({ theme }) => `${theme.v1.spacing.spacing3XL} ${theme.v1.spacing.spacingLG}`};
`

const MainContent = styled.div`
  max-width: 48rem;
  margin: 0 auto;
`

const SectionTitle = styled(Text)`
  text-align: center;
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacing3XL};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
`

const ErrorAlert = styled(Alert)`
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacing2XL};
  text-align: center;
  justify-content: center;
`

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.v1.spacing.spacing2XL};

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`

const OptionCard = styled.button<{ $isSelected: boolean; $isDisabled: boolean; $accentColor: 'brand' | 'success' }>`
  position: relative;
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  border-radius: ${({ theme }) => theme.v1.radius.radius2XL};
  padding: ${({ theme }) => theme.v1.spacing.spacing3XL};
  box-shadow: ${({ theme }) => theme.v1.shadows.md};
  text-align: left;
  border: 2px solid ${({ theme, $isSelected, $accentColor }) =>
    $isSelected
      ? $accentColor === 'brand'
        ? theme.v1.semanticColors.border.brand.default
        : theme.v1.semanticColors.fill.feedback.success.bold
      : 'transparent'};
  transition: all 0.3s ease;
  cursor: ${({ $isDisabled }) => ($isDisabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $isDisabled }) => ($isDisabled ? 0.5 : 1)};

  &:hover:not(:disabled) {
    box-shadow: ${({ theme }) => theme.v1.shadows.lg};
    border-color: ${({ theme, $isSelected }) =>
      $isSelected ? undefined : theme.v1.semanticColors.border.neutral.default};
  }

  ${({ $isSelected, $accentColor, theme }) =>
    $isSelected &&
    `
    box-shadow: 0 0 0 4px ${
      $accentColor === 'brand'
        ? theme.v1.colors.primary[10]
        : theme.v1.semanticColors.fill.feedback.success.subtle
    };
  `}
`

const NewBadge = styled.div`
  position: absolute;
  top: -0.75rem;
  right: -0.75rem;
  padding: ${({ theme }) => `${theme.v1.spacing.spacingXS} ${theme.v1.spacing.spacingMD}`};
  background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
  color: ${({ theme }) => theme.v1.semanticColors.text.inverse};
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  font-weight: ${({ theme }) => theme.v1.typography.weights.bold};
  border-radius: ${({ theme }) => theme.v1.radius.radiusPill};
  box-shadow: ${({ theme }) => theme.v1.shadows.md};
`

const IconWrapper = styled.div<{ $color: 'brand' | 'success' }>`
  width: 4rem;
  height: 4rem;
  background: ${({ theme, $color }) =>
    $color === 'brand'
      ? `linear-gradient(135deg, ${theme.v1.semanticColors.fill.action.brand.default} 0%, ${theme.v1.semanticColors.fill.action.brand.hover} 100%)`
      : `linear-gradient(135deg, ${theme.v1.semanticColors.fill.feedback.success.bold} 0%, #059669 100%)`};
  border-radius: ${({ theme }) => theme.v1.radius.radius2XL};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacing2XL};
  transition: transform 0.3s ease;

  ${OptionCard}:hover & {
    transform: scale(1.1);
  }
`

const IconSvg = styled.svg`
  width: 2rem;
  height: 2rem;
  color: ${({ theme }) => theme.v1.semanticColors.text.inverse};
`

const CardTitle = styled(Heading)`
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingSM};
`

const CardDescription = styled(Text)`
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacing2XL};
`

const MetaInfo = styled(Flex)`
  gap: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const MetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.v1.spacing.spacingXS};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const MetaIcon = styled.svg`
  width: 1rem;
  height: 1rem;
`

const LoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: ${({ theme }) => theme.v1.radius.radius2XL};
  display: flex;
  align-items: center;
  justify-content: center;
`

const HoverArrow = styled.div<{ $color: 'brand' | 'success' }>`
  position: absolute;
  top: ${({ theme }) => theme.v1.spacing.spacing3XL};
  right: ${({ theme }) => theme.v1.spacing.spacing3XL};
  opacity: 0;
  transition: opacity 0.3s ease;
  color: ${({ theme, $color }) =>
    $color === 'brand'
      ? theme.v1.semanticColors.fill.action.brand.default
      : theme.v1.semanticColors.fill.feedback.success.bold};

  ${OptionCard}:hover & {
    opacity: 1;
  }
`

const ArrowIcon = styled.svg`
  width: 1.5rem;
  height: 1.5rem;
`

const InfoSection = styled.div`
  margin-top: ${({ theme }) => theme.v1.spacing.spacing5XL};
  text-align: center;
`

const InfoItems = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.v1.spacing.spacing2XL};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const InfoItem = styled.span`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
`

const InfoIcon = styled.svg<{ $color: 'success' | 'brand' | 'warning' }>`
  width: 1.25rem;
  height: 1.25rem;
  color: ${({ theme, $color }) => {
    switch ($color) {
      case 'success':
        return theme.v1.semanticColors.fill.feedback.success.bold
      case 'brand':
        return theme.v1.semanticColors.fill.action.brand.default
      case 'warning':
        return theme.v1.semanticColors.fill.feedback.warning.bold
    }
  }};
`

const Footer = styled.footer`
  padding: ${({ theme }) => `${theme.v1.spacing.spacing3XL} ${theme.v1.spacing.spacingLG}`};
`

const FooterText = styled(Text)`
  text-align: center;
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const SpinnerWrapper = styled.div`
  margin: 0 auto ${({ theme }) => theme.v1.spacing.spacingLG};
`

// =============================================================================
// COMPONENT
// =============================================================================

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
      <PageContainer>
        <CenteredContainer>
          <LoadingWrapper>
            <SpinnerWrapper>
              <Spinner $size="lg" />
            </SpinnerWrapper>
            <Text $color="subtle">Loading survey...</Text>
          </LoadingWrapper>
        </CenteredContainer>
      </PageContainer>
    )
  }

  // Error state - check for already submitted
  if (error || !data) {
    const errorMessage = (error as any)?.response?.data?.detail || 'Unknown error'
    const isAlreadySubmitted = errorMessage.includes('already submitted')

    if (isAlreadySubmitted) {
      return (
        <PageContainer $variant="success">
          <CenteredContainer>
            <StatusContent>
              <StatusIconWrapper $variant="success">
                <StatusIcon $variant="success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </StatusIcon>
              </StatusIconWrapper>
              <Heading $level={2}>Already Completed</Heading>
              <Text $color="subtle" style={{ marginTop: '0.75rem' }}>
                You have already submitted your response for this survey. Thank you for your participation!
              </Text>
            </StatusContent>
          </CenteredContainer>
        </PageContainer>
      )
    }

    return (
      <PageContainer $variant="error">
        <CenteredContainer>
          <StatusContent>
            <StatusIconWrapper $variant="error">
              <StatusIcon $variant="error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </StatusIcon>
            </StatusIconWrapper>
            <Heading $level={2}>Survey Not Found</Heading>
            <Text $color="subtle" style={{ marginTop: '0.75rem' }}>
              This survey link may be invalid or expired. Please contact your team administrator for a new link.
            </Text>
          </StatusContent>
        </CenteredContainer>
      </PageContainer>
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
    <PageContainer>
      {/* Header */}
      <Header>
        <HeaderContent>
          <ConfidentialBadge>
            <PulseDot />
            <Text $variant="bodySmall" $color="subtle">Anonymous & Confidential</Text>
          </ConfidentialBadge>
          <PageTitle $level={1}>{data.survey_name}</PageTitle>
          <PageSubtitle $color="subtle">
            Share your work experience to help improve team effectiveness
          </PageSubtitle>
        </HeaderContent>
      </Header>

      {/* Mode Selection */}
      <Main>
        <MainContent>
          <SectionTitle $color="default">
            Choose how you'd like to share your feedback
          </SectionTitle>

          {startError && (
            <ErrorAlert $variant="error">
              {startError}
            </ErrorAlert>
          )}

          <CardGrid>
            {/* Traditional Survey Option */}
            <OptionCard
              onClick={() => handleStartSurvey('traditional')}
              disabled={isStarting}
              $isSelected={selectedMode === 'traditional'}
              $isDisabled={isStarting && selectedMode !== 'traditional'}
              $accentColor="brand"
            >
              {/* Icon */}
              <IconWrapper $color="brand">
                <IconSvg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </IconSvg>
              </IconWrapper>

              <CardTitle $level={3}>Quick Survey</CardTitle>

              <CardDescription $color="subtle">
                Answer structured questions at your own pace. Navigate back and forth,
                save progress automatically.
              </CardDescription>

              <MetaInfo>
                <MetaItem>
                  <MetaIcon fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </MetaIcon>
                  ~{data.estimated_completion_minutes} minutes
                </MetaItem>
                <MetaItem>
                  <MetaIcon fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </MetaIcon>
                  {data.questions.length} questions
                </MetaItem>
              </MetaInfo>

              {/* Loading state */}
              {isStarting && selectedMode === 'traditional' && (
                <LoadingOverlay>
                  <Spinner $size="md" />
                </LoadingOverlay>
              )}

              {/* Hover arrow */}
              <HoverArrow $color="brand">
                <ArrowIcon fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </ArrowIcon>
              </HoverArrow>
            </OptionCard>

            {/* Chat Survey Option */}
            <OptionCard
              onClick={() => handleStartSurvey('chat')}
              disabled={isStarting}
              $isSelected={selectedMode === 'chat'}
              $isDisabled={isStarting && selectedMode !== 'chat'}
              $accentColor="success"
            >
              {/* Badge */}
              <NewBadge>NEW</NewBadge>

              {/* Icon */}
              <IconWrapper $color="success">
                <IconSvg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </IconSvg>
              </IconWrapper>

              <CardTitle $level={3}>Chat with AI</CardTitle>

              <CardDescription $color="subtle">
                Have a natural conversation about your work experience.
                The AI adapts to your responses and digs deeper where it matters.
              </CardDescription>

              <MetaInfo>
                <MetaItem>
                  <MetaIcon fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </MetaIcon>
                  ~10-15 minutes
                </MetaItem>
                <MetaItem>
                  <MetaIcon fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </MetaIcon>
                  Conversational
                </MetaItem>
              </MetaInfo>

              {/* Loading state */}
              {isStarting && selectedMode === 'chat' && (
                <LoadingOverlay>
                  <Spinner $size="md" />
                </LoadingOverlay>
              )}

              {/* Hover arrow */}
              <HoverArrow $color="success">
                <ArrowIcon fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </ArrowIcon>
              </HoverArrow>
            </OptionCard>
          </CardGrid>

          {/* Info section */}
          <InfoSection>
            <InfoItems>
              <InfoItem>
                <InfoIcon $color="success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </InfoIcon>
                100% Anonymous
              </InfoItem>
              <InfoItem>
                <InfoIcon $color="brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </InfoIcon>
                Aggregated with 6+ responses
              </InfoItem>
              <InfoItem>
                <InfoIcon $color="warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </InfoIcon>
                Instant insights
              </InfoItem>
            </InfoItems>
          </InfoSection>
        </MainContent>
      </Main>

      {/* Footer */}
      <Footer>
        <FooterText>
          Your honest feedback helps identify friction and improve how your team works.
          <br />
          Results are only visible when at least 6 people respond.
        </FooterText>
      </Footer>
    </PageContainer>
  )
}
