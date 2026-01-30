import styled, { css } from 'styled-components'

interface LikertScaleProps {
  value: number | null
  onChange: (value: number) => void
  labels?: string[]
  scale?: 5 | 7
}

const DEFAULT_LABELS_5 = [
  'Strongly Disagree',
  'Disagree',
  'Neutral',
  'Agree',
  'Strongly Agree',
]

const DEFAULT_LABELS_7 = [
  'Strongly Disagree',
  'Disagree',
  'Somewhat Disagree',
  'Neutral',
  'Somewhat Agree',
  'Agree',
  'Strongly Agree',
]

const Container = styled.div`
  width: 100%;
`

const OptionsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
`

const OptionButton = styled.button<{ $selected: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
  padding: ${({ theme }) => theme.v1.spacing.spacingMD};
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  border: 2px solid ${({ theme }) => theme.v1.semanticColors.border.neutral.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusMD};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.v1.semanticColors.border.brand.hover};
    background-color: ${({ theme }) => theme.v1.semanticColors.fill.highlight.brand.default};
  }

  ${({ $selected, theme }) =>
    $selected &&
    css`
      border-color: ${theme.v1.semanticColors.border.brand.default};
      background-color: ${theme.v1.semanticColors.fill.highlight.brand.default};
    `}
`

const RadioIndicator = styled.div<{ $selected: boolean }>`
  width: 1.25rem;
  height: 1.25rem;
  border-radius: ${({ theme }) => theme.v1.radius.radiusCircle};
  border: 2px solid ${({ theme }) => theme.v1.semanticColors.border.neutral.default};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  ${({ $selected, theme }) =>
    $selected &&
    css`
      border-color: ${theme.v1.semanticColors.border.brand.default};
      background-color: ${theme.v1.semanticColors.fill.action.brand.default};

      &::after {
        content: '';
        width: 0.5rem;
        height: 0.5rem;
        border-radius: ${theme.v1.radius.radiusCircle};
        background-color: ${theme.v1.semanticColors.text.inverse};
      }
    `}
`

const OptionLabel = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  text-align: center;
  line-height: ${({ theme }) => theme.v1.typography.lineHeights.helper};
`

const MobileScaleIndicator = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: ${({ theme }) => theme.v1.spacing.spacingMD};
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};

  @media (min-width: 640px) {
    display: none;
  }
`

export function LikertScale({ value, onChange, labels, scale = 5 }: LikertScaleProps) {
  const defaultLabels = scale === 5 ? DEFAULT_LABELS_5 : DEFAULT_LABELS_7
  const displayLabels = labels || defaultLabels
  const scaleValues = Array.from({ length: scale }, (_, i) => i + 1)

  return (
    <Container>
      <OptionsContainer>
        {scaleValues.map((scaleValue, index) => (
          <OptionButton
            key={scaleValue}
            type="button"
            onClick={() => onChange(scaleValue)}
            $selected={value === scaleValue}
          >
            <RadioIndicator $selected={value === scaleValue} />
            <OptionLabel>{displayLabels[index]}</OptionLabel>
          </OptionButton>
        ))}
      </OptionsContainer>

      {/* Mobile-friendly scale indicator */}
      <MobileScaleIndicator>
        <span>{displayLabels[0]}</span>
        <span>{displayLabels[displayLabels.length - 1]}</span>
      </MobileScaleIndicator>
    </Container>
  )
}
