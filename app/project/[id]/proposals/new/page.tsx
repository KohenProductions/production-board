"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProposalForm } from "@/components/ProposalForm";
import { DEFAULT_PROPOSAL_FORM, type ProposalFormValues } from "@/lib/proposals";

type ApiProject = {
  id: string;
  name: string;
  clientName?: string | null;
};

type MeUser = {
  id: string;
  username: string;
  defaultBusinessName?: string | null;
  defaultBusinessEmail?: string | null;
  defaultBusinessPhone?: string | null;
  defaultBusinessAddress?: string | null;
  defaultLogoUrl?: string | null;
  defaultPaymentTerms?: string | null;
  defaultFooterText?: string | null;
  defaultVatRate?: string | number | null;
};

export default function NewProposalPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<ApiProject | null>(null);
  const [meUser, setMeUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [projectRes, meRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`, {
            cache: "no-store",
            credentials: "include",
          }),
          fetch("/api/auth/me", {
            cache: "no-store",
            credentials: "include",
          }),
        ]);

        const projectJson = await projectRes.json().catch(() => null);
        const meJson = await meRes.json().catch(() => null);

        if (!projectRes.ok) {
          throw new Error(projectJson?.error || "Failed to load project");
        }
        setProject(projectJson.project ?? null);

        if (meRes.ok && meJson?.user) {
          setMeUser(meJson.user as MeUser);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  const initialValues: ProposalFormValues = {
    ...DEFAULT_PROPOSAL_FORM,
    clientName: project?.clientName ?? "",
    title: project ? `הצעת מחיר עבור ${project.name}` : "",
    businessName: meUser?.defaultBusinessName ?? DEFAULT_PROPOSAL_FORM.businessName,
    businessEmail: meUser?.defaultBusinessEmail ?? DEFAULT_PROPOSAL_FORM.businessEmail,
    businessPhone: meUser?.defaultBusinessPhone ?? DEFAULT_PROPOSAL_FORM.businessPhone,
    businessAddress:
      meUser?.defaultBusinessAddress ?? DEFAULT_PROPOSAL_FORM.businessAddress,
    logoUrl: meUser?.defaultLogoUrl ?? DEFAULT_PROPOSAL_FORM.logoUrl,
    paymentTerms: meUser?.defaultPaymentTerms ?? DEFAULT_PROPOSAL_FORM.paymentTerms,
    footerText: meUser?.defaultFooterText ?? DEFAULT_PROPOSAL_FORM.footerText,
    vatRate:
      meUser?.defaultVatRate != null && meUser.defaultVatRate !== ""
        ? Number(meUser.defaultVatRate)
        : DEFAULT_PROPOSAL_FORM.vatRate,
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <p className="text-gray-500">טוען...</p>
      </main>
    );
  }

  if (error || !project) {
    return (
      <main className="min-h-screen p-6 max-w-5xl mx-auto bg-app text-app">
        <Link href={`/project/${projectId}`} className="text-app opacity-70 text-sm hover:underline">
          ← חזרה לפרויקט
        </Link>
        <div className="mt-4 p-4 border border-red-200 bg-red-50 rounded-lg text-red-700">
          {error || "הפרויקט לא נמצא"}
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
        <h1 className="text-2xl font-bold mt-2">יצירת הצעת מחיר</h1>
        <p className="text-app opacity-80 mt-1">{project.name}</p>
      </div>

      <ProposalForm
        initialValues={initialValues}
        submitLabel="שמור הצעה"
        busy={saving}
        projectName={project.name}
        onSubmit={async (values) => {
          setSaving(true);
          setError(null);
          try {
            const res = await fetch(`/api/projects/${projectId}/proposals`, {
              method: "POST",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(values),
            });
            const json = await res.json().catch(() => null);
            if (!res.ok) {
              throw new Error(json?.error || "Failed to create proposal");
            }
            const proposalId = json?.proposal?.id;
            if (!proposalId) {
              throw new Error("Proposal id is missing");
            }
            router.push(`/project/${projectId}/proposals/${proposalId}`);
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
