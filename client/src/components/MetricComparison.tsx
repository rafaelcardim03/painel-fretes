import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

type ComparisonKind = "money" | "percent" | "points";

type Props = {
  current: number;
  previous: number;
  kind?: ComparisonKind;
  label?: string;
};

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Math.abs(value));
const decimal = (value: number) => Math.abs(value).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

export default function MetricComparison({ current, previous, kind = "money", label = "vs. mês anterior" }: Props) {
  const delta = current - previous;
  const percentage = previous !== 0 ? (delta / Math.abs(previous)) * 100 : null;
  const direction = delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral";
  const Icon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
  const deltaLabel = kind === "money" ? `${delta >= 0 ? "+" : "−"}${money(delta)}` : kind === "points" ? `${delta >= 0 ? "+" : "−"}${decimal(delta)} p.p.` : `${delta >= 0 ? "+" : "−"}${decimal(delta)} p.p.`;
  const percentLabel = percentage === null ? "sem base anterior" : `${percentage >= 0 ? "+" : "−"}${decimal(percentage)}%`;
  return <span className={`metric-comparison ${direction}`} title={`Comparação com o mês anterior: ${deltaLabel} · ${percentLabel}`}><Icon size={13} /><span>{label}: {deltaLabel} ({percentLabel})</span></span>;
}
