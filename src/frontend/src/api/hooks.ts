import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from './client'
import type {
  Team,
  Survey,
  SurveyResponse,
  MetricResult,
  Opportunity,
  OpportunitySummary,
  AnswerSubmission,
  Question,
  Occupation,
  CSVUploadResult,
  AvailableOccupationsResponse,
  SurveyCreate,
  SurveyLinkResponse,
  SurveyStats,
  SystemStatus,
  SurveyQuestionMapping,
  LLMTestResult,
  LLMConfigResponse,
} from './types'

// Teams
export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data } = await apiClient.get<Team[]>('/teams')
      return data
    },
  })
}

export function useTeam(teamId: string) {
  return useQuery({
    queryKey: ['teams', teamId],
    queryFn: async () => {
      const { data } = await apiClient.get<Team>(`/teams/${teamId}`)
      return data
    },
    enabled: !!teamId,
  })
}

// Surveys
export function useSurvey(surveyId: string) {
  return useQuery({
    queryKey: ['surveys', surveyId],
    queryFn: async () => {
      const { data } = await apiClient.get<Survey>(`/surveys/${surveyId}`)
      return data
    },
    enabled: !!surveyId,
  })
}

// Survey response by anonymous token - returns questions and existing answers
export interface SurveyByTokenResponse {
  survey_id: string
  survey_name: string
  estimated_completion_minutes: number
  questions: Question[]
  existing_answers: { question_id: string; value: string }[]
}

export function useSurveyByToken(token: string) {
  return useQuery({
    queryKey: ['respond', token],
    queryFn: async () => {
      const { data } = await apiClient.get<SurveyByTokenResponse>(`/respond/${token}`)
      return data
    },
    enabled: !!token,
  })
}

export function useStartSurvey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (surveyId: string) => {
      const { data } = await apiClient.post<SurveyResponse>('/responses', { survey_id: surveyId })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
    },
  })
}

// Submit complete survey response
export function useSubmitSurvey(token: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (answers: AnswerSubmission[]) => {
      const { data } = await apiClient.post(`/respond/${token}`, { answers })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['respond', token] })
      queryClient.invalidateQueries({ queryKey: ['metrics'] })
    },
  })
}

// Save partial progress (for save-and-resume)
export function useSaveProgress(token: string) {
  return useMutation({
    mutationFn: async (answers: AnswerSubmission[]) => {
      const { data } = await apiClient.put(`/respond/${token}`, { answers })
      return data
    },
  })
}

// Survey Management
export function useTeamSurveys(teamId: string) {
  return useQuery({
    queryKey: ['surveys', 'team', teamId],
    queryFn: async () => {
      const { data } = await apiClient.get<Survey[]>('/surveys', { params: { team_id: teamId } })
      return data
    },
    enabled: !!teamId,
  })
}

export function useCreateSurvey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (survey: SurveyCreate) => {
      const { data } = await apiClient.post<Survey>('/surveys', survey)
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
      queryClient.invalidateQueries({ queryKey: ['surveys', 'team', data.team_id] })
    },
  })
}

export function useGenerateQuestions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ surveyId, useTaskSpecific = false, maxQuestions = 18 }: {
      surveyId: string
      useTaskSpecific?: boolean
      maxQuestions?: number
    }) => {
      const { data } = await apiClient.post<Question[]>(
        `/surveys/${surveyId}/generate-questions`,
        null,
        { params: { use_task_specific: useTaskSpecific, max_questions: maxQuestions } }
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
    },
  })
}

export function useActivateSurvey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (surveyId: string) => {
      const { data } = await apiClient.post<Survey>(`/surveys/${surveyId}/activate`)
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
      queryClient.invalidateQueries({ queryKey: ['surveys', 'team', data.team_id] })
    },
  })
}

export function useCloseSurvey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (surveyId: string) => {
      const { data } = await apiClient.post<Survey>(`/surveys/${surveyId}/close`)
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
      queryClient.invalidateQueries({ queryKey: ['surveys', 'team', data.team_id] })
    },
  })
}

