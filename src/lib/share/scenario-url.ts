import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";

import { parseScenario } from "@/lib/domain/schema";
import type { Scenario } from "@/lib/domain/types";

export const SCENARIO_QUERY_KEY = "scenario";

export function serializeScenarioToSearchParam(scenario: Scenario) {
  return compressToEncodedURIComponent(JSON.stringify(scenario));
}

export function deserializeScenarioFromSearchParam(encodedScenario: string) {
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
