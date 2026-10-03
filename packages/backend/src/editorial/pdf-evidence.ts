import { Worker } from 'node:worker_threads';

export const PDF_EVIDENCE_LIMITS = {
  parser: 'unpdf@1.8.1', deadlineMs: 8000, maxBytes: 6 * 1024 * 1024,
  maxPages: 40, maxTextChars: 200_000, memoryMb: 96,
} as const;
type Limits = { deadlineMs?: number; maxBytes?: number; maxPages?: number; maxTextChars?: number };

/** Disposable worker with a JS heap limit; byte/page/text caps also bound external allocations. */
export async function extractPdfEvidence(bytes: Buffer, options: Limits = {}): Promise<string | null> {
  const limits = { ...PDF_EVIDENCE_LIMITS, ...options };
  if (!bytes.length || bytes.length > limits.maxBytes || limits.deadlineMs <= 0 || limits.maxPages <= 0 ||
      limits.maxTextChars <= 0 || bytes.subarray(0, 5).toString() !== '%PDF-') return null;
  return new Promise(resolve => {
    const worker = new Worker(new URL('./pdf-evidence-worker.ts', import.meta.url), {
      workerData: { bytes: new Uint8Array(bytes), maxPages: limits.maxPages, maxTextChars: limits.maxTextChars },
      resourceLimits: { maxOldGenerationSizeMb: limits.memoryMb, maxYoungGenerationSizeMb: 16, stackSizeMb: 4 },
    });
    let done = false;
    const finish = (value: unknown) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      void worker.terminate();
      resolve(typeof value === 'string' && value.trim() && value.length <= limits.maxTextChars ? value : null);
    };
    const timer = setTimeout(() => finish(null), limits.deadlineMs);
    worker.once('message', finish);
    worker.once('error', () => finish(null));
    worker.once('exit', () => finish(null));
  });
}
