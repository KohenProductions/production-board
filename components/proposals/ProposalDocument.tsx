"use client";

import { formatMoney } from "@/lib/proposals";

type ProposalDocumentItem = {
  id?: string;
  name: string;
  description?: string | null;
  category?: string | null;
  quantity: string | number;
  unitPrice: string | number;
  vatRate: string | number;
  lineSubtotal?: string | number;
  lineVat?: string | number;
  lineTotal?: string | number;
};

type ProposalDocumentTimelineStep = {
  title: string;
  description?: string | null;
  targetDate?: string | null;
};

type ProposalDocumentProposal = {
  title: string;
  proposalNumber?: string | null;
  issueDate?: string | null;
  validUntil?: string | null;
  currency: string;
  vatRate: string | number;
  businessName?: string | null;
  businessEmail?: string | null;
  businessPhone?: string | null;
  businessAddress?: string | null;
  logoUrl?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  documentDescription?: string | null;
  paymentTerms?: string | null;
  paymentTermsNote?: string | null;
  footerText?: string | null;
  subtotal: string | number;
  vatAmount: string | number;
  totalAmount: string | number;
  freeTextContent?: string | null;
  items: ProposalDocumentItem[];
  timelineSteps?: ProposalDocumentTimelineStep[];
};

type ProposalDocumentProps = {
  projectName: string;
  proposal: ProposalDocumentProposal;
};

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("he-IL");
}

