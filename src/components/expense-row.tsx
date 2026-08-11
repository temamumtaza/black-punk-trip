import { ArrowUpRight } from "lucide-react";
import type { Expense, Profile } from "@/lib/types";
import { categoryLabels, categorySymbols, formatRupiah, formatShortDate, initials } from "@/lib/format";

interface ExpenseRowProps {
  expense: Expense;
  payer?: Profile;
  allocationCount: number;
  onClick: () => void;
}

export function ExpenseRow({ expense, payer, allocationCount, onClick }: ExpenseRowProps) {
  return (
    <button className="expense-row" onClick={onClick} type="button">
      <span className="expense-symbol" aria-hidden="true">{categorySymbols[expense.category]}</span>
      <span className="expense-row-main">
        <span className="expense-title-line"><strong>{expense.title}</strong><span className="expense-category">{categoryLabels[expense.category]}</span></span>
        <span className="expense-meta">{payer?.displayName ?? "Anggota"} menalangi · {allocationCount} bagian · {formatShortDate(expense.expenseDate)}</span>
      </span>
      <span className="expense-row-amount"><strong>{formatRupiah(expense.amount)}</strong><ArrowUpRight size={15} /></span>
    </button>
  );
}

interface AvatarStackProps {
  profiles: Profile[];
  max?: number;
}

export function AvatarStack({ profiles, max = 4 }: AvatarStackProps) {
  const visible = profiles.slice(0, max);
  return <span className="avatar-stack" aria-label={`${profiles.length} anggota`}>
    {visible.map((profile) => <span className="avatar avatar-small" key={profile.id}>{initials(profile)}</span>)}
    {profiles.length > max ? <span className="avatar avatar-small avatar-more">+{profiles.length - max}</span> : null}
  </span>;
}

