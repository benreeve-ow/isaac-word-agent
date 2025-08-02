import { createLightTheme, createDarkTheme, Theme, BrandVariants } from "@fluentui/react-components";

// Create brand color ramp for minimal theme
const minimalBrandRamp: BrandVariants = {
  10: "#020202",
  20: "#111111",
  30: "#1a1a1a",
  40: "#242424",
  50: "#2d2d2d",
  60: "#373737",
  70: "#414141",
  80: "#4a4a4a",
  90: "#545454",
  100: "#5e5e5e",
  110: "#686868",
  120: "#717171",
  130: "#7b7b7b",
  140: "#858585",
  150: "#8e8e8e",
  160: "#989898",
};

export const minimalLightTheme: Theme = createLightTheme(minimalBrandRamp);
export const minimalDarkTheme: Theme = createDarkTheme(minimalBrandRamp);

// Override specific tokens for more control
minimalLightTheme.colorNeutralBackground1 = "#ffffff";
minimalLightTheme.colorNeutralBackground2 = "#fafafa";
minimalLightTheme.colorNeutralBackground3 = "#f5f5f5";
minimalLightTheme.colorNeutralForeground1 = "#1a1a1a";
minimalLightTheme.colorNeutralForeground2 = "#2d2d2d";
minimalLightTheme.colorNeutralForeground3 = "#616161";
minimalLightTheme.colorNeutralStroke1 = "#e5e5e5";
minimalLightTheme.colorNeutralStroke2 = "#d0d0d0";
minimalLightTheme.fontSizeBase100 = "11px";
minimalLightTheme.fontSizeBase200 = "12px";
minimalLightTheme.fontSizeBase300 = "13px";
minimalLightTheme.fontSizeBase400 = "14px";
minimalLightTheme.borderRadiusSmall = "2px";
minimalLightTheme.borderRadiusMedium = "4px";
minimalLightTheme.borderRadiusLarge = "6px";