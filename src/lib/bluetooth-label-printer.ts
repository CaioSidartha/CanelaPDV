/** Impressão ESC/POS em etiquetadoras térmicas Bluetooth (Web Bluetooth API). */

export type LabelPrintItem = {
  name: string;
  code: string;
  price?: number;
};

const BLE_SERVICES = [
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "49535343-fe7d-4ae5-8fa9-9fafcf8286cf",
  "000018f0-0000-1000-8000-00805f9b34fb",
  "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
  "00001101-0000-1000-8000-00805f9b34fb",
];

type NavBluetooth = Navigator & {
  bluetooth?: {
    requestDevice(opts: {
      acceptAllDevices?: boolean;
      optionalServices?: string[];
    }): Promise<{
      gatt?: {
        connect(): Promise<GattServer>;
        connected?: boolean;
        disconnect(): void;
      };
    }>;
  };
};

function navBt(): NavBluetooth["bluetooth"] {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as NavBluetooth).bluetooth;
}

export function isBluetoothPrintSupported(): boolean {
  return Boolean(navBt());
}

function escPosLabel(item: LabelPrintItem, format: "50x55" | "40x30"): Uint8Array {
  const enc = new TextEncoder();
  const out: number[] = [];
  const push = (...bytes: number[]) => out.push(...bytes);
  const text = (s: string) => out.push(...enc.encode(s));

  const digits = item.code.replace(/\D/g, "");
  const title = item.name.slice(0, 36);
  const priceLine =
    item.price != null && item.price > 0
      ? `R$ ${item.price.toFixed(2).replace(".", ",")}\n`
      : "";

  push(0x1b, 0x40); // init
  push(0x1b, 0x61, 1); // center

  if (format === "40x30") {
    push(0x1b, 0x21, 0x00); // font normal
  } else {
    push(0x1b, 0x21, 0x08); // bold
  }

  text(`${title}\n`);
  push(0x1b, 0x61, 1);

  push(0x1d, 0x68, format === "40x30" ? 60 : 80); // barcode height
  push(0x1d, 0x77, 2); // width

  if (digits.length === 13) {
    push(0x1d, 0x6b, 0x04); // EAN13
    push(12);
    const body = digits.slice(0, 12);
    for (const ch of body) push(ch.charCodeAt(0));
  } else {
    push(0x1d, 0x6b, 0x49); // CODE128
    push(digits.length);
    for (const ch of digits) push(ch.charCodeAt(0));
  }

  text(`\n${digits}\n`);
  if (priceLine) text(priceLine);

  push(0x1b, 0x61, 0);
  text("\n\n");
  push(0x1d, 0x56, 0x00); // feed/cut (depende do modelo)

  return new Uint8Array(out);
}

type GattChar = {
  properties: { write?: boolean; writeWithoutResponse?: boolean };
  writeValue(data: BufferSource): Promise<void>;
  writeValueWithoutResponse(data: BufferSource): Promise<void>;
};

type GattServer = {
  getPrimaryServices(): Promise<{ getCharacteristics(): Promise<GattChar[]> }[]>;
};

async function findWritableCharacteristic(server: GattServer) {
  const services = await server.getPrimaryServices();
  for (const service of services) {
    const chars = await service.getCharacteristics();
    for (const c of chars) {
      if (c.properties.write || c.properties.writeWithoutResponse) {
        return c;
      }
    }
  }
  throw new Error("Impressora conectada, mas não encontramos o canal de impressão (ESC/POS).");
}

async function writeChunks(char: GattChar, data: Uint8Array) {
  const chunk = 180;
  for (let i = 0; i < data.length; i += chunk) {
    const slice = data.slice(i, i + chunk);
    if (char.properties.writeWithoutResponse) {
      await char.writeValueWithoutResponse(slice);
    } else {
      await char.writeValue(slice);
    }
    await new Promise((r) => setTimeout(r, 40));
  }
}

export async function printLabelsViaBluetooth(
  items: LabelPrintItem[],
  format: "50x55" | "40x30" = "50x55",
): Promise<void> {
  if (!isBluetoothPrintSupported()) {
    throw new Error("Bluetooth não disponível neste navegador. Use Chrome ou Edge no PC, ou imprima pelo diálogo normal.");
  }
  if (!items.length) return;

  const bt = navBt();
  if (!bt) throw new Error("Bluetooth não disponível.");
  const device = await bt.requestDevice({
    acceptAllDevices: true,
    optionalServices: BLE_SERVICES,
  });

  const server = await device.gatt?.connect();
  if (!server) throw new Error("Não foi possível conectar à impressora.");

  try {
    const char = await findWritableCharacteristic(server);
    for (const item of items) {
      const payload = escPosLabel(item, format);
      await writeChunks(char, payload);
      await new Promise((r) => setTimeout(r, 120));
    }
  } finally {
    if (device.gatt?.connected) device.gatt.disconnect();
  }
}
