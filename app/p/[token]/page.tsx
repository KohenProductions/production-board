"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ProposalDocument } from "@/components/proposals/ProposalDocument";

type ApiProposalItem = {
  id: string;
  name: string;
  description: string | null;
  quantity: string;
  unitPrice: string;
  vatRate: string;
  lineSubtotal: string;
  lineVat: string;
  lineTotal: string;
  sortOrder: number;
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
  paymentTerms: string | null;
  footerText: string | null;
  subtotal: string;
  vatAmount: string;
  totalAmount: string;
  freeTextContent: string | null;
  items: ApiProposalItem[];
  timelineSteps?: ApiProposalTimelineStep[];
};

export default function PublicProposalPage() {
  const params = useParams();
  const token = params.token as string;
  const [projectName, setProjectName] = useState("");
  const [proposal, setProposal] = useState<ApiProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    void (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const res = await fetch(`/api/p/proposals/${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json().catch(() => null);
        if (!data?.proposal) {
          setNotFound(true);
          return;
        }
        setProposal(data.proposal);
        setProjectName(data.projectName ?? "");
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <main
        className="min-h-screen flex items-center justify-center bg-gray-100 p-8"
        dir="rtl"
      >
        <p className="text-gray-500">טוען...</p>
      </main>
    );
  }

  if (notFound || !proposal) {
    return (
      <main
        className="min-h-screen flex items-center justify-center bg-gray-100 p-8"
        dir="rtl"
      >
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-800">הצעת המחיר לא נמצאה</h1>
          <p className="mt-2 text-gray-600">
            הקישור לא תקף או ששיתוף ההצעה בוטל.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen bg-gray-100 py-8"
      dir="rtl"
    >
      <div className="mx-auto max-w-[230mm] px-4">
        <ProposalDocument projectName={projectName} proposal={proposal} />
      </div>
    </main>
  );
}
