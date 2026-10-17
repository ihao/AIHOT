import type { WebModule } from "../modules";

export interface RootModuleData { data: Record<string, unknown>; now: number }

/** Public API reads for module root parts, with the same response clock on the server and during hydration. */
export async function loadRootModuleData(request: Request, modules: readonly WebModule[], read: (path: string, signal: AbortSignal) => Promise<unknown>): Promise<Record<string, RootModuleData>> {
  const parts = await Promise.all(modules.filter(m => m.root?.data).map(async m => {
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(2000)]);
    const entries = await Promise.all(Object.entries(m.root!.data!).map(async ([key, path]) => {
      try { return [key, await read(path, signal)] as const; }
      catch { return [key, null] as const; }
    }));
    const data = Object.fromEntries(entries);
    return [m.name, { data, now: m.root!.renderClock?.(data, Date.now()) ?? 0 }] as const;
  }));
  return Object.fromEntries(parts);
}
