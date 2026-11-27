import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

import { cleanupPhase8Data } from "./lib/phase8-cleanup.mjs";

const file = resolve(process.cwd(), ".phase8-audit-data.json");
if (!existsSync(file)) {
  console.error(
    "No .phase8-audit-data.json was found. Run PHASE8_KEEP_DATA=1 npm run audit:phase8 first.",
  );
  process.exit(1);
}

const data = JSON.parse(readFileSync(file, "utf8"));
const removed = await cleanupPhase8Data(data);
unlinkSync(file);
console.log("PHASE 8 AUDIT DATA REMOVED", JSON.stringify(removed));
