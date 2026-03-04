# Production Board | לוח הפקה

A local-first web app that replaces WhatsApp status updates with a structured, clickable board for production shoot days. Hebrew-first UI.

## Tech stack

- **Next.js** (App Router) + **React** + **TypeScript**
- **Tailwind CSS** for UI
- **Zustand** for state management
- **Dexie** (IndexedDB) for persistence — works offline and survives refresh

## Quick Start

**1) Terminal (one command)**  
From the project folder run:
```bash
npm run start:open
```
This installs dependencies if needed, starts the dev server, waits until the app is ready, and opens [http://localhost:3000](http://localhost:3000) in your default browser.

**2) Finder (double-click)**  
- Double-click **`Open App.command`** in the project root.  
- First time only: **right-click** → **Open** (to bypass the “unidentified developer” block).  
- If macOS blocks it: go to **System Settings** → **Privacy & Security** and click **Open Anyway** for the script, then run **Open App.command** again (or right-click → Open).

The script installs dependencies if `node_modules` is missing, starts the dev server, waits for the app to be ready, and opens the app in your browser. A Terminal window will stay open while the server runs; close it to stop the server.

---

## How to run (manual)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- **One-click from terminal:** `npm run open` — starts dev server, waits until http://localhost:3000 is reachable, then opens the default browser (uses `concurrently`, `wait-on`, and `open`).  
- **Install + one-click:** `npm run start:open` — runs `npm install` if `node_modules` is missing, then `npm run open`.
- **Build for production:** `npm run build` then `npm start`
- **Lint:** `npm run lint`

## Where data is stored

All data is stored **locally in your browser** using **IndexedDB** (via Dexie):

- **Database name:** `ProductionBoardDB`
- **Tables:** `projects`, `shootDays`, `scenes`, `items`, `backups`
- **Location:** Browser profile (e.g. Chrome: DevTools → Application → IndexedDB → ProductionBoardDB)

No data is sent to any server. The app works fully offline after the first load.

- **Images:** Stored as base64 inside the `items` table (field `detailsJson`). There is a 2MB-per-image size warning in the UI.

## Features

- **Home:** List of projects; “Create Project” to add one.
- **Project page:** List of shoot days; “Add Shoot Day” to add one.
- **Shoot Day page:** Shows **“סצנות היום”** ordered by shooting order, with a button “+ סצנה”. Clicking a scene opens a dedicated scene page.
- **Scene page:** For a specific scene: scene header (shoot order, script-scene number, name, status) and nested cards for **Locations, Talent, Schedule, Assets, Notes, Contacts**. Items are scoped to the scene, with “+ הוסף” per category and a status indicator (✅ OK, ❌ MISSING, ⛔ BLOCKED).
- **Item detail drawer:** Right-side panel with fields per section type. Changes are autosaved (debounced 400ms) with a “נשמר” indicator. You can attach images (base64, with size warning), view thumbnails, click to preview, and remove.
- **Export to WhatsApp:** Button “ייצוא סטטוס לוואטסאפ” builds a Hebrew plain-text summary per scene (in shoot order), grouped by categories and status, then copies it to the clipboard.
- **PDF export:** Buttons “ייצא דוח יום צילום” (shoot day) and “ייצא דוח פרויקט” (project) generate RTL Hebrew PDFs with selectable text. Export uses **server-side HTML → PDF** (Puppeteer + Chromium) via API routes; the client sends a JSON snapshot of the data (Dexie is client-only). Works in dev and on Vercel deployment. See **PDF export** below.
- **Backup (files):** “ייצוא גיבוי” downloads a JSON file; “ייבוא גיבוי” restores from a file.
- **Restore points (internal):** “שחזור אחורה” opens a list of the last 10 automatic/manual restore points stored in IndexedDB. You can create a snapshot now (“צור נקודת שחזור עכשיו”), restore to a point, or delete a point.

## PDF export

PDF reports are generated on the server so Hebrew RTL renders correctly with **selectable, copy-pasteable text** (no images or client-side bidi hacks). Flow:

1. User clicks “ייצא דוח יום צילום” or “ייצא דוח פרויקט”.
2. The client reads the current data from IndexedDB and **POSTs a JSON snapshot** to `/api/pdf/shoot-day` or `/api/pdf/project`.
3. The API route renders full HTML (RTL, `lang="he"`) using `lib/reports/renderShootDayHtml` or `renderProjectHtml`, then uses **Puppeteer (puppeteer-core) + @sparticuz/chromium** to turn the HTML into a PDF and streams it back.
4. The browser downloads the file.

**Requirements:** Fonts in `public/fonts/` (e.g. `Heebo-Regular.ttf`, `Heebo-Bold.ttf`) are loaded by the server-rendered HTML via absolute URL so the PDF uses correct Hebrew glyphs. See `public/fonts/README.md` for adding/updating fonts.

**Deployment:** This flow works in local dev and on Vercel (or any Node server). No change to DnD, users, or colors; only the PDF export path uses the API.

## How to verify (restore points)

- Create a scene and add items → wait 2–10 seconds → open “שחזור אחורה” and confirm a new restore point appears.
- Restore to a previous point → confirm the scene/items revert.
- Delete a project → confirm no orphan scenes/items; create a change and confirm a new backup is created.
- Confirm the list never shows more than 10 restore points.

## Seed content

On first load, if the database is empty, a sample project and one shoot day are created with example items (e.g. סצנה 1/2/3, לוקיישן “שדרות יהודית”, שחקנים, schedule, notes).

## Scenes hierarchy & migration

- The data model now has an explicit **`scenes`** table. Each scene belongs to a shoot day and has:
  - `shootOrderNumber` (1..N in shooting order), optional `scriptSceneNumber`, `name`, `status`, and `detailsJson` (scene-level details).
- Items (Locations, Talent, Schedule, Notes, Contacts, Assets) are linked to a scene via `sceneId`. Items without a scene are attached to a default “כללי” scene during migration.
- On first run after this update, a **one-time migration** runs:
  - Existing `SCENES` items are converted into real `scenes` records (preserving order by creation time, title, status, and sceneNumber from details).
  - Other items are attached to a default “סצנה כללית” / “כללי (לא משויך לסצנה)” per shoot day so no data is lost.

## Folder structure

- `app/` — App Router pages and layout
  - `page.tsx` — Home (projects list)
  - `project/[id]/page.tsx` — Project (shoot days list)
  - `shoot-day/[id]/page.tsx` — Shoot day (list of scenes + export button)
  - `shoot-day/[id]/scene/[sceneId]/page.tsx` — Scene page (nested categories)
  - `layout.tsx`, `globals.css`, `providers.tsx`
- `components/` — Reusable UI
  - `CreateProjectForm`, `AddShootDayForm`, `SectionPanel`, `ItemCard`, `ItemDetailDrawer`, `ImageField`, `BackupRestore`, `BackupHistory`
- `lib/` — Data and state
  - `db.ts` — Dexie schema and CRUD (projects, shootDays, scenes, items, backups)
  - `store.ts` — Zustand store (hydrates from Dexie, seed if empty, scenes support)
  - `item-details.ts` — Parse/serialize item details
  - `backup.ts` — Manual backup/export + import (files) and backup format
  - `migrations.ts` — Data migrations (e.g. scenes migration)
  - `whatsapp-export.ts` — Build Hebrew status summary
- `types/` — TypeScript types for Project, ShootDay, Scene, Item, SectionType, and item details
