export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { Prisma, ProposalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import {
  calculateProposalTotals,
  parseDateInput,
  toFiniteNumber,
  type ProposalFormItemInput,
} from "@/lib/proposals";

type TimelineStepInput = {
  title?: string;
  description?: string;
  targetDate?: string;
};

type UpdateProposalBody = {
  title?: string;
  documentDescription?: string;
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessAddress?: string;
  logoUrl?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  proposalNumber?: string;
  issueDate?: string;
  validUntil?: string;
  currency?: string;
  vatRate?: number | string;
  status?: string;
  freeTextContent?: string;
  notesInternal?: string;
  paymentTerms?: string;
  paymentTermsNote?: string;
  footerText?: string;
  items?: ProposalFormItemInput[];
  timelineSteps?: TimelineStepInput[];
};

async function requireProjectMember(projectId: string, userId: string) {
  return prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
    select: {
      id: true,
      role: true,
    },
  });
}

function toDecimal(value: number, scale = 2) {
  return new Prisma.Decimal(value.toFixed(scale));
}

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() || null : null;
}

function normalizeStatus(value: unknown): ProposalStatus {
  if (value === ProposalStatus.SENT) return ProposalStatus.SENT;
  if (value === ProposalStatus.APPROVED) return ProposalStatus.APPROVED;
  if (value === ProposalStatus.REJECTED) return ProposalStatus.REJECTED;
  if (value === ProposalStatus.ARCHIVED) return ProposalStatus.ARCHIVED;
  return ProposalStatus.DRAFT;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string; proposalId: string }> }
) {
  const userId = await getSessionUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: projectId, proposalId } = await ctx.params;
  if (!projectId || !proposalId) {
    return NextResponse.json(
      { error: "projectId and proposalId are required" },
      { status: 400 }
    );
  }

  const membership = await requireProjectMember(projectId, userId);
  if (!membership) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const proposal = await prisma.proposal.findFirst({
    where: {
      id: proposalId,
      projectId,
    },
    select: {
      id: true,
      projectId: true,
      title: true,
      documentDescription: true,
      businessName: true,
      businessEmail: true,
      businessPhone: true,
      businessAddress: true,
      logoUrl: true,
      clientName: true,
      clientEmail: true,
      clientPhone: true,
      proposalNumber: true,
      issueDate: true,
      validUntil: true,
      currency: true,
      vatRate: true,
      status: true,
      sentAt: true,
      publicShareToken: true,
      isPublicShared: true,
      publicSharedAt: true,
      freeTextContent: true,
      notesInternal: true,
      paymentTerms: true,
      paymentTermsNote: true,
      footerText: true,
      subtotal: true,
      vatAmount: true,
      totalAmount: true,
      createdAt: true,
      updatedAt: true,
      items: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          proposalId: true,
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
          createdAt: true,
          updatedAt: true,
        },
      },
      timelineSteps: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          proposalId: true,
          title: true,
          description: true,
          targetDate: true,
          sortOrder: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  return NextResponse.json({ proposal });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; proposalId: string }> }
) {
  const userId = await getSessionUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: projectId, proposalId } = await ctx.params;
  if (!projectId || !proposalId) {
    return NextResponse.json(
      { error: "projectId and proposalId are required" },
      { status: 400 }
    );
  }

  const membership = await requireProjectMember(projectId, userId);
  if (!membership) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let body: UpdateProposalBody;
  try {
    body = (await req.json()) as UpdateProposalBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const existing = await prisma.proposal.findFirst({
    where: {
      id: proposalId,
      projectId,
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const rawItems = Array.isArray(body.items) ? body.items : [];
  const items = rawItems
    .map((item) => ({
      name: typeof item.name === "string" ? item.name.trim() : "",
      description: typeof item.description === "string" ? item.description.trim() : "",
      category: typeof (item as { category?: string }).category === "string"
        ? (item as { category: string }).category.trim()
        : "",
      quantity: toFiniteNumber(item.quantity, 0),
      unitPrice: toFiniteNumber(item.unitPrice, 0),
      vatRate: toFiniteNumber(item.vatRate, toFiniteNumber(body.vatRate, 18)),
    }))
    .filter((item) => item.name);

  const totals = calculateProposalTotals(items);
  const issueDate = parseDateInput(typeof body.issueDate === "string" ? body.issueDate : "");
  const validUntil = parseDateInput(
    typeof body.validUntil === "string" ? body.validUntil : ""
  );
  const newStatus = normalizeStatus(body.status);
  const setSentAt = newStatus === ProposalStatus.SENT ? new Date() : undefined;

  const rawTimelineSteps = Array.isArray(body.timelineSteps) ? body.timelineSteps : [];
  const timelineSteps = rawTimelineSteps
    .map((step, index) => ({
      title: typeof step.title === "string" ? step.title.trim() : "",
      description: typeof step.description === "string" ? step.description.trim() || null : null,
      targetDate: parseDateInput(typeof step.targetDate === "string" ? step.targetDate : ""),
      sortOrder: index,
    }))
    .filter((step) => step.title);

  const proposal = await prisma.$transaction(async (tx) => {
    await tx.proposalItem.deleteMany({
      where: { proposalId },
    });
    await tx.proposalTimelineStep.deleteMany({
      where: { proposalId },
    });

    return tx.proposal.update({
      where: { id: proposalId },
      data: {
        title,
        ...(setSentAt !== undefined && { sentAt: setSentAt }),
        documentDescription:
          normalizeOptionalString(body.documentDescription),
        businessName: normalizeOptionalString(body.businessName),
        businessEmail: normalizeOptionalString(body.businessEmail),
        businessPhone: normalizeOptionalString(body.businessPhone),
        businessAddress: normalizeOptionalString(body.businessAddress),
        logoUrl: normalizeOptionalString(body.logoUrl),
        clientName: normalizeOptionalString(body.clientName),
        clientEmail: normalizeOptionalString(body.clientEmail),
        clientPhone: normalizeOptionalString(body.clientPhone),
        proposalNumber:
          typeof body.proposalNumber === "string"
            ? body.proposalNumber.trim() || null
            : null,
        issueDate,
        validUntil,
        currency:
          typeof body.currency === "string" && body.currency.trim()
            ? body.currency.trim().toUpperCase()
            : "ILS",
        vatRate: toDecimal(toFiniteNumber(body.vatRate, 18)),
        status: newStatus,
        freeTextContent: normalizeOptionalString(body.freeTextContent),
        notesInternal: normalizeOptionalString(body.notesInternal),
        paymentTerms: normalizeOptionalString(body.paymentTerms),
        paymentTermsNote: normalizeOptionalString(body.paymentTermsNote),
        footerText: normalizeOptionalString(body.footerText),
        subtotal: toDecimal(totals.subtotal),
        vatAmount: toDecimal(totals.vatAmount),
        totalAmount: toDecimal(totals.totalAmount),
        items: {
          create: totals.items.map((item) => ({
            name: item.name,
            description: item.description || null,
            category: (item as { category?: string }).category?.trim() || null,
            quantity: toDecimal(item.quantity, 3),
            unitPrice: toDecimal(item.unitPrice),
            vatRate: toDecimal(item.vatRate),
            lineSubtotal: toDecimal(item.lineSubtotal),
            lineVat: toDecimal(item.lineVat),
            lineTotal: toDecimal(item.lineTotal),
            sortOrder: item.sortOrder,
          })),
        },
        timelineSteps: timelineSteps.length > 0 ? {
          create: timelineSteps.map((step) => ({
            title: step.title,
            description: step.description,
            targetDate: step.targetDate,
            sortOrder: step.sortOrder,
          })),
        } : undefined,
      },
      select: {
        id: true,
      },
    });
  });

  return NextResponse.json({ proposal });
}
