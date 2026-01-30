import { useParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { useTeam, useTeamMetrics, useOpportunitySummary, useFrictionBreakdown, useMetricsHistory } from '../api/hooks'
import { MetricCard } from '../components/MetricCard'
import { FrictionHeatmap } from '../components/FrictionHeatmap'
import { MetricsTrendChart } from '../components/MetricsTrendChart'
import { SurveyManagement } from '../components/SurveyManagement'
import { PsychSafetyCard } from '../components/PsychSafetyCard'
import { Card, CardTitle, Badge } from '../design-system/components'

// =============================================================================
// ANIMATIONS
// =============================================================================

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.v1.spacing.spacing3XL};
`

const HeaderSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.v1.spacing.spacingLG};

  @media (min-width: 640px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`

const BackLink = styled(Link)`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.link.brand.default};
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingSM};
  display: inline-block;

  &:hover {
    text-decoration: underline;
    color: ${({ theme }) => theme.v1.semanticColors.text.link.brand.hover};
  }
`

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleL};
  font-weight: ${({ theme }) => theme.v1.typography.weights.bold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0;
`

const TitleSkeleton = styled.span`
  display: inline-block;
  height: 2rem;
  width: 12rem;
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.neutral.skeleton};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
  animation: ${pulse} 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
`

const TeamInfo = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  margin-top: ${({ theme }) => theme.v1.spacing.spacingXS};
`

const ButtonGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.v1.spacing.spacingMD};
`

const SecondaryButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.v1.spacing.spacingSM} ${({ theme }) => theme.v1.spacing.spacingXL};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.action.default};
  background-color: transparent;
  border: 1px solid ${({ theme }) => theme.v1.semanticColors.border.brand.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusMD};
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${({ theme }) => theme.v1.semanticColors.fill.highlight.brand.default};
    border-color: ${({ theme }) => theme.v1.semanticColors.border.brand.hover};
    color: ${({ theme }) => theme.v1.semanticColors.text.action.hover};
  }
`

const WarningAlert = styled.div`
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.feedback.warning.subtle};
  border: 1px solid ${({ theme }) => theme.v1.semanticColors.border.feedback.warning};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  padding: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const AlertContent = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.v1.spacing.spacingMD};
`

const AlertIcon = styled.svg`
  width: 1.25rem;
  height: 1.25rem;
  color: ${({ theme }) => theme.v1.semanticColors.icon.feedback.warning.vibrant};
  flex-shrink: 0;
  margin-top: 0.125rem;
`

const AlertTitle = styled.h3`
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.feedback.warning.default};
  margin: 0;
`

const AlertDescription = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.feedback.warning.default};
  margin-top: ${({ theme }) => theme.v1.spacing.spacingXS};
`

const Section = styled.section``

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const MetricsGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.v1.spacing.spacingLG};
  grid-template-columns: 1fr;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
`

const TwoColumnGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.v1.spacing.spacing2XL};
  grid-template-columns: 1fr;

  @media (min-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
`

const PortfolioCard = styled(Card)`
  display: flex;
  flex-direction: column;
`

const PortfolioContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const StackedBar = styled.div`
  display: flex;
  height: 2.5rem;
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
`

const BarSegment = styled.div<{ $color: 'emerald' | 'blue' | 'red'; $width: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${({ $width }) => $width}%;
  transition: all 0.3s ease;

  ${({ $color, theme }) => {
    switch ($color) {
      case 'emerald':
        return `background-color: ${theme.v1.semanticColors.fill.feedback.success.bold};`
      case 'blue':
        return `background-color: ${theme.v1.semanticColors.fill.feedback.info.bold};`
      case 'red':
        return `background-color: ${theme.v1.semanticColors.fill.feedback.error.bold};`
    }
  }}
`

const BarLabel = styled.span`
  color: ${({ theme }) => theme.v1.semanticColors.text.inverse};
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
`

const LegendGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
`

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
`

const LegendDot = styled.div<{ $color: 'emerald' | 'blue' | 'red' }>`
  width: 0.75rem;
  height: 0.75rem;
  border-radius: ${({ theme }) => theme.v1.radius.radiusCircle};

  ${({ $color, theme }) => {
    switch ($color) {
      case 'emerald':
        return `background-color: ${theme.v1.semanticColors.fill.feedback.success.bold};`
      case 'blue':
        return `background-color: ${theme.v1.semanticColors.fill.feedback.info.bold};`
      case 'red':
        return `background-color: ${theme.v1.semanticColors.fill.feedback.error.bold};`
    }
  }}
`

const LegendLabel = styled.span`
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.bold};
`

const LegendValue = styled.span`
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  margin-left: ${({ theme }) => theme.v1.spacing.spacingXS};
`

const DescriptionsSection = styled.div`
  margin-top: ${({ theme }) => theme.v1.spacing.spacingSM};
  padding-top: ${({ theme }) => theme.v1.spacing.spacingLG};
  border-top: 1px solid ${({ theme }) => theme.v1.semanticColors.border.divider.light};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
`

const DescriptionText = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  margin: 0;
`

const DescriptionLabel = styled.strong<{ $color: 'emerald' | 'blue' | 'red' }>`
  ${({ $color, theme }) => {
    switch ($color) {
      case 'emerald':
        return `color: ${theme.v1.semanticColors.text.feedback.success.vibrant};`
      case 'blue':
        return `color: ${theme.v1.semanticColors.text.feedback.info.vibrant};`
      case 'red':
        return `color: ${theme.v1.semanticColors.text.feedback.error.vibrant};`
    }
  }}
`

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.v1.spacing.spacing3XL} 0;
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const EmptyStateHint = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  margin-top: ${({ theme }) => theme.v1.spacing.spacingXS};
`

const OpportunitiesHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const ViewAllLink = styled(Link)`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.link.brand.default};

  &:hover {
    text-decoration: underline;
  }
`

const OpportunitiesGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.v1.spacing.spacingLG};
  grid-template-columns: 1fr;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`

const OpportunityCard = styled(Card)``

const OpportunityHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const OpportunityTitle = styled.h3`
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0;
`

const ScoreContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.v1.spacing.spacingXS};
  flex-shrink: 0;
`

const ScoreValue = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.bold};
  color: ${({ theme }) => theme.v1.semanticColors.text.accent.primary};
`

const ScoreLabel = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const FrictionBadge = styled(Badge)`
  margin-top: ${({ theme }) => theme.v1.spacing.spacingSM};
`

const LoadingSkeleton = styled.div`
  height: 1rem;
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.neutral.skeleton};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
  animation: ${pulse} 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
`

const SkeletonTitle = styled(LoadingSkeleton)`
  height: 1.25rem;
  width: 12rem;
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingMD};
`

const SkeletonLine = styled(LoadingSkeleton)`
  width: 100%;
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingSM};

  &:last-child {
    width: 75%;
  }
`

const EmptyOpportunities = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.v1.spacing.spacing3XL} 0;
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  border: 1px solid ${({ theme }) => theme.v1.semanticColors.border.neutral.default};
`

const EmptyOpportunitiesText = styled.p`
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
`

