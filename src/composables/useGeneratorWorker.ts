/**
 * AmneziaWG Architect — composable that runs batch generation in a worker.
 */

import { ref } from "vue";
import type { GeneratorInput, AWGConfig } from "@/engines/awg/generator";
import type { WorkerRequest, WorkerResponse } from "@/workers/generator.worker";

let worker: Worker | null = null;

export function useGeneratorWorker() {
  const isRunning = ref(false);
  const error = ref("");

  function getWorker(): Worker {
    if (!worker) {
      worker = new Worker(
        new URL("../workers/generator.worker.ts", import.meta.url),
        { type: "module" },
      );
    }
    return worker;
  }

  function generateInWorker(
    input: GeneratorInput,
    count: number,
  ): Promise<AWGConfig[]> {
    return new Promise((resolve, reject) => {
      isRunning.value = true;
      error.value = "";

      const id = crypto.randomUUID();
      const w = getWorker();

      function detach(): void {
        w.removeEventListener("message", onMessage);
        w.removeEventListener("error", onError);
        isRunning.value = false;
      }

      function onMessage(event: MessageEvent<WorkerResponse>) {
        if (event.data.id !== id) return;
        detach();
        if (event.data.error) {
          error.value = event.data.error;
          reject(new Error(event.data.error));
        } else {
          resolve(event.data.configs);
        }
      }

      /**
       * A worker that dies before it answers used to leave `isRunning` true
       * and the spinner on it spinning — an `infinite` CSS animation, running
       * for the rest of the session, for work that stopped long ago.
       */
      function onError(): void {
        detach();
        error.value = "worker failed";
        reject(new Error("worker failed"));
      }

      w.addEventListener("message", onMessage);
      w.addEventListener("error", onError, { once: true });
      w.postMessage({ id, input, count } satisfies WorkerRequest);
    });
  }

  return {
    isRunning,
    error,
    generateInWorker,
  };
}
