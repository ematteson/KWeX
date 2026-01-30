import styled, { css } from 'styled-components';

// =============================================================================
// BUTTONS
// =============================================================================

interface ButtonProps {
  $variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  $size?: 'sm' | 'md' | 'lg';
  $fullWidth?: boolean;
}

export const Button = styled.button<ButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
  border: none;
  border-radius: ${({ theme }) => theme.v1.radius.radiusMD};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  transition: all 0.2s ease;
  cursor: pointer;

  ${({ $fullWidth }) => $fullWidth && css`width: 100%;`}

  ${({ $size = 'md', theme }) => {
    switch ($size) {
      case 'sm':
        return css`
          padding: ${theme.v1.spacing.spacingXS} ${theme.v1.spacing.spacingMD};
          font-size: ${theme.v1.typography.sizes.bodyS};
        `;
      case 'lg':
        return css`
          padding: ${theme.v1.spacing.spacingMD} ${theme.v1.spacing.spacing2XL};
          font-size: ${theme.v1.typography.sizes.bodyL};
        `;
      default:
        return css`
          padding: ${theme.v1.spacing.spacingSM} ${theme.v1.spacing.spacingXL};
          font-size: ${theme.v1.typography.sizes.bodyS};
        `;
    }
  }}

  ${({ $variant = 'primary', theme }) => {
    switch ($variant) {
      case 'secondary':
        return css`
          background-color: transparent;
          color: ${theme.v1.semanticColors.text.action.default};
          border: 1px solid ${theme.v1.semanticColors.border.brand.default};
          &:hover:not(:disabled) {
            background-color: ${theme.v1.semanticColors.fill.highlight.brand.default};
            border-color: ${theme.v1.semanticColors.border.brand.hover};
          }
          &:active:not(:disabled) {
            background-color: ${theme.v1.semanticColors.fill.highlight.brand.active};
          }
        `;
      case 'danger':
        return css`
          background-color: ${theme.v1.semanticColors.fill.action.danger.default};
          color: ${theme.v1.semanticColors.text.inverse};
          &:hover:not(:disabled) {
            background-color: ${theme.v1.semanticColors.fill.action.danger.hover};
          }
          &:active:not(:disabled) {
            background-color: ${theme.v1.semanticColors.fill.action.danger.active};
          }
        `;
      case 'ghost':
        return css`
          background-color: transparent;
          color: ${theme.v1.semanticColors.text.action.default};
          &:hover:not(:disabled) {
            background-color: ${theme.v1.semanticColors.fill.highlight.brand.default};
          }
          &:active:not(:disabled) {
            background-color: ${theme.v1.semanticColors.fill.highlight.brand.active};
          }
        `;
      default:
        return css`
          background-color: ${theme.v1.semanticColors.fill.action.brand.default};
          color: ${theme.v1.semanticColors.text.inverse};
          &:hover:not(:disabled) {
            background-color: ${theme.v1.semanticColors.fill.action.brand.hover};
          }
          &:active:not(:disabled) {
            background-color: ${theme.v1.semanticColors.fill.action.brand.active};
          }
        `;
    }
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// =============================================================================
// CARDS
// =============================================================================

interface CardProps {
  $variant?: 'default' | 'elevated' | 'outlined';
  $padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = styled.div<CardProps>`
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};

  ${({ $padding = 'md', theme }) => {
    switch ($padding) {
      case 'none':
        return css`padding: 0;`;
      case 'sm':
        return css`padding: ${theme.v1.spacing.spacingMD};`;
      case 'lg':
        return css`padding: ${theme.v1.spacing.spacing2XL};`;
      default:
        return css`padding: ${theme.v1.spacing.spacingXL};`;
    }
  }}

  ${({ $variant = 'default', theme }) => {
    switch ($variant) {
      case 'elevated':
        return css`
          box-shadow: ${theme.v1.shadows.md};
        `;
      case 'outlined':
        return css`
          border: 1px solid ${theme.v1.semanticColors.border.neutral.light};
        `;
      default:
        return css`
          box-shadow: ${theme.v1.shadows.sm};
        `;
    }
  }}
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingLG};
`;

export const CardTitle = styled.h3`
  font-size: ${({ theme }) => theme.v1.typography.sizes.titleS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
  margin: 0;
`;

export const CardSubtitle = styled.p`
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  margin: 0;
`;

export const CardContent = styled.div``;

export const CardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
  margin-top: ${({ theme }) => theme.v1.spacing.spacingLG};
  padding-top: ${({ theme }) => theme.v1.spacing.spacingLG};
  border-top: 1px solid ${({ theme }) => theme.v1.semanticColors.border.divider.light};
`;

// =============================================================================
// INPUTS
// =============================================================================

interface InputProps {
  $hasError?: boolean;
  $fullWidth?: boolean;
}

export const Input = styled.input<InputProps>`
  width: ${({ $fullWidth }) => $fullWidth ? '100%' : 'auto'};
  padding: ${({ theme }) => theme.v1.spacing.spacingSM} ${({ theme }) => theme.v1.spacing.spacingMD};
  border: 1px solid ${({ theme, $hasError }) =>
    $hasError ? theme.v1.semanticColors.border.feedback.error : theme.v1.semanticColors.border.inputs.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.bold};
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &::placeholder {
    color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  }

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.v1.semanticColors.border.inputs.hover};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.v1.semanticColors.border.inputs.typing};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.v1.semanticColors.fill.highlight.brand.default};
  }

  &:disabled {
    background-color: ${({ theme }) => theme.v1.semanticColors.fill.neutral.light};
    cursor: not-allowed;
  }
