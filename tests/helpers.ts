import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "muffin-test-"));
}

export function writeFile(dir: string, relPath: string, content: string): string {
  const fullPath = path.join(dir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf-8");
  return fullPath;
}

export function cleanupTempDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}