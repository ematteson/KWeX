import styled from 'styled-components'
import { ProgressBarContainer as BaseProgressBarContainer, ProgressBarFill } from '../design-system/components'

interface ProgressBarProps {
  current: number
  total: number
  label?: string
  showPercentage?: boolean
}

const Container = styled.div`
  width: 100%;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingXS};
`

const Label = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
`

const Percentage = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.bold};
`

const ProgressBarWrapper = styled(BaseProgressBarContainer)`
  /* Inherits all styles from design system */
`

const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: ${({ theme }) => theme.v1.spacing.spacingXS};
`

const FooterText = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
`

export function ProgressBar({ current, total, label, showPercentage = true }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <Container>
      {(label || showPercentage) && (
        <Header>
          {label && <Label>{label}</Label>}
          {showPercentage && <Percentage>{percentage}%</Percentage>}
        </Header>
      )}
      <ProgressBarWrapper>
        <ProgressBarFill $progress={percentage} />
      </ProgressBarWrapper>
      <Footer>
        <FooterText>Question {current} of {total}</FooterText>
      </Footer>
    </Container>
  )
}
