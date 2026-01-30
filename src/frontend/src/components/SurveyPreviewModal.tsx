import { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import type { Survey, Question } from '../api/types'
import {
  ModalOverlay,
  ModalContent,
  Button,
  Heading,
  Text,
} from '../design-system/components'

interface SurveyPreviewModalProps {
  survey: Survey
  isOpen: boolean
  onClose: () => void
}

function getQuestionTypeLabel(type: string): string {
  switch (type) {
    case 'likert_5':
      return '5-point scale'
    case 'likert_7':
      return '7-point scale'
    case 'percentage_slider':
      return 'Percentage slider'
    case 'multiple_choice':
      return 'Multiple choice'
    case 'free_text':
      return 'Free text'
    default:
      return type
  }
}

function getDefaultOptions(type: string): string[] {
  if (type === 'likert_5') {
    return ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']
  }
  if (type === 'likert_7') {
    return ['Strongly Disagree', 'Disagree', 'Somewhat Disagree', 'Neutral', 'Somewhat Agree', 'Agree', 'Strongly Agree']
  }
  return []
}

// Styled Components
const ModalContentStyled = styled(ModalContent)`
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
`

const HeaderSection = styled.div`
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  padding: ${({ theme }) => theme.v1.spacing.spacingXL};
  border-bottom: 1px solid ${({ theme }) => theme.v1.semanticColors.border.divider.light};
`

const HeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
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

const ActionBar = styled.div`
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  padding: ${({ theme }) => theme.v1.spacing.spacingMD} ${({ theme }) => theme.v1.spacing.spacingXL};
  border-bottom: 1px solid ${({ theme }) => theme.v1.semanticColors.border.divider.light};
  display: flex;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
  flex-wrap: wrap;
`

const DimensionSummary = styled.div`
  margin-left: auto;
  display: flex;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
  align-items: center;
`

const DimensionLabel = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const DimensionBadge = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  padding: ${({ theme }) => theme.v1.spacing.spacingXS} ${({ theme }) => theme.v1.spacing.spacingSM};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
  text-transform: capitalize;
`

const ScrollableBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${({ theme }) => theme.v1.spacing.spacingXL};
`

const QuestionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const QuestionCard = styled.div`
  border: 1px solid ${({ theme }) => theme.v1.semanticColors.border.neutral.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  padding: ${({ theme }) => theme.v1.spacing.spacingLG};
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
`

const QuestionMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingSM};
`

const QuestionDimension = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.feedback.info.default};
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.feedback.info.subtle};
  padding: ${({ theme }) => theme.v1.spacing.spacingXXS} ${({ theme }) => theme.v1.spacing.spacingSM};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
  text-transform: capitalize;
`

const QuestionType = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const QuestionText = styled.p`
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingMD} 0;
`

const OptionsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
`

const OptionBadge = styled.span`
  padding: ${({ theme }) => theme.v1.spacing.spacingXS} ${({ theme }) => theme.v1.spacing.spacingMD};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.bold};
  border-radius: ${({ theme }) => theme.v1.radius.radiusPill};
`

const SliderContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.v1.spacing.spacingLG};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
`

const SliderTrack = styled.div`
  flex: 1;
  height: 8px;
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.neutral.dark};
  border-radius: ${({ theme }) => theme.v1.radius.radiusPill};
`

const FreeTextPlaceholder = styled.div`
  border: 1px solid ${({ theme }) => theme.v1.semanticColors.border.neutral.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
  padding: ${({ theme }) => theme.v1.spacing.spacingMD};
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  font-style: italic;
`

const FooterSection = styled.div`
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  padding: ${({ theme }) => theme.v1.spacing.spacingLG};
  border-top: 1px solid ${({ theme }) => theme.v1.semanticColors.border.divider.light};
`

const FooterNote = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  text-align: center;
  margin: 0;
`

const CopySuccessButton = styled(Button)`
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.feedback.success.bold};

  &:hover:not(:disabled) {
    background-color: ${({ theme }) => theme.v1.colors.status.green[700]};
  }
