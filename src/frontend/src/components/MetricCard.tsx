import styled, { css, keyframes } from 'styled-components'
import type { TrendDirection } from '../api/types'

interface MetricCardProps {
  title: string
  value: number | null
  description: string
  trend?: TrendDirection | null
  isLoading?: boolean
  invertColors?: boolean // For metrics where lower is better (like Friction)
}

type ScoreStatus = 'excellent' | 'good' | 'warning' | 'poor'

function getScoreStatus(score: number, invert = false): ScoreStatus {
  const adjustedScore = invert ? 100 - score : score
  if (adjustedScore >= 75) return 'excellent'
  if (adjustedScore >= 50) return 'good'
  if (adjustedScore >= 25) return 'warning'
  return 'poor'
}

// Styled Components
const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`

const CardContainer = styled.div<{ $status: ScoreStatus | null }>`
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  box-shadow: ${({ theme }) => theme.v1.shadows.sm};
  padding: ${({ theme }) => theme.v1.spacing.spacingXL};
  border-left: 4px solid transparent;

  ${({ $status, theme }) => {
    switch ($status) {
      case 'excellent':
        return css`border-left-color: ${theme.v1.semanticColors.fill.feedback.success.bold};`
      case 'good':
        return css`border-left-color: ${theme.v1.semanticColors.fill.feedback.info.bold};`
      case 'warning':
        return css`border-left-color: ${theme.v1.semanticColors.fill.feedback.warning.bold};`
      case 'poor':
        return css`border-left-color: ${theme.v1.semanticColors.fill.feedback.error.bold};`
      default:
        return css`border-left-color: ${theme.v1.semanticColors.border.neutral.default};`
    }
  }}
`

const LoadingCard = styled.div`
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  box-shadow: ${({ theme }) => theme.v1.shadows.sm};
  padding: ${({ theme }) => theme.v1.spacing.spacingXL};
  animation: ${pulse} 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
`

const SkeletonLine = styled.div<{ $width: string; $height: string }>`
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.neutral.skeleton};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
  width: ${({ $width }) => $width};
  height: ${({ $height }) => $height};
`

const SkeletonTitle = styled(SkeletonLine)`
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingMD};
`

const SkeletonValue = styled(SkeletonLine)`
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingSM};
`

const Title = styled.h3`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingXS} 0;
`

const ValueContainer = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingSM};
`

const Value = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.displayM};
  font-weight: ${({ theme }) => theme.v1.typography.weights.bold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
`

const ValueSuffix = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const NoDataText = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyL};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const Description = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingMD} 0;
`

const TrendContainer = styled.span<{ $direction: TrendDirection }>`
  display: flex;
  align-items: center;
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};

  ${({ $direction, theme }) => {
    switch ($direction) {
      case 'up':
        return css`color: ${theme.v1.semanticColors.text.feedback.success.vibrant};`
      case 'down':
        return css`color: ${theme.v1.semanticColors.text.feedback.error.vibrant};`
      default:
        return css`color: ${theme.v1.semanticColors.text.body.subtle};`
    }
  }}
`

const TrendIcon = styled.svg`
  width: 1rem;
  height: 1rem;
  margin-right: ${({ theme }) => theme.v1.spacing.spacingXS};
`

function TrendIndicator({ direction }: { direction: TrendDirection }) {
  if (direction === 'up') {
    return (
      <TrendContainer $direction="up">
        <TrendIcon fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </TrendIcon>
        Improving
      </TrendContainer>
    )
  }
  if (direction === 'down') {
    return (
      <TrendContainer $direction="down">
        <TrendIcon fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </TrendIcon>
        Declining
      </TrendContainer>
    )
  }
  return (
    <TrendContainer $direction="stable">
      <TrendIcon fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </TrendIcon>
      Stable
    </TrendContainer>
  )
}

export function MetricCard({ title, value, description, trend, isLoading, invertColors = false }: MetricCardProps) {
  const status = value !== null ? getScoreStatus(value, invertColors) : null

  if (isLoading) {
    return (
      <LoadingCard>
        <SkeletonTitle $width="6rem" $height="1rem" />
        <SkeletonValue $width="5rem" $height="2.5rem" />
        <SkeletonLine $width="8rem" $height="0.75rem" />
      </LoadingCard>
    )
  }

  return (
    <CardContainer $status={status}>
      <Title>{title}</Title>

      <ValueContainer>
        {value !== null ? (
          <>
            <Value>{Math.round(value)}</Value>
            <ValueSuffix>/100</ValueSuffix>
          </>
        ) : (
          <NoDataText>Insufficient data</NoDataText>
        )}
      </ValueContainer>

      <Description>{description}</Description>

      {trend && <TrendIndicator direction={trend} />}
    </CardContainer>
  )
}
