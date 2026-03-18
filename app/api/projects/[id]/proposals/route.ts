export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { Prisma, ProposalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateNextProposalNumber } from "@/lib/proposal-numbers";
import { getSessionUserId } from "@/lib/session";
import {
  calculateProposalTotals,
  parseDateInput,
  toFiniteNumber,
  type ProposalFormItemInput,
  type ProposalTimelineStepInput,
} from "@/lib/proposals";

type CreateProposalBody = {
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
  freeTextContent?: string;
  notesInternal?: string;
  paymentTerms?: string;
  paymentTermsNote?: string;
  footerText?: string;
  items?: ProposalFormItemInput[];
  timelineSteps?: ProposalTimelineStepInput[];
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

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: projectId } = await ctx.params;
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const membership = await requireProjectMember(projectId, userId);
  if (!membership) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const proposals = await prisma.proposal.findMany({
    where: { projectId },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      projectId: true,
      title: true,
      status: true,
      totalAmount: true,
      updatedAt: true,
      proposalNumber: true,
      currency: true,
    },
  });

  return NextResponse.json({ proposals });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: projectId } = await ctx.params;
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const membership = await requireProjectMember(projectId, userId);
  if (!membership) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let body: CreateProposalBody;
  try {
    body = (await req.json()) as CreateProposalBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
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
    const manualProposalNumber =
      typeof body.proposalNumber === "string" ? body.proposalNumber.trim() : "";
    const proposalNumber =
      manualProposalNumber || (await generateNextProposalNumber(tx));

    return tx.proposal.create({
      data: {
        projectId,
        title,
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
        proposalNumber,
        issueDate,
        validUntil,
        currency:
          typeof body.currency === "string" && body.currency.trim()
            ? body.currency.trim().toUpperCase()
            : "ILS",
        vatRate: toDecimal(toFiniteNumber(body.vatRate, 18)),
        status: ProposalStatus.DRAFT,
        freeTextContent: normalizeOptionalString(body.freeTextContent),
        notesInternal: normalizeOptionalString(body.notesInternal),
        paymentTerms: normalizeOptionalString(body.paymentTerms),
        paymentTermsNote: normalizeOptionalString((body as { paymentTermsNote?: string }).paymentTermsNote),
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
        ...(timelineSteps.length > 0 && {
          timelineSteps: {
            create: timelineSteps.map((step) => ({
              title: step.title,
              description: step.description,
              targetDate: step.targetDate,
              sortOrder: step.sortOrder,
            })),
          },
        }),
      },
      select: {
        id: true,
      },
    });
  });

  return NextResponse.json({ proposal }, { status: 201 });
}
