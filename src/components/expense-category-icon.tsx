import { BedDouble, CarFront, Ellipsis, ShoppingBag, Ticket, Utensils } from "lucide-react";
import type { ComponentProps } from "react";
import type { ExpenseCategory } from "@/lib/types";

const categoryIcons = {
  accommodation: BedDouble,
  food: Utensils,
  transport: CarFront,
  activity: Ticket,
  shopping: ShoppingBag,
  other: Ellipsis,
} satisfies Record<ExpenseCategory, typeof BedDouble>;

interface ExpenseCategoryIconProps extends Pick<ComponentProps<typeof BedDouble>, "size" | "strokeWidth" | "className"> {
  category: ExpenseCategory;
}

export function ExpenseCategoryIcon({ category, size = 16, strokeWidth = 1.8, className }: ExpenseCategoryIconProps) {
  const Icon = categoryIcons[category];
  return <Icon size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" />;
}
