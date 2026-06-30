import { rm } from "node:fs/promises";
import path from "node:path";

const target = path.resolve(process.cwd(), ".next");
await rm(target, { recursive: true, force: true });
console.log(`Removed ${target}`);
