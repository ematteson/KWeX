import styled from 'styled-components'
import { useSurveyQuestionMapping } from '../api/hooks'
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
  Flex,
} from '../design-system/components'

interface QuestionMappingModalProps {
  surveyId: string
  isOpen: boolean
  onClose: () => void
}

type DimensionType = 'clarity' | 'tooling' | 'process' | 'rework' | 'delay' | 'safety'

// Styled Components
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

const SummaryStats = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.v1.spacing.spacingLG};
  margin-top: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const StatPill = styled.div`
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
  padding: ${({ theme }) => theme.v1.spacing.spacingXS} ${({ theme }) => theme.v1.spacing.spacingMD};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
`

const StatLabel = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const StatValue = styled.span`
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
`

const ScrollableBody = styled(ModalBody)`
  max-height: calc(90vh - 250px);
  overflow-y: auto;
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

const DimensionLegend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
  padding-bottom: ${({ theme }) => theme.v1.spacing.spacingLG};
  border-bottom: 1px solid ${({ theme }) => theme.v1.semanticColors.border.divider.light};
  align-items: center;
`

const LegendLabel = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const DimensionBadge = styled.span<{ $dimension: DimensionType }>`
  padding: ${({ theme }) => theme.v1.spacing.spacingXXS} ${({ theme }) => theme.v1.spacing.spacingSM};
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
  border: 1px solid;

  ${({ theme, $dimension }) => {
    const colors: Record<DimensionType, { bg: string; text: string; border: string }> = {
      clarity: {
        bg: theme.v1.semanticColors.fill.feedback.info.subtle,
        text: theme.v1.semanticColors.text.feedback.info.default,
        border: theme.v1.colors.status.blue[25],
      },
      tooling: {
        bg: theme.v1.semanticColors.fill.feedback.help.subtle,
        text: theme.v1.semanticColors.text.feedback.help.default,
        border: theme.v1.colors.status.purple[25],
      },
      process: {
        bg: theme.v1.semanticColors.fill.feedback.success.subtle,
        text: theme.v1.semanticColors.text.feedback.success.default,
        border: theme.v1.colors.status.green[25],
      },
      rework: {
        bg: theme.v1.semanticColors.fill.feedback.orange.subtle,
        text: theme.v1.semanticColors.text.feedback.orange.default,
        border: theme.v1.colors.status.orange[25],
      },
      delay: {
        bg: theme.v1.semanticColors.fill.feedback.error.subtle,
        text: theme.v1.semanticColors.text.feedback.error.default,
        border: theme.v1.colors.status.red[25],
      },
      safety: {
        bg: theme.v1.semanticColors.fill.feedback.warning.subtle,
        text: theme.v1.semanticColors.text.feedback.warning.default,
        border: theme.v1.colors.status.yellow[25],
      },
    }
    const color = colors[$dimension] || colors.clarity
    return `
      background-color: ${color.bg};
      color: ${color.text};
      border-color: ${color.border};
    `
  }}
`

const QuestionsList = styled.div`
  margin-top: ${({ theme }) => theme.v1.spacing.spacingLG};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.v1.spacing.spacingMD};
`

const QuestionCard = styled.div`
  border: 1px solid ${({ theme }) => theme.v1.semanticColors.border.neutral.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  padding: ${({ theme }) => theme.v1.spacing.spacingLG};
  transition: border-color 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.v1.semanticColors.border.neutral.dark};
  }
`

const QuestionNumber = styled.div`
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
`

const QuestionContent = styled.div`
  flex: 1;
  min-width: 0;
`

const QuestionText = styled.p`
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0;
`

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
  margin-top: ${({ theme }) => theme.v1.spacing.spacingSM};
`

const Arrow = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const MetricBadge = styled.span`
  padding: ${({ theme }) => theme.v1.spacing.spacingXXS} ${({ theme }) => theme.v1.spacing.spacingSM};
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.bold};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
`

const TaskBox = styled.div`
  margin-top: ${({ theme }) => theme.v1.spacing.spacingMD};
  padding-left: ${({ theme }) => theme.v1.spacing.spacingMD};
  border-left: 2px solid ${({ theme }) => theme.v1.semanticColors.fill.action.brand.default};
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.highlight.brand.default};
  border-radius: 0 ${({ theme }) => theme.v1.radius.radiusSM} ${({ theme }) => theme.v1.radius.radiusSM} 0;
  padding: ${({ theme }) => theme.v1.spacing.spacingSM};
`

const TaskLabel = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.action.default};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  margin: 0;
`

const TaskName = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: ${({ theme }) => theme.v1.spacing.spacingXS} 0 0 0;
`

const TaskDescription = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  margin: ${({ theme }) => theme.v1.spacing.spacingXS} 0 0 0;
`

const TaskId = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  font-family: monospace;
  margin: ${({ theme }) => theme.v1.spacing.spacingXS} 0 0 0;
`

const GeneralQuestionNote = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  font-style: italic;
  margin-top: ${({ theme }) => theme.v1.spacing.spacingSM};
  display: block;
`

const ExplanationBox = styled.div`
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  padding: ${({ theme }) => theme.v1.spacing.spacingLG};
  margin-top: ${({ theme }) => theme.v1.spacing.spacing2XL};
`

const ExplanationTitle = styled.h4`
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingSM} 0;
`

