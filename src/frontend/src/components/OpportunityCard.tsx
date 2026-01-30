import styled, { css } from 'styled-components'
import type { Opportunity, OpportunityStatus, FrictionType } from '../api/types'

interface OpportunityCardProps {
  opportunity: Opportunity
  onStatusChange?: (newStatus: OpportunityStatus) => void
  compact?: boolean
}

const frictionTypeLabels: Record<FrictionType, string> = {
  clarity: 'Clarity',
  tooling: 'Tooling',
  process: 'Process',
  rework: 'Rework',
  delay: 'Delay',
  safety: 'Safety',
}

const statusLabels: Record<OpportunityStatus, string> = {
  identified: 'Identified',
  in_progress: 'In Progress',
  completed: 'Completed',
  deferred: 'Deferred',
}

// Styled Components
interface CardWrapperProps {
  $compact?: boolean
}

const CardWrapper = styled.div<CardWrapperProps>`
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  box-shadow: ${({ theme }) => theme.v1.shadows.sm};
  padding: ${({ theme, $compact }) => $compact ? theme.v1.spacing.spacingLG : theme.v1.spacing.spacing2XL};
`

const HeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.v1.spacing.spacingLG};
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingMD};
`

interface TitleProps {
  $compact?: boolean
}

const Title = styled.h3<TitleProps>`
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0;
  font-size: ${({ theme, $compact }) => $compact ? theme.v1.typography.sizes.bodyS : theme.v1.typography.sizes.bodyL};
`

const ScoreWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
  flex-shrink: 0;
`

const RiceScore = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.bold};
  color: ${({ theme }) => theme.v1.semanticColors.text.accent.primary};
`

const RiceLabel = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const Description = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingLG} 0;
`

const TagsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingLG};
`

interface TagProps {
  $bgColor: string
  $textColor: string
}

const Tag = styled.span<TagProps>`
  padding: ${({ theme }) => theme.v1.spacing.spacingXXS} ${({ theme }) => theme.v1.spacing.spacingSM};
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  border-radius: ${({ theme }) => theme.v1.radius.radiusPill};
  background-color: ${({ $bgColor }) => $bgColor};
  color: ${({ $textColor }) => $textColor};
`

const RiceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
  text-align: center;
  border-top: 1px solid ${({ theme }) => theme.v1.semanticColors.border.divider.light};
  padding-top: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const RiceItem = styled.div``

const RiceItemValue = styled.div`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
`

const RiceItemLabel = styled.div`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const ActionsRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
  margin-top: ${({ theme }) => theme.v1.spacing.spacingLG};
  padding-top: ${({ theme }) => theme.v1.spacing.spacingLG};
  border-top: 1px solid ${({ theme }) => theme.v1.semanticColors.border.divider.light};
