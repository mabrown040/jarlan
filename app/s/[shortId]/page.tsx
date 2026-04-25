/**
 * Short-link receiver: GET /s/[shortId].
 *
 * Looks up the scenario by short_id and redirects to the existing
 * `/?scenario=...` receiver, which knows how to hydrate the
 * scenario into the client store and route the user to the right
 * initial page.
 *
 * Server-side fetch + redirect keeps the recipient experience
 * fast: one round trip to our origin, then one redirect, then the
 * client app loads with the scenario already in the URL. No
 * client-side fetch hop required.
 *
 * 404 when:
 *   - short_id format is invalid
 *   - short_id doesn't exist in share_links
 *   - the stored scenario blob fails parseScenario
 *     (e.g., schema migrated past it)
 */

import { notFound, redirect } from "next/navigation";

import {
  SCENARIO_QUERY_KEY,
  serializeScenarioToSearchParam,
} from "@/lib/share/scenario-url";
import { getScenarioByShortId } from "@/lib/share/short-link";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ shortId: string }>;
}

// Defensive guard: don't even hit the DB for shapes that can't
// possibly be valid short IDs. 4–32 chars, alphanumeric.
const SHORT_ID_PATTERN = /^[a-zA-Z0-9]{4,32}$/;

export default async function ShortLinkPage({ params }: PageProps) {
  const { shortId } = await params;
  if (!SHORT_ID_PATTERN.test(shortId)) {
    notFound();
  }

  const scenario = await getScenarioByShortId(shortId);
  if (!scenario) {
    notFound();
  }

  const param = serializeScenarioToSearchParam(scenario);
  redirect(`/?${SCENARIO_QUERY_KEY}=${param}`);
}
