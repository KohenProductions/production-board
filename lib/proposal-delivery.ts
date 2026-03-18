import { formatMoney } from "./proposals";

export type ProposalForShare = {
  title: string;
  proposalNumber?: string | null;
  clientName?: string | null;
  totalAmount: string | number;
  currency: string;
};

/**
 * Filename-safe string for proposal (e.g. for document title / Save as PDF).
 */
export function getProposalFilenameSafe(
  proposalNumber: string | null | undefined,
  proposalId: string
): string {
  const base = proposalNumber?.trim();
  if (base && /^[A-Za-z0-9\-_.]+$/.test(base)) {
    return `proposal-${base}`;
  }
  return `proposal-${proposalId}`;
}

/**
 * Relative path to proposal print page.
 */
export function getProposalPrintPath(projectId: string, proposalId: string): string {
  return `/project/${projectId}/proposals/${proposalId}/print`;
}

/**
 * Relative path to public proposal page (no auth).
 */
export function getPublicProposalPath(token: string): string {
  return `/p/${encodeURIComponent(token)}`;
}

/**
 * Build WhatsApp share message (text only; link can be appended by caller if desired).
 */
export function getProposalWhatsAppMessage(proposal: ProposalForShare): string {
  const parts: string[] = [
    `שלום${proposal.clientName?.trim() ? ` ${proposal.clientName}` : ""},`,
    "",
    `מצורף קישור להצעת המחיר: ${proposal.title}${proposal.proposalNumber?.trim() ? ` (${proposal.proposalNumber})` : ""}.`,
  ];
  const total = formatMoney(Number(proposal.totalAmount ?? 0), proposal.currency || "ILS");
  parts.push(`סה״כ: ${total}`);
  parts.push("");
  parts.push("נשמח לשאלות.");
  return parts.join("\n");
}

/**
 * Email subject for proposal share.
 */
export function getProposalEmailSubject(proposal: ProposalForShare): string {
  const num = proposal.proposalNumber?.trim();
  return num
    ? `הצעת מחיר ${proposal.title} (${num})`
    : `הצעת מחיר ${proposal.title}`;
}

/**
 * Email body for proposal share (plain text).
 */
export function getProposalEmailBody(proposal: ProposalForShare, printUrl?: string): string {
  const lines: string[] = [
    `שלום${proposal.clientName?.trim() ? ` ${proposal.clientName}` : ""},`,
    "",
    `מצורף קישור להצעת המחיר: ${proposal.title}${proposal.proposalNumber?.trim() ? ` (${proposal.proposalNumber})` : ""}.`,
    `סה״כ: ${formatMoney(Number(proposal.totalAmount ?? 0), proposal.currency || "ILS")}`,
    "",
  ];
  if (printUrl) {
    lines.push(printUrl);
    lines.push("");
  }
  lines.push("נשמח לשאלות.");
  return lines.join("\n");
}
