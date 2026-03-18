/**
 * Snapshot types sent from client to PDF API routes.
 * Matches DB/types shapes so we can serialize from Dexie and render on the server.
 */
import type { Project, ShootDay, Scene, Transition, ItemRecord } from "@/types";

export type SceneEntityType = "LOCATIONS" | "TALENT" | "CREW" | "CONTACTS" | "ASSETS";

export type SceneEntityStatus = "OK" | "MISSING" | "BLOCKED";

export type SceneEntityLinkSnapshot = {
  id: string;
  sceneId: string;
  projectEntity: {
    id: string;
    projectId: string;
    entityType: SceneEntityType;
    title: string;
    status: SceneEntityStatus;
    detailsJson: string;
  };
};

export type ProjectEntitySnapshot = SceneEntityLinkSnapshot["projectEntity"];

export interface ShootDayPdfSnapshot {
  project: Project;
  shootDay: ShootDay;
  scenes: Scene[];
  items: ItemRecord[];
  transitions: Transition[];
  sceneEntityLinks?: SceneEntityLinkSnapshot[];
}

export interface ProjectPdfSnapshot {
  project: Project;
  shootDays: ShootDay[];
  /** Optional project-wide entities (e.g. crew not linked to scenes) */
  projectEntities?: ProjectEntitySnapshot[];
  /** For each shoot day id: scenes (sorted by shootOrderNumber), items, transitions */
  dayData: Record<
    string,
    {
      scenes: Scene[];
      items: ItemRecord[];
      transitions: Transition[];
      sceneEntityLinks?: SceneEntityLinkSnapshot[];
    }
  >;
}
