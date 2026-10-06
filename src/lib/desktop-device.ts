import { isDesktopApp } from "@/lib/desktop-client";

export type DeviceInstallRole = "server" | "terminal";

export type LanAddressHint = {
  interface: string;
  address: string;
  netmask: string;
};

export type DeviceConfigSnapshot = {
  installRole: DeviceInstallRole | null;
  serverPort: number;
  terminalServerUrl: string;
  terminalLabel: string;
  setupCompleted: boolean;
  serverPublicUrl?: string;
  pairingCode?: string;
  pairingExpiresAt?: string | null;
  pairedTerminals?: { id: string; label: string; pairedAt: string }[];
  networkHints?: {
    addresses: LanAddressHint[];
    suggestedIp: string | null;
    port: number;
    terminalBaseUrl: string;
    dhcpWarning: string;
  };
};

export async function fetchDeviceConfig(): Promise<DeviceConfigSnapshot | null> {
  if (!isDesktopApp() || !window.padariaDesktop?.getDeviceConfig) return null;
  try {
    return (await window.padariaDesktop.getDeviceConfig()) as DeviceConfigSnapshot;
  } catch {
    return null;
  }
}

export async function patchDeviceConfig(
  patch: Partial<DeviceConfigSnapshot> & { installRole?: DeviceInstallRole | null },
): Promise<DeviceConfigSnapshot | null> {
  if (!isDesktopApp() || !window.padariaDesktop?.setDeviceConfig) return null;
  return (await window.padariaDesktop.setDeviceConfig(patch)) as DeviceConfigSnapshot;
}

export async function reloadDesktopApp(): Promise<void> {
  if (window.padariaDesktop?.reloadDesktopApp) {
    await window.padariaDesktop.reloadDesktopApp();
  } else {
    window.location.reload();
  }
}
