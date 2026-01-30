import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import styled, { css, keyframes } from 'styled-components'
import {
  useTeams,
  useOccupations,
  useSyncOccupations,
  useUploadTeamsCSV,
  useSearchAvailableOccupations,
  useSyncSingleOccupation,
} from '../api/hooks'
import type { CSVUploadResult, AvailableOccupation, Occupation } from '../api/types'
import {
  Button,
  Card,
  Input,
  Heading,
  Text,
  Flex,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Spinner,
  Badge,
} from '../design-system/components'

// =============================================================================
// STYLED COMPONENTS
// =============================================================================

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.v1.spacing.spacing2XL};
`

const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const ButtonGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
`

const TeamsGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.v1.spacing.spacingLG};

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
`

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`

const SkeletonCard = styled(Card)`
  animation: ${pulse} 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
`

const SkeletonBox = styled.div<{ $width?: string; $height?: string; $marginBottom?: string }>`
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.neutral.skeleton};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
  width: ${({ $width }) => $width || '100%'};
  height: ${({ $height }) => $height || '1rem'};
  margin-bottom: ${({ $marginBottom }) => $marginBottom || '0'};
`

const TeamCard = styled(Link)`
  display: block;
  text-decoration: none;
  transition: box-shadow 0.2s ease;

  &:hover {
    box-shadow: ${({ theme }) => theme.v1.shadows.md};
  }
`

const TeamCardContent = styled(Card)`
  height: 100%;
`

const TeamTitle = styled.h2`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingSM} 0;
  transition: color 0.2s ease;

  ${TeamCard}:hover & {
    color: ${({ theme }) => theme.v1.semanticColors.text.action.default};
  }
`

const TeamFunction = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingMD} 0;
`

const TeamMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.v1.spacing.spacingLG};
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const AlertBox = styled.div<{ $variant: 'success' | 'warning' }>`
  padding: ${({ theme }) => theme.v1.spacing.spacingLG};
  border-radius: ${({ theme }) => theme.v1.radius.radiusMD};

  ${({ $variant, theme }) => $variant === 'success' && css`
    background-color: ${theme.v1.semanticColors.fill.feedback.success.subtle};
    border: 1px solid ${theme.v1.semanticColors.border.feedback.success};
  `}

  ${({ $variant, theme }) => $variant === 'warning' && css`
    background-color: ${theme.v1.semanticColors.fill.feedback.warning.subtle};
    border: 1px solid ${theme.v1.semanticColors.border.feedback.warning};
  `}
`

const AlertText = styled.p<{ $variant: 'success' | 'warning' }>`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  margin: 0;

  ${({ $variant, theme }) => $variant === 'success' && css`
    color: ${theme.v1.semanticColors.text.feedback.success.default};
  `}

  ${({ $variant, theme }) => $variant === 'warning' && css`
    color: ${theme.v1.semanticColors.text.feedback.warning.default};
  `}
`

const AlertLink = styled.button<{ $variant: 'success' | 'warning' }>`
  background: none;
  border: none;
  padding: 0;
  text-decoration: underline;
  cursor: pointer;
  font-size: inherit;
  font-family: inherit;

  ${({ $variant, theme }) => $variant === 'success' && css`
    color: ${theme.v1.semanticColors.text.feedback.success.default};
    &:hover {
      color: ${theme.v1.semanticColors.text.feedback.success.vibrant};
    }
  `}

  ${({ $variant, theme }) => $variant === 'warning' && css`
    color: ${theme.v1.semanticColors.text.feedback.warning.default};
    font-weight: ${theme.v1.typography.weights.semibold};
    &:hover {
      color: ${theme.v1.semanticColors.text.feedback.warning.vibrant};
    }
  `}
`

const OccupationChipList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
  margin-top: ${({ theme }) => theme.v1.spacing.spacingMD};
`

const OccupationChip = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.v1.spacing.spacingXS};
  padding: ${({ theme }) => theme.v1.spacing.spacingXS} ${({ theme }) => theme.v1.spacing.spacingMD};
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  border: 1px solid ${({ theme }) => theme.v1.semanticColors.border.feedback.success};
  border-radius: ${({ theme }) => theme.v1.radius.radiusPill};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  text-decoration: none;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: ${({ theme }) => theme.v1.semanticColors.fill.feedback.success.subtle};
  }
