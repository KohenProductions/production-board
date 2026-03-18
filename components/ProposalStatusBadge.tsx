"use client";

import { getProposalStatusMeta, type ProposalStatus } from "@/lib/proposals";

type ProposalStatusBadgeProps = {
  status: ProposalStatus;
};

export function ProposalStatusBadge({ status }: ProposalStatusBadgeProps) {
  const meta = getProposalStatusMeta(status);

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}
