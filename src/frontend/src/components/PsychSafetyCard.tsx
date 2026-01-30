import { useState } from 'react'
import styled, { css } from 'styled-components'
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

// Styled Components
const Card = styled.section`
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  box-shadow: ${({ theme }) => theme.v1.shadows.sm};
  padding: ${({ theme }) => theme.v1.spacing.spacingXL};
`

const CardHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const HeaderContent = styled.div``

const CardTitle = styled.h2`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0;
`

const CardSubtitle = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  margin: ${({ theme }) => theme.v1.spacing.spacingXS} 0 0 0;
`

interface ButtonProps {
  $variant?: 'primary' | 'secondary' | 'warning' | 'warningOutline'
  $size?: 'sm' | 'md'
}

const Button = styled.button<ButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
  border: none;
  border-radius: ${({ theme }) => theme.v1.radius.radiusMD};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  transition: all 0.2s ease;
  cursor: pointer;

  ${({ $size = 'md', theme }) => {
    if ($size === 'sm') {
      return css`
        padding: ${theme.v1.spacing.spacingXXS} ${theme.v1.spacing.spacingMD};
        font-size: ${theme.v1.typography.sizes.helper};
      `
    }
    return css`
      padding: ${theme.v1.spacing.spacingXS} ${theme.v1.spacing.spacingMD};
      font-size: ${theme.v1.typography.sizes.bodyS};
    `
  }}

  ${({ $variant = 'primary', theme }) => {
    switch ($variant) {
      case 'secondary':
        return css`
          background-color: transparent;
          color: ${theme.v1.semanticColors.text.action.default};
          border: 1px solid ${theme.v1.semanticColors.border.brand.default};
          &:hover:not(:disabled) {
            background-color: ${theme.v1.semanticColors.fill.highlight.brand.default};
          }
        `
      case 'warning':
        return css`
          background-color: ${theme.v1.semanticColors.fill.feedback.warning.bold};
          color: ${theme.v1.semanticColors.text.inverse};
          &:hover:not(:disabled) {
            opacity: 0.9;
          }
        `
      case 'warningOutline':
        return css`
          background-color: ${theme.v1.semanticColors.canvas.default};
          color: ${theme.v1.semanticColors.text.feedback.warning.default};
          border: 1px solid ${theme.v1.semanticColors.border.feedback.warning};
          &:hover:not(:disabled) {
            background-color: ${theme.v1.semanticColors.fill.feedback.warning.subtle};
          }
        `
      default:
        return css`
          background-color: ${theme.v1.semanticColors.fill.action.brand.default};
          color: ${theme.v1.semanticColors.text.inverse};
          &:hover:not(:disabled) {
            background-color: ${theme.v1.semanticColors.fill.action.brand.hover};
          }
        `
    }
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const ErrorAlert = styled.div`
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingLG};
  padding: ${({ theme }) => theme.v1.spacing.spacingMD};
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.feedback.error.subtle};
  border: 1px solid ${({ theme }) => theme.v1.semanticColors.border.feedback.error};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.feedback.error.default};
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.v1.semanticColors.text.feedback.error.vibrant};
  cursor: pointer;
  padding: 0;
  display: flex;

  &:hover {
    color: ${({ theme }) => theme.v1.semanticColors.text.feedback.error.default};
  }
`

const IconButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  cursor: pointer;
  padding: 0;
  display: flex;

  &:hover {
    color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  }
`

const SkeletonBlock = styled.div<{ $height?: string; $width?: string }>`
  height: ${({ $height = '16px' }) => $height};
  width: ${({ $width = '100%' }) => $width};
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.neutral.skeleton};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`

const LoadingWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.v1.spacing.spacingMD};
`

const ContentStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.v1.spacing.spacingLG};
`

// Active Survey Card Styles
const ActiveSurveyWrapper = styled.div`
  border: 1px solid ${({ theme }) => theme.v1.colors.primary[400]}30;
  background-color: ${({ theme }) => theme.v1.colors.primary[400]}08;
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  padding: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const SurveyHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingMD};
`

const SurveyTitle = styled.h4`
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0;
`

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
`

const ActiveBadge = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  padding: ${({ theme }) => theme.v1.spacing.spacingXXS} ${({ theme }) => theme.v1.spacing.spacingSM};
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.action.brand.default};
  color: ${({ theme }) => theme.v1.semanticColors.text.inverse};
  border-radius: ${({ theme }) => theme.v1.radius.radiusPill};
`

