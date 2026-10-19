/** Юридичні тексти німецькою. Заглушки у квадратних дужках ОБОВ'ЯЗКОВО замінити перед публікацією. */
export function Impressum() {
  return (
    <>
      <h1>Impressum</h1>
      <p>Angaben gemäß § 5 DDG</p>
      <p>
        [Name des Vereins / der verantwortlichen Person]
        <br />
        [Straße und Hausnummer]
        <br />
        [PLZ Ort]
      </p>
      <h2>Kontakt</h2>
      <p>E-Mail: [E-Mail-Adresse]</p>
      <h2>Verantwortlich für den Inhalt</h2>
      <p>[Name, Anschrift]</p>
      <h2>Hinweis</h2>
      <p>
        Diese Seite ist ein nicht-kommerzielles Angebot zur Sammlung von Bestellwünschen für Uniformen des Plast
        (Düsseldorf). Verkauft wird auf dieser Seite nichts; Bestellungen erfolgen durch die Koordinatoren bei
        scoutstyle.net.
      </p>
    </>
  );
}

export function Datenschutz() {
  return (
    <>
      <h1>Datenschutzerklärung</h1>
      <h2>1. Verantwortlicher</h2>
      <p>[Name und Anschrift des Verantwortlichen, E-Mail]</p>
      <h2>2. Welche Daten wir verarbeiten</h2>
      <p>
        Beim Absenden einer Bestellung verarbeiten wir: Vorname, Nachname, Telefonnummer, Vor- und Nachname des
        Kindes, für das die Artikel bestimmt sind, Ortsgruppe (Stanyzja), Altersstufe (Uladh), optional die Einheit
        sowie die gewünschten Artikel, Größen und Mengen. Rechtsgrundlage ist Ihre
        Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) bzw. die Durchführung der Bestellung (Art. 6 Abs. 1 lit. b DSGVO).
      </p>
      <h2>3. Zweck und Empfänger</h2>
      <p>
        Die Daten werden ausschließlich von den Koordinatoren verwendet, um die Bestellung bei scoutstyle.net
        aufzugeben und Sie telefonisch zu kontaktieren. Sie werden in einer Google-Tabelle gespeichert, auf die nur
        die Koordinatoren Zugriff haben. Anbieter: Google Ireland Limited / Google LLC (Google Formulare, Google
        Tabellen). [Angaben zu Auftragsverarbeitungsvertrag / Datenübermittlung in Drittländer ergänzen.]
      </p>
      <h2>4. Speicherdauer</h2>
      <p>[Speicherdauer festlegen, z. B. bis zum Abschluss der Bestellung, spätestens nach X Monaten.]</p>
      <h2>5. Aufruf der Seite</h2>
      <p>
        Beim Laden des Katalogs und beim Absenden der Bestellung stellt Ihr Browser eine Verbindung zu Servern von
        Google her; dabei wird Ihre IP-Adresse übermittelt. Die Seite wird über GitHub Pages ausgeliefert (GitHub,
        Inc.), wobei ebenfalls technisch notwendige Verbindungsdaten anfallen. Wir verwenden keine Cookies und keine
        Tracking- oder Analysewerkzeuge. Schriften werden lokal ausgeliefert.
      </p>
      <h2>6. Lokale Speicherung</h2>
      <p>
        Ihre Auswahl (Warenkorb) wird im lokalen Speicher Ihres Browsers (localStorage) abgelegt, damit sie nach dem
        Neuladen erhalten bleibt. Bei einer teilweise gesendeten Bestellung merkt sich der Browser außerdem die
        Bestellnummer und welche Artikel bereits gesendet wurden, jedoch keine Kontaktdaten. Diese Daten verlassen
        Ihr Gerät nicht.
      </p>
      <h2>7. Ihre Rechte</h2>
      <p>
        Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit
        und Widerruf Ihrer Einwilligung sowie ein Beschwerderecht bei einer Aufsichtsbehörde. Wenden Sie sich dazu an
        die oben genannte Kontaktadresse.
      </p>
    </>
  );
}
