"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import { ProposalForm } from "@/components/ProposalForm";
import { ProposalStatusBadge } from "@/components/ProposalStatusBadge";
import {
  getProposalEmailBody,
  getProposalEmailSubject,
  getProposalFilenameSafe,
  getProposalPrintPath,
  getProposalWhatsAppMessage,
  getPublicProposalPath,
} from "@/lib/proposal-delivery";
import { formatMoney, type ProposalFormValues, type ProposalStatus } from "@/lib/proposals";

type ApiProject = {
  id: string;
  name: string;
};

type ApiProposalItem = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  quantity: string;
  unitPrice: string;
  vatRate: string;
};

type ApiProposalTimelineStep = {
  id: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  sortOrder: number;
};

type ApiProposal = {
  id: string;
  projectId: string;
  title: string;
  documentDescription: string | null;
  businessName: string | null;
  businessEmail: string | null;
  businessPhone: string | null;
  businessAddress: string | null;
  logoUrl: string | null;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  proposalNumber: string | null;
  issueDate: string | null;
  validUntil: string | null;
  currency: string;
  vatRate: string;
  status: ProposalStatus;
  freeTextContent: string | null;
  notesInternal: string | null;
  paymentTerms: string | null;
  paymentTermsNote: string | null;
  footerText: string | null;
  subtotal: string;
  vatAmount: string;
  totalAmount: string;
  updatedAt: string;
  sentAt: string | null;
  publicShareToken: string | null;
  isPublicShared: boolean;
  publicSharedAt: string | null;
  items: ApiProposalItem[];
  timelineSteps?: ApiProposalTimelineStep[];
};

