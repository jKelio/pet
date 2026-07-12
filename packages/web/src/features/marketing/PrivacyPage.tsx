import { LegalPageLayout } from './LegalPageLayout.js';

/* Every "[TODO: …]" must be replaced with real operator data before deploy. */
export function PrivacyPage() {
  return (
    <LegalPageLayout title="Datenschutzerklärung">
      <section>
        <h2>1. Verantwortlicher</h2>
        <p>
          Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:
          <br />
          [TODO: Vor- und Nachname]
          <br />
          [TODO: Straße und Hausnummer]
          <br />
          [TODO: PLZ und Ort]
          <br />
          E-Mail: [TODO: Kontakt-E-Mail-Adresse]
        </p>
      </section>

      <section>
        <h2>2. Verarbeitete Daten</h2>
        <p>
          PracMetrics ist eine Plattform zur Erfassung und Auswertung von Trainingseinheiten.
          Wir verarbeiten folgende personenbezogene Daten:
        </p>
        <p>
          <strong className="text-white">Anmeldung (Magic Link):</strong> Zur Anmeldung wird Ihre
          E-Mail-Adresse verarbeitet, an die ein einmaliger Anmeldelink gesendet wird. Die
          E-Mail-Adresse wird gespeichert, solange Ihr Konto besteht. Rechtsgrundlage ist
          Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
        </p>
        <p>
          <strong className="text-white">Trainings- und Sitzungsdaten:</strong> Von Ihnen erfasste
          Trainingsdaten (Zeiten, Zähler, Drill-Konfigurationen, Team- und Mitgliedsdaten) werden
          zur Bereitstellung der Anwendung gespeichert. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b
          DSGVO.
        </p>
      </section>

      <section>
        <h2>3. Cookies und lokale Speicherung</h2>
        <p>
          Diese Anwendung verwendet keine Tracking- oder Werbe-Cookies. Zur Bereitstellung der
          Offline-Funktionalität und der Anmeldung werden technisch notwendige Daten im lokalen
          Speicher Ihres Browsers abgelegt (localStorage und IndexedDB), darunter Sitzungs-Token
          und lokal erfasste Trainingsdaten. Diese Daten verbleiben auf Ihrem Gerät und können
          durch Löschen der Browserdaten entfernt werden.
        </p>
      </section>

      <section>
        <h2>4. Hosting und Auftragsverarbeitung</h2>
        <p>
          Die Anwendung wird bei Render Services, Inc. (USA) gehostet. Dabei werden
          Verbindungsdaten (z.&nbsp;B. IP-Adresse, Zeitpunkt des Zugriffs) technisch bedingt
          verarbeitet. [TODO: Angaben zum Auftragsverarbeitungsvertrag und zur
          Drittlandübermittlung (EU-Standardvertragsklauseln / Data Privacy Framework) prüfen und
          ergänzen.]
        </p>
      </section>

      <section>
        <h2>5. Ihre Rechte</h2>
        <p>
          Sie haben gegenüber dem Verantwortlichen das Recht auf Auskunft (Art. 15 DSGVO),
          Berichtigung (Art. 16 DSGVO), Löschung (Art. 17 DSGVO), Einschränkung der Verarbeitung
          (Art. 18 DSGVO), Datenübertragbarkeit (Art. 20 DSGVO) und Widerspruch gegen die
          Verarbeitung (Art. 21 DSGVO). Außerdem haben Sie das Recht, sich bei einer
          Datenschutz-Aufsichtsbehörde zu beschweren (Art. 77 DSGVO).
        </p>
      </section>

      <section>
        <h2>6. Kontakt in Datenschutzfragen</h2>
        <p>
          Bei Fragen zur Verarbeitung Ihrer personenbezogenen Daten wenden Sie sich an:
          [TODO: Kontakt-E-Mail-Adresse].
        </p>
      </section>
    </LegalPageLayout>
  );
}
