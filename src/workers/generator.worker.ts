/**
 * AmneziaWG Architect — Web Worker for batch generation.
 *
 * Offloads generateBatch() to a background thread so the main thread
 * stays responsive even for hundreds of configs.
 */

import { generateBatch } from "@/engines/awg/generator";
import type { GeneratorInput, AWGConfig } from "@/engines/awg/generator";

export interface WorkerRequest {
  id: string;
  input: GeneratorInput;
  count: number;
}

export interface WorkerResponse {
  id: string;
  configs: AWGConfig[];
  error?: string;
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, input, count } = event.data;
  try {
    const configs = generateBatch(input, count);
    self.postMessage({ id, configs } satisfies WorkerResponse);
  } catch (e) {
    self.postMessage({
      id,
      configs: [],
      error: e instanceof Error ? e.message : String(e),
    } satisfies WorkerResponse);
  }
};
