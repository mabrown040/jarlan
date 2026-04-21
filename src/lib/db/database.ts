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

/**
 * Return the id of the scenario currently marked as the active draft,
 * or null if none. Used by the scenario switcher to highlight which
 * entry in the list is live.
 */
export async function getActiveDraftId(): Promise<string | null> {
  const record = await db.meta.get(DRAFT_SCENARIO_KEY);
  return record?.value ?? null;
}

/** Switch the active draft pointer WITHOUT touching scenario records. */
export async function setActiveDraftId(scenarioId: string) {
  await db.meta.put({ key: DRAFT_SCENARIO_KEY, value: scenarioId });
}

/**
 * Store a scenario in IndexedDB without changing the active-draft
 * pointer. Used when duplicating / importing — the new scenario
 * shouldn't take over focus from whatever the user's currently
 * looking at unless they explicitly switch.
 */
export async function upsertScenarioRecord(scenario: Scenario) {
  await db.scenarios.put({
    id: scenario.id,
    name: scenario.name,
    scenario,
    createdAt: scenario.createdAt,
    updatedAt: scenario.updatedAt,
    isDraft: 1,
  });
}

/**
 * Delete a scenario by id. If it was the active draft, the caller
 * is responsible for switching to another scenario afterwards (or
 * falling back to the default). This fn is deliberately low-level so
 * the store can orchestrate the UX around deletion.
 */
export async function deleteScenarioRecord(scenarioId: string) {
  await db.scenarios.delete(scenarioId);
  const activeId = await getActiveDraftId();
  if (activeId === scenarioId) {
    await db.meta.delete(DRAFT_SCENARIO_KEY);
  }
}

/** Load a specific scenario by id (for switching between saved plans). */
export async function loadScenarioById(
  scenarioId: string,
): Promise<Scenario | null> {
  const record = await db.scenarios.get(scenarioId);
  return record?.scenario ?? null;
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
