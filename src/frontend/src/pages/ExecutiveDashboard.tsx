import { Link } from 'react-router-dom'
import styled, { css, useTheme } from 'styled-components'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'
import { useAllTeamsMetrics, type TeamMetricsSummary } from '../api/hooks'
import { Card, CardTitle, Badge, Heading, Text, Alert } from '../design-system/components'

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.v1.spacing.spacing3XL};
`

const HeaderContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.v1.spacing.spacingLG};

  @media (min-width: 640px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`

const HeaderTextContainer = styled.div``

const PageTitle = styled(Heading).attrs({ as: 'h1', $level: 2 })`
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingXS};
`

const PageSubtitle = styled(Text).attrs({ $variant: 'body', $color: 'default' })``

const SecondaryButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.v1.spacing.spacingSM} ${({ theme }) => theme.v1.spacing.spacingXL};
  background-color: transparent;
  color: ${({ theme }) => theme.v1.semanticColors.text.action.default};
  border: 1px solid ${({ theme }) => theme.v1.semanticColors.border.brand.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusMD};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${({ theme }) => theme.v1.semanticColors.fill.highlight.brand.default};
    border-color: ${({ theme }) => theme.v1.semanticColors.border.brand.hover};
  }
`

const SectionTitle = styled(Heading).attrs({ as: 'h2', $level: 3 })`
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
    grid-template-columns: repeat(5, 1fr);
  }
`

interface MetricCardProps {
  $bgColor?: string;
}

const MetricCard = styled(Card)<MetricCardProps>`
  text-align: center;
  ${({ $bgColor }) => $bgColor && css`background-color: ${$bgColor};`}
`

interface ScoreValueProps {
  $color: string;
}

const ScoreValue = styled.div<ScoreValueProps>`
  font-size: ${({ theme }) => theme.v1.typography.sizes.displayL};
  font-weight: ${({ theme }) => theme.v1.typography.weights.bold};
  color: ${({ $color }) => $color};
`

const ScoreLabel = styled(Text).attrs({ $variant: 'bodySmall', $color: 'default' })`
  margin-top: ${({ theme }) => theme.v1.spacing.spacingXS};
`

const ChartsGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.v1.spacing.spacing2XL};
  grid-template-columns: 1fr;

  @media (min-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
`

const ChartContainer = styled.div`
  height: 20rem;
`

const EmptyChartState = styled.div`
  height: 20rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const ChartNote = styled(Text).attrs({ $variant: 'helper', $color: 'subtle' })`
  text-align: center;
  margin-top: ${({ theme }) => theme.v1.spacing.spacingSM};
`

const TeamsGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.v1.spacing.spacingLG};
  grid-template-columns: 1fr;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
`

const TeamCard = styled(Link)`
  text-decoration: none;
  display: block;
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  box-shadow: ${({ theme }) => theme.v1.shadows.sm};
  padding: ${({ theme }) => theme.v1.spacing.spacingXL};
  transition: box-shadow 0.2s ease;

  &:hover {
    box-shadow: ${({ theme }) => theme.v1.shadows.md};
  }
`

const TeamHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingMD};
`

const TeamInfo = styled.div``

const TeamName = styled.h3`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyL};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0;
`

const TeamFunction = styled(Text).attrs({ $variant: 'bodySmall', $color: 'subtle' })``

const TeamMetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
  text-align: center;
`

const MetricItem = styled.div``

interface TeamMetricValueProps {
  $color: string;
}

const TeamMetricValue = styled.div<TeamMetricValueProps>`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.bold};
  color: ${({ $color }) => $color};
`

const TeamMetricLabel = styled(Text).attrs({ $variant: 'helper', $color: 'subtle' })``

const AwaitingResponsesMessage = styled(Text).attrs({ $variant: 'bodySmall', $color: 'subtle' })`
  text-align: center;
  padding: ${({ theme }) => theme.v1.spacing.spacingLG} 0;
`

const EmptyTeamsCard = styled.div`
  grid-column: 1 / -1;
  text-align: center;
  padding: ${({ theme }) => theme.v1.spacing.spacing3XL};
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  border: 1px solid ${({ theme }) => theme.v1.semanticColors.border.neutral.default};
`

const EmptyTeamsLink = styled(Link)`
  display: inline-block;
  margin-top: ${({ theme }) => theme.v1.spacing.spacingSM};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.link.brand.default};

  &:hover {
    text-decoration: underline;
  }
`

