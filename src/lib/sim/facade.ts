import type {
  SimulationRequest,
  SimulationResult,
  SimulationWorkerResponse,
} from "@/lib/sim/contracts";

let simulationWorker: Worker | null = null;

function getSimulationWorker() {
  if (typeof window === "undefined") {
    throw new Error("Simulation workers are only available in the browser.");
  }

  if (!simulationWorker) {
    simulationWorker = new Worker(
      new URL("../../workers/simulation.worker.ts", import.meta.url),
      { type: "module" },
    );
  }

  return simulationWorker;
}

export function runSimulation(request: SimulationRequest) {
  const worker = getSimulationWorker();

  return new Promise<SimulationResult>((resolve, reject) => {
    const requestId = crypto.randomUUID();

    const handleMessage = (event: MessageEvent<SimulationWorkerResponse>) => {
      if (event.data.requestId !== requestId) {
        return;
      }

      worker.removeEventListener("message", handleMessage);

      if (event.data.error) {
        reject(new Error(event.data.error));
        return;
      }

      resolve(event.data.result as SimulationResult);
    };

    worker.addEventListener("message", handleMessage);
    worker.postMessage({
      requestId,
      request,
    });
  });
}

export const simulationCapabilities = {
  supportedHistoricalDatasets: ["shiller-monthly-v1"],
  supportedMonteCarloModes: [
    "parametric",
    "bootstrap",
    "block-bootstrap",
    "regime-switching",
  ],
  executionModel: "web-worker",
} as const;
