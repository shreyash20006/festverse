// HMAC signed ticket tokens. The signing key is server-only.
// Token format: base64url(payload).hex(sig)
import { createHmac, timingSafeEqual } from "node:crypto";

function getSecret(): string {
  const s = process.env.TICKET_SIGNING_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "TICKET_SIGNING_SECRET is not configured. Set a dedicated random secret (>= 32 bytes) in project secrets."
    );
  }
  return s;
}

function b64urlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function b64urlDecode(str: string): Buffer {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export interface TicketPayload {
  tid: string; // ticket id
  eid: string; // event id
  uid: string; // user id
  iat: number;
}

export function signTicket(payload: Omit<TicketPayload, "iat">): string {
  const full: TicketPayload = { ...payload, iat: Math.floor(Date.now() / 1000) };
  const body = b64urlEncode(Buffer.from(JSON.stringify(full)));
  const sig = createHmac("sha256", getSecret()).update(body).digest("hex");
  return `${body}.${sig}`;
}

export function verifyTicket(token: string): TicketPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", getSecret()).update(body).digest("hex");
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(b64urlDecode(body).toString("utf8")) as TicketPayload;
  } catch {
    return null;
  }
}
