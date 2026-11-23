import type { TargetLanguage, UiLocale } from "@/config/app";

/**
 * A1 → A2 level-up exam. Four parts in the *style* of big exams (Cambridge
 * A1/A2, DELF A1, CELI) — all texts and questions are original to this app.
 *
 * Objective parts are auto-scored. Writing and speaking are scored by the AI
 * against the rubrics below so grading stays consistent between attempts.
 */
type Choice = { q: string; options: string[]; answer: number };
type Passage = { id: string; text: string; questions: Choice[] };
type Productive = {
  id: string;
  prompt: Partial<Record<UiLocale, string>>;
  /** What a complete answer covers (English, for the grader). */
  contentPoints: string[];
};

export type ExamPaper = {
  reading: Passage[];
  listening: Passage[];
  writing: Productive & { minWords: number; maxWords: number };
  speaking: (Productive & { seconds: number })[];
};

export const A1_EXAM: Record<TargetLanguage, ExamPaper> = {
  it: {
    reading: [
      {
        id: "r1",
        text: "Ciao Sara! Domani sera faccio una festa a casa mia per il mio compleanno. Comincia alle otto. Porta un'amica, se vuoi! Io preparo la pizza: tu puoi portare qualcosa da bere? Abito in via Roma 12, al terzo piano. A domani! Marta",
        questions: [
          { q: "Perché Marta fa una festa?", options: ["È il suo compleanno.", "Ha una casa nuova.", "Finisce la scuola."], answer: 0 },
          { q: "A che ora comincia la festa?", options: ["Alle sette.", "Alle otto.", "Alle nove."], answer: 1 },
          { q: "Che cosa deve portare Sara?", options: ["La pizza.", "Qualcosa da bere.", "Un regalo."], answer: 1 },
          { q: "Dove abita Marta?", options: ["In via Roma 12, al terzo piano.", "In piazza Roma 12.", "In via Roma 12, al primo piano."], answer: 0 },
        ],
      },
      {
        id: "r2",
        text: "MUSEO CIVICO — Orari: dal martedì alla domenica, dalle 9:00 alle 18:00. Il lunedì il museo è chiuso. Biglietto: 8 euro. Studenti: 5 euro. La prima domenica del mese l'ingresso è gratuito.",
        questions: [
          { q: "Il lunedì il museo…", options: ["è aperto fino alle 18:00.", "è chiuso.", "apre alle 9:00."], answer: 1 },
          { q: "Quanto paga uno studente?", options: ["8 euro.", "5 euro.", "Niente."], answer: 1 },
          { q: "Quando l'ingresso è gratuito?", options: ["Ogni domenica.", "La prima domenica del mese.", "Il martedì."], answer: 1 },
        ],
      },
    ],
    listening: [
      {
        id: "l1",
        text: "Attenzione, prego. Il treno regionale per Firenze delle dieci e quindici partirà dal binario quattro. Il treno è in ritardo di dieci minuti. Grazie.",
        questions: [
          { q: "Dove va il treno?", options: ["A Firenze.", "A Roma.", "A Pisa."], answer: 0 },
          { q: "Da quale binario parte?", options: ["Dal binario due.", "Dal binario quattro.", "Dal binario quattordici."], answer: 1 },
          { q: "Il treno…", options: ["è in orario.", "è in ritardo di dieci minuti.", "è cancellato."], answer: 1 },
        ],
      },
      {
        id: "l2",
        text: "Buongiorno, vorrei un caffè e un cornetto, per favore. — Certo. Il cornetto alla crema o al cioccolato? — Al cioccolato, grazie. Quanto costa? — Tre euro e cinquanta.",
        questions: [
          { q: "Che cosa ordina il cliente?", options: ["Un tè e un cornetto.", "Un caffè e un cornetto.", "Un caffè e un panino."], answer: 1 },
          { q: "Che cornetto sceglie?", options: ["Alla crema.", "Al cioccolato.", "Vuoto."], answer: 1 },
          { q: "Quanto paga?", options: ["3,50 €", "5,30 €", "3,00 €"], answer: 0 },
        ],
      },
    ],
    writing: {
      id: "w1",
      minWords: 20,
      maxWords: 40,
      prompt: {
        sq: "Shkruaj një mesazh në italisht për mikun tënd Luca (20–40 fjalë). Ftoje në një kafene, thuaj cilën ditë dhe në çfarë ore, dhe bëji një pyetje.",
        en: "Write a message in Italian to your friend Luca (20–40 words). Invite him to a café, say which day and what time, and ask him a question.",
      },
      contentPoints: ["invites Luca to a café", "says which day", "says what time", "asks a question"],
    },
    speaking: [
      {
        id: "s1",
        seconds: 45,
        prompt: {
          sq: "Prezanto veten në italisht: emri, nga je, ku jeton dhe familja jote.",
          en: "Introduce yourself in Italian: your name, where you are from, where you live and your family.",
        },
        contentPoints: ["says their name", "says where they are from", "says where they live", "mentions family"],
      },
      {
        id: "s2",
        seconds: 40,
        prompt: {
          sq: "Je në një kafene në Romë. Porosit diçka për të pirë dhe për të ngrënë, dhe pyet sa kushton.",
          en: "You are in a café in Rome. Order something to drink and to eat, and ask how much it costs.",
        },
        contentPoints: ["greets / polite request", "orders a drink", "orders something to eat", "asks the price"],
      },
    ],
  },

  en: {
    reading: [
      {
        id: "r1",
        text: "Hi Tom! I'm having a party at my flat on Saturday for my birthday. It starts at eight o'clock. Bring a friend if you want! I'm making pizza — can you bring something to drink? My address is 12 Park Road, third floor. See you! Anna",
        questions: [
          { q: "Why is Anna having a party?", options: ["It's her birthday.", "She has a new flat.", "School is finished."], answer: 0 },
          { q: "What time does the party start?", options: ["At seven.", "At eight.", "At nine."], answer: 1 },
          { q: "What should Tom bring?", options: ["Pizza.", "Something to drink.", "A present."], answer: 1 },
          { q: "Where does Anna live?", options: ["12 Park Road, third floor.", "12 Park Street.", "12 Park Road, first floor."], answer: 0 },
        ],
      },
      {
        id: "r2",
        text: "CITY MUSEUM — Open Tuesday to Sunday, 9 am to 6 pm. Closed on Mondays. Tickets: £8. Students: £5. Free entry on the first Sunday of every month.",
        questions: [
          { q: "On Mondays the museum…", options: ["is open until 6 pm.", "is closed.", "opens at 9 am."], answer: 1 },
          { q: "How much does a student pay?", options: ["£8", "£5", "Nothing."], answer: 1 },
          { q: "When is entry free?", options: ["Every Sunday.", "On the first Sunday of the month.", "On Tuesdays."], answer: 1 },
        ],
      },
    ],
    listening: [
      {
        id: "l1",
        text: "Attention, please. The ten fifteen train to Oxford will leave from platform four. This train is running ten minutes late. Thank you.",
        questions: [
          { q: "Where is the train going?", options: ["To Oxford.", "To London.", "To Bristol."], answer: 0 },
          { q: "Which platform does it leave from?", options: ["Platform two.", "Platform four.", "Platform fourteen."], answer: 1 },
          { q: "The train is…", options: ["on time.", "ten minutes late.", "cancelled."], answer: 1 },
        ],
      },
      {
        id: "l2",
        text: "Good morning. Can I have a coffee and a croissant, please? — Of course. Plain or chocolate? — Chocolate, please. How much is that? — That's three pounds fifty.",
        questions: [
          { q: "What does the customer order?", options: ["A tea and a croissant.", "A coffee and a croissant.", "A coffee and a sandwich."], answer: 1 },
          { q: "Which croissant does the customer choose?", options: ["Plain.", "Chocolate.", "Cheese."], answer: 1 },
          { q: "How much does the customer pay?", options: ["£3.50", "£5.30", "£3.00"], answer: 0 },
        ],
      },
    ],
    writing: {
      id: "w1",
      minWords: 20,
      maxWords: 40,
      prompt: {
        sq: "Shkruaj një mesazh në anglisht për mikun tënd Sam (20–40 fjalë). Ftoje në një kafene, thuaj cilën ditë dhe në çfarë ore, dhe bëji një pyetje.",
        it: "Scrivi un messaggio in inglese al tuo amico Sam (20–40 parole). Invitalo in un bar, di' che giorno e a che ora, e fagli una domanda.",
      },
      contentPoints: ["invites Sam to a café", "says which day", "says what time", "asks a question"],
    },
    speaking: [
      {
        id: "s1",
        seconds: 45,
        prompt: {
          sq: "Prezanto veten në anglisht: emri, nga je, ku jeton dhe familja jote.",
          it: "Presentati in inglese: il tuo nome, da dove vieni, dove abiti e la tua famiglia.",
        },
        contentPoints: ["says their name", "says where they are from", "says where they live", "mentions family"],
      },
      {
        id: "s2",
        seconds: 40,
        prompt: {
          sq: "Je në një kafene në Londër. Porosit diçka për të pirë dhe për të ngrënë, dhe pyet sa kushton.",
          it: "Sei in un bar a Londra. Ordina qualcosa da bere e da mangiare, e chiedi quanto costa.",
        },
        contentPoints: ["greets / polite request", "orders a drink", "orders something to eat", "asks the price"],
      },
    ],
  },
};

