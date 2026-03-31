"use client";

import { useMemo } from "react";
import { Sankey, Tooltip, ResponsiveContainer, Rectangle, Layer } from "recharts";
import type { Scenario } from "@/lib/domain/types";
import { estimateScenarioTax } from "@/lib/tax/strategy";
import { getEmployerMatchTotal } from "@/lib/calc/scenario";
import { formatCompactCurrency } from "@/lib/calc/format";

/* ── Color palette matching Calcifer theme ─────────────────── */
const COLORS = {
  income: "#f7c948",      // flame/gold
  federalTax: "#e74c3c",  // red
  stateTax: "#c0392b",    // darker red
  fica: "#d35400",        // red-orange
  takeHome: "#27ae60",    // green
  spending: "#95a5a6",    // gray
  savings: "#ff6b35",     // ember
  traditional: "#3498db", // blue
  roth: "#1abc9c",        // teal
  hsa: "#9b59b6",         // purple
  taxable: "#e67e22",     // orange
  match: "#2ecc71",       // bright green
};

/* ── Payload types ─────────────────────────────────────────── */
interface SankeyNodePayload { color?: string; displayName?: string }
interface SankeyLinkPayload { source?: SankeyNodePayload; target?: SankeyNodePayload; value?: number }

/* ── Custom node rendering ─────────────────────────────────── */
function SankeyNode({ x = 0, y = 0, width = 0, height = 0, index = 0, payload = {} }: { x?: number; y?: number; width?: number; height?: number; index?: number; payload?: SankeyNodePayload }) {
  const color = payload?.color ?? "#ccc";
  return (
    <Layer key={`node-${index}`}>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        fillOpacity={0.9}
        rx={3}
        ry={3}
      />
      {/* Label to the right of the node */}
      <text
        x={x + width + 8}
        y={y + height / 2}
        textAnchor="start"
        dominantBaseline="central"
        className="fill-foreground text-[11px] font-medium"
      >
        {payload?.displayName ?? ""}
      </text>
    </Layer>
  );
}

/* ── Custom link rendering ─────────────────────────────────── */
function SankeyLink({
  sourceX = 0,
  sourceY = 0,
  sourceControlX = 0,
  targetX = 0,
  targetY = 0,
  targetControlX = 0,
  linkWidth = 0,
  index = 0,
  payload = {},
}: { sourceX?: number; sourceY?: number; sourceControlX?: number; targetX?: number; targetY?: number; targetControlX?: number; linkWidth?: number; index?: number; payload?: SankeyLinkPayload }) {
  const sourceColor = payload?.source?.color ?? "#ccc";
  const targetColor = payload?.target?.color ?? "#ccc";
  const gradientId = `link-gradient-${index}`;
  return (
    <Layer key={`link-${index}`}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={sourceColor} stopOpacity={0.4} />
          <stop offset="100%" stopColor={targetColor} stopOpacity={0.3} />
        </linearGradient>
      </defs>
      <path
        d={`
          M${sourceX},${sourceY}
          C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
        `}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={linkWidth}
        strokeOpacity={0.5}
      />
    </Layer>
  );
}

/* ── Tooltip ───────────────────────────────────────────────── */
function SankeyTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: SankeyLinkPayload & SankeyNodePayload & { value?: number } }> }) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  // Link tooltip
  if (data.source && data.target) {
    return (
      <div className="rounded-lg border border-border/60 bg-card px-3 py-2 text-xs shadow-lg">
        <p className="font-medium">
          {data.source.displayName} → {data.target.displayName}
        </p>
        <p className="text-muted-foreground">{formatCompactCurrency(data.value ?? 0)}/yr</p>
      </div>
    );
  }

  return null;
}

