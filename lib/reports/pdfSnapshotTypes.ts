/**
 * Snapshot types sent from client to PDF API routes.
 * Matches DB/types shapes so we can serialize from Dexie and render on the server.
 */
import type { Project, ShootDay, Scene, Transition, ItemRecord } from "@/types";

export interface ShootDayPdfSnapshot {
  project: Project;
  shootDay: ShootDay;
  scenes: Scene[];
  items: ItemRecord[];
  transitions: Transition[];
}

export interface ProjectPdfSnapshot {
  project: Project;
  shootDays: ShootDay[];
  /** For each shoot day id: scenes (sorted by shootOrderNumber), items, transitions */
  dayData: Record<
    string,
    {
      scenes: Scene[];
      items: ItemRecord[];
      transitions: Transition[];
    }
  >;
}