const ExplanationList = styled.ul`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  margin: 0;
  padding-left: ${({ theme }) => theme.v1.spacing.spacingXL};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.v1.spacing.spacingXS};
`

const metricLabels: Record<string, string> = {
  flow: 'Flow',
  friction: 'Friction',
  safety: 'Safety',
  portfolio_balance: 'Portfolio',
}

export function QuestionMappingModal({ surveyId, isOpen, onClose }: QuestionMappingModalProps) {
  const { data: mapping, isLoading, error } = useSurveyQuestionMapping(surveyId)

  if (!isOpen) return null

  return (
    <ModalOverlay>
      <ModalContent $size="lg">
        {/* Header */}
        <ModalHeader>
          <HeaderWrapper>
            <Heading $level={3}>Question to Task Mapping</Heading>
            {mapping && (
              <Text $variant="bodySmall" $color="subtle" style={{ marginTop: '0.25rem' }}>
                {mapping.survey_name} - {mapping.occupation_name}
                {mapping.occupation_faethm_code && (
                  <span style={{ fontFamily: 'monospace', marginLeft: '0.25rem' }}>({mapping.occupation_faethm_code})</span>
                )}
              </Text>
            )}

            {/* Summary Stats */}
            {mapping && (
              <SummaryStats>
                <StatPill>
                  <StatLabel>Total Questions: </StatLabel>
                  <StatValue>{mapping.total_questions}</StatValue>
                </StatPill>
                <StatPill>
                  <StatLabel>Task-Specific: </StatLabel>
                  <StatValue>{mapping.questions_with_tasks}</StatValue>
                </StatPill>
                <StatPill>
                  <StatLabel>General: </StatLabel>
                  <StatValue>{mapping.total_questions - mapping.questions_with_tasks}</StatValue>
                </StatPill>
              </SummaryStats>
            )}
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
              <Text $color="subtle" style={{ marginTop: '0.5rem' }}>Loading mapping...</Text>
            </LoadingContainer>
          ) : error ? (
            <ErrorContainer>
              <Text $color="error">Failed to load question mapping</Text>
            </ErrorContainer>
          ) : mapping ? (
            <>
              {/* Dimension Legend */}
              <DimensionLegend>
                <LegendLabel>Friction Dimensions:</LegendLabel>
                {(['clarity', 'tooling', 'process', 'rework', 'delay', 'safety'] as DimensionType[]).map((dim) => (
                  <DimensionBadge key={dim} $dimension={dim}>
                    {dim.charAt(0).toUpperCase() + dim.slice(1)}
                  </DimensionBadge>
                ))}
              </DimensionLegend>

              {/* Questions List */}
              <QuestionsList>
                {mapping.questions.map((q, index) => (
                  <QuestionCard key={q.question_id}>
                    <Flex $gap="spacingMD" $align="start">
                      {/* Question Number */}
                      <QuestionNumber>{index + 1}</QuestionNumber>

                      <QuestionContent>
                        {/* Question Text */}
                        <QuestionText>{q.question_text}</QuestionText>

                        {/* Dimension and Metrics */}
                        <MetaRow>
                          <DimensionBadge $dimension={q.dimension as DimensionType}>
                            {q.dimension_label}
                          </DimensionBadge>

                          {q.metric_mapping.length > 0 && <Arrow>-&gt;</Arrow>}

                          {q.metric_mapping.map((metric) => (
                            <MetricBadge key={metric}>
                              {metricLabels[metric] || metric}
                            </MetricBadge>
                          ))}
                        </MetaRow>

                        {/* Task Mapping (if any) */}
                        {q.task_id && (
                          <TaskBox>
                            <TaskLabel>Linked to Faethm Task</TaskLabel>
                            <TaskName>{q.task_name}</TaskName>
                            {q.task_description && (
                              <TaskDescription>{q.task_description}</TaskDescription>
                            )}
                            {q.faethm_task_id && (
                              <TaskId>Task ID: {q.faethm_task_id}</TaskId>
                            )}
                          </TaskBox>
                        )}

                        {/* No Task - General Question */}
                        {!q.task_id && (
                          <GeneralQuestionNote>
                            General question (not task-specific)
                          </GeneralQuestionNote>
                        )}
                      </QuestionContent>
                    </Flex>
                  </QuestionCard>
                ))}
              </QuestionsList>

              {/* Explanation */}
              <ExplanationBox>
                <ExplanationTitle>Understanding the Mapping</ExplanationTitle>
                <ExplanationList>
                  <li>
                    <strong>Friction Dimensions</strong>: Each question measures a specific type of friction
                    (Clarity, Tooling, Process, Rework, Delay, or Safety)
                  </li>
                  <li>
                    <strong>Metric Mapping</strong>: Shows which Core 4 metrics this question contributes to
                    (Flow, Friction, Safety, Portfolio Balance)
                  </li>
                  <li>
                    <strong>Task-Specific Questions</strong>: Linked to specific Faethm occupation tasks for
                    contextual relevance
                  </li>
                  <li>
                    <strong>General Questions</strong>: Apply broadly to the role without task-specific context
                  </li>
                </ExplanationList>
              </ExplanationBox>
            </>
          ) : null}
        </ScrollableBody>

        {/* Footer */}
        <ModalFooter>
          <Button $variant="secondary" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  )
}
