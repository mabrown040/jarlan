/**
 * Audit logging for admin paste extractions. Mirrors the
 * non-fatal pattern of `logAiCall()` — failures are logged
 * to the server console but do not disrupt the operator flow.
 *
 * Service-role only. The `admin_extractions` table has RLS
 * scoped to `auth.uid() = operator_id` AND
 * `app_metadata.role = 'admin'`, but writes go through the
 * service-role client which bypasses RLS by design.
 */

import { getSupabaseServiceClient } from "@/lib/supabase/server";

interface LogAdminExtractionParams {
  operatorId: string;
  sourceText: string;
  sourceType: string;
  extractedScenarioId?: string | null;
  assumptionCount: number;
}

/**
 * Insert a row into `public.admin_extractions`. Returns the row's
 * UUID on success, or `null` on failure (logging warning to
 * console). Does not throw — the caller is mid-flow producing
 * a scenario for the operator and should not be derailed by an
 * audit-table issue.
 */
export async function logAdminExtraction(
  params: LogAdminExtractionParams,
): Promise<string | null> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    if (typeof console !== "undefined") {
      console.warn(
        "[admin_extractions] supabase service client unavailable — skipping audit log",
      );
    }
    return null;
  }

  // The generated `Database` types in `database.types.ts` haven't
  // been regenerated yet to include `admin_extractions` (separate
  // task). Cast the table reference to a minimal local type so we
  // get type-safety on the row shape without depending on the
  // generated catalog.
  type AdminExtractionsTable = {
    insert: (row: {
      operator_id: string;
      source_text: string;
      source_type: string;
      extracted_scenario_id: string | null;
      assumption_count: number;
    }) => {
      select: (columns: string) => {
        single: () => Promise<{
          data: { id: string } | null;
          error: { message: string } | null;
        }>;
      };
    };
  };

  const table = supabase.from("admin_extractions") as unknown as AdminExtractionsTable;

  const { data, error } = await table
    .insert({
      operator_id: params.operatorId,
      source_text: params.sourceText,
      source_type: params.sourceType,
      extracted_scenario_id: params.extractedScenarioId ?? null,
      assumption_count: params.assumptionCount,
    })
    .select("id")
    .single();

  if (error) {
    if (typeof console !== "undefined") {
      console.warn("[admin_extractions] insert failed", error.message);
    }
    return null;
  }

  return data?.id ?? null;
}
