(() => {
  const complaint = document.querySelector('#ongelmatilanteet');
  if (!(complaint instanceof HTMLElement) || complaint.querySelector('[data-dispute-help]')) return;

  const wrapper = document.createElement('section');
  wrapper.className = 'dispute-help';
  wrapper.setAttribute('data-dispute-help', '');
  wrapper.innerHTML = `
    <div class="dispute-help__intro">
      <p class="section-kicker">Voimme auttaa</p>
      <h3>Jäikö asia kasinon kanssa jumiin?</h3>
      <p>Voit lähettää meille tilanteen perustiedot. Voimme auttaa tarkistamaan operaattorin ja lisenssin, jäsentämään reklamaation seuraavat vaiheet ja tilanteesta riippuen olla yhteydessä kasinoon asian selvittämiseksi.</p>
      <div class="dispute-help__scope" aria-label="Missä voimme auttaa">
        <span>Lisenssi ja operaattori</span>
        <span>Kotiutusongelmat</span>
        <span>Bonusehdot</span>
        <span>KYC ja tilirajoitukset</span>
      </div>
      <p class="dispute-help__note">Emme ole viranomainen, asianajotoimisto tai riidanratkaisuelin emmekä voi luvata tiettyä lopputulosta. Virallisessa riidassa kasino, ADR-elin ja MGA ovat edelleen varsinaiset käsittelykanavat.</p>
    </div>

    <form class="dispute-form" data-dispute-form>
      <div class="dispute-form__heading">
        <span>Yhteydenotto</span>
        <strong>Kerro lyhyesti mitä tapahtui</strong>
      </div>

      <div class="dispute-form__grid">
        <label>
          <span>Asia koskee</span>
          <select name="issue" required>
            <option value="">Valitse aihe</option>
            <option>Kotiutus viivästyy tai on hylätty</option>
            <option>Tili tai varat on jäädytetty</option>
            <option>KYC / henkilöllisyyden vahvistaminen</option>
            <option>Bonus tai bonusehdot</option>
            <option>Talletus tai maksutapa</option>
            <option>Pelaamisen rajoitukset tai tilin sulkeminen</option>
            <option>Muu ongelma</option>
          </select>
        </label>

        <label>
          <span>Kasino tai domain</span>
          <input type="text" name="casino" placeholder="esim. casino.com" required />
        </label>

        <label>
          <span>Riidan summa <small>(valinnainen)</small></span>
          <input type="text" name="amount" inputmode="decimal" placeholder="esim. 1 250 €" />
        </label>

        <label>
          <span>Sähköpostisi</span>
          <input type="email" name="email" autocomplete="email" placeholder="nimi@email.com" required />
        </label>
      </div>

      <label class="dispute-form__message">
        <span>Mitä tapahtui?</span>
        <textarea name="message" rows="6" placeholder="Kerro tapahtumat aikajärjestyksessä. Mainitse tärkeät päivämäärät, mitä kasino on vastannut ja mitä olet jo tehnyt asian ratkaisemiseksi." required></textarea>
      </label>

      <div class="dispute-form__checks">
        <label><input type="checkbox" name="contacted" /> Olen jo ollut yhteydessä kasinon asiakaspalveluun</label>
        <label><input type="checkbox" name="final-response" /> Olen saanut kasinolta kirjallisen lopullisen vastauksen</label>
        <label><input type="checkbox" name="terms" required /> Ymmärrän, että MGA Kasinot ei ole viranomainen eikä voi taata asian ratkaisua</label>
      </div>

      <div class="dispute-form__submit">
        <button type="submit">Valmistele yhteydenotto</button>
        <p>Tietoja ei tallenneta tällä sivulla. Painike avaa sähköpostiohjelmasi valmiiksi täytetyllä viestillä.</p>
      </div>
      <p class="dispute-form__status" data-dispute-status aria-live="polite"></p>
    </form>`;

  complaint.appendChild(wrapper);

  const form = wrapper.querySelector('[data-dispute-form]');
  const status = wrapper.querySelector('[data-dispute-status]');
  if (!(form instanceof HTMLFormElement)) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const issue = String(data.get('issue') || '');
    const casino = String(data.get('casino') || '');
    const amount = String(data.get('amount') || '').trim();
    const email = String(data.get('email') || '');
    const message = String(data.get('message') || '');
    const contacted = data.get('contacted') ? 'Kyllä' : 'Ei / ei merkitty';
    const finalResponse = data.get('final-response') ? 'Kyllä' : 'Ei / ei merkitty';

    const subject = `Kasino-ongelman selvityspyyntö: ${casino}`;
    const body = [
      'Hei,',
      '',
      'Tarvitsen apua kasinoon liittyvän asian selvittämisessä.',
      '',
      `Kasino / domain: ${casino}`,
      `Aihe: ${issue}`,
      `Riidan summa: ${amount || 'Ei ilmoitettu'}`,
      `Yhteyssähköposti: ${email}`,
      `Olen ollut yhteydessä kasinoon: ${contacted}`,
      `Lopullinen kirjallinen vastaus saatu: ${finalResponse}`,
      '',
      'Tilanteen kuvaus:',
      message,
      '',
      'Voin toimittaa pyydettäessä kuvakaappaukset, tapahtumatunnukset ja muun asiaan liittyvän aineiston.'
    ].join('\n');

    if (status instanceof HTMLElement) {
      status.textContent = 'Sähköpostiohjelma avataan. Liitä viestiin tarvittaessa kuvakaappaukset ja muu aineisto.';
    }
    window.location.href = `mailto:info@mgakasinot.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
})();