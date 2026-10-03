import { parentPort, workerData } from 'node:worker_threads';
import { getDocumentProxy } from 'unpdf';

// Local bytes only. Reject evaluation and any unexpected external-resource request.
globalThis.fetch = async () => { throw new Error('PDF external resources disabled'); };
globalThis.eval = () => { throw new Error('PDF evaluation disabled'); };
globalThis.Function = new Proxy(Function, {
  construct() { throw new Error('PDF evaluation disabled'); },
  apply() { throw new Error('PDF evaluation disabled'); },
});
try {
  const pdf = await getDocumentProxy(new Uint8Array(workerData.bytes), {
    useWorkerFetch: false, disableFontFace: true, useSystemFonts: false,
    isOffscreenCanvasSupported: false, enableXfa: false,
    standardFontDataUrl: undefined, cMapUrl: undefined, verbosity: 0,
  });
  try {
    if (pdf.numPages > workerData.maxPages) throw new Error('PDF page limit');
    const pages: string[] = [];
    let chars = 0;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i), content = await page.getTextContent();
      const text = content.items.map(item => 'str' in item
        ? item.str + ('hasEOL' in item && item.hasEOL ? '\n' : ' ') : '').join('').trim();
      chars += text.length;
      if (chars > workerData.maxTextChars) throw new Error('PDF text limit');
      pages.push(text);
      page.cleanup();
    }
    parentPort?.postMessage(pages.join('\n\n').trim() || null);
  } finally { await pdf.loadingTask.destroy(); }
} catch { parentPort?.postMessage(null); }
