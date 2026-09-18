import fs from "node:fs";
import path from "node:path";

const root = "dist";
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(full);
  }
}

function normalizeTarget(href) {
  if (!href.startsWith("/") || href.startsWith("//")) return null;
  const clean = href.split("#")[0].split("?")[0];
  return clean === "/" ? "/" : `${clean.replace(/\/+$/, "")}/`;
}

function anchorText(inner) {
  return inner.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

walk(root);

const problems = [];

const blockedAnchorsByRoute = {
  "/": new Set(["mga kasinot", "mga-kasinot", "kasinot"]),
  "/nettikasinot/": new Set(["nettikasinot", "netti kasinot", "kasinot", "parhaat kasinot"]),
  "/uudet-nettikasinot/": new Set(["uudet nettikasinot", "uudet kasinot", "nettikasinot", "kasinot"]),
  "/kasinobonukset/": new Set(["kasinobonukset", "kasinobonus", "bonukset"]),
  "/ilmaiskierrokset/": new Set(["ilmaiskierrokset", "ilmaiskierroksia"]),
};

function routeFromFile(file) {
  const rel = path.relative(root, file).replaceAll(path.sep, "/");
  if (rel === "index.html") return "/";
  return `/${rel.replace(/\/index\.html$/, "")}/`;
}


for (const file of files) {
  const html = fs.readFileSync(file, "utf8");
  const article = html.match(/<article\b[^>]*class="[^"]*\bcontent\b[^"]*"[^>]*>([\s\S]*?)<\/article>/i);
  if (!article) continue;

  const body = article[1];
  const route = routeFromFile(file);
  const blockedAnchors = blockedAnchorsByRoute[route] ?? new Set();
  const targetSet = new Set();
  const anchorMap = new Map();

  for (const match of body.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const target = normalizeTarget(match[1]);
    if (!target) continue;

    const anchor = anchorText(match[2]);

    if (blockedAnchors.has(anchor)) {
      problems.push(`${file}: focus-keyword fragment "${anchor}" must not be an internal anchor on ${route}`);
    }

    if (targetSet.has(target)) {
      problems.push(`${file}: duplicate editorial target ${target}`);
    } else {
      targetSet.add(target);
    }

    if (anchor) {
      const previous = anchorMap.get(anchor);
      if (previous && previous !== target) {
        problems.push(`${file}: anchor "${anchor}" points to both ${previous} and ${target}`);
      } else {
        anchorMap.set(anchor, target);
      }
    }
  }
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}

console.log(`Internal-link QA passed for ${files.length} rendered pages.`);
