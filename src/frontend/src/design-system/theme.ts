/**
 * Fredly Design System - Workforce Theme
 * Extracted from @pearsonwfs/component-library for local use
 */

// Primary Color Palette
export const primaryColors = {
  10: '#E6F7FC',
  25: '#DEF2F7',
  50: '#CEECF5',
  100: '#AFE0F0',
  200: '#8DD5EB',
  300: '#66C6E3',
  400: '#009AC9',
  500: '#0080A7',
  600: '#006787',
  700: '#005873',
  800: '#004E66',
  900: '#002733',
} as const;

// Secondary Color Palette
export const secondaryColors = {
  10: '#E1ECF0',
  25: '#D5E1E5',
  50: '#C2D1D6',
  100: '#B1C3CB',
  200: '#8EA9B4',
  300: '#6B8E9C',
  400: '#487485',
  500: '#25596E',
  600: '#1F4B5C',
  700: '#193D4B',
  800: '#132E39',
  900: '#0D2028',
} as const;

// Neutral Colors
export const neutralColors = {
  white: '#FFFFFF',
  black: '#000000',
  grey2: '#F9FBFC',
  grey5: '#F3F6F8',
  grey10: '#E6EEF2',
  grey20: '#EFEFEF',
  grey25: '#E6E6E6',
  grey200: '#C4C4C4',
  grey400: '#737373',
  grey600: '#4E4E4E',
  grey800: '#2E2E2E',
} as const;

// Status Colors
export const statusColors = {
  red: {
    5: '#FDF7F6',
    10: '#FAEBE8',
    25: '#F0CCC4',
    100: '#C53312',
    700: '#731E0B',
  },
  orange: {
    5: '#FEFAF7',
    10: '#FDF1EB',
    25: '#F8DBCB',
    100: '#B85217',
    700: '#85421C',
  },
  yellow: {
    5: '#FFFCF5',
    10: '#FFF7E6',
    25: '#FFEABF',
    100: '#F0B400',
    700: '#806000',
  },
  green: {
    5: '#FDFAF9',
    10: '#E9F3F1',
    25: '#C6E0DA',
    100: '#1C826A',
    700: '#0F473A',
  },
  blue: {
    5: '#F2F8FF',
    10: '#E1ECFA',
    25: '#C4DAF5',
    100: '#245FA8',
    700: '#12305A',
  },
  purple: {
    5: '#F5F2FF',
    10: '#E8E1FA',
    25: '#D1C4F5',
    100: '#5B4599',
    700: '#2A1563',
  },
  oliveGreen: {
    5: '#F9FAF6',
    10: '#EFF3E9',
    25: '#D5E0C6',
    100: '#597E19',
    700: '#2F470F',
  },
} as const;

// Chart Colors
export const chartColors = {
  1: '#0080A7',
  2: '#193D4B',
  3: '#B85217',
  4: '#F0B400',
  5: '#6B8E9C',
  6: '#731E0B',
  7: '#806000',
  8: '#597E19',
} as const;

// Spacing System
export const spacing = {
  0.5: '0.125rem',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  11: '2.75rem',
  12: '3rem',
  13: '3.25rem',
  14: '3.5rem',
  15: '3.75rem',
  16: '4rem',
  spacingXXS: '0.125rem',
  spacingXS: '0.25rem',
  spacingSM: '0.5rem',
  spacingMD: '0.75rem',
  spacingLG: '1rem',
  spacingXL: '1.25rem',
  spacing2XL: '1.5rem',
  spacing3XL: '2rem',
  spacing4XL: '2.5rem',
  spacing5XL: '3rem',
  spacing6XL: '4rem',
} as const;

// Border Radius
export const radius = {
  0: '0',
  1: '0.125rem',
  2: '0.25rem',
  3: '0.5rem',
  4: '0.75rem',
  5: '1rem',
  6: '1.5rem',
  radiusNone: '0',
  radiusXS: '0.125rem',
  radiusSM: '0.25rem',
  radiusMD: '0.5rem',
  radiusLG: '0.75rem',
  radiusXL: '1rem',
  radius2XL: '1.5rem',
  radiusPill: '9999px',
  radiusCircle: '50%',
} as const;

