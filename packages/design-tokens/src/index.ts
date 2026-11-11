export const tokens = {
  colors: {
    primary: "#176b50",
    primaryHover: "#125640",
    primaryDark: "#104b39",
    primaryLight: "#218363",
    accentGold: "#c6a66b",
    accentGoldLight: "#f5ebdd",
    secondary: "#68766f",
    background: "#f7f9f8",
    surface: "#ffffff",
    surfaceSubtle: "#f0f4f1",
    textPrimary: "#17251f",
    textSecondary: "#495750",
    textMuted: "#68766f",
    border: "#e3eae6",
    danger: "#d14343",
    success: "#168653",
    warning: "#b7791f",
    info: "#2875b9",
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    "2xl": "48px",
  },
  typography: {
    fontFamilySans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontSizeBase: "16px",
  },
  radii: {
    sm: "4px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    "2xl": "24px",
    full: "9999px",
  },
} as const;

export type DesignTokens = typeof tokens;
