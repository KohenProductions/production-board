export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { Prisma, ProposalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateNextProposalNumber } from "@/lib/proposal-numbers";
import { getSessionUserId } from "@/lib/session";

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

function cloneDecimal(value: Prisma.Decimal) {
  return new Prisma.Decimal(value.toString());
}

export async function POST(
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

  const existing = await prisma.proposal.findFirst({
    where: {
      id: proposalId,
      projectId,
    },
    include: {
      items: {
        orderBy: {
          sortOrder: "asc",
        },
      },
      timelineSteps: {
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  const proposal = await prisma.$transaction(async (tx) => {
    const proposalNumber = await generateNextProposalNumber(tx);

    return tx.proposal.create({
      data: {
        projectId,
        title: `${existing.title} (Copy)`,
        documentDescription: existing.documentDescription,
        businessName: existing.businessName,
        businessEmail: existing.businessEmail,
        businessPhone: existing.businessPhone,
        businessAddress: existing.businessAddress,
        logoUrl: existing.logoUrl,
        clientName: existing.clientName,
        clientEmail: existing.clientEmail,
        clientPhone: existing.clientPhone,
        proposalNumber,
        issueDate: existing.issueDate,
        validUntil: existing.validUntil,
        currency: existing.currency,
        vatRate: cloneDecimal(existing.vatRate),
        status: ProposalStatus.DRAFT,
        freeTextContent: existing.freeTextContent,
        notesInternal: existing.notesInternal,
        paymentTerms: existing.paymentTerms,
        paymentTermsNote: existing.paymentTermsNote,
        footerText: existing.footerText,
        subtotal: cloneDecimal(existing.subtotal),
        vatAmount: cloneDecimal(existing.vatAmount),
        totalAmount: cloneDecimal(existing.totalAmount),
        items: {
          create: existing.items.map((item) => ({
            name: item.name,
            description: item.description,
            category: item.category,
            quantity: cloneDecimal(item.quantity),
            unitPrice: cloneDecimal(item.unitPrice),
            vatRate: cloneDecimal(item.vatRate),
            lineSubtotal: cloneDecimal(item.lineSubtotal),
            lineVat: cloneDecimal(item.lineVat),
            lineTotal: cloneDecimal(item.lineTotal),
            sortOrder: item.sortOrder,
          })),
        },
        ...(existing.timelineSteps.length > 0 && {
          timelineSteps: {
            create: existing.timelineSteps.map((step) => ({
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
