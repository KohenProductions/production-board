"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ItemRecord,
  ItemWithDetails,
  LocationsDetails,
  ScenesDetails,
  TalentDetails,
  ScheduleDetails,
  ContactsDetails,
  NotesDetails,
  AssetsDetails,
} from "@/types";
import { SectionType } from "@/types";
import { useStore } from "@/lib/store";
import { ItemImagesField } from "@/components/ItemImagesField";

const DEBOUNCE_MS = 400;

interface ItemDetailDrawerProps {
  itemId: string | null;
  onClose: () => void;
}

export function ItemDetailDrawer({ itemId, onClose }: ItemDetailDrawerProps) {
  const getItemWithDetails = useStore((s) => s.getItemWithDetails);
  const updateItem = useStore((s) => s.updateItem);
  const deleteItem = useStore((s) => s.deleteItem);
  const [item, setItem] = useState<ItemWithDetails | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!itemId) {
      setItem(null);
      return;
    }
    getItemWithDetails(itemId).then((v) => setItem(v ?? null));
  }, [itemId, getItemWithDetails]);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ patch: Partial<ItemRecord>; details?: ItemWithDetails["details"] } | null>(null);

  const flushSave = useCallback(() => {
    if (!itemId || !pendingRef.current) return;
    const { patch, details } = pendingRef.current;
    pendingRef.current = null;
    updateItem(itemId, patch, details);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [itemId, updateItem]);

  const debouncedPersist = useCallback(
    (patch: Partial<ItemRecord>, details?: ItemWithDetails["details"]) => {
      if (!itemId) return;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      const prev = pendingRef.current;
      pendingRef.current = {
        patch: { ...prev?.patch, ...patch },
        details: details !== undefined ? details : prev?.details,
      };
      saveTimeoutRef.current = setTimeout(flushSave, DEBOUNCE_MS);
    },
    [itemId, flushSave]
  );

  useEffect(() => () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
  }, []);

  if (!itemId) return null;

  const handleDelete = () => {
    if (confirm("למחוק פריט זה?")) {
      deleteItem(itemId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-y-0 left-0 w-full max-w-lg bg-white dark:bg-gray-800 shadow-xl z-40 flex flex-col border-l border-gray-200 dark:border-gray-700">
      <header className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">
          סגור
        </button>
        {saved && <span className="text-green-600 text-sm">נשמר</span>}
        <button type="button" onClick={handleDelete} className="text-red-500 text-sm hover:underline">
          מחק
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-4">
        {!item ? (
          <p className="text-gray-500">טוען...</p>
        ) : (
          <ItemDetailForm item={item} setItem={setItem} onDebouncedSave={debouncedPersist} />
        )}
      </div>
    </div>
  );
}

interface ItemDetailFormProps {
  item: ItemWithDetails;
  setItem: React.Dispatch<React.SetStateAction<ItemWithDetails | null>>;
  onDebouncedSave: (patch: Partial<ItemRecord>, details?: ItemWithDetails["details"]) => void;
}

function ItemDetailForm({ item, setItem, onDebouncedSave }: ItemDetailFormProps) {
  const updateLocal = useCallback(
    (patch: Partial<ItemRecord>) => {
      setItem((prev) => (prev ? { ...prev, ...patch } : null));
    },
    [setItem]
  );
  const updateDetails = useCallback(
    (details: ItemWithDetails["details"]) => {
      setItem((prev) => (prev ? { ...prev, details } : null));
      onDebouncedSave({}, details);
    },
    [setItem, onDebouncedSave]
  );

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-sm text-gray-600">כותרת</span>
        <input
          type="text"
          value={item.title}
          onChange={(e) => {
            updateLocal({ title: e.target.value });
            const v = e.target.value;
            setTimeout(() => onDebouncedSave({ title: v }), DEBOUNCE_MS);
          }}
          className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">סטטוס</span>
        <select
          value={item.status}
          onChange={(e) => {
            const status = e.target.value as ItemRecord["status"];
            updateLocal({ status });
            onDebouncedSave({ status });
          }}
          className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
        >
          <option value="OK">✅ OK</option>
          <option value="MISSING">❌ חסר</option>
          <option value="BLOCKED">⛔ חסום</option>
        </select>
      </label>
      <hr />
      {item.sectionType === SectionType.LOCATIONS && (
        <>
          <LocationsFields details={item.details as LocationsDetails} onChange={updateDetails} />
          <ItemImagesField itemId={item.id} />
        </>
      )}
      {item.sectionType === SectionType.SCENES && (
        <ScenesFields details={item.details as ScenesDetails} onChange={updateDetails} />
      )}
      {item.sectionType === SectionType.TALENT && (
        <>
          <TalentFields details={item.details as TalentDetails} onChange={updateDetails} />
          <ItemImagesField itemId={item.id} />
        </>
      )}
      {item.sectionType === SectionType.SCHEDULE && (
        <ScheduleFields details={item.details as ScheduleDetails} onChange={updateDetails} />
      )}
      {item.sectionType === SectionType.CONTACTS && (
        <ContactsFields details={item.details as ContactsDetails} onChange={updateDetails} />
      )}
      {item.sectionType === SectionType.NOTES && (
        <NotesFields details={item.details as NotesDetails} onChange={updateDetails} />
      )}
      {item.sectionType === SectionType.ASSETS && (
        <AssetsFields details={item.details as AssetsDetails} onChange={updateDetails} />
      )}
    </div>
  );
}

