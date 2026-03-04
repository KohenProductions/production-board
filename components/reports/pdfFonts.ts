import { Font } from "@react-pdf/renderer";

let registered = false;

export function ensurePdfFontsRegistered() {
  if (registered) return;
  if (typeof window === "undefined") return;
  const base = window.location.origin;

  Font.register({
    family: "Heebo",
    fonts: [
      { src: `${base}/fonts/Heebo-Regular.ttf`, fontWeight: "normal" },
      { src: `${base}/fonts/Heebo-Bold.ttf`, fontWeight: "bold" },
    ],
  });

  registered = true;
}
