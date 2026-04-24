import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";

import { parseScenario } from "@/lib/domain/schema";
import type { Scenario } from "@/lib/domain/types";

export const SCENARIO_QUERY_KEY = "scenario";

// Hard cap on encoded payload length. Guards against memory/CPU bombs
// from oversized decompression on untrusted share-link input. A real
// scenario compresses to ~2-8KB; 512KB is ~60x the worst legitimate case.
const MAX_ENCODED_LENGTH = 512 * 1024;

export function serializeScenarioToSearchParam(scenario: Scenario) {
  return compressToEncodedURIComponent(JSON.stringify(scenario));
}

export function deserializeScenarioFromSearchParam(encodedScenario: string) {
  if (encodedScenario.length > MAX_ENCODED_LENGTH) {
    return null;
  }

  const decoded = decompressFromEncodedURIComponent(encodedScenario);

  if (!decoded) {
    return null;
  }

  try {
    return parseScenario(JSON.parse(decoded));
  } catch {
    return null;
  }
}

export function buildScenarioShareUrl(baseUrl: string, scenario: Scenario) {
  const url = new URL(baseUrl);
  url.searchParams.set(
    SCENARIO_QUERY_KEY,
    serializeScenarioToSearchParam(scenario),
  );
  return url.toString();
}
