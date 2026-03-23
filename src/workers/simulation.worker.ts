/// <reference lib="webworker" />

import type {
  SimulationWorkerRequest,
  SimulationWorkerResponse,
} from "@/lib/sim/contracts";
import { runHistoricalBacktest } from "@/lib/sim/historical-backtest";
import { runMonteCarloSimulation } from "@/lib/sim/monte-carlo";

const workerScope = self as DedicatedWorkerGlobalScope;

workerScope.onmessage = (event: MessageEvent<SimulationWorkerRequest>) => {
  const response: SimulationWorkerResponse = {
    requestId: event.data.requestId,
  };

  try {
    response.result =
      event.data.request.kind === "historical"
        ? runHistoricalBacktest(event.data.request)
        : runMonteCarloSimulation(event.data.request);
  } catch (error) {
    response.error =
      error instanceof Error ? error.message : "Unknown simulation error.";
  }

  workerScope.postMessage(response);
};

export {};