// Shadows
export const shadows = {
  xs: '0px 4px 8px rgba(0, 0, 0, 0.08)',
  sm: '0px 6px 10px rgba(0, 0, 0, 0.11)',
  md: '0px 9px 18px rgba(0, 0, 0, 0.15)',
  lg: '0px 13px 37px rgba(0, 0, 0, 0.21)',
  xl: '0px 20px 56px rgba(0, 0, 0, 0.29)',
} as const;

// Typography
export const typography = {
  fontFamily: {
    base: "'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    display: "'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  sizes: {
    displayXXL: '3rem',
    displayXL: '2.5rem',
    displayL: '2rem',
    displayM: '1.5rem',
    displayS: '1.25rem',
    displayXS: '1rem',
    titleXL: '2.5rem',
    titleL: '2rem',
    titleM: '1.5rem',
    titleS: '1.25rem',
    bodyL: '1rem',
    bodyS: '0.875rem',
    helper: '0.75rem',
  },
  weights: {
    regular: 400,
    semibold: 600,
    bold: 700,
  },
  lineHeights: {
    displayXXL: '4rem',
    displayXL: '3rem',
    displayL: '3rem',
    displayM: '2.25rem',
    displayS: '1.75rem',
    displayXS: '1.75rem',
    titleXL: '3.5rem',
    titleL: '3rem',
    titleM: '2.25rem',
    titleS: '1.75rem',
    bodyL: '1.5rem',
    bodyS: '1.25rem',
    helper: '1rem',
  },
} as const;

