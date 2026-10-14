// Lets phones add Ile to the home screen with its own icon and colours.
export default function manifest() {
  return {
    name: "Ile — property in Nigeria",
    short_name: "Ile",
    description: "Rent or buy homes, land and shops across Nigeria.",
    start_url: "/",
    display: "standalone",
    background_color: "#F6F1E7",
    theme_color: "#F6F1E7",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
