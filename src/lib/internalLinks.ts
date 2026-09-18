const SITE_ORIGIN = "https://mgakasinot.com";

const blockedAnchorsByPath: Record<string, Set<string>> = {
  "/": new Set(["mga kasinot", "mga-kasinot", "kasinot"]),
  "/nettikasinot/": new Set(["nettikasinot", "netti kasinot", "kasinot", "parhaat kasinot"]),
  "/uudet-nettikasinot/": new Set(["uudet nettikasinot", "uudet kasinot", "nettikasinot", "kasinot"]),
  "/kasinobonukset/": new Set(["kasinobonukset", "kasinobonus", "bonukset"]),
  "/ilmaiskierrokset/": new Set(["ilmaiskierrokset", "ilmaiskierroksia"]),
};

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

export function buildInternalLinks(html: string, currentPath: string) {
  const canonicalCurrent = pathOnly(currentPath);
  const seenTargets = new Set<string>();
  const anchorToTarget = new Map<string, string>();
  const blockedAnchors = blockedAnchorsByPath[canonicalCurrent] ?? new Set<string>();

  return html.replace(
    /<a\b([^>]*?)href=(["'])([^"']+)\2([^>]*)>([\s\S]*?)<\/a>/gi,
    (full, before, quote, rawHref, after, inner) => {
      const normalizedHref = normalizePath(rawHref);
      const targetPath = pathOnly(normalizedHref);

      const isInternal =
        normalizedHref.startsWith("/") &&
        !normalizedHref.startsWith("//") &&
        !normalizedHref.startsWith("/wp-content/");

      if (!isInternal) return full;

      const anchor = plainText(inner).toLocaleLowerCase("fi-FI");

      // Never link the page's own focus phrase, or a generic fragment of it, away
      // to another URL. This prevents anchors such as "nettikasinot" inside
      // "uudet nettikasinot" from splitting the keyword/topic signal.
      if (blockedAnchors.has(anchor)) return inner;

      // Self-links inside editorial copy add no value.
      if (targetPath === canonicalCurrent) return inner;

      const existingAnchorTarget = anchorToTarget.get(anchor);

      // One editorial link to a destination per source page.
      if (seenTargets.has(targetPath)) return inner;

      // The same visible anchor cannot point to two different internal URLs.
      if (existingAnchorTarget && existingAnchorTarget !== targetPath) return inner;

      seenTargets.add(targetPath);
      if (anchor) anchorToTarget.set(anchor, targetPath);

      return `<a${before}href=${quote}${normalizedHref}${quote}${after}>${inner}</a>`;
    }
  );
}
