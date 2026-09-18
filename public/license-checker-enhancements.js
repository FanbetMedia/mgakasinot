(() => {
  const checkerRecords = [
    {
      domains: ["bet365.com"],
      status: "mga",
      label: "MGA-lisenssitieto löytyi paikallisesta tarkistusdatasta",
      operator: "Hillside (Sports) ENC / Hillside (Gaming) ENC",
      licence: "MGA/CRP/531/2018 / MGA/CRP/531/2018-02",
      verification: "https://authorisation.mga.org.mt/verification.aspx?company=671c2548-ec97-4aa3-9339-442fc68a6e44&details=1&lang=en",
      brand: "Bet365"
    },
    {
      domains: ["rizk.com", "guts.com"],
      status: "mga",
      label: "MGA-lisenssi löytyi paikallisesta tarkistusdatasta",
      operator: "Zecure Gaming Limited",
      licence: "MGA/CRP/1117/2025-02",
      verification: "https://authorisation.mga.org.mt/verification.aspx?company=894fb754-8605-4c2d-8bbe-2febe0ac4dd1&details=1&lang=EN"
    },
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

  const allDomains = checkerRecords.flatMap((record) => record.domains.map((domain) => ({ domain, record })));

  const findSuggestion = (domain) => {
    if (!domain || !domain.includes(".")) return null;
    let best = null;
    for (const candidate of allDomains) {
      const score = distance(domain, candidate.domain);
      if (!best || score < best.score) best = { ...candidate, score };
    }
    if (!best) return null;
    const maxDistance = domain.length <= 8 ? 1 : 2;
    return best.score > 0 && best.score <= maxDistance ? best : null;
  };

  const escapeHtml = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const renderRecord = (result, domain, record, suggested = false) => {
    const badgeClass = record.status === "mga" ? "result-status result-status--ok" : "result-status result-status--warn";
    const suggestionLead = suggested
      ? `<p class="checker-suggestion-lead">Tarkoititko <strong>${escapeHtml(domain)}</strong>? Näytetään tämän domainin tiedot.</p>`
      : "";
    const summary = record.brand === "Bet365"
      ? `<p class="result-summary">Bet365.com löytyy MGA:n rekisteristä Hillside-yhtiöiden alla. Alla näkyvät tarkistusdataan tallennetut nykyiset MGA-lisenssitiedot.</p>`
      : "";

    result.innerHTML = `
      ${suggestionLead}
      <span class="${badgeClass}">${escapeHtml(record.label)}</span>
      <strong class="result-domain">${escapeHtml(domain)}</strong>
      ${summary}
      <dl>
        <div><dt>Operaattori</dt><dd>${escapeHtml(record.operator)}</dd></div>
        <div><dt>Lisenssitieto</dt><dd>${escapeHtml(record.licence)}</dd></div>
      </dl>
      <a class="result-source" href="${escapeHtml(record.verification)}" target="_blank" rel="noopener noreferrer">Avaa MGA-lähde ↗</a>
      <p class="result-note">Tee vielä lopullinen tarkistus viranomaisen omasta rekisteristä, sillä lisenssistatus ja operaattoritiedot voivat muuttua.</p>`;
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
      .result-summary{color:#c9d4df!important}
    `;
    document.head.appendChild(style);
  };

  const init = () => {
    const form = document.querySelector("[data-license-form]");
    const result = document.querySelector("[data-license-result]");
    const actions = document.querySelector("[data-checker-actions]");
    const copyButton = document.querySelector("[data-copy-domain]");
    if (!(form instanceof HTMLFormElement) || !(result instanceof HTMLElement) || !(actions instanceof HTMLElement)) return;

    const input = form.querySelector("input");
    if (!(input instanceof HTMLInputElement)) return;

    injectStyles();
    let currentDomain = "";

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();

      currentDomain = normaliseDomain(input.value);
      if (!currentDomain) return;
      input.value = currentDomain;

      const record = checkerRecords.find((item) => item.domains.includes(currentDomain));
      if (record) {
        renderRecord(result, currentDomain, record);
        actions.hidden = false;
        return;
      }

      const suggestion = findSuggestion(currentDomain);
      if (suggestion) {
        const typedDomain = currentDomain;
        result.innerHTML = `
          <span class="result-status result-status--suggestion">Mahdollinen kirjoitusvirhe</span>
          <strong class="result-domain">${escapeHtml(typedDomain)}</strong>
          <p class="checker-suggestion-lead">Tarkoititko <button type="button" class="checker-suggestion" data-domain-suggestion="${escapeHtml(suggestion.domain)}">${escapeHtml(suggestion.domain)}</button>?</p>
          <p>${suggestion.record.status === "mga" ? `${escapeHtml(suggestion.record.brand || suggestion.domain)} löytyy paikallisesta MGA-tarkistusdatasta lisenssitiedolla ${escapeHtml(suggestion.record.licence)}.` : `${escapeHtml(suggestion.domain)} löytyy paikallisesta tarkistusdatasta.`}</p>`;
        actions.hidden = false;

        const suggestionButton = result.querySelector("[data-domain-suggestion]");
        suggestionButton?.addEventListener("click", () => {
          input.value = suggestion.domain;
          currentDomain = suggestion.domain;
          renderRecord(result, suggestion.domain, suggestion.record, true);
        });
        return;
      }

      result.innerHTML = `
        <span class="result-status">Ei osumaa paikallisesta tarkistusdatasta</span>
        <strong class="result-domain">${escapeHtml(currentDomain)}</strong>
        <p>Tämä ei tarkoita, että kasino olisi lisensoitu tai lisensoimaton. Tarkista domain seuraavaksi virallisen viranomaisen rekisteristä.</p>`;
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
