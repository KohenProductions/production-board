export type ItemStatus = "OK" | "MISSING" | "BLOCKED";

/** Pastel color tag for cards (Projects, Shoot Days, Scenes). */
export type ColorTag =
  | "pastelRed"
  | "pastelYellow"
  | "pastelOrange"
  | "pastelSky"
  | "pastelBlue"
  | "pastelGreen"
  | "pastelLightGreen";

export const COLOR_TAG_HEX: Record<ColorTag, string> = {
  pastelRed: "#F8C7C3",
  pastelYellow: "#F9E7A8",
  pastelOrange: "#FAD0A5",
  pastelSky: "#BFE6F5",
  pastelBlue: "#BFD3FF",
  pastelGreen: "#CDEFCB",
  pastelLightGreen: "#E2F7C6",
};

export type ThemeId = "default" | "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m" | "n";

export interface User {
  id: string;
  displayName: string;
  themeId?: ThemeId;
}

export enum SectionType {
  LOCATIONS = "LOCATIONS",
  SCENES = "SCENES",
  TALENT = "TALENT",
  SCHEDULE = "SCHEDULE",
  CONTACTS = "CONTACTS",
  NOTES = "NOTES",
  ASSETS = "ASSETS",
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  createdAt: string;
  updatedAt: string;
  /** Manual ordering index within projects list (1..N) */
  projectOrderIndex?: number;
  /** Owner user id (local multi-user) */
  ownerUserId?: string;
  /** Pastel color tag for card */
  colorTag?: ColorTag | null;
}

export interface ShootDay {
  id: string;
  projectId: string;
  title: string;
  date: string;
  generalNotes: string;
  /** Manual ordering index within project (1..N) */
  shootOrderIndex?: number;
  /** Owner user id (local multi-user) */
  ownerUserId?: string;
  /** Pastel color tag for card */
  colorTag?: ColorTag | null;
}

export interface Item {
  id: string;
  shootDayId: string;
  sceneId?: string;
  sectionType: SectionType;
  title: string;
  status: ItemStatus;
  tags: string[];
  updatedAt: string;
  createdAt: string;
}

export interface Scene {
  id: string;
  shootDayId: string;
  shootOrderNumber: number;
  scriptSceneNumber?: string;
  name: string;
  status: ItemStatus;
  /** Canonical scene description */
  description?: string;
  /** Optional scheduling: "HH:MM" */
  startTime?: string;
  /** Optional scheduling: "HH:MM" */
  endTime?: string;
  createdAt: string;
  updatedAt: string;
  detailsJson: string;
  /** Owner user id (local multi-user) */
  ownerUserId?: string;
  /** Pastel color tag for card */
  colorTag?: ColorTag | null;
}

/** Travel/transition block between scenes (after afterSceneId). */
export interface Transition {
  id: string;
  shootDayId: string;
  afterSceneId: string;
  startTime?: string;
  endTime?: string;
  title: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Item details discriminated union
export interface LocationsDetails {
  addressText: string;
  googleMapsUrl: string;
  lat?: number;
  lng?: number;
  parkingNotes: string;
  contactName?: string;
  contactPhone?: string;
  referenceImages: string[]; // base64
}

export interface ScenesDetails {
  sceneNumber?: string;
  description: string;
  requirements: string[];
  relatedLocationItemId?: string;
  relatedTalentItemIds: string[];
}

export interface TalentDetails {
  fullName: string;
  role: string;
  phone: string;
  email: string;
  wardrobeNotes: string;
  referenceImages: string[];
}

export interface ScheduleDetails {
  startTime: string;
  endTime: string;
  description: string;
  locationItemId?: string;
  notes: string;
}

export interface ContactsDetails {
  name: string;
  role: string;
  phone: string;
  email: string;
  company: string;
  notes: string;
}

export interface NotesDetails {
  richText: string;
}

export interface AssetsDetails {
  fileName: string;
  fileType: string;
  urlOrLocalRef: string;
  notes: string;
}

export type ItemDetails =
  | { sectionType: SectionType.LOCATIONS; details: LocationsDetails }
  | { sectionType: SectionType.SCENES; details: ScenesDetails }
  | { sectionType: SectionType.TALENT; details: TalentDetails }
  | { sectionType: SectionType.SCHEDULE; details: ScheduleDetails }
  | { sectionType: SectionType.CONTACTS; details: ContactsDetails }
  | { sectionType: SectionType.NOTES; details: NotesDetails }
  | { sectionType: SectionType.ASSETS; details: AssetsDetails };

export interface ItemWithDetails extends Item {
  details: ItemDetails["details"];
}

// Stored in DB: item + serialized details
export interface ItemRecord {
  id: string;
  shootDayId: string;
  sceneId?: string;
  sectionType: SectionType;
  title: string;
  status: ItemStatus;
  tags: string[];
  updatedAt: string;
  createdAt: string;
  detailsJson: string;
}

export type ItemImage = {
  id: string;
  itemId: string;
  blob: Blob;
  thumbBlob: Blob;
  width?: number;
  height?: number;
  sizeBytes?: number;
  mime?: string;
  createdAt: number;
};

export const SECTION_LABELS: Record<SectionType, string> = {
  [SectionType.LOCATIONS]: "לוקיישנים",
  [SectionType.SCENES]: "סצנות",
  [SectionType.TALENT]: "שחקנים/טלנט",
  [SectionType.SCHEDULE]: "לוח זמנים",
  [SectionType.CONTACTS]: "אנשי קשר",
  [SectionType.NOTES]: "הערות",
  [SectionType.ASSETS]: "נכסים",
};

export const DEFAULT_DETAILS: Record<SectionType, ItemDetails["details"]> = {
  [SectionType.LOCATIONS]: {
    addressText: "",
    googleMapsUrl: "",
    parkingNotes: "",
    referenceImages: [],
  },
  [SectionType.SCENES]: {
    description: "",
    requirements: [],
    relatedTalentItemIds: [],
  },
  [SectionType.TALENT]: {
    fullName: "",
    role: "",
    phone: "",
    email: "",
    wardrobeNotes: "",
    referenceImages: [],
  },
  [SectionType.SCHEDULE]: {
    startTime: "",
    endTime: "",
    description: "",
    notes: "",
  },
  [SectionType.CONTACTS]: {
    name: "",
    role: "",
    phone: "",
    email: "",
    company: "",
    notes: "",
  },
  [SectionType.NOTES]: {
    richText: "",
  },
  [SectionType.ASSETS]: {
    fileName: "",
    fileType: "",
    urlOrLocalRef: "",
    notes: "",
  },
} as Record<SectionType, ItemDetails["details"]>;
