"use client";

import { ChevronDown, ChevronLeft, ChevronUp, Pencil, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { compressImageFile } from "@/lib/imageClient";
import {
  DEFAULT_PROPOSAL_FORM,
  DEFAULT_PROPOSAL_ITEM,
  PAYMENT_TERM_OPTIONS,
  calculateProposalTotals,
  formatMoney,
  getProposalStatusMeta,
  type CalculatedProposalTotals,
  type ProposalFormItemInput,
  type ProposalFormValues,
  type ProposalStatus,
  type ProposalTimelineStepInput,
} from "@/lib/proposals";
import { ProposalStatusBadge } from "@/components/ProposalStatusBadge";
import { ProposalDocument } from "@/components/proposals/ProposalDocument";

const SECTION_IDS = ["document", "client", "business", "items", "timeline", "freeText"] as const;
type SectionId = (typeof SECTION_IDS)[number];

type ProposalFormProps = {
  initialValues?: ProposalFormValues;
  initialStatus?: ProposalStatus;
  busy?: boolean;
  submitLabel: string;
  showStatusField?: boolean;
  projectName?: string;
  onSubmit: (values: ProposalFormValues, status: ProposalStatus) => Promise<void> | void;
};

function formValuesToProposalDocument(
  values: ProposalFormValues,
  totals: CalculatedProposalTotals
) {
  return {
    title: values.title,
    proposalNumber: values.proposalNumber || null,
    issueDate: values.issueDate || null,
    validUntil: values.validUntil || null,
    currency: values.currency,
    vatRate: values.vatRate,
    businessName: values.businessName || null,
    businessEmail: values.businessEmail || null,
    businessPhone: values.businessPhone || null,
    businessAddress: values.businessAddress || null,
    logoUrl: values.logoUrl || null,
    clientName: values.clientName || null,
    clientEmail: values.clientEmail || null,
    clientPhone: values.clientPhone || null,
    documentDescription: values.documentDescription || null,
    paymentTerms: values.paymentTerms || null,
    paymentTermsNote: values.paymentTermsNote || null,
    footerText: values.footerText || null,
    subtotal: totals.subtotal,
    vatAmount: totals.vatAmount,
    totalAmount: totals.totalAmount,
    freeTextContent: values.freeTextContent || null,
    items: totals.items.map((item) => ({
      name: item.name,
      description: item.description || null,
      category: item.category || null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      vatRate: item.vatRate,
      lineSubtotal: item.lineSubtotal,
      lineVat: item.lineVat,
      lineTotal: item.lineTotal,
    })),
    timelineSteps: values.timelineSteps.map((step) => ({
      title: step.title,
      description: step.description?.trim() || null,
      targetDate: step.targetDate?.trim() || null,
    })),
  };
}

const STATUSES: ProposalStatus[] = [
  "DRAFT",
  "SENT",
  "APPROVED",
  "REJECTED",
  "ARCHIVED",
];

const ITEM_CATEGORY_OPTIONS = [
  "שירות",
  "אנשי צוות",
  "ציוד",
  "נסיעות ודלק",
  "אוכל ושתייה",
  "משמרת עריכה",
] as const;


const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 bg-white text-gray-900 focus:ring-2 focus:ring-offset-0 focus:ring-gray-400 focus:border-gray-400";
const labelClass = "block";
const labelTextClass = "text-sm font-medium text-gray-700";

function CollapsibleSection({
  sectionId,
  title,
  summary,
  isCollapsed,
  onExpand,
  onSaveSection,
  children,
  isPrimary = false,
}: {
  sectionId: SectionId;
  title: string;
  summary: string;
  isCollapsed: boolean;
  onExpand: () => void;
  onSaveSection: () => void;
  children: React.ReactNode;
  isPrimary?: boolean;
}) {
  return (
    <section
      className={
        "rounded-xl border overflow-hidden " +
        (isPrimary
          ? "border-gray-300 bg-white shadow-sm"
          : "border-gray-200 bg-white shadow-sm")
      }
    >
      {isCollapsed ? (
        <button
          type="button"
          onClick={onExpand}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-right hover:bg-gray-50 border-b border-gray-100"
        >
          <span className="text-sm font-medium text-gray-900">{title}</span>
          <span className="text-sm text-gray-500 truncate flex-1 min-w-0 mx-2">
            {summary}
          </span>
          <span className="flex items-center gap-1 text-sm text-gray-600 shrink-0">
            <Pencil size={14} />
            ערוך
          </span>
          <ChevronLeft size={18} className="text-gray-400 shrink-0" aria-hidden />
        </button>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap border-b border-gray-100 bg-gray-50/80 px-4 py-3">
            <h2
              className={
                isPrimary ? "text-lg font-semibold text-gray-900" : "text-base font-semibold text-gray-900"
              }
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onSaveSection}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              שמור סעיף
              <ChevronDown size={16} className="rotate-0" aria-hidden />
            </button>
          </div>
          <div className={isPrimary ? "p-6" : "p-4"}>{children}</div>
        </>
      )}
    </section>
  );
}