`;

export const TextArea = styled.textarea<InputProps>`
  width: ${({ $fullWidth }) => $fullWidth ? '100%' : 'auto'};
  padding: ${({ theme }) => theme.v1.spacing.spacingSM} ${({ theme }) => theme.v1.spacing.spacingMD};
  border: 1px solid ${({ theme, $hasError }) =>
    $hasError ? theme.v1.semanticColors.border.feedback.error : theme.v1.semanticColors.border.inputs.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.bold};
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &::placeholder {
    color: ${({ theme }) => theme.v1.semanticColors.text.body.subtle};
  }

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.v1.semanticColors.border.inputs.hover};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.v1.semanticColors.border.inputs.typing};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.v1.semanticColors.fill.highlight.brand.default};
  }

  &:disabled {
    background-color: ${({ theme }) => theme.v1.semanticColors.fill.neutral.light};
    cursor: not-allowed;
  }
`;

export const Label = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.bold};
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingXS};
`;

export const HelperText = styled.span<{ $error?: boolean }>`
  display: block;
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  color: ${({ theme, $error }) =>
    $error ? theme.v1.semanticColors.text.feedback.error.vibrant : theme.v1.semanticColors.text.body.subtle};
  margin-top: ${({ theme }) => theme.v1.spacing.spacingXS};
`;

// =============================================================================
// BADGES / CHIPS
// =============================================================================

interface BadgeProps {
  $variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  $size?: 'sm' | 'md';
}

export const Badge = styled.span<BadgeProps>`
  display: inline-flex;
  align-items: center;
  border-radius: ${({ theme }) => theme.v1.radius.radiusPill};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};

  ${({ $size = 'md', theme }) => {
    switch ($size) {
      case 'sm':
        return css`
          padding: ${theme.v1.spacing.spacingXXS} ${theme.v1.spacing.spacingSM};
          font-size: ${theme.v1.typography.sizes.helper};
        `;
      default:
        return css`
          padding: ${theme.v1.spacing.spacingXS} ${theme.v1.spacing.spacingMD};
          font-size: ${theme.v1.typography.sizes.bodyS};
        `;
    }
  }}

  ${({ $variant = 'default', theme }) => {
    switch ($variant) {
      case 'success':
        return css`
          background-color: ${theme.v1.semanticColors.fill.feedback.success.subtle};
          color: ${theme.v1.semanticColors.text.feedback.success.default};
        `;
      case 'warning':
        return css`
          background-color: ${theme.v1.semanticColors.fill.feedback.warning.subtle};
          color: ${theme.v1.semanticColors.text.feedback.warning.default};
        `;
      case 'error':
        return css`
          background-color: ${theme.v1.semanticColors.fill.feedback.error.subtle};
          color: ${theme.v1.semanticColors.text.feedback.error.default};
        `;
      case 'info':
        return css`
          background-color: ${theme.v1.semanticColors.fill.feedback.info.subtle};
          color: ${theme.v1.semanticColors.text.feedback.info.default};
        `;
      default:
        return css`
          background-color: ${theme.v1.semanticColors.fill.neutral.light};
          color: ${theme.v1.semanticColors.text.body.default};
        `;
    }
  }}
`;