`

const OccupationCode = styled.span`
  font-family: monospace;
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.feedback.success.vibrant};
`

const OccupationName = styled.span`
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
`

const MoreButton = styled.button`
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => theme.v1.spacing.spacingXS} ${({ theme }) => theme.v1.spacing.spacingMD};
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  border: 1px solid ${({ theme }) => theme.v1.semanticColors.border.feedback.success};
  border-radius: ${({ theme }) => theme.v1.radius.radiusPill};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.feedback.success.vibrant};
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: ${({ theme }) => theme.v1.semanticColors.fill.feedback.success.subtle};
  }
`

const EmptyState = styled(Card)`
  text-align: center;
  padding: ${({ theme }) => theme.v1.spacing.spacing5XL};
`

const ErrorState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.v1.spacing.spacing5XL};
`

const CloseButton = styled.button`
  background: none;
  border: none;
  padding: ${({ theme }) => theme.v1.spacing.spacingXS};
  cursor: pointer;
  color: ${({ theme }) => theme.v1.semanticColors.icon.neutral.default};
  transition: color 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.v1.semanticColors.icon.neutral.dark};
  }
`

const ModalTitle = styled.h2`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0;
`

const ModalDescription = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingLG} 0;
`

const SearchInput = styled(Input)`
  width: 100%;
`

const OccupationModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${({ theme }) => theme.v1.spacing.spacingXL};
`

const OccupationModalContainer = styled(ModalContent)`
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const SearchHint = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.v1.spacing.spacing3XL};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const SyncLink = styled.button`
  background: none;
  border: none;
  padding: 0;
  color: ${({ theme }) => theme.v1.semanticColors.text.action.default};
  text-decoration: underline;
  cursor: pointer;
  font-size: inherit;
  font-family: inherit;

  &:hover {
    color: ${({ theme }) => theme.v1.semanticColors.text.action.hover};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }
`

const LoadingContainer = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.v1.spacing.spacing3XL};
`

const ResultCount = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const OccupationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
`

const OccupationItem = styled.div`
  border: 1px solid ${({ theme }) => theme.v1.semanticColors.border.neutral.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusMD};
  padding: ${({ theme }) => theme.v1.spacing.spacingLG};
  transition: border-color 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.v1.semanticColors.border.neutral.dark};
  }
`

const OccupationItemHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`

const OccupationItemContent = styled.div`
  flex: 1;
  min-width: 0;
  padding-right: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const OccupationItemActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
`

const OccupationItemCode = styled.span`
  font-family: monospace;
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.action.default};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
`

const OccupationItemName = styled.h3`
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: ${({ theme }) => theme.v1.spacing.spacingXS} 0;
`

const OccupationItemDescription = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  margin: ${({ theme }) => theme.v1.spacing.spacingXS} 0 0 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const NoResults = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.v1.spacing.spacing3XL};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const ModalFooterInfo = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
`

const ModalFooterWithInfo = styled(ModalFooter)`
  justify-content: space-between;
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
`

// Upload Modal Styles
const SectionTitle = styled.h3`
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingSM} 0;
`

const CodeBlock = styled.div`
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
  border-radius: ${({ theme }) => theme.v1.radius.radiusMD};
  padding: ${({ theme }) => theme.v1.spacing.spacingMD};
  font-family: monospace;
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  overflow-x: auto;
`

const CodeLine = styled.p<{ $subtle?: boolean }>`
  margin: 0;
  color: ${({ theme, $subtle }) =>
    $subtle ? theme.v1.semanticColors.text.body.subtle : theme.v1.semanticColors.text.body.default};
`

const OccupationCodesList = styled.div`
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
  border-radius: ${({ theme }) => theme.v1.radius.radiusMD};
  padding: ${({ theme }) => theme.v1.spacing.spacingMD};
  max-height: 10rem;
  overflow-y: auto;
`

const OccupationCodeItem = styled.li`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingXS};
`

const OccupationCodeLabel = styled.span`
  font-family: monospace;
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
`

const MoreText = styled.li`
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const TemplateLink = styled.button`
  background: none;
  border: none;
  padding: 0;
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.action.default};
  text-decoration: underline;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.v1.semanticColors.text.action.hover};
  }
`

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
  cursor: pointer;
