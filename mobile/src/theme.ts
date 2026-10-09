// Ile design tokens, copied from the website (src/app/globals.css).
export const colors = {
  cream: "#F6F1E7",
  surface: "#FFFDF8",
  line: "#E8E0D0",
  lineStrong: "#D9CFBC",
  ink: "#1E1B16",
  inkMuted: "#6B6357",
  palm: "#14583B",
  palmDark: "#0F4530",
  palmSoft: "#E7F0EA",
  gold: "#C99A2E",
  goldSoft: "#F7EDD3",
  goldInk: "#7A5200",
  clay: "#B14A2E",
  claySoft: "#F6E4DE",
  white: "#FFFFFF",
} as const;

export const radius = { control: 10, card: 16, hero: 20 } as const;

export const fonts = {
  serif: "Fraunces_600SemiBold",
  sans: "Inter_400Regular",
  sansMedium: "Inter_500Medium",
  sansSemi: "Inter_600SemiBold",
  sansBold: "Inter_700Bold",
} as const;