`

function QuestionPreview({ question, index }: { question: Question; index: number }) {
  const options = question.options?.choices || getDefaultOptions(question.type)

  return (
    <QuestionCard>
      <QuestionMeta>
        <QuestionDimension>
          {question.dimension.replace('_', ' ')}
        </QuestionDimension>
        <QuestionType>
          {getQuestionTypeLabel(question.type)}
        </QuestionType>
      </QuestionMeta>

      <QuestionText>
        {index + 1}. {question.text}
      </QuestionText>

      {/* Show answer options */}
      {(question.type === 'likert_5' || question.type === 'likert_7') && (
        <OptionsContainer>
          {options.map((option, i) => (
            <OptionBadge key={i}>
              {i + 1}. {option}
            </OptionBadge>
          ))}
        </OptionsContainer>
      )}

      {question.type === 'percentage_slider' && (
        <SliderContainer>
          <span>{question.options?.low_label || '0%'}</span>
          <SliderTrack />
          <span>{question.options?.high_label || '100%'}</span>
        </SliderContainer>
      )}

      {question.type === 'free_text' && (
        <FreeTextPlaceholder>
          Free text response...
        </FreeTextPlaceholder>
      )}
    </QuestionCard>
  )
}

export function SurveyPreviewModal({ survey, isOpen, onClose }: SurveyPreviewModalProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle')

  // Handle escape key to close modal
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, handleEscape])

  if (!isOpen) return null

  const sortedQuestions = [...(survey.questions || [])].sort((a, b) => a.order - b.order)

  // Group questions by dimension
  const groupedQuestions = sortedQuestions.reduce((acc, q) => {
    const dim = q.dimension
    if (!acc[dim]) acc[dim] = []
    acc[dim].push(q)
    return acc
  }, {} as Record<string, Question[]>)

  // Generate shareable text format
  const generateShareableText = () => {
    let text = `# ${survey.name}\n\n`
    text += `Estimated completion time: ${survey.estimated_completion_minutes} minutes\n`
    text += `Total questions: ${sortedQuestions.length}\n\n`
    text += `---\n\n`

    sortedQuestions.forEach((q, i) => {
      const options = q.options?.choices || getDefaultOptions(q.type)
      text += `**Q${i + 1}. [${q.dimension.replace('_', ' ').toUpperCase()}]**\n`
      text += `${q.text}\n\n`

      if (q.type === 'likert_5' || q.type === 'likert_7') {
        text += `*Options:*\n`
        options.forEach((opt, j) => {
          text += `  ${j + 1}. ${opt}\n`
        })
      } else if (q.type === 'percentage_slider') {
        text += `*Slider:* ${q.options?.low_label || '0%'} to ${q.options?.high_label || '100%'}\n`
      } else if (q.type === 'free_text') {
        text += `*Type:* Free text response\n`
      }
      text += `\n`
    })

    return text
  }

  const handleCopyText = async () => {
    const text = generateShareableText()
    await navigator.clipboard.writeText(text)
    setCopyStatus('copied')
    setTimeout(() => setCopyStatus('idle'), 2000)
  }

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContentStyled $size="lg" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        {/* Header */}
        <HeaderSection>
          <HeaderContent>
            <div>
              <Heading $level={3}>{survey.name}</Heading>
              <Text $variant="bodySmall" $color="subtle" style={{ marginTop: '0.25rem' }}>
                {sortedQuestions.length} questions | ~{survey.estimated_completion_minutes} min to complete
              </Text>
            </div>
            <CloseButton onClick={onClose}>
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </CloseButton>
          </HeaderContent>
        </HeaderSection>

        {/* Action Bar */}
        <ActionBar>
          {copyStatus === 'copied' ? (
            <CopySuccessButton $size="sm">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </CopySuccessButton>
          ) : (
            <Button $size="sm" onClick={handleCopyText}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy as Text
            </Button>
          )}
          <Button $size="sm" $variant="secondary" onClick={() => window.print()}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </Button>

          {/* Dimension summary */}
          <DimensionSummary>
            <DimensionLabel>Dimensions:</DimensionLabel>
            {Object.keys(groupedQuestions).map(dim => (
              <DimensionBadge key={dim}>
                {dim.replace('_', ' ')} ({groupedQuestions[dim].length})
              </DimensionBadge>
            ))}
          </DimensionSummary>
        </ActionBar>

        {/* Questions List */}
        <ScrollableBody>
          <QuestionsList>
            {sortedQuestions.map((question, index) => (
              <QuestionPreview key={question.id} question={question} index={index} />
            ))}
          </QuestionsList>
        </ScrollableBody>

        {/* Footer */}
        <FooterSection>
          <FooterNote>
            Responses are anonymous and will be aggregated with at least 6 others before being visible.
          </FooterNote>
        </FooterSection>
      </ModalContentStyled>
    </ModalOverlay>
  )
}
