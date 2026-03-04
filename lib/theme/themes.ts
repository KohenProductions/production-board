import type { ThemeId } from "@/types";

export type ThemeTokens = {
  bg: string;
  surface: string;
  primary: string;
  accent: string;
  muted: string;
  text: string;
  border: string;
  successBg: string;
  successText: string;
  dangerBg: string;
  dangerText: string;
};

const STATUS = {
  successBg: "#D1FAE5",
  successText: "#065F46",
  dangerBg: "#FEE2E2",
  dangerText: "#991B1B",
} as const;

export type ThemeEntry = {
  id: ThemeId;
  name: string;
  tokens: ThemeTokens;
};

export const THEMES: Record<ThemeId, ThemeEntry> = {
  default: {
    id: "default",
    name: "ברירת מחדל",
    tokens: {
      bg: "#ffffff",
      surface: "#ffffff",
      primary: "#111827",
      accent: "#111827",
      muted: "#f3f4f6",
      text: "#1A1A1A",
      border: "#e5e7eb",
      ...STATUS,
    },
  },
  a: {
    id: "a",
    name: "רגועה",
    tokens: {
      bg: "#F6EFE5",
      surface: "#BED0D7",
      primary: "#D3681F",
      accent: "#7B1823",
      muted: "#BAD2DA",
      text: "#1A1A1A",
      border: "#D8B9A6",
      ...STATUS,
    },
  },
  b: {
    id: "b",
    name: "חם",
    tokens: {
      bg: "#E3C99B",
      surface: "#D89B69",
      primary: "#9D4122",
      accent: "#868043",
      muted: "#BE6937",
      text: "#1A1A1A",
      border: "#A15C33",
      ...STATUS,
    },
  },
  c: {
    id: "c",
    name: "אופטימי",
    tokens: {
      bg: "#B0CAB2",
      surface: "#95BDA9",
      primary: "#D24F26",
      accent: "#E7AB60",
      muted: "#9EC3B0",
      text: "#1A1A1A",
      border: "#886B54",
      ...STATUS,
    },
  },
  d: {
    id: "d",
    name: "נקי",
    tokens: {
      bg: "#F4F4F2",
      surface: "#ACC6C5",
      primary: "#E1BE5D",
      accent: "#7F9B8E",
      muted: "#D6D2C1",
      text: "#1A1A1A",
      border: "#C9A891",
      ...STATUS,
    },
  },
  e: {
    id: "e",
    name: "קייצי",
    tokens: {
      bg: "#EEDECB",
      surface: "#A6BBB2",
      primary: "#EFB608",
      accent: "#E3B15D",
      muted: "#F2DDB3",
      text: "#1A1A1A",
      border: "#BBA07E",
      ...STATUS,
    },
  },
  f: {
    id: "f",
    name: "שובב",
    tokens: {
      bg: "#FAF4EE",
      surface: "#F8D2D1",
      primary: "#414D9D",
      accent: "#F55A3C",
      muted: "#8EC0AB",
      text: "#1A1A1A",
      border: "#FDD171",
      ...STATUS,
    },
  },
  g: {
    id: "g",
    name: "עשן-תבלינים",
    tokens: {
      bg: "#D1C5AD",
      surface: "#909B9B",
      primary: "#6C3318",
      accent: "#C29953",
      muted: "#9A682E",
      text: "#1A1A1A",
      border: "#402918",
      ...STATUS,
    },
  },
  h: {
    id: "h",
    name: "קפה-טורקיז",
    tokens: {
      bg: "#EDD6B7",
      surface: "#947439",
      primary: "#184B67",
      accent: "#5596A8",
      muted: "#BD431D",
      text: "#1A1A1A",
      border: "#461613",
      ...STATUS,
    },
  },
  i: {
    id: "i",
    name: "רטרו-סודה",
    tokens: {
      bg: "#D4D5D4",
      surface: "#858DB8",
      primary: "#DC8A30",
      accent: "#305F58",
      muted: "#282726",
      text: "#1A1A1A",
      border: "#201E1B",
      ...STATUS,
    },
  },
  j: {
    id: "j",
    name: "ניאון-חול",
    tokens: {
      bg: "#CEC3B6",
      surface: "#8C8C8B",
      primary: "#EE670D",
      accent: "#035D67",
      muted: "#5E5651",
      text: "#1A1A1A",
      border: "#22211F",
      ...STATUS,
    },
  },
  k: {
    id: "k",
    name: "מסטיק-שקיעה",
    tokens: {
      bg: "#F4E0C2",
      surface: "#F4CED9",
      primary: "#F16C2D",
      accent: "#EF6980",
      muted: "#50565C",
      text: "#1A1A1A",
      border: "#893E14",
      ...STATUS,
    },
  },
  l: {
    id: "l",
    name: "יער-חוף",
    tokens: {
      bg: "#F9FADE",
      surface: "#97C1D2",
      primary: "#334518",
      accent: "#E45738",
      muted: "#666839",
      text: "#1A1A1A",
      border: "#19230B",
      ...STATUS,
    },
  },
  m: {
    id: "m",
    name: "דינר-לילה",
    tokens: {
      bg: "#F3E2C8",
      surface: "#DBC7A6",
      primary: "#F15428",
      accent: "#70675C",
      muted: "#171515",
      text: "#1A1A1A",
      border: "#110F0E",
      ...STATUS,
    },
  },
  n: {
    id: "n",
    name: "פופ-שוק",
    tokens: {
      bg: "#C1DEDE",
      surface: "#F4E49A",
      primary: "#B22970",
      accent: "#FC5888",
      muted: "#CBCC10",
      text: "#1A1A1A",
      border: "#E23E0D",
      ...STATUS,
    },
  },
};

export const THEME_ORDER: ThemeId[] = ["default", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n"];