function LocationsFields({
  details,
  onChange,
}: {
  details: LocationsDetails;
  onChange: (d: LocationsDetails) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-sm text-gray-600">כתובת</span>
        <input
          type="text"
          value={details.addressText}
          onChange={(e) => onChange({ ...details, addressText: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">קישור גוגל מפות</span>
        <input
          type="url"
          value={details.googleMapsUrl}
          onChange={(e) => onChange({ ...details, googleMapsUrl: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">הערות חניה</span>
        <textarea
          value={details.parkingNotes}
          onChange={(e) => onChange({ ...details, parkingNotes: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2"
          rows={2}
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">שם איש קשר</span>
        <input
          type="text"
          value={details.contactName ?? ""}
          onChange={(e) => onChange({ ...details, contactName: e.target.value || undefined })}
          className="mt-1 w-full border rounded px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">טלפון איש קשר</span>
        <input
          type="tel"
          value={details.contactPhone ?? ""}
          onChange={(e) => onChange({ ...details, contactPhone: e.target.value || undefined })}
          className="mt-1 w-full border rounded px-3 py-2"
        />
      </label>
    </div>
  );
}

function ScenesFields({
  details,
  onChange,
}: {
  details: ScenesDetails;
  onChange: (d: ScenesDetails) => void;
}) {
  const addReq = () => onChange({ ...details, requirements: [...details.requirements, ""] });
  const setReq = (i: number, v: string) => {
    const r = [...details.requirements];
    r[i] = v;
    onChange({ ...details, requirements: r });
  };
  const removeReq = (i: number) => {
    onChange({ ...details, requirements: details.requirements.filter((_, j) => j !== i) });
  };
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-sm text-gray-600">מס׳ סצנה</span>
        <input
          type="text"
          value={details.sceneNumber ?? ""}
          onChange={(e) => onChange({ ...details, sceneNumber: e.target.value || undefined })}
          className="mt-1 w-full border rounded px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">תיאור</span>
        <textarea
          value={details.description}
          onChange={(e) => onChange({ ...details, description: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2"
          rows={3}
        />
      </label>
      <div>
        <span className="text-sm text-gray-600 block mb-1">דרישות</span>
        {details.requirements.map((r, i) => (
          <div key={i} className="flex gap-1 mb-1">
            <input
              type="text"
              value={r}
              onChange={(e) => setReq(i, e.target.value)}
              className="flex-1 border rounded px-3 py-2"
            />
            <button type="button" onClick={() => removeReq(i)} className="text-red-500 px-2">
              ×
            </button>
          </div>
        ))}
        <button type="button" onClick={addReq} className="text-sm text-blue-600">
          + הוסף דרישה
        </button>
      </div>
    </div>
  );
}

function TalentFields({
  details,
  onChange,
}: {
  details: TalentDetails;
  onChange: (d: TalentDetails) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-sm text-gray-600">שם מלא</span>
        <input
          type="text"
          value={details.fullName}
          onChange={(e) => onChange({ ...details, fullName: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">תפקיד</span>
        <input
          type="text"
          value={details.role}
          onChange={(e) => onChange({ ...details, role: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">טלפון</span>
        <input
          type="tel"
          value={details.phone}
          onChange={(e) => onChange({ ...details, phone: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">אימייל</span>
        <input
          type="email"
          value={details.email}
          onChange={(e) => onChange({ ...details, email: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">הערות תלבושות</span>
        <textarea
          value={details.wardrobeNotes}
          onChange={(e) => onChange({ ...details, wardrobeNotes: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2"
          rows={2}
        />
      </label>
    </div>
  );
}

function ScheduleFields({
  details,
  onChange,
}: {
  details: ScheduleDetails;
  onChange: (d: ScheduleDetails) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-sm text-gray-600">שעת התחלה</span>
        <input
          type="time"
          value={details.startTime}
          onChange={(e) => onChange({ ...details, startTime: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">שעת סיום</span>
        <input
          type="time"
          value={details.endTime}
          onChange={(e) => onChange({ ...details, endTime: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">תיאור</span>
        <input
          type="text"
          value={details.description}
          onChange={(e) => onChange({ ...details, description: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">הערות</span>
        <textarea
          value={details.notes}
          onChange={(e) => onChange({ ...details, notes: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2"
          rows={2}
        />
      </label>
    </div>
  );
}

function ContactsFields({
  details,
  onChange,
}: {
  details: ContactsDetails;
  onChange: (d: ContactsDetails) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-sm text-gray-600">שם</span>
        <input
          type="text"
          value={details.name}
          onChange={(e) => onChange({ ...details, name: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">תפקיד</span>
        <input
          type="text"
          value={details.role}
          onChange={(e) => onChange({ ...details, role: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">טלפון</span>
        <input
          type="tel"
          value={details.phone}
          onChange={(e) => onChange({ ...details, phone: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">אימייל</span>
        <input
          type="email"
          value={details.email}
          onChange={(e) => onChange({ ...details, email: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">חברה</span>
        <input
          type="text"
          value={details.company}
          onChange={(e) => onChange({ ...details, company: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">הערות</span>
        <textarea
          value={details.notes}
          onChange={(e) => onChange({ ...details, notes: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2"
          rows={2}
        />
      </label>
    </div>
  );
}

function NotesFields({
  details,
  onChange,
}: {
  details: NotesDetails;
  onChange: (d: NotesDetails) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm text-gray-600">תוכן</span>
      <textarea
        value={details.richText}
        onChange={(e) => onChange({ ...details, richText: e.target.value })}
        className="mt-1 w-full border rounded px-3 py-2 min-h-[120px]"
        rows={6}
      />
    </label>
  );
}

function AssetsFields({
  details,
  onChange,
}: {
  details: AssetsDetails;
  onChange: (d: AssetsDetails) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-sm text-gray-600">שם קובץ</span>
        <input
          type="text"
          value={details.fileName}
          onChange={(e) => onChange({ ...details, fileName: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">סוג קובץ</span>
        <input
          type="text"
          value={details.fileType}
          onChange={(e) => onChange({ ...details, fileType: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">קישור / ref מקומי</span>
        <input
          type="text"
          value={details.urlOrLocalRef}
          onChange={(e) => onChange({ ...details, urlOrLocalRef: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">הערות</span>
        <textarea
          value={details.notes}
          onChange={(e) => onChange({ ...details, notes: e.target.value })}
          className="mt-1 w-full border rounded px-3 py-2"
          rows={2}
        />
      </label>
    </div>
  );
}