export function useGenerateSurveyLink() {
  return useMutation({
    mutationFn: async (surveyId: string) => {
      const { data } = await apiClient.get<SurveyLinkResponse>(`/surveys/${surveyId}/link`)
      return data
    },
  })
}

export function useSurveyStats(surveyId: string) {
  return useQuery({
    queryKey: ['surveys', surveyId, 'stats'],
    queryFn: async () => {
      const { data } = await apiClient.get<SurveyStats>(`/surveys/${surveyId}/stats`)
      return data
    },
    enabled: !!surveyId,
    refetchInterval: 30000, // Refresh every 30 seconds
  })
}

// Metrics
export function useTeamMetrics(teamId: string) {
  return useQuery({
    queryKey: ['metrics', teamId],
    queryFn: async () => {
      const { data } = await apiClient.get<MetricResult>(`/teams/${teamId}/metrics`)
      return data
    },
    enabled: !!teamId,
  })
}

export function useMetricsHistory(teamId: string) {
  return useQuery({
    queryKey: ['metrics', teamId, 'history'],
    queryFn: async () => {
      const { data } = await apiClient.get<MetricResult[]>(`/teams/${teamId}/metrics/history`)
      return data
    },
    enabled: !!teamId,
  })
}

// Friction breakdown for heatmap
export interface FrictionDimension {
  dimension: string
  label: string
  score: number
  description: string
}

export interface FrictionBreakdownResponse {
  team_id: string
  survey_id?: string
  calculation_date?: string
  overall_friction_score?: number
  meets_threshold?: boolean
  dimensions: FrictionDimension[]
  message?: string
}

export function useFrictionBreakdown(teamId: string) {
  return useQuery({
    queryKey: ['metrics', teamId, 'friction-breakdown'],
    queryFn: async () => {
      const { data } = await apiClient.get<FrictionBreakdownResponse>(`/teams/${teamId}/metrics/friction-breakdown`)
      return data
    },
    enabled: !!teamId,
  })
}

// Cross-team metrics for Executive Dashboard
export interface TeamMetricsSummary {
  team_id: string
  team_name: string
  team_function: string
  member_count: number
  flow_score: number | null
  friction_score: number | null
  safety_score: number | null
  portfolio_balance_score: number | null
  respondent_count: number
  meets_privacy_threshold: boolean
  trend_direction: string | null
}

export function useAllTeamsMetrics() {
  const { data: teams } = useTeams()

  return useQuery({
    queryKey: ['metrics', 'all-teams'],
    queryFn: async () => {
      if (!teams || teams.length === 0) return []

      const metricsPromises = teams.map(async (team) => {
        try {
          const { data: metrics } = await apiClient.get<MetricResult>(`/teams/${team.id}/metrics`)
          return {
            team_id: team.id,
            team_name: team.name,
            team_function: team.function,
            member_count: team.member_count,
            flow_score: metrics.meets_privacy_threshold ? metrics.flow_score : null,
            friction_score: metrics.meets_privacy_threshold ? metrics.friction_score : null,
            safety_score: metrics.meets_privacy_threshold ? metrics.safety_score : null,
            portfolio_balance_score: metrics.meets_privacy_threshold ? metrics.portfolio_balance_score : null,
            respondent_count: metrics.respondent_count,
            meets_privacy_threshold: metrics.meets_privacy_threshold,
            trend_direction: metrics.trend_direction,
          } as TeamMetricsSummary
        } catch {
          // Team has no metrics yet
          return {
            team_id: team.id,
            team_name: team.name,
            team_function: team.function,
            member_count: team.member_count,
            flow_score: null,
            friction_score: null,
            safety_score: null,
            portfolio_balance_score: null,
            respondent_count: 0,
            meets_privacy_threshold: false,
            trend_direction: null,
          } as TeamMetricsSummary
        }
      })

      return Promise.all(metricsPromises)
    },
    enabled: !!teams && teams.length > 0,
  })
}

