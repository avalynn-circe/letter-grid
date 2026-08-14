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

export const lightTheme: Theme = {
  bg: "#EAF6F5",
  surface: "#FFFFFF",
  tileBg: "#FFFFFF",
  ink: "#123B39",
  inkSoft: "#5C8B87",
  accent: "#1C7C74",
  accentDeep: "#0F5750",
  accentBright: "#2FBFB0",
  accentSoft: "#B7EAE3",
  onAccent: "#0B2624",
  alert: "#C24B63",
  rule: "rgba(18,59,57,0.14)",
  shadow: "rgba(18,59,57,0.16)",
  threadShadow: "rgba(18,59,57,0.22)",
};

// Deliberately desaturated/dusty rather than vivid — a neon teal against
// a near-black background reads as glaring, not "dark mode".
export const darkTheme: Theme = {
  bg: "#0B211F",
  surface: "#12302E",
  tileBg: "#163C38",
  ink: "#E7F6F3",
  inkSoft: "#8FC2BC",
  accent: "#92D0C9",
  accentDeep: "#A9E2DB",
  accentBright: "#45857E",
  accentSoft: "#234E49",
  onAccent: "#06201E",
  alert: "#E98CA0",
  rule: "rgba(231,246,243,0.14)",
  shadow: "rgba(0,0,0,0.4)",
  threadShadow: "rgba(0,0,0,0.4)",
};

export function getTheme(name: ThemeName): Theme {
  return name === "dark" ? darkTheme : lightTheme;
}
