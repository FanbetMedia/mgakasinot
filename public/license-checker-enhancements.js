(() => {
  const nonMgaRecords = [
    {
      domains: ["kanuuna.com"],
      status: "other",
      label: "Ei MGA-lisenssiä paikallisen tiedon perusteella",
      operator: "Blixx Gaming Ltd",
      licence: "Viron EMTA: HKL000470 / HKT000089",
      verification: "https://www.emta.ee/en/business-client/registration-business/gambling-operators/list-legal-gambling-operators"
    },
    {
      domains: ["lataamo.com"],
      status: "other",
      label: "Ei MGA-lisenssiä paikallisen tiedon perusteella",
      operator: "Vana Lauri OÜ",
      licence: "Viron EMTA",
      verification: "https://www.emta.ee/en/business-client/registration-business/gambling-operators/list-legal-gambling-operators"
    },
    {
      domains: ["respincasino.fi"],
      status: "other",
      label: "Ei MGA-lisenssiä paikallisen tiedon perusteella",
      operator: "Ducks In A Row OÜ",
      licence: "Viron EMTA: HKL000444",
      verification: "https://www.emta.ee/en/business-client/registration-business/gambling-operators/list-legal-gambling-operators"
    },
    {
      domains: ["refuelcasino.io", "unlimitcasino.io", "mountgold.io"],
      status: "other",
      label: "Ei MGA-lisenssiä paikallisen tiedon perusteella",
      operator: "Hundise Limited",
      licence: "Anjouan: ALSI-202506036-FI2",
      verification: "https://www.mga.org.mt/licensee-hub/licensee-register/"
    }
  ];

  const OFFICIAL_REGISTER = "https://www.mga.org.mt/licensee-hub/licensee-register/";
  const OFFICIAL_URL_CHECKER = "https://mgaurlchecker.mga.org.mt/";

  const normaliseDomain = (value) => {
    const trimmed = String(value || "").trim().toLowerCase();
    if (!trimmed) return "";
    try {
      const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
      return url.hostname.replace(/^www\./, "").replace(/\.$/, "");
    } catch {
      return trimmed
        .replace(/^https?:\/\//, "")
        .split(/[/?#]/)[0]
        .replace(/^www\./, "")
        .replace(/:\d+$/, "")
        .replace(/\.$/, "");
    }
  };

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const distance = (a, b) => {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let i = 1; i <= a.length; i += 1) {
      const current = [i];
      for (let j = 1; j <= b.length; j += 1) {
        current[j] = Math.min(
          current[j - 1] + 1,
          previous[j] + 1,
          previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
      for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
    }
    return previous[b.length];
  };

  const rootish = (domain) => domain.split(".").slice(-2).join(".");

  const loadRegistry = async () => {
    try {
      const response = await fetch("/mga-sites.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (!payload || !Array.isArray(payload.entries)) throw new Error("Invalid MGA registry payload");
      return {
        entries: payload.entries
          .map((entry) => ({ ...entry, domain: normaliseDomain(entry.domain) }))
          .filter((entry) => entry.domain),
        generatedAt: payload.generatedAt || "",
        count: Number(payload.count || payload.entries.length || 0),
      };
    } catch (error) {
      console.warn("MGA registry data could not be loaded", error);
      return { entries: [], generatedAt: "", count: 0 };
    }
  };

  const findRelated = (domain, entries) => {
    const base = rootish(domain);
    return entries.filter((entry) => entry.domain !== domain && rootish(entry.domain) === base);
  };

  const findSuggestion = (domain, entries) => {
    if (!domain || !domain.includes(".")) return null;
    let best = null;
    for (const entry of entries) {
      const score = distance(domain, entry.domain);
      if (!best || score < best.score) best = { entry, score };
    }
    if (!best) return null;
    const maxDistance = domain.length <= 8 ? 1 : 2;
    return best.score > 0 && best.score <= maxDistance ? best.entry : null;
  };

  const renderMgaRecord = (result, record, registryInfo, suggestionFrom = "") => {
    const suggestionLead = suggestionFrom
      ? `<p class="checker-suggestion-lead">Tarkoititko <strong>${escapeHtml(record.domain)}</strong>? Alla ovat tämän domainin MGA-tiedot.</p>`
      : "";
    const gameTypes = record.gameTypes
      ? `<div><dt>Pelityypit</dt><dd>${escapeHtml(record.gameTypes)}</dd></div>`
      : "";
    const updateNote = registryInfo.generatedAt
      ? `<p class="result-note">Rekisteri päivitetty ${escapeHtml(new Date(registryInfo.generatedAt).toLocaleDateString("fi-FI"))}. Tee ennen pelaamista vielä lopullinen tarkistus MGA:n omalla URL Checkerilla, sillä lisenssitiedot voivat muuttua.</p>`
      : `<p class="result-note">Tee ennen pelaamista vielä lopullinen tarkistus MGA:n omalla URL Checkerilla, sillä lisenssitiedot voivat muuttua.</p>`;

    result.innerHTML = `
      ${suggestionLead}
      <span class="result-status result-status--ok">MGA-lisensoitu domain löytyi rekisteristä</span>
      <strong class="result-domain">${escapeHtml(record.domain)}</strong>
      <dl>
        <div><dt>Operaattori</dt><dd>${escapeHtml(record.operator)}</dd></div>
        <div><dt>Lisenssi</dt><dd>${escapeHtml(record.licence)}</dd></div>
        ${gameTypes}
      </dl>
      <a class="result-source" href="${escapeHtml(record.verification || OFFICIAL_REGISTER)}" target="_blank" rel="noopener noreferrer">Varmenna MGA:n lähteestä ↗</a>
      ${updateNote}`;
  };

  const renderOtherRecord = (result, domain, record) => {
    result.innerHTML = `
      <span class="result-status result-status--warn">${escapeHtml(record.label)}</span>
      <strong class="result-domain">${escapeHtml(domain)}</strong>
      <dl>
        <div><dt>Operaattori</dt><dd>${escapeHtml(record.operator)}</dd></div>
        <div><dt>Lisenssitieto</dt><dd>${escapeHtml(record.licence)}</dd></div>
      </dl>
      <a class="result-source" href="${escapeHtml(record.verification)}" target="_blank" rel="noopener noreferrer">Avaa lähde ↗</a>`;
  };

  const injectStyles = () => {
    if (document.getElementById("license-checker-enhancement-styles")) return;
    const style = document.createElement("style");
    style.id = "license-checker-enhancement-styles";
    style.textContent = `
      .result-status--suggestion{color:#ffbf7a}
      .checker-suggestion-lead{color:#dbe5ef!important;font-size:15px!important;margin-top:12px!important}
      .checker-suggestion{appearance:none;border:0;background:transparent;color:#ffad63;font:inherit;font-weight:900;padding:0;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
      .checker-suggestion:hover{color:#fff}
    `;
    document.head.appendChild(style);
  };

  const init = async () => {
    const form = document.querySelector("[data-license-form]");
    const result = document.querySelector("[data-license-result]");
    const actions = document.querySelector("[data-checker-actions]");
    const copyButton = document.querySelector("[data-copy-domain]");
    if (!(form instanceof HTMLFormElement) || !(result instanceof HTMLElement) || !(actions instanceof HTMLElement)) return;

    const input = form.querySelector("input");
    if (!(input instanceof HTMLInputElement)) return;

    injectStyles();
    const registryInfo = await loadRegistry();
    const mgaEntries = registryInfo.entries;
    let currentDomain = "";

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();

      currentDomain = normaliseDomain(input.value);
      if (!currentDomain) return;
      input.value = currentDomain;

      const exactMga = mgaEntries.find((entry) => entry.domain === currentDomain);
      if (exactMga) {
        renderMgaRecord(result, exactMga, registryInfo);
        actions.hidden = false;
        return;
      }

      const exactOther = nonMgaRecords.find((item) => item.domains.includes(currentDomain));
      if (exactOther) {
        renderOtherRecord(result, currentDomain, exactOther);
        actions.hidden = false;
        return;
      }

      const related = findRelated(currentDomain, mgaEntries);
      if (related.length === 1) {
        const typedDomain = currentDomain;
        const match = related[0];
        result.innerHTML = `
          <span class="result-status result-status--suggestion">Läheinen MGA-rekisteriosuma löytyi</span>
          <strong class="result-domain">${escapeHtml(typedDomain)}</strong>
          <p>MGA-rekisterissä on tähän samaan päädomainiin kuuluva osoite <button type="button" class="checker-suggestion" data-domain-suggestion="${escapeHtml(match.domain)}">${escapeHtml(match.domain)}</button>.</p>`;
        actions.hidden = false;
        result.querySelector("[data-domain-suggestion]")?.addEventListener("click", () => {
          input.value = match.domain;
          currentDomain = match.domain;
          renderMgaRecord(result, match, registryInfo, typedDomain);
        });
        return;
      }

      const suggestion = findSuggestion(currentDomain, mgaEntries);
      if (suggestion) {
        const typedDomain = currentDomain;
        result.innerHTML = `
          <span class="result-status result-status--suggestion">Mahdollinen kirjoitusvirhe</span>
          <strong class="result-domain">${escapeHtml(typedDomain)}</strong>
          <p class="checker-suggestion-lead">Tarkoititko <button type="button" class="checker-suggestion" data-domain-suggestion="${escapeHtml(suggestion.domain)}">${escapeHtml(suggestion.domain)}</button>?</p>
          <p>${escapeHtml(suggestion.domain)} löytyy MGA-rekisteristä lisenssillä ${escapeHtml(suggestion.licence)}.</p>`;
        actions.hidden = false;
        result.querySelector("[data-domain-suggestion]")?.addEventListener("click", () => {
          input.value = suggestion.domain;
          currentDomain = suggestion.domain;
          renderMgaRecord(result, suggestion, registryInfo, typedDomain);
        });
        return;
      }

      result.innerHTML = `
        <span class="result-status">Ei osumaa MGA-rekisterissä</span>
        <strong class="result-domain">${escapeHtml(currentDomain)}</strong>
        <p>Emme löytäneet tälle domainille täsmäosumaa. Tämä ei yksin tarkoita, että sivusto olisi lisensoimaton. Tarkista osoite vielä MGA:n virallisella URL Checkerilla.</p>
        <a class="result-source" href="${OFFICIAL_URL_CHECKER}" target="_blank" rel="noopener noreferrer">Avaa MGA URL Checker ↗</a>`;
      actions.hidden = false;
    }, true);

    copyButton?.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!currentDomain || !(copyButton instanceof HTMLButtonElement)) return;
      try {
        await navigator.clipboard.writeText(currentDomain);
        copyButton.textContent = "Kopioitu";
        setTimeout(() => { copyButton.textContent = "Kopioi domain"; }, 1400);
      } catch {
        copyButton.textContent = currentDomain;
        setTimeout(() => { copyButton.textContent = "Kopioi domain"; }, 1800);
      }
    }, true);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
