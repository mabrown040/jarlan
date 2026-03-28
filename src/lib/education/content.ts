export const educationAnchors = {
  safeWithdrawalRate: "safe-withdrawal-rate",
  cape: "cape",
  coastFire: "coast-fire",
  sequenceRisk: "sequence-risk",
  defaults: "research-backed-defaults",
  researchLibrary: "research-library",
} as const;

export interface EducationGlossaryEntry {
  id: string;
  term: string;
  description: string;
}

export interface EducationDefaultNote {
  id: string;
  title: string;
  description: string;
}

export interface EducationReference {
  id: string;
  label: string;
  url: string;
  note?: string;
}

export const educationGlossary: EducationGlossaryEntry[] = [
  {
    id: educationAnchors.safeWithdrawalRate,
    term: "Safe withdrawal rate",
    description:
      "The starting percentage of your portfolio you can withdraw in year one, then usually inflation-adjust in later years.",
  },
  {
    id: educationAnchors.cape,
    term: "CAPE",
    description:
      "Shiller's cyclically adjusted price-to-earnings ratio, often used as a rough valuation signal for withdrawal planning.",
  },
  {
    id: educationAnchors.coastFire,
    term: "Coast FIRE",
    description:
      "The point where your existing portfolio can compound to your FIRE number by retirement without further contributions.",
  },
  {
    id: educationAnchors.sequenceRisk,
    term: "Sequence risk",
    description:
      "The danger that poor returns early in retirement can damage a plan even if long-run average returns end up looking fine.",
  },
];

export const educationDefaults: EducationDefaultNote[] = [
  {
    id: "real-dollar-math",
    title: "Real-dollar math by default",
    description:
      "The app defaults to inflation-adjusted planning so users can reason in today's purchasing power instead of nominal balances.",
  },
  {
    id: "classic-swr-baseline",
    title: "A classic first answer, with a safer comparison",
    description:
      "A 4% framing gets beginners to a quick answer, while a second comparison rate makes it obvious when a longer FIRE horizon may deserve more margin.",
  },
  {
    id: "historical-vs-flat-projection",
    title: "History over flat average-return stories",
    description:
      "Historical backtests are emphasized where sequence matters so the app does not imply the market will deliver the same return every year.",
  },
  {
    id: "separate-probability-lenses",
    title: "Different tools answer different questions",
    description:
      "Historical backtests, Monte Carlo, and mortality views stay distinct on purpose so the product remains transparent about what each model is actually saying.",
  },
];

const coreEducationReferences: EducationReference[] = [
  {
    id: "bengen1994",
    label: "Bengen (1994) - SAFEMAX / 4% rule",
    url: "https://web.stanford.edu/~wfsharpe/retecon/4percent.pdf",
    note: "Historical baseline for fixed real withdrawals and the original 4% framing.",
  },
  {
    id: "trinity1998",
    label: "Cooley, Hubbard, Walz (1998) - Trinity Study",
    url: "https://www.aaii.com/files/pdf/6794_retirement-savings-choosing-a-withdrawal-rate-that-is-sustainable.pdf",
    note: "Inflation-adjusted stock/bond withdrawal success tables across classic retirement horizons.",
  },
  {
    id: "ernSWRSeries",
    label: "Early Retirement Now SWR series",
    url: "https://earlyretirementnow.com/safe-withdrawal-rate-series/",
    note: "Long-horizon FIRE research, CAPE-based rules, and supplemental cash-flow modeling.",
  },
  {
    id: "ssaLifeTable",
    label: "SSA actuarial life table",
    url: "https://www.ssa.gov/oact/STATS/table4c6.html",
    note: "Longevity assumptions for retirement-duration planning.",
  },
  {
    id: "shillerData",
    label: "Robert Shiller data library",
    url: "https://shillerdata.com/",
    note: "Historical return, inflation, and CAPE data behind valuation-aware analysis.",
  },
];

export const withdrawalStrategyReferences: EducationReference[] = [
  {
    id: "guytonKlinger2006",
    label: "Guyton & Klinger (2006) - Decision Rules and Maximum Initial Withdrawal Rates",
    url: "https://financialplanningassociation.org/sites/default/files/2021-11/2006%20-%20Guyton%20and%20Klinger%20-%20Decision%20Rules%20and%20SWR%20%281%29.PDF",
    note: "Foundational guardrails paper covering capital-preservation and prosperity rules.",
  },
  {
    id: "klinger2016",
    label: "Klinger (2016) - Guardrails to Prevent Potential Retirement Portfolio Failure",
    url: "https://financialplanningassociation.org/sites/default/files/2020-10/OCT16%20Klinger.pdf",
    note: "Follow-on guardrails research focused on early warning signals and failure prevention.",
  },
  {
    id: "ernPart54",
    label: "Early Retirement Now Part 54 - Dynamic withdrawal rates based on CAPE",
    url: "https://earlyretirementnow.com/2022/10/12/dynamic-withdrawal-rates-based-on-the-shiller-cape-swr-series-part-54/",
    note: "Practical CAPE-rule implementation, parameter intuition, and long-horizon tradeoffs.",
  },
  {
    id: "bogleheadsVPW",
    label: "Bogleheads - Variable percentage withdrawal",
    url: "https://www.bogleheads.org/wiki/Variable_percentage_withdrawal",
    note: "Community-maintained VPW methodology and table-based implementation notes.",
  },
  {
    id: "irsRmdWorksheets",
    label: "IRS - Required minimum distribution worksheets",
    url: "https://www.irs.gov/retirement-plans/plan-participant-employee/required-minimum-distribution-worksheets",
    note: "Official age-based divisor tables that inform RMD-style withdrawals.",
  },
  {
    id: "blanchett2014",
    label: "Blanchett (2014) - Estimating the True Cost of Retirement",
    url: "https://www.soa.org/globalassets/assets/files/resources/essays-monographs/2014-living-to-100/mono-li14-1a-blanchett.pdf",
    note: "Empirical spending-decline research behind the retirement spending smile idea.",
  },
  {
    id: "morningstar2025",
    label: "Morningstar (2025) - The State of Retirement Income",
    url: "https://assets.contentstack.io/v3/assets/blt9415ea4cc4157833/bltb73b87c5d0c70ead/The_State_of_Retirement_Income_2025.pdf",
    note: "Current research on fixed versus flexible retirement spending approaches.",
  },
  {
    id: "retirementResearcherFloorCeiling",
    label: "Retirement Researcher - Floor & ceiling retirement spending strategy",
    url: "https://retirementresearcher.com/floor-ceiling-retirement-spending-strategy/",
    note: "Summary of Bengen's floor-and-ceiling spending-band approach and its tradeoffs.",
  },
];

export const educationReferences: EducationReference[] = [
  ...coreEducationReferences,
  ...withdrawalStrategyReferences,
];

export function getEducationGlossaryEntry(id: string) {
  return educationGlossary.find((entry) => entry.id === id) ?? null;
}

export function getEducationDefaultNote(id: string) {
  return educationDefaults.find((entry) => entry.id === id) ?? null;
}

export function getEducationReference(id: string) {
  return educationReferences.find((entry) => entry.id === id) ?? null;
}