function formatNumber(value: string | number, maximumFractionDigits = 2) {
  const numericValue = Number(value ?? 0);
  return new Intl.NumberFormat("he-IL", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(Number.isFinite(numericValue) ? numericValue : 0);
}

function hasText(value: string | null | undefined) {
  return Boolean(value && value.trim());
}

export function ProposalDocument({
  projectName,
  proposal,
}: ProposalDocumentProps) {
  const issueDate = formatDate(proposal.issueDate);
  const validUntil = formatDate(proposal.validUntil);
  const currency = proposal.currency || "ILS";

  return (
    <article
      className="proposal-print-sheet mx-auto w-full max-w-[210mm] overflow-hidden rounded-2xl bg-[#fbfaf7] text-slate-900 shadow-sm ring-1 ring-slate-900/5 print:rounded-none print:bg-white print:shadow-none print:ring-0"
      dir="rtl"
    >
      {/* PART 1: Compact header */}
      <header className="border-b border-slate-200 bg-white/70 px-6 py-4 backdrop-blur print:bg-white print:px-4 print:py-3">
        <div className="mb-3 h-1 w-14 rounded-full bg-emerald-700/90 print:hidden" aria-hidden />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {hasText(proposal.logoUrl) ? (
              <div className="flex h-12 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5">
                <img
                  src={proposal.logoUrl ?? ""}
                  alt={proposal.businessName?.trim() || "Business logo"}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex h-12 w-24 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400">
                לוגו
              </div>
            )}
            <div className="min-w-0 text-sm text-slate-600">
              <div className="font-semibold tracking-tight text-slate-900">
                {proposal.businessName?.trim() || "שם העסק"}
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0 text-xs text-slate-500">
                {hasText(proposal.businessAddress) ? <span>{proposal.businessAddress}</span> : null}
                {hasText(proposal.businessPhone) ? <span>{proposal.businessPhone}</span> : null}
                {hasText(proposal.businessEmail) ? <span>{proposal.businessEmail}</span> : null}
                {!hasText(proposal.businessAddress) && !hasText(proposal.businessPhone) && !hasText(proposal.businessEmail) ? (
                  <span className="text-slate-400">כתובת, טלפון, אימייל</span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-4 gap-y-0 text-xs text-slate-500">
            <span>
              <span className="text-slate-400">מספר הצעה:</span> {proposal.proposalNumber?.trim() || "—"}
            </span>
            <span>
              <span className="text-slate-400">תאריך הנפקה:</span> {issueDate || "—"}
            </span>
            <span>
              <span className="text-slate-400">בתוקף עד:</span> {validUntil || "—"}
            </span>
          </div>
        </div>
        <h1 className="mt-4 text-[22px] font-semibold leading-tight tracking-tight text-slate-900">
          {proposal.title}
        </h1>
        {(hasText(proposal.clientEmail) || hasText(proposal.clientPhone)) ? (
          <p className="mt-1 text-xs text-slate-500">
            {[proposal.clientEmail, proposal.clientPhone].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        {hasText(proposal.documentDescription) ? (
          <p className="mt-1.5 max-w-[56ch] text-sm leading-6 text-slate-600 line-clamp-2">
            {proposal.documentDescription}
          </p>
        ) : null}
      </header>

      <div className="space-y-6 px-6 py-6 print:bg-white print:px-4 print:py-4">
        {/* PART 2: Proposal breakdown first */}
        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-900">פירוט הצעה</h2>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-50/70">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3 text-right font-semibold text-slate-700">
                    פריט
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-right font-semibold text-slate-700">
                    קטגוריה
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-right font-semibold text-slate-700">
                    כמות
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-right font-semibold text-slate-700">
                    מחיר יחידה
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-right font-semibold text-slate-700">
                    מע״מ
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-right font-semibold text-slate-700">
                    סה״כ
                  </th>
                </tr>
              </thead>
              <tbody>
                {proposal.items.map((item, index) => (
                  <tr key={item.id ?? `${item.name}-${index}`} className="align-top odd:bg-white even:bg-slate-50/30">
                    <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-900">
                      {item.name || "—"}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-slate-600">
                      {(item.category ?? item.description)?.trim() || "—"}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                      {formatNumber(item.quantity, 3)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                      {formatMoney(Number(item.unitPrice ?? 0), currency)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                      {formatNumber(item.vatRate)}%
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-900">
                      {formatMoney(Number(item.lineTotal ?? 0), currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex justify-end">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 text-sm">
              <span className="text-slate-600">לפני מע״מ</span>
              <span className="font-semibold text-slate-900">
                {formatMoney(Number(proposal.subtotal ?? 0), currency)}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 text-sm">
              <span className="text-slate-600">מע״מ ({formatNumber(proposal.vatRate)}%)</span>
              <span className="font-semibold text-slate-900">
                {formatMoney(Number(proposal.vatAmount ?? 0), currency)}
              </span>
            </div>
            <div className="flex items-center justify-between bg-emerald-50/60 px-5 py-4">
              <span className="text-base font-bold text-slate-900">סה״כ</span>
              <span className="text-xl font-extrabold tracking-tight text-slate-900">
                {formatMoney(Number(proposal.totalAmount ?? 0), currency)}
              </span>
            </div>
          </div>
        </section>

        {/* PART 3: Horizontal work process timeline (after breakdown & totals) */}
        {proposal.timelineSteps && proposal.timelineSteps.length > 0 ? (
          <section className="pt-2 flex flex-col items-center">
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-900 w-full text-center">תהליך העבודה</h2>
            <div className="flex flex-wrap items-stretch gap-0 justify-center">
              {proposal.timelineSteps.map((step, index) => {
                const stepDate = formatDate(step.targetDate);
                const isLast = index === proposal.timelineSteps!.length - 1;
                return (
                  <div key={index} className="flex flex-wrap items-center gap-0">
                    <div className="flex min-w-0 max-w-[12rem] flex-col rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-right shadow-[0_1px_0_rgba(15,23,42,0.04)] print:shadow-none">
                      <div className="font-semibold text-slate-900 text-sm leading-tight">{step.title || "—"}</div>
                      {stepDate ? (
                        <div className="mt-0.5 text-xs text-slate-500">{stepDate}</div>
                      ) : null}
                      {hasText(step.description) ? (
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
                          {step.description}
                        </p>
                      ) : null}
                    </div>
                    {!isLast ? (
                      <div className="flex shrink-0 items-center gap-0.5 px-1 py-2" aria-hidden>
                        <span className="inline-block h-px w-2 bg-slate-300" />
                        <svg className="h-3.5 w-3.5 shrink-0 text-slate-400 rtl:rotate-180" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 2l4 4-4 4" />
                        </svg>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {hasText(proposal.freeTextContent) ? (
          <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
            <h2 className="text-sm font-semibold tracking-wide text-slate-900">הערות</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {proposal.freeTextContent}
            </p>
          </section>
        ) : null}

        {(hasText(proposal.paymentTerms) || hasText(proposal.paymentTermsNote)) ? (
          <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
            <h2 className="text-sm font-semibold tracking-wide text-slate-900">תנאי תשלום</h2>
            {hasText(proposal.paymentTerms) ? (
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-900">
                {proposal.paymentTerms}
              </p>
            ) : null}
            {hasText(proposal.paymentTermsNote) ? (
              <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {proposal.paymentTermsNote}
              </p>
            ) : null}
          </section>
        ) : null}

        {hasText(proposal.footerText) ? (
          <footer className="border-t border-slate-200 pt-6 text-sm leading-7 text-slate-600">
            {proposal.footerText}
          </footer>
        ) : null}
      </div>
    </article>
  );
}
