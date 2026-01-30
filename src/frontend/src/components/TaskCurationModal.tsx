import { useState } from 'react'
import styled from 'styled-components'
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
import {
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Heading,
  Text,
  Input,
  TextArea,
  Label,
  Spinner,
  Flex,
} from '../design-system/components'

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

// Styled Components
const HeaderWrapper = styled.div`
  flex: 1;
`

const CloseButton = styled.button`
  background: none;
  border: none;
  padding: ${({ theme }) => theme.v1.spacing.spacingXS};
  cursor: pointer;
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  transition: color 0.2s;

  &:hover {
    color: ${({ theme }) => theme.v1.semanticColors.text.body.bold};
  }
`

const SummaryBar = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.v1.spacing.spacingLG};
  margin-top: ${({ theme }) => theme.v1.spacing.spacingLG};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
`

const SummaryPill = styled.span`
  padding: ${({ theme }) => theme.v1.spacing.spacingXS} ${({ theme }) => theme.v1.spacing.spacingMD};
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
  border-radius: ${({ theme }) => theme.v1.radius.radiusPill};
`

const AllocationPill = styled.span<{ $status: 'over' | 'complete' | 'incomplete' }>`
  padding: ${({ theme }) => theme.v1.spacing.spacingXS} ${({ theme }) => theme.v1.spacing.spacingMD};
  border-radius: ${({ theme }) => theme.v1.radius.radiusPill};

  ${({ theme, $status }) => {
    switch ($status) {
      case 'over':
        return `
          background-color: ${theme.v1.semanticColors.fill.feedback.error.subtle};
          color: ${theme.v1.semanticColors.text.feedback.error.default};
        `
      case 'complete':
        return `
          background-color: ${theme.v1.semanticColors.fill.feedback.success.subtle};
          color: ${theme.v1.semanticColors.text.feedback.success.default};
        `
      default:
        return `
          background-color: ${theme.v1.semanticColors.fill.feedback.warning.subtle};
          color: ${theme.v1.semanticColors.text.feedback.warning.default};
        `
    }
  }}
`

const TabsContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
  margin-top: ${({ theme }) => theme.v1.spacing.spacingLG};
  border-bottom: 1px solid ${({ theme }) => theme.v1.semanticColors.border.divider.light};
  margin-bottom: -${({ theme }) => theme.v1.spacing.spacingXL};
`

const TabButton = styled.button<{ $active: boolean }>`
  padding: ${({ theme }) => theme.v1.spacing.spacingSM} ${({ theme }) => theme.v1.spacing.spacingLG};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;
  transition: all 0.2s;

  ${({ theme, $active }) => $active
    ? `
      color: ${theme.v1.semanticColors.text.action.default};
      border-bottom-color: ${theme.v1.semanticColors.border.brand.default};
    `
    : `
      color: ${theme.v1.semanticColors.text.body.subtle};
      &:hover {
        color: ${theme.v1.semanticColors.text.body.bold};
      }
    `
  }
`

const ScrollableBody = styled(ModalBody)`
  max-height: calc(90vh - 280px);
  overflow-y: auto;
`

const LoadingContainer = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.v1.spacing.spacing3XL} 0;
`

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.v1.spacing.spacing4XL} 0;
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const TasksList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.v1.spacing.spacingMD};
`

const TaskCard = styled.div<{ $muted?: boolean }>`
  border: 1px solid ${({ theme }) => theme.v1.semanticColors.border.neutral.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  padding: ${({ theme }) => theme.v1.spacing.spacingLG};
  transition: border-color 0.2s;

  ${({ theme, $muted }) => $muted
    ? `
      background-color: ${theme.v1.semanticColors.canvas.highlight.light};
      border-color: ${theme.v1.semanticColors.border.neutral.light};
    `
    : `
      &:hover {
        border-color: ${theme.v1.semanticColors.border.neutral.dark};
      }
    `
  }
`

const TaskHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const TaskInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const TaskName = styled.h3`
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
`

const TaskDescription = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  margin: ${({ theme }) => theme.v1.spacing.spacingXS} 0 0 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const BadgesContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
`

const CategoryBadge = styled.span<{ $category: TaskCategory }>`
  padding: ${({ theme }) => theme.v1.spacing.spacingXXS} ${({ theme }) => theme.v1.spacing.spacingSM};
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};

  ${({ theme, $category }) => {
    switch ($category) {
      case 'core':
        return `
          background-color: ${theme.v1.semanticColors.fill.feedback.info.subtle};
          color: ${theme.v1.semanticColors.text.feedback.info.default};
        `
      case 'support':
        return `
          background-color: ${theme.v1.semanticColors.fill.feedback.success.subtle};
          color: ${theme.v1.semanticColors.text.feedback.success.default};
        `
      default:
        return `
          background-color: ${theme.v1.semanticColors.fill.neutral.light};
          color: ${theme.v1.semanticColors.text.body.default};
        `
    }
  }}
