/**
 * Supabase sync layer for Scenario records.
 *
 * Design principles (see docs/cloud-sync.md):
 * - Local-first: Dexie is always the source of truth during a session.
 *   Supabase is the eventual-consistency target.
 * - Best-effort: all sync calls swallow errors silently. If the network
 *   is down or Supabase is unconfigured, the app continues using local
 *   data without interruption.
 * - Last-write-wins by updatedAt. No CRDT, no three-way merge.
 */

import { parseScenario } from "@/lib/domain/schema";
import type { Scenario } from "@/lib/domain/types";

import { getSupabaseBrowserClient } from "./client";
import type { Json } from "./database.types";

/**
 * Upsert a scenario to the cloud for the currently signed-in user.
 *
 * Returns true if the write was attempted against Supabase, false if
 * skipped (no session, not configured, or error). Callers can ignore
 * the return value — it's informational only.
 */
export async function syncScenarioToCloud(scenario: Scenario): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.from("scenarios").upsert(
      {
        id: scenario.id,
        owner_id: user.id,
        name: scenario.name,
        data: scenario as unknown as Json,
        schema_ver: scenario.version ?? 2,
        updated_at: new Date(scenario.updatedAt).toISOString(),
      },
      { onConflict: "id" },
    );

    if (error) {
      console.warn("[cloud-sync] upsert failed:", error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[cloud-sync] upsert threw:", error);
    return false;
  }
}

/**
 * Delete a scenario from the cloud.
 *
 * Called when a scenario is deleted locally. Safe to call if the row
 * doesn't exist in Supabase (idempotent).
 */
export async function deleteScenarioFromCloud(
  scenarioId: string,
): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from("scenarios")
      .delete()
      .eq("id", scenarioId)
      .eq("owner_id", user.id);

    if (error) {
      console.warn("[cloud-sync] delete failed:", error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[cloud-sync] delete threw:", error);
    return false;
  }
}

/**
 * Pull all scenarios owned by the signed-in user from Supabase.
 *
 * Returns an empty array if not signed in, not configured, or on error.
 */
export async function pullScenariosFromCloud(): Promise<Scenario[]> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return [];

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("scenarios")
      .select("id, name, data, updated_at")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.warn("[cloud-sync] pull failed:", error.message);
      return [];
    }

    // Re-validate cloud rows through parseScenario before they hit local
    // state. A corrupt or stale schema row would otherwise silently
    // poison the client and produce wrong numbers in the UI. Rows that
    // fail validation are dropped with a warning — better to lose a
    // scenario than to display incorrect math.
    const scenarios: Scenario[] = [];
    for (const row of data ?? []) {
      const parsed = parseScenario(row.data);
      if (parsed) {
        scenarios.push(parsed);
      } else {
        console.warn(
          "[cloud-sync] dropping unparseable scenario row:",
          row.id,
        );
      }
    }
    return scenarios;
  } catch (error) {
    console.warn("[cloud-sync] pull threw:", error);
    return [];
  }
}

/**
 * Bulk-push every scenario in the array to Supabase.
 *
 * Called on sign-in to upload any local scenarios the user created
 * before they had an account. Stamps owner_id to the current user.
 *
 * Returns count of successful pushes.
 */
export async function pushLocalScenariosToCloud(
  scenarios: Scenario[],
): Promise<number> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return 0;
  if (scenarios.length === 0) return 0;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;

    const rows = scenarios.map((scenario) => ({
      id: scenario.id,
      owner_id: user.id,
      name: scenario.name,
      data: scenario as unknown as Json,
      schema_ver: scenario.version ?? 2,
      updated_at: new Date(scenario.updatedAt).toISOString(),
    }));

    const { error, count } = await supabase
      .from("scenarios")
      .upsert(rows, { onConflict: "id", count: "exact" });

    if (error) {
      console.warn("[cloud-sync] bulk push failed:", error.message);
      return 0;
    }
    return count ?? rows.length;
  } catch (error) {
    console.warn("[cloud-sync] bulk push threw:", error);
    return 0;
  }
}