/* ── Data builder ──────────────────────────────────────────── */
function buildSankeyData(scenario: Scenario) {
  const taxInfo = estimateScenarioTax(scenario);
  const employerMatch = getEmployerMatchTotal(scenario);
  const { grossIncome, federalTax, stateTax, fica, takeHome } = taxInfo;
  const ficaTotal = fica.totalFica;
  const expenses = scenario.annualExpenses;
  const savings = Math.max(takeHome - expenses, 0);

  if (grossIncome <= 0) return null;

  // Group accounts by type
  const accountGroups: { label: string; amount: number; color: string }[] = [];
  const typeMap = new Map<string, { label: string; amount: number; color: string }>();

  for (const acct of scenario.accounts) {
    if (acct.annualContribution <= 0) continue;
    const key = acct.type;
    const existing = typeMap.get(key);
    const label =
      key === "traditional_401k" ? "401(k)" :
      key === "roth_401k" || key === "roth_ira" ? "Roth" :
      key === "hsa" ? "HSA" :
      key === "taxable" ? "Brokerage" :
      key === "traditional_ira" ? "Trad IRA" :
      acct.name;
    const color =
      key === "traditional_401k" || key === "traditional_ira" ? COLORS.traditional :
      key === "roth_401k" || key === "roth_ira" ? COLORS.roth :
      key === "hsa" ? COLORS.hsa :
      COLORS.taxable;

    if (existing) {
      existing.amount += acct.annualContribution;
    } else {
      typeMap.set(key, { label, amount: acct.annualContribution, color });
    }
  }
  typeMap.forEach((v) => accountGroups.push(v));

  // Build nodes — indices:  0=gross, 1=fedtax, 2=statetax, 3=fica, 4=takehome, 5=spending, 6=savings
  const nodes: Array<{ name: string; displayName: string; color: string }> = [
    { name: "gross", displayName: `Income ${formatCompactCurrency(grossIncome)}`, color: COLORS.income },
    { name: "fedtax", displayName: `Federal Tax ${formatCompactCurrency(federalTax)}`, color: COLORS.federalTax },
    { name: "statetax", displayName: `State Tax ${formatCompactCurrency(stateTax)}`, color: COLORS.stateTax },
    { name: "fica", displayName: `FICA ${formatCompactCurrency(ficaTotal)}`, color: COLORS.fica },
    { name: "takehome", displayName: `Take-Home ${formatCompactCurrency(takeHome)}`, color: COLORS.takeHome },
    { name: "spending", displayName: `Spending ${formatCompactCurrency(expenses)}`, color: COLORS.spending },
    { name: "savings", displayName: `Savings ${formatCompactCurrency(savings)}`, color: COLORS.savings },
  ];

  // Account type nodes
  const accountNodeStart = nodes.length;
  for (const group of accountGroups) {
    nodes.push({
      name: group.label.toLowerCase(),
      displayName: `${group.label} ${formatCompactCurrency(group.amount)}`,
      color: group.color,
    });
  }

  // Employer match node (if any)
  const matchNodeIdx = employerMatch > 0 ? nodes.length : -1;
  if (employerMatch > 0) {
    nodes.push({
      name: "match",
      displayName: `Match ${formatCompactCurrency(employerMatch)}`,
      color: COLORS.match,
    });
  }

  // Build links — ensure all values > 0
  const links: Array<{ source: number; target: number; value: number }> = [];
  if (federalTax > 0) links.push({ source: 0, target: 1, value: federalTax });
  if (stateTax > 0) links.push({ source: 0, target: 2, value: stateTax });
  if (ficaTotal > 0) links.push({ source: 0, target: 3, value: ficaTotal });
  if (takeHome > 0) links.push({ source: 0, target: 4, value: takeHome });
  if (expenses > 0) links.push({ source: 4, target: 5, value: expenses });
  if (savings > 0) links.push({ source: 4, target: 6, value: savings });

  // Savings → account types
  for (let i = 0; i < accountGroups.length; i++) {
    if (accountGroups[i].amount > 0) {
      links.push({ source: 6, target: accountNodeStart + i, value: accountGroups[i].amount });
    }
  }

  // Employer match → savings (separate flow)
  if (employerMatch > 0 && matchNodeIdx >= 0) {
    links.push({ source: matchNodeIdx, target: 6, value: employerMatch });
  }

  return { nodes, links };
}

/* ── Main component ────────────────────────────────────────── */
export function MoneyFlowSankey({ scenario }: { scenario: Scenario }) {
  const data = useMemo(() => buildSankeyData(scenario), [scenario]);

  if (!data) return null;

  return (
    <div className="h-[340px] w-full">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
        <Sankey
          data={data}
          nodeWidth={16}
          nodePadding={28}
          margin={{ top: 16, right: 160, bottom: 16, left: 16 }}
          link={<SankeyLink />}
          node={<SankeyNode />}
        >
          <Tooltip content={<SankeyTooltip />} />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
}