const PrivacyAlert = styled(Alert).attrs({ $variant: 'info' })`
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
  border-left-color: ${({ theme }) => theme.v1.semanticColors.border.neutral.default};
`

const InfoIcon = styled.svg`
  width: 1.25rem;
  height: 1.25rem;
  color: ${({ theme }) => theme.v1.semanticColors.icon.neutral.default};
  flex-shrink: 0;
  margin-top: 2px;
`

const PrivacyContent = styled.div``

const PrivacyTitle = styled.h3`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyL};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.subtle};
  margin: 0;
`

const PrivacyDescription = styled(Text).attrs({ $variant: 'bodySmall', $color: 'default' })`
  margin-top: ${({ theme }) => theme.v1.spacing.spacingXS};
`

// Loading skeleton components
const SkeletonCard = styled(Card)`
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`

const SkeletonTitle = styled.div`
  height: 1.5rem;
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.neutral.skeleton};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
  width: 12rem;
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const SkeletonChart = styled.div`
  height: 12rem;
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.neutral.skeleton};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
`

const LoadingGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.v1.spacing.spacing2XL};
  grid-template-columns: 1fr;

  @media (min-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
`

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const METRIC_COLORS = {
  flow: '#047857',      // Emerald-700
  friction: '#DC2626',  // Red-600
  safety: '#2563EB',    // Blue-600
  portfolio: '#7C3AED', // Purple-600
}

function getScoreColor(score: number | null, invert = false): string {
  if (score === null) return '#737373' // grey400
  const effectiveScore = invert ? 100 - score : score
  if (effectiveScore >= 75) return '#1C826A' // green-100
  if (effectiveScore >= 50) return '#806000' // yellow-700
  if (effectiveScore >= 25) return '#B85217' // orange-100
  return '#C53312' // red-100
}

function getScoreBgColor(
  score: number | null,
  invert = false,
  theme: ReturnType<typeof useTheme>
): string {
  if (score === null) return theme.v1.semanticColors.fill.neutral.light
  const effectiveScore = invert ? 100 - score : score
  if (effectiveScore >= 75) return theme.v1.semanticColors.fill.feedback.success.subtle
  if (effectiveScore >= 50) return theme.v1.semanticColors.fill.feedback.warning.subtle
  if (effectiveScore >= 25) return theme.v1.semanticColors.fill.feedback.orange.subtle
  return theme.v1.semanticColors.fill.feedback.error.subtle
}

interface OrgAverages {
  flow: number
  friction: number
  safety: number
  portfolio: number
  totalResponses: number
  teamsWithData: number
}

