import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import styled, { css, keyframes } from 'styled-components'
import { useTeam, useTeamOpportunities, useUpdateOpportunity } from '../api/hooks'
import { OpportunityCard } from '../components/OpportunityCard'
import type { OpportunityStatus } from '../api/types'

const STATUS_TABS: { value: OpportunityStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'identified', label: 'Identified' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'deferred', label: 'Deferred' },
]

// Styled Components
const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.v1.spacing.spacing2XL};
`

const HeaderSection = styled.div``

const BackLink = styled(Link)`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.link.brand.default};
  text-decoration: none;
  display: inline-block;
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingSM};

  &:hover {
    text-decoration: underline;
    color: ${({ theme }) => theme.v1.semanticColors.text.link.brand.hover};
  }
`

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleM};
  font-weight: ${({ theme }) => theme.v1.typography.weights.bold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0;
`

const TeamName = styled.p`
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  margin: ${({ theme }) => theme.v1.spacing.spacingXS} 0 0 0;
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyL};
`

const TabsContainer = styled.div`
  border-bottom: 1px solid ${({ theme }) => theme.v1.semanticColors.border.neutral.default};
`

const TabsNav = styled.nav`
  display: flex;
  gap: ${({ theme }) => theme.v1.spacing.spacingLG};
  margin-bottom: -1px;
`

const TabButton = styled.button<{ $active: boolean }>`
  padding: ${({ theme }) => theme.v1.spacing.spacingSM} ${({ theme }) => theme.v1.spacing.spacingXS};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;

  ${({ $active, theme }) =>
    $active
      ? css`
          border-bottom-color: ${theme.v1.semanticColors.border.brand.default};
          color: ${theme.v1.semanticColors.text.accent.primary};
        `
      : css`
          color: ${theme.v1.semanticColors.text.body.default};

          &:hover {
            color: ${theme.v1.semanticColors.text.heading.bold};
            border-bottom-color: ${theme.v1.semanticColors.border.neutral.dark};
          }
        `}
`

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const LoadingCard = styled.div`
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  box-shadow: ${({ theme }) => theme.v1.shadows.sm};
  padding: ${({ theme }) => theme.v1.spacing.spacingXL};
  animation: ${pulse} 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
`

const SkeletonLine = styled.div<{ $width: string; $height: string }>`
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.neutral.skeleton};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
  width: ${({ $width }) => $width};
  height: ${({ $height }) => $height};

  & + & {
    margin-top: ${({ theme }) => theme.v1.spacing.spacingSM};
  }
`

const OpportunitiesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.v1.spacing.spacing5XL} 0;
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  border: 1px solid ${({ theme }) => theme.v1.semanticColors.border.neutral.default};
`

const EmptyStateIcon = styled.svg`
  width: 3rem;
  height: 3rem;
  color: ${({ theme }) => theme.v1.semanticColors.icon.neutral.light};
  margin: 0 auto ${({ theme }) => theme.v1.spacing.spacingLG};
  display: block;
`

const EmptyStateTitle = styled.h2`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyL};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingSM} 0;
`

const EmptyStateDescription = styled.p`
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  max-width: 28rem;
  margin: 0 auto;
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
`

const InfoCard = styled.div`
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  box-shadow: ${({ theme }) => theme.v1.shadows.sm};
  padding: ${({ theme }) => theme.v1.spacing.spacingXL};
`

const InfoCardTitle = styled.h3`
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingSM} 0;
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyL};
`

const InfoCardDescription = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingMD} 0;
`

const RiceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.v1.spacing.spacingLG};

  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }
`

const RiceItem = styled.div``

const RiceLabel = styled.span`
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.bold};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  display: block;
`

const RiceDescription = styled.p`
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  margin: 0;
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
`

const RiceFormula = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  margin: ${({ theme }) => theme.v1.spacing.spacingMD} 0 0 0;
`

export function OpportunitiesPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const [statusFilter, setStatusFilter] = useState<OpportunityStatus | 'all'>('all')

  const { data: team, isLoading: _teamLoading } = useTeam(teamId || '')
  const { data: opportunities, isLoading: oppsLoading } = useTeamOpportunities(
    teamId || '',
    statusFilter === 'all' ? undefined : statusFilter
  )
  const updateOpportunity = useUpdateOpportunity(teamId || '')

  const handleStatusChange = async (opportunityId: string, newStatus: OpportunityStatus) => {
    try {
      await updateOpportunity.mutateAsync({
        opportunityId,
        updates: { status: newStatus },
      })
    } catch (err) {
      console.error('Failed to update opportunity status:', err)
    }
  }

  return (
    <PageContainer>
      {/* Header */}
      <HeaderSection>
        <BackLink to={`/teams/${teamId}`}>
          ← Back to Dashboard
        </BackLink>
        <PageTitle>Improvement Opportunities</PageTitle>
        {team && <TeamName>{team.name}</TeamName>}
      </HeaderSection>

      {/* Status filter tabs */}
      <TabsContainer>
        <TabsNav>
          {STATUS_TABS.map((tab) => (
            <TabButton
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              $active={statusFilter === tab.value}
            >
              {tab.label}
            </TabButton>
          ))}
        </TabsNav>
      </TabsContainer>

      {/* Opportunities list */}
      {oppsLoading ? (
        <LoadingContainer>
          {[1, 2, 3].map((i) => (
            <LoadingCard key={i}>
              <SkeletonLine $width="16rem" $height="1.25rem" />
              <SkeletonLine $width="100%" $height="1rem" />
              <SkeletonLine $width="75%" $height="1rem" />
            </LoadingCard>
          ))}
        </LoadingContainer>
      ) : opportunities && opportunities.length > 0 ? (
        <OpportunitiesList>
          {opportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              onStatusChange={(newStatus) => handleStatusChange(opportunity.id, newStatus)}
            />
          ))}
        </OpportunitiesList>
      ) : (
        <EmptyState>
          <EmptyStateIcon fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </EmptyStateIcon>
          <EmptyStateTitle>
            {statusFilter === 'all' ? 'No opportunities found' : `No ${statusFilter.replace('_', ' ')} opportunities`}
          </EmptyStateTitle>
          <EmptyStateDescription>
            {statusFilter === 'all'
              ? 'Complete a survey to generate improvement opportunities based on team feedback.'
              : 'Opportunities will appear here as they move through the workflow.'}
          </EmptyStateDescription>
        </EmptyState>
      )}

      {/* RICE Score explanation */}
      <InfoCard>
        <InfoCardTitle>About RICE Scoring</InfoCardTitle>
        <InfoCardDescription>
          Opportunities are prioritized using the RICE framework:
        </InfoCardDescription>
        <RiceGrid>
          <RiceItem>
            <RiceLabel>Reach</RiceLabel>
            <RiceDescription>Team members affected</RiceDescription>
          </RiceItem>
          <RiceItem>
            <RiceLabel>Impact</RiceLabel>
            <RiceDescription>Potential improvement</RiceDescription>
          </RiceItem>
          <RiceItem>
            <RiceLabel>Confidence</RiceLabel>
            <RiceDescription>Data reliability</RiceDescription>
          </RiceItem>
          <RiceItem>
            <RiceLabel>Effort</RiceLabel>
            <RiceDescription>Implementation time</RiceDescription>
          </RiceItem>
        </RiceGrid>
        <RiceFormula>
          RICE Score = (Reach x Impact x Confidence) / Effort
        </RiceFormula>
      </InfoCard>
    </PageContainer>
  )
}
