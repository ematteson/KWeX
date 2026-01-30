import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import styled, { css } from 'styled-components'
import {
  useOccupation,
  useOccupationTasks,
  useAllocationSummary,
  useTeams,
  useSyncOccupationTasks,
} from '../api/hooks'
import { TaskCurationModal } from '../components/TaskCurationModal'
import type { OccupationTask, TaskCategory, Team } from '../api/types'

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  core: 'Core',
  support: 'Support',
  admin: 'Admin',
}

// Styled Components
const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.v1.spacing.spacing2XL};
`

const Breadcrumb = styled.nav`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const BreadcrumbLink = styled(Link)`
  color: inherit;
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  }
`

const BreadcrumbSeparator = styled.span`
  margin: 0 ${({ theme }) => theme.v1.spacing.spacingSM};
`

const BreadcrumbCurrent = styled.span`
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const HeaderContent = styled.div``

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleM};
  font-weight: ${({ theme }) => theme.v1.typography.weights.bold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0;
`

const FaethmCode = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  font-family: monospace;
  color: ${({ theme }) => theme.v1.semanticColors.text.accent.primary};
  margin: ${({ theme }) => theme.v1.spacing.spacingXS} 0 0 0;
`

const Description = styled.p`
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  margin: ${({ theme }) => theme.v1.spacing.spacingSM} 0 0 0;
  max-width: 672px;
`

interface ButtonProps {
  $variant?: 'primary' | 'secondary' | 'success'
}

const Button = styled.button<ButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
  border: none;
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  padding: ${({ theme }) => theme.v1.spacing.spacingSM} ${({ theme }) => theme.v1.spacing.spacingLG};
  transition: all 0.2s ease;
  cursor: pointer;

  ${({ $variant = 'primary', theme }) => {
    switch ($variant) {
      case 'secondary':
        return css`
          background-color: transparent;
          color: ${theme.v1.semanticColors.text.action.default};
          border: 1px solid ${theme.v1.semanticColors.border.brand.default};
          &:hover:not(:disabled) {
            background-color: ${theme.v1.semanticColors.fill.highlight.brand.default};
          }
        `
      case 'success':
        return css`
          background-color: ${theme.v1.semanticColors.fill.feedback.success.bold};
          color: ${theme.v1.semanticColors.text.inverse};
          &:hover:not(:disabled) {
            opacity: 0.9;
          }
        `
      default:
        return css`
          background-color: ${theme.v1.semanticColors.fill.action.brand.default};
          color: ${theme.v1.semanticColors.text.inverse};
          &:hover:not(:disabled) {
            background-color: ${theme.v1.semanticColors.fill.action.brand.hover};
          }
        `
    }
  }}

  &:disabled {
    background-color: ${({ theme }) => theme.v1.semanticColors.fill.neutral.dark};
    color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
    cursor: not-allowed;
  }
`

const Card = styled.div`
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  box-shadow: ${({ theme }) => theme.v1.shadows.sm};
  padding: ${({ theme }) => theme.v1.spacing.spacingXL};
`

const CardTitle = styled.h2`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingLG} 0;
`

const CardHeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const PortfolioGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.v1.spacing.spacingLG};
`

interface PortfolioItemProps {
  $variant: 'run' | 'change'
}

const PortfolioItem = styled.div<PortfolioItemProps>`
  text-align: center;
  padding: ${({ theme }) => theme.v1.spacing.spacingLG};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};

  ${({ $variant, theme }) => $variant === 'run'
    ? css`background-color: ${theme.v1.semanticColors.fill.feedback.info.subtle};`
    : css`background-color: ${theme.v1.semanticColors.fill.feedback.success.subtle};`
  }
`

const PortfolioValue = styled.p<PortfolioItemProps>`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleL};
  font-weight: ${({ theme }) => theme.v1.typography.weights.bold};
  margin: 0;

  ${({ $variant, theme }) => $variant === 'run'
    ? css`color: ${theme.v1.semanticColors.text.feedback.info.vibrant};`
    : css`color: ${theme.v1.semanticColors.text.feedback.success.vibrant};`
  }
