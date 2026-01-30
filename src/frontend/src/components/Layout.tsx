import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import styled from 'styled-components'
import { StatusModal } from './StatusModal'

const navigation = [
  { name: 'Executive', href: '/executive' },
  { name: 'Teams', href: '/teams' },
]

// Styled Components
const LayoutWrapper = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
`

const Header = styled.header`
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  box-shadow: ${({ theme }) => theme.v1.shadows.xs};
  border-bottom: 1px solid ${({ theme }) => theme.v1.semanticColors.border.divider.light};
  position: sticky;
  top: 0;
  z-index: 100;
`

const HeaderContent = styled.div`
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.v1.spacing.spacingLG};
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
`

const LogoSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.v1.spacing.spacingMD};
`

const LogoLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
  text-decoration: none;
`

const LogoIcon = styled.div`
  width: 32px;
  height: 32px;
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.action.brand.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusMD};
  display: flex;
  align-items: center;
  justify-content: center;
`

const LogoIconText = styled.span`
  color: ${({ theme }) => theme.v1.semanticColors.text.inverse};
  font-weight: ${({ theme }) => theme.v1.typography.weights.bold};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
`

const LogoText = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
`

const LogoTagline = styled.span`
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};

  @media (max-width: 640px) {
    display: none;
  }
`

const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.v1.spacing.spacing2XL};
`

const NavLink = styled(Link)<{ $active: boolean }>`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme, $active }) =>
    $active
      ? theme.v1.semanticColors.text.action.default
      : theme.v1.semanticColors.text.body.default};
  text-decoration: none;
  transition: color 0.2s ease;
  position: relative;

  &:hover {
    color: ${({ theme, $active }) =>
      $active
        ? theme.v1.semanticColors.text.action.hover
        : theme.v1.semanticColors.text.heading.bold};
  }

  ${({ $active, theme }) =>
    $active &&
    `
    &::after {
      content: '';
      position: absolute;
      bottom: -20px;
      left: 0;
      right: 0;
      height: 3px;
      background-color: ${theme.v1.semanticColors.fill.action.brand.default};
      border-radius: ${theme.v1.radius.radiusPill};
    }
  `}
`

const StatusButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.v1.spacing.spacingXS};
  padding: ${({ theme }) => theme.v1.spacing.spacingXS} ${({ theme }) => theme.v1.spacing.spacingMD};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.neutral.light};
  border: none;
  border-radius: ${({ theme }) => theme.v1.radius.radiusMD};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${({ theme }) => theme.v1.semanticColors.fill.neutral.dark};
    color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  }
`

const StatusIcon = styled.svg`
  width: 16px;
  height: 16px;
`

const StatusText = styled.span`
  @media (max-width: 640px) {
    display: none;
  }
`

const Main = styled.main`
  flex: 1;
  max-width: 1280px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.v1.spacing.spacing3XL} ${({ theme }) => theme.v1.spacing.spacingLG};
  width: 100%;
`

const Footer = styled.footer`
  border-top: 1px solid ${({ theme }) => theme.v1.semanticColors.border.divider.light};
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  margin-top: auto;
`

const FooterContent = styled.div`
  max-width: 1280px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.v1.spacing.spacingLG};
`

const FooterText = styled.p`
  text-align: center;
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  margin: 0;
`

export function Layout() {
  const location = useLocation()
  const [showStatusModal, setShowStatusModal] = useState(false)

  const isActive = (href: string) => {
    if (href === '/executive') {
      return location.pathname === href
    }
    return location.pathname.startsWith(href)
  }

  return (
    <LayoutWrapper>
      <Header>
        <HeaderContent>
          <LogoSection>
            <LogoLink to="/">
              <LogoIcon>
                <LogoIconText>K</LogoIconText>
              </LogoIcon>
              <LogoText>KWeX</LogoText>
            </LogoLink>
            <LogoTagline>Knowledge Worker Experience</LogoTagline>
          </LogoSection>

          <Nav>
            {navigation.map((item) => (
              <NavLink key={item.name} to={item.href} $active={isActive(item.href)}>
                {item.name}
              </NavLink>
            ))}

            <StatusButton onClick={() => setShowStatusModal(true)} title="System Status">
              <StatusIcon fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </StatusIcon>
              <StatusText>Status</StatusText>
            </StatusButton>
          </Nav>
        </HeaderContent>
      </Header>

      <StatusModal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} />

      <Main>
        <Outlet />
      </Main>

      <Footer>
        <FooterContent>
          <FooterText>
            KWeX - Knowledge Worker Experience Platform | System Diagnosis Only - Not for
            Performance Management
          </FooterText>
        </FooterContent>
      </Footer>
    </LayoutWrapper>
  )
}