// =============================================================================
// LAYOUT
// =============================================================================

export const Container = styled.div<{ $maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full' }>`
  width: 100%;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.v1.spacing.spacingLG};

  ${({ $maxWidth = 'xl' }) => {
    switch ($maxWidth) {
      case 'sm':
        return css`max-width: 640px;`;
      case 'md':
        return css`max-width: 768px;`;
      case 'lg':
        return css`max-width: 1024px;`;
      case 'full':
        return css`max-width: 100%;`;
      default:
        return css`max-width: 1280px;`;
    }
  }}
`;

export const Flex = styled.div<{
  $direction?: 'row' | 'column';
  $align?: 'start' | 'center' | 'end' | 'stretch';
  $justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  $gap?: keyof typeof import('./theme').spacing;
  $wrap?: boolean;
}>`
  display: flex;
  flex-direction: ${({ $direction = 'row' }) => $direction};
  align-items: ${({ $align = 'stretch' }) => {
    switch ($align) {
      case 'start': return 'flex-start';
      case 'end': return 'flex-end';
      default: return $align;
    }
  }};
  justify-content: ${({ $justify = 'start' }) => {
    switch ($justify) {
      case 'start': return 'flex-start';
      case 'end': return 'flex-end';
      case 'between': return 'space-between';
      case 'around': return 'space-around';
      default: return $justify;
    }
  }};
  ${({ $wrap }) => $wrap && css`flex-wrap: wrap;`}
  ${({ $gap, theme }) => $gap && css`gap: ${theme.v1.spacing[$gap]};`}
`;

export const Grid = styled.div<{
  $columns?: number;
  $gap?: keyof typeof import('./theme').spacing;
}>`
  display: grid;
  grid-template-columns: repeat(${({ $columns = 1 }) => $columns}, 1fr);
  ${({ $gap, theme }) => $gap && css`gap: ${theme.v1.spacing[$gap]};`}
`;

export const Divider = styled.hr<{ $margin?: 'sm' | 'md' | 'lg' }>`
  border: none;
  border-top: 1px solid ${({ theme }) => theme.v1.semanticColors.border.divider.light};

  ${({ $margin = 'md', theme }) => {
    switch ($margin) {
      case 'sm':
        return css`margin: ${theme.v1.spacing.spacingSM} 0;`;
      case 'lg':
        return css`margin: ${theme.v1.spacing.spacing2XL} 0;`;
      default:
        return css`margin: ${theme.v1.spacing.spacingLG} 0;`;
    }
  }}
`;

// =============================================================================
// TEXT
// =============================================================================

export const Text = styled.p<{
  $variant?: 'body' | 'bodySmall' | 'helper';
  $color?: 'default' | 'subtle' | 'bold' | 'accent' | 'error' | 'success';
  $weight?: 'regular' | 'semibold' | 'bold';
}>`
  margin: 0;

  ${({ $variant = 'body', theme }) => {
    switch ($variant) {
      case 'bodySmall':
        return css`
          font-size: ${theme.v1.typography.sizes.bodyS};
          line-height: ${theme.v1.typography.lineHeights.bodyS};
        `;
      case 'helper':
        return css`
          font-size: ${theme.v1.typography.sizes.helper};
          line-height: ${theme.v1.typography.lineHeights.helper};
        `;
      default:
        return css`
          font-size: ${theme.v1.typography.sizes.bodyL};
          line-height: ${theme.v1.typography.lineHeights.bodyL};
        `;
    }
  }}

  ${({ $color = 'default', theme }) => {
    switch ($color) {
      case 'subtle':
        return css`color: ${theme.v1.semanticColors.text.body.subtle};`;
      case 'bold':
        return css`color: ${theme.v1.semanticColors.text.body.bold};`;
      case 'accent':
        return css`color: ${theme.v1.semanticColors.text.accent.primary};`;
      case 'error':
        return css`color: ${theme.v1.semanticColors.text.feedback.error.vibrant};`;
      case 'success':
        return css`color: ${theme.v1.semanticColors.text.feedback.success.vibrant};`;
      default:
        return css`color: ${theme.v1.semanticColors.text.body.default};`;
    }
  }}

  ${({ $weight, theme }) => $weight && css`
    font-weight: ${theme.v1.typography.weights[$weight]};
  `}
