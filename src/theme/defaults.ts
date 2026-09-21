import type { ThemeTokens } from "./css.js";

const INSTRUMENT_SANS_STACK =
  '"Instrument Sans", system-ui, sans-serif';
const SYSTEM_MONO_FONT =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

// Finalized Muffin v1 defaults — transcribed from DESIGN.md (colors §2,
// typography §3, spacing §4, layout §5, radius §10).
export const DEFAULT_THEME_TOKENS: ThemeTokens = {
  colors: {
    text: "#E6EDF3",
    muted: "#E6EDF380",
    background: "#1A1D23",
    link: "#6BEFA9",
    border: "#E6EDF34D",
    accent: "#6BEFA9",
    code: "#E6EDF3",
    codeBackground: "#E6EDF30F",
    codeBorder: "#E6EDF326",
  },
  typography: {
    body: INSTRUMENT_SANS_STACK,
    heading: INSTRUMENT_SANS_STACK,
    mono: SYSTEM_MONO_FONT,
    baseSize: "14px",
    lineHeight: "1.2",
    weight: "400",
    headingWeight: "700",
    sizes: {
      xs: "12px",
      sm: "14px",
      md: "16px",
      lg: "20px",
      xl: "22px",
      "2xl": "38px",
    },
  },
  spacing: {
    "1": "2px",
    "2": "5px",
    "3": "10px",
    "4": "20px",
    "5": "25px",
    "6": "27px",
    "7": "50px",
  },
  layout: {
    contentWidth: "630px",
    mainWidth: "700px",
    navWidth: "190px",
    asideWidth: "181px",
    sidebarInset: "159px",
  },
  radius: {
    sm: "0",
    md: "0",
  },
};