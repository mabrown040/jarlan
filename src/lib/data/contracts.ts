export interface DatasetManifestEntry {
  id: string;
  version: string;
  source: string;
  cadence: "annual" | "monthly" | "manual";
  path: string;
  status: "placeholder" | "ready";
  startDate?: string;
  endDate?: string;
  recordCount?: number;
}

export interface DatasetManifest {
  generatedAt: string;
  datasets: DatasetManifestEntry[];
}

export interface ShillerMonthlyRecord {
  year: number;
  month: number;
  date: string;
  nominalPrice: number | null;
  nominalDividend: number | null;
  nominalEarnings: number | null;
  cpi: number;
  dateFraction: number | null;
  gs10: number;
  realPrice: number | null;
  realDividend: number | null;
  realTotalReturnPrice: number;
  realEarnings: number | null;
  realScaledEarnings: number | null;
  cape: number | null;
  trCape: number | null;
  realStockReturn: number | null;
  inflationRate: number | null;
  nominalBondReturn: number | null;
  realBondReturn: number | null;
}

export interface ShillerDataset {
  version: string;
  generatedAt: string;
  source: {
    url: string;
    workbookSheet: string;
    downloadedWorkbookPath: string;
  };
  methodology: {
    stockReturn: string;
    bondReturn: string;
    bondDurationYears: number;
  };
  startDate: string;
  endDate: string;
  recordCount: number;
  records: ShillerMonthlyRecord[];
}

export type MortalityRecordTuple = [
  age: number,
  maleProbability: number,
  femaleProbability: number,
];

export interface MortalityRecord {
  age: number;
  maleProbability: number;
  femaleProbability: number;
  blendedProbability: number;
}

export interface MortalityDatasetRaw {
  version: string;
  status: "placeholder" | "ready";
  source: {
    url: string;
    tableYear: number;
    trusteesReport: string;
  };
  methodology: {
    description: string;
  };
  minAge: number;
  maxAge: number;
  recordCount: number;
  records: MortalityRecordTuple[];
}

export interface MortalityDataset
  extends Omit<MortalityDatasetRaw, "records"> {
  records: MortalityRecord[];
}
