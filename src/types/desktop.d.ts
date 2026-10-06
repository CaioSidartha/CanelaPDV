export {};

type DesktopPaymentMethod =
  | "dinheiro"
  | "pix"
  | "cartao_credito"
  | "cartao_debito";

type DeviceInstallRole = "server" | "terminal";

declare global {
  interface Window {
    padariaDesktop?: {
      isDesktop: true;
      getInfo: () => Promise<{
        version: string;
        isPackaged: boolean;
        platform: string;
        embedded?: boolean;
        appBaseUrl?: string;
        installRole?: DeviceInstallRole | null;
        setupCompleted?: boolean;
        serverPublicUrl?: string;
        terminalServerUrl?: string;
      }>;
      checkForUpdates: () => Promise<
        | {
            installedVersion: string;
            latestDesktopVersion: string;
            webVersion: string;
            updateAvailable: boolean;
            downloadUrl: string;
            releaseNotes?: string;
          }
        | { error: string }
      >;
      getDeviceConfig?: () => Promise<Record<string, unknown>>;
      setDeviceConfig?: (patch: Record<string, unknown>) => Promise<Record<string, unknown>>;
      getNetworkHints?: () => Promise<Record<string, unknown>>;
      testServerUrl?: (url: string) => Promise<{ ok: true; latencyMs: number } | { ok: false; error: string }>;
      generatePairingCode?: () => Promise<{ code: string; expiresAt: string }>;
      registerTerminal?: (payload: {
        pairingCode: string;
        label?: string;
        deviceId?: string;
      }) => Promise<{ ok: true; terminal: { id: string; label: string } } | { ok: false; error: string }>;
      reloadDesktopApp?: () => Promise<{ ok: boolean; appBaseUrl?: string }>;
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
