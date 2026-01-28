import { useState } from 'react'
import {
  useGlobalTasks,
  useOccupationTasks,
  useCreateGlobalTask,
  useAssignTask,
  useUpdateTaskAssignment,
  useRemoveTaskAssignment,
  useAllocationSummary,
} from '../api/hooks'
import type { GlobalTask, OccupationTask, TaskCategory } from '../api/types'

interface TaskCurationModalProps {
  occupationId: string
  occupationName: string
  isOpen: boolean
  onClose: () => void
}

type TabType = 'assigned' | 'library' | 'create'

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  core: 'Core',
  support: 'Support',
  admin: 'Admin',
}

const CATEGORY_COLORS: Record<TaskCategory, string> = {
  core: 'bg-blue-100 text-blue-800',
  support: 'bg-green-100 text-green-800',
  admin: 'bg-gray-100 text-gray-800',
}

export function TaskCurationModal({
  occupationId,
  occupationName,
  isOpen,
  onClose,
}: TaskCurationModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('assigned')
  const [searchTerm, setSearchTerm] = useState('')
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>('core')

  const { data: assignedTasks, isLoading: loadingAssigned } = useOccupationTasks(occupationId)
  const { data: globalTasks, isLoading: loadingLibrary } = useGlobalTasks({
    search: searchTerm.length >= 2 ? searchTerm : undefined,
    limit: 50,
  })
  const { data: summary } = useAllocationSummary(occupationId)

  const createTask = useCreateGlobalTask()
  const assignTask = useAssignTask(occupationId)
  const updateAssignment = useUpdateTaskAssignment(occupationId)
  const removeAssignment = useRemoveTaskAssignment(occupationId)

  if (!isOpen) return null

  const assignedTaskIds = new Set(assignedTasks?.map((t) => t.global_task_id) || [])

  const handleTimeChange = async (assignmentId: string, newValue: number) => {
    await updateAssignment.mutateAsync({
      assignmentId,
      updates: { time_percentage: newValue },
    })
  }

  const handleRemoveTask = async (assignmentId: string) => {
    if (confirm('Remove this task from the occupation?')) {
      await removeAssignment.mutateAsync(assignmentId)
    }
  }

  const handleAssignTask = async (globalTaskId: string) => {
    await assignTask.mutateAsync({
      global_task_id: globalTaskId,
      time_percentage: 0,
    })
  }

  const handleCreateTask = async () => {
    if (!newTaskName.trim()) return

    try {
      const newTask = await createTask.mutateAsync({
        name: newTaskName.trim(),
        description: newTaskDescription.trim() || undefined,
        category: newTaskCategory,
      })

      // Automatically assign the new task to the occupation
      await assignTask.mutateAsync({
        global_task_id: newTask.id,
        time_percentage: 0,
      })

      // Reset form
      setNewTaskName('')
      setNewTaskDescription('')
      setNewTaskCategory('core')
      setActiveTab('assigned')
    } catch (err) {
      console.error('Failed to create task:', err)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Curate Tasks</h2>
              <p className="text-sm text-gray-600 mt-1">{occupationName}</p>
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

          {/* Summary Bar */}
          {summary && (
            <div className="mt-4 flex gap-4 text-sm">
              <span className="px-3 py-1 bg-gray-100 rounded-full">
                {summary.total_tasks} tasks assigned
              </span>
              <span className={`px-3 py-1 rounded-full ${
                summary.total_percentage > 100
                  ? 'bg-red-100 text-red-700'
                  : summary.total_percentage === 100
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {summary.total_percentage.toFixed(0)}% total allocated
              </span>
            </div>
          )}

          {/* Tabs */}
          <div className="mt-4 flex gap-2 border-b -mb-6 pb-0">
            {(['assigned', 'library', 'create'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'assigned' && 'Assigned Tasks'}
                {tab === 'library' && 'Task Library'}
                {tab === 'create' && 'Create Task'}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Assigned Tasks Tab */}
          {activeTab === 'assigned' && (
            <div>
              {loadingAssigned ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : assignedTasks && assignedTasks.length > 0 ? (
                <div className="space-y-3">
                  {assignedTasks.map((assignment: OccupationTask) => (
                    <div
                      key={assignment.id}
                      className="border rounded-lg p-4 hover:border-gray-300"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900 truncate">
                              {assignment.global_task.name}
                            </h3>
                            <span className={`px-2 py-0.5 text-xs rounded ${
                              CATEGORY_COLORS[assignment.category_override || assignment.global_task.category]
                            }`}>
                              {CATEGORY_LABELS[assignment.category_override || assignment.global_task.category]}
                            </span>
                            {assignment.global_task.is_custom && (
                              <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">
                                Custom
                              </span>
                            )}
                          </div>
                          {assignment.global_task.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {assignment.global_task.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={assignment.time_percentage}
                              onChange={(e) => handleTimeChange(assignment.id, Number(e.target.value))}
                              className="w-16 px-2 py-1 border rounded text-center text-sm"
                            />
                            <span className="text-sm text-gray-500">%</span>
                          </div>
                          <button
                            onClick={() => handleRemoveTask(assignment.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Remove task"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Time slider */}
                      <div className="mt-3">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={assignment.time_percentage}
                          onChange={(e) => handleTimeChange(assignment.id, Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p className="mb-2">No tasks assigned yet</p>
                  <button
                    onClick={() => setActiveTab('library')}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Browse the task library to add tasks
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Task Library Tab */}
          {activeTab === 'library' && (
            <div>
              <div className="mb-4">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search tasks (min 2 characters)..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {loadingLibrary ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : globalTasks && globalTasks.length > 0 ? (
                <div className="space-y-2">
                  {globalTasks.map((task: GlobalTask) => {
                    const isAssigned = assignedTaskIds.has(task.id)
                    return (
                      <div
                        key={task.id}
                        className={`border rounded-lg p-4 ${
                          isAssigned ? 'bg-gray-50 border-gray-200' : 'hover:border-gray-300'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-900">{task.name}</h3>
                              <span className={`px-2 py-0.5 text-xs rounded ${CATEGORY_COLORS[task.category]}`}>
                                {CATEGORY_LABELS[task.category]}
                              </span>
                              {task.is_custom && (
                                <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">
                                  Custom
                                </span>
                              )}
                            </div>
                            {task.description && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleAssignTask(task.id)}
                            disabled={isAssigned || assignTask.isPending}
                            className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap ${
                              isAssigned
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            {isAssigned ? 'Assigned' : 'Add'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : searchTerm.length >= 2 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No tasks found matching "{searchTerm}"</p>
                  <button
                    onClick={() => {
                      setNewTaskName(searchTerm)
                      setActiveTab('create')
                    }}
                    className="mt-2 text-blue-600 hover:text-blue-800 underline"
                  >
                    Create a new task named "{searchTerm}"
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Type at least 2 characters to search the task library
                </div>
              )}
            </div>
          )}

          {/* Create Task Tab */}
          {activeTab === 'create' && (
            <div className="max-w-md">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Task Name *
                  </label>
                  <input
                    type="text"
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    placeholder="Enter task name..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    placeholder="Describe what this task involves..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value as TaskCategory)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="core">Core - Primary job responsibilities</option>
                    <option value="support">Support - Secondary/supporting activities</option>
                    <option value="admin">Admin - Administrative tasks</option>
                  </select>
                </div>

                <button
                  onClick={handleCreateTask}
                  disabled={!newTaskName.trim() || createTask.isPending}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {createTask.isPending ? 'Creating...' : 'Create & Assign Task'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
