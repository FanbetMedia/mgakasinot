type ImageRule = {
  width: number;
  height: number;
  srcset?: string;
  sizes?: string;
};

const rules: Record<string, ImageRule> = {
  "/wp-content/uploads/2026/03/Hero-image-mga-kasinot-1024x592.webp": {
    width: 1024,
    height: 592,
    srcset: [
      "/wp-content/uploads/2026/03/Hero-image-mga-kasinot-300x174.webp 300w",
      "/wp-content/uploads/2026/03/Hero-image-mga-kasinot-768x444.webp 768w",
      "/wp-content/uploads/2026/03/Hero-image-mga-kasinot-1024x592.webp 1024w",
    ].join(", "),
    sizes: "(max-width: 720px) calc(100vw - 72px), (max-width: 1000px) calc(100vw - 108px), 848px",
  },
  "/wp-content/uploads/2026/03/mga-kasinot-turvallisuus-infograafi.webp": {
    width: 450,
    height: 811,
    srcset: [
      "/wp-content/uploads/2026/03/mga-kasinot-turvallisuus-infograafi-166x300.webp 166w",
      "/wp-content/uploads/2026/03/mga-kasinot-turvallisuus-infograafi.webp 450w",
    ].join(", "),
    sizes: "(max-width: 520px) 166px, 450px",
  },
  "/wp-content/uploads/2026/05/verovapaat-voitot-1024x725.webp": {
    width: 1024,
    height: 725,
    srcset: [
      "/wp-content/uploads/2026/05/verovapaat-voitot-300x212.webp 300w",
      "/wp-content/uploads/2026/05/verovapaat-voitot-768x543.webp 768w",
      "/wp-content/uploads/2026/05/verovapaat-voitot-1024x725.webp 1024w",
    ].join(", "),
    sizes: "(max-width: 720px) calc(100vw - 72px), (max-width: 1000px) calc(100vw - 108px), 848px",
  },
  "/wp-content/uploads/2026/07/tunnistautuminen-kasinot-2027-1024x725.webp": {
    width: 1024,
    height: 725,
    srcset: [
      "/wp-content/uploads/2026/07/tunnistautuminen-kasinot-2027-300x212.webp 300w",
      "/wp-content/uploads/2026/07/tunnistautuminen-kasinot-2027-768x544.webp 768w",
      "/wp-content/uploads/2026/07/tunnistautuminen-kasinot-2027-1024x725.webp 1024w",
    ].join(", "),
    sizes: "(max-width: 720px) calc(100vw - 72px), (max-width: 1000px) calc(100vw - 108px), 848px",
  },
};

function addAttr(tag: string, name: string, value: string) {
  if (new RegExp(`\\s${name}=`, "i").test(tag)) return tag;
  return tag.replace(/\s*\/>$/, ` ${name}="${value}"/>`).replace(/\s*>$/, ` ${name}="${value}">`);
}

export function optimizeContentImages(html: string) {
  return html.replace(/<img\b[^>]*src=["']([^"']+)["'][^>]*\/?\s*>/gi, (tag, src) => {
    const rule = rules[src];
    if (!rule) return tag;

    let next = tag;
    next = addAttr(next, "width", String(rule.width));
    next = addAttr(next, "height", String(rule.height));
    next = addAttr(next, "loading", "lazy");
    next = addAttr(next, "decoding", "async");

    if (rule.srcset) next = addAttr(next, "srcset", rule.srcset);
    if (rule.sizes) next = addAttr(next, "sizes", rule.sizes);

    return next;
  });
}