`

const CustomBadge = styled.span`
  padding: ${({ theme }) => theme.v1.spacing.spacingXXS} ${({ theme }) => theme.v1.spacing.spacingSM};
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.feedback.help.subtle};
  color: ${({ theme }) => theme.v1.semanticColors.text.feedback.help.default};
`

const TaskControls = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.v1.spacing.spacingMD};
`

const PercentageInput = styled(Input)`
  width: 64px;
  text-align: center;
`

const PercentageLabel = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const DeleteButton = styled.button`
  padding: ${({ theme }) => theme.v1.spacing.spacingXS};
  background: none;
  border: none;
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: ${({ theme }) => theme.v1.semanticColors.text.feedback.error.vibrant};
  }
`

const TimeSlider = styled.input`
  width: 100%;
  height: 8px;
  margin-top: ${({ theme }) => theme.v1.spacing.spacingMD};
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.neutral.dark};
  border-radius: ${({ theme }) => theme.v1.radius.radiusPill};
  appearance: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background-color: ${({ theme }) => theme.v1.semanticColors.fill.action.brand.default};
    cursor: pointer;
  }
`

const SearchInput = styled(Input)`
  width: 100%;
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const ActionLink = styled.button`
  color: ${({ theme }) => theme.v1.semanticColors.text.action.default};
  background: none;
  border: none;
  text-decoration: underline;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.v1.semanticColors.text.action.hover};
  }
`

const AddButton = styled(Button)<{ $muted?: boolean }>`
  ${({ theme, $muted }) => $muted && `
    background-color: ${theme.v1.semanticColors.fill.neutral.light};
    color: ${theme.v1.semanticColors.text.body.subtle};
    cursor: not-allowed;
  `}
`

const FormContainer = styled.div`
  max-width: 448px;
`

const FormGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const Select = styled.select`
  width: 100%;
  padding: ${({ theme }) => theme.v1.spacing.spacingSM} ${({ theme }) => theme.v1.spacing.spacingMD};
  border: 1px solid ${({ theme }) => theme.v1.semanticColors.border.inputs.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.bold};
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.v1.semanticColors.border.inputs.typing};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.v1.semanticColors.fill.highlight.brand.default};
  }
