import Dexie, { type Table } from "dexie";

import type { Scenario } from "@/lib/domain/types";

export interface StoredScenarioRecord {
  id: string;
  name: string;
  scenario: Scenario;
  createdAt: string;
  updatedAt: string;
  isDraft: 0 | 1;
}

interface MetaRecord {
  key: string;
  value: string;
}

export interface ScenarioSnapshotRecord {
  id?: number;
  scenarioId: string;
  capturedAt: string;
  netWorth: number;
  retirementExpenses: number;
  accountBalances: Array<{
    id: string;
    name: string;
    type: string;
    balance: number;
  }>;
}

export interface CloudSyncRecord {
  scenarioId: string;
  accountId: string;
  scenarioName: string;
  status: "local_only" | "pending" | "synced" | "error";
  endpoint: string | null;
  lastAttemptedAt: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
}

class FirecalcDatabase extends Dexie {
  scenarios!: Table<StoredScenarioRecord, string>;
  meta!: Table<MetaRecord, string>;
  snapshots!: Table<ScenarioSnapshotRecord, number>;
  cloudSync!: Table<CloudSyncRecord, string>;

  constructor() {
    super("firecalc");

    this.version(1).stores({
      scenarios: "&id, updatedAt, name, isDraft",
      meta: "&key",
    });
    this.version(2).stores({
      scenarios: "&id, updatedAt, name, isDraft",
      meta: "&key",
      snapshots: "++id, scenarioId, capturedAt",
    });
    this.version(3).stores({
      scenarios: "&id, updatedAt, name, isDraft",
      meta: "&key",
      snapshots: "++id, scenarioId, capturedAt",
      cloudSync: "&scenarioId, accountId, status, lastSyncedAt",
    });
  }
}

export const db = new FirecalcDatabase();
const DRAFT_SCENARIO_KEY = "draftScenarioId";

export async function saveScenarioDraft(scenario: Scenario) {
  await db.scenarios.put({
    id: scenario.id,
    name: scenario.name,
    scenario,
    createdAt: scenario.createdAt,
    updatedAt: scenario.updatedAt,
    isDraft: 1,
  });

  await db.meta.put({
    key: DRAFT_SCENARIO_KEY,
    value: scenario.id,
  });
}

export async function loadScenarioDraft() {
  const draftId = await db.meta.get(DRAFT_SCENARIO_KEY);

  if (!draftId) {
    return null;
  }

  const record = await db.scenarios.get(draftId.value);
  return record?.scenario ?? null;
}

export async function clearScenarioDraft() {
  const draftId = await db.meta.get(DRAFT_SCENARIO_KEY);
  if (draftId) {
    await db.scenarios.delete(draftId.value);
  }
  await db.meta.delete(DRAFT_SCENARIO_KEY);
}

export async function listStoredScenarios() {
  return db.scenarios.orderBy("updatedAt").reverse().toArray();
}

export async function captureScenarioSnapshot(scenario: Scenario) {
  await db.snapshots.add({
    scenarioId: scenario.id,
    capturedAt: new Date().toISOString(),
    netWorth: scenario.accounts.reduce(
      (total, account) => total + account.currentBalance,
      0,
    ),
    retirementExpenses: scenario.retirementExpenses,
    accountBalances: scenario.accounts.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      balance: account.currentBalance,
    })),
  });
}

export async function listScenarioSnapshots(scenarioId: string) {
  const snapshots = await db.snapshots.where("scenarioId").equals(scenarioId).toArray();
  return snapshots.sort((left, right) => left.capturedAt.localeCompare(right.capturedAt));
}

export async function saveMetaJson<T>(key: string, value: T) {
  await db.meta.put({
    key,
    value: JSON.stringify(value),
  });
}

export async function loadMetaJson<T>(key: string) {
  const record = await db.meta.get(key);

  if (!record) {
    return null;
  }

  try {
    return JSON.parse(record.value) as T;
  } catch {
    return null;
  }
}

export async function upsertCloudSyncRecord(record: CloudSyncRecord) {
  await db.cloudSync.put(record);
}

export async function listCloudSyncRecords(accountId?: string) {
  const records = accountId
    ? await db.cloudSync.where("accountId").equals(accountId).toArray()
    : await db.cloudSync.toArray();

  return records.sort((left, right) =>
    (right.lastAttemptedAt ?? "").localeCompare(left.lastAttemptedAt ?? ""),
  );
}
