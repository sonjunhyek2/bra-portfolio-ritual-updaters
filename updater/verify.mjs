#!/usr/bin/env node
/**
 * Test repeatability of the updater in an isolated newly copied directory (Node.js 18+).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILES = ["output/stats.json", "output/candidates.json", "output/site-preview.json"];

function digest(base) {
  const targets = [
    ...FILES.map((f) => path.join(base, f)),
    path.join(path.dirname(base), "site", "data", "site-data.js"),
  ];
  const result = {};
  for (const f of targets) {
    const rel = path.relative(path.dirname(base), f).replace(/\\/g, "/");
    result[rel] = crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
  }
  return result;
}

function run(base) {
  return execFileSync(process.execPath, [path.join(base, "update.mjs")], {
    cwd: base,
    encoding: "utf8",
  }).trim();
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "br-a-verify-"));
try {
  const copy1 = path.join(tmpRoot, "updater");
  fs.cpSync(HERE, copy1, { recursive: true });
  console.log("독립 임시 폴더:", tmpRoot);
  console.log("1차:", run(copy1));
  const first = digest(copy1);
  console.log("2차:", run(copy1));
  const second = digest(copy1);
  if (JSON.stringify(first) !== JSON.stringify(second)) {
    throw new Error("같은 폴더에서 두 실행 결과가 다름");
  }

  const copy2 = path.join(tmpRoot, "new-copy", "updater");
  fs.mkdirSync(path.dirname(copy2), { recursive: true });
  fs.cpSync(HERE, copy2, { recursive: true });
  console.log("새 폴더:", run(copy2));
  const third = digest(copy2);
  if (JSON.stringify(first) !== JSON.stringify(third)) {
    throw new Error("새 폴더에서 실행 결과가 다름");
  }

  console.log("PASS: 동일 입력 2회 + 새 폴더에서 결과 SHA256 일치");
  for (const [name, sha] of Object.entries(first)) {
    console.log(sha.slice(0, 20), name);
  }
} finally {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}

