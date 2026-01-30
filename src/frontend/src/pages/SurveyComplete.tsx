import styled from 'styled-components'

const PageContainer = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const ContentWrapper = styled.div`
  text-align: center;
  max-width: 28rem;
`

const SuccessIconWrapper = styled.div`
  width: 5rem;
  height: 5rem;
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.feedback.success.subtle};
  border-radius: ${({ theme }) => theme.v1.radius.radiusCircle};
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto ${({ theme }) => theme.v1.spacing.spacing2XL};
`

const SuccessIcon = styled.svg`
  width: 2.5rem;
  height: 2.5rem;
  color: ${({ theme }) => theme.v1.semanticColors.icon.feedback.success.vibrant};
`

const Title = styled.h1`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleM};
  font-weight: ${({ theme }) => theme.v1.typography.weights.bold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingMD} 0;
`

const Description = styled.p`
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacing2XL} 0;
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyL};
  line-height: ${({ theme }) => theme.v1.typography.lineHeights.bodyL};
`

const InfoCard = styled.div`
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  border: 1px solid ${({ theme }) => theme.v1.semanticColors.border.neutral.default};
  padding: ${({ theme }) => theme.v1.spacing.spacingLG};
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacing2XL};
`

const InfoCardTitle = styled.h2`
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0 0 ${({ theme }) => theme.v1.spacing.spacingSM} 0;
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyL};
`

const InfoList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  text-align: left;
`

const InfoListItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};

  & + & {
    margin-top: ${({ theme }) => theme.v1.spacing.spacingSM};
  }
`

const CheckIcon = styled.svg`
  width: 1rem;
  height: 1rem;
  color: ${({ theme }) => theme.v1.semanticColors.icon.brand.default};
  flex-shrink: 0;
  margin-top: 0.125rem;
`

const FooterText = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  margin: 0;
  line-height: 1.5;
`

export function SurveyComplete() {
  return (
    <PageContainer>
      <ContentWrapper>
        {/* Success icon */}
        <SuccessIconWrapper>
          <SuccessIcon fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </SuccessIcon>
        </SuccessIconWrapper>

        <Title>Thank You!</Title>

        <Description>
          Your survey response has been submitted successfully. Your feedback helps improve the work experience for your team.
        </Description>

        <InfoCard>
          <InfoCardTitle>What happens next?</InfoCardTitle>
          <InfoList>
            <InfoListItem>
              <CheckIcon fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </CheckIcon>
              <span>Your response is aggregated anonymously with your team</span>
            </InfoListItem>
            <InfoListItem>
              <CheckIcon fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </CheckIcon>
              <span>Results appear only after 7+ responses (privacy threshold)</span>
            </InfoListItem>
            <InfoListItem>
              <CheckIcon fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </CheckIcon>
              <span>Improvement opportunities are prioritized for your team</span>
            </InfoListItem>
          </InfoList>
        </InfoCard>

        <FooterText>
          This survey is for system diagnosis only — not performance management.
          <br />
          You can safely close this window.
        </FooterText>
      </ContentWrapper>
    </PageContainer>
  )
}
