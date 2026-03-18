export type ProposalStatus =
  | "DRAFT"
  | "SENT"
  | "APPROVED"
  | "REJECTED"
  | "ARCHIVED";

type ProposalStatusMeta = {
  label: string;
  className: string;
};

export type ProposalFormItemInput = {
  name: string;
  description: string;
  category: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
};

export type ProposalTimelineStepInput = {
  title: string;
  description: string;
  targetDate: string;
};

export type ProposalFormValues = {
  title: string;
  documentDescription: string;
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress: string;
  logoUrl: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  proposalNumber: string;
  issueDate: string;
  validUntil: string;
  currency: string;
  vatRate: number;
  freeTextContent: string;
  notesInternal: string;
  paymentTerms: string;
  paymentTermsNote: string;
  footerText: string;
  items: ProposalFormItemInput[];
  timelineSteps: ProposalTimelineStepInput[];
};

export type CalculatedProposalItem = ProposalFormItemInput & {
  lineSubtotal: number;
  lineVat: number;
  lineTotal: number;
  sortOrder: number;
};

export type CalculatedProposalTotals = {
  items: CalculatedProposalItem[];
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
};

export const PAYMENT_TERM_OPTIONS = ["מיידי", "שוטף", "שוטף + 30", "שוטף + 60"] as const;

export const DEFAULT_PROPOSAL_ITEM: ProposalFormItemInput = {
  name: "",
  description: "",
  category: "",
  quantity: 1,
  unitPrice: 0,
  vatRate: 18,
};

export const DEFAULT_PROPOSAL_FORM: ProposalFormValues = {
  title: "",
  documentDescription: "",
  businessName: "",
  businessEmail: "",
  businessPhone: "",
  businessAddress: "",
  logoUrl: "",
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  proposalNumber: "",
  issueDate: "",
  validUntil: "",
  currency: "ILS",
  vatRate: 18,
  freeTextContent: "",
  notesInternal: "",
  paymentTerms: "",
  paymentTermsNote: "",
  footerText: "",
  items: [],
  timelineSteps: [],
};

export function roundMoney(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

export function toFiniteNumber(value: unknown, fallback = 0): number {
  const num =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number(value)
      : Number.NaN;
  return Number.isFinite(num) ? num : fallback;
}

export function calculateProposalTotals(
  items: ProposalFormItemInput[]
): CalculatedProposalTotals {
  const normalizedItems = items.map((item, index) => {
    const quantity = toFiniteNumber(item.quantity, 0);
    const unitPrice = toFiniteNumber(item.unitPrice, 0);
    const vatRate = toFiniteNumber(item.vatRate, 0);
    const lineSubtotal = roundMoney(quantity * unitPrice);
    const lineVat = roundMoney((lineSubtotal * vatRate) / 100);
    const lineTotal = roundMoney(lineSubtotal + lineVat);

    return {
      name: item.name,
      description: item.description,
      category: item.category ?? "",
      quantity,
      unitPrice,
      vatRate,
      lineSubtotal,
      lineVat,
      lineTotal,
      sortOrder: index,
    };
  });

  const subtotal = roundMoney(
    normalizedItems.reduce((sum, item) => sum + item.lineSubtotal, 0)
  );
  const vatAmount = roundMoney(
    normalizedItems.reduce((sum, item) => sum + item.lineVat, 0)
  );
  const totalAmount = roundMoney(subtotal + vatAmount);

  return {
    items: normalizedItems,
    subtotal,
    vatAmount,
    totalAmount,
  };
}

export function parseDateInput(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: currency || "ILS",
    maximumFractionDigits: 2,
  }).format(roundMoney(value));
}

export function getProposalStatusMeta(status: ProposalStatus): ProposalStatusMeta {
  switch (status) {
    case "SENT":
      return {
        label: "נשלחה",
        className: "bg-blue-100 text-blue-800 border-blue-200",
      };
    case "APPROVED":
      return {
        label: "אושרה",
        className: "bg-green-100 text-green-800 border-green-200",
      };
    case "REJECTED":
      return {
        label: "נדחתה",
        className: "bg-red-100 text-red-800 border-red-200",
      };
    case "ARCHIVED":
      return {
        label: "בארכיון",
        className: "bg-gray-100 text-gray-700 border-gray-200",
      };
    case "DRAFT":
    default:
      return {
        label: "טיוטה",
        className: "bg-amber-100 text-amber-800 border-amber-200",
      };
  }
}

export function formatProposalNumber(year: number, sequence: number): string {
  return `PB-${year}-${String(sequence).padStart(4, "0")}`;
}

export function extractProposalSequence(
  proposalNumber: string | null | undefined,
  year: number
): number | null {
  if (!proposalNumber) return null;
  const match = proposalNumber.match(new RegExp(`^PB-${year}-(\\d{4,})$`));
  if (!match) return null;
  const sequence = Number(match[1]);
  return Number.isFinite(sequence) ? sequence : null;
}
