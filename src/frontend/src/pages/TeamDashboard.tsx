import { useParams, Link } from 'react-router-dom'
import { useTeam, useTeamMetrics, useOpportunitySummary, useFrictionBreakdown, useMetricsHistory } from '../api/hooks'
import { MetricCard } from '../components/MetricCard'
import { FrictionHeatmap } from '../components/FrictionHeatmap'
import { MetricsTrendChart } from '../components/MetricsTrendChart'
import { SurveyManagement } from '../components/SurveyManagement'

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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link to="/teams" className="text-sm text-pearson-blue hover:underline mb-2 inline-block">
            ← Back to Teams
          </Link>
          <h1 className="text-2xl font-bold text-pearson-gray-900">
            {teamLoading ? (
              <span className="animate-pulse bg-pearson-gray-200 rounded h-8 w-48 inline-block"></span>
            ) : (
              team?.name || 'Team Dashboard'
            )}
          </h1>
          {team && (
            <p className="text-pearson-gray-600 mt-1">
              {team.function} • {team.member_count} members
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <Link to={`/teams/${teamId}/opportunities`} className="btn-secondary">
            View All Opportunities
          </Link>
        </div>
      </div>

      {/* Privacy threshold warning */}
      {!meetsPrivacyThreshold && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="font-medium text-amber-800">Privacy Threshold Not Met</h3>
              <p className="text-sm text-amber-700 mt-1">
                Detailed metrics require at least 7 survey responses to protect individual privacy.
                Current responses: {metrics && 'respondent_count' in metrics ? metrics.respondent_count : 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Core 4 Metrics Grid */}
      <section>
        <h2 className="text-lg font-semibold text-pearson-gray-800 mb-4">Core 4 Metrics</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        </div>
      </section>

      {/* Metrics Trends Chart - Full width */}
      <MetricsTrendChart
        data={metricsHistory || []}
        isLoading={historyLoading}
      />

      {/* Two-column layout: Friction Heatmap + Portfolio Distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Friction Heatmap */}
        <FrictionHeatmap
          dimensions={frictionBreakdown?.dimensions || []}
          overallScore={frictionBreakdown?.overall_friction_score}
          isLoading={frictionLoading}
        />

        {/* Portfolio Breakdown - Value Adding / Value Enabling / Waste */}
        <section className="card">
          <h2 className="card-header">Time Allocation Health</h2>
          {metrics?.portfolio_breakdown && meetsPrivacyThreshold ? (
            <div className="flex flex-col gap-4">
              {/* Three-way stacked bar */}
              <div className="flex h-10 rounded-lg overflow-hidden shadow-inner">
                <div
                  className="bg-emerald-500 transition-all flex items-center justify-center"
                  style={{ width: `${metrics.portfolio_breakdown.value_adding_pct || metrics.portfolio_breakdown.change_percentage || 0}%` }}
                  title="Value Adding"
                >
                  {(metrics.portfolio_breakdown.value_adding_pct || metrics.portfolio_breakdown.change_percentage || 0) >= 15 && (
                    <span className="text-white text-xs font-medium">
                      {Math.round(metrics.portfolio_breakdown.value_adding_pct || metrics.portfolio_breakdown.change_percentage || 0)}%
                    </span>
                  )}
                </div>
                <div
                  className="bg-blue-500 transition-all flex items-center justify-center"
                  style={{ width: `${metrics.portfolio_breakdown.value_enabling_pct || metrics.portfolio_breakdown.run_percentage || 0}%` }}
                  title="Value Enabling"
                >
                  {(metrics.portfolio_breakdown.value_enabling_pct || metrics.portfolio_breakdown.run_percentage || 0) >= 15 && (
                    <span className="text-white text-xs font-medium">
                      {Math.round(metrics.portfolio_breakdown.value_enabling_pct || metrics.portfolio_breakdown.run_percentage || 0)}%
                    </span>
                  )}
                </div>
                <div
                  className="bg-red-400 transition-all flex items-center justify-center"
                  style={{ width: `${metrics.portfolio_breakdown.waste_pct || 0}%` }}
                  title="Waste"
                >
                  {(metrics.portfolio_breakdown.waste_pct || 0) >= 10 && (
                    <span className="text-white text-xs font-medium">
                      {Math.round(metrics.portfolio_breakdown.waste_pct || 0)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Legend */}
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <div>
                    <span className="font-medium text-pearson-gray-700">Value Adding</span>
                    <span className="text-pearson-gray-500 ml-1">
                      {Math.round(metrics.portfolio_breakdown.value_adding_pct || metrics.portfolio_breakdown.change_percentage || 0)}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <div>
                    <span className="font-medium text-pearson-gray-700">Value Enabling</span>
                    <span className="text-pearson-gray-500 ml-1">
                      {Math.round(metrics.portfolio_breakdown.value_enabling_pct || metrics.portfolio_breakdown.run_percentage || 0)}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div>
                    <span className="font-medium text-pearson-gray-700">Waste</span>
                    <span className="text-pearson-gray-500 ml-1">
                      {Math.round(metrics.portfolio_breakdown.waste_pct || 0)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Descriptions */}
              <div className="mt-2 pt-4 border-t border-pearson-gray-100 space-y-2">
                <p className="text-xs text-pearson-gray-500">
                  <strong className="text-emerald-600">Value Adding</strong>: Direct value creation - building, creating, solving, deciding.
                </p>
                <p className="text-xs text-pearson-gray-500">
                  <strong className="text-blue-600">Value Enabling</strong>: Necessary support - planning, coordination, compliance, learning.
                </p>
                <p className="text-xs text-pearson-gray-500">
                  <strong className="text-red-500">Waste</strong>: Non-value work to minimize - waiting, rework, unnecessary meetings.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-pearson-gray-500">
              <p>Portfolio data not available.</p>
              <p className="text-sm mt-1">Complete a survey to see time allocation breakdown.</p>
            </div>
          )}
        </section>
      </div>

      {/* Top Opportunities */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-pearson-gray-800">Top Opportunities</h2>
          <Link to={`/teams/${teamId}/opportunities`} className="text-sm text-pearson-blue hover:underline">
            View all ({opportunitySummary?.total_opportunities || 0})
          </Link>
        </div>

        {oppsLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-5 bg-pearson-gray-200 rounded w-48 mb-3"></div>
                <div className="h-4 bg-pearson-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-pearson-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : opportunitySummary?.top_priorities && opportunitySummary.top_priorities.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {opportunitySummary.top_priorities.slice(0, 4).map((opp) => (
              <div key={opp.id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-medium text-pearson-gray-800">{opp.title}</h3>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-lg font-bold text-pearson-blue">{opp.rice_score.toFixed(1)}</span>
                    <span className="text-xs text-pearson-gray-500">RICE</span>
                  </div>
                </div>
                {opp.friction_type && (
                  <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded-full bg-pearson-gray-100 text-pearson-gray-700">
                    {opp.friction_type.charAt(0).toUpperCase() + opp.friction_type.slice(1)}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-white rounded-lg border border-pearson-gray-200">
            <p className="text-pearson-gray-600">No opportunities identified yet.</p>
            <p className="text-sm text-pearson-gray-500 mt-1">Complete a survey to generate improvement opportunities.</p>
          </div>
        )}
      </section>

      {/* Survey Management */}
      {team && <SurveyManagement team={team} />}
    </div>
  )
}