`;

export const Heading = styled.h2<{
  $level?: 1 | 2 | 3 | 4;
  $color?: 'default' | 'subtle';
}>`
  margin: 0;
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};

  ${({ $level = 2, theme }) => {
    switch ($level) {
      case 1:
        return css`
          font-size: ${theme.v1.typography.sizes.titleXL};
          line-height: ${theme.v1.typography.lineHeights.titleXL};
        `;
      case 3:
        return css`
          font-size: ${theme.v1.typography.sizes.titleS};
          line-height: ${theme.v1.typography.lineHeights.titleS};
        `;
      case 4:
        return css`
          font-size: ${theme.v1.typography.sizes.bodyL};
          line-height: ${theme.v1.typography.lineHeights.bodyL};
        `;
      default:
        return css`
          font-size: ${theme.v1.typography.sizes.titleM};
          line-height: ${theme.v1.typography.lineHeights.titleM};
        `;
    }
  }}

  ${({ $color = 'default', theme }) => {
    switch ($color) {
      case 'subtle':
        return css`color: ${theme.v1.semanticColors.text.heading.subtle};`;
      default:
        return css`color: ${theme.v1.semanticColors.text.heading.bold};`;
    }
  }}
`;

// =============================================================================
// PROGRESS
// =============================================================================

export const ProgressBarContainer = styled.div`
  width: 100%;
  height: 8px;
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.neutral.dark};
  border-radius: ${({ theme }) => theme.v1.radius.radiusPill};
  overflow: hidden;
`;

export const ProgressBarFill = styled.div<{ $progress: number; $variant?: 'default' | 'success' | 'warning' | 'error' }>`
  height: 100%;
  width: ${({ $progress }) => `${Math.min(100, Math.max(0, $progress))}%`};
  border-radius: ${({ theme }) => theme.v1.radius.radiusPill};
  transition: width 0.3s ease;

  ${({ $variant = 'default', theme }) => {
    switch ($variant) {
      case 'success':
        return css`background-color: ${theme.v1.semanticColors.fill.feedback.success.bold};`;
      case 'warning':
        return css`background-color: ${theme.v1.semanticColors.fill.feedback.warning.bold};`;
      case 'error':
        return css`background-color: ${theme.v1.semanticColors.fill.feedback.error.bold};`;
      default:
        return css`background-color: ${theme.v1.semanticColors.fill.action.brand.default};`;
    }
  }}
`;

// =============================================================================
// MODAL
// =============================================================================

export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: ${({ theme }) => theme.v1.spacing.spacingLG};
`;

export const ModalContent = styled.div<{ $size?: 'sm' | 'md' | 'lg' | 'xl' }>`
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.default};
  border-radius: ${({ theme }) => theme.v1.radius.radiusLG};
  box-shadow: ${({ theme }) => theme.v1.shadows.xl};
  max-height: 90vh;
  overflow-y: auto;

  ${({ $size = 'md' }) => {
    switch ($size) {
      case 'sm':
        return css`width: 100%; max-width: 400px;`;
      case 'lg':
        return css`width: 100%; max-width: 800px;`;
      case 'xl':
        return css`width: 100%; max-width: 1000px;`;
      default:
        return css`width: 100%; max-width: 600px;`;
    }
  }}
`;

export const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.v1.spacing.spacingXL};
  border-bottom: 1px solid ${({ theme }) => theme.v1.semanticColors.border.divider.light};
`;

export const ModalBody = styled.div`
  padding: ${({ theme }) => theme.v1.spacing.spacingXL};
`;

export const ModalFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.v1.spacing.spacingSM};
  padding: ${({ theme }) => theme.v1.spacing.spacingXL};
  border-top: 1px solid ${({ theme }) => theme.v1.semanticColors.border.divider.light};
`;

