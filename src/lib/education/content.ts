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
  label: string;
  url: string;
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

export const educationReferences: EducationReference[] = [
  {
    label: "Bengen (1994) - SAFEMAX / 4% rule",
    url: "https://www.retailinvestor.org/pdf/Bengen1.pdf",
  },
  {
    label: "Trinity Study overview",
    url: "https://en.wikipedia.org/wiki/Trinity_study",
  },
  {
    label: "Early Retirement Now SWR series",
    url: "https://earlyretirementnow.com/safe-withdrawal-rate-series/",
  },
  {
    label: "SSA actuarial life table",
    url: "https://www.ssa.gov/oact/STATS/table4c6.html",
  },
  {
    label: "Robert Shiller data library",
    url: "https://shillerdata.com/",
  },
];

export function getEducationGlossaryEntry(id: string) {
  return educationGlossary.find((entry) => entry.id === id) ?? null;
}

export function getEducationDefaultNote(id: string) {
  return educationDefaults.find((entry) => entry.id === id) ?? null;
}
