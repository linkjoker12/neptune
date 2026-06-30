import { promises as fs } from "node:fs";
import path from "node:path";

export function getTempRoot() {
  return path.resolve(process.cwd(), process.env.TEMP_DIR ?? "./tmp");
}

export function assertInsideTempRoot(targetPath: string) {
  const tempRoot = getTempRoot();
  const resolvedTarget = path.resolve(targetPath);
  const relative = path.relative(tempRoot, resolvedTarget);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Refusing to access a path outside TEMP_DIR.");
  }

  return resolvedTarget;
}

export async function ensureTempRoot() {
  const tempRoot = getTempRoot();
  await fs.mkdir(tempRoot, { recursive: true });
  return tempRoot;
}

export async function removeTempPath(targetPath: string) {
  const safePath = assertInsideTempRoot(targetPath);
  await fs.rm(safePath, { force: true, recursive: true });
}

export async function cleanupTempRoot(ttlMinutes: number) {
  const tempRoot = await ensureTempRoot();
  const cutoff = Date.now() - ttlMinutes * 60_000;
  const entries = await fs.readdir(tempRoot, { withFileTypes: true }).catch(() => []);
  let removed = 0;

  for (const entry of entries) {
    const targetPath = path.join(tempRoot, entry.name);
    const stats = await fs.stat(targetPath).catch(() => null);

    if (!stats || stats.mtimeMs > cutoff) {
      continue;
    }

    await removeTempPath(targetPath).catch(() => undefined);
    removed += 1;
  }

  return removed;
}
