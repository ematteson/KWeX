import { Link } from 'react-router-dom'
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
import clsx from 'clsx'

const METRIC_COLORS = {
  flow: '#047857',      // Emerald-700
  friction: '#DC2626',  // Red-600
  safety: '#2563EB',    // Blue-600
  portfolio: '#7C3AED', // Purple-600
}

function getScoreColor(score: number | null, invert = false): string {
  if (score === null) return 'text-pearson-gray-400'
  const effectiveScore = invert ? 100 - score : score
  if (effectiveScore >= 75) return 'text-green-600'
  if (effectiveScore >= 50) return 'text-yellow-600'
  if (effectiveScore >= 25) return 'text-orange-500'
  return 'text-red-600'
}

function getScoreBgColor(score: number | null, invert = false): string {
  if (score === null) return 'bg-pearson-gray-100'
  const effectiveScore = invert ? 100 - score : score
  if (effectiveScore >= 75) return 'bg-green-50'
  if (effectiveScore >= 50) return 'bg-yellow-50'
  if (effectiveScore >= 25) return 'bg-orange-50'
  return 'bg-red-50'
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

export function ExecutiveDashboard() {
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
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-pearson-gray-900">Executive Dashboard</h1>
          <p className="text-pearson-gray-600 mt-1">Cross-team metrics overview</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-6 bg-pearson-gray-200 rounded w-48 mb-4"></div>
              <div className="h-48 bg-pearson-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-pearson-gray-900">Executive Dashboard</h1>
          <p className="text-pearson-gray-600 mt-1">
            Cross-team metrics comparison • {teamsMetrics?.length || 0} teams tracked
          </p>
        </div>
        <Link to="/teams" className="btn-secondary">
          View Team List
        </Link>
      </div>

      {/* Organization Averages */}
      {orgAverages && orgAverages.teamsWithData > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-pearson-gray-800 mb-4">Organization Averages</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className={clsx('card text-center', getScoreBgColor(orgAverages.flow))}>
              <div className={clsx('text-3xl font-bold', getScoreColor(orgAverages.flow))}>
                {orgAverages.flow}
              </div>
              <div className="text-sm text-pearson-gray-600 mt-1">Flow</div>
            </div>
            <div className={clsx('card text-center', getScoreBgColor(orgAverages.friction, true))}>
              <div className={clsx('text-3xl font-bold', getScoreColor(orgAverages.friction, true))}>
                {orgAverages.friction}
              </div>
              <div className="text-sm text-pearson-gray-600 mt-1">Friction</div>
            </div>
            <div className={clsx('card text-center', getScoreBgColor(orgAverages.safety))}>
              <div className={clsx('text-3xl font-bold', getScoreColor(orgAverages.safety))}>
                {orgAverages.safety}
              </div>
              <div className="text-sm text-pearson-gray-600 mt-1">Safety</div>
            </div>
            <div className={clsx('card text-center', getScoreBgColor(orgAverages.portfolio))}>
              <div className={clsx('text-3xl font-bold', getScoreColor(orgAverages.portfolio))}>
                {orgAverages.portfolio}
              </div>
              <div className="text-sm text-pearson-gray-600 mt-1">Portfolio Balance</div>
            </div>
            <div className="card text-center bg-pearson-gray-50">
              <div className="text-3xl font-bold text-pearson-gray-800">
                {orgAverages.totalResponses}
              </div>
              <div className="text-sm text-pearson-gray-600 mt-1">Total Responses</div>
            </div>
          </div>
        </section>
      )}

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Team Comparison Bar Chart */}
        <section className="card">
          <h3 className="card-header">Team Comparison</h3>
          {barChartData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barChartData}
                  margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
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
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-pearson-gray-500">
              <p>No team data available yet. Complete surveys to see comparisons.</p>
            </div>
          )}
        </section>

        {/* Organization Health Radar */}
        <section className="card">
          <h3 className="card-header">Organization Health</h3>
          {radarData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="#E5E7EB" />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{ fontSize: 12, fill: '#374151' }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
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
                    stroke="#9CA3AF"
                    fill="#9CA3AF"
                    fillOpacity={0.1}
                    strokeDasharray="5 5"
                  />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-pearson-gray-500">
              <p>No organization data available yet.</p>
            </div>
          )}
          <p className="text-xs text-pearson-gray-500 text-center mt-2">
            Note: Friction is inverted (higher = less friction = better)
          </p>
        </section>
      </div>

      {/* Team Cards Grid */}
      <section>
        <h2 className="text-lg font-semibold text-pearson-gray-800 mb-4">All Teams</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teamsMetrics?.map((team) => (
            <Link
              key={team.team_id}
              to={`/teams/${team.team_id}`}
              className="card hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium text-pearson-gray-800">{team.team_name}</h3>
                  <p className="text-sm text-pearson-gray-500">{team.team_function}</p>
                </div>
                {team.meets_privacy_threshold ? (
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
                    Active
                  </span>
                ) : (
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                    {team.respondent_count}/7 responses
                  </span>
                )}
              </div>

              {team.meets_privacy_threshold ? (
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className={clsx('text-lg font-bold', getScoreColor(team.flow_score))}>
                      {team.flow_score ?? '—'}
                    </div>
                    <div className="text-xs text-pearson-gray-500">Flow</div>
                  </div>
                  <div>
                    <div className={clsx('text-lg font-bold', getScoreColor(team.friction_score, true))}>
                      {team.friction_score ?? '—'}
                    </div>
                    <div className="text-xs text-pearson-gray-500">Friction</div>
                  </div>
                  <div>
                    <div className={clsx('text-lg font-bold', getScoreColor(team.safety_score))}>
                      {team.safety_score ?? '—'}
                    </div>
                    <div className="text-xs text-pearson-gray-500">Safety</div>
                  </div>
                  <div>
                    <div className={clsx('text-lg font-bold', getScoreColor(team.portfolio_balance_score))}>
                      {team.portfolio_balance_score ?? '—'}
                    </div>
                    <div className="text-xs text-pearson-gray-500">Portfolio</div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-pearson-gray-500 text-center py-4">
                  Awaiting {7 - team.respondent_count} more responses for privacy threshold
                </p>
              )}
            </Link>
          ))}

          {(!teamsMetrics || teamsMetrics.length === 0) && (
            <div className="col-span-full text-center py-8 bg-white rounded-lg border border-pearson-gray-200">
              <p className="text-pearson-gray-600">No teams configured yet.</p>
              <Link to="/teams" className="text-pearson-blue hover:underline text-sm mt-2 inline-block">
                Add teams to get started
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Privacy Notice */}
      <section className="card bg-pearson-gray-50 border-pearson-gray-200">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-pearson-gray-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-medium text-pearson-gray-700">Privacy Protection</h3>
            <p className="text-sm text-pearson-gray-600 mt-1">
              Team metrics are only displayed when at least 7 survey responses have been collected.
              This ensures individual anonymity and prevents identification of specific respondents.
              No individual-level data is ever exposed in this dashboard.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
