export const filingStatuses = [
  "single",
  "married_joint",
  "married_separate",
  "head_of_household",
] as const;

export const accountTypes = [
  "traditional_401k",
  "roth_401k",
  "traditional_ira",
  "roth_ira",
  "taxable",
  "hsa",
  "529",
  "cash",
  "real_estate",
  "pension",
  "social_security",
  "other",
] as const;

export const accountOwners = ["primary", "partner", "joint"] as const;

export const withdrawalStrategyTypes = [
  "fixed",
  "cape_dynamic",
  "guyton_klinger",
  "vpw",
  "constant_pct",
  "rmd",
  "floor_ceiling",
  "spending_smile",
] as const;

export const simulationTypes = [
  "historical",
  "monte_carlo_parametric",
  "monte_carlo_bootstrap",
  "monte_carlo_block",
  "monte_carlo_regime",
] as const;

export const rebalanceFrequencies = [
  "monthly",
  "quarterly",
  "annually",
  "threshold",
] as const;

export const inflationModels = ["fixed", "historical", "stochastic"] as const;

export type FilingStatus = (typeof filingStatuses)[number];
export type AccountType = (typeof accountTypes)[number];
export type AccountOwner = (typeof accountOwners)[number];
export type WithdrawalStrategyType = (typeof withdrawalStrategyTypes)[number];
export type SimulationType = (typeof simulationTypes)[number];
export type RebalanceFrequency = (typeof rebalanceFrequencies)[number];
export type InflationModel = (typeof inflationModels)[number];
export type CurrencyCode = "USD" | "CAD" | "GBP" | "EUR" | "AUD";
export type HealthStatus = "below_average" | "average" | "above_average";
export type EmploymentType = "w2" | "self_employed" | "1099";

export interface SocialSecurityInput {
  monthlyBenefitAt62: number;
  monthlyBenefitAtFra: number;
  monthlyBenefitAt70: number;
  claimingAge: 62 | 67 | 70;
}

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  retirementAge: number | null;
  filingStatus: FilingStatus;
  employmentType: EmploymentType;
  country?: string;
  state: string;
  householdSize: number;
  healthStatus: HealthStatus;
  partner?: {
    name: string;
    age: number;
    retirementAge: number | null;
    annualIncome?: number;
    healthStatus?: HealthStatus;
    socialSecurityBenefit: SocialSecurityInput;
  };
}

export interface RothConversion {
  id: string;
  date: string;
  amount: number;
  taxPaid: number;
}

export interface AssetAllocation {
  stocks: number;
  bonds: number;
  alternatives: number;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  owner?: AccountOwner;
  currentBalance: number;
  annualContribution: number;
  employerMatch?: { percentage: number; upTo: number };
  assetAllocation: AssetAllocation;
  expenseRatio: number;
  costBasis?: number;
  rothContributions?: number;
  rothConversions?: RothConversion[];
}

export interface CashFlowEvent {
  id: string;
  name: string;
  type: "income" | "expense";
  amount: number;
  startAge: number;
  endAge: number | null;
  inflationAdjusted: boolean;
  taxable: boolean;
}

export interface GlidepathPoint {
  age: number;
  allocation: AssetAllocation;
}

export interface WithdrawalStrategy {
  type: WithdrawalStrategyType;
  initialRate?: number;
  capeParams?: { a: number; b: number };
  gkParams?: {
    guardrailWidth: number;
    adjustmentSize: number;
    suspendCapPreservationYears: number;
  };
  floorCeiling?: { floor: number; ceiling: number };
  spendingDeclineRate?: number;
}

export interface SimulationSettings {
  retirementDuration: number;
  simulationType: SimulationType;
  monteCarloTrials: number;
  rebalanceFrequency: RebalanceFrequency;
  finalValueTarget: number;
  inflationModel: InflationModel;
  fixedInflation: number;
  feeDrag: number;
}

export interface ScenarioAssumptions {
  expectedRealReturn: number;
  inflation: number;
  withdrawalRate: number;
  saferWithdrawalRate: number;
  partTimeIncome: number;
  partTimeIncomeDuration: number | null;
  incomeGrowthRate: number;
  expenseGrowthRate: number;
}

export interface Scenario {
  id: string;
  version: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  currency: CurrencyCode;
  profile: UserProfile;
  accounts: Account[];
  cashFlows: CashFlowEvent[];
  annualIncome: number;
  annualSavings: number;
  annualExpenses: number;
  retirementExpenses: number;
  assumptions: ScenarioAssumptions;
  withdrawalStrategy: WithdrawalStrategy;
  assetAllocationGlidepath: GlidepathPoint[];
  simulationSettings: SimulationSettings;
  socialSecurity: SocialSecurityInput;
  isPersonalized?: boolean;
}

export interface ProjectionPoint {
  year: number;
  age: number;
  balance: number;
  target: number;
  /** Annual contribution to portfolio (savings + employer match, after growth) */
  contribution?: number;
  /** Investment growth for the year (balance change minus contributions minus cash flows) */
  growth?: number;
  /** Net cash flow events active this year (income CFs - expense CFs) */
  cashFlowNet?: number;
  /** Gross income for this year (base + income growth + income cash flows) */
  income?: number;
  /** Expenses for this year (base + expense growth + expense cash flows) */
  expenses?: number;
  /** Net savings: contribution + cashFlowNet (what actually flows to portfolio) */
  savings?: number;
}

export interface QuickFireSummary {
  fireNumber: number;
  saferFireNumber: number;
  yearsToFi: number | null;
  fireAge: number | null;
  coastGap: number;
  coastAge: number | null;
  savingsRate: number;
  projection: ProjectionPoint[];
}

export interface FireTypeSummary {
  id: "traditional" | "lean" | "fat" | "coast" | "barista";
  label: string;
  target: number;
  progress: number;
  description: string;
  status: string;
}
