import { useState } from 'react'
import styled from 'styled-components'
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
import {
  Card,
  Button,
  Heading,
  Text,
  Spinner,
  Input,
  Label,
  Flex,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '../design-system/components'

interface SurveyManagementProps {
  team: Team
}

// Styled Components
const SurveyCardContainer = styled.div`
  border: 1px solid ${({ theme }) => theme.v1.semanticColors.border.neutral.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  padding: ${({ theme }) => theme.v1.spacing.spacingLG};
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
`

const SurveyHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingMD};
`

const SurveyTitle = styled.h3`
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0;
`

const SurveyDate = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  margin: 0;
`

const StatusBadge = styled.span<{ $status: 'draft' | 'active' | 'closed' }>`
  padding: ${({ theme }) => theme.v1.spacing.spacingXS} ${({ theme }) => theme.v1.spacing.spacingSM};
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  border-radius: ${({ theme }) => theme.v1.radius.radiusPill};

  ${({ theme, $status }) => {
    switch ($status) {
      case 'active':
        return `
          background-color: ${theme.v1.semanticColors.fill.feedback.success.subtle};
          color: ${theme.v1.semanticColors.text.feedback.success.default};
        `
      case 'closed':
        return `
          background-color: ${theme.v1.semanticColors.fill.neutral.light};
          color: ${theme.v1.semanticColors.text.body.default};
        `
      default:
        return `
          background-color: ${theme.v1.semanticColors.fill.feedback.warning.subtle};
          color: ${theme.v1.semanticColors.text.feedback.warning.default};
        `
    }
  }}
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const StatBox = styled.div`
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
  padding: ${({ theme }) => theme.v1.spacing.spacingSM};
  text-align: center;
`

const StatValue = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.bold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0;
`

const StatLabel = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  margin: 0;
`

const PrivacyIndicator = styled.div<{ $met: boolean }>`
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingLG};
  padding: ${({ theme }) => theme.v1.spacing.spacingSM};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};

  ${({ theme, $met }) => $met
    ? `
      background-color: ${theme.v1.semanticColors.fill.feedback.success.subtle};
      color: ${theme.v1.semanticColors.text.feedback.success.default};
    `
    : `
      background-color: ${theme.v1.semanticColors.fill.feedback.warning.subtle};
      color: ${theme.v1.semanticColors.text.feedback.warning.default};
    `
  }
`

const ActionsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
`

const GenerateOptionsBox = styled.div`
  width: 100%;
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.feedback.info.subtle};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  padding: ${({ theme }) => theme.v1.spacing.spacingMD};
`

const OptionsTitle = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.feedback.info.default};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingMD} 0;
`

const CheckboxLabel = styled.label`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
`

const Checkbox = styled.input`
  margin-top: ${({ theme }) => theme.v1.spacing.spacingXS};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
  border: 1px solid ${({ theme }) => theme.v1.semanticColors.border.neutral.default};
`

const CheckboxText = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.feedback.info.default};
`

const CloseConfirmBox = styled.div`
  width: 100%;
  margin-top: ${({ theme }) => theme.v1.spacing.spacingSM};
  padding: ${({ theme }) => theme.v1.spacing.spacingMD};
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.feedback.warning.subtle};
  border: 1px solid ${({ theme }) => theme.v1.semanticColors.border.feedback.warning};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
`

const CloseConfirmText = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.feedback.warning.default};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingSM} 0;
`

const MetricsCalculatedText = styled.span`
  padding: ${({ theme }) => theme.v1.spacing.spacingXS} ${({ theme }) => theme.v1.spacing.spacingMD};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.feedback.success.default};
`

const LinkModalInput = styled(Input)`
  flex: 1;
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
`

const SectionTitle = styled.h3`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.bold};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingMD} 0;
`

const SurveySection = styled.div`
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacing2XL};
`

const SurveyList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.v1.spacing.spacingMD};
`

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.v1.spacing.spacing3XL} 0;
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const LoadingContainer = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.v1.spacing.spacing3XL} 0;
`

const HeaderWrapper = styled.div`
  flex: 1;
`

const CloseButton = styled.button`
  background: none;
  border: none;
  padding: ${({ theme }) => theme.v1.spacing.spacingXS};
  cursor: pointer;
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  transition: color 0.2s;

  &:hover {
    color: ${({ theme }) => theme.v1.semanticColors.text.body.bold};
  }
`

const WarningButton = styled(Button)`
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.feedback.warning.bold};
  color: ${({ theme }) => theme.v1.semanticColors.text.inverse};

  &:hover:not(:disabled) {
    background-color: ${({ theme }) => theme.v1.colors.status.yellow[700]};
  }
`

const GhostButtonOutlined = styled(Button)`
  background-color: transparent;
  color: ${({ theme }) => theme.v1.semanticColors.text.feedback.warning.default};
  border: 1px solid ${({ theme }) => theme.v1.semanticColors.border.feedback.warning};

  &:hover:not(:disabled) {
    background-color: ${({ theme }) => theme.v1.semanticColors.fill.feedback.warning.subtle};
  }
