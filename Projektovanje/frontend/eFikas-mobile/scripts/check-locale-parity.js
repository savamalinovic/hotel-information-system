const fs = require("node:fs");
const path = require("node:path");

function readLocale(filename) {
  const filePath = path.join(__dirname, "..", "assets", "locales", filename);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function collectLeafKeys(value, prefix = "", keys = new Set()) {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      collectLeafKeys(child, prefix ? `${prefix}.${key}` : key, keys);
    }
    return keys;
  }

  keys.add(prefix);
  return keys;
}

function printKeys(label, keys) {
  if (keys.length === 0) {
    return;
  }

  console.error(`${label}:`);
  for (const key of keys) {
    console.error(`  - ${key}`);
  }
}

try {
  const enKeys = collectLeafKeys(readLocale("en.json"));
  const srKeys = collectLeafKeys(readLocale("sr.json"));
  const enOnly = [...enKeys].filter((key) => !srKeys.has(key)).sort();
  const srOnly = [...srKeys].filter((key) => !enKeys.has(key)).sort();

  if (enOnly.length > 0 || srOnly.length > 0) {
    console.error("Locale parity check failed.");
    printKeys("EN-only keys", enOnly);
    printKeys("SR-only keys", srOnly);
    process.exitCode = 1;
  } else {
    console.log(`Locale parity check passed (${enKeys.size} leaf keys per locale).`);
  }
} catch (error) {
  console.error("Locale parity check could not parse a locale file.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
