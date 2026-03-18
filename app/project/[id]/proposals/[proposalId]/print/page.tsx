"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ProposalDocument } from "@/components/proposals/ProposalDocument";
import { getProposalFilenameSafe } from "@/lib/proposal-delivery";
import type { ProposalStatus } from "@/lib/proposals";

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
  lineSubtotal: string;
  lineVat: string;
  lineTotal: string;
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
  items: ApiProposalItem[];
  timelineSteps?: ApiProposalTimelineStep[];
};

export default function ProposalPrintPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const proposalId = params.proposalId as string;
  const shouldPrint = searchParams.get("print") === "1";
  const titleParam = searchParams.get("title");

  const [project, setProject] = useState<ApiProject | null>(null);
  const [proposal, setProposal] = useState<ApiProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const didTriggerPrintRef = useRef(false);

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

  useEffect(() => {
    if (!proposal) return;
    const docTitle =
      titleParam?.trim() ||
      `${getProposalFilenameSafe(proposal.proposalNumber, proposal.id)}.pdf`;
    const prev = document.title;
    document.title = docTitle;
    return () => {
      document.title = prev;
    };
  }, [proposal, titleParam]);

  useEffect(() => {
    if (!shouldPrint || !project || !proposal || didTriggerPrintRef.current) return;
    didTriggerPrintRef.current = true;
    const timeoutId = window.setTimeout(() => {
      window.print();
    }, 200);
    return () => window.clearTimeout(timeoutId);
  }, [project, proposal, shouldPrint]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f3f4f6] p-8 print:bg-white print:p-0">
        <p className="text-gray-500">טוען מסמך...</p>
      </main>
    );
  }

  if (error || !project || !proposal) {
    return (
      <main className="min-h-screen bg-[#f3f4f6] p-6 print:bg-white print:p-0">
        <div className="mx-auto max-w-5xl">
          <div className="print:hidden">
            <Link
              href={`/project/${projectId}/proposals/${proposalId}`}
              className="text-sm text-gray-600 hover:underline"
            >
              ← חזרה להצעה
            </Link>
          </div>
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error || "הצעת המחיר לא נמצאה"}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="proposal-print-page min-h-screen bg-[#f3f4f6] py-8 print:bg-white print:py-0">
      <div className="mx-auto max-w-[230mm] px-4 print:max-w-none print:px-0">
        <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
          <Link
            href={`/project/${projectId}/proposals/${proposalId}`}
            className="text-sm text-gray-600 hover:underline"
          >
            ← חזרה להצעה
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800"
            >
              Print / Save PDF
            </button>
          </div>
        </div>

        <ProposalDocument projectName={project.name} proposal={proposal} />
      </div>
    </main>
  );
}