// Opportunities
export function useTeamOpportunities(teamId: string, status?: string) {
  return useQuery({
    queryKey: ['opportunities', teamId, status],
    queryFn: async () => {
      const params = status ? { status } : {}
      const { data } = await apiClient.get<Opportunity[]>(`/teams/${teamId}/opportunities`, { params })
      return data
    },
    enabled: !!teamId,
  })
}

export function useOpportunitySummary(teamId: string) {
  return useQuery({
    queryKey: ['opportunities', teamId, 'summary'],
    queryFn: async () => {
      const { data } = await apiClient.get<OpportunitySummary>(`/teams/${teamId}/opportunities/summary`)
      return data
    },
    enabled: !!teamId,
  })
}

export function useUpdateOpportunity(teamId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ opportunityId, updates }: { opportunityId: string; updates: Partial<Opportunity> }) => {
      const { data } = await apiClient.patch<Opportunity>(
        `/teams/${teamId}/opportunities/${opportunityId}`,
        updates
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities', teamId] })
    },
  })
}

export function useGenerateOpportunities(teamId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (surveyId: string) => {
      const { data } = await apiClient.post(`/teams/${teamId}/surveys/${surveyId}/generate-opportunities`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities', teamId] })
    },
  })
}

// Occupations
export function useOccupations() {
  return useQuery({
    queryKey: ['occupations'],
    queryFn: async () => {
      const { data } = await apiClient.get<Occupation[]>('/occupations')
      return data
    },
  })
}

export function useSearchAvailableOccupations(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['occupations', 'available', query],
    queryFn: async () => {
      const params = query ? { q: query, limit: 50 } : { limit: 50 }
      const { data } = await apiClient.get<AvailableOccupationsResponse>('/occupations/available', { params })
      return data
    },
    enabled: enabled && query.length >= 2,
  })
}

export function useSyncOccupations() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params?: { codes?: string[]; search?: string; limit?: number }) => {
      const queryParams = new URLSearchParams()
      if (params?.codes) {
        params.codes.forEach(code => queryParams.append('codes', code))
      }
      if (params?.search) {
        queryParams.set('search', params.search)
      }
      if (params?.limit) {
        queryParams.set('limit', params.limit.toString())
      }
      const url = queryParams.toString() ? `/occupations/sync?${queryParams}` : '/occupations/sync'
      const { data } = await apiClient.post(url)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['occupations'] })
    },
  })
}

export function useSyncSingleOccupation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (faethmCode: string) => {
      const { data } = await apiClient.post<Occupation>(`/occupations/sync-by-code/${faethmCode}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['occupations'] })
    },
  })
}

// CSV Upload for Teams
export function useUploadTeamsCSV() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, updateExisting }: { file: File; updateExisting: boolean }) => {
      const formData = new FormData()
      formData.append('file', file)
      // Use raw axios to avoid default Content-Type header from apiClient
      const { data } = await axios.post<CSVUploadResult>(
        `/api/v1/teams/upload-csv?update_existing=${updateExisting}`,
        formData
      )
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    },
  })
}

// System Status
export function useSystemStatus() {
  return useQuery({
    queryKey: ['status'],
    queryFn: async () => {
      const { data } = await apiClient.get<SystemStatus>('/status')
      return data
    },
  })
}

// Survey Question Mapping
export function useSurveyQuestionMapping(surveyId: string) {
  return useQuery({
    queryKey: ['surveys', surveyId, 'question-mapping'],
    queryFn: async () => {
      const { data } = await apiClient.get<SurveyQuestionMapping>(`/status/surveys/${surveyId}/question-mapping`)
      return data
    },
    enabled: !!surveyId,
  })
}

// LLM Test and Config
export function useTestLLM() {
  return useMutation({
    mutationFn: async (model?: string) => {
      const params = model ? { model } : {}
      const { data } = await apiClient.get<LLMTestResult>('/status/llm/test', { params })
      return data
    },
  })
}

export function useLLMConfig() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.get<LLMConfigResponse>('/status/llm/config')
      return data
    },
  })
}
