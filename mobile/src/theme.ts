// Ile design tokens, copied from the website (src/app/globals.css).
export const colors = {
  cream: "#F6F1E7",
  surface: "#FFFDF8",
  line: "#E8E0D0",
  lineStrong: "#D9CFBC",
  ink: "#1B2640",
  inkMuted: "#5A6275",
  palm: "#1F7A2C",
  palmDark: "#15511D",
  palmSoft: "#E6F4E8",
  gold: "#C99A2E",
  goldSoft: "#F7EDD3",
  goldInk: "#7A5200",
  clay: "#B14A2E",
  claySoft: "#F6E4DE",
  white: "#FFFFFF",
  sale: "#1B2640",
  heroShade: "#0E1526",
} as const;

export const radius = { control: 10, card: 16, hero: 20 } as const;

export const fonts = {
  serif: "Fraunces_600SemiBold",
  sans: "Inter_400Regular",
  sansMedium: "Inter_500Medium",
  sansSemi: "Inter_600SemiBold",
  sansBold: "Inter_700Bold",
  serifMedium: "Fraunces_500Medium",
  serifItalic: "Fraunces_400Regular_Italic",
} as const;

// The website's two shadow depths (globals.css --shadow-card / --shadow-float).
export const shadows = {
  card: { shadowColor: "#1B2640", shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  float: { shadowColor: "#1B2640", shadowOpacity: 0.22, shadowRadius: 17, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
} as const;