`

const Checkbox = styled.input`
  width: 1rem;
  height: 1rem;
  border-radius: ${({ theme }) => theme.v1.radius.radiusXS};
  border: 1px solid ${({ theme }) => theme.v1.semanticColors.border.inputs.default};
  cursor: pointer;

  &:checked {
    background-color: ${({ theme }) => theme.v1.semanticColors.fill.action.brand.default};
    border-color: ${({ theme }) => theme.v1.semanticColors.fill.action.brand.default};
  }
`

const CheckboxText = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
`

const DropZone = styled.div`
  border: 2px dashed ${({ theme }) => theme.v1.semanticColors.border.neutral.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusMD};
  padding: ${({ theme }) => theme.v1.spacing.spacing2XL};
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.v1.semanticColors.border.brand.default};
  }
`

const DropZoneIcon = styled.svg`
  margin: 0 auto;
  height: 3rem;
  width: 3rem;
  color: ${({ theme }) => theme.v1.semanticColors.icon.neutral.light};
`

const DropZoneText = styled.p`
  margin-top: ${({ theme }) => theme.v1.spacing.spacingSM};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
`

const DropZoneLink = styled.span`
  color: ${({ theme }) => theme.v1.semanticColors.text.action.default};

  &:hover {
    color: ${({ theme }) => theme.v1.semanticColors.text.action.hover};
  }
`

const DropZoneHint = styled.p`
  margin-top: ${({ theme }) => theme.v1.spacing.spacingXS};
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

const HiddenInput = styled.input`
  display: none;
`

const UploadingContainer = styled.div`
  margin-top: ${({ theme }) => theme.v1.spacing.spacingLG};
  text-align: center;
`

const UploadingText = styled.p`
  margin-top: ${({ theme }) => theme.v1.spacing.spacingSM};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
`

// Result styles
const ResultGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.v1.spacing.spacingLG};
  text-align: center;
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const ResultCard = styled.div<{ $variant: 'success' | 'info' | 'error' }>`
  padding: ${({ theme }) => theme.v1.spacing.spacingMD};
  border-radius: ${({ theme }) => theme.v1.radius.radiusMD};

  ${({ $variant, theme }) => $variant === 'success' && css`
    background-color: ${theme.v1.semanticColors.fill.feedback.success.subtle};
  `}

  ${({ $variant, theme }) => $variant === 'info' && css`
    background-color: ${theme.v1.semanticColors.fill.feedback.info.subtle};
  `}

  ${({ $variant, theme }) => $variant === 'error' && css`
    background-color: ${theme.v1.semanticColors.fill.feedback.error.subtle};
  `}
`

const ResultNumber = styled.p<{ $variant: 'success' | 'info' | 'error' }>`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleM};
  font-weight: ${({ theme }) => theme.v1.typography.weights.bold};
  margin: 0;

  ${({ $variant, theme }) => $variant === 'success' && css`
    color: ${theme.v1.semanticColors.text.feedback.success.vibrant};
  `}

  ${({ $variant, theme }) => $variant === 'info' && css`
    color: ${theme.v1.semanticColors.text.feedback.info.vibrant};
  `}

  ${({ $variant, theme }) => $variant === 'error' && css`
    color: ${theme.v1.semanticColors.text.feedback.error.vibrant};
  `}
`

const ResultLabel = styled.p<{ $variant: 'success' | 'info' | 'error' }>`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  margin: 0;

  ${({ $variant, theme }) => $variant === 'success' && css`
    color: ${theme.v1.semanticColors.text.feedback.success.default};
  `}

  ${({ $variant, theme }) => $variant === 'info' && css`
    color: ${theme.v1.semanticColors.text.feedback.info.default};
  `}

  ${({ $variant, theme }) => $variant === 'error' && css`
    color: ${theme.v1.semanticColors.text.feedback.error.default};
  `}
`

const ErrorsSection = styled.div`
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const ErrorsTitle = styled.h3`
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.feedback.error.default};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingSM} 0;
`

const ErrorsList = styled.div`
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.feedback.error.subtle};
  border-radius: ${({ theme }) => theme.v1.radius.radiusMD};
  padding: ${({ theme }) => theme.v1.spacing.spacingMD};
  max-height: 10rem;
  overflow-y: auto;
`

const ErrorItem = styled.li`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.feedback.error.default};
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingXS};
`

