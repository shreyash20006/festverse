import QRCode from "qrcode";
import crypto from "crypto";

/**
 * Generate a secure random QR token
 */
export function generateQRToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Generate a human-readable ticket code
 * e.g. FV-2025-A3B9
 */
export function generateTicketCode(prefix = "FV"): string {
  const year = new Date().getFullYear();
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${year}-${random}`;
}

/**
 * Generate a QR code data URL from a token
 */
export async function generateQRDataUrl(
  token: string,
  options?: { size?: number }
): Promise<string> {
  const size = options?.size ?? 300;
  return QRCode.toDataURL(token, {
    width: size,
    margin: 2,
    color: {
      dark: "#0F172A",
      light: "#FFFFFF",
    },
    errorCorrectionLevel: "H",
  });
}

/**
 * Build the scan URL for a ticket QR code
 */
export function buildScanUrl(qrToken: string, baseUrl: string): string {
  return `${baseUrl}/scan/${qrToken}`;
}
