import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const express = require("express");
const request = require("supertest");

beforeAll(() => {
  process.env.SUPABASE_URL ||= "http://localhost:54321";
  process.env.SUPABASE_SERVICE_KEY ||= "test";
  process.env.SUPABASE_KEY ||= "test";
  process.env.R2_PUBLIC_URL ||= "https://files.example.com";
});

const row = (over) => ({
  question_type: "text", question_text: "", option_a: "a", option_b: "b", option_c: "c", option_d: "d",
  question_image_content_hash: null, question_image_key: null, question_image_perceptual_hash: null, ...over,
});

describe("dedupeByStem", () => {
  const LONG = "Presence of hydroxyl group is ascertained by reaction with which of these reagents";
  it("collapses a long stem reused with different options, keeping the oldest", () => {
    const { dedupeByStem } = require("../services/questionBank.service");
    const out = dedupeByStem([
      row({ id: 1, question_text: LONG, option_a: "HI" }),
      row({ id: 2, question_text: LONG.toUpperCase() + "  ", option_a: "Br2" }),
    ]);
    expect(out.map((r) => r.id)).toEqual([1]);
  });
  it("keeps a short generic stem reused with different options", () => {
    const { dedupeByStem } = require("../services/questionBank.service");
    const out = dedupeByStem([
      row({ id: 1, question_text: "Which is correct?", option_a: "x" }),
      row({ id: 2, question_text: "Which is correct?", option_a: "y" }),
    ]);
    expect(out).toHaveLength(2);
  });
  it("collapses a short stem only when the options match too", () => {
    const { dedupeByStem } = require("../services/questionBank.service");
    const out = dedupeByStem([row({ id: 1, question_text: "Which is correct?" }), row({ id: 2, question_text: "which is  correct?" })]);
    expect(out).toHaveLength(1);
  });
  it("dedupes image stems by content hash", () => {
    const { dedupeByStem } = require("../services/questionBank.service");
    const out = dedupeByStem([
      row({ id: 1, question_type: "image", question_image_content_hash: "h1" }),
      row({ id: 2, question_type: "image", question_image_content_hash: "h1", option_a: "other" }),
      row({ id: 3, question_type: "image", question_image_content_hash: "h2" }),
    ]);
    expect(out.map((r) => r.id)).toEqual([1, 3]);
  });
});

describe("upload signature check", () => {
  it("accepts real files and rejects spoofed mimetypes", () => {
    const { matchesSignature } = require("../services/upload.service");
    const pdf = Buffer.concat([Buffer.from("%PDF-1.7"), Buffer.alloc(20)]);
    const html = Buffer.from("<html><script>alert(1)</script></html>");
    expect(matchesSignature(pdf, "application/pdf")).toBe(true);
    expect(matchesSignature(html, "application/pdf")).toBe(false);
    expect(matchesSignature(html, "image/png")).toBe(false);
    expect(matchesSignature(Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array(12).fill(0)]), "image/jpeg")).toBe(true);
  });
});

describe("parseGrade", () => {
  it("reads 11/12 from free text and ignores unknowns", () => {
    const { parseGrade } = require("../utils/contentAccess");
    expect(parseGrade("12th Std")).toBe(12);
    expect(parseGrade("11")).toBe(11);
    expect(parseGrade("NEET")).toBeNull();
  });
});

describe("error sanitizer", () => {
  it("hides 5xx details in production but keeps 4xx text", async () => {
    process.env.NODE_ENV = "production";
    const sanitize = require("../middleware/sanitizeErrors");
    const app = express();
    app.use(sanitize);
    app.get("/boom", (req, res) => res.status(500).json({ error: 'relation "students" does not exist', stack: "x" }));
    app.get("/bad", (req, res) => res.status(400).json({ error: "Name is required" }));
    const boom = await request(app).get("/boom");
    expect(boom.status).toBe(500);
    expect(JSON.stringify(boom.body)).not.toMatch(/students|stack/);
    expect((await request(app).get("/bad")).body.error).toBe("Name is required");
    process.env.NODE_ENV = "test";
  });
});
