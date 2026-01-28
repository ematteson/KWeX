import { useState } from 'react'
import { useSystemStatus, useTestLLM, useLLMConfig, useResetAll, useResetTasks, useResetOccupation, useDeleteOccupation, useSurveysForSampleData, useGenerateSampleData } from '../api/hooks'
import type { LLMTestResult, LLMConfigResponse } from '../api/types'
import { VERSION as FRONTEND_VERSION } from '../version'

interface StatusModalProps {
  isOpen: boolean
  onClose: () => void
}

export function StatusModal({ isOpen, onClose }: StatusModalProps) {
  const { data: status, isLoading, error, refetch } = useSystemStatus()
  const testLLM = useTestLLM()
  const getLLMConfig = useLLMConfig()
  const resetAll = useResetAll()
  const resetTasks = useResetTasks()
  const resetOccupation = useResetOccupation()
  const deleteOccupation = useDeleteOccupation()
  const { data: surveysData, refetch: refetchSurveys } = useSurveysForSampleData()
  const generateSampleData = useGenerateSampleData()

  const [llmTestResult, setLLMTestResult] = useState<LLMTestResult | null>(null)
  const [llmConfig, setLLMConfig] = useState<LLMConfigResponse | null>(null)
  const [confirmingReset, setConfirmingReset] = useState<'all' | 'tasks' | null>(null)
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Sample data generation state
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>('')
  const [sampleCount, setSampleCount] = useState<number>(5)
  const [sampleMode, setSampleMode] = useState<'random' | 'persona'>('random')
  const [sampleDataResult, setSampleDataResult] = useState<{ type: 'success' | 'error'; text: string; personas?: string[] } | null>(null)

  const handleResetAll = async () => {
    try {
      const result = await resetAll.mutateAsync()
      setResetMessage({ type: 'success', text: `Database reset: ${result.message || 'All data cleared'}` })
      setConfirmingReset(null)
      refetch()
    } catch (err) {
      setResetMessage({ type: 'error', text: `Reset failed: ${err instanceof Error ? err.message : 'Unknown error'}` })
    }
  }

  const handleResetTasks = async () => {
    try {
      const result = await resetTasks.mutateAsync()
      setResetMessage({ type: 'success', text: `Tasks reset: ${result.deleted.occupation_tasks || 0} assignments, ${result.deleted.global_tasks || 0} tasks cleared` })
      setConfirmingReset(null)
      refetch()
    } catch (err) {
      setResetMessage({ type: 'error', text: `Reset failed: ${err instanceof Error ? err.message : 'Unknown error'}` })
    }
  }

  const handleResetOccupation = async (occId: string, occName: string) => {
    if (!window.confirm(`Reset task assignments for "${occName}"? This will remove all task links for this occupation.`)) return
    try {
      const result = await resetOccupation.mutateAsync(occId)
      setResetMessage({ type: 'success', text: `Reset "${occName}": ${result.deleted.occupation_tasks || 0} task assignments cleared` })
      refetch()
    } catch (err) {
      setResetMessage({ type: 'error', text: `Reset failed: ${err instanceof Error ? err.message : 'Unknown error'}` })
    }
  }

  const handleDeleteOccupation = async (occId: string, occName: string) => {
    if (!window.confirm(`DELETE "${occName}" completely? This cannot be undone and will remove the occupation and all its data.`)) return
    try {
      await deleteOccupation.mutateAsync(occId)
      setResetMessage({ type: 'success', text: `Deleted "${occName}" and all associated data` })
      refetch()
    } catch (err) {
      setResetMessage({ type: 'error', text: `Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}` })
    }
  }

  const handleGenerateSampleData = async () => {
    if (!selectedSurveyId) {
      setSampleDataResult({ type: 'error', text: 'Please select a survey' })
      return
    }
    try {
      setSampleDataResult(null)
      const result = await generateSampleData.mutateAsync({
        survey_id: selectedSurveyId,
        count: sampleCount,
        mode: sampleMode,
      })
      setSampleDataResult({
        type: 'success',
        text: result.message,
        personas: result.personas_used || undefined,
      })
      refetch()
      refetchSurveys()
    } catch (err) {
      setSampleDataResult({ type: 'error', text: `Generation failed: ${err instanceof Error ? err.message : 'Unknown error'}` })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">System Status</h2>
            <p className="text-sm text-gray-500">Faethm integration and database overview</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading status...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              <p>Failed to load status</p>
              <button
                onClick={() => refetch()}
                className="mt-2 text-blue-600 hover:underline"
              >
                Retry
              </button>
            </div>
          ) : status ? (
            <div className="space-y-6">
              {/* Version Info */}
              <section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-gray-900">KWeX {status.version?.backend_name || ''}</h3>
                    <p className="text-sm text-gray-600">
                      Backend: v{status.version?.backend || 'unknown'} | Frontend: v{FRONTEND_VERSION}
                    </p>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>{status.environment}</p>
                    <p>{status.version?.backend_build_date}</p>
                  </div>
                </div>
              </section>

              {/* Faethm Connection Status */}
              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${
                    status.faethm.mode === 'live' ? 'bg-green-500' : 'bg-yellow-500'
                  }`}></span>
                  Faethm Integration
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Mode</p>
                      <p className={`font-semibold ${
                        status.faethm.mode === 'live' ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {status.faethm.mode === 'live' ? 'Live API' : 'Mock Data (CSV)'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">API Key</p>
                      <p className={`font-semibold ${
                        status.faethm.api_key_configured ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {status.faethm.api_key_configured ? 'Configured (FaethmPROD)' : 'Not Configured'}
                      </p>
                    </div>
                  </div>

                  {status.faethm.mode === 'live' && status.faethm.api_url && (
                    <div>
                      <p className="text-sm text-gray-500">API URL</p>
                      <p className="font-mono text-sm">{status.faethm.api_url}</p>
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-500">CSV Data Source</p>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        status.faethm.csv_exists ? 'bg-green-500' : 'bg-red-500'
                      }`}></span>
                      <p className="font-mono text-sm truncate">{status.faethm.csv_path}</p>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {status.faethm.csv_occupations_count.toLocaleString()} occupations available
                    </p>
                  </div>
                </div>
              </section>

              {/* Database Statistics */}
              <section>
                <h3 className="text-lg font-semibold mb-3">Database Statistics</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <StatCard
                    label="Occupations Synced"
                    value={status.database.occupations_synced}
                    icon="briefcase"
                  />
                  <StatCard
                    label="Tasks"
                    value={status.database.tasks_count}
                    icon="clipboard"
                  />
                  <StatCard
                    label="Teams"
                    value={status.database.teams_count}
                    icon="users"
                  />
                  <StatCard
                    label="Surveys"
                    value={status.database.surveys_count}
                    icon="document"
                  />
                  <StatCard
                    label="Questions"
                    value={status.database.questions_count}
                    icon="question"
                  />
                  <StatCard
                    label="Responses"
                    value={status.database.responses_count}
                    icon="check"
                  />
                </div>
              </section>

              {/* Configuration */}
              <section>
                <h3 className="text-lg font-semibold mb-3">Configuration</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Environment</p>
                      <p className="font-semibold capitalize">{status.environment}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Privacy Threshold</p>
                      <p className="font-semibold">{status.privacy_threshold} responses</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Max Survey Duration</p>
                      <p className="font-semibold">{status.max_survey_minutes} minutes</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Last Updated</p>
                      <p className="font-semibold">{new Date(status.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* LLM Status */}
              {status.llm && (
                <section>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${
                      status.llm.mock_setting ? 'bg-yellow-500' :
                      (status.llm.claude.available || status.llm.gpt.available) ? 'bg-green-500' : 'bg-red-500'
                    }`}></span>
                    LLM Integration
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    {/* Mode and Model */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Mode</p>
                        <p className={`font-semibold ${status.llm.mock_setting ? 'text-yellow-600' : 'text-green-600'}`}>
                          {status.llm.mock_setting ? 'Mock (Development)' : 'Live'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Default Model</p>
                        <p className="font-semibold capitalize">{status.llm.default_model}</p>
                      </div>
                    </div>

                    {/* Claude Endpoint */}
                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-2 h-2 rounded-full ${
                          status.llm.claude.available ? 'bg-green-500' :
                          status.llm.claude.api_key_configured ? 'bg-yellow-500' : 'bg-gray-400'
                        }`}></span>
                        <p className="text-sm font-medium">{status.llm.claude.name}</p>
                      </div>
                      <div className="text-sm text-gray-600 ml-4">
                        <p>Configured: {status.llm.claude.api_key_configured ? 'Yes' : 'No'}</p>
                        <p>Deployment: {status.llm.claude.deployment}</p>
                        {status.llm.claude.endpoint && (
                          <p className="font-mono text-xs truncate">{status.llm.claude.endpoint}</p>
                        )}
                        <p>API Key: {status.llm.claude.api_key_preview}</p>
                      </div>
                    </div>

                    {/* GPT Endpoint */}
                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-2 h-2 rounded-full ${
                          status.llm.gpt.available ? 'bg-green-500' :
                          status.llm.gpt.api_key_configured ? 'bg-yellow-500' : 'bg-gray-400'
                        }`}></span>
                        <p className="text-sm font-medium">{status.llm.gpt.name}</p>
                      </div>
                      <div className="text-sm text-gray-600 ml-4">
                        <p>Configured: {status.llm.gpt.api_key_configured ? 'Yes' : 'No'}</p>
                        <p>Deployment: {status.llm.gpt.deployment}</p>
                        {status.llm.gpt.endpoint && (
                          <p className="font-mono text-xs truncate">{status.llm.gpt.endpoint}</p>
                        )}
                        <p>API Key: {status.llm.gpt.api_key_preview}</p>
                      </div>
                    </div>

                    {/* Environment Variables */}
                    <div className="border-t border-gray-200 pt-3">
                      <p className="text-sm font-medium mb-2">Environment Variables</p>
                      <div className="text-xs font-mono space-y-1">
                        {Object.entries(status.llm.env_vars).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-500">{key}:</span>
                            <span className={value === 'set' || value.includes('true') ? 'text-green-600' : 'text-gray-600'}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Stats */}
                    {status.llm_stats && (
                      <div className="border-t border-gray-200 pt-3">
                        <p className="text-sm font-medium mb-2">Statistics</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Total Calls: {status.llm_stats.total_llm_calls}</div>
                          <div>Successful: {status.llm_stats.successful_calls}</div>
                          <div>Failed: {status.llm_stats.failed_calls}</div>
                          <div>Cached Templates: {status.llm_stats.cached_templates_count}</div>
                          <div>Enriched Tasks: {status.llm_stats.enriched_tasks_count}</div>
                        </div>
                        {status.llm_stats.recent_operations.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm font-medium">Recent Operations:</p>
                            <div className="max-h-32 overflow-y-auto">
                              {status.llm_stats.recent_operations.slice(0, 5).map((op) => (
                                <div key={op.id} className={`text-xs py-1 border-b border-gray-100 ${op.success ? '' : 'text-red-600'}`}>
                                  <span className="font-medium">{op.operation}</span>
                                  <span className="text-gray-500"> - {op.model}</span>
                                  {op.latency_ms && <span className="text-gray-400"> ({op.latency_ms}ms)</span>}
                                  {op.error && <div className="text-red-500 truncate">{op.error}</div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Test Buttons */}
                    <div className="border-t border-gray-200 pt-3">
                      <p className="text-sm font-medium mb-2">Diagnostics</p>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            setLLMTestResult(null)
                            const result = await testLLM.mutateAsync(undefined)
                            setLLMTestResult(result)
                          }}
                          disabled={testLLM.isPending}
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {testLLM.isPending ? 'Testing...' : 'Test LLM Connection'}
                        </button>
                        <button
                          onClick={async () => {
                            setLLMConfig(null)
                            const result = await getLLMConfig.mutateAsync()
                            setLLMConfig(result)
                          }}
                          disabled={getLLMConfig.isPending}
                          className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
                        >
                          {getLLMConfig.isPending ? 'Loading...' : 'View Config'}
                        </button>
                      </div>

                      {/* Test Result */}
                      {llmTestResult && (
                        <div className={`mt-3 p-3 rounded text-sm ${
                          llmTestResult.test_result?.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                        }`}>
                          <p className={`font-medium ${llmTestResult.test_result?.success ? 'text-green-700' : 'text-red-700'}`}>
                            {llmTestResult.test_result?.success ? 'Success!' : 'Failed'}
                          </p>
                          {llmTestResult.client && (
                            <p className="text-gray-700">Client: {llmTestResult.client.type} ({llmTestResult.client.model_name})</p>
                          )}
                          {llmTestResult.test_result?.response && (
                            <p className="text-gray-700 mt-1">Response: {llmTestResult.test_result.response}</p>
                          )}
                          {llmTestResult.test_result?.latency_ms && (
                            <p className="text-gray-600">Latency: {llmTestResult.test_result.latency_ms}ms</p>
                          )}
                          {llmTestResult.error && (
                            <p className="text-red-600 mt-1">{llmTestResult.error}</p>
                          )}
                        </div>
                      )}

                      {/* Config Details */}
                      {llmConfig && (
                        <div className="mt-3 p-3 bg-gray-100 rounded text-sm max-h-64 overflow-y-auto">
                          <p className="font-medium mb-2">Configuration Details</p>

                          <div className="mb-3">
                            <p className="text-xs font-medium text-gray-500 mb-1">Why Mock Mode?</p>
                            <p className="text-sm bg-yellow-50 p-2 rounded">{llmConfig.why_mock_mode}</p>
                          </div>

                          <div className="mb-3">
                            <p className="text-xs font-medium text-gray-500 mb-1">.env File ({llmConfig.env_file_exists ? 'Found' : 'Not Found'})</p>
                            <p className="font-mono text-xs text-gray-600 truncate">{llmConfig.env_file_path}</p>
                            {Object.keys(llmConfig.env_file_llm_vars).length > 0 && (
                              <div className="mt-1 text-xs font-mono bg-white p-2 rounded">
                                {Object.entries(llmConfig.env_file_llm_vars).map(([key, value]) => (
                                  <div key={key}>{key}={value}</div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="mb-3">
                            <p className="text-xs font-medium text-gray-500 mb-1">Loaded Settings</p>
                            <div className="text-xs font-mono bg-white p-2 rounded">
                              {Object.entries(llmConfig.loaded_settings).map(([key, value]) => (
                                <div key={key}>{key}: {String(value)}</div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">OS Environment</p>
                            <div className="text-xs font-mono bg-white p-2 rounded">
                              {Object.entries(llmConfig.os_environ_llm_vars).map(([key, value]) => (
                                <div key={key} className={value === 'set' ? 'text-green-600' : 'text-gray-500'}>
                                  {key}: {value}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* Data Management */}
              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                  Data Management (Development)
                </h3>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  {resetMessage && (
                    <div className={`mb-4 p-3 rounded text-sm ${
                      resetMessage.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'
                    }`}>
                      {resetMessage.text}
                      <button onClick={() => setResetMessage(null)} className="ml-2 text-gray-500 hover:text-gray-700">&times;</button>
                    </div>
                  )}

                  {confirmingReset === 'all' ? (
                    <div className="bg-red-100 border border-red-300 rounded-lg p-4">
                      <p className="text-red-800 font-medium mb-2">Confirm Full Database Reset</p>
                      <p className="text-red-700 text-sm mb-4">
                        This will delete ALL data: occupations, tasks, teams, surveys, questions, responses, and opportunities. This cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleResetAll}
                          disabled={resetAll.isPending}
                          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          {resetAll.isPending ? 'Resetting...' : 'Yes, Reset Everything'}
                        </button>
                        <button
                          onClick={() => setConfirmingReset(null)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : confirmingReset === 'tasks' ? (
                    <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4">
                      <p className="text-yellow-800 font-medium mb-2">Confirm Task Reset</p>
                      <p className="text-yellow-700 text-sm mb-4">
                        This will delete all task assignments and global tasks. Occupations, teams, and surveys will remain.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleResetTasks}
                          disabled={resetTasks.isPending}
                          className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
                        >
                          {resetTasks.isPending ? 'Resetting...' : 'Yes, Reset Tasks'}
                        </button>
                        <button
                          onClick={() => setConfirmingReset(null)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-orange-800">
                        Use these options to reset data during development. All actions require confirmation.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setConfirmingReset('all')}
                          className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                          Reset All Data
                        </button>
                        <button
                          onClick={() => setConfirmingReset('tasks')}
                          className="px-4 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                        >
                          Reset Tasks Only
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Sample Data Generation */}
              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                  Sample Data Generation
                </h3>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  {sampleDataResult && (
                    <div className={`mb-4 p-3 rounded text-sm ${
                      sampleDataResult.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'
                    }`}>
                      <div>{sampleDataResult.text}</div>
                      {sampleDataResult.personas && sampleDataResult.personas.length > 0 && (
                        <div className="mt-2 text-xs">
                          Personas used: {sampleDataResult.personas.join(', ')}
                        </div>
                      )}
                      <button onClick={() => setSampleDataResult(null)} className="ml-2 text-gray-500 hover:text-gray-700">&times;</button>
                    </div>
                  )}

                  <p className="text-sm text-purple-800 mb-4">
                    Generate sample survey responses for testing metrics and dashboards.
                  </p>

                  {surveysData && surveysData.surveys.length > 0 ? (
                    <div className="space-y-4">
                      {/* Survey Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Survey</label>
                        <select
                          value={selectedSurveyId}
                          onChange={(e) => setSelectedSurveyId(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="">Choose a survey...</option>
                          {surveysData.surveys.map((s: { id: string; name: string; team_name: string; status: string; question_count: number; response_count: number; can_generate?: boolean }) => (
                            <option key={s.id} value={s.id} disabled={s.status !== 'active'}>
                              {s.status !== 'active' ? `[${s.status.toUpperCase()}] ` : ''}{s.name} ({s.team_name}) - {s.question_count}q, {s.response_count} responses
                            </option>
                          ))}
                        </select>
                        {selectedSurveyId && surveysData.surveys.find((s: { id: string; status: string }) => s.id === selectedSurveyId)?.status !== 'active' && (
                          <p className="text-xs text-red-600 mt-1">This survey must be activated before generating sample data.</p>
                        )}
                      </div>

                      {/* Count and Mode */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Number of Responses</label>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={sampleCount}
                            onChange={(e) => setSampleCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Generation Mode</label>
                          <select
                            value={sampleMode}
                            onChange={(e) => setSampleMode(e.target.value as 'random' | 'persona')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          >
                            <option value="random">Random (fast)</option>
                            <option value="persona">Persona-based (LLM, realistic)</option>
                          </select>
                        </div>
                      </div>

                      {/* Mode Description */}
                      <div className="text-xs text-gray-600 bg-white rounded p-2">
                        {sampleMode === 'random' ? (
                          <>
                            <strong>Random Mode:</strong> Generates statistically distributed random answers. Fast and good for stress testing.
                          </>
                        ) : (
                          <>
                            <strong>Persona Mode:</strong> Uses LLM to generate realistic answers from different employee personas
                            (e.g., "Frustrated Veteran", "Enthusiastic New Hire", "Burned Out Manager").
                            Slower but produces more realistic data patterns.
                            {surveysData.personas_available && (
                              <div className="mt-1">
                                Available personas: {surveysData.personas_available.slice(0, 4).join(', ')}
                                {surveysData.personas_available.length > 4 && ` + ${surveysData.personas_available.length - 4} more`}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Generate Button */}
                      <button
                        onClick={handleGenerateSampleData}
                        disabled={
                          generateSampleData.isPending ||
                          !selectedSurveyId ||
                          surveysData.surveys.find((s: { id: string; status: string }) => s.id === selectedSurveyId)?.status !== 'active'
                        }
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {generateSampleData.isPending ? 'Generating...' : `Generate ${sampleCount} Sample Response${sampleCount > 1 ? 's' : ''}`}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <p>No surveys with questions found.</p>
                      <p className="text-xs mt-1">Create a survey and generate questions first, then activate it.</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Synced Occupations */}
              {status.synced_occupations.length > 0 && (
                <section>
                  <h3 className="text-lg font-semibold mb-3">
                    Synced Occupations ({status.synced_occupations.length})
                  </h3>
                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">Code</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">Name</th>
                          <th className="px-4 py-2 text-center font-medium text-gray-600">Tasks</th>
                          <th className="px-4 py-2 text-center font-medium text-gray-600">Teams</th>
                          <th className="px-4 py-2 text-center font-medium text-gray-600">Surveys</th>
                          <th className="px-4 py-2 text-center font-medium text-gray-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {status.synced_occupations.map((occ) => (
                          <tr key={occ.id} className="hover:bg-gray-100">
                            <td className="px-4 py-2 font-mono text-blue-600">
                              {occ.faethm_code || '-'}
                            </td>
                            <td className="px-4 py-2">{occ.name}</td>
                            <td className="px-4 py-2 text-center">{occ.task_count}</td>
                            <td className="px-4 py-2 text-center">{occ.team_count}</td>
                            <td className="px-4 py-2 text-center">{occ.survey_count}</td>
                            <td className="px-4 py-2 text-center">
                              <div className="flex justify-center gap-1">
                                <button
                                  onClick={() => handleResetOccupation(occ.id, occ.name)}
                                  disabled={resetOccupation.isPending}
                                  className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 disabled:opacity-50"
                                  title="Reset task assignments"
                                >
                                  Reset
                                </button>
                                <button
                                  onClick={() => handleDeleteOccupation(occ.id, occ.name)}
                                  disabled={deleteOccupation.isPending}
                                  className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                                  title="Delete occupation"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
          <button
            onClick={() => refetch()}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Refresh Status
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: _icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
      <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}