`

interface ButtonBaseProps {
  $variant?: 'primary' | 'secondary'
  $fullWidth?: boolean
}

const Button = styled.button<ButtonBaseProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
  border: none;
  border-radius: ${({ theme }) => theme.v1.radius.radiusMD};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  padding: ${({ theme }) => theme.v1.spacing.spacingXS} ${({ theme }) => theme.v1.spacing.spacingMD};
  transition: all 0.2s ease;
  cursor: pointer;

  ${({ $fullWidth }) => $fullWidth && css`flex: 1;`}

  ${({ $variant = 'primary', theme }) => {
    if ($variant === 'secondary') {
      return css`
        background-color: transparent;
        color: ${theme.v1.semanticColors.text.action.default};
        border: 1px solid ${theme.v1.semanticColors.border.brand.default};
        &:hover:not(:disabled) {
          background-color: ${theme.v1.semanticColors.fill.highlight.brand.default};
          border-color: ${theme.v1.semanticColors.border.brand.hover};
        }
        &:active:not(:disabled) {
          background-color: ${theme.v1.semanticColors.fill.highlight.brand.active};
        }
      `
    }
    return css`
      background-color: ${theme.v1.semanticColors.fill.action.brand.default};
      color: ${theme.v1.semanticColors.text.inverse};
      &:hover:not(:disabled) {
        background-color: ${theme.v1.semanticColors.fill.action.brand.hover};
      }
      &:active:not(:disabled) {
        background-color: ${theme.v1.semanticColors.fill.action.brand.active};
      }
    `
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

// Color mappings for friction types and statuses
const frictionTypeColors: Record<FrictionType, { bg: string; text: string }> = {
  clarity: { bg: '#dbeafe', text: '#1e40af' },      // blue
  tooling: { bg: '#f3e8ff', text: '#6b21a8' },      // purple
  process: { bg: '#fef3c7', text: '#92400e' },      // amber
  rework: { bg: '#fee2e2', text: '#991b1b' },       // red
  delay: { bg: '#ffedd5', text: '#9a3412' },        // orange
  safety: { bg: '#d1fae5', text: '#065f46' },       // emerald
}

const statusColors: Record<OpportunityStatus, { bg: string; text: string }> = {
  identified: { bg: '#f3f4f6', text: '#1f2937' },   // gray
  in_progress: { bg: '#dbeafe', text: '#1e40af' }, // blue
  completed: { bg: '#dcfce7', text: '#166534' },   // green
  deferred: { bg: '#fef9c3', text: '#854d0e' },    // yellow
}

export function OpportunityCard({ opportunity, onStatusChange, compact = false }: OpportunityCardProps) {
  const { title, description, friction_type, rice_score, status, reach, impact, confidence, effort } = opportunity

  return (
    <CardWrapper $compact={compact}>
      <HeaderRow>
        <Title $compact={compact}>
          {title}
        </Title>
        <ScoreWrapper>
          <RiceScore>{rice_score.toFixed(1)}</RiceScore>
          <RiceLabel>RICE</RiceLabel>
        </ScoreWrapper>
      </HeaderRow>

      {!compact && description && (
        <Description>{description}</Description>
      )}

      {/* Tags */}
      <TagsRow>
        {friction_type && (
          <Tag
            $bgColor={frictionTypeColors[friction_type].bg}
            $textColor={frictionTypeColors[friction_type].text}
          >
            {frictionTypeLabels[friction_type]}
          </Tag>
        )}
        <Tag
          $bgColor={statusColors[status].bg}
          $textColor={statusColors[status].text}
        >
          {statusLabels[status]}
        </Tag>
      </TagsRow>

      {/* RICE breakdown */}
      {!compact && (
        <RiceGrid>
          <RiceItem>
            <RiceItemValue>{reach}</RiceItemValue>
            <RiceItemLabel>Reach</RiceItemLabel>
          </RiceItem>
          <RiceItem>
            <RiceItemValue>{impact}</RiceItemValue>
            <RiceItemLabel>Impact</RiceItemLabel>
          </RiceItem>
          <RiceItem>
            <RiceItemValue>{(confidence * 100).toFixed(0)}%</RiceItemValue>
            <RiceItemLabel>Confidence</RiceItemLabel>
          </RiceItem>
          <RiceItem>
            <RiceItemValue>{effort}</RiceItemValue>
            <RiceItemLabel>Effort (wks)</RiceItemLabel>
          </RiceItem>
        </RiceGrid>
      )}

      {/* Status change buttons */}
      {onStatusChange && (
        <ActionsRow>
          {status === 'identified' && (
            <Button
              onClick={() => onStatusChange('in_progress')}
              $variant="primary"
              $fullWidth
            >
              Start Working
            </Button>
          )}
          {status === 'in_progress' && (
            <>
              <Button
                onClick={() => onStatusChange('completed')}
                $variant="primary"
                $fullWidth
              >
                Mark Complete
              </Button>
              <Button
                onClick={() => onStatusChange('deferred')}
                $variant="secondary"
              >
                Defer
              </Button>
            </>
          )}
          {(status === 'completed' || status === 'deferred') && (
            <Button
              onClick={() => onStatusChange('in_progress')}
              $variant="secondary"
            >
              Reopen
            </Button>
          )}
        </ActionsRow>
      )}
    </CardWrapper>
  )
}