`

const PortfolioLabel = styled.p<PortfolioItemProps>`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  margin: ${({ theme }) => theme.v1.spacing.spacingXS} 0 0 0;

  ${({ $variant, theme }) => $variant === 'run'
    ? css`color: ${theme.v1.semanticColors.text.feedback.info.default};`
    : css`color: ${theme.v1.semanticColors.text.feedback.success.default};`
  }
`

const TaskBadgesRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
`

const TaskCountBadge = styled.span`
  padding: ${({ theme }) => theme.v1.spacing.spacingXS} ${({ theme }) => theme.v1.spacing.spacingSM};
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.neutral.light};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
`

interface AllocationBadgeProps {
  $status: 'over' | 'exact' | 'under'
}

const AllocationBadge = styled.span<AllocationBadgeProps>`
  padding: ${({ theme }) => theme.v1.spacing.spacingXS} ${({ theme }) => theme.v1.spacing.spacingSM};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};

  ${({ $status, theme }) => {
    switch ($status) {
      case 'over':
        return css`
          background-color: ${theme.v1.semanticColors.fill.feedback.error.subtle};
          color: ${theme.v1.semanticColors.text.feedback.error.default};
        `
      case 'exact':
        return css`
          background-color: ${theme.v1.semanticColors.fill.feedback.success.subtle};
          color: ${theme.v1.semanticColors.text.feedback.success.default};
        `
      default:
        return css`
          background-color: ${theme.v1.semanticColors.fill.feedback.warning.subtle};
          color: ${theme.v1.semanticColors.text.feedback.warning.default};
        `
    }
  }}
`

const SpinnerWrapper = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.v1.spacing.spacing3XL} 0;
`

const Spinner = styled.div`
  display: inline-block;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid ${({ theme }) => theme.v1.semanticColors.border.neutral.light};
  border-top-color: ${({ theme }) => theme.v1.semanticColors.fill.action.brand.default};
  animation: spin 1s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`

const TasksList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
`

const TaskItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.v1.spacing.spacingMD};
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
`

const TaskItemLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.v1.spacing.spacingMD};
`

interface CategoryBadgeProps {
  $category: TaskCategory
}

const CategoryBadge = styled.span<CategoryBadgeProps>`
  padding: ${({ theme }) => theme.v1.spacing.spacingXXS} ${({ theme }) => theme.v1.spacing.spacingSM};
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};

  ${({ $category, theme }) => {
    switch ($category) {
      case 'core':
        return css`
          background-color: ${theme.v1.semanticColors.fill.feedback.info.subtle};
          color: ${theme.v1.semanticColors.text.feedback.info.default};
        `
      case 'support':
        return css`
          background-color: ${theme.v1.semanticColors.fill.feedback.success.subtle};
          color: ${theme.v1.semanticColors.text.feedback.success.default};
        `
      default:
        return css`
          background-color: ${theme.v1.semanticColors.fill.neutral.light};
          color: ${theme.v1.semanticColors.text.body.default};
        `
    }
  }}
`

const TaskName = styled.span`
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
`

const CustomBadge = styled.span`
  padding: ${({ theme }) => theme.v1.spacing.spacingXXS} ${({ theme }) => theme.v1.spacing.spacingSM};
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.feedback.help.subtle};
  color: ${({ theme }) => theme.v1.semanticColors.text.feedback.help.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
`

interface PercentageValueProps {
  $hasValue: boolean
}

const PercentageValue = styled.span<PercentageValueProps>`
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme, $hasValue }) =>
    $hasValue
      ? theme.v1.semanticColors.text.heading.bold
      : theme.v1.semanticColors.text.body.subtle
  };
`

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.v1.spacing.spacing3XL} 0;
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const EmptyStateText = styled.p`
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingLG} 0;
`

