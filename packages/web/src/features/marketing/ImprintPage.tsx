import { LegalPageLayout } from './LegalPageLayout.js';

/* Every "[TODO: …]" must be replaced with real operator data before deploy. */
export function ImprintPage() {
  return (
    <LegalPageLayout title="Impressum">
      <section>
        <h2>Angaben gemäß § 5 DDG</h2>
        <p>
          [TODO: Vor- und Nachname des Betreibers]
          <br />
          [TODO: Straße und Hausnummer]
          <br />
          [TODO: PLZ und Ort]
          <br />
          Deutschland
        </p>
      </section>

      <section>
        <h2>Kontakt</h2>
        <p>
          E-Mail: [TODO: Kontakt-E-Mail-Adresse]
          <br />
          [TODO: optional Telefonnummer]
        </p>
      </section>

      <section>
        <h2>Verantwortlich für den Inhalt gemäß § 18 Abs. 2 MStV</h2>
        <p>
          [TODO: Vor- und Nachname]
          <br />
          [TODO: Anschrift wie oben]
        </p>
      </section>

      <section>
        <h2>Haftung für Inhalte</h2>
        <p>
          Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen
          Gesetzen verantwortlich. Wir sind jedoch nicht verpflichtet, übermittelte oder
          gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf
          eine rechtswidrige Tätigkeit hinweisen.
        </p>
      </section>

      <section>
        <h2>Haftung für Links</h2>
        <p>
          Unser Angebot enthält gegebenenfalls Links zu externen Websites Dritter, auf deren
          Inhalte wir keinen Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets der
          jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
        </p>
      </section>
    </LegalPageLayout>
  );
}
