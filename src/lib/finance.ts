import type {
  Expense,
  ExpenseAllocation,
  MemberLedger,
  SettlementPreview,
} from "@/lib/types";

export function sumAmounts(amounts: number[]): number {
  return amounts.reduce((total, amount) => total + amount, 0);
}

export function sumAllocations(allocations: ExpenseAllocation[]): number {
  return sumAmounts(allocations.map((allocation) => allocation.amount));
}

export function splitEvenly(
  total: number,
  participantIds: string[],
): Record<string, number> {
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new Error("Total harus berupa bilangan Rupiah yang valid.");
  }

  if (participantIds.length === 0) {
    return {};
  }

  if (new Set(participantIds).size !== participantIds.length || participantIds.some((id) => !id.trim())) {
    throw new Error("Peserta pembagian harus unik dan valid.");
  }

  const base = Math.floor(total / participantIds.length);
  const remainder = total % participantIds.length;

  return participantIds.reduce<Record<string, number>>((result, userId, index) => {
    result[userId] = base + (index < remainder ? 1 : 0);
    return result;
  }, {});
}

export function buildAllocations(
  expenseId: string,
  total: number,
  participantIds: string[],
): ExpenseAllocation[] {
  const amounts = splitEvenly(total, participantIds);
  return participantIds.map((userId, index) => ({
    id: `${expenseId}-allocation-${index}`,
    expenseId,
    userId,
    amount: amounts[userId] ?? 0,
  }));
}

export function allocationsReconcile(
  amount: number,
  allocations: Array<Pick<ExpenseAllocation, "amount" | "userId">>,
): boolean {
  const ids = allocations.map((item) => item.userId);
  const idsAreUnique = new Set(ids).size === ids.length;
  return Number.isSafeInteger(amount)
    && amount >= 0
    && allocations.length > 0
    && ids.every((id) => typeof id === "string" && id.trim().length > 0)
    && idsAreUnique
    && allocations.every((item) => Number.isSafeInteger(item.amount) && item.amount >= 0)
    && sumAmounts(allocations.map((item) => item.amount)) === amount;
}

export function calculateMemberLedgers(
  memberIds: string[],
  expenses: Expense[],
): MemberLedger[] {
  const ledgers = new Map<string, MemberLedger>();

  for (const userId of memberIds) {
    ledgers.set(userId, { userId, paid: 0, share: 0, balance: 0 });
  }

  for (const expense of expenses) {
    const payer = ledgers.get(expense.paidBy);
    if (payer) payer.paid += expense.amount;

    for (const allocation of expense.allocations) {
      const member = ledgers.get(allocation.userId);
      if (member) member.share += allocation.amount;
    }
  }

  return [...ledgers.values()].map((ledger) => ({
    ...ledger,
    balance: ledger.paid - ledger.share,
  }));
}

export function buildSettlementPreview(ledgers: MemberLedger[]): SettlementPreview[] {
  if (new Set(ledgers.map((ledger) => ledger.userId)).size !== ledgers.length || ledgers.some((ledger) => !ledger.userId.trim())) {
    throw new Error("Saldo anggota harus unik.");
  }
  if (ledgers.some((ledger) => !Number.isSafeInteger(ledger.paid) || ledger.paid < 0 || !Number.isSafeInteger(ledger.share) || ledger.share < 0 || !Number.isSafeInteger(ledger.balance) || ledger.paid - ledger.share !== ledger.balance)) {
    throw new Error("Saldo anggota tidak valid.");
  }
  const netBalance = ledgers.reduce((sum, ledger) => sum + ledger.balance, 0);
  if (netBalance !== 0) {
    throw new Error("Saldo trip tidak seimbang.");
  }

  const debtors = ledgers
    .filter((ledger) => ledger.balance < 0)
    .map((ledger) => ({ userId: ledger.userId, remaining: Math.abs(ledger.balance) }));
  const creditors = ledgers
    .filter((ledger) => ledger.balance > 0)
    .map((ledger) => ({ userId: ledger.userId, remaining: ledger.balance }));
  const preview: SettlementPreview[] = [];

  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(debtor.remaining, creditor.remaining);

    if (amount > 0) {
      preview.push({ fromUserId: debtor.userId, toUserId: creditor.userId, amount });
    }

    debtor.remaining -= amount;
    creditor.remaining -= amount;

    if (debtor.remaining === 0) debtorIndex += 1;
    if (creditor.remaining === 0) creditorIndex += 1;
  }

  return preview;
}

export function validateTripExpenses(expenses: Expense[], memberIds: string[]): string[] {
  const members = new Set(memberIds);
  const errors: string[] = [];

  for (const expense of expenses) {
    if (!expense.paidBy || !members.has(expense.paidBy)) {
      errors.push(`${expense.title}: payer tidak ditemukan.`);
    }
    if (expense.amount <= 0 || !Number.isInteger(expense.amount)) {
      errors.push(`${expense.title}: jumlah tidak valid.`);
    }
    if (!allocationsReconcile(expense.amount, expense.allocations)) {
      errors.push(`${expense.title}: pembagian belum pas.`);
    }
    if (expense.allocations.some((allocation) => !members.has(allocation.userId))) {
      errors.push(`${expense.title}: ada anggota pembagian yang tidak valid.`);
    }
  }

  return errors;
}
