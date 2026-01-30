import { useState } from 'react'
import styled from 'styled-components'
import { useSystemStatus, useTestLLM, useLLMConfig, useResetAll, useResetTasks, useResetOccupation, useDeleteOccupation, useSurveysForSampleData, useGenerateSampleData } from '../api/hooks'
import type { LLMTestResult, LLMConfigResponse } from '../api/types'
import { VERSION as FRONTEND_VERSION } from '../version'
import {
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Heading,
  Text,
  Spinner,
  Input,
  Label,
  Flex,
  Grid,
  Alert,
} from '../design-system/components'

interface StatusModalProps {
  isOpen: boolean
  onClose: () => void
}

// Styled components for StatusModal
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

const ScrollableBody = styled(ModalBody)`
  flex: 1;
  overflow-y: auto;
  max-height: calc(90vh - 200px);
`

const Section = styled.section`
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacing2XL};
`

const SectionTitle = styled.h3`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingMD} 0;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
`

const VersionSection = styled.section`
  background: linear-gradient(to right, ${({ theme }) => theme.v1.semanticColors.fill.highlight.brand.default}, ${({ theme }) => theme.v1.colors.primary[25]});
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  padding: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const InfoBox = styled.div`
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  padding: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const InfoItem = styled.div``

const InfoLabel = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  margin: 0;
`

const InfoValue = styled.p<{ $color?: 'default' | 'success' | 'warning' | 'error' | 'subtle' }>`
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  margin: 0;
  color: ${({ theme, $color }) => {
    switch ($color) {
      case 'success': return theme.v1.semanticColors.text.feedback.success.vibrant
      case 'warning': return theme.v1.semanticColors.text.feedback.warning.default
      case 'error': return theme.v1.semanticColors.text.feedback.error.vibrant
      case 'subtle': return theme.v1.semanticColors.text.body.subtle
      default: return theme.v1.semanticColors.text.body.bold
    }
  }};
`

const MonoText = styled.span`
  font-family: monospace;
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
`

const SmallMonoText = styled.p`
  font-family: monospace;
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
`

const StatusDot = styled.span<{ $status: 'success' | 'warning' | 'error' | 'neutral' }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
  background-color: ${({ theme, $status }) => {
    switch ($status) {
      case 'success': return theme.v1.semanticColors.fill.feedback.success.bold
      case 'warning': return theme.v1.semanticColors.fill.feedback.warning.bold
      case 'error': return theme.v1.semanticColors.fill.feedback.error.bold
      default: return theme.v1.semanticColors.fill.neutral.dark
    }
  }};
`

const SmallStatusDot = styled(StatusDot)`
  width: 8px;
  height: 8px;
`

const StatCardContainer = styled.div`
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  border: 1px solid ${({ theme }) => theme.v1.semanticColors.border.neutral.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  padding: ${({ theme }) => theme.v1.spacing.spacingMD};
  text-align: center;
`

const StatValue = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleM};
  font-weight: ${({ theme }) => theme.v1.typography.weights.bold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0;
`

const StatLabel = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  margin: 0;
`

const DangerSection = styled.section`
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.feedback.orange.subtle};
  border: 1px solid ${({ theme }) => theme.v1.colors.status.orange[25]};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  padding: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const PurpleSection = styled.section`
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.feedback.help.subtle};
  border: 1px solid ${({ theme }) => theme.v1.colors.status.purple[25]};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  padding: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const ConfirmBox = styled.div<{ $variant: 'danger' | 'warning' }>`
  background-color: ${({ theme, $variant }) =>
    $variant === 'danger'
      ? theme.v1.semanticColors.fill.feedback.error.subtle
      : theme.v1.semanticColors.fill.feedback.warning.subtle};
  border: 1px solid ${({ theme, $variant }) =>
    $variant === 'danger'
      ? theme.v1.semanticColors.border.feedback.error
      : theme.v1.semanticColors.border.feedback.warning};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  padding: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const ConfirmTitle = styled.p<{ $variant: 'danger' | 'warning' }>`
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme, $variant }) =>
    $variant === 'danger'
      ? theme.v1.semanticColors.text.feedback.error.default
      : theme.v1.semanticColors.text.feedback.warning.default};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingSM} 0;
`

const ConfirmText = styled.p<{ $variant: 'danger' | 'warning' }>`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme, $variant }) =>
    $variant === 'danger'
      ? theme.v1.semanticColors.text.feedback.error.default
      : theme.v1.semanticColors.text.feedback.warning.default};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingLG} 0;
`

const EnvVarRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  font-family: monospace;
`

const EnvVarKey = styled.span`
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const EnvVarValue = styled.span<{ $active?: boolean }>`
  color: ${({ theme, $active }) =>
    $active ? theme.v1.semanticColors.text.feedback.success.vibrant : theme.v1.semanticColors.text.body.default};
`

const CodeBlock = styled.div`
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  padding: ${({ theme }) => theme.v1.spacing.spacingSM};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
  margin-top: ${({ theme }) => theme.v1.spacing.spacingXS};