`

const PreviewButton = styled(Button)`
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.feedback.help.subtle};
  color: ${({ theme }) => theme.v1.semanticColors.text.feedback.help.default};

  &:hover:not(:disabled) {
    background-color: ${({ theme }) => theme.v1.colors.status.purple[25]};
  }
`

const CloneButton = styled(Button)`
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.feedback.info.subtle};
  color: ${({ theme }) => theme.v1.semanticColors.text.feedback.info.default};

  &:hover:not(:disabled) {
    background-color: ${({ theme }) => theme.v1.colors.status.blue[25]};
  }
`

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

  const hasQuestions = survey.questions && survey.questions.length > 0

  return (
    <SurveyCardContainer>
      <SurveyHeader>
        <div>
          <SurveyTitle>{survey.name}</SurveyTitle>
          <SurveyDate>
            Created {new Date(survey.created_at).toLocaleDateString()}
          </SurveyDate>
        </div>
        <StatusBadge $status={survey.status}>
          {survey.status.charAt(0).toUpperCase() + survey.status.slice(1)}
        </StatusBadge>
      </SurveyHeader>

      {/* Survey Stats */}
      {stats && (
        <StatsGrid>
          <StatBox>
            <StatValue>{stats.complete_responses}</StatValue>
            <StatLabel>Responses</StatLabel>
          </StatBox>
          <StatBox>
            <StatValue>{survey.questions?.length || 0}</StatValue>
            <StatLabel>Questions</StatLabel>
          </StatBox>
          <StatBox>
            <StatValue>{survey.estimated_completion_minutes || '-'}</StatValue>
            <StatLabel>Est. Minutes</StatLabel>
          </StatBox>
        </StatsGrid>
      )}

      {/* Privacy Threshold Indicator */}
      {stats && survey.status === 'active' && (
        <PrivacyIndicator $met={stats.meets_privacy_threshold}>
          {stats.meets_privacy_threshold ? (
            <span>Privacy threshold met - metrics available</span>
          ) : (
            <span>Need {7 - stats.complete_responses} more responses for metrics</span>
          )}
        </PrivacyIndicator>
      )}

      {/* Actions based on status */}
      <ActionsContainer>
        {survey.status === 'draft' && !hasQuestions && !showGenerateOptions && (
          <Button
            $size="sm"
            onClick={() => setShowGenerateOptions(true)}
            disabled={isGeneratingQuestions}
          >
            Generate Questions
          </Button>
        )}

        {survey.status === 'draft' && !hasQuestions && showGenerateOptions && (
          <GenerateOptionsBox>
            <OptionsTitle>Question Generation Options</OptionsTitle>
            <CheckboxLabel>
              <Checkbox
                type="checkbox"
                checked={useTaskSpecific}
                onChange={(e) => setUseTaskSpecific(e.target.checked)}
              />
              <CheckboxText>
                <strong>Include task-specific questions</strong>
                <br />
                <span style={{ opacity: 0.8 }}>Links questions to Faethm occupation tasks for contextual relevance</span>
              </CheckboxText>
            </CheckboxLabel>
            <Flex $gap="spacingSM" style={{ marginTop: '0.75rem' }}>
              <Button
                $size="sm"
                onClick={() => {
                  onGenerateQuestions(survey.id, useTaskSpecific)
                  setShowGenerateOptions(false)
                }}
                disabled={isGeneratingQuestions}
              >
                {isGeneratingQuestions ? 'Generating...' : 'Generate'}
              </Button>
              <Button
                $size="sm"
                $variant="secondary"
                onClick={() => setShowGenerateOptions(false)}
              >
                Cancel
              </Button>
            </Flex>
          </GenerateOptionsBox>
        )}

        {survey.status === 'draft' && hasQuestions && (
          <Button
            $size="sm"
            style={{ backgroundColor: '#1C826A' }}
            onClick={() => onActivate(survey.id)}
            disabled={isActivating}
          >
            {isActivating ? 'Activating...' : 'Activate Survey'}
          </Button>
        )}

        {survey.status === 'active' && (
          <>
            <Button
              $size="sm"
              onClick={handleGenerateLink}
              disabled={generateLink.isPending}
            >
              {generateLink.isPending ? 'Generating...' : 'Get Response Link'}
            </Button>
            <Button
              $size="sm"
              $variant="ghost"
              onClick={() => setShowCloseConfirm(true)}
              disabled={isClosing}
            >
              {isClosing ? 'Closing...' : 'Close Survey'}
            </Button>
          </>
        )}

        {/* Close Survey Confirmation */}
        {showCloseConfirm && (
          <CloseConfirmBox>
            <CloseConfirmText>
              <strong>Close this survey?</strong> No more responses can be collected. Results will be calculated with {stats?.complete_responses || 0} responses.
            </CloseConfirmText>
            <Flex $gap="spacingSM">
              <WarningButton
                $size="sm"
                onClick={() => {
                  onClose(survey.id)
                  setShowCloseConfirm(false)
                }}
                disabled={isClosing}
              >
                {isClosing ? 'Closing...' : 'Yes, Close Survey'}
              </WarningButton>
              <GhostButtonOutlined
                $size="sm"
                onClick={() => setShowCloseConfirm(false)}
              >
                Cancel
              </GhostButtonOutlined>
            </Flex>
          </CloseConfirmBox>
        )}

        {survey.status === 'closed' && stats && stats.meets_privacy_threshold && (
          <MetricsCalculatedText>
            Metrics calculated
          </MetricsCalculatedText>
        )}

        {/* View Mapping button - show if survey has questions */}
        {hasQuestions && (
          <>
            <PreviewButton
              $size="sm"
              onClick={() => setShowPreviewModal(true)}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview All
            </PreviewButton>
            <Button
              $size="sm"
              $variant="ghost"
              onClick={() => setShowMappingModal(true)}
            >
              View Mapping
            </Button>
            <CloneButton
              $size="sm"
              onClick={() => onClone(survey.id)}
              disabled={isCloning}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {isCloning ? 'Cloning...' : 'Clone'}
            </CloneButton>
          </>
        )}
      </ActionsContainer>

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
        <ModalOverlay>
          <ModalContent $size="md">
            <ModalHeader>
              <Heading $level={3}>Survey Response Link</Heading>
            </ModalHeader>
            <ModalBody>
              <Text $variant="bodySmall" $color="subtle" style={{ marginBottom: '1rem' }}>
                Share this unique link with a team member. Each link can only be used once.
              </Text>
              <Flex $gap="spacingSM" style={{ marginBottom: '1rem' }}>
                <LinkModalInput
                  type="text"
                  readOnly
                  value={generatedLink}
                />
                <Button onClick={copyToClipboard}>
                  Copy
                </Button>
              </Flex>
            </ModalBody>
            <ModalFooter>
              <Button
                $variant="secondary"
                onClick={handleGenerateLink}
              >
                Generate Another
              </Button>
              <Button
                onClick={() => {
                  setShowLinkModal(false)
                  setGeneratedLink(null)
                }}
              >
                Done
              </Button>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}
    </SurveyCardContainer>
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
    <Card $variant="outlined" $padding="lg">
      <Flex $justify="between" $align="center" style={{ marginBottom: '1.5rem' }}>
        <div>
          <Heading $level={3}>Surveys</Heading>
          <Text $variant="bodySmall" $color="subtle">Create and manage team surveys</Text>
        </div>
        <Button $size="sm" onClick={() => setShowCreateModal(true)}>
          New Survey
        </Button>
      </Flex>

      {isLoading ? (
        <LoadingContainer>
          <Spinner />
          <Text $color="subtle" style={{ marginTop: '0.5rem' }}>Loading surveys...</Text>
        </LoadingContainer>
      ) : (
        <div>
          {/* Active Surveys */}
          {activeSurveys.length > 0 && (
            <SurveySection>
              <SectionTitle>Active Surveys</SectionTitle>
              <SurveyList>
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
              </SurveyList>
            </SurveySection>
          )}

          {/* Draft Surveys */}
          {draftSurveys.length > 0 && (
            <SurveySection>
              <SectionTitle>Draft Surveys</SectionTitle>
              <SurveyList>
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
              </SurveyList>
            </SurveySection>
          )}

          {/* Closed Surveys */}
          {closedSurveys.length > 0 && (
            <SurveySection>
              <SectionTitle>Closed Surveys</SectionTitle>
              <SurveyList>
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
              </SurveyList>
            </SurveySection>
          )}

          {/* Empty State */}
          {(!surveys || surveys.length === 0) && (
            <EmptyState>
              <Text>No surveys yet. Create one to start collecting feedback.</Text>
            </EmptyState>
          )}
        </div>
      )}

      {/* Create Survey Modal */}
      {showCreateModal && (
        <ModalOverlay>
          <ModalContent $size="sm">
            <ModalHeader>
              <HeaderWrapper>
                <Heading $level={3}>Create New Survey</Heading>
              </HeaderWrapper>
              <CloseButton onClick={() => { setShowCreateModal(false); setNewSurveyName(''); }}>
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </CloseButton>
            </ModalHeader>
            <ModalBody>
              <div style={{ marginBottom: '1rem' }}>
                <Label>Survey Name</Label>
                <Input
                  type="text"
                  value={newSurveyName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSurveyName(e.target.value)}
                  placeholder="e.g., Q1 2026 KWeX Survey"
                  $fullWidth
                />
              </div>
              <Text $variant="bodySmall" $color="subtle">
                The survey will be created for team "{team.name}" using their assigned occupation's friction dimensions.
              </Text>
            </ModalBody>
            <ModalFooter>
              <Button
                $variant="secondary"
                onClick={() => {
                  setShowCreateModal(false)
                  setNewSurveyName('')
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateSurvey}
                disabled={!newSurveyName.trim() || createSurvey.isPending}
              >
                {createSurvey.isPending ? 'Creating...' : 'Create Survey'}
              </Button>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}
    </Card>
  )
}
