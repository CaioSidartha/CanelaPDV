import crypto from "crypto";
import fs from "fs";

const SALT = "padaria-fiscal-cert-v1";

function encryptionKey(): Buffer {
  const secret = process.env.CERT_ENCRYPTION_KEY?.trim();
  if (!secret) {
    throw new Error("CERT_ENCRYPTION_KEY não definida. O certificado não pode ser gravado em texto puro.");
  }
  return crypto.scryptSync(secret, SALT, 32);
}

/** AES-256-GCM. Formato: iv:tag:ciphertext (hex). A chave fica só no ambiente. */
export class CertificadoManager {
  static encrypt(pfxBuffer: Buffer): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(pfxBuffer), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
  }

  static decrypt(encrypted: string): Buffer {
    const [ivHex, tagHex, dataHex] = encrypted.split(":");
    if (!ivHex || !tagHex || !dataHex) {
      throw new Error("Certificado criptografado em formato inválido.");
    }
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      Buffer.from(ivHex, "hex"),
    );
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  }

  static encryptText(value: string): string {
    return CertificadoManager.encrypt(Buffer.from(value, "utf8"));
  }

  static decryptText(encrypted: string): string {
    return CertificadoManager.decrypt(encrypted).toString("utf8");
  }
}

/** Lê o A1 do disco ou do blob criptografado. Sem certificado, devolve buffer vazio (simulação). */
export function loadCertificado(): { pfx: Buffer; senha: string } {
  const encrypted = process.env.CERT_PFX_ENCRYPTED?.trim();
  const senhaEnc = process.env.CERT_SENHA_ENCRYPTED?.trim();
  if (encrypted) {
    return {
      pfx: CertificadoManager.decrypt(encrypted),
      senha: senhaEnc ? CertificadoManager.decryptText(senhaEnc) : process.env.CERT_SENHA?.trim() ?? "",
    };
  }

  const certPath = process.env.CERT_PATH?.trim();
  if (certPath && fs.existsSync(certPath)) {
    return {
      pfx: fs.readFileSync(certPath),
      senha: process.env.CERT_SENHA?.trim() ?? "",
    };
  }

  return { pfx: Buffer.alloc(0), senha: "" };
}