`

const DiagnosticResult = styled.div<{ $success: boolean }>`
  margin-top: ${({ theme }) => theme.v1.spacing.spacingMD};
  padding: ${({ theme }) => theme.v1.spacing.spacingMD};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  background-color: ${({ theme, $success }) =>
    $success ? theme.v1.semanticColors.fill.feedback.success.subtle : theme.v1.semanticColors.fill.feedback.error.subtle};
  border: 1px solid ${({ theme, $success }) =>
    $success ? theme.v1.semanticColors.border.feedback.success : theme.v1.semanticColors.border.feedback.error};
`

const DiagnosticResultTitle = styled.p<{ $success: boolean }>`
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme, $success }) =>
    $success ? theme.v1.semanticColors.text.feedback.success.default : theme.v1.semanticColors.text.feedback.error.default};
  margin: 0;
`

const ConfigBox = styled.div`
  margin-top: ${({ theme }) => theme.v1.spacing.spacingMD};
  padding: ${({ theme }) => theme.v1.spacing.spacingMD};
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  max-height: 256px;
  overflow-y: auto;
`

const ConfigSubsection = styled.div`
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingMD};
`

const ConfigSubsectionLabel = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingXS} 0;
`

const WhyMockBox = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.feedback.warning.subtle};
  padding: ${({ theme }) => theme.v1.spacing.spacingSM};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
  margin: 0;
`

const Divider = styled.div`
  border-top: 1px solid ${({ theme }) => theme.v1.semanticColors.border.divider.light};
  padding-top: ${({ theme }) => theme.v1.spacing.spacingMD};
  margin-top: ${({ theme }) => theme.v1.spacing.spacingMD};
`

const OperationRow = styled.div<{ $success?: boolean }>`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  padding: ${({ theme }) => theme.v1.spacing.spacingXS} 0;
  border-bottom: 1px solid ${({ theme }) => theme.v1.semanticColors.border.divider.light};
  color: ${({ theme, $success }) =>
    $success === false ? theme.v1.semanticColors.text.feedback.error.vibrant : theme.v1.semanticColors.text.body.default};
`

const Select = styled.select`
  width: 100%;
  padding: ${({ theme }) => theme.v1.spacing.spacingSM} ${({ theme }) => theme.v1.spacing.spacingMD};
  border: 1px solid ${({ theme }) => theme.v1.semanticColors.border.inputs.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.bold};
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.v1.semanticColors.border.inputs.typing};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.v1.semanticColors.fill.highlight.brand.default};
  }
`

const NumberInput = styled(Input)`
  width: 100%;
`

const ModeDescription = styled.div`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
  padding: ${({ theme }) => theme.v1.spacing.spacingSM};
`

const Table = styled.table`
  width: 100%;
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
`

const TableHeader = styled.thead`
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
`

const TableHeaderCell = styled.th`
  padding: ${({ theme }) => theme.v1.spacing.spacingSM} ${({ theme }) => theme.v1.spacing.spacingLG};
  text-align: left;
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.subtle};
`

const TableRow = styled.tr`
  &:hover {
    background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
  }
`

const TableCell = styled.td`
  padding: ${({ theme }) => theme.v1.spacing.spacingSM} ${({ theme }) => theme.v1.spacing.spacingLG};
  border-bottom: 1px solid ${({ theme }) => theme.v1.semanticColors.border.divider.light};
`

const TableCellCenter = styled(TableCell)`
  text-align: center;
`

const ActionButtonSmall = styled.button<{ $variant: 'warning' | 'danger' }>`
  padding: ${({ theme }) => theme.v1.spacing.spacingXS} ${({ theme }) => theme.v1.spacing.spacingSM};
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
  cursor: pointer;
  border: none;
  transition: background-color 0.2s;

  ${({ theme, $variant }) =>
    $variant === 'warning'
      ? `
        background-color: ${theme.v1.semanticColors.fill.feedback.warning.subtle};
        color: ${theme.v1.semanticColors.text.feedback.warning.default};
        &:hover:not(:disabled) {
          background-color: ${theme.v1.colors.status.yellow[25]};
        }
      `
      : `
        background-color: ${theme.v1.semanticColors.fill.feedback.error.subtle};
        color: ${theme.v1.semanticColors.text.feedback.error.default};
        &:hover:not(:disabled) {
          background-color: ${theme.v1.colors.status.red[25]};
        }
      `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const LoadingContainer = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.v1.spacing.spacing3XL} 0;
`

const ErrorContainer = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.v1.spacing.spacing3XL} 0;
  color: ${({ theme }) => theme.v1.semanticColors.text.feedback.error.vibrant};
`

const RetryLink = styled.button`
  margin-top: ${({ theme }) => theme.v1.spacing.spacingSM};
  color: ${({ theme }) => theme.v1.semanticColors.text.action.default};
  background: none;
  border: none;
  text-decoration: underline;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.v1.semanticColors.text.action.hover};
  }
`

const FooterContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
`

const RefreshButton = styled.button`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.action.default};
  background: none;
  border: none;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.v1.semanticColors.text.action.hover};
  }
`

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.v1.spacing.spacingLG} 0;
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const MessageAlert = styled(Alert)<{ $isSuccess: boolean }>`
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const DismissButton = styled.button`
  background: none;
  border: none;
  margin-left: ${({ theme }) => theme.v1.spacing.spacingSM};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.v1.semanticColors.text.body.bold};
  }
`

export function StatusModal({ isOpen, onClose }: StatusModalProps) {
  const { data: status, isLoading, error, refetch } = useSystemStatus()
  const testLLM = useTestLLM()
  const getLLMConfig = useLLMConfig()
  const resetAll = useResetAll()
  const resetTasks = useResetTasks()
  const resetOccupation = useResetOccupation()
  const deleteOccupation = useDeleteOccupation()
  const { data: surveysData, refetch: refetchSurveys } = useSurveysForSampleData()
  const generateSampleData = useGenerateSampleData()

  const [llmTestResult, setLLMTestResult] = useState<LLMTestResult | null>(null)
  const [llmConfig, setLLMConfig] = useState<LLMConfigResponse | null>(null)
  const [confirmingReset, setConfirmingReset] = useState<'all' | 'tasks' | null>(null)
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Sample data generation state
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>('')
  const [sampleCount, setSampleCount] = useState<number>(5)
  const [sampleMode, setSampleMode] = useState<'random' | 'persona'>('random')
  const [sampleDataResult, setSampleDataResult] = useState<{ type: 'success' | 'error'; text: string; personas?: string[] } | null>(null)

  const handleResetAll = async () => {
    try {
      const result = await resetAll.mutateAsync()
      setResetMessage({ type: 'success', text: `Database reset: ${result.message || 'All data cleared'}` })
      setConfirmingReset(null)
      refetch()
    } catch (err) {
      setResetMessage({ type: 'error', text: `Reset failed: ${err instanceof Error ? err.message : 'Unknown error'}` })
    }
  }

  const handleResetTasks = async () => {
    try {
      const result = await resetTasks.mutateAsync()
      setResetMessage({ type: 'success', text: `Tasks reset: ${result.deleted.occupation_tasks || 0} assignments, ${result.deleted.global_tasks || 0} tasks cleared` })
      setConfirmingReset(null)
      refetch()
    } catch (err) {
      setResetMessage({ type: 'error', text: `Reset failed: ${err instanceof Error ? err.message : 'Unknown error'}` })
    }
  }

  const handleResetOccupation = async (occId: string, occName: string) => {
    if (!window.confirm(`Reset task assignments for "${occName}"? This will remove all task links for this occupation.`)) return
    try {
      const result = await resetOccupation.mutateAsync(occId)
      setResetMessage({ type: 'success', text: `Reset "${occName}": ${result.deleted.occupation_tasks || 0} task assignments cleared` })
      refetch()
    } catch (err) {
      setResetMessage({ type: 'error', text: `Reset failed: ${err instanceof Error ? err.message : 'Unknown error'}` })
    }
  }

  const handleDeleteOccupation = async (occId: string, occName: string) => {
    if (!window.confirm(`DELETE "${occName}" completely? This cannot be undone and will remove the occupation and all its data.`)) return
    try {
      await deleteOccupation.mutateAsync(occId)
      setResetMessage({ type: 'success', text: `Deleted "${occName}" and all associated data` })
      refetch()
    } catch (err) {
      setResetMessage({ type: 'error', text: `Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}` })
    }
  }

  const handleGenerateSampleData = async () => {
    if (!selectedSurveyId) {
      setSampleDataResult({ type: 'error', text: 'Please select a survey' })
      return
    }
    try {
      setSampleDataResult(null)
      const result = await generateSampleData.mutateAsync({
        survey_id: selectedSurveyId,
        count: sampleCount,
        mode: sampleMode,
      })
      setSampleDataResult({
        type: 'success',
        text: result.message,
        personas: result.personas_used || undefined,
      })
      refetch()
      refetchSurveys()
    } catch (err) {
      setSampleDataResult({ type: 'error', text: `Generation failed: ${err instanceof Error ? err.message : 'Unknown error'}` })
    }
  }

  if (!isOpen) return null

  return (
    <ModalOverlay>
      <ModalContent $size="lg" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <ModalHeader>
          <HeaderWrapper>
            <Heading $level={3}>System Status</Heading>
            <Text $variant="bodySmall" $color="subtle">Faethm integration and database overview</Text>
          </HeaderWrapper>
          <CloseButton onClick={onClose}>
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </CloseButton>
        </ModalHeader>

        {/* Content */}
        <ScrollableBody>
          {isLoading ? (
            <LoadingContainer>
              <Spinner $size="lg" />
              <Text $color="subtle" style={{ marginTop: '0.5rem' }}>Loading status...</Text>
            </LoadingContainer>
          ) : error ? (
            <ErrorContainer>
              <Text $color="error">Failed to load status</Text>
              <RetryLink onClick={() => refetch()}>Retry</RetryLink>
            </ErrorContainer>
          ) : status ? (
            <>
              {/* Version Info */}
              <VersionSection>
                <Flex $justify="between" $align="center">
                  <div>
                    <Heading $level={4}>KWeX {status.version?.backend_name || ''}</Heading>
                    <Text $variant="bodySmall" $color="subtle">
                      Backend: v{status.version?.backend || 'unknown'} | Frontend: v{FRONTEND_VERSION}
                    </Text>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Text $variant="bodySmall" $color="subtle">{status.environment}</Text>
                    <Text $variant="bodySmall" $color="subtle">{status.version?.backend_build_date}</Text>
                  </div>
                </Flex>
              </VersionSection>

              {/* Faethm Connection Status */}
              <Section>
                <SectionTitle>
                  <StatusDot $status={status.faethm.mode === 'live' ? 'success' : 'warning'} />
                  Faethm Integration
                </SectionTitle>
                <InfoBox>
                  <InfoGrid>
                    <InfoItem>
                      <InfoLabel>Mode</InfoLabel>
                      <InfoValue $color={status.faethm.mode === 'live' ? 'success' : 'warning'}>
                        {status.faethm.mode === 'live' ? 'Live API' : 'Mock Data (CSV)'}
                      </InfoValue>
                    </InfoItem>
                    <InfoItem>
                      <InfoLabel>API Key</InfoLabel>
                      <InfoValue $color={status.faethm.api_key_configured ? 'success' : 'subtle'}>
                        {status.faethm.api_key_configured ? 'Configured (FaethmPROD)' : 'Not Configured'}
                      </InfoValue>
                    </InfoItem>
                  </InfoGrid>

                  {status.faethm.mode === 'live' && status.faethm.api_url && (
                    <InfoItem style={{ marginTop: '1rem' }}>
                      <InfoLabel>API URL</InfoLabel>
                      <SmallMonoText>{status.faethm.api_url}</SmallMonoText>
                    </InfoItem>
                  )}

                  <Divider>
                    <InfoLabel>CSV Data Source</InfoLabel>
                    <Flex $align="center" $gap="spacingSM">
                      <SmallStatusDot $status={status.faethm.csv_exists ? 'success' : 'error'} />
                      <SmallMonoText style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{status.faethm.csv_path}</SmallMonoText>
                    </Flex>
                    <Text $variant="bodySmall" $color="subtle" style={{ marginTop: '0.25rem' }}>
                      {status.faethm.csv_occupations_count.toLocaleString()} occupations available
                    </Text>
                  </Divider>
                </InfoBox>
              </Section>

              {/* Database Statistics */}
              <Section>
                <SectionTitle>Database Statistics</SectionTitle>
                <Grid $columns={3} $gap="spacingMD">
                  <StatCard label="Occupations Synced" value={status.database.occupations_synced} icon="briefcase" />
                  <StatCard label="Tasks" value={status.database.tasks_count} icon="clipboard" />
                  <StatCard label="Teams" value={status.database.teams_count} icon="users" />
                  <StatCard label="Surveys" value={status.database.surveys_count} icon="document" />
                  <StatCard label="Questions" value={status.database.questions_count} icon="question" />
                  <StatCard label="Responses" value={status.database.responses_count} icon="check" />
                </Grid>
              </Section>

              {/* Configuration */}
              <Section>
                <SectionTitle>Configuration</SectionTitle>
                <InfoBox>
                  <InfoGrid>
                    <InfoItem>
                      <InfoLabel>Environment</InfoLabel>
                      <InfoValue style={{ textTransform: 'capitalize' }}>{status.environment}</InfoValue>
                    </InfoItem>
                    <InfoItem>
                      <InfoLabel>Privacy Threshold</InfoLabel>
                      <InfoValue>{status.privacy_threshold} responses</InfoValue>
                    </InfoItem>
                    <InfoItem>
                      <InfoLabel>Max Survey Duration</InfoLabel>
                      <InfoValue>{status.max_survey_minutes} minutes</InfoValue>
                    </InfoItem>
                    <InfoItem>
                      <InfoLabel>Last Updated</InfoLabel>
                      <InfoValue>{new Date(status.timestamp).toLocaleTimeString()}</InfoValue>
                    </InfoItem>
                  </InfoGrid>
                </InfoBox>
              </Section>

              {/* LLM Status */}
              {status.llm && (
                <Section>
                  <SectionTitle>
                    <StatusDot
                      $status={
                        status.llm.mock_setting
                          ? 'warning'
                          : status.llm.claude.available || status.llm.gpt.available
                          ? 'success'
                          : 'error'
                      }
                    />
                    LLM Integration
                  </SectionTitle>
                  <InfoBox>
                    {/* Mode and Model */}
                    <InfoGrid>
                      <InfoItem>
                        <InfoLabel>Mode</InfoLabel>
                        <InfoValue $color={status.llm.mock_setting ? 'warning' : 'success'}>
                          {status.llm.mock_setting ? 'Mock (Development)' : 'Live'}
                        </InfoValue>
                      </InfoItem>
                      <InfoItem>
                        <InfoLabel>Default Model</InfoLabel>
                        <InfoValue style={{ textTransform: 'capitalize' }}>{status.llm.default_model}</InfoValue>
                      </InfoItem>
                    </InfoGrid>

                    {/* Claude Endpoint */}
                    <Divider>
                      <Flex $align="center" $gap="spacingSM" style={{ marginBottom: '0.5rem' }}>
                        <SmallStatusDot
                          $status={
                            status.llm.claude.available
                              ? 'success'
                              : status.llm.claude.api_key_configured
                              ? 'warning'
                              : 'neutral'
                          }
                        />
                        <Text $variant="bodySmall" $weight="semibold">{status.llm.claude.name}</Text>
                      </Flex>
                      <div style={{ marginLeft: '1rem' }}>
                        <Text $variant="bodySmall" $color="subtle">Configured: {status.llm.claude.api_key_configured ? 'Yes' : 'No'}</Text>
                        <Text $variant="bodySmall" $color="subtle">Deployment: {status.llm.claude.deployment}</Text>
                        {status.llm.claude.endpoint && (
                          <SmallMonoText style={{ color: 'inherit' }}>{status.llm.claude.endpoint}</SmallMonoText>
                        )}
                        <Text $variant="bodySmall" $color="subtle">API Key: {status.llm.claude.api_key_preview}</Text>
                      </div>
                    </Divider>

                    {/* GPT Endpoint */}
                    <Divider>
                      <Flex $align="center" $gap="spacingSM" style={{ marginBottom: '0.5rem' }}>
                        <SmallStatusDot
                          $status={
                            status.llm.gpt.available
                              ? 'success'
                              : status.llm.gpt.api_key_configured
                              ? 'warning'
                              : 'neutral'
                          }
                        />
                        <Text $variant="bodySmall" $weight="semibold">{status.llm.gpt.name}</Text>
                      </Flex>
                      <div style={{ marginLeft: '1rem' }}>
                        <Text $variant="bodySmall" $color="subtle">Configured: {status.llm.gpt.api_key_configured ? 'Yes' : 'No'}</Text>
                        <Text $variant="bodySmall" $color="subtle">Deployment: {status.llm.gpt.deployment}</Text>
                        {status.llm.gpt.endpoint && (
                          <SmallMonoText style={{ color: 'inherit' }}>{status.llm.gpt.endpoint}</SmallMonoText>
                        )}
                        <Text $variant="bodySmall" $color="subtle">API Key: {status.llm.gpt.api_key_preview}</Text>
                      </div>
                    </Divider>

                    {/* Environment Variables */}
                    <Divider>
                      <Text $variant="bodySmall" $weight="semibold" style={{ marginBottom: '0.5rem' }}>Environment Variables</Text>
                      <div style={{ fontFamily: 'monospace' }}>
                        {Object.entries(status.llm.env_vars).map(([key, value]) => (
                          <EnvVarRow key={key}>
                            <EnvVarKey>{key}:</EnvVarKey>
                            <EnvVarValue $active={value === 'set' || value.includes('true')}>{value}</EnvVarValue>
                          </EnvVarRow>
                        ))}
                      </div>
                    </Divider>

                    {/* Stats */}
                    {status.llm_stats && (
                      <Divider>
                        <Text $variant="bodySmall" $weight="semibold" style={{ marginBottom: '0.5rem' }}>Statistics</Text>
                        <Grid $columns={2} $gap="spacingSM">
                          <Text $variant="bodySmall">Total Calls: {status.llm_stats.total_llm_calls}</Text>
                          <Text $variant="bodySmall">Successful: {status.llm_stats.successful_calls}</Text>
                          <Text $variant="bodySmall">Failed: {status.llm_stats.failed_calls}</Text>
                          <Text $variant="bodySmall">Cached Templates: {status.llm_stats.cached_templates_count}</Text>
                          <Text $variant="bodySmall">Enriched Tasks: {status.llm_stats.enriched_tasks_count}</Text>
                        </Grid>
                        {status.llm_stats.recent_operations.length > 0 && (
                          <div style={{ marginTop: '0.5rem' }}>
                            <Text $variant="bodySmall" $weight="semibold">Recent Operations:</Text>
                            <div style={{ maxHeight: '128px', overflowY: 'auto' }}>
                              {status.llm_stats.recent_operations.slice(0, 5).map((op) => (
                                <OperationRow key={op.id} $success={op.success}>
                                  <span style={{ fontWeight: 600 }}>{op.operation}</span>
                                  <span style={{ color: 'inherit', opacity: 0.7 }}> - {op.model}</span>
                                  {op.latency_ms && <span style={{ opacity: 0.5 }}> ({op.latency_ms}ms)</span>}
                                  {op.error && <div style={{ marginTop: '0.25rem' }}>{op.error}</div>}
                                </OperationRow>
                              ))}
                            </div>
                          </div>
                        )}
                      </Divider>
                    )}

                    {/* Test Buttons */}
                    <Divider>
                      <Text $variant="bodySmall" $weight="semibold" style={{ marginBottom: '0.5rem' }}>Diagnostics</Text>
                      <Flex $gap="spacingSM">
                        <Button
                          $size="sm"
                          onClick={async () => {
                            setLLMTestResult(null)
                            const result = await testLLM.mutateAsync(undefined)
                            setLLMTestResult(result)
                          }}
                          disabled={testLLM.isPending}
                        >
                          {testLLM.isPending ? 'Testing...' : 'Test LLM Connection'}
                        </Button>
                        <Button
                          $size="sm"
                          $variant="secondary"
                          onClick={async () => {
                            setLLMConfig(null)
                            const result = await getLLMConfig.mutateAsync()
                            setLLMConfig(result)
                          }}
                          disabled={getLLMConfig.isPending}
                        >
                          {getLLMConfig.isPending ? 'Loading...' : 'View Config'}
                        </Button>
                      </Flex>

                      {/* Test Result */}
                      {llmTestResult && (
                        <DiagnosticResult $success={!!llmTestResult.test_result?.success}>
                          <DiagnosticResultTitle $success={!!llmTestResult.test_result?.success}>
                            {llmTestResult.test_result?.success ? 'Success!' : 'Failed'}
                          </DiagnosticResultTitle>
                          {llmTestResult.client && (
                            <Text $variant="bodySmall">Client: {llmTestResult.client.type} ({llmTestResult.client.model_name})</Text>
                          )}
                          {llmTestResult.test_result?.response && (
                            <Text $variant="bodySmall" style={{ marginTop: '0.25rem' }}>Response: {llmTestResult.test_result.response}</Text>
                          )}
                          {llmTestResult.test_result?.latency_ms && (
                            <Text $variant="bodySmall" $color="subtle">Latency: {llmTestResult.test_result.latency_ms}ms</Text>
                          )}
                          {llmTestResult.error && (
                            <Text $variant="bodySmall" $color="error" style={{ marginTop: '0.25rem' }}>{llmTestResult.error}</Text>
                          )}
                        </DiagnosticResult>
                      )}

                      {/* Config Details */}
                      {llmConfig && (
                        <ConfigBox>
                          <Text $variant="bodySmall" $weight="semibold" style={{ marginBottom: '0.5rem' }}>Configuration Details</Text>

                          <ConfigSubsection>
                            <ConfigSubsectionLabel>Why Mock Mode?</ConfigSubsectionLabel>
                            <WhyMockBox>{llmConfig.why_mock_mode}</WhyMockBox>
                          </ConfigSubsection>

                          <ConfigSubsection>
                            <ConfigSubsectionLabel>.env File ({llmConfig.env_file_exists ? 'Found' : 'Not Found'})</ConfigSubsectionLabel>
                            <SmallMonoText style={{ color: 'inherit' }}>{llmConfig.env_file_path}</SmallMonoText>
                            {Object.keys(llmConfig.env_file_llm_vars).length > 0 && (
                              <CodeBlock>
                                {Object.entries(llmConfig.env_file_llm_vars).map(([key, value]) => (
                                  <SmallMonoText key={key}>{key}={value}</SmallMonoText>
                                ))}
                              </CodeBlock>
                            )}
                          </ConfigSubsection>

                          <ConfigSubsection>
                            <ConfigSubsectionLabel>Loaded Settings</ConfigSubsectionLabel>
                            <CodeBlock>
                              {Object.entries(llmConfig.loaded_settings).map(([key, value]) => (
                                <SmallMonoText key={key}>{key}: {String(value)}</SmallMonoText>
                              ))}
                            </CodeBlock>
                          </ConfigSubsection>

                          <ConfigSubsection>
                            <ConfigSubsectionLabel>OS Environment</ConfigSubsectionLabel>
                            <CodeBlock>
                              {Object.entries(llmConfig.os_environ_llm_vars).map(([key, value]) => (
                                <SmallMonoText key={key} style={{ color: value === 'set' ? '#1C826A' : 'inherit' }}>
                                  {key}: {value}
                                </SmallMonoText>
                              ))}
                            </CodeBlock>
                          </ConfigSubsection>
                        </ConfigBox>
                      )}
                    </Divider>
                  </InfoBox>
                </Section>
              )}

              {/* Data Management */}
              <Section>
                <SectionTitle>
                  <StatusDot $status="warning" />
                  Data Management (Development)
                </SectionTitle>
                <DangerSection>
                  {resetMessage && (
                    <MessageAlert $variant={resetMessage.type === 'success' ? 'success' : 'error'} $isSuccess={resetMessage.type === 'success'}>
                      {resetMessage.text}
                      <DismissButton onClick={() => setResetMessage(null)}>&times;</DismissButton>
                    </MessageAlert>
                  )}

                  {confirmingReset === 'all' ? (
                    <ConfirmBox $variant="danger">
                      <ConfirmTitle $variant="danger">Confirm Full Database Reset</ConfirmTitle>
                      <ConfirmText $variant="danger">
                        This will delete ALL data: occupations, tasks, teams, surveys, questions, responses, and opportunities. This cannot be undone.
                      </ConfirmText>
                      <Flex $gap="spacingSM">
                        <Button $variant="danger" onClick={handleResetAll} disabled={resetAll.isPending}>
                          {resetAll.isPending ? 'Resetting...' : 'Yes, Reset Everything'}
                        </Button>
                        <Button $variant="secondary" onClick={() => setConfirmingReset(null)}>
                          Cancel
                        </Button>
                      </Flex>
                    </ConfirmBox>
                  ) : confirmingReset === 'tasks' ? (
                    <ConfirmBox $variant="warning">
                      <ConfirmTitle $variant="warning">Confirm Task Reset</ConfirmTitle>
                      <ConfirmText $variant="warning">
                        This will delete all task assignments and global tasks. Occupations, teams, and surveys will remain.
                      </ConfirmText>
                      <Flex $gap="spacingSM">
                        <Button style={{ backgroundColor: '#F0B400', color: '#fff' }} onClick={handleResetTasks} disabled={resetTasks.isPending}>
                          {resetTasks.isPending ? 'Resetting...' : 'Yes, Reset Tasks'}
                        </Button>
                        <Button $variant="secondary" onClick={() => setConfirmingReset(null)}>
                          Cancel
                        </Button>
                      </Flex>
                    </ConfirmBox>
                  ) : (
                    <div>
                      <Text $variant="bodySmall" style={{ color: '#85421C', marginBottom: '1rem' }}>
                        Use these options to reset data during development. All actions require confirmation.
                      </Text>
                      <Flex $gap="spacingSM" $wrap>
                        <Button $variant="danger" $size="sm" onClick={() => setConfirmingReset('all')}>
                          Reset All Data
                        </Button>
                        <Button $size="sm" style={{ backgroundColor: '#F0B400', color: '#fff' }} onClick={() => setConfirmingReset('tasks')}>
                          Reset Tasks Only
                        </Button>
                      </Flex>
                    </div>
                  )}
                </DangerSection>
              </Section>

              {/* Sample Data Generation */}
              <Section>
                <SectionTitle>
                  <StatusDot $status="neutral" style={{ backgroundColor: '#5B4599' }} />
                  Sample Data Generation
                </SectionTitle>
                <PurpleSection>
                  {sampleDataResult && (
                    <MessageAlert $variant={sampleDataResult.type === 'success' ? 'success' : 'error'} $isSuccess={sampleDataResult.type === 'success'}>
                      <div>{sampleDataResult.text}</div>
                      {sampleDataResult.personas && sampleDataResult.personas.length > 0 && (
                        <Text $variant="helper" style={{ marginTop: '0.5rem' }}>
                          Personas used: {sampleDataResult.personas.join(', ')}
                        </Text>
                      )}
                      <DismissButton onClick={() => setSampleDataResult(null)}>&times;</DismissButton>
                    </MessageAlert>
                  )}

                  <Text $variant="bodySmall" style={{ color: '#2A1563', marginBottom: '1rem' }}>
                    Generate sample survey responses for testing metrics and dashboards.
                  </Text>

                  {surveysData && surveysData.surveys.length > 0 ? (
                    <div>
                      {/* Survey Selection */}
                      <div style={{ marginBottom: '1rem' }}>
                        <Label>Select Survey</Label>
                        <Select
                          value={selectedSurveyId}
                          onChange={(e) => setSelectedSurveyId(e.target.value)}
                        >
                          <option value="">Choose a survey...</option>
                          {surveysData.surveys.map((s: { id: string; name: string; team_name: string; status: string; question_count: number; response_count: number; can_generate?: boolean }) => (
                            <option key={s.id} value={s.id} disabled={s.status !== 'active'}>
                              {s.status !== 'active' ? `[${s.status.toUpperCase()}] ` : ''}{s.name} ({s.team_name}) - {s.question_count}q, {s.response_count} responses
                            </option>
                          ))}
                        </Select>
                        {selectedSurveyId && surveysData.surveys.find((s: { id: string; status: string }) => s.id === selectedSurveyId)?.status !== 'active' && (
                          <Text $variant="helper" $color="error" style={{ marginTop: '0.25rem' }}>This survey must be activated before generating sample data.</Text>
                        )}
                      </div>

                      {/* Count and Mode */}
                      <Grid $columns={2} $gap="spacingLG">
                        <div>
                          <Label>Number of Responses</Label>
                          <NumberInput
                            type="number"
                            min={1}
                            max={50}
                            value={sampleCount}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSampleCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                            $fullWidth
                          />
                        </div>
                        <div>
                          <Label>Generation Mode</Label>
                          <Select
                            value={sampleMode}
                            onChange={(e) => setSampleMode(e.target.value as 'random' | 'persona')}
                          >
                            <option value="random">Random (fast)</option>
                            <option value="persona">Persona-based (LLM, realistic)</option>
                          </Select>
                        </div>
                      </Grid>

                      {/* Mode Description */}
                      <ModeDescription style={{ marginTop: '1rem' }}>
                        {sampleMode === 'random' ? (
                          <>
                            <strong>Random Mode:</strong> Generates statistically distributed random answers. Fast and good for stress testing.
                          </>
                        ) : (
                          <>
                            <strong>Persona Mode:</strong> Uses LLM to generate realistic answers from different employee personas
                            (e.g., "Frustrated Veteran", "Enthusiastic New Hire", "Burned Out Manager").
                            Slower but produces more realistic data patterns.
                            {surveysData.personas_available && (
                              <div style={{ marginTop: '0.25rem' }}>
                                Available personas: {surveysData.personas_available.slice(0, 4).join(', ')}
                                {surveysData.personas_available.length > 4 && ` + ${surveysData.personas_available.length - 4} more`}
                              </div>
                            )}
                          </>
                        )}
                      </ModeDescription>

                      {/* Generate Button */}
                      <Button
                        $fullWidth
                        style={{ marginTop: '1rem', backgroundColor: '#5B4599' }}
                        onClick={handleGenerateSampleData}
                        disabled={
                          generateSampleData.isPending ||
                          !selectedSurveyId ||
                          surveysData.surveys.find((s: { id: string; status: string }) => s.id === selectedSurveyId)?.status !== 'active'
                        }
                      >
                        {generateSampleData.isPending ? 'Generating...' : `Generate ${sampleCount} Sample Response${sampleCount > 1 ? 's' : ''}`}
                      </Button>
                    </div>
                  ) : (
                    <EmptyState>
                      <Text>No surveys with questions found.</Text>
                      <Text $variant="helper" style={{ marginTop: '0.25rem' }}>Create a survey and generate questions first, then activate it.</Text>
                    </EmptyState>
                  )}
                </PurpleSection>
              </Section>

              {/* Synced Occupations */}
              {status.synced_occupations.length > 0 && (
                <Section>
                  <SectionTitle>
                    Synced Occupations ({status.synced_occupations.length})
                  </SectionTitle>
                  <InfoBox style={{ padding: 0, overflow: 'hidden' }}>
                    <Table>
                      <TableHeader>
                        <tr>
                          <TableHeaderCell>Code</TableHeaderCell>
                          <TableHeaderCell>Name</TableHeaderCell>
                          <TableHeaderCell style={{ textAlign: 'center' }}>Tasks</TableHeaderCell>
                          <TableHeaderCell style={{ textAlign: 'center' }}>Teams</TableHeaderCell>
                          <TableHeaderCell style={{ textAlign: 'center' }}>Surveys</TableHeaderCell>
                          <TableHeaderCell style={{ textAlign: 'center' }}>Actions</TableHeaderCell>
                        </tr>
                      </TableHeader>
                      <tbody>
                        {status.synced_occupations.map((occ) => (
                          <TableRow key={occ.id}>
                            <TableCell>
                              <MonoText style={{ color: '#0080A7' }}>{occ.faethm_code || '-'}</MonoText>
                            </TableCell>
                            <TableCell>{occ.name}</TableCell>
                            <TableCellCenter>{occ.task_count}</TableCellCenter>
                            <TableCellCenter>{occ.team_count}</TableCellCenter>
                            <TableCellCenter>{occ.survey_count}</TableCellCenter>
                            <TableCellCenter>
                              <Flex $justify="center" $gap="spacingXS">
                                <ActionButtonSmall
                                  $variant="warning"
                                  onClick={() => handleResetOccupation(occ.id, occ.name)}
                                  disabled={resetOccupation.isPending}
                                  title="Reset task assignments"
                                >
                                  Reset
                                </ActionButtonSmall>
                                <ActionButtonSmall
                                  $variant="danger"
                                  onClick={() => handleDeleteOccupation(occ.id, occ.name)}
                                  disabled={deleteOccupation.isPending}
                                  title="Delete occupation"
                                >
                                  Delete
                                </ActionButtonSmall>
                              </Flex>
                            </TableCellCenter>
                          </TableRow>
                        ))}
                      </tbody>
                    </Table>
                  </InfoBox>
                </Section>
              )}
            </>
          ) : null}
        </ScrollableBody>

        {/* Footer */}
        <ModalFooter>
          <FooterContent>
            <RefreshButton onClick={() => refetch()}>
              Refresh Status
            </RefreshButton>
            <Button $variant="secondary" $size="sm" onClick={onClose}>
              Close
            </Button>
          </FooterContent>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  )
}

function StatCard({ label, value, icon: _icon }: { label: string; value: number; icon: string }) {
  return (
    <StatCardContainer>
      <StatValue>{value.toLocaleString()}</StatValue>
      <StatLabel>{label}</StatLabel>
    </StatCardContainer>
  )
}
