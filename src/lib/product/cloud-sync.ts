import {
  listCloudSyncRecords,
  loadScenarioDraft,
  upsertCloudSyncRecord,
} from "@/lib/db";
import type { Scenario } from "@/lib/domain/types";
import { hasProAccess, loadAccountProfile } from "@/lib/product/account";

const configuredEndpoint =
  process.env.NEXT_PUBLIC_FIRECALC_CLOUD_SYNC_ENDPOINT ?? null;

export function getCloudSyncCapabilities() {
  return {
    endpointConfigured: Boolean(configuredEndpoint),
    endpoint: configuredEndpoint,
    mode: configuredEndpoint ? "remote" : "local-preview",
  } as const;
}

export async function syncScenarioForActiveAccount(scenario: Scenario) {
  const accountProfile = await loadAccountProfile();

  if (!accountProfile || !hasProAccess(accountProfile) || !accountProfile.cloudSyncEnabled) {
    return null;
  }

  const now = new Date().toISOString();
  const baseRecord = {
    scenarioId: scenario.id,
    accountId: accountProfile.id,
    scenarioName: scenario.name,
    endpoint: configuredEndpoint,
    lastAttemptedAt: now,
  };

  if (!configuredEndpoint) {
    const localPreviewRecord = {
      ...baseRecord,
      status: "local_only" as const,
      lastSyncedAt: now,
      lastError: null,
    };

    await upsertCloudSyncRecord(localPreviewRecord);
    return localPreviewRecord;
  }

  await upsertCloudSyncRecord({
    ...baseRecord,
    status: "pending",
    lastSyncedAt: null,
    lastError: null,
  });

  try {
    const response = await fetch(configuredEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accountProfile.sessionToken}`,
      },
      body: JSON.stringify({
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        updatedAt: scenario.updatedAt,
        scenario,
      }),
    });

    if (!response.ok) {
      throw new Error(`Cloud sync failed with ${response.status}.`);
    }

    const syncedRecord = {
      ...baseRecord,
      status: "synced" as const,
      lastSyncedAt: now,
      lastError: null,
    };
    await upsertCloudSyncRecord(syncedRecord);
    return syncedRecord;
  } catch (error) {
    const failedRecord = {
      ...baseRecord,
      status: "error" as const,
      lastSyncedAt: null,
      lastError: error instanceof Error ? error.message : "Cloud sync failed.",
    };
    await upsertCloudSyncRecord(failedRecord);
    return failedRecord;
  }
}

export async function syncDraftForActiveAccount() {
  const draft = await loadScenarioDraft();

  if (!draft) {
    return null;
  }

  return syncScenarioForActiveAccount(draft);
}

export async function loadCloudSyncOverview() {
  const accountProfile = await loadAccountProfile();
  const records = accountProfile
    ? await listCloudSyncRecords(accountProfile.id)
    : [];

  return {
    accountProfile,
    records,
    capabilities: getCloudSyncCapabilities(),
  };
}
