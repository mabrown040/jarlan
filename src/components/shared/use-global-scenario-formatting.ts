"use client";

import { useLayoutEffect, useReducer, useRef } from "react";

import { setGlobalFormatPreferences } from "@/lib/calc";
import type { Scenario } from "@/lib/domain/types";
import { getCountryPreset } from "@/lib/data";

export function useGlobalScenarioFormatting(scenario: Scenario) {
  const [, forceRender] = useReducer((value) => value + 1, 0);
  const signatureRef = useRef("");

  useLayoutEffect(() => {
    const countryPreset = getCountryPreset(scenario.profile.country);
    const nextSignature = `${scenario.currency}:${countryPreset.locale}`;

    if (signatureRef.current === nextSignature) {
      return;
    }

    signatureRef.current = nextSignature;
    setGlobalFormatPreferences({
      currency: scenario.currency,
      locale: countryPreset.locale,
    });
    forceRender();
  }, [scenario.currency, scenario.profile.country]);
}
