import { cn } from "@/lib/utils";

const toneStyles = {
  default: {
    card:
      "border-[color:var(--surface-border)] bg-muted/40",
    value: "text-foreground",
  },
  accent: {
    card:
      "border-[rgba(255,107,53,0.18)] bg-[rgba(255,107,53,0.08)]",
    value: "text-[var(--ember)]",
  },
  success: {
    card:
      "border-[rgba(34,197,94,0.18)] bg-[rgba(34,197,94,0.08)]",
    value: "text-[var(--success)]",
  },
  warning: {
    card:
      "border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.08)]",
    value: "text-[var(--warning)]",
  },
  danger: {
    card:
      "border-[rgba(239,68,68,0.18)] bg-[rgba(239,68,68,0.08)]",
    value: "text-[var(--danger)]",
  },
} as const;

export function StatCard({
  label,
  value,
  description,
  tone = "default",
  className,
}: {
  label: string;
  value: string;
  description: string;
  tone?: keyof typeof toneStyles;
  className?: string;
}) {
  const styles = toneStyles[tone];

  return (
    <div
      className={cn(
        "rounded-xl border p-4 shadow-[var(--shadow-soft)]",
        styles.card,
        className,
      )}
    >
      <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-display text-3xl leading-none tracking-[-0.03em]",
          styles.value,
        )}
      >
        {value}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
