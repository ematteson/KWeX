// Enums matching backend
export type FrictionType = 'clarity' | 'tooling' | 'process' | 'rework' | 'delay' | 'safety'
export type QuestionType = 'likert_5' | 'likert_7' | 'multiple_choice' | 'percentage_slider' | 'free_text'
export type SurveyStatus = 'draft' | 'active' | 'closed'
export type OpportunityStatus = 'identified' | 'in_progress' | 'completed' | 'deferred'
export type TrendDirection = 'up' | 'down' | 'stable'

// Team
export interface Team {
  id: string
  name: string
  function: string
  occupation_id: string
  member_count: number
  created_at: string
}

// Survey
export interface Survey {
  id: string
  occupation_id: string
  team_id: string
  name: string
  status: SurveyStatus
  anonymous_mode: boolean
  estimated_completion_minutes: number
  created_at: string
  closes_at: string | null
  questions: Question[]
}

// Question options (custom per question)
export interface QuestionOptions {
  choices: string[]
  low_label: string
  high_label: string
}

// Question
export interface Question {
  id: string
  survey_id: string
  dimension: FrictionType
  text: string
  type: QuestionType
  options: QuestionOptions | null
  order: number
  required: boolean
}

// Answer for submission
export interface AnswerSubmission {
  question_id: string
  value: string
  numeric_value: number | null
}

// Survey response (submission)
export interface SurveyResponse {
  id: string
  survey_id: string
  anonymous_token: string
  submitted_at: string | null
  completion_time_seconds: number | null
  is_complete: boolean
  started_at: string
}

// Metric Result
export interface MetricResult {
  id: string
  team_id: string
  survey_id: string
  calculation_date: string
  respondent_count: number
  meets_privacy_threshold: boolean
  flow_score: number | null
  friction_score: number | null
  safety_score: number | null
  portfolio_balance_score: number | null
  flow_breakdown: Record<string, number> | null
  friction_breakdown: Record<string, number> | null
  safety_breakdown: Record<string, number> | null
  portfolio_breakdown: Record<string, number> | null
  trend_direction: TrendDirection | null
}

// Opportunity
export interface Opportunity {
  id: string
  team_id: string
  survey_id: string | null
  friction_type: FrictionType | null
  reach: number
  impact: number
  confidence: number
  effort: number
  rice_score: number
  source_score: number | null
  title: string
  description: string | null
  status: OpportunityStatus
  created_at: string
  updated_at: string
  completed_at: string | null
}

// Summary response from opportunities endpoint
export interface OpportunitySummary {
  team_id: string
  total_opportunities: number
  status_counts: Record<OpportunityStatus, number>
  average_rice_score: number
  top_priorities: {
    id: string
    title: string
    rice_score: number
    friction_type: FrictionType | null
  }[]
}

// Privacy threshold response
export interface PrivacyResponse {
  message: string
  respondent_count: number
  minimum_required: number
  meets_threshold: boolean
}

// Occupation
export interface Occupation {
  id: string
  name: string
  faethm_code: string | null
  description: string | null
  ideal_run_percentage: number
  ideal_change_percentage: number
  throughput_indicators: string[] | null
  created_at: string
  updated_at: string
}

// Available occupation (from Faethm, not yet synced)
export interface AvailableOccupation {
  faethm_code: string
  name: string
  description: string
}

export interface AvailableOccupationsResponse {
  total_available: number
  returned: number
  occupations: AvailableOccupation[]
}

// CSV Upload Result
export interface CSVUploadResult {
  total_rows: number
  created: number
  updated: number
  errors: { row: number; error: string }[]
  teams: Team[]
}

// Survey Creation
export interface SurveyCreate {
  name: string
  team_id: string
  occupation_id: string
}

// Survey Link Response
export interface SurveyLinkResponse {
  token: string
  url: string
}

// Survey Stats
export interface SurveyStats {
  survey_id: string
  total_responses: number
  complete_responses: number
  meets_privacy_threshold: boolean
  average_completion_time_seconds: number | null
}

// System Status Types
export interface FaethmStatus {
  mode: 'live' | 'mock'
  api_url: string | null
  api_key_configured: boolean
  csv_path: string
  csv_exists: boolean
  csv_occupations_count: number
}

export interface DatabaseStatus {
  occupations_synced: number
  tasks_count: number
  teams_count: number
  surveys_count: number
  questions_count: number
  responses_count: number
  occupations_with_tasks: number
}

export interface OccupationSummary {
  id: string
  name: string
  faethm_code: string | null
  task_count: number
  team_count: number
  survey_count: number
}

export interface SystemStatus {
  timestamp: string
  environment: string
  faethm: FaethmStatus
  database: DatabaseStatus
  synced_occupations: OccupationSummary[]
  privacy_threshold: number
  max_survey_minutes: number
  llm?: LLMStatus
  llm_stats?: LLMStats
}

// Question to Task Mapping
export interface QuestionTaskMapping {
  question_id: string
  question_text: string
  question_order: number
  dimension: string
  dimension_label: string
  task_id: string | null
  task_name: string | null
  task_description: string | null
  faethm_task_id: string | null
  metric_mapping: string[]
}

export interface SurveyQuestionMapping {
  survey_id: string
  survey_name: string
  occupation_id: string
  occupation_name: string
  occupation_faethm_code: string | null
  total_questions: number
  questions_with_tasks: number
  questions: QuestionTaskMapping[]
}

// LLM Status Types
export interface LLMEndpointStatus {
  name: string
  endpoint: string
  api_key_configured: boolean
  api_key_preview: string
  deployment: string
  available: boolean
}

export interface LLMStats {
  enriched_tasks_count: number
  cached_templates_count: number
  total_llm_calls: number
  successful_calls: number
  failed_calls: number
  recent_operations: {
    id: string
    operation: string
    model: string
    success: boolean
    latency_ms: number | null
    tokens_in: number | null
    tokens_out: number | null
    error: string | null
    created_at: string | null
  }[]
}

export interface LLMStatus {
  mode: string
  mock_setting: boolean
  default_model: string
  temperature: number
  max_tokens: number
  cache_min_quality: number
  claude: LLMEndpointStatus
  gpt: LLMEndpointStatus
  env_vars: Record<string, string>
}

export interface LLMTestResult {
  settings: {
    llm_mock: boolean
    default_model: string
    temperature: number
    max_tokens: number
  }
  environment: Record<string, string>
  client: {
    type: string
    model_name: string
    is_available: boolean
  } | null
  test_result: {
    success: boolean
    response?: string
    model?: string
    tokens_input?: number
    tokens_output?: number
    latency_ms?: number
  } | null
  error: string | null
  traceback: string | null
}

export interface LLMConfigResponse {
  settings_source: string
  env_file_path: string
  env_file_exists: boolean
  env_file_llm_vars: Record<string, string>
  loaded_settings: Record<string, string | number | boolean>
  os_environ_llm_vars: Record<string, string>
  why_mock_mode: string
}
