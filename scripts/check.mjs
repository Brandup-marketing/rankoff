import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const roots = ["functions", "tests/backend"];
const files = [];
for (const root of roots) collect(root);
files.push("locale-boot.js", "locale.js", "ms-copy.js", "ms-legal.js", "ms-answers.js", "support.js", "acquisition.js", "currency.js", "app.js", "about.js", "categories.js", "listing.js", "legal.js", "search.js", "share.js", "share-card.js", "admin.js");
for (const file of files.sort()) execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });

function collect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collect(path);
    else if (entry.isFile() && path.endsWith(".js")) files.push(path);
  }
}