const EmptyStateActions = styled.div`
  display: flex;
  justify-content: center;
  gap: ${({ theme }) => theme.v1.spacing.spacingMD};
`

const TeamsGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.v1.spacing.spacingMD};
  grid-template-columns: 1fr;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
`

const TeamLink = styled(Link)`
  padding: ${({ theme }) => theme.v1.spacing.spacingLG};
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  text-decoration: none;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.dark};
  }
`

const TeamName = styled.h3`
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0;
`

const TeamFunction = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  margin: 0;
`

const TeamMemberCount = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  margin: ${({ theme }) => theme.v1.spacing.spacingXS} 0 0 0;
`

const CenteredText = styled.p`
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  text-align: center;
  padding: ${({ theme }) => theme.v1.spacing.spacingLG} 0;
  margin: 0;
`

// Loading skeleton
const SkeletonBlock = styled.div<{ $height?: string; $width?: string }>`
  height: ${({ $height = '16px' }) => $height};
  width: ${({ $width = '100%' }) => $width};
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.neutral.skeleton};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`

const LoadingStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.v1.spacing.spacingLG};
`

// Error state
const ErrorWrapper = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.v1.spacing.spacing5XL} 0;
`

const ErrorTitle = styled.h2`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingSM} 0;
`

const ErrorText = styled.p`
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingLG} 0;
`

const ErrorLink = styled(Link)`
  color: ${({ theme }) => theme.v1.semanticColors.text.action.default};

  &:hover {
    color: ${({ theme }) => theme.v1.semanticColors.text.action.hover};
  }
