import type { ThemeTokens } from "./css.js";

const SYSTEM_BODY_FONT =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const SYSTEM_MONO_FONT =
  'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

export const DEFAULT_THEME_TOKENS: ThemeTokens = {
  colors: {
    text: "#1a1a1a",
    muted: "#666666",
    background: "#ffffff",
    link: "#1a0dab",
    border: "#e5e7eb",
    accent: "#1a0dab",
    code: "#24292e",
    codeBackground: "#f5f5f5",
    codeBorder: "#d0d7de",
  },
  typography: {
    body: SYSTEM_BODY_FONT,
    heading: SYSTEM_BODY_FONT,
    mono: SYSTEM_MONO_FONT,
    baseSize: "16px",
    lineHeight: "1.5",
    weight: "400",
    headingWeight: "700",
    sizes: {
      xs: "12px",
      sm: "14px",
      md: "15px",
      lg: "16px",
      xl: "18px",
      "2xl": "32px",
    },
  },
  spacing: {
    "1": "2px",
    "2": "4px",
    "3": "6px",
    "4": "8px",
    "5": "12px",
    "6": "14px",
    "7": "16px",
    "8": "24px",
    "9": "32px",
    "10": "40px",
    "11": "48px",
  },
  layout: {
    contentWidth: "800px",
    mainWidth: "900px",
    navWidth: "400px",
    asideWidth: "400px",
    sidebarInset: "200px",
  },
  radius: {
    sm: "2px",
    md: "4px",
  },
};