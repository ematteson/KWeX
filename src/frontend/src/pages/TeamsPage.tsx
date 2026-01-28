import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  useTeams,
  useOccupations,
  useSyncOccupations,
  useUploadTeamsCSV,
  useSearchAvailableOccupations,
  useSyncSingleOccupation,
} from '../api/hooks'
import type { CSVUploadResult, AvailableOccupation } from '../api/types'

export function TeamsPage() {
  const { data: teams, isLoading, error, refetch } = useTeams()
  const { data: occupations, refetch: refetchOccupations } = useOccupations()
  const syncOccupations = useSyncOccupations()
  const syncSingleOccupation = useSyncSingleOccupation()
  const uploadCSV = useUploadTeamsCSV()

  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showOccupationModal, setShowOccupationModal] = useState(false)
  const [updateExisting, setUpdateExisting] = useState(false)
  const [uploadResult, setUploadResult] = useState<CSVUploadResult | null>(null)
  const [occupationSearch, setOccupationSearch] = useState('')
  const [syncingCode, setSyncingCode] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: availableOccupations, isLoading: searchingOccupations } = useSearchAvailableOccupations(
    occupationSearch,
    occupationSearch.length >= 2
  )

  const handleSyncOccupations = async () => {
    try {
      await syncOccupations.mutateAsync({ limit: 50 })
      refetchOccupations()
    } catch (err) {
      console.error('Failed to sync occupations:', err)
    }
  }

  const handleSyncSingleOccupation = async (code: string) => {
    setSyncingCode(code)
    try {
      await syncSingleOccupation.mutateAsync(code)
      refetchOccupations()
    } catch (err) {
      console.error('Failed to sync occupation:', err)
    } finally {
      setSyncingCode(null)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const result = await uploadCSV.mutateAsync({ file, updateExisting })
      setUploadResult(result)
    } catch (err) {
      console.error('Failed to upload CSV:', err)
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const downloadTemplate = () => {
    window.open('/api/v1/teams/csv-template', '_blank')
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-pearson-gray-900">Teams</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-5 bg-pearson-gray-200 rounded w-32 mb-2"></div>
              <div className="h-4 bg-pearson-gray-200 rounded w-24 mb-3"></div>
              <div className="h-3 bg-pearson-gray-200 rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-medium text-pearson-gray-900 mb-2">Unable to load teams</h2>
        <p className="text-pearson-gray-600">Please check your connection and try again.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-pearson-gray-900">Teams</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowOccupationModal(true)}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Browse Occupations
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Upload CSV
          </button>
        </div>
      </div>

      {/* Occupations Status */}
      {occupations && occupations.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            <span className="font-medium">{occupations.length} occupations</span> synced.{' '}
            <button
              onClick={() => setShowOccupationModal(true)}
              className="underline hover:text-green-900"
            >
              Browse all available occupations
            </button>
          </p>
        </div>
      )}

      {(!occupations || occupations.length === 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            No occupations synced yet.{' '}
            <button
              onClick={() => setShowOccupationModal(true)}
              className="underline hover:text-yellow-900 font-medium"
            >
              Browse and sync occupations
            </button>{' '}
            to get started.
          </p>
        </div>
      )}

      {teams && teams.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Link
              key={team.id}
              to={`/teams/${team.id}`}
              className="card hover:shadow-md transition-shadow group"
            >
              <h2 className="text-lg font-semibold text-pearson-gray-800 group-hover:text-pearson-blue transition-colors">
                {team.name}
              </h2>
              <p className="text-sm text-pearson-gray-600 mb-3">{team.function}</p>
              <div className="flex items-center gap-4 text-xs text-pearson-gray-500">
                <span>{team.member_count} members</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border border-pearson-gray-200">
          <h2 className="text-lg font-medium text-pearson-gray-900 mb-2">No teams found</h2>
          <p className="text-pearson-gray-600 mb-4">Upload a CSV file to create teams.</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Upload CSV
          </button>
        </div>
      )}

      {/* Occupation Browser Modal */}
      {showOccupationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Browse Occupations</h2>
                <button
                  onClick={() => {
                    setShowOccupationModal(false)
                    setOccupationSearch('')
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Search from 1,400+ Faethm job codes. Sync the ones you need for your teams.
              </p>

              <input
                type="text"
                value={occupationSearch}
                onChange={(e) => setOccupationSearch(e.target.value)}
                placeholder="Search by job name or code (e.g., 'manager', 'ADM')..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {occupationSearch.length < 2 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Type at least 2 characters to search occupations</p>
                  <p className="text-sm mt-2">
                    Or{' '}
                    <button
                      onClick={handleSyncOccupations}
                      disabled={syncOccupations.isPending}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      {syncOccupations.isPending ? 'syncing...' : 'sync first 50 occupations'}
                    </button>
                  </p>
                </div>
              ) : searchingOccupations ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-600">Searching...</p>
                </div>
              ) : availableOccupations && availableOccupations.occupations.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500 mb-4">
                    Showing {availableOccupations.returned} of {availableOccupations.total_available} total occupations
                  </p>
                  {availableOccupations.occupations.map((occ: AvailableOccupation) => {
                    const isSynced = occupations?.some(o => o.faethm_code === occ.faethm_code)
                    const isSyncing = syncingCode === occ.faethm_code

                    return (
                      <div
                        key={occ.faethm_code}
                        className="border border-gray-200 rounded-lg p-4 hover:border-gray-300"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm text-blue-600 font-medium">
                                {occ.faethm_code}
                              </span>
                              {isSynced && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                  Synced
                                </span>
                              )}
                            </div>
                            <h3 className="font-medium text-gray-900 mt-1">{occ.name}</h3>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {occ.description}
                            </p>
                          </div>
                          <button
                            onClick={() => handleSyncSingleOccupation(occ.faethm_code)}
                            disabled={isSynced || isSyncing}
                            className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap ${
                              isSynced
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : isSyncing
                                ? 'bg-blue-100 text-blue-600'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            {isSynced ? 'Synced' : isSyncing ? 'Syncing...' : 'Sync'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No occupations found for "{occupationSearch}"
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {occupations?.length || 0} occupations currently synced
                </span>
                <button
                  onClick={() => {
                    setShowOccupationModal(false)
                    setOccupationSearch('')
                  }}
                  className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Upload Teams CSV</h2>
                <button
                  onClick={() => {
                    setShowUploadModal(false)
                    setUploadResult(null)
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {!uploadResult ? (
                <>
                  <div className="mb-4">
                    <h3 className="font-medium text-gray-900 mb-2">CSV Format</h3>
                    <div className="bg-gray-50 rounded-lg p-3 text-sm font-mono overflow-x-auto">
                      <p className="text-gray-600">name,function,occupation_code,member_count</p>
                      <p className="text-gray-500">Product Team,Product Management,ADM.ABP,12</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h3 className="font-medium text-gray-900 mb-2">Synced Occupation Codes</h3>
                    {occupations && occupations.length > 0 ? (
                      <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                        <ul className="text-sm space-y-1">
                          {occupations.slice(0, 20).map(o => (
                            <li key={o.id} className="text-gray-600">
                              <span className="font-mono font-medium">{o.faethm_code}</span> - {o.name}
                            </li>
                          ))}
                          {occupations.length > 20 && (
                            <li className="text-gray-400">
                              ... and {occupations.length - 20} more
                            </li>
                          )}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-sm text-yellow-600">
                        No occupations synced.{' '}
                        <button
                          onClick={() => {
                            setShowUploadModal(false)
                            setShowOccupationModal(true)
                          }}
                          className="underline"
                        >
                          Browse and sync occupations first
                        </button>
                      </p>
                    )}
                  </div>

                  <div className="mb-4">
                    <button
                      onClick={downloadTemplate}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Download CSV Template
                    </button>
                  </div>

                  <div className="mb-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={updateExisting}
                        onChange={(e) => setUpdateExisting(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">Update existing teams with same name</span>
                    </label>
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label
                      htmlFor="csv-upload"
                      className="cursor-pointer"
                    >
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-600">
                        <span className="text-blue-600 hover:text-blue-500">Click to upload</span> or drag and drop
                      </p>
                      <p className="mt-1 text-xs text-gray-500">CSV files only</p>
                    </label>
                  </div>

                  {uploadCSV.isPending && (
                    <div className="mt-4 text-center">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <p className="mt-2 text-sm text-gray-600">Uploading...</p>
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <div className="mb-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-green-50 rounded-lg p-3">
                        <p className="text-2xl font-bold text-green-600">{uploadResult.created}</p>
                        <p className="text-sm text-green-700">Created</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-2xl font-bold text-blue-600">{uploadResult.updated}</p>
                        <p className="text-sm text-blue-700">Updated</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3">
                        <p className="text-2xl font-bold text-red-600">{uploadResult.errors.length}</p>
                        <p className="text-sm text-red-700">Errors</p>
                      </div>
                    </div>
                  </div>

                  {uploadResult.errors.length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-medium text-red-900 mb-2">Errors</h3>
                      <div className="bg-red-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                        <ul className="text-sm space-y-1">
                          {uploadResult.errors.map((err, i) => (
                            <li key={i} className="text-red-700">
                              Row {err.row}: {err.error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {uploadResult.teams.length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-medium text-gray-900 mb-2">Teams Processed</h3>
                      <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                        <ul className="text-sm space-y-1">
                          {uploadResult.teams.map((team) => (
                            <li key={team.id} className="text-gray-700">
                              {team.name} ({team.function}) - {team.member_count} members
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setUploadResult(null)}
                      className="flex-1 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      Upload Another
                    </button>
                    <button
                      onClick={() => {
                        setShowUploadModal(false)
                        setUploadResult(null)
                      }}
                      className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