function calculateOrgAverages(teams: TeamMetricsSummary[]): OrgAverages {
  const teamsWithData = teams.filter(t => t.meets_privacy_threshold)
  if (teamsWithData.length === 0) {
    return { flow: 0, friction: 0, safety: 0, portfolio: 0, totalResponses: 0, teamsWithData: 0 }
  }

  const totals = teamsWithData.reduce(
    (acc, team) => ({
      flow: acc.flow + (team.flow_score || 0),
      friction: acc.friction + (team.friction_score || 0),
      safety: acc.safety + (team.safety_score || 0),
      portfolio: acc.portfolio + (team.portfolio_balance_score || 0),
    }),
    { flow: 0, friction: 0, safety: 0, portfolio: 0 }
  )

  const totalResponses = teams.reduce((acc, t) => acc + t.respondent_count, 0)

  return {
    flow: Math.round(totals.flow / teamsWithData.length),
    friction: Math.round(totals.friction / teamsWithData.length),
    safety: Math.round(totals.safety / teamsWithData.length),
    portfolio: Math.round(totals.portfolio / teamsWithData.length),
    totalResponses,
    teamsWithData: teamsWithData.length,
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ExecutiveDashboard() {
  const theme = useTheme()
  const { data: teamsMetrics, isLoading } = useAllTeamsMetrics()

  const orgAverages = teamsMetrics ? calculateOrgAverages(teamsMetrics) : null
  const teamsWithData = teamsMetrics?.filter(t => t.meets_privacy_threshold) || []

  // Prepare data for bar chart comparison
  const barChartData = teamsWithData.map(team => ({
    name: team.team_name.length > 12 ? team.team_name.substring(0, 12) + '...' : team.team_name,
    fullName: team.team_name,
    Flow: team.flow_score,
    Friction: team.friction_score,
    Safety: team.safety_score,
    Portfolio: team.portfolio_balance_score,
  }))

  // Prepare data for radar chart (org averages vs benchmark)
  const radarData = orgAverages ? [
    { metric: 'Flow', value: orgAverages.flow, benchmark: 65 },
    { metric: 'Friction', value: 100 - orgAverages.friction, benchmark: 70 }, // Invert friction for radar
    { metric: 'Safety', value: orgAverages.safety, benchmark: 75 },
    { metric: 'Portfolio', value: orgAverages.portfolio, benchmark: 60 },
  ] : []

  if (isLoading) {
    return (
      <PageContainer>
        <HeaderTextContainer>
          <PageTitle>Executive Dashboard</PageTitle>
          <PageSubtitle>Cross-team metrics overview</PageSubtitle>
        </HeaderTextContainer>
        <LoadingGrid>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i}>
              <SkeletonTitle />
              <SkeletonChart />
            </SkeletonCard>
          ))}
        </LoadingGrid>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      {/* Header */}
      <HeaderContainer>
        <HeaderTextContainer>
          <PageTitle>Executive Dashboard</PageTitle>
          <PageSubtitle>
            Cross-team metrics comparison - {teamsMetrics?.length || 0} teams tracked
          </PageSubtitle>
        </HeaderTextContainer>
        <SecondaryButton to="/teams">
          View Team List
        </SecondaryButton>
      </HeaderContainer>

      {/* Organization Averages */}
      {orgAverages && orgAverages.teamsWithData > 0 && (
        <section>
          <SectionTitle>Organization Averages</SectionTitle>
          <MetricsGrid>
            <MetricCard $bgColor={getScoreBgColor(orgAverages.flow, false, theme)}>
              <ScoreValue $color={getScoreColor(orgAverages.flow)}>
                {orgAverages.flow}
              </ScoreValue>
              <ScoreLabel>Flow</ScoreLabel>
            </MetricCard>
            <MetricCard $bgColor={getScoreBgColor(orgAverages.friction, true, theme)}>
              <ScoreValue $color={getScoreColor(orgAverages.friction, true)}>
                {orgAverages.friction}
              </ScoreValue>
              <ScoreLabel>Friction</ScoreLabel>
            </MetricCard>
            <MetricCard $bgColor={getScoreBgColor(orgAverages.safety, false, theme)}>
              <ScoreValue $color={getScoreColor(orgAverages.safety)}>
                {orgAverages.safety}
              </ScoreValue>
              <ScoreLabel>Safety</ScoreLabel>
            </MetricCard>
            <MetricCard $bgColor={getScoreBgColor(orgAverages.portfolio, false, theme)}>
              <ScoreValue $color={getScoreColor(orgAverages.portfolio)}>
                {orgAverages.portfolio}
              </ScoreValue>
              <ScoreLabel>Portfolio Balance</ScoreLabel>
            </MetricCard>
            <MetricCard $bgColor={theme.v1.semanticColors.canvas.highlight.light}>
              <ScoreValue $color={theme.v1.semanticColors.text.heading.bold}>
                {orgAverages.totalResponses}
              </ScoreValue>
              <ScoreLabel>Total Responses</ScoreLabel>
            </MetricCard>
          </MetricsGrid>
        </section>
      )}

      {/* Charts Row */}
      <ChartsGrid>
        {/* Team Comparison Bar Chart */}
        <section>
          <Card>
            <CardTitle>Team Comparison</CardTitle>
            {barChartData.length > 0 ? (
              <ChartContainer>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barChartData}
                    margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.v1.semanticColors.border.divider.light} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: theme.v1.semanticColors.chart.label }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 12, fill: theme.v1.semanticColors.chart.label }}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme.v1.semanticColors.canvas.default,
                        border: `1px solid ${theme.v1.semanticColors.border.neutral.default}`,
                        borderRadius: theme.v1.radius.radiusMD,
                      }}
                      formatter={(value: number, name: string) => [
                        `${Math.round(value)}`,
                        name,
                      ]}
                    />
                    <Legend wrapperStyle={{ paddingTop: 10 }} />
                    <Bar dataKey="Flow" fill={METRIC_COLORS.flow} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Friction" fill={METRIC_COLORS.friction} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Safety" fill={METRIC_COLORS.safety} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Portfolio" fill={METRIC_COLORS.portfolio} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <EmptyChartState>
                <p>No team data available yet. Complete surveys to see comparisons.</p>
              </EmptyChartState>
            )}
          </Card>
        </section>

        {/* Organization Health Radar */}
        <section>
          <Card>
            <CardTitle>Organization Health</CardTitle>
            {radarData.length > 0 ? (
              <ChartContainer>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke={theme.v1.semanticColors.border.divider.light} />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{ fontSize: 12, fill: theme.v1.semanticColors.chart.subtitle }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fill: theme.v1.semanticColors.chart.label }}
                    />
                    <Radar
                      name="Current"
                      dataKey="value"
                      stroke="#047857"
                      fill="#047857"
                      fillOpacity={0.3}
                    />
                    <Radar
                      name="Benchmark"
                      dataKey="benchmark"
                      stroke={theme.v1.semanticColors.chart.label}
                      fill={theme.v1.semanticColors.chart.label}
                      fillOpacity={0.1}
                      strokeDasharray="5 5"
                    />
                    <Legend />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <EmptyChartState>
                <p>No organization data available yet.</p>
              </EmptyChartState>
            )}
            <ChartNote>
              Note: Friction is inverted (higher = less friction = better)
            </ChartNote>
          </Card>
        </section>
      </ChartsGrid>

      {/* Team Cards Grid */}
      <section>
        <SectionTitle>All Teams</SectionTitle>
        <TeamsGrid>
          {teamsMetrics?.map((team) => (
            <TeamCard
              key={team.team_id}
              to={`/teams/${team.team_id}`}
            >
              <TeamHeader>
                <TeamInfo>
                  <TeamName>{team.team_name}</TeamName>
                  <TeamFunction>{team.team_function}</TeamFunction>
                </TeamInfo>
                {team.meets_privacy_threshold ? (
                  <Badge $variant="success" $size="sm">
                    Active
                  </Badge>
                ) : (
                  <Badge $variant="warning" $size="sm">
                    {team.respondent_count}/7 responses
                  </Badge>
                )}
              </TeamHeader>

              {team.meets_privacy_threshold ? (
                <TeamMetricsGrid>
                  <MetricItem>
                    <TeamMetricValue $color={getScoreColor(team.flow_score)}>
                      {team.flow_score != null ? Math.round(team.flow_score) : '—'}
                    </TeamMetricValue>
                    <TeamMetricLabel>Flow</TeamMetricLabel>
                  </MetricItem>
                  <MetricItem>
                    <TeamMetricValue $color={getScoreColor(team.friction_score, true)}>
                      {team.friction_score != null ? Math.round(team.friction_score) : '—'}
                    </TeamMetricValue>
                    <TeamMetricLabel>Friction</TeamMetricLabel>
                  </MetricItem>
                  <MetricItem>
                    <TeamMetricValue $color={getScoreColor(team.safety_score)}>
                      {team.safety_score != null ? Math.round(team.safety_score) : '—'}
                    </TeamMetricValue>
                    <TeamMetricLabel>Safety</TeamMetricLabel>
                  </MetricItem>
                  <MetricItem>
                    <TeamMetricValue $color={getScoreColor(team.portfolio_balance_score)}>
                      {team.portfolio_balance_score != null ? Math.round(team.portfolio_balance_score) : '—'}
                    </TeamMetricValue>
                    <TeamMetricLabel>Portfolio</TeamMetricLabel>
                  </MetricItem>
                </TeamMetricsGrid>
              ) : (
                <AwaitingResponsesMessage>
                  Awaiting {7 - team.respondent_count} more responses for privacy threshold
                </AwaitingResponsesMessage>
              )}
            </TeamCard>
          ))}

          {(!teamsMetrics || teamsMetrics.length === 0) && (
            <EmptyTeamsCard>
              <Text $color="default">No teams configured yet.</Text>
              <EmptyTeamsLink to="/teams">
                Add teams to get started
              </EmptyTeamsLink>
            </EmptyTeamsCard>
          )}
        </TeamsGrid>
      </section>

      {/* Privacy Notice */}
      <PrivacyAlert>
        <InfoIcon fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </InfoIcon>
        <PrivacyContent>
          <PrivacyTitle>Privacy Protection</PrivacyTitle>
          <PrivacyDescription>
            Team metrics are only displayed when at least 7 survey responses have been collected.
            This ensures individual anonymity and prevents identification of specific respondents.
            No individual-level data is ever exposed in this dashboard.
          </PrivacyDescription>
        </PrivacyContent>
      </PrivacyAlert>
    </PageContainer>
  )
}
