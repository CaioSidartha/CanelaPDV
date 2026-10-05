import { useEffect, useRef, useState } from "react";

export type BarcodeScannerOptions = {
  /** Quando false, não escuta teclado (ex.: comandas fora da aba “Adicionar”). */
  enabled?: boolean;
  onScan: (code: string, meta: { raw: string; source: "global-keyboard" }) => void;
  /**
   * Em <input>, só acumula buffer se o id estiver aqui (evita roubar dígitos do peso, modais, etc.).
   * Fora de input/textarea, sempre acumula (leitor com foco “no ar”).
   */
  allowedInputIds: string[];
  /** Se passar deste tempo entre duas teclas, zera o buffer (leitor rápido vs digitação humana). */
  interKeyResetMs?: number;
  minLength?: number;
  debugName?: string;
  diagnostics?: boolean;
  onDiagnosticLine?: (line: string) => void;
};

function getBarcodeDebugEnabled(): boolean {
  try {
    if (typeof window === "undefined") return false;
    const v = window.localStorage.getItem("barcodeDebug");
    return v === "1" || v === "true" || v === "on";
  } catch {
    return false;
  }
}

function charFromLegacyKeyCode(e: KeyboardEvent): string | null {
  const kc = e.keyCode || (e as unknown as { which?: number }).which;
  if (kc == null) return null;
  if (kc >= 48 && kc <= 57) return String.fromCharCode(kc);
  if (kc >= 96 && kc <= 105) return String.fromCharCode(kc - 96 + 48);
  return null;
}

function shouldIgnoreTarget(active: Element | null, allowedInputIds: string[]): boolean {
  if (!active || !(active instanceof HTMLElement)) return false;
  if (active instanceof HTMLTextAreaElement) return true;
  if (active.isContentEditable) return true;
  if (active instanceof HTMLSelectElement) return true;
  if (active instanceof HTMLInputElement) {
    const id = active.id;
    return !allowedInputIds.includes(id);
  }
  return false;
}

/**
 * PDV clássico: escuta global de teclado, monta buffer rápido, Enter dispara onScan.
 * Não depende de “colar” nem de evento input do React.
 */
export function useBarcodeScanner(options: BarcodeScannerOptions) {
  const {
    enabled = true,
    onScan,
    allowedInputIds,
    interKeyResetMs = 120,
    minLength = 6,
    debugName,
    diagnostics = false,
    onDiagnosticLine,
  } = options;

  const allowedInputIdsRef = useRef(allowedInputIds);
  allowedInputIdsRef.current = allowedInputIds;

  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const onDiagnosticLineRef = useRef(onDiagnosticLine);
  onDiagnosticLineRef.current = onDiagnosticLine;

  const bufferRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastEvent, setLastEvent] = useState("");
  const [bufferPreview, setBufferPreview] = useState("");

  const [lsDebug, setLsDebug] = useState(false);
  useEffect(() => {
    setLsDebug(getBarcodeDebugEnabled());
  }, []);

  useEffect(() => {
    if (!enabled) {
      bufferRef.current = "";
      setBufferPreview("");
      return;
    }

    const verboseNow = diagnostics || lsDebug;

    const pushDiag = (line: string) => {
      const stamp = new Date().toISOString().slice(11, 23);
      const full = `${stamp} ${line}`;
      onDiagnosticLineRef.current?.(full);
      if (verboseNow) {
        console.debug(`[barcode${debugName ? `:${debugName}` : ""}]`, full);
      }
    };

    const clearTimer = () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const resetBufferIdle = () => {
      clearTimer();
      timerRef.current = setTimeout(() => {
        if (bufferRef.current) {
          pushDiag(`idle reset (${interKeyResetMs}ms) tinha "${bufferRef.current}"`);
        }
        bufferRef.current = "";
        setBufferPreview("");
      }, interKeyResetMs);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const active = document.activeElement;
      const allowedIds = allowedInputIdsRef.current;
      if (shouldIgnoreTarget(active, allowedIds)) return;

      const key = e.key;
      setLastEvent(`${key} @${active instanceof HTMLElement ? active.tagName + (active.id ? `#${active.id}` : "") : "?"}`);

      if (key === "Enter" || key === "NumpadEnter") {
        const rawBuf = bufferRef.current;
        clearTimer();
        bufferRef.current = "";
        setBufferPreview("");

        const activeEl = document.activeElement;
        let code = rawBuf.trim();
        if (activeEl instanceof HTMLInputElement && allowedIds.includes(activeEl.id)) {
          // Digitação lenta no campo de busca: o buffer por timeout pode estar incompleto;
          // o valor do input é a fonte correta quando o foco está nele.
          code = activeEl.value.trim();
        }

        if (code.length >= minLength) {
          pushDiag(`ENTER → scan "${code}" (${code.length})`);
          onScanRef.current(code, { raw: rawBuf, source: "global-keyboard" });
          e.preventDefault();
          e.stopPropagation();
        } else if (rawBuf.length || code.length) {
          pushDiag(
            `ENTER ignorado (buf "${rawBuf}" / input "${code}" — ${code.length} < ${minLength})`,
          );
        }
        return;
      }

      let ch: string | null = null;
      if (key.length === 1) ch = key;
      else if (key === "Unidentified" || key === "Process" || key === "") {
        ch = charFromLegacyKeyCode(e);
      }
      if (!ch) return;

      bufferRef.current += ch;
      setBufferPreview(bufferRef.current);
      pushDiag(`+ "${ch}" → buf "${bufferRef.current.slice(-32)}"`);
      resetBufferIdle();
    };

    window.addEventListener("keydown", onKeyDown, true);

    const rawScannerProbe = (ev: KeyboardEvent) => {
      console.log(ev.key);
    };
    if (verboseNow) {
      window.addEventListener("keydown", rawScannerProbe, false);
      pushDiag("probe: console.log(e.key) ativo (só com debug)");
    }

    pushDiag(
      `PDV listener ON (reset=${interKeyResetMs}ms minLen=${minLength} ids=${allowedInputIdsRef.current.join(",")})`,
    );

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      if (verboseNow) {
        window.removeEventListener("keydown", rawScannerProbe, false);
      }
      clearTimer();
      bufferRef.current = "";
      setBufferPreview("");
      pushDiag("PDV listener OFF");
    };
  }, [
    debugName,
    diagnostics,
    enabled,
    interKeyResetMs,
    lsDebug,
    minLength,
  ]);

  return { debugEnabled: diagnostics || lsDebug, lastEvent, bufferPreview };
}
