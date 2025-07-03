import i18n from "i18next";
import {initReactI18next} from "react-i18next";

// the translations
// (tip move them in a JSON file and import them,
// or even better, manage them separated from your code: https://react.i18next.com/guides/multiple-translation-files)
const resources = {
    en: {
        pet: {
            "title": "Practice Efficiency Tracking",
            "general": {
                "infoHeader": "General",
                "clubLabel": "Club",
                "teamLabel": "Team",
                "dateLabel": "Date",
                "coachLabel": "Name of the coach",
                "evaluationLabel": "Evaluation #"
            },
            "practice": {
                "infoHeader": 'Practice',
                "athletesNumberLabel": "Number of Athletes",
                "coachesNumberLabel": "Number of Coaches",
                "totalTimeLabel": "Total Time of Practice (in hours)",
                "trackedPlayerNameLabel": "Tracked Player Name",
                "drillsNumberLabel": "Number of Drills/Stations"
            },
            "buttons": {
                "nextButtenText": "Next",
                "previousButtonText": "Previous"
            },
            "drills": {
                "selectCategoriesLabel": "Select Categories",
                "station": "Station",
                "drill": "Drill",
                "technique": "Technique",
                "tactic": "Tactic",
                "smallareagame": "SmallAreaGame",
                "skating": "Skating",
                "passing": "Passing",
                "shot": "Shot",
                "puckhandling": "Puckhandling",
                "battlechecking": "Battle | Checking"
            },
            "actions": {
                "label": "Order and toggle actions",
                "explanation": "Explanation",
                "demonstration": "Demonstration",
                "gettingstarted": "Getting Started (waste time)",
                "feedbackteam": "Feedback (Team)",
                "changesideone": "Change Side #1",
                "changesidetwo": "Change Side #2",
                "timemoving": "Time moving",
                "repetition": "Repetition (stationary exercise)",
                "feedbackplayers": "Feedback (Player Received)",
                "shots": "Shots",
                "passes": "Passes",
                "typeLabel": "Type",
                "timer": "Timer",
                "counter": "Counter"
            },
            "timeWatcher": {
                "title": "Time Watcher",
                "timers": "Timers",
                "counters": "Counters",
                "active": "Active",
                "inactive": "Inactive",
                "count": "Count",
                "placeholder": "Ready to start tracking?",
                "startButton": "Start TimeWatcher",
                "wasteTime": "Waste Time"
            },
            "results": {
                "title": "Training Results",
                "summary": "Training Summary",
                "totalDrills": "Total Drills",
                "totalTime": "Total Time",
                "wasteTime": "Waste Time",
                "detailedResults": "Detailed Results",
                "placeholder": "Detailed analysis coming soon...",
                "backToHome": "Back to Home"
            }
        },
        menu: {
            "signin": "Sign In",
            "signout": "Sign Out",
            "tracking": "Tracking",
            "feedback": "Feedback",
            "faq": "FAQs",
            "glossary": "Glossary",
            "video": "Video Explanation",
            "language": "Select Language"
        }
    },
    de: {
        pet: {
            "title": "Practice Efficiency Tracking",
            "general": {
                "infoHeader": "Allgemein",
                "clubLabel": "Club",
                "teamLabel": "Team",
                "dateLabel": "Datum",
                "coachLabel": "Name des Trainers",
                "evaluationLabel": "Auswertung #"
            },
            "practice": {
                "infoHeader": 'Training',
                "athletesNumberLabel": "Anzahl der Athleten",
                "coachesNumberLabel": "Anzahl der Trainer",
                "totalTimeLabel": "Trainingszeit",
                "trackedPlayerNameLabel": "Name des zu beobachtenden Spielers",
                "drillsNumberLabel": "Anzahl der Drills/Stationen"
            },
            "buttons": {
                "nextButtenText": "Weiter",
                "previousButtonText": "Zurück"
            },
            "drills": {
                "selectCategoriesLabel": "Kategorien auswählen",
                "station": "Station",
                "drill": "Drill",
                "technique": "Technique",
                "tactic": "Tactic",
                "smallareagame": "SmallAreaGame",
                "skating": "Skating",
                "passing": "Passing",
                "shot": "Shot",
                "puckhandling": "Puckhandling",
                "battlechecking": "Battle | Checking"
            },
            "actions": {
                "label": "Trainingsaktivitäten auswählen",
                "explanation": "Explanation",
                "demonstration": "Demonstration",
                "gettingstarted": "Getting Started (waste time)",
                "feedbackteam": "Feedback (Team)",
                "changesideone": "Change Side #1",
                "changesidetwo": "Change Side #2",
                "timemoving": "Time moving",
                "repetition": "Repetition (stationary exercise)",
                "feedbackplayers": "Feedback (Player Received)",
                "shots": "Shots",
                "passes": "Passes",
                "typeLabel": "Typ",
                "timer": "Zeit",
                "counter": "Zähler"
            },
            "timeWatcher": {
                "title": "Zeit Beobachter",
                "timers": "Zeitmesser",
                "counters": "Zähler",
                "active": "Aktiv",
                "inactive": "Inaktiv",
                "count": "Anzahl",
                "placeholder": "Bereit zum Tracking?",
                "startButton": "ZeitBeobachter starten",
                "wasteTime": "Verschwendete Zeit"
            },
            "results": {
                "title": "Trainingsergebnisse",
                "summary": "Trainingszusammenfassung",
                "totalDrills": "Gesamte Drills",
                "totalTime": "Gesamtzeit",
                "wasteTime": "Verschwendete Zeit",
                "detailedResults": "Detaillierte Ergebnisse",
                "placeholder": "Detaillierte Analyse kommt bald...",
                "backToHome": "Zurück zum Start"
            }
        },
        menu: {
            "signin": "Login",
            "signout": "Logout",
            "tracking": "Tracking",
            "feedback": "Feedback",
            "faq": "Häufige Fragen",
            "glossary": "Glossar",
            "video": "Erklärvideo",
            "language": "Sprache wählen"
        }
    }
};

i18n
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
        resources,
        lng: "en", // language to use, more information here: https://www.i18next.com/overview/configuration-options#languages-namespaces-resources
        // you can use the i18n.changeLanguage function to change the language manually: https://www.i18next.com/overview/api#changelanguage
        // if you're using a language detector, do not define the lng option

        interpolation: {
            escapeValue: false // react already safes from xss
        }
    });

export default i18n;