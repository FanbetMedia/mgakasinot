import fs from "node:fs/promises";

const SOURCE_URL = "https://www.casinos.mt/all-mga-casinos";
const OUTPUT = new URL("../public/mga-sites.json", import.meta.url);

const decode = (value = "") => value
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&#x27;/g, "'")
  .replace(/&nbsp;/g, " ")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">");

const text = (html = "") => decode(
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
);

const normaliseDomain = (value = "") => {
  const cleaned = decode(value).trim().toLowerCase();
  if (!cleaned || /no website listed/i.test(cleaned)) return "";
  try {
    const url = new URL(cleaned.includes("://") ? cleaned : `https://${cleaned}`);
    return url.hostname.replace(/^www\./, "").replace(/\.$/, "");
  } catch {
    return cleaned
      .replace(/^https?:\/\//, "")
      .split(/[/?#]/)[0]
      .replace(/^www\./, "")
      .replace(/:\d+$/, "")
      .replace(/\.$/, "");
  }
};

const extractHref = (html = "", matcher = /.*/) => {
  for (const match of html.matchAll(/href=["']([^"']+)["']/gi)) {
    const href = decode(match[1]);
    if (matcher.test(href)) return href;
  }
  return "";
};

const rowsFromHtml = (html) => {
  const entries = [];
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];

  for (const rowMatch of rows) {
    const row = rowMatch[1];
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
    if (cells.length < 4) continue;

    const domainText = text(cells[0]);
    const domain = normaliseDomain(domainText);
    const licence = text(cells[2]).match(/MGA\/(?:B2C|CRP)\/[A-Z0-9.-]+\/\d{4}(?:-\d+)?/i)?.[0]
      || text(cells[2]).match(/MGA\/(?:B2C|CRP)\/\d+\/\d{4}(?:-\d+)?/i)?.[0]
      || "";
    const status = text(cells[3]);

    if (!domain || !licence || !/licensed/i.test(status)) continue;

    const operator = text(cells[1]);
    const gameTypes = cells[4] ? text(cells[4]) : "";
    const verification = extractHref(row, /authorisation\.mga\.org\.mt/i);

    entries.push({
      domain,
      operator,
      licence,
      status: "Licensed",
      gameTypes,
      verification: verification || "https://www.mga.org.mt/licensee-hub/licensee-register/",
      source: SOURCE_URL,
    });
  }

  return entries;
};

const mergeEntries = (entries) => {
  const map = new Map();
  for (const entry of entries) {
    const key = entry.domain;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...entry, licences: [entry.licence], operators: [entry.operator] });
      continue;
    }
    if (!existing.licences.includes(entry.licence)) existing.licences.push(entry.licence);
    if (!existing.operators.includes(entry.operator)) existing.operators.push(entry.operator);
    if (!existing.verification && entry.verification) existing.verification = entry.verification;
    if (!existing.gameTypes && entry.gameTypes) existing.gameTypes = entry.gameTypes;
  }

  return [...map.values()]
    .map(({ licence, operator, ...entry }) => ({
      ...entry,
      licence: entry.licences.join(" / "),
      operator: entry.operators.join(" / "),
    }))
    .sort((a, b) => a.domain.localeCompare(b.domain));
};

const fetchHtml = async () => {
  const response = await fetch(SOURCE_URL, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; MGAKasinotRegistrySync/1.0; +https://mgakasinot.com/)",
      "accept-language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`Registry source returned HTTP ${response.status}`);
  return response.text();
};

const validateRequiredDomains = (entries) => {
  const required = ["casimba.com", "bet365.com"];
  const domains = new Set(entries.map((entry) => entry.domain));
  const missing = required.filter((domain) => !domains.has(domain));
  if (missing.length) throw new Error(`Registry sync missing required domains: ${missing.join(", ")}`);
  if (entries.length < 300) throw new Error(`Registry sync only found ${entries.length} domains; refusing incomplete snapshot`);
};

const run = async () => {
  const html = await fetchHtml();
  const entries = mergeEntries(rowsFromHtml(html));
  validateRequiredDomains(entries);

  const payload = {
    generatedAt: new Date().toISOString(),
    source: SOURCE_URL,
    officialRegister: "https://www.mga.org.mt/licensee-hub/licensee-register/",
    officialUrlChecker: "https://mgaurlchecker.mga.org.mt/",
    count: entries.length,
    entries,
  };

  await fs.writeFile(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Synced ${entries.length} MGA-licensed domains to public/mga-sites.json`);
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