const ClosedBadge = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  padding: ${({ theme }) => theme.v1.spacing.spacingXXS} ${({ theme }) => theme.v1.spacing.spacingSM};
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.neutral.dark};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusPill};
`

const ResponseCount = styled.div`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingMD};
`

const WarningText = styled.span`
  color: ${({ theme }) => theme.v1.semanticColors.text.feedback.warning.default};
  margin-left: ${({ theme }) => theme.v1.spacing.spacingSM};
`

const LinkButton = styled.button`
  background: none;
  border: none;
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.action.default};
  cursor: pointer;
  padding: 0;

  &:hover {
    text-decoration: underline;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const LinkInputRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
`

const LinkInput = styled.input`
  flex: 1;
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  padding: ${({ theme }) => theme.v1.spacing.spacingSM};
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  border: 1px solid ${({ theme }) => theme.v1.semanticColors.border.neutral.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
`

interface CopyButtonProps {
  $copied?: boolean
}

const CopyButton = styled.button<CopyButtonProps>`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  padding: ${({ theme }) => theme.v1.spacing.spacingSM} ${({ theme }) => theme.v1.spacing.spacingMD};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;

  ${({ $copied, theme }) => $copied
    ? css`
        background-color: ${theme.v1.semanticColors.fill.feedback.success.bold};
        color: ${theme.v1.semanticColors.text.inverse};
      `
    : css`
        background-color: ${theme.v1.semanticColors.fill.action.brand.default};
        color: ${theme.v1.semanticColors.text.inverse};
        &:hover {
          background-color: ${theme.v1.semanticColors.fill.action.brand.hover};
        }
      `
  }
`

const CloseConfirmBox = styled.div`
  margin-top: ${({ theme }) => theme.v1.spacing.spacingMD};
  padding: ${({ theme }) => theme.v1.spacing.spacingMD};
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.feedback.warning.subtle};
  border: 1px solid ${({ theme }) => theme.v1.semanticColors.border.feedback.warning};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
`

const ConfirmText = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.feedback.warning.default};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingSM} 0;
`

const ConfirmActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
`

// Closed Survey Card Styles
const ClosedSurveyWrapper = styled.div`
  border: 1px solid ${({ theme }) => theme.v1.semanticColors.border.neutral.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  padding: ${({ theme }) => theme.v1.spacing.spacingLG};
`

// Draft Survey Card Styles
const DraftSurveyWrapper = styled.div`
  border: 1px solid ${({ theme }) => theme.v1.semanticColors.border.feedback.warning};
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.feedback.warning.subtle};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  padding: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const DraftRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const DraftLabel = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.feedback.warning.default};
`

// Results Styles
const ResultsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const ResultsHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const ScoreWrapper = styled.div``

const OverallScore = styled.div`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleL};
  font-weight: ${({ theme }) => theme.v1.typography.weights.bold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
`

const ScoreMax = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.regular};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const ResponseCountText = styled.div`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const InterpretationWrapper = styled.div`
  text-align: right;
`

interface InterpretationBadgeProps {
  $interpretation?: string
}

const InterpretationBadge = styled.span<InterpretationBadgeProps>`
  display: inline-block;
  padding: ${({ theme }) => theme.v1.spacing.spacingXS} ${({ theme }) => theme.v1.spacing.spacingMD};
  border-radius: ${({ theme }) => theme.v1.radius.radiusPill};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};

  ${({ $interpretation, theme }) => {
    switch ($interpretation) {
      case 'Low':
        return css`
          background-color: ${theme.v1.semanticColors.fill.feedback.error.subtle};
          color: ${theme.v1.semanticColors.text.feedback.error.default};
        `
      case 'Moderate':
        return css`
          background-color: ${theme.v1.semanticColors.fill.feedback.warning.subtle};
          color: ${theme.v1.semanticColors.text.feedback.warning.default};
        `
      case 'High':
        return css`
          background-color: ${theme.v1.semanticColors.fill.feedback.success.subtle};
          color: ${theme.v1.semanticColors.text.feedback.success.default};
        `
      default:
        return ''
    }
  }}
`

const PercentileText = styled.div`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  margin-top: ${({ theme }) => theme.v1.spacing.spacingXS};
`

const ItemScoresWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
  padding-top: ${({ theme }) => theme.v1.spacing.spacingSM};
  border-top: 1px solid ${({ theme }) => theme.v1.semanticColors.border.divider.light};
`

const GaugeRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.v1.spacing.spacingMD};
`

const GaugeLabel = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  width: 128px;
  flex-shrink: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const GaugeBar = styled.div`
  flex: 1;
  height: 8px;
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.neutral.dark};
  border-radius: ${({ theme }) => theme.v1.radius.radiusPill};
  overflow: hidden;
`

interface GaugeFillProps {
  $percentage: number
  $score: number
}

const GaugeFill = styled.div<GaugeFillProps>`
  height: 100%;
  width: ${({ $percentage }) => $percentage}%;
  transition: width 0.5s ease;
  background-color: ${({ $score, theme }) => {
    if ($score >= 5.5) return theme.v1.semanticColors.fill.feedback.success.bold
    if ($score >= 4.0) return theme.v1.semanticColors.fill.feedback.warning.bold
    return theme.v1.semanticColors.fill.feedback.error.bold
  }};
`

const GaugeValue = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  width: 40px;
  text-align: right;
`

const PrivacyMessage = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.v1.spacing.spacingLG} 0;
`

const PrivacyText = styled.p`
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  margin: 0;
`

const PrivacySubtext = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  margin: ${({ theme }) => theme.v1.spacing.spacingXS} 0 0 0;
`

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.v1.spacing.spacing2XL} 0;
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const EmptyStateText = styled.p`
  margin: 0;
`

const EmptyStateSubtext = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  margin: ${({ theme }) => theme.v1.spacing.spacingXS} 0 0 0;
`

const HistoryDetails = styled.details`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
`

const HistorySummary = styled.summary`
  cursor: pointer;
  color: ${({ theme }) => theme.v1.semanticColors.text.action.default};

  &:hover {
    text-decoration: underline;
  }
`

const HistoryList = styled.div`
  margin-top: ${({ theme }) => theme.v1.spacing.spacingMD};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.v1.spacing.spacingMD};
`

// Sub-components
function ScoreGauge({ score, label }: { score: number; label: string }) {
  // Score is on 1-7 scale
  const percentage = ((score - 1) / 6) * 100

  return (
    <GaugeRow>
      <GaugeLabel title={label}>{label}</GaugeLabel>
      <GaugeBar>
        <GaugeFill $percentage={percentage} $score={score} />
      </GaugeBar>
      <GaugeValue>{score.toFixed(1)}</GaugeValue>
    </GaugeRow>
  )
}

function PsychSafetyResults({ survey }: { survey: Survey }) {
  const { data: results, isLoading } = usePsychSafetyResults(survey.id)
  const { data: stats } = useSurveyStats(survey.id)

  if (isLoading) {
    return (
      <LoadingWrapper>
        <SkeletonBlock $height="64px" />
        <SkeletonBlock $height="16px" $width="75%" />
      </LoadingWrapper>
    )
  }

  if (!results?.meets_privacy_threshold) {
    return (
      <PrivacyMessage>
        <PrivacyText>Privacy threshold not met</PrivacyText>
        <PrivacySubtext>
          {stats?.complete_responses || 0} of 7 minimum responses received
        </PrivacySubtext>
      </PrivacyMessage>
    )
  }

  return (
    <ResultsWrapper>
      {/* Overall Score */}
      <ResultsHeader>
        <ScoreWrapper>
          <OverallScore>
            {results.overall_score?.toFixed(1)}
            <ScoreMax>/7</ScoreMax>
          </OverallScore>
          <ResponseCountText>
            Based on {results.respondent_count} responses
          </ResponseCountText>
        </ScoreWrapper>
        <InterpretationWrapper>
          {results.interpretation && (
            <InterpretationBadge $interpretation={results.interpretation}>
              {results.interpretation}
            </InterpretationBadge>
          )}
          {results.benchmark_percentile && (
            <PercentileText>
              {results.benchmark_percentile}th percentile
            </PercentileText>
          )}
        </InterpretationWrapper>
      </ResultsHeader>

      {/* Item Scores */}
      {results.item_scores && results.item_scores.length > 0 && (
        <ItemScoresWrapper>
          {results.item_scores.map((item) => (
            <ScoreGauge
              key={item.item_number}
              score={item.score}
              label={PSYCH_SAFETY_ITEM_LABELS[item.item_number] || `Item ${item.item_number}`}
            />
          ))}
        </ItemScoresWrapper>
      )}
    </ResultsWrapper>
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
    <ActiveSurveyWrapper>
      <SurveyHeaderRow>
        <SurveyTitle>{survey.name}</SurveyTitle>
        <HeaderActions>
          <ActiveBadge>Active</ActiveBadge>
          <IconButton
            onClick={() => setShowCloseConfirm(true)}
            title="Close survey"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </IconButton>
        </HeaderActions>
      </SurveyHeaderRow>

      <ResponseCount>
        {stats?.complete_responses || 0} responses collected
        {stats && !stats.meets_privacy_threshold && (
          <WarningText>
            (need {7 - (stats.complete_responses || 0)} more)
          </WarningText>
        )}
      </ResponseCount>

      {!surveyUrl ? (
        <LinkButton
          onClick={handleGetLink}
          disabled={generateLink.isPending}
        >
          {generateLink.isPending ? 'Generating...' : 'Get Survey Link'}
        </LinkButton>
      ) : (
        <LinkInputRow>
          <LinkInput
            type="text"
            value={surveyUrl}
            readOnly
          />
          <CopyButton onClick={handleCopyLink} $copied={copied}>
            {copied ? 'Copied!' : 'Copy'}
          </CopyButton>
        </LinkInputRow>
      )}

      {/* Close confirmation dialog */}
      {showCloseConfirm && (
        <CloseConfirmBox>
          <ConfirmText>
            Close this assessment? Results will be calculated with current responses.
          </ConfirmText>
          <ConfirmActions>
            <Button
              $variant="warning"
              $size="sm"
              onClick={() => {
                onClose(survey.id)
                setShowCloseConfirm(false)
              }}
            >
              Close Assessment
            </Button>
            <Button
              $variant="warningOutline"
              $size="sm"
              onClick={() => setShowCloseConfirm(false)}
            >
              Cancel
            </Button>
          </ConfirmActions>
        </CloseConfirmBox>
      )}
    </ActiveSurveyWrapper>
  )
}

function ClosedSurveyCard({ survey }: { survey: Survey }) {
  return (
    <ClosedSurveyWrapper>
      <SurveyHeaderRow>
        <SurveyTitle>{survey.name}</SurveyTitle>
        <ClosedBadge>Closed</ClosedBadge>
      </SurveyHeaderRow>
      <PsychSafetyResults survey={survey} />
    </ClosedSurveyWrapper>
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
    <Card>
      <CardHeaderRow>
        <HeaderContent>
          <CardTitle>Psychological Safety</CardTitle>
          <CardSubtitle>
            Edmondson's 7-item validated scale
          </CardSubtitle>
        </HeaderContent>
        {activeSurveys.length === 0 && (
          <Button
            onClick={handleCreateAndActivate}
            disabled={isCreating}
            $size="sm"
          >
            {isCreating ? 'Creating...' : 'Start Assessment'}
          </Button>
        )}
      </CardHeaderRow>

      {/* Error message */}
      {error && (
        <ErrorAlert>
          <span>{error}</span>
          <CloseButton onClick={() => setError(null)}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </CloseButton>
        </ErrorAlert>
      )}

      {isLoading ? (
        <LoadingWrapper>
          <SkeletonBlock $height="80px" />
        </LoadingWrapper>
      ) : (
        <ContentStack>
          {/* Active Surveys */}
          {activeSurveys.map(survey => (
            <ActiveSurveyCard key={survey.id} survey={survey} onClose={handleCloseSurvey} />
          ))}

          {/* Draft Surveys (shouldn't normally exist, but handle) */}
          {draftSurveys.map(survey => (
            <DraftSurveyWrapper key={survey.id}>
              <DraftRow>
                <DraftLabel>{survey.name} (Draft)</DraftLabel>
                <LinkButton onClick={() => activateSurvey.mutate(survey.id)}>
                  Activate
                </LinkButton>
              </DraftRow>
            </DraftSurveyWrapper>
          ))}

          {/* Latest Results */}
          {activeSurveys.length === 0 && latestClosed && (
            <ClosedSurveyCard survey={latestClosed} />
          )}

          {/* No surveys yet */}
          {surveys?.length === 0 && (
            <EmptyState>
              <EmptyStateText>No psychological safety assessments yet</EmptyStateText>
              <EmptyStateSubtext>
                Run an assessment to measure team psychological safety using Edmondson's validated scale
              </EmptyStateSubtext>
            </EmptyState>
          )}

          {/* Historical surveys link */}
          {closedSurveys.length > 1 && (
            <HistoryDetails>
              <HistorySummary>
                View {closedSurveys.length - 1} previous assessment{closedSurveys.length > 2 ? 's' : ''}
              </HistorySummary>
              <HistoryList>
                {closedSurveys.slice(1).map(survey => (
                  <ClosedSurveyCard key={survey.id} survey={survey} />
                ))}
              </HistoryList>
            </HistoryDetails>
          )}
        </ContentStack>
      )}
    </Card>
  )
}