`

export function OccupationDetailPage() {
  const { occupationId } = useParams<{ occupationId: string }>()
  const [showCurationModal, setShowCurationModal] = useState(false)

  const { data: occupation, isLoading: loadingOccupation, error } = useOccupation(occupationId || '')
  const { data: tasks, isLoading: loadingTasks, refetch: refetchTasks } = useOccupationTasks(occupationId || '')
  const { data: summary, refetch: refetchSummary } = useAllocationSummary(occupationId || '')
  const { data: allTeams } = useTeams()
  const syncTasks = useSyncOccupationTasks(occupationId || '')

  const handleSyncTasks = async () => {
    try {
      await syncTasks.mutateAsync()
      refetchTasks()
      refetchSummary()
    } catch (err) {
      console.error('Failed to sync tasks:', err)
    }
  }

  // Filter teams using this occupation
  const teamsUsingOccupation = allTeams?.filter((team: Team) => team.occupation_id === occupationId) || []

  if (loadingOccupation) {
    return (
      <LoadingStack>
        <SkeletonBlock $height="32px" $width="33%" />
        <SkeletonBlock $height="16px" $width="25%" />
        <SkeletonBlock $height="128px" />
        <SkeletonBlock $height="192px" />
      </LoadingStack>
    )
  }

  if (error || !occupation) {
    return (
      <ErrorWrapper>
        <ErrorTitle>Occupation not found</ErrorTitle>
        <ErrorText>The occupation you're looking for doesn't exist.</ErrorText>
        <ErrorLink to="/teams">
          Back to Teams
        </ErrorLink>
      </ErrorWrapper>
    )
  }

  return (
    <PageWrapper>
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbLink to="/teams">
          Teams
        </BreadcrumbLink>
        <BreadcrumbSeparator>/</BreadcrumbSeparator>
        <BreadcrumbCurrent>{occupation.name}</BreadcrumbCurrent>
      </Breadcrumb>

      {/* Header */}
      <Header>
        <HeaderContent>
          <PageTitle>{occupation.name}</PageTitle>
          {occupation.faethm_code && (
            <FaethmCode>
              {occupation.faethm_code}
            </FaethmCode>
          )}
          {occupation.description && (
            <Description>{occupation.description}</Description>
          )}
        </HeaderContent>
        <Button onClick={() => setShowCurationModal(true)}>
          Curate Tasks
        </Button>
      </Header>

      {/* Portfolio Balance Card */}
      <Card>
        <CardTitle>Portfolio Balance</CardTitle>
        <PortfolioGrid>
          <PortfolioItem $variant="run">
            <PortfolioValue $variant="run">
              {(occupation.ideal_run_percentage * 100).toFixed(0)}%
            </PortfolioValue>
            <PortfolioLabel $variant="run">Run (BAU)</PortfolioLabel>
          </PortfolioItem>
          <PortfolioItem $variant="change">
            <PortfolioValue $variant="change">
              {(occupation.ideal_change_percentage * 100).toFixed(0)}%
            </PortfolioValue>
            <PortfolioLabel $variant="change">Change (Projects)</PortfolioLabel>
          </PortfolioItem>
        </PortfolioGrid>
      </Card>

      {/* Tasks Summary */}
      <Card>
        <CardHeaderRow>
          <CardTitle style={{ marginBottom: 0 }}>Assigned Tasks</CardTitle>
          {summary && (
            <TaskBadgesRow>
              <TaskCountBadge>
                {summary.total_tasks} tasks
              </TaskCountBadge>
              <AllocationBadge
                $status={
                  summary.total_percentage > 100
                    ? 'over'
                    : summary.total_percentage === 100
                    ? 'exact'
                    : 'under'
                }
              >
                {summary.total_percentage.toFixed(0)}% allocated
              </AllocationBadge>
            </TaskBadgesRow>
          )}
        </CardHeaderRow>

        {loadingTasks ? (
          <SpinnerWrapper>
            <Spinner />
          </SpinnerWrapper>
        ) : tasks && tasks.length > 0 ? (
          <TasksList>
            {tasks.map((assignment: OccupationTask) => (
              <TaskItem key={assignment.id}>
                <TaskItemLeft>
                  <CategoryBadge
                    $category={assignment.category_override || assignment.global_task.category}
                  >
                    {CATEGORY_LABELS[assignment.category_override || assignment.global_task.category]}
                  </CategoryBadge>
                  <TaskName>
                    {assignment.global_task.name}
                  </TaskName>
                  {assignment.global_task.is_custom && (
                    <CustomBadge>
                      Custom
                    </CustomBadge>
                  )}
                </TaskItemLeft>
                <PercentageValue $hasValue={assignment.time_percentage > 0}>
                  {assignment.time_percentage.toFixed(0)}%
                </PercentageValue>
              </TaskItem>
            ))}
          </TasksList>
        ) : (
          <EmptyState>
            <EmptyStateText>No tasks assigned to this occupation</EmptyStateText>
            <EmptyStateActions>
              {occupation.faethm_code && (
                <Button
                  onClick={handleSyncTasks}
                  disabled={syncTasks.isPending}
                  $variant="success"
                >
                  {syncTasks.isPending ? 'Syncing...' : 'Sync Tasks from Faethm'}
                </Button>
              )}
              <Button onClick={() => setShowCurationModal(true)}>
                Curate Tasks Manually
              </Button>
            </EmptyStateActions>
          </EmptyState>
        )}
      </Card>

      {/* Teams Using This Occupation */}
      <Card>
        <CardTitle>Teams Using This Occupation</CardTitle>
        {teamsUsingOccupation.length > 0 ? (
          <TeamsGrid>
            {teamsUsingOccupation.map((team: Team) => (
              <TeamLink
                key={team.id}
                to={`/teams/${team.id}`}
              >
                <TeamName>{team.name}</TeamName>
                <TeamFunction>{team.function}</TeamFunction>
                <TeamMemberCount>{team.member_count} members</TeamMemberCount>
              </TeamLink>
            ))}
          </TeamsGrid>
        ) : (
          <CenteredText>
            No teams are using this occupation yet
          </CenteredText>
        )}
      </Card>

      {/* Task Curation Modal */}
      <TaskCurationModal
        occupationId={occupationId || ''}
        occupationName={occupation.name}
        isOpen={showCurationModal}
        onClose={() => setShowCurationModal(false)}
      />
    </PageWrapper>
  )
}
