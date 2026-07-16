import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import type { SubmissionPayload } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "submissions.db");

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      address_label TEXT NOT NULL,
      address_id TEXT NOT NULL,
      eligible INTEGER NOT NULL,
      funding_percent INTEGER,
      has_existing_claim INTEGER NOT NULL,
      nzdep_decile INTEGER,
      sa1_code TEXT,
      payload_json TEXT NOT NULL,
      email_status TEXT NOT NULL
    );
  `);
  return db;
}

export function saveSubmission(
  payload: SubmissionPayload,
  emailStatus: string
): { id: number } {
  const db = ensureDb();
  try {
    const { result } = payload;
    const stmt = db.prepare(`
      INSERT INTO submissions (
        created_at, address_label, address_id, eligible, funding_percent,
        has_existing_claim, nzdep_decile, sa1_code, payload_json, email_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      result.checkedAt,
      result.answers.addressLabel,
      result.answers.addressId,
      result.eligible ? 1 : 0,
      result.fundingPercent,
      result.eeca.hasExistingClaim ? 1 : 0,
      result.nzDep?.decile ?? null,
      result.nzDep?.sa1Code ?? null,
      JSON.stringify(payload),
      emailStatus
    );
    return { id: Number(info.lastInsertRowid) };
  } finally {
    db.close();
  }
}