const TeamsSection = styled.div`
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const TeamsTitle = styled.h3`
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingSM} 0;
`

const TeamsList = styled.div`
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
  border-radius: ${({ theme }) => theme.v1.radius.radiusMD};
  padding: ${({ theme }) => theme.v1.spacing.spacingMD};
  max-height: 10rem;
  overflow-y: auto;
`

const TeamItem = styled.li`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingXS};
`

const FormSection = styled.div`
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const WarningText = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.feedback.warning.default};
  margin: 0;
`

// =============================================================================
// COMPONENT
// =============================================================================

export function TeamsPage() {
  const navigate = useNavigate()
  const { data: teams, isLoading, error } = useTeams()
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
      <PageContainer>
        <Heading $level={1}>Teams</Heading>
        <TeamsGrid>
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i}>
              <SkeletonBox $width="8rem" $height="1.25rem" $marginBottom="0.5rem" />
              <SkeletonBox $width="6rem" $height="1rem" $marginBottom="0.75rem" />
              <SkeletonBox $width="5rem" $height="0.75rem" />
            </SkeletonCard>
          ))}
        </TeamsGrid>
      </PageContainer>
    )
  }

  if (error) {
    return (
      <ErrorState>
        <Heading $level={3}>Unable to load teams</Heading>
        <Text $color="subtle">Please check your connection and try again.</Text>
      </ErrorState>
    )
  }

  return (
    <PageContainer>
      <HeaderSection>
        <Heading $level={1}>Teams</Heading>
        <ButtonGroup>
          <Button $variant="secondary" onClick={() => setShowOccupationModal(true)}>
            Browse Occupations
          </Button>
          <Button onClick={() => setShowUploadModal(true)}>
            Upload CSV
          </Button>
        </ButtonGroup>
      </HeaderSection>

      {/* Occupations Status */}
      {occupations && occupations.length > 0 && (
        <AlertBox $variant="success">
          <Flex $justify="between" $align="center">
            <AlertText $variant="success">
              <strong>{occupations.length} occupations</strong> synced.{' '}
              <AlertLink $variant="success" onClick={() => setShowOccupationModal(true)}>
                Browse all available occupations
              </AlertLink>
            </AlertText>
          </Flex>
          <OccupationChipList>
            {occupations.slice(0, 10).map((occ: Occupation) => (
              <OccupationChip key={occ.id} to={`/occupations/${occ.id}`}>
                <OccupationCode>{occ.faethm_code}</OccupationCode>
                <OccupationName>{occ.name}</OccupationName>
              </OccupationChip>
            ))}
            {occupations.length > 10 && (
              <MoreButton onClick={() => setShowOccupationModal(true)}>
                +{occupations.length - 10} more
              </MoreButton>
            )}
          </OccupationChipList>
        </AlertBox>
      )}

      {(!occupations || occupations.length === 0) && (
        <AlertBox $variant="warning">
          <AlertText $variant="warning">
            No occupations synced yet.{' '}
            <AlertLink $variant="warning" onClick={() => setShowOccupationModal(true)}>
              Browse and sync occupations
            </AlertLink>{' '}
            to get started.
          </AlertText>
        </AlertBox>
      )}

      {teams && teams.length > 0 ? (
        <TeamsGrid>
          {teams.map((team) => (
            <TeamCard key={team.id} to={`/teams/${team.id}`}>
              <TeamCardContent>
                <TeamTitle>{team.name}</TeamTitle>
                <TeamFunction>{team.function}</TeamFunction>
                <TeamMeta>
                  <span>{team.member_count} members</span>
                </TeamMeta>
              </TeamCardContent>
            </TeamCard>
          ))}
        </TeamsGrid>
      ) : (
        <EmptyState $variant="outlined">
          <Heading $level={3}>No teams found</Heading>
          <Text $color="subtle" style={{ marginBottom: '1rem' }}>
            Upload a CSV file to create teams.
          </Text>
          <Button onClick={() => setShowUploadModal(true)}>
            Upload CSV
          </Button>
        </EmptyState>
      )}

      {/* Occupation Browser Modal */}
      {showOccupationModal && (
        <ModalOverlay>
          <OccupationModalContainer $size="lg">
            <ModalHeader>
              <ModalTitle>Browse Occupations</ModalTitle>
              <CloseButton
                onClick={() => {
                  setShowOccupationModal(false)
                  setOccupationSearch('')
                }}
              >
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </CloseButton>
            </ModalHeader>

            <ModalBody>
              <ModalDescription>
                Search from 1,400+ Faethm job codes. Sync the ones you need for your teams.
              </ModalDescription>
              <SearchInput
                type="text"
                value={occupationSearch}
                onChange={(e) => setOccupationSearch(e.target.value)}
                placeholder="Search by job name or code (e.g., 'manager', 'ADM')..."
                $fullWidth
              />
            </ModalBody>

            <OccupationModalBody>
              {occupationSearch.length < 2 ? (
                <SearchHint>
                  <p>Type at least 2 characters to search occupations</p>
                  <p style={{ marginTop: '0.5rem' }}>
                    Or{' '}
                    <SyncLink
                      onClick={handleSyncOccupations}
                      disabled={syncOccupations.isPending}
                    >
                      {syncOccupations.isPending ? 'syncing...' : 'sync first 50 occupations'}
                    </SyncLink>
                  </p>
                </SearchHint>
              ) : searchingOccupations ? (
                <LoadingContainer>
                  <Spinner />
                  <Text $color="subtle" style={{ marginTop: '0.5rem' }}>Searching...</Text>
                </LoadingContainer>
              ) : availableOccupations && availableOccupations.occupations.length > 0 ? (
                <OccupationList>
                  <ResultCount>
                    Showing {availableOccupations.returned} of {availableOccupations.total_available} total occupations
                  </ResultCount>
                  {availableOccupations.occupations.map((occ: AvailableOccupation) => {
                    const syncedOccupation = occupations?.find((o: Occupation) => o.faethm_code === occ.faethm_code)
                    const isSynced = !!syncedOccupation
                    const isSyncing = syncingCode === occ.faethm_code

                    return (
                      <OccupationItem key={occ.faethm_code}>
                        <OccupationItemHeader>
                          <OccupationItemContent>
                            <Flex $align="center" $gap="spacingSM">
                              <OccupationItemCode>{occ.faethm_code}</OccupationItemCode>
                              {isSynced && (
                                <Badge $variant="success" $size="sm">Synced</Badge>
                              )}
                            </Flex>
                            <OccupationItemName>{occ.name}</OccupationItemName>
                            <OccupationItemDescription>{occ.description}</OccupationItemDescription>
                          </OccupationItemContent>
                          <OccupationItemActions>
                            {isSynced ? (
                              <Button
                                $size="sm"
                                onClick={() => {
                                  setShowOccupationModal(false)
                                  setOccupationSearch('')
                                  navigate(`/occupations/${syncedOccupation.id}`)
                                }}
                                style={{ backgroundColor: '#1C826A' }}
                              >
                                View Details
                              </Button>
                            ) : (
                              <Button
                                $size="sm"
                                onClick={() => handleSyncSingleOccupation(occ.faethm_code)}
                                disabled={isSyncing}
                                $variant={isSyncing ? 'secondary' : 'primary'}
                              >
                                {isSyncing ? 'Syncing...' : 'Sync'}
                              </Button>
                            )}
                          </OccupationItemActions>
                        </OccupationItemHeader>
                      </OccupationItem>
                    )
                  })}
                </OccupationList>
              ) : (
                <NoResults>
                  No occupations found for "{occupationSearch}"
                </NoResults>
              )}
            </OccupationModalBody>

            <ModalFooterWithInfo>
              <ModalFooterInfo>
                {occupations?.length || 0} occupations currently synced
              </ModalFooterInfo>
              <Button
                $variant="secondary"
                onClick={() => {
                  setShowOccupationModal(false)
                  setOccupationSearch('')
                }}
              >
                Close
              </Button>
            </ModalFooterWithInfo>
          </OccupationModalContainer>
        </ModalOverlay>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <ModalOverlay>
          <ModalContent $size="md">
            <ModalHeader>
              <ModalTitle>Upload Teams CSV</ModalTitle>
              <CloseButton
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadResult(null)
                }}
              >
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </CloseButton>
            </ModalHeader>

            <ModalBody>
              {!uploadResult ? (
                <>
                  <FormSection>
                    <SectionTitle>CSV Format</SectionTitle>
                    <CodeBlock>
                      <CodeLine>name,function,occupation_code,member_count</CodeLine>
                      <CodeLine $subtle>Product Team,Product Management,ADM.ABP,12</CodeLine>
                    </CodeBlock>
                  </FormSection>

                  <FormSection>
                    <SectionTitle>Synced Occupation Codes</SectionTitle>
                    {occupations && occupations.length > 0 ? (
                      <OccupationCodesList>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {occupations.slice(0, 20).map((o) => (
                            <OccupationCodeItem key={o.id}>
                              <OccupationCodeLabel>{o.faethm_code}</OccupationCodeLabel> - {o.name}
                            </OccupationCodeItem>
                          ))}
                          {occupations.length > 20 && (
                            <MoreText>
                              ... and {occupations.length - 20} more
                            </MoreText>
                          )}
                        </ul>
                      </OccupationCodesList>
                    ) : (
                      <WarningText>
                        No occupations synced.{' '}
                        <SyncLink
                          onClick={() => {
                            setShowUploadModal(false)
                            setShowOccupationModal(true)
                          }}
                        >
                          Browse and sync occupations first
                        </SyncLink>
                      </WarningText>
                    )}
                  </FormSection>

                  <FormSection>
                    <TemplateLink onClick={downloadTemplate}>
                      Download CSV Template
                    </TemplateLink>
                  </FormSection>

                  <FormSection>
                    <CheckboxLabel>
                      <Checkbox
                        type="checkbox"
                        checked={updateExisting}
                        onChange={(e) => setUpdateExisting(e.target.checked)}
                      />
                      <CheckboxText>Update existing teams with same name</CheckboxText>
                    </CheckboxLabel>
                  </FormSection>

                  <DropZone>
                    <HiddenInput
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      id="csv-upload"
                    />
                    <label htmlFor="csv-upload" style={{ cursor: 'pointer' }}>
                      <DropZoneIcon stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </DropZoneIcon>
                      <DropZoneText>
                        <DropZoneLink>Click to upload</DropZoneLink> or drag and drop
                      </DropZoneText>
                      <DropZoneHint>CSV files only</DropZoneHint>
                    </label>
                  </DropZone>

                  {uploadCSV.isPending && (
                    <UploadingContainer>
                      <Spinner />
                      <UploadingText>Uploading...</UploadingText>
                    </UploadingContainer>
                  )}
                </>
              ) : (
                <>
                  <ResultGrid>
                    <ResultCard $variant="success">
                      <ResultNumber $variant="success">{uploadResult.created}</ResultNumber>
                      <ResultLabel $variant="success">Created</ResultLabel>
                    </ResultCard>
                    <ResultCard $variant="info">
                      <ResultNumber $variant="info">{uploadResult.updated}</ResultNumber>
                      <ResultLabel $variant="info">Updated</ResultLabel>
                    </ResultCard>
                    <ResultCard $variant="error">
                      <ResultNumber $variant="error">{uploadResult.errors.length}</ResultNumber>
                      <ResultLabel $variant="error">Errors</ResultLabel>
                    </ResultCard>
                  </ResultGrid>

                  {uploadResult.errors.length > 0 && (
                    <ErrorsSection>
                      <ErrorsTitle>Errors</ErrorsTitle>
                      <ErrorsList>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {uploadResult.errors.map((err, i) => (
                            <ErrorItem key={i}>
                              Row {err.row}: {err.error}
                            </ErrorItem>
                          ))}
                        </ul>
                      </ErrorsList>
                    </ErrorsSection>
                  )}

                  {uploadResult.teams.length > 0 && (
                    <TeamsSection>
                      <TeamsTitle>Teams Processed</TeamsTitle>
                      <TeamsList>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {uploadResult.teams.map((team) => (
                            <TeamItem key={team.id}>
                              {team.name} ({team.function}) - {team.member_count} members
                            </TeamItem>
                          ))}
                        </ul>
                      </TeamsList>
                    </TeamsSection>
                  )}

                  <Flex $gap="spacingSM">
                    <Button
                      $variant="secondary"
                      $fullWidth
                      onClick={() => setUploadResult(null)}
                    >
                      Upload Another
                    </Button>
                    <Button
                      $fullWidth
                      onClick={() => {
                        setShowUploadModal(false)
                        setUploadResult(null)
                      }}
                    >
                      Done
                    </Button>
                  </Flex>
                </>
              )}
            </ModalBody>
          </ModalContent>
        </ModalOverlay>
      )}
    </PageContainer>
  )
}
