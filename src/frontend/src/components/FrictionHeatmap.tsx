import styled from 'styled-components'
import type { FrictionDimension } from '../api/hooks'

interface FrictionHeatmapProps {
  dimensions: FrictionDimension[]
  overallScore?: number
  isLoading?: boolean
}

// Styled Components
const HeatmapCard = styled.div`
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  box-shadow: ${({ theme }) => theme.v1.shadows.sm};
  padding: ${({ theme }) => theme.v1.spacing.spacingXL};
`

const CardHeader = styled.h3`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingLG} 0;
`

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const HeaderTitle = styled.h3`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0;
`

const OverallScoreWrapper = styled.div`
  text-align: right;
`

const OverallScoreLabel = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const OverallScoreValue = styled.span`
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
`

const HeatmapGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.v1.spacing.spacingMD};

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`

const SkeletonCell = styled.div`
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.neutral.skeleton};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  height: 96px;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`

const EmptyStateWrapper = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.v1.spacing.spacing3XL} 0;
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const EmptyStateText = styled.p`
  margin: 0;
`

const EmptyStateSubtext = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  margin-top: ${({ theme }) => theme.v1.spacing.spacingXS};
`

interface HeatmapCellProps {
  $bgColor: string
}

const HeatmapCell = styled.div<HeatmapCellProps>`
  position: relative;
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  padding: ${({ theme }) => theme.v1.spacing.spacingLG};
  transition: transform 0.2s ease;
  cursor: default;
  background-color: ${({ $bgColor }) => $bgColor};

  &:hover {
    transform: scale(1.05);
  }
`

interface CellTextProps {
  $textColor: string
}

const ScoreValue = styled.div<CellTextProps>`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleM};
  font-weight: ${({ theme }) => theme.v1.typography.weights.bold};
  color: ${({ $textColor }) => $textColor};
`

const DimensionLabel = styled.div<CellTextProps>`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  opacity: 0.9;
  color: ${({ $textColor }) => $textColor};
`

const ScoreLabel = styled.div<CellTextProps>`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  opacity: 0.75;
  margin-top: ${({ theme }) => theme.v1.spacing.spacingXS};
  color: ${({ $textColor }) => $textColor};
`

const LegendWrapper = styled.div`
  margin-top: ${({ theme }) => theme.v1.spacing.spacingLG};
  padding-top: ${({ theme }) => theme.v1.spacing.spacingLG};
  border-top: 1px solid ${({ theme }) => theme.v1.semanticColors.border.divider.light};
`

const LegendRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.v1.spacing.spacingXS};
`

interface LegendColorBoxProps {
  $color: string
}

const LegendColorBox = styled.div<LegendColorBoxProps>`
  width: 12px;
  height: 12px;
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
  background-color: ${({ $color }) => $color};
`

const DetailsSection = styled.details`
  margin-top: ${({ theme }) => theme.v1.spacing.spacingLG};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
`

const DetailsSummary = styled.summary`
  cursor: pointer;
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};

  &:hover {
    color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  }
`

const DescriptionsList = styled.div`
  margin-top: ${({ theme }) => theme.v1.spacing.spacingSM};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
`

const DescriptionItem = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
`

const DescriptionLabel = styled.span`
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  width: 80px;
  flex-shrink: 0;
`

// Color constants for heatmap
const HEATMAP_COLORS = {
  highFriction: { bg: '#ef4444', text: '#ffffff' },      // High friction - bad (red)
  mediumHigh: { bg: '#f97316', text: '#ffffff' },        // Medium-high friction (orange)
  medium: { bg: '#fbbf24', text: '#78350f' },            // Medium friction (amber)
  lowMedium: { bg: '#a3e635', text: '#365314' },         // Low-medium friction (lime)
  low: { bg: '#22c55e', text: '#ffffff' },               // Low friction - good (green)
}

function getScoreColor(score: number): { bg: string; text: string } {
  // For friction, lower is BETTER (less friction)
  // So we invert: high score = red (bad), low score = green (good)
  if (score >= 75) return HEATMAP_COLORS.highFriction
  if (score >= 60) return HEATMAP_COLORS.mediumHigh
  if (score >= 40) return HEATMAP_COLORS.medium
  if (score >= 25) return HEATMAP_COLORS.lowMedium
  return HEATMAP_COLORS.low
}

function getScoreLabel(score: number): string {
  if (score >= 75) return 'High Friction'
  if (score >= 60) return 'Elevated'
  if (score >= 40) return 'Moderate'
  if (score >= 25) return 'Low'
  return 'Minimal'
}

export function FrictionHeatmap({ dimensions, overallScore, isLoading }: FrictionHeatmapProps) {
  if (isLoading) {
    return (
      <HeatmapCard>
        <CardHeader>Friction Heatmap</CardHeader>
        <HeatmapGrid>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCell key={i} />
          ))}
        </HeatmapGrid>
      </HeatmapCard>
    )
  }

  if (!dimensions || dimensions.length === 0) {
    return (
      <HeatmapCard>
        <CardHeader>Friction Heatmap</CardHeader>
        <EmptyStateWrapper>
          <EmptyStateText>No friction data available yet.</EmptyStateText>
          <EmptyStateSubtext>Complete a survey to see friction breakdown by dimension.</EmptyStateSubtext>
        </EmptyStateWrapper>
      </HeatmapCard>
    )
  }

  return (
    <HeatmapCard>
      <HeaderRow>
        <HeaderTitle>Friction Heatmap</HeaderTitle>
        {overallScore !== undefined && (
          <OverallScoreWrapper>
            <OverallScoreLabel>Overall: </OverallScoreLabel>
            <OverallScoreValue>{Math.round(overallScore)}</OverallScoreValue>
          </OverallScoreWrapper>
        )}
      </HeaderRow>

      {/* Heatmap grid */}
      <HeatmapGrid>
        {dimensions.map((dim) => {
          const colors = getScoreColor(dim.score)
          return (
            <HeatmapCell
              key={dim.dimension}
              $bgColor={colors.bg}
              title={dim.description}
            >
              <ScoreValue $textColor={colors.text}>{Math.round(dim.score)}</ScoreValue>
              <DimensionLabel $textColor={colors.text}>{dim.label}</DimensionLabel>
              <ScoreLabel $textColor={colors.text}>{getScoreLabel(dim.score)}</ScoreLabel>
            </HeatmapCell>
          )
        })}
      </HeatmapGrid>

      {/* Legend */}
      <LegendWrapper>
        <LegendRow>
          <LegendItem>
            <LegendColorBox $color={HEATMAP_COLORS.low.bg} />
            <span>Low Friction (Good)</span>
          </LegendItem>
          <LegendItem>
            <LegendColorBox $color={HEATMAP_COLORS.highFriction.bg} />
            <span>High Friction (Needs Attention)</span>
          </LegendItem>
        </LegendRow>
      </LegendWrapper>

      {/* Dimension descriptions */}
      <DetailsSection>
        <DetailsSummary>
          View dimension descriptions
        </DetailsSummary>
        <DescriptionsList>
          {dimensions.map((dim) => (
            <DescriptionItem key={dim.dimension}>
              <DescriptionLabel>{dim.label}:</DescriptionLabel>
              <span>{dim.description}</span>
            </DescriptionItem>
          ))}
        </DescriptionsList>
      </DetailsSection>
    </HeatmapCard>
  )
}
