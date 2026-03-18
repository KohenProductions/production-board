export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Public (no-auth) fetch of a proposal by share token.
 * Only returns the proposal if isPublicShared is true and token matches.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;
  if (!token?.trim()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const proposal = await prisma.proposal.findFirst({
    where: {
      publicShareToken: token.trim(),
      isPublicShared: true,
    },
    include: {
      project: { select: { name: true } },
      items: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          quantity: true,
          unitPrice: true,
          vatRate: true,
          lineSubtotal: true,
          lineVat: true,
          lineTotal: true,
          sortOrder: true,
        },
      },
      timelineSteps: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          targetDate: true,
          sortOrder: true,
        },
      },
    },
  });

  if (!proposal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const projectName = proposal.project?.name ?? "";
  const items = proposal.items.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    category: item.category,
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice),
    vatRate: String(item.vatRate),
    lineSubtotal: String(item.lineSubtotal),
    lineVat: String(item.lineVat),
    lineTotal: String(item.lineTotal),
    sortOrder: item.sortOrder,
  }));

  const timelineSteps = proposal.timelineSteps.map((step) => ({
    id: step.id,
    title: step.title,
    description: step.description,
    targetDate: step.targetDate,
    sortOrder: step.sortOrder,
  }));

  const payload = {
    proposal: {
      id: proposal.id,
      title: proposal.title,
      documentDescription: proposal.documentDescription,
      businessName: proposal.businessName,
      businessEmail: proposal.businessEmail,
      businessPhone: proposal.businessPhone,
      businessAddress: proposal.businessAddress,
      logoUrl: proposal.logoUrl,
      clientName: proposal.clientName,
      clientEmail: proposal.clientEmail,
      clientPhone: proposal.clientPhone,
      proposalNumber: proposal.proposalNumber,
      issueDate: proposal.issueDate,
      validUntil: proposal.validUntil,
      currency: proposal.currency,
      vatRate: String(proposal.vatRate),
      freeTextContent: proposal.freeTextContent,
      paymentTerms: proposal.paymentTerms,
      paymentTermsNote: proposal.paymentTermsNote,
      footerText: proposal.footerText,
      subtotal: String(proposal.subtotal),
      vatAmount: String(proposal.vatAmount),
      totalAmount: String(proposal.totalAmount),
      items,
      timelineSteps,
    },
    projectName,
  };

  return NextResponse.json(payload);
}