function toDateInputValue(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function buildFormValues(proposal: ApiProposal): ProposalFormValues {
  return {
    title: proposal.title ?? "",
    documentDescription: proposal.documentDescription ?? "",
    businessName: proposal.businessName ?? "",
    businessEmail: proposal.businessEmail ?? "",
    businessPhone: proposal.businessPhone ?? "",
    businessAddress: proposal.businessAddress ?? "",
    logoUrl: proposal.logoUrl ?? "",
    clientName: proposal.clientName ?? "",
    clientEmail: proposal.clientEmail ?? "",
    clientPhone: proposal.clientPhone ?? "",
    proposalNumber: proposal.proposalNumber ?? "",
    issueDate: toDateInputValue(proposal.issueDate),
    validUntil: toDateInputValue(proposal.validUntil),
    currency: proposal.currency ?? "ILS",
    vatRate: Number(proposal.vatRate ?? 18),
    freeTextContent: proposal.freeTextContent ?? "",
    notesInternal: proposal.notesInternal ?? "",
    paymentTerms: proposal.paymentTerms ?? "",
    paymentTermsNote: proposal.paymentTermsNote ?? "",
    footerText: proposal.footerText ?? "",
    items:
      proposal.items.length > 0
        ? proposal.items.map((item) => ({
            name: item.name ?? "",
            description: item.description ?? "",
            category: item.category ?? "",
            quantity: Number(item.quantity ?? 0),
            unitPrice: Number(item.unitPrice ?? 0),
            vatRate: Number(item.vatRate ?? 18),
          }))
        : [],
    timelineSteps:
      proposal.timelineSteps && proposal.timelineSteps.length > 0
        ? proposal.timelineSteps.map((step) => ({
            title: step.title ?? "",
            description: step.description ?? "",
            targetDate: toDateInputValue(step.targetDate),
          }))
        : [],
  };
}

export default function ProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const proposalId = params.proposalId as string;

  const [project, setProject] = useState<ApiProject | null>(null);
  const [proposal, setProposal] = useState<ApiProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [markingSent, setMarkingSent] = useState(false);
  const [updatingShare, setUpdatingShare] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!overflowOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (overflowRef.current && !overflowRef.current.contains(event.target as Node)) {
        setOverflowOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [overflowOpen]);

  useEffect(() => {
    if (!projectId || !proposalId) return;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [projectRes, proposalRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`, {
            cache: "no-store",
            credentials: "include",
          }),
          fetch(`/api/projects/${projectId}/proposals/${proposalId}`, {
            cache: "no-store",
            credentials: "include",
          }),
        ]);

        const projectJson = await projectRes.json().catch(() => null);
        const proposalJson = await proposalRes.json().catch(() => null);

        if (!projectRes.ok) {
          throw new Error(projectJson?.error || "Failed to load project");
        }
        if (!proposalRes.ok) {
          throw new Error(proposalJson?.error || "Failed to load proposal");
        }

        setProject(projectJson.project ?? null);
        setProposal(proposalJson.proposal ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId, proposalId]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <p className="text-gray-500">טוען...</p>
      </main>
    );
  }

  if (error || !project || !proposal) {
    return (
      <main className="min-h-screen p-6 max-w-5xl mx-auto bg-app text-app">
        <Link href={`/project/${projectId}`} className="text-app opacity-70 text-sm hover:underline">
          ← חזרה לפרויקט
        </Link>
        <div className="mt-4 p-4 border border-red-200 bg-red-50 rounded-lg text-red-700">
          {error || "הצעת המחיר לא נמצאה"}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto bg-app text-app">
      <div className="mb-6">
        <Link href={`/project/${projectId}`} className="text-app opacity-70 text-sm hover:underline">
          ← חזרה לפרויקט
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{proposal.title}</h1>
              <ProposalStatusBadge status={proposal.status} />
            </div>
            <p className="text-app opacity-80 mt-1">{project.name}</p>
            <div className="mt-2 flex items-center gap-3 flex-wrap text-sm text-gray-500">
              <span>{proposal.proposalNumber ? `מס׳ ${proposal.proposalNumber}` : "ללא מספר"}</span>
              <span>עודכן {new Date(proposal.updatedAt).toLocaleString("he-IL")}</span>
              {proposal.sentAt ? (
                <span>נשלח {new Date(proposal.sentAt).toLocaleString("he-IL")}</span>
              ) : null}
              <span>{formatMoney(Number(proposal.totalAmount || 0), proposal.currency)}</span>
            </div>
          </div>

          <section className="flex items-center gap-2" aria-label="פעולות הצעה" ref={overflowRef}>
            <Link
              href={`${getProposalPrintPath(projectId, proposalId)}?print=1&title=${encodeURIComponent(getProposalFilenameSafe(proposal.proposalNumber, proposal.id))}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-lg bg-app text-white font-medium hover:opacity-90 shadow-sm"
            >
              הורדה כמסמך PDF
            </Link>
            <div className="relative">
              <button
                type="button"
                onClick={() => setOverflowOpen((o) => !o)}
                className="p-2.5 rounded-lg border border-app hover:opacity-90"
                aria-label="פעולות נוספות"
                aria-expanded={overflowOpen}
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {overflowOpen ? (
                <div className="absolute top-full right-0 mt-1 min-w-[12rem] py-1 rounded-lg border border-gray-200 bg-white shadow-lg z-10">
                  <Link
                    href={`/project/${projectId}/proposals/${proposalId}/print`}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full px-4 py-2 text-right text-sm hover:bg-gray-100"
                    onClick={() => setOverflowOpen(false)}
                  >
                    Preview Document
                  </Link>
                  <Link
                    href={`${getProposalPrintPath(projectId, proposalId)}?print=1&title=${encodeURIComponent(getProposalFilenameSafe(proposal.proposalNumber, proposal.id))}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full px-4 py-2 text-right text-sm hover:bg-gray-100"
                    onClick={() => setOverflowOpen(false)}
                  >
                    Print / Save PDF
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setOverflowOpen(false);
                      const base = typeof window !== "undefined" ? window.location.origin : "";
                      const shareUrl =
                        proposal.isPublicShared && proposal.publicShareToken
                          ? `${base}${getPublicProposalPath(proposal.publicShareToken)}`
                          : base
                            ? `${base}${getProposalPrintPath(projectId, proposalId)}`
                            : undefined;
                      const msg = getProposalWhatsAppMessage({
                        title: proposal.title,
                        proposalNumber: proposal.proposalNumber,
                        clientName: proposal.clientName,
                        totalAmount: proposal.totalAmount,
                        currency: proposal.currency,
                      });
                      const text = shareUrl ? `${msg}\n\n${shareUrl}` : msg;
                      window.open(
                        `https://wa.me/?text=${encodeURIComponent(text)}`,
                        "_blank",
                        "noopener,noreferrer"
                      );
                    }}
                    className="block w-full px-4 py-2 text-right text-sm hover:bg-gray-100"
                  >
                    Share via WhatsApp
                  </button>
                  <a
              href={(() => {
                const base = typeof window !== "undefined" ? window.location.origin : "";
                const shareUrl =
                  proposal.isPublicShared && proposal.publicShareToken
                    ? `${base}${getPublicProposalPath(proposal.publicShareToken)}`
                    : base
                      ? `${base}${getProposalPrintPath(projectId, proposalId)}`
                      : undefined;
                const subject = getProposalEmailSubject({
                  title: proposal.title,
                  proposalNumber: proposal.proposalNumber,
                  clientName: proposal.clientName,
                  totalAmount: proposal.totalAmount,
                  currency: proposal.currency,
                });
                const body = getProposalEmailBody(
                  {
                    title: proposal.title,
                    proposalNumber: proposal.proposalNumber,
                    clientName: proposal.clientName,
                    totalAmount: proposal.totalAmount,
                    currency: proposal.currency,
                  },
                  shareUrl
                );
                return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
              })()}
              className="block w-full px-4 py-2 text-right text-sm hover:bg-gray-100"
              onClick={() => setOverflowOpen(false)}
            >
              Share via Email
            </a>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    type="button"
                    disabled={duplicating}
                    onClick={async () => {
                      setDuplicating(true);
                      setError(null);
                      setOverflowOpen(false);
                      try {
                        const res = await fetch(
                          `/api/projects/${projectId}/proposals/${proposalId}/duplicate`,
                          { method: "POST", credentials: "include" }
                        );
                        const json = await res.json().catch(() => null);
                        if (!res.ok) throw new Error(json?.error || "Failed to duplicate proposal");
                        const newProposalId = json?.proposal?.id;
                        if (!newProposalId) throw new Error("Proposal id is missing");
                        router.push(`/project/${projectId}/proposals/${newProposalId}`);
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "Something went wrong");
                      } finally {
                        setDuplicating(false);
                      }
                    }}
                    className="block w-full px-4 py-2 text-right text-sm hover:bg-gray-100 disabled:opacity-50"
                  >
                    {duplicating ? "משכפל..." : "Duplicate Proposal"}
                  </button>
                  {proposal.status === "DRAFT" ? (
                    <button
                      type="button"
                      disabled={markingSent}
                      onClick={async () => {
                        setMarkingSent(true);
                        setError(null);
                        setOverflowOpen(false);
                        try {
                          const res = await fetch(
                            `/api/projects/${projectId}/proposals/${proposalId}`,
                            {
                              method: "PATCH",
                              credentials: "include",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                ...buildFormValues(proposal),
                                status: "SENT",
                              }),
                            }
                          );
                          const json = await res.json().catch(() => null);
                          if (!res.ok) throw new Error(json?.error || "Failed to update status");
                          const refreshed = await fetch(
                            `/api/projects/${projectId}/proposals/${proposalId}`,
                            { cache: "no-store", credentials: "include" }
                          );
                          const refreshedJson = await refreshed.json().catch(() => null);
                          if (refreshed.ok && refreshedJson?.proposal) {
                            setProposal(refreshedJson.proposal);
                          }
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Something went wrong");
                        } finally {
                          setMarkingSent(false);
                        }
                      }}
                      className="block w-full px-4 py-2 text-right text-sm hover:bg-gray-100 disabled:opacity-50"
                    >
                      {markingSent ? "מעדכן..." : "Mark as Sent"}
                    </button>
                  ) : null}
                  <div className="border-t border-gray-100 my-1" />
                  {proposal.isPublicShared ? (
                    <>
                      <button
                        type="button"
                        disabled={updatingShare}
                        onClick={async () => {
                          setUpdatingShare(true);
                          setError(null);
                          setOverflowOpen(false);
                          try {
                            const res = await fetch(
                              `/api/projects/${projectId}/proposals/${proposalId}/share`,
                              {
                                method: "PATCH",
                                credentials: "include",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ enable: false }),
                              }
                            );
                            const json = await res.json().catch(() => null);
                            if (!res.ok) throw new Error(json?.error || "Failed to update");
                            const ref = await fetch(
                              `/api/projects/${projectId}/proposals/${proposalId}`,
                              { cache: "no-store", credentials: "include" }
                            );
                            const refJson = await ref.json().catch(() => null);
                            if (ref.ok && refJson?.proposal) setProposal(refJson.proposal);
                          } catch (e) {
                            setError(e instanceof Error ? e.message : "Something went wrong");
                          } finally {
                            setUpdatingShare(false);
                          }
                        }}
                        className="block w-full px-4 py-2 text-right text-sm hover:bg-gray-100 disabled:opacity-50"
                      >
                        {updatingShare ? "מעדכן..." : "Disable Public Share Link"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!proposal.publicShareToken) return;
                          const base = typeof window !== "undefined" ? window.location.origin : "";
                          const url = `${base}${getPublicProposalPath(proposal.publicShareToken)}`;
                          void navigator.clipboard.writeText(url).then(() => {
                            setCopySuccess(true);
                            setTimeout(() => setCopySuccess(false), 2000);
                          });
                          setOverflowOpen(false);
                        }}
                        className="block w-full px-4 py-2 text-right text-sm hover:bg-gray-100"
                      >
                        {copySuccess ? "הועתק!" : "Copy Public Link"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={updatingShare}
                      onClick={async () => {
                        setUpdatingShare(true);
                        setError(null);
                        setOverflowOpen(false);
                        try {
                          const res = await fetch(
                            `/api/projects/${projectId}/proposals/${proposalId}/share`,
                            {
                              method: "PATCH",
                              credentials: "include",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ enable: true }),
                            }
                          );
                          const json = await res.json().catch(() => null);
                          if (!res.ok) throw new Error(json?.error || "Failed to update");
                          const ref = await fetch(
                            `/api/projects/${projectId}/proposals/${proposalId}`,
                            { cache: "no-store", credentials: "include" }
                          );
                          const refJson = await ref.json().catch(() => null);
                          if (ref.ok && refJson?.proposal) setProposal(refJson.proposal);
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Something went wrong");
                        } finally {
                          setUpdatingShare(false);
                        }
                      }}
                      className="block w-full px-4 py-2 text-right text-sm hover:bg-gray-100 disabled:opacity-50"
                    >
                      {updatingShare ? "מעדכן..." : "Enable Public Share Link"}
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      <ProposalForm
        initialValues={buildFormValues(proposal)}
        initialStatus={proposal.status}
        showStatusField
        submitLabel="שמור שינויים"
        busy={saving}
        projectName={project.name}
        onSubmit={async (values, status) => {
          setSaving(true);
          setError(null);
          try {
            const res = await fetch(
              `/api/projects/${projectId}/proposals/${proposalId}`,
              {
                method: "PATCH",
                credentials: "include",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  ...values,
                  status,
                }),
              }
            );
            const json = await res.json().catch(() => null);
            if (!res.ok) {
              throw new Error(json?.error || "Failed to update proposal");
            }

            const refreshed = await fetch(
              `/api/projects/${projectId}/proposals/${proposalId}`,
              {
                cache: "no-store",
                credentials: "include",
              }
            );
            const refreshedJson = await refreshed.json().catch(() => null);
            if (!refreshed.ok) {
              throw new Error(refreshedJson?.error || "Failed to refresh proposal");
            }
            setProposal(refreshedJson.proposal ?? null);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong");
          } finally {
            setSaving(false);
          }
        }}
      />

      {error ? (
        <div className="mt-4 p-4 border border-red-200 bg-red-50 rounded-lg text-red-700">
          {error}
        </div>
      ) : null}
    </main>
  );
}
