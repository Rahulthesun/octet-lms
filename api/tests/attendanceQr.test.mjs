import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

beforeAll(() => {
  process.env.SUPABASE_URL ||= "http://localhost:54321";
  process.env.SUPABASE_SERVICE_KEY ||= "test";
  process.env.WATERMARK_SECRET ||= "test-secret-for-qr-signing";
});

const SESSION = "3f1c2b8e-6d4a-4b7e-9a51-0c2d4e6f8a10";

describe("signed attendance QR tokens", () => {
  it("round-trips the session id and window", () => {
    const { currentQrToken, parseSignedQrToken } = require("../services/attendance.service");
    const { qrToken, signed } = currentQrToken(SESSION, 45);
    expect(signed).toBe(true);
    const parsed = parseSignedQrToken(qrToken);
    expect(parsed.sessionId).toBe(SESSION);
    expect(parsed.windowIndex).toBe(Math.floor(Date.now() / 45000));
  });

  it("gives every caller in the same window the same code (multiple admin screens agree)", () => {
    const { currentQrToken } = require("../services/attendance.service");
    expect(currentQrToken(SESSION, 45).qrToken).toBe(currentQrToken(SESSION, 45).qrToken);
  });

  it("rejects tampered or foreign tokens", () => {
    const { currentQrToken, parseSignedQrToken } = require("../services/attendance.service");
    const { qrToken } = currentQrToken(SESSION, 45);
    const parts = qrToken.split(".");
    expect(parseSignedQrToken([parts[0], parts[1], String(Number(parts[2]) + 5), parts[3]].join("."))).toBeNull();
    expect(parseSignedQrToken(qrToken.slice(0, -2) + "xx")).toBeNull();
    expect(parseSignedQrToken("deadbeef")).toBeNull();
    expect(parseSignedQrToken("")).toBeNull();
  });
});
