const SITE_ORIGIN = "https://mgakasinot.com";

const contextualTargets = [
  { href: "/uudet-nettikasinot/", anchors: ["uudet nettikasinot", "uudet kasinot"] },
  { href: "/kasinobonukset/", anchors: ["kasinobonukset", "kasinobonus"] },
  { href: "/ilmaiskierrokset/", anchors: ["ilmaiskierrokset"] },
  { href: "/nettikasinot/", anchors: ["nettikasinot", "netti kasinot"] },
  { href: "/", anchors: ["MGA kasinot"] },
  { href: "/artikkelit/", anchors: ["artikkelit"] },
];

function normalizePath(href: string) {
  if (!href) return href;
  if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return href;

  try {
    const url = new URL(href, SITE_ORIGIN);
    if (url.origin !== SITE_ORIGIN) return href;
    const path = url.pathname === "/" ? "/" : `${url.pathname.replace(/\/+$/, "")}/`;
    return `${path}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}

function pathOnly(href: string) {
  try {
    const url = new URL(href, SITE_ORIGIN);
    return url.pathname === "/" ? "/" : `${url.pathname.replace(/\/+$/, "")}/`;
  } catch {
    return href;
  }
}

function plainText(html: string) {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function linkFirstPlainOccurrence(html: string, phrase: string, href: string) {
  let inserted = false;

  return html.replace(/<(p|li)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (block, tag, attrs = "", inner) => {
    if (inserted) return block;

    const tokens = inner.match(/<a\b[\s\S]*?<\/a>|<[^>]+>|[^<]+/gi) ?? [inner];
    const phrasePattern = new RegExp(
      `(^|[^\\p{L}\\p{N}])(${escapeRegExp(phrase)})(?![\\p{L}\\p{N}])`,
      "iu"
    );

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.startsWith("<")) continue;
      if (!phrasePattern.test(token)) continue;

      tokens[i] = token.replace(
        phrasePattern,
        (_match, prefix, matchedPhrase) => `${prefix}<a href="${href}">${matchedPhrase}</a>`
      );
      inserted = true;
      break;
    }

    return `<${tag}${attrs ?? ""}>${tokens.join("")}</${tag}>`;
  });
}

export function buildInternalLinks(html: string, currentPath: string) {
  const canonicalCurrent = pathOnly(currentPath);
  const seenTargets = new Set<string>();
  const anchorToTarget = new Map<string, string>();

  let output = html.replace(
    /<a\b([^>]*?)href=(["'])([^"']+)\2([^>]*)>([\s\S]*?)<\/a>/gi,
    (full, before, quote, rawHref, after, inner) => {
      const normalizedHref = normalizePath(rawHref);
      const targetPath = pathOnly(normalizedHref);

      const isInternal =
        normalizedHref.startsWith("/") &&
        !normalizedHref.startsWith("//") &&
        !normalizedHref.startsWith("/wp-content/");

      if (!isInternal) return full;

      if (targetPath === canonicalCurrent) return inner;

      const anchor = plainText(inner).toLocaleLowerCase("fi-FI");
      const existingAnchorTarget = anchorToTarget.get(anchor);

      if (seenTargets.has(targetPath)) return inner;
      if (existingAnchorTarget && existingAnchorTarget !== targetPath) return inner;

      seenTargets.add(targetPath);
      if (anchor) anchorToTarget.set(anchor, targetPath);

      return `<a${before}href=${quote}${normalizedHref}${quote}${after}>${inner}</a>`;
    }
  );

  let autoAdded = 0;
  const maxAutoLinks = 4;

  for (const target of contextualTargets) {
    if (autoAdded >= maxAutoLinks) break;
    if (pathOnly(target.href) === canonicalCurrent || seenTargets.has(pathOnly(target.href))) continue;

    for (const anchor of target.anchors) {
      const anchorKey = anchor.toLocaleLowerCase("fi-FI");
      if (anchorToTarget.has(anchorKey)) continue;

      const next = linkFirstPlainOccurrence(output, anchor, target.href);
      if (next !== output) {
        output = next;
        seenTargets.add(pathOnly(target.href));
        anchorToTarget.set(anchorKey, pathOnly(target.href));
        autoAdded++;
        break;
      }
    }
  }

  return output;
}
