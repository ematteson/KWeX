import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap');

  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    font-size: 16px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    font-family: ${({ theme }) => theme.v1.typography.fontFamily.base};
    font-size: ${({ theme }) => theme.v1.typography.sizes.bodyL};
    line-height: ${({ theme }) => theme.v1.typography.lineHeights.bodyL};
    color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
    background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: ${({ theme }) => theme.v1.typography.fontFamily.display};
    color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
    font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  }

  h1 {
    font-size: ${({ theme }) => theme.v1.typography.sizes.titleXL};
    line-height: ${({ theme }) => theme.v1.typography.lineHeights.titleXL};
  }

  h2 {
    font-size: ${({ theme }) => theme.v1.typography.sizes.titleL};
    line-height: ${({ theme }) => theme.v1.typography.lineHeights.titleL};
  }

  h3 {
    font-size: ${({ theme }) => theme.v1.typography.sizes.titleM};
    line-height: ${({ theme }) => theme.v1.typography.lineHeights.titleM};
  }

  h4 {
    font-size: ${({ theme }) => theme.v1.typography.sizes.titleS};
    line-height: ${({ theme }) => theme.v1.typography.lineHeights.titleS};
  }

  a {
    color: ${({ theme }) => theme.v1.semanticColors.text.link.brand.default};
    text-decoration: none;
    transition: color 0.2s ease;

    &:hover {
      color: ${({ theme }) => theme.v1.semanticColors.text.link.brand.hover};
    }

    &:active {
      color: ${({ theme }) => theme.v1.semanticColors.text.link.brand.active};
    }
  }

  button {
    font-family: ${({ theme }) => theme.v1.typography.fontFamily.base};
    cursor: pointer;
  }

  input, textarea, select {
    font-family: ${({ theme }) => theme.v1.typography.fontFamily.base};
  }

  ::selection {
    background-color: ${({ theme }) => theme.v1.semanticColors.fill.highlight.brand.default};
    color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  }

  :focus-visible {
    outline: 2px solid ${({ theme }) => theme.v1.semanticColors.border.focus};
    outline-offset: 2px;
  }

  /* Scrollbar styling */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
  }

  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.v1.semanticColors.border.neutral.default};
    border-radius: ${({ theme }) => theme.v1.radius.radiusPill};
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.v1.semanticColors.border.neutral.dark};
  }
`;
