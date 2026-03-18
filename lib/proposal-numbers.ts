import { PrismaClient, Prisma } from "@prisma/client";
import { extractProposalSequence, formatProposalNumber } from "@/lib/proposals";

export async function generateNextProposalNumber(
  prismaClient: PrismaClient | Prisma.TransactionClient,
  year = new Date().getFullYear()
): Promise<string> {
  const prefix = `PB-${year}-`;
  const proposals = await prismaClient.proposal.findMany({
    where: {
      proposalNumber: {
        startsWith: prefix,
      },
    },
    select: {
      proposalNumber: true,
    },
  });

  const maxSequence = proposals.reduce((max, proposal) => {
    const sequence = extractProposalSequence(proposal.proposalNumber, year);
    return sequence && sequence > max ? sequence : max;
  }, 0);

  return formatProposalNumber(year, maxSequence + 1);
}
