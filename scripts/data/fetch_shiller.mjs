import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as XLSX from "xlsx";

const SHILLER_URL = "http://www.econ.yale.edu/~shiller/data/ie_data.xls";
const BOND_DURATION_YEARS = 7.5;

function roundTo(value, digits = 10) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function numberOrNull(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseShillerDate(dateValue) {
  const year = Math.trunc(dateValue);
  const month = Math.round((dateValue - year) * 100);

  if (month < 1 || month > 12) {
    return null;
  }

  return {
    year,
    month,
    date: `${year}-${String(month).padStart(2, "0")}`,
  };
}

function estimateBondReturns(previousRecord, currentRecord) {
  if (previousRecord === null) {
    return {
      nominalBondReturn: null,
      realBondReturn: null,
      inflationRate: null,
    };
  }

  const previousYield = previousRecord.gs10 / 100;
  const currentYield = currentRecord.gs10 / 100;
  const inflationFactor = currentRecord.cpi / previousRecord.cpi;
  const couponReturn = previousYield / 12;
  const modifiedDuration = BOND_DURATION_YEARS / (1 + previousYield);
  const priceReturn = -modifiedDuration * (currentYield - previousYield);
  const nominalBondReturn = couponReturn + priceReturn;
  const realBondReturn = (1 + nominalBondReturn) / inflationFactor - 1;

  return {
    nominalBondReturn: roundTo(nominalBondReturn),
    realBondReturn: roundTo(realBondReturn),
    inflationRate: roundTo(inflationFactor - 1),
  };
}

async function updateManifest(manifestPath, datasetMeta) {
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));

  manifest.generatedAt = new Date().toISOString();
  manifest.datasets = manifest.datasets.map((dataset) =>
    dataset.id === "shiller-monthly"
      ? {
          ...dataset,
          version: datasetMeta.version,
          status: "ready",
          path: "data/shiller.json",
          startDate: datasetMeta.startDate,
          endDate: datasetMeta.endDate,
          recordCount: datasetMeta.recordCount,
        }
      : dataset,
  );

  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

async function main() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const root = path.resolve(__dirname, "../..");
  const cacheDir = path.join(root, ".cache", "shiller");
  const cachePath = path.join(cacheDir, "ie_data.xls");
  const outputPath = path.join(root, "data", "shiller.json");
  const manifestPath = path.join(root, "data", "manifest.json");

  await fs.mkdir(cacheDir, { recursive: true });

  const response = await fetch(SHILLER_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch Shiller data: ${response.status}`);
  }

  const workbookBuffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(cachePath, workbookBuffer);

  const workbook = XLSX.read(workbookBuffer, { type: "buffer" });
  const worksheet = workbook.Sheets.Data;
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: null,
  });

  const records = [];
  let previousRecord = null;

  for (const row of rows.slice(8)) {
    if (typeof row[0] !== "number") {
      continue;
    }

    const parsedDate = parseShillerDate(row[0]);

    if (!parsedDate) {
      continue;
    }

    const currentRecord = {
      ...parsedDate,
      nominalPrice: numberOrNull(row[1]),
      nominalDividend: numberOrNull(row[2]),
      nominalEarnings: numberOrNull(row[3]),
      cpi: numberOrNull(row[4]),
      dateFraction: numberOrNull(row[5]),
      gs10: numberOrNull(row[6]),
      realPrice: numberOrNull(row[7]),
      realDividend: numberOrNull(row[8]),
      realTotalReturnPrice: numberOrNull(row[9]),
      realEarnings: numberOrNull(row[10]),
      realScaledEarnings: numberOrNull(row[11]),
      cape: numberOrNull(row[12]),
      trCape: numberOrNull(row[14]),
      realStockReturn: null,
    };

    if (
      currentRecord.cpi === null ||
      currentRecord.gs10 === null ||
      currentRecord.realTotalReturnPrice === null
    ) {
      continue;
    }

    currentRecord.realStockReturn =
      previousRecord && previousRecord.realTotalReturnPrice !== null
        ? roundTo(
            currentRecord.realTotalReturnPrice /
              previousRecord.realTotalReturnPrice -
              1,
          )
        : null;

    const bondReturns = estimateBondReturns(previousRecord, currentRecord);

    records.push({
      ...currentRecord,
      inflationRate: bondReturns.inflationRate,
      nominalBondReturn: bondReturns.nominalBondReturn,
      realBondReturn: bondReturns.realBondReturn,
    });

    previousRecord = currentRecord;
  }

  if (records.length === 0) {
    throw new Error("No Shiller records were parsed.");
  }

  const dataset = {
    version: "v1",
    generatedAt: new Date().toISOString(),
    source: {
      url: SHILLER_URL,
      workbookSheet: "Data",
      downloadedWorkbookPath: ".cache/shiller/ie_data.xls",
    },
    methodology: {
      stockReturn:
        "Monthly real stock returns are derived from the Shiller real total return price column.",
      bondReturn:
        "Monthly bond returns are estimated from GS10 using coupon carry plus a modified-duration price change approximation.",
      bondDurationYears: BOND_DURATION_YEARS,
    },
    startDate: records[0].date,
    endDate: records.at(-1)?.date ?? records[0].date,
    recordCount: records.length,
    records,
  };

  await fs.writeFile(outputPath, `${JSON.stringify(dataset, null, 2)}\n`);
  await updateManifest(manifestPath, dataset);

  console.log(
    `Wrote ${dataset.recordCount} monthly Shiller records (${dataset.startDate} to ${dataset.endDate}) to ${path.relative(root, outputPath)}.`,
  );
}

await main();