`

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

  const getAllocationStatus = (): 'over' | 'complete' | 'incomplete' => {
    if (!summary) return 'incomplete'
    if (summary.total_percentage > 100) return 'over'
    if (summary.total_percentage === 100) return 'complete'
    return 'incomplete'
  }

  return (
    <ModalOverlay>
      <ModalContent $size="lg">
        {/* Header */}
        <ModalHeader>
          <HeaderWrapper>
            <Heading $level={3}>Curate Tasks</Heading>
            <Text $variant="bodySmall" $color="subtle" style={{ marginTop: '0.25rem' }}>{occupationName}</Text>

            {/* Summary Bar */}
            {summary && (
              <SummaryBar>
                <SummaryPill>{summary.total_tasks} tasks assigned</SummaryPill>
                <AllocationPill $status={getAllocationStatus()}>
                  {summary.total_percentage.toFixed(0)}% total allocated
                </AllocationPill>
              </SummaryBar>
            )}

            {/* Tabs */}
            <TabsContainer>
              {(['assigned', 'library', 'create'] as TabType[]).map((tab) => (
                <TabButton
                  key={tab}
                  $active={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === 'assigned' && 'Assigned Tasks'}
                  {tab === 'library' && 'Task Library'}
                  {tab === 'create' && 'Create Task'}
                </TabButton>
              ))}
            </TabsContainer>
          </HeaderWrapper>
          <CloseButton onClick={onClose}>
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </CloseButton>
        </ModalHeader>

        {/* Content */}
        <ScrollableBody>
          {/* Assigned Tasks Tab */}
          {activeTab === 'assigned' && (
            <div>
              {loadingAssigned ? (
                <LoadingContainer>
                  <Spinner />
                </LoadingContainer>
              ) : assignedTasks && assignedTasks.length > 0 ? (
                <TasksList>
                  {assignedTasks.map((assignment: OccupationTask) => (
                    <TaskCard key={assignment.id}>
                      <TaskHeader>
                        <TaskInfo>
                          <BadgesContainer>
                            <TaskName>{assignment.global_task.name}</TaskName>
                            <CategoryBadge $category={assignment.category_override || assignment.global_task.category}>
                              {CATEGORY_LABELS[assignment.category_override || assignment.global_task.category]}
                            </CategoryBadge>
                            {assignment.global_task.is_custom && (
                              <CustomBadge>Custom</CustomBadge>
                            )}
                          </BadgesContainer>
                          {assignment.global_task.description && (
                            <TaskDescription>{assignment.global_task.description}</TaskDescription>
                          )}
                        </TaskInfo>

                        <TaskControls>
                          <Flex $align="center" $gap="spacingSM">
                            <PercentageInput
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={assignment.time_percentage}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTimeChange(assignment.id, Number(e.target.value))}
                            />
                            <PercentageLabel>%</PercentageLabel>
                          </Flex>
                          <DeleteButton
                            onClick={() => handleRemoveTask(assignment.id)}
                            title="Remove task"
                          >
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </DeleteButton>
                        </TaskControls>
                      </TaskHeader>

                      {/* Time slider */}
                      <TimeSlider
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={assignment.time_percentage}
                        onChange={(e) => handleTimeChange(assignment.id, Number(e.target.value))}
                      />
                    </TaskCard>
                  ))}
                </TasksList>
              ) : (
                <EmptyState>
                  <Text $color="subtle" style={{ marginBottom: '0.5rem' }}>No tasks assigned yet</Text>
                  <ActionLink onClick={() => setActiveTab('library')}>
                    Browse the task library to add tasks
                  </ActionLink>
                </EmptyState>
              )}
            </div>
          )}

          {/* Task Library Tab */}
          {activeTab === 'library' && (
            <div>
              <SearchInput
                type="text"
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                placeholder="Search tasks (min 2 characters)..."
                $fullWidth
              />

              {loadingLibrary ? (
                <LoadingContainer>
                  <Spinner />
                </LoadingContainer>
              ) : globalTasks && globalTasks.length > 0 ? (
                <TasksList>
                  {globalTasks.map((task: GlobalTask) => {
                    const isAssigned = assignedTaskIds.has(task.id)
                    return (
                      <TaskCard key={task.id} $muted={isAssigned}>
                        <TaskHeader>
                          <TaskInfo>
                            <BadgesContainer>
                              <TaskName>{task.name}</TaskName>
                              <CategoryBadge $category={task.category}>
                                {CATEGORY_LABELS[task.category]}
                              </CategoryBadge>
                              {task.is_custom && (
                                <CustomBadge>Custom</CustomBadge>
                              )}
                            </BadgesContainer>
                            {task.description && (
                              <TaskDescription>{task.description}</TaskDescription>
                            )}
                          </TaskInfo>
                          <AddButton
                            $size="sm"
                            onClick={() => handleAssignTask(task.id)}
                            disabled={isAssigned || assignTask.isPending}
                            $muted={isAssigned}
                          >
                            {isAssigned ? 'Assigned' : 'Add'}
                          </AddButton>
                        </TaskHeader>
                      </TaskCard>
                    )
                  })}
                </TasksList>
              ) : searchTerm.length >= 2 ? (
                <EmptyState>
                  <Text>No tasks found matching "{searchTerm}"</Text>
                  <ActionLink
                    onClick={() => {
                      setNewTaskName(searchTerm)
                      setActiveTab('create')
                    }}
                    style={{ marginTop: '0.5rem', display: 'block' }}
                  >
                    Create a new task named "{searchTerm}"
                  </ActionLink>
                </EmptyState>
              ) : (
                <EmptyState>
                  <Text $color="subtle">Type at least 2 characters to search the task library</Text>
                </EmptyState>
              )}
            </div>
          )}

          {/* Create Task Tab */}
          {activeTab === 'create' && (
            <FormContainer>
              <FormGroup>
                <Label>Task Name *</Label>
                <Input
                  type="text"
                  value={newTaskName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTaskName(e.target.value)}
                  placeholder="Enter task name..."
                  $fullWidth
                />
              </FormGroup>

              <FormGroup>
                <Label>Description</Label>
                <TextArea
                  value={newTaskDescription}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewTaskDescription(e.target.value)}
                  placeholder="Describe what this task involves..."
                  rows={3}
                  $fullWidth
                />
              </FormGroup>

              <FormGroup>
                <Label>Category</Label>
                <Select
                  value={newTaskCategory}
                  onChange={(e) => setNewTaskCategory(e.target.value as TaskCategory)}
                >
                  <option value="core">Core - Primary job responsibilities</option>
                  <option value="support">Support - Secondary/supporting activities</option>
                  <option value="admin">Admin - Administrative tasks</option>
                </Select>
              </FormGroup>

              <Button
                $fullWidth
                onClick={handleCreateTask}
                disabled={!newTaskName.trim() || createTask.isPending}
              >
                {createTask.isPending ? 'Creating...' : 'Create & Assign Task'}
              </Button>
            </FormContainer>
          )}
        </ScrollableBody>

        {/* Footer */}
        <ModalFooter>
          <Button $variant="secondary" onClick={onClose}>
            Done
          </Button>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  )
}