// Semantic Colors - Workforce Theme
export const semanticColors = {
  canvas: {
    default: neutralColors.white,
    highlight: {
      extraLight: neutralColors.grey2,
      light: neutralColors.grey5,
      dark: neutralColors.grey10,
      brand: primaryColors[10],
    },
  },
  fill: {
    white: neutralColors.white,
    neutral: {
      dark: neutralColors.grey10,
      light: neutralColors.grey5,
      skeleton: neutralColors.grey25,
    },
    action: {
      brand: {
        default: primaryColors[500],
        hover: primaryColors[600],
        active: primaryColors[700],
      },
      neutral: {
        light: neutralColors.grey200,
        default: neutralColors.grey400,
        hover: neutralColors.grey600,
        active: neutralColors.grey800,
      },
      danger: {
        light: statusColors.red[10],
        default: statusColors.red[100],
        hover: statusColors.red[700],
        active: statusColors.red[700],
      },
    },
    highlight: {
      brand: {
        default: primaryColors[10],
        hover: primaryColors[10],
        active: primaryColors[25],
      },
      neutral: {
        default: neutralColors.grey20,
        hover: neutralColors.grey20,
        active: neutralColors.grey25,
      },
    },
    feedback: {
      neutral: { bold: secondaryColors[600], subtle: neutralColors.grey10 },
      success: { bold: statusColors.green[100], subtle: statusColors.green[10] },
      warning: { bold: statusColors.yellow[100], subtle: statusColors.yellow[10] },
      error: { bold: statusColors.red[100], subtle: statusColors.red[10] },
      info: { bold: statusColors.blue[100], subtle: statusColors.blue[10] },
      help: { bold: statusColors.purple[100], subtle: statusColors.purple[10] },
      orange: { bold: statusColors.orange[100], subtle: statusColors.orange[10] },
      olive: { bold: statusColors.oliveGreen[100], subtle: statusColors.oliveGreen[10] },
    },
  },
  text: {
    inverse: neutralColors.white,
    heading: {
      bold: neutralColors.grey800,
      subtle: neutralColors.grey600,
    },
    body: {
      default: neutralColors.grey600,
      bold: neutralColors.grey800,
      subtle: neutralColors.grey400,
    },
    alt: {
      bold: neutralColors.grey600,
      subtle: neutralColors.grey400,
    },
    accent: {
      primary: primaryColors[500],
      secondary: secondaryColors[500],
    },
    action: {
      default: primaryColors[500],
      hover: primaryColors[600],
      active: primaryColors[700],
    },
    danger: {
      default: statusColors.red[100],
      hover: statusColors.red[700],
      active: statusColors.red[700],
    },
    link: {
      brand: {
        default: primaryColors[500],
        hover: primaryColors[600],
        active: primaryColors[700],
        visited: statusColors.purple[100],
      },
      neutral: {
        default: neutralColors.grey800,
        hover: neutralColors.grey600,
        active: neutralColors.grey800,
        visited: statusColors.purple[100],
      },
    },
    feedback: {
      neutral: { default: secondaryColors[600] },
      success: { default: statusColors.green[700], vibrant: statusColors.green[100] },
      warning: { default: statusColors.yellow[700], vibrant: statusColors.yellow[700] },
      error: { default: statusColors.red[700], vibrant: statusColors.red[100] },
      info: { default: statusColors.blue[700], vibrant: statusColors.blue[100] },
      help: { default: statusColors.purple[700], vibrant: statusColors.purple[100] },
      orange: { default: statusColors.orange[700], vibrant: statusColors.orange[100] },
      olive: { default: statusColors.oliveGreen[700], vibrant: statusColors.oliveGreen[100] },
    },
  },
  icon: {
    inverse: neutralColors.white,
    neutral: {
      default: neutralColors.grey600,
      light: neutralColors.grey400,
      dark: neutralColors.grey800,
    },
    brand: {
      default: primaryColors[500],
      hover: primaryColors[600],
      active: primaryColors[700],
    },
    danger: {
      default: statusColors.red[100],
      hover: statusColors.red[700],
      active: statusColors.red[700],
    },
    feedback: {
      neutral: { default: secondaryColors[600] },
      success: { default: statusColors.green[700], vibrant: statusColors.green[100] },
      warning: { default: statusColors.yellow[700], vibrant: statusColors.yellow[100] },
      error: { default: statusColors.red[700], vibrant: statusColors.red[100] },
      info: { default: statusColors.blue[700], vibrant: statusColors.blue[100] },
      help: { default: statusColors.purple[700], vibrant: statusColors.purple[100] },
      orange: { default: statusColors.orange[700], vibrant: statusColors.orange[100] },
      olive: { default: statusColors.oliveGreen[700], vibrant: statusColors.oliveGreen[100] },
    },
  },
  border: {
    focus: statusColors.blue[100],
    neutral: {
      default: neutralColors.grey200,
      light: neutralColors.grey25,
      dark: neutralColors.grey400,
    },
    brand: {
      default: primaryColors[500],
      hover: primaryColors[600],
      active: primaryColors[700],
    },
    danger: {
      default: statusColors.red[100],
      hover: statusColors.red[700],
      active: statusColors.red[700],
    },
    divider: {
      light: neutralColors.grey25,
      dark: neutralColors.grey200,
    },
    inputs: {
      default: neutralColors.grey400,
      hover: primaryColors[600],
      typing: primaryColors[500],
      selected: primaryColors[700],
    },
    feedback: {
      neutral: secondaryColors[600],
      error: statusColors.red[100],
      warning: statusColors.yellow[700],
      success: statusColors.green[100],
      info: statusColors.blue[100],
      help: statusColors.purple[100],
      orange: statusColors.orange[100],
      olive: statusColors.oliveGreen[100],
    },
  },
  chart: {
    title: neutralColors.grey800,
    subtitle: neutralColors.grey600,
    label: neutralColors.grey400,
    border: {
      dark: neutralColors.grey200,
      light: neutralColors.grey20,
    },
    colors: chartColors,
  },
} as const;

// Complete Theme Object
export const workforceTheme = {
  v1: {
    spacing,
    radius,
    shadows,
    typography,
    semanticColors,
    colors: {
      primary: primaryColors,
      secondary: secondaryColors,
      neutral: neutralColors,
      status: statusColors,
      chart: chartColors,
    },
  },
} as const;

export type WorkforceTheme = typeof workforceTheme;