/**
 * Scoring rubrics (0–4 per criterion) shared by every language. Band
 * descriptors are written for A1 so the AI grades consistently.
 */
export type Criterion = { id: string; name: string; bands: [string, string, string, string, string] };

export const RUBRICS: Record<"writing" | "speaking", Criterion[]> = {
  writing: [
    {
      id: "task",
      name: "Task achievement",
      bands: [
        "No relevant content or not in the target language.",
        "One content point covered.",
        "Two content points covered.",
        "Three content points covered, or all four with one unclear.",
        "All content points clearly covered.",
      ],
    },
    {
      id: "vocabulary",
      name: "Vocabulary",
      bands: [
        "Isolated words, mostly wrong or from another language.",
        "Very few basic words; meaning often unclear.",
        "Basic words for the topic; some wrong choices make reading harder.",
        "Adequate basic vocabulary for the task with occasional errors.",
        "Good range of A1 words and fixed phrases for the task, used correctly.",
      ],
    },
    {
      id: "grammar",
      name: "Grammar",
      bands: [
        "No recognisable sentences.",
        "Fragments; errors prevent understanding most of the time.",
        "Some simple sentences; frequent errors but meaning mostly clear.",
        "Simple sentences mostly correct (e.g. present tense, questions); errors don't block meaning.",
        "Good control of simple A1 structures with very few errors.",
      ],
    },
    {
      id: "organisation",
      name: "Organisation",
      bands: [
        "No message structure.",
        "Disconnected words or phrases.",
        "Recognisable message but no greeting/closing or linking.",
        "Greeting or closing, simple linking with 'and/but'.",
        "Clear message with greeting, closing and simple linking.",
      ],
    },
  ],
  speaking: [
    {
      id: "task",
      name: "Task achievement",
      bands: [
        "Nothing relevant said in the target language.",
        "One content point covered.",
        "Two content points covered.",
        "Three content points covered.",
        "All content points covered.",
      ],
    },
    {
      id: "vocabulary",
      name: "Vocabulary",
      bands: [
        "No usable target-language words.",
        "A few isolated words.",
        "Basic words for the topic with gaps or native-language words.",
        "Enough basic vocabulary for the task.",
        "Good range of A1 words and polite fixed phrases.",
      ],
    },
    {
      id: "grammar",
      name: "Grammar",
      bands: [
        "No recognisable utterances.",
        "Single words; errors block meaning.",
        "Short phrases; frequent errors but meaning mostly clear.",
        "Simple sentences mostly correct.",
        "Good control of simple A1 structures.",
      ],
    },
    {
      id: "fluency",
      name: "Fluency & interaction",
      bands: [
        "Silent or unintelligible.",
        "Very long pauses; only one or two words.",
        "Several short phrases with many pauses or restarts.",
        "Speaks in short connected phrases with some pauses.",
        "Speaks in short connected sentences with few pauses for an A1 learner.",
      ],
    },
  ],
};
