import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export type ComandaCodeParts = {
  /** Ex.: "ter" (sempre ASCII, sem acento — barcode CODE128) */
  dow: string;
  /** Ex.: "2004" (DDMM) */
  ddmm: string;
  /** Ex.: "001" */
  seq3: string;
};

/** Remove acentos e caracteres inválidos para CODE128. */
export function toBarcodeSafeCode(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9\-_.]/g, "")
    .trim();
}

export function buildComandaCode(parts: ComandaCodeParts): string {
  return toBarcodeSafeCode(`${parts.dow}${parts.ddmm}${parts.seq3}`);
}

export function parseComandaNumberFromCode(code: string): string | null {
  const m = code.trim().match(/(\d{3})$/);
  return m ? m[1] : null;
}

export function formatDow3(date: Date): string {
  // date-fns ptBR: "sáb.", "seg." → "sab", "seg" (sem acento)
  const raw = format(date, "EEE", { locale: ptBR }).toLowerCase();
  return toBarcodeSafeCode(raw.replace(".", "")).slice(0, 3);
}

export function formatDdMm(date: Date): string {
  return format(date, "ddMM", { locale: ptBR });
}

export function buildDailyComandaCode(date: Date, seq: number): { code: string; number: string } {
  const seq3 = String(Math.max(1, Math.floor(seq))).padStart(3, "0").slice(-3);
  const dow = formatDow3(date);
  const ddmm = formatDdMm(date);
  const code = buildComandaCode({ dow, ddmm, seq3 });
  return { code, number: seq3 };
}
