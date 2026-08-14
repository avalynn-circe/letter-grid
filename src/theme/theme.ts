export type ThemeName = "light" | "dark";

export interface Theme {
  bg: string;
  surface: string;
  tileBg: string;
  ink: string;
  inkSoft: string;
  accent: string;
  accentDeep: string;
  accentBright: string;
  accentSoft: string;
  onAccent: string;
  alert: string;
  rule: string;
  shadow: string;
  threadShadow: string;
}

// Ported 1:1 from the current web build's CSS custom properties (blue palette).
export const lightTheme: Theme = {
  bg: "#EEF3FC",
  surface: "#FFFFFF",
  tileBg: "#FFFFFF",
  ink: "#16233F",
  inkSoft: "#5A6E96",
  accent: "#4568D6",
  accentDeep: "#2C4AA0",
  accentBright: "#5A82E0",
  accentSoft: "#DCE6FB",
  onAccent: "#101B33",
  alert: "#C24B63",
  rule: "rgba(22,35,63,0.14)",
  shadow: "rgba(22,35,63,0.16)",
  threadShadow: "rgba(22,35,63,0.22)",
};

// Dark accents are deliberately pale and desaturated — saturated mid-blues
// read as glaring on OLED dark backgrounds.
export const darkTheme: Theme = {
  bg: "#0A1120",
  surface: "#123456",
  tileBg: "#1B4870",
  ink: "#EDF1FA",
  inkSoft: "#9FB3D6",
  accent: "#A9BAD8",
  accentDeep: "#C4CFE5",
  accentBright: "#9FB2D2",
  accentSoft: "#24447A",
  onAccent: "#0A1120",
  alert: "#E98CA0",
  rule: "rgba(237,241,250,0.14)",
  shadow: "rgba(0,0,0,0.45)",
  threadShadow: "rgba(0,0,0,0.45)",
};

export function getTheme(name: ThemeName): Theme {
  return name === "dark" ? darkTheme : lightTheme;
}
