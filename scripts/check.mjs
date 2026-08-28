import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const roots = ["functions", "tests/backend"];
const files = [];
for (const root of roots) collect(root);
files.push("app.js", "about.js", "categories.js", "listing.js", "legal.js", "search.js", "share.js");
for (const file of files.sort()) execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });

function collect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collect(path);
    else if (entry.isFile() && path.endsWith(".js")) files.push(path);
  }
}
