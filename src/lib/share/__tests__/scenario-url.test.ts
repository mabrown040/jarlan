import { describe, expect, it } from "vitest";

import { createDefaultScenario } from "@/lib/domain";
import {
  deserializeScenarioFromSearchParam,
  serializeScenarioToSearchParam,
} from "@/lib/share";

describe("scenario url serialization", () => {
  it("round-trips a scenario through the URL payload", () => {
    const scenario = createDefaultScenario();
    const serialized = serializeScenarioToSearchParam(scenario);
    const deserialized = deserializeScenarioFromSearchParam(serialized);

    expect(deserialized).toEqual(scenario);
  });
});
