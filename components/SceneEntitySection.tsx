"use client";

import { useEffect, useMemo, useState } from "react";

type EntityType = "LOCATIONS" | "TALENT" | "CREW" | "CONTACTS" | "ASSETS";
type EntityStatus = "OK" | "MISSING" | "BLOCKED";

type ApiProjectEntity = {
  id: string;
  projectId: string;
  entityType: EntityType;
  title: string;
  status: EntityStatus;
  detailsJson: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

type ApiSceneEntityLink = {
  id: string;
  sceneId: string;
  projectEntityId: string;
  createdAt: string;
  projectEntity: ApiProjectEntity;
};

type BasicEntityDetails = {
  role?: string;
  phone?: string;
  email?: string;
  notes?: string;
};

type LocationEntityDetails = {
  address?: string;
  contactName?: string;
  parking?: "yes" | "no" | "";
  notes?: string;
};

type ParsedDetails = {
  role: string;
  phone: string;
  email: string;
  notes: string;
  address: string;
  contactName: string;
  parking: "yes" | "no" | "";
};

interface Props {
  sceneId: string;
  projectId: string;
  entityType: EntityType;
  title: string;
}

type EditorState = {
  mode: "create" | "edit";
  entityId: string | null;
  title: string;
  status: EntityStatus;

  role: string;
  phone: string;
  email: string;

  address: string;
  contactName: string;
  parking: "yes" | "no" | "";

  notes: string;
};

function statusLabel(status: EntityStatus) {
  if (status === "MISSING") return "חסר";
  if (status === "BLOCKED") return "חסום";
  return "תקין";
}

function statusClasses(status: EntityStatus) {
  if (status === "MISSING") {
    return "bg-amber-100 text-amber-800 border border-amber-200";
  }

  if (status === "BLOCKED") {
    return "bg-red-100 text-red-700 border border-red-200";
  }

  return "bg-green-100 text-green-700 border border-green-200";
}

function cardStatusClasses(status: EntityStatus) {
  if (status === "MISSING") {
    return "border-amber-300 bg-amber-50/40";
  }

  if (status === "BLOCKED") {
    return "border-red-300 bg-red-50/40";
  }

  return "border-green-300 bg-green-50/40";
}

function parseDetails(detailsJson: string, entityType: EntityType): ParsedDetails {
  try {
    const parsed = JSON.parse(detailsJson || "{}") as BasicEntityDetails & LocationEntityDetails;

    if (entityType === "LOCATIONS") {
      return {
        role: "",
        phone: "",
        email: "",
        address: typeof parsed.address === "string" ? parsed.address : "",
        contactName: typeof parsed.contactName === "string" ? parsed.contactName : "",
        parking: parsed.parking === "yes" || parsed.parking === "no" ? parsed.parking : "",
        notes: typeof parsed.notes === "string" ? parsed.notes : "",
      };
    }

    return {
      role: typeof parsed.role === "string" ? parsed.role : "",
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      email: typeof parsed.email === "string" ? parsed.email : "",
      notes: typeof parsed.notes === "string" ? parsed.notes : "",
      address: "",
      contactName: "",
      parking: "",
    };
  } catch {
    return {
      role: "",
      phone: "",
      email: "",
      notes: "",
      address: "",
      contactName: "",
      parking: "",
    };
  }
}

function buildEmptyEditorState(): EditorState {
  return {
    mode: "create",
    entityId: null,
    title: "",
    status: "OK",
    role: "",
    phone: "",
    email: "",
    address: "",
    contactName: "",
    parking: "",
    notes: "",
  };
}

function buildEditorStateFromEntity(entity: ApiProjectEntity): EditorState {
  const details = parseDetails(entity.detailsJson, entity.entityType);

  return {
    mode: "edit",
    entityId: entity.id,
    title: entity.title ?? "",
    status: entity.status ?? "OK",
    role: details.role,
    phone: details.phone,
    email: details.email,
    address: details.address,
    contactName: details.contactName,
    parking: details.parking,
    notes: details.notes,
  };
}

function fieldLabel(entityType: EntityType) {
  if (entityType === "TALENT") return "שם שחקן";
  if (entityType === "CREW") return "שם איש צוות";
  if (entityType === "CONTACTS") return "שם איש קשר";
  if (entityType === "LOCATIONS") return "שם לוקיישן";
  return "שם פריט";
}

function roleLabel(entityType: EntityType) {
  if (entityType === "TALENT") return "תפקיד";
  if (entityType === "CREW") return "תפקיד בהפקה";
  if (entityType === "CONTACTS") return "תפקיד";
  return "תיאור";
}

function parkingLabel(value: "yes" | "no" | "") {
  if (value === "yes") return "יש חניה";
  if (value === "no") return "אין חניה";
  return "";
}

export function SceneEntitySection({
  sceneId,
  projectId,
  entityType,
  title,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [attaching, setAttaching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removingLinkId, setRemovingLinkId] = useState<string | null>(null);
  const [links, setLinks] = useState<ApiSceneEntityLink[]>([]);
  const [projectEntities, setProjectEntities] = useState<ApiProjectEntity[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const [linksRes, entitiesRes] = await Promise.all([
        fetch(`/api/scenes/${sceneId}/entities?entityType=${entityType}`, {
          cache: "no-store",
          credentials: "include",
        }),
        fetch(`/api/projects/${projectId}/entities?entityType=${entityType}`, {
          cache: "no-store",
          credentials: "include",
        }),
      ]);

      if (!linksRes.ok) {
        const j = await linksRes.json().catch(() => null);
        throw new Error(j?.error || `Failed to load scene entities (${linksRes.status})`);
      }

      if (!entitiesRes.ok) {
        const j = await entitiesRes.json().catch(() => null);
        throw new Error(j?.error || `Failed to load project entities (${entitiesRes.status})`);
      }

      const linksJson = (await linksRes.json()) as { links: ApiSceneEntityLink[] };
      const entitiesJson = (await entitiesRes.json()) as { entities: ApiProjectEntity[] };

      setLinks(linksJson.links ?? []);
      setProjectEntities(entitiesJson.entities ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [sceneId, projectId, entityType]);

  const linkedIds = useMemo(() => {
    return new Set(links.map((link) => link.projectEntityId));
  }, [links]);

  const availableEntities = useMemo(() => {
    return projectEntities.filter((entity) => !linkedIds.has(entity.id));
  }, [projectEntities, linkedIds]);

  const attachedCount = links.length;

  const attachEntity = async (projectEntityId: string) => {
    setAttaching(true);

    try {
      const res = await fetch(`/api/scenes/${sceneId}/entities`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectEntityId }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || `Failed to attach entity (${res.status})`);
      }

      await load();
      setShowPicker(false);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setAttaching(false);
    }
  };

  const removeFromScene = async (linkId: string) => {
    const confirmed = window.confirm(
      "לבצע הסרה מהסצנה הנוכחית בלבד? הפריט יישאר שמור בפרויקט."
    );

    if (!confirmed) return;

    setRemovingLinkId(linkId);

    try {
      const res = await fetch(`/api/scenes/${sceneId}/entities`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ linkId }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || `Failed to remove entity (${res.status})`);
      }

      if (editor?.mode === "edit") {
        const editedEntityId = editor.entityId;
        const removedLink = links.find((link) => link.id === linkId);
        if (removedLink && editedEntityId === removedLink.projectEntity.id) {
          setEditor(null);
        }
      }

      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setRemovingLinkId(null);
    }
  };

  const saveEditor = async () => {
    if (!editor) return;

    const titleValue = editor.title.trim();
    if (!titleValue) {
      window.alert("צריך להזין שם לפריט.");
      return;
    }

    setSaving(true);

    try {
      const detailsJson =
        entityType === "LOCATIONS"
          ? JSON.stringify({
              address: editor.address.trim(),
              contactName: editor.contactName.trim(),
              parking: editor.parking,
              notes: editor.notes.trim(),
            })
          : JSON.stringify({
              role: editor.role.trim(),
              phone: editor.phone.trim(),
              email: editor.email.trim(),
              notes: editor.notes.trim(),
            });

      if (editor.mode === "create") {
        const createRes = await fetch(`/api/projects/${projectId}/entities`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            entityType,
            title: titleValue,
            status: editor.status,
            detailsJson,
            tags: [],
          }),
        });

        if (!createRes.ok) {
          const j = await createRes.json().catch(() => null);
          throw new Error(j?.error || `Failed to create entity (${createRes.status})`);
        }

        const createJson = (await createRes.json()) as { entity: ApiProjectEntity };
        const createdEntity = createJson.entity;

        if (!createdEntity?.id) {
          throw new Error("Entity payload is missing");
        }

        const attachRes = await fetch(`/api/scenes/${sceneId}/entities`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectEntityId: createdEntity.id,
          }),
        });

        if (!attachRes.ok) {
          const j = await attachRes.json().catch(() => null);
          throw new Error(j?.error || `Failed to attach entity (${attachRes.status})`);
        }
      } else {
        const entityId = editor.entityId;
        if (!entityId) {
          throw new Error("Missing entity id");
        }

        const updateRes = await fetch(`/api/entities/${entityId}`, {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: titleValue,
            status: editor.status,
            detailsJson,
            tags: [],
          }),
        });

        if (!updateRes.ok) {
          const j = await updateRes.json().catch(() => null);
          throw new Error(j?.error || `Failed to update entity (${updateRes.status})`);
        }
      }

      setEditor(null);
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="p-4 rounded-lg border border-app surface-app">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-semibold">
          {title} ({attachedCount})
        </h3>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditor(buildEmptyEditorState());
              setShowPicker(false);
            }}
            className="px-3 py-2 rounded-lg border border-app hover:opacity-90 text-sm"
          >
            + צור חדש
          </button>

          <button
            type="button"
            onClick={() => {
              setShowPicker((prev) => !prev);
              if (!showPicker) setEditor(null);
            }}
            className="px-3 py-2 rounded-lg border border-app hover:opacity-90 text-sm"
          >
            {showPicker ? "סגור" : "+ בחר קיים"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-3 text-sm text-gray-500">טוען...</div>
      ) : error ? (
        <div className="mt-3 text-sm text-red-600">{error}</div>
      ) : (
        <>
          {links.length === 0 ? (
            <div className="mt-3 text-sm text-gray-500">אין פריטים משויכים בקטגוריה הזאת.</div>
          ) : (
            <ul className="mt-3 space-y-2">
              {links.map((link) => {
                const details = parseDetails(
                  link.projectEntity.detailsJson,
                  link.projectEntity.entityType
                );

                return (
                  <li
                    key={link.id}
                    className={`p-3 rounded-lg border hover:border-gray-300 transition ${cardStatusClasses(
                      link.projectEntity.status
                    )}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-right"
                        onClick={() => {
                          setEditor(buildEditorStateFromEntity(link.projectEntity));
                          setShowPicker(false);
                        }}
                      >
                        <div className="font-medium">{link.projectEntity.title}</div>

                        {entityType === "LOCATIONS" ? (
                          <div className="mt-1 space-y-1">
                            {details.address ? (
                              <div className="text-sm text-gray-500">{details.address}</div>
                            ) : null}
                            {details.parking ? (
                              <div className="text-sm text-gray-500">
                                {parkingLabel(details.parking)}
                              </div>
                            ) : null}
                          </div>
                        ) : details.role ? (
                          <div className="text-sm text-gray-500 mt-1">{details.role}</div>
                        ) : null}
                      </button>

                      <div className="shrink-0 flex flex-col items-end gap-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${statusClasses(
                            link.projectEntity.status
                          )}`}
                        >
                          {statusLabel(link.projectEntity.status)}
                        </span>

                        <button
                          type="button"
                          onClick={() => void removeFromScene(link.id)}
                          disabled={removingLinkId === link.id}
                          className="text-xs text-gray-500 hover:text-red-600 transition disabled:opacity-50"
                          title="הסרה מהסצנה הנוכחית בלבד. הפריט יישאר בפרויקט."
                        >
                          {removingLinkId === link.id
                            ? "מסיר..."
                            : "הסרה מהסצנה הנוכחית"}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {editor ? (
            <div className="mt-4 p-3 rounded-lg border border-dashed border-gray-300 bg-gray-50">
              <div className="text-sm font-medium mb-3">
                {editor.mode === "create" ? "יצירת פריט חדש" : "עריכת פריט"}
              </div>

              <div className="grid grid-cols-1 gap-3">
                <label className="block">
                  <span className="text-sm text-gray-600">{fieldLabel(entityType)}</span>
                  <input
                    type="text"
                    value={editor.title}
                    onChange={(e) =>
                      setEditor((prev) =>
                        prev ? { ...prev, title: e.target.value } : prev
                      )
                    }
                    className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                  />
                </label>

                <label className="block">
                  <span className="text-sm text-gray-600">סטטוס</span>
                  <select
                    value={editor.status}
                    onChange={(e) =>
                      setEditor((prev) =>
                        prev
                          ? {
                              ...prev,
                              status: e.target.value as EntityStatus,
                            }
                          : prev
                      )
                    }
                    className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                  >
                    <option value="OK">תקין</option>
                    <option value="MISSING">חסר</option>
                    <option value="BLOCKED">חסום</option>
                  </select>
                </label>

                {entityType === "LOCATIONS" ? (
                  <>
                    <label className="block">
                      <span className="text-sm text-gray-600">כתובת</span>
                      <input
                        type="text"
                        value={editor.address}
                        onChange={(e) =>
                          setEditor((prev) =>
                            prev ? { ...prev, address: e.target.value } : prev
                          )
                        }
                        className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm text-gray-600">איש קשר</span>
                      <input
                        type="text"
                        value={editor.contactName}
                        onChange={(e) =>
                          setEditor((prev) =>
                            prev ? { ...prev, contactName: e.target.value } : prev
                          )
                        }
                        className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm text-gray-600">חניה</span>
                      <select
                        value={editor.parking}
                        onChange={(e) =>
                          setEditor((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  parking: e.target.value as "yes" | "no" | "",
                                }
                              : prev
                          )
                        }
                        className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                      >
                        <option value="">לא הוגדר</option>
                        <option value="yes">יש חניה</option>
                        <option value="no">אין חניה</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm text-gray-600">הערות</span>
                      <textarea
                        value={editor.notes}
                        onChange={(e) =>
                          setEditor((prev) =>
                            prev ? { ...prev, notes: e.target.value } : prev
                          )
                        }
                        rows={3}
                        className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <label className="block">
                      <span className="text-sm text-gray-600">{roleLabel(entityType)}</span>
                      <input
                        type="text"
                        value={editor.role}
                        onChange={(e) =>
                          setEditor((prev) =>
                            prev ? { ...prev, role: e.target.value } : prev
                          )
                        }
                        className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm text-gray-600">טלפון</span>
                      <input
                        type="text"
                        value={editor.phone}
                        onChange={(e) =>
                          setEditor((prev) =>
                            prev ? { ...prev, phone: e.target.value } : prev
                          )
                        }
                        className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm text-gray-600">מייל</span>
                      <input
                        type="text"
                        value={editor.email}
                        onChange={(e) =>
                          setEditor((prev) =>
                            prev ? { ...prev, email: e.target.value } : prev
                          )
                        }
                        className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm text-gray-600">הערות</span>
                      <textarea
                        value={editor.notes}
                        onChange={(e) =>
                          setEditor((prev) =>
                            prev ? { ...prev, notes: e.target.value } : prev
                          )
                        }
                        rows={3}
                        className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white text-black"
                      />
                    </label>
                  </>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditor(null)}
                  disabled={saving}
                  className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 text-sm"
                >
                  ביטול
                </button>

                <button
                  type="button"
                  onClick={() => void saveEditor()}
                  disabled={saving}
                  className="px-3 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 text-sm"
                >
                  {saving ? "שומר..." : editor.mode === "create" ? "אישור" : "עדכון"}
                </button>
              </div>
            </div>
          ) : null}

          {showPicker ? (
            <div className="mt-4 p-3 rounded-lg border border-dashed border-gray-300 bg-gray-50">
              <div className="text-sm font-medium mb-3">בחר פריט קיים מהפרויקט</div>

              {availableEntities.length === 0 ? (
                <div className="text-sm text-gray-500">
                  אין פריטים זמינים בקטגוריה הזאת שעדיין לא שויכו לסצנה.
                </div>
              ) : (
                <ul className="space-y-2">
                  {availableEntities.map((entity) => {
                    const details = parseDetails(entity.detailsJson, entity.entityType);

                    return (
                      <li
                        key={entity.id}
                        className={`flex items-start justify-between gap-3 p-3 rounded-lg border ${cardStatusClasses(
                          entity.status
                        )}`}
                      >
                        <div className="min-w-0">
                          <div className="font-medium">{entity.title}</div>

                          {entityType === "LOCATIONS" ? (
                            <div className="mt-1 space-y-1">
                              {details.address ? (
                                <div className="text-sm text-gray-500">{details.address}</div>
                              ) : null}
                              {details.parking ? (
                                <div className="text-sm text-gray-500">
                                  {parkingLabel(details.parking)}
                                </div>
                              ) : null}
                            </div>
                          ) : details.role ? (
                            <div className="text-sm text-gray-500 mt-1">{details.role}</div>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          onClick={() => void attachEntity(entity.id)}
                          disabled={attaching}
                          className="px-3 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 text-sm shrink-0"
                        >
                          צרף
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}