export function ProposalForm({
  initialValues = DEFAULT_PROPOSAL_FORM,
  initialStatus = "DRAFT",
  busy = false,
  submitLabel,
  showStatusField = false,
  projectName,
  onSubmit,
}: ProposalFormProps) {
  const [values, setValues] = useState<ProposalFormValues>(initialValues);
  const [status, setStatus] = useState<ProposalStatus>(initialStatus);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [draftItem, setDraftItem] = useState<ProposalFormItemInput | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<SectionId, boolean>>({
    document: false,
    client: false,
    business: false,
    items: false,
    timeline: false,
    freeText: false,
  });
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoManualUrlOpen, setLogoManualUrlOpen] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const setSectionCollapsed = (id: SectionId, collapsed: boolean) => {
    setCollapsedSections((prev) => ({ ...prev, [id]: collapsed }));
  };

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  const totals = useMemo(
    () => calculateProposalTotals(values.items),
    [values.items]
  );

  const sectionSummaries = useMemo(() => {
    const doc =
      [values.title, values.proposalNumber || "ללא מספר", values.issueDate, values.validUntil, values.currency]
        .filter(Boolean)
        .join(" · ") || "לא מולא";
    const client =
      [values.clientName, values.clientEmail].filter(Boolean).join(" · ") || "לא מולא";
    const business =
      [values.businessName, values.businessEmail].filter(Boolean).join(" · ") || "לא מולא";
    const items =
      values.items.length > 0
        ? `${values.items.length} פריטים · ${formatMoney(totals.totalAmount, values.currency)}`
        : "אין פריטים";
    const timeline =
      values.timelineSteps.length > 0
        ? `${values.timelineSteps.length} שלבים`
        : "אין שלבים";
    const freeLine =
      values.freeTextContent.trim() || values.notesInternal.trim() || "";
    const freeText = freeLine ? freeLine.slice(0, 60) + (freeLine.length > 60 ? "…" : "") : "לא מולא";
    return { document: doc, client, business, items, timeline, freeText };
  }, [values, totals.totalAmount]);

  const updateField = <K extends keyof ProposalFormValues>(
    key: K,
    value: ProposalFormValues[K]
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const addItem = () => {
    setDraftItem({
      ...DEFAULT_PROPOSAL_ITEM,
      vatRate: values.vatRate,
    });
    setEditingRowIndex(values.items.length);
  };

  const startEditRow = (index: number) => {
    setDraftItem({ ...values.items[index] });
    setEditingRowIndex(index);
  };

  const updateDraft = (
    key: keyof ProposalFormItemInput,
    value: string | number
  ) => {
    setDraftItem((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [key]:
          key === "name" || key === "description" || key === "category"
            ? String(value)
            : Number(value),
      };
    });
  };

  const saveRow = () => {
    if (draftItem == null || editingRowIndex == null) return;
    const nameTrim = draftItem.name.trim();
    if (!nameTrim) return;

    const toCommit = { ...draftItem, name: nameTrim };
    setValues((prev) => {
      if (editingRowIndex === prev.items.length) {
        return { ...prev, items: [...prev.items, toCommit] };
      }
      return {
        ...prev,
        items: prev.items.map((item, i) =>
          i === editingRowIndex ? toCommit : item
        ),
      };
    });
    setEditingRowIndex(null);
    setDraftItem(null);
  };

  const cancelEditRow = () => {
    setEditingRowIndex(null);
    setDraftItem(null);
  };

  const removeItem = (index: number) => {
    setValues((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
    if (editingRowIndex === index) {
      setEditingRowIndex(null);
      setDraftItem(null);
    } else if (editingRowIndex != null && editingRowIndex > index) {
      setEditingRowIndex(editingRowIndex - 1);
    }
  };

  const [editingTimelineIndex, setEditingTimelineIndex] = useState<number | null>(null);
  const [draftTimelineStep, setDraftTimelineStep] = useState<ProposalTimelineStepInput | null>(null);

  const addTimelineStep = () => {
    setDraftTimelineStep({ title: "", description: "", targetDate: "" });
    setEditingTimelineIndex(values.timelineSteps.length);
  };

  const startEditTimelineStep = (index: number) => {
    setDraftTimelineStep({ ...values.timelineSteps[index] });
    setEditingTimelineIndex(index);
  };

  const updateTimelineDraft = (key: keyof ProposalTimelineStepInput, value: string) => {
    setDraftTimelineStep((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const saveTimelineStep = () => {
    if (draftTimelineStep == null || editingTimelineIndex == null) return;
    const titleTrim = draftTimelineStep.title.trim();
    if (!titleTrim) return;
    const toCommit: ProposalTimelineStepInput = {
      title: titleTrim,
      description: draftTimelineStep.description ?? "",
      targetDate: draftTimelineStep.targetDate ?? "",
    };
    setValues((prev) => {
      const next = [...prev.timelineSteps];
      if (editingTimelineIndex === next.length) {
        next.push(toCommit);
      } else {
        next[editingTimelineIndex] = toCommit;
      }
      return { ...prev, timelineSteps: next };
    });
    setEditingTimelineIndex(null);
    setDraftTimelineStep(null);
  };

  const cancelEditTimelineStep = () => {
    setEditingTimelineIndex(null);
    setDraftTimelineStep(null);
  };

  const removeTimelineStep = (index: number) => {
    setValues((prev) => ({
      ...prev,
      timelineSteps: prev.timelineSteps.filter((_, i) => i !== index),
    }));
    if (editingTimelineIndex === index) {
      setEditingTimelineIndex(null);
      setDraftTimelineStep(null);
    } else if (editingTimelineIndex != null && editingTimelineIndex > index) {
      setEditingTimelineIndex(editingTimelineIndex - 1);
    }
  };

  const moveTimelineStep = (index: number, direction: "up" | "down") => {
    const steps = [...values.timelineSteps];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= steps.length) return;
    [steps[index], steps[target]] = [steps[target], steps[index]];
    setValues((prev) => ({ ...prev, timelineSteps: steps }));
    if (editingTimelineIndex === index) setEditingTimelineIndex(target);
    else if (editingTimelineIndex === target) setEditingTimelineIndex(index);
  };

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setLogoUploading(true);
    try {
      const compressed = await compressImageFile(file);
      const formData = new FormData();
      const blob = compressed.blob;
      const uploadFile = new File([blob], "logo.webp", { type: blob.type });
      formData.append("file", uploadFile);
      const res = await fetch("/api/upload/proposal-logo", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "Upload failed");
      }
      if (typeof json?.url === "string") {
        updateField("logoUrl", json.url);
      }
    } catch (err) {
      console.error("Logo upload error:", err);
      // Optionally set a small error state; for now we leave logoUrl unchanged
    } finally {
      setLogoUploading(false);
    }
  };

  const removeLogo = () => {
    updateField("logoUrl", "");
  };

  const isNewRow = editingRowIndex === values.items.length;
  const hasDraft = draftItem != null && editingRowIndex != null;
  const draftLineTotal = useMemo(() => {
    if (!draftItem) return null;
    const q = Number(draftItem.quantity) || 0;
    const p = Number(draftItem.unitPrice) || 0;
    const v = Number(draftItem.vatRate) || 0;
    const sub = Math.round(q * p * 100) / 100;
    const vat = Math.round((sub * v) / 100 * 100) / 100;
    return { lineSubtotal: sub, lineVat: vat, lineTotal: sub + vat };
  }, [draftItem]);

  return (
    <>
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(values, status);
      }}
      className="space-y-8"
      dir="rtl"
    >
      {/* Document Details — secondary */}
      <CollapsibleSection
        sectionId="document"
        title="פרטי מסמך"
        summary={sectionSummaries.document}
        isCollapsed={collapsedSections.document}
        onExpand={() => setSectionCollapsed("document", false)}
        onSaveSection={() => setSectionCollapsed("document", true)}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className={labelClass}>
            <span className={labelTextClass}>כותרת</span>
            <input
              type="text"
              value={values.title}
              onChange={(e) => updateField("title", e.target.value)}
              className={inputClass}
              required
            />
          </label>
          <label className={labelClass}>
            <span className={labelTextClass}>תיאור מסמך</span>
            <input
              type="text"
              value={values.documentDescription}
              onChange={(e) => updateField("documentDescription", e.target.value)}
              className={inputClass}
            />
          </label>
          {values.proposalNumber ? (
            <div className={labelClass}>
              <span className={labelTextClass}>מספר הצעה</span>
              <p className="mt-1 text-sm text-gray-700">{values.proposalNumber}</p>
            </div>
          ) : null}
          <label className={labelClass}>
            <span className={labelTextClass}>תאריך הנפקה</span>
            <input
              type="date"
              value={values.issueDate}
              onChange={(e) => updateField("issueDate", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            <span className={labelTextClass}>בתוקף עד</span>
            <input
              type="date"
              value={values.validUntil}
              onChange={(e) => updateField("validUntil", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            <span className={labelTextClass}>מטבע</span>
            <input
              type="text"
              value={values.currency}
              onChange={(e) => updateField("currency", e.target.value.toUpperCase())}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            <span className={labelTextClass}>אחוז מע״מ</span>
            <input
              type="number"
              step="0.01"
              value={values.vatRate}
              onChange={(e) => updateField("vatRate", Number(e.target.value))}
              className={inputClass}
            />
          </label>
          {showStatusField ? (
            <label className={labelClass}>
              <span className={labelTextClass}>סטטוס</span>
              <div className="mt-1 mb-2">
                <ProposalStatusBadge status={status} />
              </div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProposalStatus)}
                className={inputClass}
              >
                {STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {getProposalStatusMeta(value).label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </CollapsibleSection>

      {/* Client Details — secondary */}
      <CollapsibleSection
        sectionId="client"
        title="פרטי לקוח"
        summary={sectionSummaries.client}
        isCollapsed={collapsedSections.client}
        onExpand={() => setSectionCollapsed("client", false)}
        onSaveSection={() => setSectionCollapsed("client", true)}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className={labelClass}>
            <span className={labelTextClass}>שם לקוח</span>
            <input
              type="text"
              value={values.clientName}
              onChange={(e) => updateField("clientName", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            <span className={labelTextClass}>אימייל לקוח</span>
            <input
              type="email"
              value={values.clientEmail}
              onChange={(e) => updateField("clientEmail", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            <span className={labelTextClass}>טלפון לקוח</span>
            <input
              type="text"
              value={values.clientPhone}
              onChange={(e) => updateField("clientPhone", e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
      </CollapsibleSection>

      {/* Business Details — secondary, with defaults hint */}
      <CollapsibleSection
        sectionId="business"
        title="פרטי העסק / השולח"
        summary={sectionSummaries.business}
        isCollapsed={collapsedSections.business}
        onExpand={() => setSectionCollapsed("business", false)}
        onSaveSection={() => setSectionCollapsed("business", true)}
      >
        <p className="text-xs text-gray-500 mb-3">
          ברירת המחדל מגיעה מהפרופיל שלך; ניתן לערוך לכל הצעה.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className={labelClass}>
            <span className={labelTextClass}>שם העסק</span>
            <input
              type="text"
              value={values.businessName}
              onChange={(e) => updateField("businessName", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            <span className={labelTextClass}>אימייל עסקי</span>
            <input
              type="email"
              value={values.businessEmail}
              onChange={(e) => updateField("businessEmail", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            <span className={labelTextClass}>טלפון עסקי</span>
            <input
              type="text"
              value={values.businessPhone}
              onChange={(e) => updateField("businessPhone", e.target.value)}
              className={inputClass}
            />
          </label>
          <div className={`${labelClass} md:col-span-2`}>
            <span className={labelTextClass}>לוגו עסקי</span>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {values.logoUrl ? (
                <>
                  <div className="flex h-14 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white p-1">
                    <img
                      src={values.logoUrl}
                      alt="לוגו"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <X size={14} />
                      הסר לוגו
                    </button>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleLogoFile}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={logoUploading}
                      className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Upload size={14} />
                      {logoUploading ? "מעלה..." : "החלף"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleLogoFile}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                    className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-600 hover:border-gray-400 hover:bg-gray-100 disabled:opacity-50"
                  >
                    <Upload size={18} />
                    {logoUploading ? "מעלה..." : "העלה לוגו"}
                  </button>
                </>
              )}
            </div>
            {logoManualUrlOpen ? (
              <div className="mt-2">
                <input
                  type="url"
                  value={values.logoUrl}
                  onChange={(e) => updateField("logoUrl", e.target.value)}
                  placeholder="https://..."
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setLogoManualUrlOpen(false)}
                  className="mt-1 text-xs text-gray-500 hover:underline"
                >
                  סגור קישור ידני
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setLogoManualUrlOpen(true)}
                className="mt-1 text-xs text-gray-500 hover:underline"
              >
                הזן קישור ידנית
              </button>
            )}
          </div>
          <div className={`${labelClass} md:col-span-2`}>
            <span className={labelTextClass}>תנאי תשלום</span>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="תנאי תשלום">
              {PAYMENT_TERM_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => updateField("paymentTerms", opt)}
                  className={
                    "rounded-lg border px-4 py-2 text-sm font-medium transition-colors " +
                    (values.paymentTerms === opt
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50")
                  }
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <label className={`${labelClass} md:col-span-2`}>
            <span className={labelTextClass}>הערה לתנאי תשלום</span>
            <textarea
              value={values.paymentTermsNote}
              onChange={(e) => updateField("paymentTermsNote", e.target.value)}
              rows={2}
              className={inputClass}
              placeholder="הערה נוספת (אופציונלי)"
            />
          </label>
          <label className={`${labelClass} md:col-span-2`}>
            <span className={labelTextClass}>טקסט סיום / פוטר</span>
            <textarea
              value={values.footerText}
              onChange={(e) => updateField("footerText", e.target.value)}
              rows={2}
              className={inputClass}
            />
          </label>
        </div>
      </CollapsibleSection>

      {/* Proposal Items — primary */}
      <CollapsibleSection
        sectionId="items"
        title="סעיפי הצעה"
        summary={sectionSummaries.items}
        isCollapsed={collapsedSections.items}
        onExpand={() => setSectionCollapsed("items", false)}
        onSaveSection={() => setSectionCollapsed("items", true)}
        isPrimary
      >
        <div className="space-y-4">
          {values.items.map((item, index) => {
            const isEditing = editingRowIndex === index;
            const calculated = totals.items[index];

            if (isEditing && draftItem) {
              return (
                <div
                  key={`edit-${index}`}
                  className="rounded-lg border-2 border-gray-300 bg-gray-50/80 p-4 space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className={labelClass}>
                      <span className={labelTextClass}>שם פריט</span>
                      <input
                        type="text"
                        value={draftItem.name}
                        onChange={(e) => updateDraft("name", e.target.value)}
                        className={inputClass}
                        placeholder="חובה"
                      />
                    </label>
                    <label className={labelClass}>
                      <span className={labelTextClass}>קטגוריה</span>
                      <select
                        value={draftItem.category || ""}
                        onChange={(e) => updateDraft("category", e.target.value)}
                        className={inputClass}
                      >
                        <option value="">—</option>
                        {ITEM_CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={labelClass}>
                      <span className={labelTextClass}>כמות</span>
                      <input
                        type="number"
                        step="0.001"
                        value={draftItem.quantity}
                        onChange={(e) => updateDraft("quantity", e.target.value)}
                        className={inputClass}
                      />
                    </label>
                    <label className={labelClass}>
                      <span className={labelTextClass}>מחיר יחידה</span>
                      <input
                        type="number"
                        step="0.01"
                        value={draftItem.unitPrice === 0 ? "" : draftItem.unitPrice}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateDraft("unitPrice", v === "" ? 0 : Number(v));
                        }}
                        className={inputClass}
                      />
                    </label>
                    <label className={labelClass}>
                      <span className={labelTextClass}>מע״מ פריט (%)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={draftItem.vatRate}
                        onChange={(e) => updateDraft("vatRate", e.target.value)}
                        className={inputClass}
                      />
                    </label>
                  </div>
                  {draftLineTotal && (
                    <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700 space-y-1">
                      <div>לפני מע״מ: {formatMoney(draftLineTotal.lineSubtotal, values.currency)}</div>
                      <div>מע״מ: {formatMoney(draftLineTotal.lineVat, values.currency)}</div>
                      <div className="font-semibold text-gray-900">
                        סה״כ פריט: {formatMoney(draftLineTotal.lineTotal, values.currency)}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={saveRow}
                      className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
                    >
                      שמור פריט
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditRow}
                      className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50"
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              );
            }

            const lineTotal = calculated?.lineTotal ?? 0;
            const qty = Number(item.quantity);
            const quantityText = Number.isFinite(qty)
              ? ` · ${qty} יח׳`
              : String(item.quantity).trim()
              ? ` · ${item.quantity} יח׳`
              : "";
            const categoryLabel = item.category ? `${item.category} · ` : "";
            return (
              <div
                key={index}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-gray-300"
              >
                <div className="flex-1 min-w-0">
                  {categoryLabel ? (
                    <span className="text-sm text-gray-500">{categoryLabel}</span>
                  ) : null}
                  <span className="font-medium text-gray-900">{item.name || "—"}</span>
                  {quantityText ? (
                    <span className="text-sm text-gray-500">{quantityText}</span>
                  ) : null}
                </div>
                <div className="text-sm text-gray-600 whitespace-nowrap">
                  {formatMoney(lineTotal, values.currency)}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startEditRow(index)}
                    className="text-sm font-medium text-gray-600 hover:text-gray-900"
                  >
                    ערוך
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    מחק
                  </button>
                </div>
              </div>
            );
          })}

          {hasDraft && isNewRow && draftItem ? (
            <div
              key="new-row"
              className="rounded-lg border-2 border-gray-300 bg-gray-50/80 p-4 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={labelClass}>
                  <span className={labelTextClass}>שם פריט</span>
                  <input
                    type="text"
                    value={draftItem.name}
                    onChange={(e) => updateDraft("name", e.target.value)}
                    className={inputClass}
                    placeholder="חובה"
                  />
                </label>
                <label className={labelClass}>
                  <span className={labelTextClass}>קטגוריה</span>
                  <select
                    value={draftItem.category || ""}
                    onChange={(e) => updateDraft("category", e.target.value)}
                    className={inputClass}
                  >
                    <option value="">—</option>
                    {ITEM_CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={labelClass}>
                  <span className={labelTextClass}>כמות</span>
                  <input
                    type="number"
                    step="0.001"
                    value={draftItem.quantity}
                    onChange={(e) => updateDraft("quantity", e.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  <span className={labelTextClass}>מחיר יחידה</span>
                  <input
                    type="number"
                    step="0.01"
                    value={draftItem.unitPrice === 0 ? "" : draftItem.unitPrice}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateDraft("unitPrice", v === "" ? 0 : Number(v));
                    }}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  <span className={labelTextClass}>מע״מ פריט (%)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={draftItem.vatRate}
                    onChange={(e) => updateDraft("vatRate", e.target.value)}
                    className={inputClass}
                  />
                </label>
              </div>
              {draftLineTotal && (
                <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700 space-y-1">
                  <div>לפני מע״מ: {formatMoney(draftLineTotal.lineSubtotal, values.currency)}</div>
                  <div>מע״מ: {formatMoney(draftLineTotal.lineVat, values.currency)}</div>
                  <div className="font-semibold text-gray-900">
                    סה״כ פריט: {formatMoney(draftLineTotal.lineTotal, values.currency)}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={saveRow}
                  className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
                >
                  שמור פריט
                </button>
                <button
                  type="button"
                  onClick={cancelEditRow}
                  className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50"
                >
                  ביטול
                </button>
              </div>
            </div>
          ) : null}

          {!hasDraft && (
            <button
              type="button"
              onClick={addItem}
              className="w-full rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-800 hover:bg-gray-50/50"
            >
              + הוסף פריט
            </button>
          )}
        </div>
      </CollapsibleSection>

      {/* Production Timeline — תהליך העבודה */}
      <CollapsibleSection
        sectionId="timeline"
        title="תהליך העבודה"
        summary={sectionSummaries.timeline}
        isCollapsed={collapsedSections.timeline}
        onExpand={() => setSectionCollapsed("timeline", false)}
        onSaveSection={() => setSectionCollapsed("timeline", true)}
      >
        <div className="space-y-4">
          {values.timelineSteps.length === 0 && editingTimelineIndex === null && (
            <p className="text-sm text-gray-500 py-2">
              הוסף שלבי עבודה להצגה ללקוח (למשל: הפקה, יום צילום, עריכה, הגשה).
            </p>
          )}
          {values.timelineSteps.map((step, index) => {
            const isEditing = editingTimelineIndex === index && draftTimelineStep;
            if (isEditing && draftTimelineStep) {
              return (
                <div
                  key={`edit-tl-${index}`}
                  className="rounded-lg border-2 border-gray-300 bg-gray-50/80 p-4 space-y-4"
                >
                  <label className={labelClass}>
                    <span className={labelTextClass}>שם שלב</span>
                    <input
                      type="text"
                      value={draftTimelineStep.title}
                      onChange={(e) => updateTimelineDraft("title", e.target.value)}
                      className={inputClass}
                      placeholder="למשל: הפקה, יום צילום"
                    />
                  </label>
                  <label className={labelClass}>
                    <span className={labelTextClass}>תאריך</span>
                    <input
                      type="date"
                      value={draftTimelineStep.targetDate}
                      onChange={(e) => updateTimelineDraft("targetDate", e.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass}>
                    <span className={labelTextClass}>תיאור קצר (אופציונלי)</span>
                    <input
                      type="text"
                      value={draftTimelineStep.description}
                      onChange={(e) => updateTimelineDraft("description", e.target.value)}
                      className={inputClass}
                      placeholder="הערה או פרט נוסף"
                    />
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={saveTimelineStep}
                      className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
                    >
                      שמור
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditTimelineStep}
                      className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50"
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              );
            }
            const dateStr = step.targetDate
              ? new Date(step.targetDate).toLocaleDateString("he-IL")
              : "";
            return (
              <div
                key={index}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-gray-300"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-900">{step.title || "—"}</span>
                  {dateStr ? (
                    <span className="text-sm text-gray-500 mr-2"> · {dateStr}</span>
                  ) : null}
                  {step.description?.trim() ? (
                    <p className="text-sm text-gray-600 mt-1">{step.description.trim()}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveTimelineStep(index, "up")}
                    disabled={index === 0}
                    className="p-1.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                    aria-label="העלה"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveTimelineStep(index, "down")}
                    disabled={index === values.timelineSteps.length - 1}
                    className="p-1.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                    aria-label="הורד"
                  >
                    <ChevronDown size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => startEditTimelineStep(index)}
                    className="text-sm font-medium text-gray-600 hover:text-gray-900"
                  >
                    ערוך
                  </button>
                  <button
                    type="button"
                    onClick={() => removeTimelineStep(index)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    מחק
                  </button>
                </div>
              </div>
            );
          })}
          {editingTimelineIndex === values.timelineSteps.length && draftTimelineStep && (
            <div className="rounded-lg border-2 border-gray-300 bg-gray-50/80 p-4 space-y-4">
              <label className={labelClass}>
                <span className={labelTextClass}>שם שלב</span>
                <input
                  type="text"
                  value={draftTimelineStep.title}
                  onChange={(e) => updateTimelineDraft("title", e.target.value)}
                  className={inputClass}
                  placeholder="למשל: הפקה, יום צילום"
                />
              </label>
              <label className={labelClass}>
                <span className={labelTextClass}>תאריך</span>
                <input
                  type="date"
                  value={draftTimelineStep.targetDate}
                  onChange={(e) => updateTimelineDraft("targetDate", e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                <span className={labelTextClass}>תיאור קצר (אופציונלי)</span>
                <input
                  type="text"
                  value={draftTimelineStep.description}
                  onChange={(e) => updateTimelineDraft("description", e.target.value)}
                  className={inputClass}
                  placeholder="הערה או פרט נוסף"
                />
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={saveTimelineStep}
                  className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
                >
                  שמור
                </button>
                <button
                  type="button"
                  onClick={cancelEditTimelineStep}
                  className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50"
                >
                  ביטול
                </button>
              </div>
            </div>
          )}
          {editingTimelineIndex === null && (
            <button
              type="button"
              onClick={addTimelineStep}
              className="w-full rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-800 hover:bg-gray-50/50"
            >
              + הוסף שלב
            </button>
          )}
        </div>
      </CollapsibleSection>

      {/* Free Text / Notes — primary */}
      <CollapsibleSection
        sectionId="freeText"
        title="תוכן חופשי והערות"
        summary={sectionSummaries.freeText}
        isCollapsed={collapsedSections.freeText}
        onExpand={() => setSectionCollapsed("freeText", false)}
        onSaveSection={() => setSectionCollapsed("freeText", true)}
        isPrimary
      >
        <div className="space-y-5">
          <label className={labelClass}>
            <span className={labelTextClass}>תוכן חופשי</span>
            <textarea
              value={values.freeTextContent}
              onChange={(e) => updateField("freeTextContent", e.target.value)}
              rows={4}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            <span className={labelTextClass}>הערות פנימיות</span>
            <textarea
              value={values.notesInternal}
              onChange={(e) => updateField("notesInternal", e.target.value)}
              rows={2}
              className={inputClass}
            />
          </label>
        </div>
      </CollapsibleSection>

      {/* Totals / Summary — always visible */}
      <section className="rounded-xl border border-gray-300 bg-gray-50/50 shadow-sm overflow-hidden">
        <h2 className="text-base font-semibold text-gray-900 border-b border-gray-200 bg-gray-100/80 px-5 py-3.5">
          סיכום
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-sm font-medium text-gray-500">לפני מע״מ</div>
            <div className="mt-2 text-xl font-semibold text-gray-900">
              {formatMoney(totals.subtotal, values.currency)}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-sm font-medium text-gray-500">מע״מ ({values.vatRate}%)</div>
            <div className="mt-2 text-xl font-semibold text-gray-900">
              {formatMoney(totals.vatAmount, values.currency)}
            </div>
          </div>
          <div className="rounded-xl border-2 border-gray-900 bg-gray-900 p-5 text-white">
            <div className="text-sm font-medium text-gray-300">סה״כ כולל מע״מ</div>
            <div className="mt-2 text-2xl font-bold">
              {formatMoney(totals.totalAmount, values.currency)}
            </div>
          </div>
        </div>
      </section>

      {/* Main actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={busy}
          className="px-6 py-3 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 disabled:opacity-50 focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
        >
          {busy ? "שומר..." : submitLabel}
        </button>
      </div>
    </form>

    {projectName ? (
      <section className="mt-10 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden" aria-label="תצוגה מקדימה">
        <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 bg-gray-50/80 px-5 py-3.5">
          תצוגה מקדימה
        </h2>
        <div className="p-4 bg-gray-50/50 overflow-auto max-h-[70vh]">
          <ProposalDocument
            projectName={projectName}
            proposal={formValuesToProposalDocument(values, totals)}
          />
        </div>
      </section>
    ) : null}
  </>
  );
}
