export {};

type DesktopPaymentMethod =
  | "dinheiro"
  | "pix"
  | "cartao_credito"
  | "cartao_debito";

declare global {
  interface Window {
    padariaDesktop?: {
      isDesktop: true;
      getInfo: () => Promise<{
        version: string;
        isPackaged: boolean;
        platform: string;
      }>;
      readScale?: () => Promise<
        | {
            ok: true;
            grams: number;
            kg: number;
            stable: boolean;
            provider: string;
            simulated: boolean;
          }
        | { ok: false; error: string }
      >;
      printHtml?: (html: string) => Promise<{
        printed: boolean;
        printer?: string;
        reason?: string;
      }>;
      startPayment?: (payload: {
        amount: number;
        type: "debito" | "credito" | "pix";
        installments?: number;
      }) => Promise<
        | {
            ok: true;
            approved: true;
            authCode: string;
            nsu: string;
            provider: string;
            simulated: boolean;
            method: DesktopPaymentMethod;
          }
        | {
            ok: true;
            approved: false;
            reason: string;
            provider: string;
            simulated: boolean;
          }
        | { ok: false; error: string }
      >;
    };
  }
}