// =============================================================================
// ALERTS / NOTIFICATIONS
// =============================================================================

interface AlertProps {
  $variant?: 'info' | 'success' | 'warning' | 'error';
}

export const Alert = styled.div<AlertProps>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.v1.spacing.spacingMD};
  padding: ${({ theme }) => theme.v1.spacing.spacingLG};
  border-radius: ${({ theme }) => theme.v1.radius.radiusMD};
  border-left: 4px solid;

  ${({ $variant = 'info', theme }) => {
    switch ($variant) {
      case 'success':
        return css`
          background-color: ${theme.v1.semanticColors.fill.feedback.success.subtle};
          border-color: ${theme.v1.semanticColors.border.feedback.success};
          color: ${theme.v1.semanticColors.text.feedback.success.default};
        `;
      case 'warning':
        return css`
          background-color: ${theme.v1.semanticColors.fill.feedback.warning.subtle};
          border-color: ${theme.v1.semanticColors.border.feedback.warning};
          color: ${theme.v1.semanticColors.text.feedback.warning.default};
        `;
      case 'error':
        return css`
          background-color: ${theme.v1.semanticColors.fill.feedback.error.subtle};
          border-color: ${theme.v1.semanticColors.border.feedback.error};
          color: ${theme.v1.semanticColors.text.feedback.error.default};
        `;
      default:
        return css`
          background-color: ${theme.v1.semanticColors.fill.feedback.info.subtle};
          border-color: ${theme.v1.semanticColors.border.feedback.info};
          color: ${theme.v1.semanticColors.text.feedback.info.default};
        `;
    }
  }}
`;

// =============================================================================
// SPINNER
// =============================================================================

export const Spinner = styled.div<{ $size?: 'sm' | 'md' | 'lg' }>`
  border-radius: 50%;
  border: 3px solid ${({ theme }) => theme.v1.semanticColors.border.neutral.light};
  border-top-color: ${({ theme }) => theme.v1.semanticColors.fill.action.brand.default};
  animation: spin 1s linear infinite;

  ${({ $size = 'md' }) => {
    switch ($size) {
      case 'sm':
        return css`width: 16px; height: 16px; border-width: 2px;`;
      case 'lg':
        return css`width: 40px; height: 40px; border-width: 4px;`;
      default:
        return css`width: 24px; height: 24px;`;
    }
  }}

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

// =============================================================================
// TABLE
// =============================================================================

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

export const TableHeader = styled.thead`
  background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.light};
`;

export const TableRow = styled.tr`
  border-bottom: 1px solid ${({ theme }) => theme.v1.semanticColors.border.divider.light};

  &:hover {
    background-color: ${({ theme }) => theme.v1.semanticColors.canvas.highlight.extraLight};
  }
`;

export const TableHead = styled.th`
  padding: ${({ theme }) => theme.v1.spacing.spacingMD} ${({ theme }) => theme.v1.spacing.spacingLG};
  text-align: left;
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  font-weight: ${({ theme }) => theme.v1.typography.weights.semibold};
  color: ${({ theme }) => theme.v1.semanticColors.text.heading.bold};
`;

export const TableCell = styled.td`
  padding: ${({ theme }) => theme.v1.spacing.spacingMD} ${({ theme }) => theme.v1.spacing.spacingLG};
  font-size: ${({ theme }) => theme.v1.typography.sizes.bodyS};
  color: ${({ theme }) => theme.v1.semanticColors.text.body.default};
`;

// =============================================================================
// TOOLTIP
// =============================================================================

export const TooltipWrapper = styled.div`
  position: relative;
  display: inline-block;
`;

export const TooltipContent = styled.div`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: ${({ theme }) => theme.v1.spacing.spacingXS};
  padding: ${({ theme }) => theme.v1.spacing.spacingXS} ${({ theme }) => theme.v1.spacing.spacingSM};
  background-color: ${({ theme }) => theme.v1.semanticColors.fill.action.neutral.active};
  color: ${({ theme }) => theme.v1.semanticColors.text.inverse};
  font-size: ${({ theme }) => theme.v1.typography.sizes.helper};
  border-radius: ${({ theme }) => theme.v1.radius.radiusSM};
  white-space: nowrap;
  z-index: 100;
`;