const EmptyOpportunitiesHint = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  margin-top: ${({ theme }) => theme.v1.spacing.spacingXS};
`

// =============================================================================
// COMPONENT
// =============================================================================

export function TeamDashboard() {
  const { teamId } = useParams<{ teamId: string }>()
  const { data: team, isLoading: teamLoading } = useTeam(teamId || '')
  const { data: metrics, isLoading: metricsLoading } = useTeamMetrics(teamId || '')
  const { data: opportunitySummary, isLoading: oppsLoading } = useOpportunitySummary(teamId || '')
  const { data: frictionBreakdown, isLoading: frictionLoading } = useFrictionBreakdown(teamId || '')
  const { data: metricsHistory, isLoading: historyLoading } = useMetricsHistory(teamId || '')

  const isLoading = teamLoading || metricsLoading

  // Check if metrics response indicates privacy threshold not met
  const meetsPrivacyThreshold = metrics && 'meets_privacy_threshold' in metrics ? metrics.meets_privacy_threshold : true

  return (
    <PageContainer>
      {/* Header */}
      <HeaderSection>
        <div>
          <BackLink to="/teams">
            ← Back to Teams
          </BackLink>
          <PageTitle>
            {teamLoading ? (
              <TitleSkeleton />
            ) : (
              team?.name || 'Team Dashboard'
            )}
          </PageTitle>
          {team && (
            <TeamInfo>
              {team.function} • {team.member_count} members
            </TeamInfo>
          )}
        </div>

        <ButtonGroup>
          <SecondaryButton to={`/teams/${teamId}/opportunities`}>
            View All Opportunities
          </SecondaryButton>
        </ButtonGroup>
      </HeaderSection>

      {/* Privacy threshold warning */}
      {!meetsPrivacyThreshold && (
        <WarningAlert>
          <AlertContent>
            <AlertIcon fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </AlertIcon>
            <div>
              <AlertTitle>Privacy Threshold Not Met</AlertTitle>
              <AlertDescription>
                Detailed metrics require at least 7 survey responses to protect individual privacy.
                Current responses: {metrics && 'respondent_count' in metrics ? metrics.respondent_count : 0}
              </AlertDescription>
            </div>
          </AlertContent>
        </WarningAlert>
      )}

      {/* Core 4 Metrics Grid */}
      <Section>
        <SectionTitle>Core 4 Metrics</SectionTitle>
        <MetricsGrid>
          <MetricCard
            title="Flow"
            value={metrics?.flow_score ?? null}
            description="Value-adding work throughput"
            trend={metrics?.trend_direction}
            isLoading={isLoading}
          />
          <MetricCard
            title="Friction"
            value={metrics?.friction_score ?? null}
            description="Workflow inefficiency signals"
            trend={metrics?.trend_direction}
            isLoading={isLoading}
            invertColors // Lower friction is better
          />
          <MetricCard
            title="Safety"
            value={metrics?.safety_score ?? null}
            description="Quality and risk indicators"
            trend={metrics?.trend_direction}
            isLoading={isLoading}
          />
          <MetricCard
            title="Portfolio Balance"
            value={metrics?.portfolio_balance_score ?? null}
            description="Run vs Change work ratio"
            trend={metrics?.trend_direction}
            isLoading={isLoading}
          />
        </MetricsGrid>
      </Section>

      {/* Metrics Trends Chart - Full width */}
      <MetricsTrendChart
        data={metricsHistory || []}
        isLoading={historyLoading}
      />

      {/* Two-column layout: Friction Heatmap + Portfolio Distribution */}
      <TwoColumnGrid>
        {/* Friction Heatmap */}
        <FrictionHeatmap
          dimensions={frictionBreakdown?.dimensions || []}
          overallScore={frictionBreakdown?.overall_friction_score}
          isLoading={frictionLoading}
        />

        {/* Portfolio Breakdown - Value Adding / Value Enabling / Waste */}
        <PortfolioCard>
          <CardTitle>Time Allocation Health</CardTitle>
          {metrics?.portfolio_breakdown && meetsPrivacyThreshold ? (
            <PortfolioContent>
              {/* Three-way stacked bar */}
              <StackedBar>
                <BarSegment
                  $color="emerald"
                  $width={metrics.portfolio_breakdown.value_adding_pct || metrics.portfolio_breakdown.change_percentage || 0}
                  title="Value Adding"
                >
                  {(metrics.portfolio_breakdown.value_adding_pct || metrics.portfolio_breakdown.change_percentage || 0) >= 15 && (
                    <BarLabel>
                      {Math.round(metrics.portfolio_breakdown.value_adding_pct || metrics.portfolio_breakdown.change_percentage || 0)}%
                    </BarLabel>
                  )}
                </BarSegment>
                <BarSegment
                  $color="blue"
                  $width={metrics.portfolio_breakdown.value_enabling_pct || metrics.portfolio_breakdown.run_percentage || 0}
                  title="Value Enabling"
                >
                  {(metrics.portfolio_breakdown.value_enabling_pct || metrics.portfolio_breakdown.run_percentage || 0) >= 15 && (
                    <BarLabel>
                      {Math.round(metrics.portfolio_breakdown.value_enabling_pct || metrics.portfolio_breakdown.run_percentage || 0)}%
                    </BarLabel>
                  )}
                </BarSegment>
                <BarSegment
                  $color="red"
                  $width={metrics.portfolio_breakdown.waste_pct || 0}
                  title="Waste"
                >
                  {(metrics.portfolio_breakdown.waste_pct || 0) >= 10 && (
                    <BarLabel>
                      {Math.round(metrics.portfolio_breakdown.waste_pct || 0)}%
                    </BarLabel>
                  )}
                </BarSegment>
              </StackedBar>

              {/* Legend */}
              <LegendGrid>
                <LegendItem>
                  <LegendDot $color="emerald" />
                  <div>
                    <LegendLabel>Value Adding</LegendLabel>
                    <LegendValue>
                      {Math.round(metrics.portfolio_breakdown.value_adding_pct || metrics.portfolio_breakdown.change_percentage || 0)}%
                    </LegendValue>
                  </div>
                </LegendItem>
                <LegendItem>
                  <LegendDot $color="blue" />
                  <div>
                    <LegendLabel>Value Enabling</LegendLabel>
                    <LegendValue>
                      {Math.round(metrics.portfolio_breakdown.value_enabling_pct || metrics.portfolio_breakdown.run_percentage || 0)}%
                    </LegendValue>
                  </div>
                </LegendItem>
                <LegendItem>
                  <LegendDot $color="red" />
                  <div>
                    <LegendLabel>Waste</LegendLabel>
                    <LegendValue>
                      {Math.round(metrics.portfolio_breakdown.waste_pct || 0)}%
                    </LegendValue>
                  </div>
                </LegendItem>
              </LegendGrid>

              {/* Descriptions */}
              <DescriptionsSection>
                <DescriptionText>
                  <DescriptionLabel $color="emerald">Value Adding</DescriptionLabel>: Direct value creation - building, creating, solving, deciding.
                </DescriptionText>
                <DescriptionText>
                  <DescriptionLabel $color="blue">Value Enabling</DescriptionLabel>: Necessary support - planning, coordination, compliance, learning.
                </DescriptionText>
                <DescriptionText>
                  <DescriptionLabel $color="red">Waste</DescriptionLabel>: Non-value work to minimize - waiting, rework, unnecessary meetings.
                </DescriptionText>
              </DescriptionsSection>
            </PortfolioContent>
          ) : (
            <EmptyState>
              <p>Portfolio data not available.</p>
              <EmptyStateHint>Complete a survey to see time allocation breakdown.</EmptyStateHint>
            </EmptyState>
          )}
        </PortfolioCard>
      </TwoColumnGrid>

      {/* Psychological Safety Assessment */}
      {teamId && <PsychSafetyCard teamId={teamId} />}

      {/* Top Opportunities */}
      <Section>
        <OpportunitiesHeader>
          <SectionTitle style={{ marginBottom: 0 }}>Top Opportunities</SectionTitle>
          <ViewAllLink to={`/teams/${teamId}/opportunities`}>
            View all ({opportunitySummary?.total_opportunities || 0})
          </ViewAllLink>
        </OpportunitiesHeader>

        {oppsLoading ? (
          <OpportunitiesGrid>
            {[1, 2].map((i) => (
              <Card key={i}>
                <SkeletonTitle />
                <SkeletonLine />
                <SkeletonLine />
              </Card>
            ))}
          </OpportunitiesGrid>
        ) : opportunitySummary?.top_priorities && opportunitySummary.top_priorities.length > 0 ? (
          <OpportunitiesGrid>
            {opportunitySummary.top_priorities.slice(0, 4).map((opp) => (
              <OpportunityCard key={opp.id}>
                <OpportunityHeader>
                  <OpportunityTitle>{opp.title}</OpportunityTitle>
                  <ScoreContainer>
                    <ScoreValue>{opp.rice_score.toFixed(1)}</ScoreValue>
                    <ScoreLabel>RICE</ScoreLabel>
                  </ScoreContainer>
                </OpportunityHeader>
                {opp.friction_type && (
                  <FrictionBadge>
                    {opp.friction_type.charAt(0).toUpperCase() + opp.friction_type.slice(1)}
                  </FrictionBadge>
                )}
              </OpportunityCard>
            ))}
          </OpportunitiesGrid>
        ) : (
          <EmptyOpportunities>
            <EmptyOpportunitiesText>No opportunities identified yet.</EmptyOpportunitiesText>
            <EmptyOpportunitiesHint>Complete a survey to generate improvement opportunities.</EmptyOpportunitiesHint>
          </EmptyOpportunities>
        )}
      </Section>

      {/* Survey Management */}
      {team && <SurveyManagement team={team} />}
    </PageContainer>
  )
}
