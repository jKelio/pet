-- Replace the per-tenant URL "sources" library with a global, Pracmetrics-curated,
-- sport-scoped knowledge library holding editorial text. Existing tenant sources are
-- intentionally discarded (the new library is centrally curated for uniformity).
-- See docs/adr/0011-curated-knowledge-library.md.

DROP TABLE IF EXISTS "sources";--> statement-breakpoint
CREATE TABLE "library_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"sport" text DEFAULT 'ice_hockey' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "library_entries_sport_idx" ON "library_entries" USING btree ("sport");--> statement-breakpoint
INSERT INTO "library_entries" ("title", "content", "sport") VALUES
(
	'DEB RTK – Allgemeine Grundlagen',
	$txt$Grundlage: DEB-Rahmentrainingskonzeption (RTK), allgemeine Ausbildungsphilosophie.

Die Ausbildung folgt einem langfristigen, entwicklungsgerechten Aufbau über fünf Trainingsstufen (Basisschulung bis Anschlusstraining). Im Zentrum steht die ganzheitliche Entwicklung der Spielerpersönlichkeit – sie hat Vorrang vor kurzfristigen Mannschaftserfolgen.

Fünf Kernprinzipien: (1) sportartenübergreifende Ausbildung koordinativer und konditioneller Fähigkeiten, (2) systematischer, langfristiger Leistungsaufbau, (3) individuelle Betreuung und Förderung, (4) Fokus auf gesamtheitliche Persönlichkeitsentwicklung, (5) Betreuung durch verantwortungsvolle Trainer.

Elementare Bewegungsfertigkeiten bilden die Grundlage für die spätere technische und taktische Ausbildung. Der Trainer ist fachlich wie sozial kompetente Bezugsperson. Für die Trainingsanalyse bedeutet das: altersgerechte Belastung, ausgewogenes Verhältnis von aktiver Übungszeit zu Stand-/Wartezeit und ein roter Faden in der Inhaltsabfolge sind wichtiger als reine Wiederholungszahlen.$txt$,
	'ice_hockey'
),
(
	'DEB RTK – Basisschulung (U9/U11)',
	$txt$Grundlage: DEB-RTK, Stufe Basisschulung – Altersgruppen U9 und U11.

Leitidee: Freude und aktives Training. Kinder sollen eine angenehme Trainingserfahrung erleben und sich als Spieler wie als junge Menschen entwickeln. Hohe aktive Bewegungszeit und kurze Wartezeiten sind in dieser Stufe besonders entscheidend.

Technische Schwerpunkte: Schlittschuhtechnik (Laufschule) und Stocktechnik als Fundament, dazu grundlegende eishockeyspezifische Fertigkeiten. Taktisch: einfaches defensives und offensives Verhalten sowie Zweikampfverhalten (offensiv/defensiv) in altersgerechter Form. Ergänzend: motorisch-athletische Grundausbildung, Spielerpersönlichkeit, Ernährung und Materialkunde.

Für die Analyse einer Trainingseinheit auf dieser Stufe: viel Bewegung pro Kind, spielerische Formen, geringe Standzeiten, breite koordinative Grundlage statt früher Spezialisierung.$txt$,
	'ice_hockey'
),
(
	'DEB RTK – Grundlagentraining (U13)',
	$txt$Grundlage: DEB-RTK, Stufe Grundlagentraining – Altersklasse U13.

Ziel: Spielern neue Erfahrungen vermitteln und Entwicklung sportlich wie persönlich fördern. Freude, Ehrgeiz/Engagement und „Spielen als Mannschaft" stehen im Fokus.

Schwerpunkte: Stock- und Schlittschuhtechnik als fundamentale Fertigkeiten, defensive und offensive Zweikampftechnik sowie erstes zonales Verständnis (Defensive Zone, Neutrale Zone, Offensive Zone). Einführung von Über- und Unterzahlsituationen. Zunehmender, dosierter Körperkontakt. Ergänzend: motorisch-athletische Entwicklung, Ernährungswissen, mentale Spielerpersönlichkeit und beginnende Leistungsdiagnostik.

Für die Analyse: strukturierte, praktische Übungen mit angemessenem aktiven Anteil, ausgewogene Verteilung zwischen Technik, Zweikampf und zonalem Spiel, kontrollierter Aufbau von Intensität.$txt$,
	'ice_hockey'
),
(
	'DEB RTK – Aufbautraining 1 (U15)',
	$txt$Grundlage: DEB-RTK, Stufe Aufbautraining 1 – Altersklasse U15.

Ziel: Entwicklung als Eishockeyspieler und als Heranwachsender fördern, strukturierte, altersgerechte Vorbereitung auf höhere Leistungsstufen.

Sieben Bereiche: Spaß und Engagement, altersgerechte praktische Übungen, kontinuierliche Fähigkeitsentwicklung, Körperkontakt und Body-Checking, Mannschaftsspiel sowie Heranführung an Wettkampfbelastung. Technisch-taktisch: Stock- und Schlittschuhtechnik, Zweikampf, Defensiv- und Offensivverhalten sowie Spielverhalten in den drei Zonen. Ergänzend: motorisch-athletische Entwicklung, psychologische Persönlichkeitsentwicklung, Ernährung und Materialkunde.

Für die Analyse: Einführung von Body-Checking sauber und dosiert, steigende Wettkampfnähe, ausgewogene Belastung mit klarer Technik-/Taktik-/Athletik-Balance.$txt$,
	'ice_hockey'
),
(
	'DEB RTK – Aufbautraining 2 (U17)',
	$txt$Grundlage: DEB-RTK, Stufe Aufbautraining 2 – Altersklasse U17.

Ziel: Erfahrungsrepertoire festigen und lernen, im Wettkampf zu bestehen; Entwicklung als Athlet und als Jugendlicher. Freude, Ehrgeiz/Engagement und altersgerechtes Training bleiben tragend.

Inhalte: Vertiefung von Stock- und Schlittschuhtechnik, offensives und defensives Zweikampfverhalten, zonale Spielweise (Defensive, Neutrale, Offensive Zone) sowie Körperkontakt und Body-Checking. Neben technisch-taktischen Elementen: Motorik, Athletik, Leistungsdiagnostik und Persönlichkeitsentwicklung.

Für die Analyse: höhere Intensität und Wettkampfnähe, Festigung und Variabilität der Technik unter Druck, gezielte athletische Belastungssteuerung.$txt$,
	'ice_hockey'
),
(
	'DEB RTK – Anschlusstraining',
	$txt$Grundlage: DEB-RTK, Stufe Anschlusstraining – Übergang zum Leistungs-/Spitzensport.

Ziel: Stabilisierung des Wettkampfverhaltens und Ausbildung von Spitzenathleten.

Schwerpunkte: variable Anwendung technischer Fertigkeiten unter Druck, Verfeinerung taktischer Verhaltensweisen passend zur konkreten Spielsituation, Entwicklung individueller Spielerprofile (Stärken gezielt ausbauen, Schwächen reduzieren). Kondition und Persönlichkeitstraining nehmen großen Raum ein, ergänzt durch leistungssportorientierte Ernährung bei Kaderathleten. Inhaltlich alle technischen Bereiche (Stock-/Schlittschuhtechnik), Zweikampfverhalten sowie zonale und numerische Spielsituationen.

Für die Analyse: hohe Spezifität und Wettkampfintensität, individualisierte Schwerpunkte, Technik-/Taktikanwendung unter realistischem Druck.$txt$,
	'ice_hockey'
);
