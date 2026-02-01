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
                "backToHome": "Back to Home",
                "timeDistributionPerDrill": "Time Distribution per Drill",
                "timeDistributionPerAction": "Time Distribution per Action",
                "drillOverview": "Drill Overview",
                "drill": "Drill",
                "ganttOverview": "Training Timeline",
                "drillDetails": "Drill Details",
                "noTimeData": "No timing data recorded.",
                "timePerAction": "Time per Action",
                "timePerDrill": "Time per Drill",
                "actionTimeline": "Action Timeline",
                "unitMinutes": "min",
                "unitHours": "h",
                "exportPdf": "Export as PDF",
                "exporting": "Exporting...",
                "rawDataTable": "Raw Tracking Data",
                "action": "Action",
                "segments": "Segments",
                "count": "Count",
                "timerData": "Timer Data",
                "counterData": "Counter Data",
                "noData": "No data recorded"
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
            "language": "Select Language",
            "welcome": "Welcome"
        },
        feedback: {
            userLabel: "User",
            typeLabel: "Type of Feedback",
            typeGeneral: "General",
            typeFeature: "Feature Request / Bug",
            feedbackLabel: "Your Feedback",
            submitButton: "Submit",
            feedbackPlaceholder: "Enter your feedback here..."
        },
        glossary: {
            wasteTime: {
                title: "Waste Time",
                desc: "Time wasted during the practice while doing nothing based on the practice goal/intention.",
                includes: "It includes:",
                list: [
                    "free skating before practice starts",
                    "Time between drill ends and next explanation begins",
                    "Water break"
                ]
            },
            station: {
                title: "Station",
                desc: "Practice is planed within stations with certain goals/intention. This organizational structure increases quantiative implementation of repetitions done by players. Therefore the ice surface is devided into three or more small areas."
            },
            drill: {
                title: "Drill",
                desc: "Practice is planed into a maximum of two different exercises (for example forwards and defenseman exercises) or full ice exercises that includes tactical aspects, Team Play or Special Teams. That includes full ice exercises like Breakout, 1 vs 1, and so on."
            },
            technique: {
                title: "Individudal Technique",
                desc: "Exercises focusing solely on an technical aspect of the sport like skating, passing, shooting or puckhandling. Players are performing it in stations while moving or stationary.",
                list: ["Skating", "Passing", "Shot", "Puckhandling", "Checking"]
            },
            tactic: {
                title: "Individual Tactic",
                desc: "Tactics contain the individual tactical aspects of the game including offensive and defensively aspects.",
                list: [
                    "Offense: Scoring (forwards & defenseman) | 1 on 1 (Forward)",
                    "Defense: Angling, Battle – playing body | hitting, 1 on 1 (Defensman)"
                ]
            },
            smallAreaGame: {
                title: "SmallArea Game",
                desc: "Goal of Exercise is to practice principles or technical aspects of the game in an SmallArea Game. There is a lot of different organizational forms of setups and goals (offensive principles, defensive principles, technical, number of players, size of playing area)."
            },
            teamPlay: {
                title: "Team Play – Team Tactics",
                desc: "Team Play includes a certain number of players performing the exercise at the same time. Cooperation of two or more players (up to 5 on 5) including offensive and defensive principles of the game including the following aspects:",
                list: [
                    "Offense (Breakout | Regroup | OZ-Play | Transition | Scoring)",
                    "Defense (Forecheck | Backcheck | DZ-Play)"
                ]
            },
            specialTeams: {
                title: "Special Teams",
                desc: "It describes exercises with a man advantage. Term for players that play on the power play and shorthanded units."
            },
            explanation: {
                title: "Explanation",
                desc: "Time Coach is spending explaining drill to his players during the practice. Either by drawing the next exercise on the drawing board to all players, before starting the next exercise within a stationary practice plan, or by explaining vocally the next exercise."
            },
            demonstration: {
                title: "Demonstration",
                desc: "Coach demonstrate the exercise visually for all players. Mainly used in Station-Organized Practices for young athletes. However, demonstrations are also used in Drill-based practices and can be done by players for all other athletes based on coach´s instructions."
            },
            feedback: {
                title: "Feedback",
                desc: "Feedback is evaluative information to an activity or behavior. It is the process of careful, consistent course correction. The benefits are improved performance, a shorter learning curve, and personal growth, as well as to motivate and to instruct. In general, feedback should always be positive, objective and descriptive.",
                list: [
                    "Team: Team feedback at the end of an exercise, during 'side-change' or in between of the exercise for reinforcement reasons. It is for all players.",
                    "Player Received: Feedback given to the player being tracked during the practice."
                ]
            },
            changeSide: {
                title: "Change Side #1 / #2",
                desc: "Measuring the duration of an drill it it is organized with side change. Therefore time deviation can be measured."
            },
            timeMoving: {
                title: "Time Moving",
                desc: "It measures the time the tracked athletes is moving during an exercise."
            },
            repetition: {
                title: "Repetition",
                desc: "The number of repetions counted which the tracked athlete is performing during an exercise."
            }
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
                "backToHome": "Zurück zum Start",
                "timeDistributionPerDrill": "Zeitverteilung pro Drill",
                "timeDistributionPerAction": "Zeitverteilung pro Aktion",
                "drillOverview": "Drill-Übersicht",
                "drill": "Drill",
                "ganttOverview": "Trainingszeitleiste",
                "drillDetails": "Drill-Details",
                "noTimeData": "Keine Zeitdaten aufgezeichnet.",
                "timePerAction": "Zeit pro Aktion",
                "timePerDrill": "Zeit pro Drill",
                "actionTimeline": "Aktions-Timeline",
                "unitMinutes": "Min",
                "unitHours": "Std",
                "exportPdf": "Als PDF exportieren",
                "exporting": "Exportiere...",
                "rawDataTable": "Rohdaten",
                "action": "Aktion",
                "segments": "Segmente",
                "count": "Anzahl",
                "timerData": "Timer-Daten",
                "counterData": "Zähler-Daten",
                "noData": "Keine Daten aufgezeichnet"
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
            "language": "Sprache wählen",
            "welcome": "Willkommen"
        },
        feedback: {
            userLabel: "Benutzer",
            typeLabel: "Art des Feedbacks",
            typeGeneral: "Allgemein",
            typeFeature: "Feature Request / Fehler",
            feedbackLabel: "Ihr Feedback",
            submitButton: "Absenden",
            feedbackPlaceholder: "Geben Sie hier Ihr Feedback ein..."
        },
        glossary: {
            wasteTime: {
                title: "Verschwendete Zeit",
                desc: "Zeit, die während des Trainings ungenutzt bleibt und nicht dem Trainingsziel dient.",
                includes: "Dazu zählt:",
                list: [
                    "Freies Laufen vor Trainingsbeginn",
                    "Zeit zwischen Drill-Ende und nächster Erklärung",
                    "Wasserpause"
                ]
            },
            station: {
                title: "Station",
                desc: "Das Training ist in Stationen mit bestimmten Zielen/Intentionen organisiert. Diese Struktur erhöht die Anzahl der Wiederholungen pro Spieler. Die Eisfläche wird dazu in drei oder mehr kleine Bereiche unterteilt."
            },
            drill: {
                title: "Drill",
                desc: "Das Training ist in maximal zwei verschiedene Übungen (z.B. für Stürmer und Verteidiger) oder in ganzflächige Übungen mit taktischen Aspekten, Team Play oder Special Teams unterteilt. Dazu zählen z.B. Breakout, 1-gegen-1 usw."
            },
            technique: {
                title: "Individuelle Technik",
                desc: "Übungen, die sich ausschließlich auf einen technischen Aspekt des Sports konzentrieren, wie Skating, Passen, Schießen oder Puckhandling. Die Spieler führen sie in Stationen, in Bewegung oder stationär aus.",
                list: ["Skating", "Passen", "Schuss", "Puckhandling", "Checking"]
            },
            tactic: {
                title: "Individuelle Taktik",
                desc: "Taktiken umfassen die individuellen taktischen Aspekte des Spiels, sowohl offensiv als auch defensiv.",
                list: [
                    "Offense: Torabschluss (Stürmer & Verteidiger) | 1-gegen-1 (Stürmer)",
                    "Defense: Abdrängen, Zweikampf – Körpereinsatz | Checken, 1-gegen-1 (Verteidiger)"
                ]
            },
            smallAreaGame: {
                title: "Kleinfeldspiel",
                desc: "Ziel der Übung ist es, Prinzipien oder technische Aspekte des Spiels in an SmallArea Game zu trainieren. Es gibt viele verschiedene Organisationsformen und Ziele (offensive Prinzipien, defensive Prinzipien, Technik, Spieleranzahl, Spielfeldgröße)."
            },
            teamPlay: {
                title: "Team Play – Team Taktik",
                desc: "Team Play umfasst Übungen, bei denen mehrere Spieler gleichzeitig agieren. Kooperation von zwei oder mehr Spielern (bis zu 5-gegen-5) mit offensiven und defensiven Prinzipien, z.B.:",
                list: [
                    "Offense (Breakout | Regroup | OZ-Play | Transition | Torabschluss)",
                    "Defense (Forecheck | Backcheck | DZ-Play)"
                ]
            },
            specialTeams: {
                title: "Special Teams",
                desc: "Bezeichnet Übungen mit Überzahl. Begriff für Spieler, die im Powerplay oder in Unterzahl agieren."
            },
            explanation: {
                title: "Erklärung",
                desc: "Zeit, die der Trainer für die Erklärung der nächsten Übung aufwendet – entweder an der Tafel für alle oder mündlich vor Beginn der nächsten Übung."
            },
            demonstration: {
                title: "Demonstration",
                desc: "Der Trainer demonstriert die Übung visuell für alle Spieler. Häufig in Stationstrainings für junge Athleten, aber auch in Drill-basierten Trainings. Auch Spieler können auf Anweisung des Trainers demonstrieren."
            },
            feedback: {
                title: "Feedback",
                desc: "Feedback ist bewertende Information zu einer Aktivität oder einem Verhalten. Es dient der gezielten, kontinuierlichen Korrektur. Vorteile sind bessere Leistung, kürzere Lernkurve, persönliches Wachstum sowie Motivation und Anleitung. Feedback sollte immer positiv, objektiv und beschreibend sein.",
                list: [
                    "Team: Team-Feedback am Ende einer Übung, beim Seitenwechsel oder zwischendurch zur Verstärkung. Für alle Spieler.",
                    "Spieler: Feedback an den beobachteten Spieler während des Trainings."
                ]
            },
            changeSide: {
                title: "Seitenwechsel #1 / #2",
                desc: "Messung der Dauer einer Übung, wenn sie mit Seitenwechsel organisiert ist. So kann die Zeitabweichung erfasst werden."
            },
            timeMoving: {
                title: "Bewegungszeit",
                desc: "Misst die Zeit, in der sich der beobachtete Athlet während einer Übung bewegt."
            },
            repetition: {
                title: "Wiederholung",
                desc: "Die Anzahl der Wiederholungen, die der beobachtete Athlet während einer Übung ausführt."
            }
        }
    },
    ru: {
        pet: {
            title: "Отслеживание эффективности тренировки",
            general: {
                infoHeader: "Общее",
                clubLabel: "Клуб",
                teamLabel: "Команда",
                dateLabel: "Дата",
                coachLabel: "Имя тренера",
                evaluationLabel: "Оценка #"
            },
            practice: {
                infoHeader: "Тренировка",
                athletesNumberLabel: "Количество спортсменов",
                coachesNumberLabel: "Количество тренеров",
                totalTimeLabel: "Общее время тренировки (в часах)",
                trackedPlayerNameLabel: "Имя отслеживаемого игрока",
                drillsNumberLabel: "Количество упражнений/станций"
            },
            buttons: {
                nextButtenText: "Далее",
                previousButtonText: "Назад"
            },
            drills: {
                selectCategoriesLabel: "Выберите категории",
                station: "Станция",
                drill: "Упражнение",
                technique: "Техника",
                tactic: "Тактика",
                smallareagame: "Мини-игра",
                skating: "Катание",
                passing: "Передачи",
                shot: "Бросок",
                puckhandling: "Владение шайбой",
                battlechecking: "Борьба | Силовой приём"
            },
            actions: {
                label: "Упорядочить и включить действия",
                explanation: "Объяснение",
                demonstration: "Демонстрация",
                feedbackteam: "Обратная связь (команда)",
                changesideone: "Смена стороны #1",
                changesidetwo: "Смена стороны #2",
                timemoving: "Время движения",
                repetition: "Повторение (стационарное упражнение)",
                feedbackplayers: "Обратная связь (игрок)",
                shots: "Броски",
                passes: "Пасы",
                typeLabel: "Тип",
                timer: "Таймер",
                counter: "Счётчик"
            },
            timeWatcher: {
                title: "Тайм-Вочер",
                timers: "Таймеры",
                counters: "Счётчики",
                active: "Активен",
                inactive: "Неактивен",
                count: "Счёт",
                placeholder: "Готовы начать отслеживание?",
                startButton: "Запустить Тайм-Вочер",
                wasteTime: "Время простоя"
            },
            results: {
                title: "Отчёт о тренировке",
                summary: "Сводка тренировки",
                totalDrills: "Всего упражнений",
                totalTime: "Общее время",
                wasteTime: "Потерянное время",
                detailedResults: "Детальные результаты",
                placeholder: "Детальный анализ скоро появится...",
                backToHome: "На главную",
                timeDistributionPerDrill: "Распределение времени по упражнениям",
                timeDistributionPerAction: "Распределение времени по действиям",
                drillOverview: "Обзор упражнений",
                drill: "Упражнение",
                ganttOverview: "Временная шкала тренировки",
                drillDetails: "Детали упражнений",
                noTimeData: "Нет записанных данных о времени.",
                timePerAction: "Время по действиям",
                timePerDrill: "Время по упражнениям",
                actionTimeline: "Таймлайн действий",
                unitMinutes: "мин",
                unitHours: "ч",
                exportPdf: "Экспорт в PDF",
                exporting: "Экспорт...",
                rawDataTable: "Исходные данные",
                action: "Действие",
                segments: "Сегменты",
                count: "Количество",
                timerData: "Данные таймера",
                counterData: "Данные счётчика",
                noData: "Данные не записаны"
            }
        },
        menu: {
            signin: "Войти",
            signout: "Выйти",
            tracking: "Трекинг",
            feedback: "Обратная связь",
            faq: "Частые вопросы",
            glossary: "Глоссарий",
            video: "Видео объяснение",
            language: "Выбрать язык",
            welcome: "Добро пожаловать"
        },
        feedback: {
            userLabel: "Пользователь",
            typeLabel: "Тип отзыва",
            typeGeneral: "Общий",
            typeFeature: "Запрос функции / Баг",
            feedbackLabel: "Ваш отзыв",
            submitButton: "Отправить",
            feedbackPlaceholder: "Введите ваш отзыв здесь..."
        },
        glossary: {
            wasteTime: {
                title: "Время простоя",
                desc: "Время, потраченное впустую во время тренировки, когда ничего не происходит с точки зрения цели/замысла занятия.",
                includes: "Включает:",
                list: [
                    "свободное катание до начала тренировки",
                    "время между окончанием упражнения и началом следующего объяснения",
                    "водная пауза"
                ]
            },
            station: {
                title: "Станция",
                desc: "Тренировка организована по станциям с определёнными целями/задачами. Такая структура увеличивает количество повторений для игроков. Лёд делится на три или более малых зон."
            },
            drill: {
                title: "Упражнение",
                desc: "Тренировка состоит максимум из двух разных упражнений (например, для нападающих и защитников) или из упражнений на всё поле, включающих тактику, командные взаимодействия или спецбригады. Сюда относятся упражнения на всё поле, такие как выход из зоны, 1 на 1 и т.д."
            },
            technique: {
                title: "Индивидуальная техника",
                desc: "Упражнения, направленные исключительно на технические элементы хоккея: катание, передачи, броски, владение шайбой. Игроки выполняют их на станциях, в движении или на месте.",
                list: ["Катание", "Передачи", "Бросок", "Владение шайбой", "Силовая борьба"]
            },
            tactic: {
                title: "Индивидуальная тактика",
                desc: "Тактика включает индивидуальные тактические аспекты игры, как в атаке, так и в обороне.",
                list: [
                    "Атака: завершение (нападающие и защитники) | 1 на 1 (нападающий)",
                    "Оборона: оттеснение, борьба — игра корпусом | силовой приём, 1 на 1 (защитник)"
                ]
            },
            smallAreaGame: {
                title: "Мини-игра",
                desc: "Цель упражнения — отработать игровые принципы или технические элементы в формате мини-игры. Существует множество вариантов организации и целей (атакующие/оборонительные принципы, техника, количество игроков, размер площадки)."
            },
            teamPlay: {
                title: "Командная тактика",
                desc: "Командная игра включает упражнения, в которых одновременно участвуют несколько игроков (до 5 на 5). Это взаимодействие двух и более игроков с отработкой атакующих и оборонительных принципов, например:",
                list: [
                    "Атака (выход из зоны | перехват | игра в зоне атаки | переход | завершение)",
                    "Оборона (форчек | бэкчек | игра в своей зоне)"
                ]
            },
            specialTeams: {
                title: "Специальные команды",
                desc: "Упражнения с численным преимуществом. Термин для игроков, выступающих в большинстве и меньшинстве."
            },
            explanation: {
                title: "Объяснение",
                desc: "Время, которое тренер тратит на объяснение упражнения игрокам во время тренировки: рисует на доске или объясняет устно перед началом следующего упражнения."
            },
            demonstration: {
                title: "Демонстрация",
                desc: "Тренер наглядно показывает упражнение всем игрокам. Чаще используется на станциях для юных хоккеистов, но также применяется и в других форматах. Демонстрацию могут выполнять и сами игроки по указанию тренера."
            },
            feedback: {
                title: "Обратная связь",
                desc: "Обратная связь — это оценочная информация о действии или поведении. Она служит для корректировки, улучшения результата, ускорения обучения, личностного роста, а также для мотивации и инструктажа. В идеале обратная связь должна быть позитивной, объективной и описательной.",
                list: [
                    "Команда: обратная связь для всех игроков в конце упражнения, при смене сторон или в процессе для закрепления.",
                    "Игрок: обратная связь для отслеживаемого игрока во время тренировки."
                ]
            },
            changeSide: {
                title: "Смена стороны #1 / #2",
                desc: "Измерение продолжительности упражнения, если оно проводится с изменением сторон. Позволяет фиксировать разницу во времени."
            },
            timeMoving: {
                title: "Время движения",
                desc: "Измеряет время, в течение которого отслеживаемый игрок находится в движении во время упражнения."
            },
            repetition: {
                title: "Повторение",
                desc: "Количество повторений, выполненных отслеживаемым игроком во время упражнения."
            }
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