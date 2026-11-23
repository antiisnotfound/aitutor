/**
 * Scripted tutor used when no OpenAI key is configured (development only).
 * It exercises every UI path: captions + translation, a correction with
 * chips, and an object pop-up.
 */
import type { TargetLanguage, UiLocale } from "@/config/app";

type Tr = Partial<Record<UiLocale, string>>;
export type MockStep = {
  tutor: (name: string) => string;
  translation: Tr;
  /** What the mock "hears" when the learner holds the mic on this step. */
  learnerSays: string;
  show?: { object: string; word: string; translation: Tr };
  correction?: { said: string; correct: string; rule: Tr; chunks: string[] };
};

export const MOCK_SCRIPT: Record<TargetLanguage, MockStep[]> = {
  it: [
    {
      tutor: (n) => `Ciao! Sono ${n}. Come stai oggi?`,
      translation: { sq: "Përshëndetje! Unë jam mësuesi yt. Si je sot?", en: "Hi! I'm your tutor. How are you today?" },
      learnerSays: "Sto bene, grazie!",
    },
    {
      tutor: () => "Benissimo! Che cosa hai fatto ieri?",
      translation: { sq: "Shumë mirë! Çfarë bëre dje?", en: "Great! What did you do yesterday?" },
      learnerSays: "Io ho andato al mercato.",
    },
    {
      tutor: () => "Quasi! Con andare usiamo essere: Sono andato al mercato. Prova a dirlo tu!",
      translation: { sq: "Pothuajse! Me andare përdorim essere: Sono andato al mercato. Provoje ti!", en: "Almost! With andare we use essere: Sono andato al mercato. Try saying it!" },
      learnerSays: "Sono andato al mercato.",
      correction: {
        said: "Io ho andato al mercato",
        correct: "Sono andato al mercato",
        rule: { sq: "Me «andare» përdoret «essere», jo «avere».", en: "“Andare” uses “essere”, not “avere”." },
        chunks: ["sono", "andato", "al mercato"],
      },
    },
    {
      tutor: () => "Perfetto! E al mercato hai comprato una mela?",
      translation: { sq: "Përsosur! Dhe në treg bleve një mollë?", en: "Perfect! And did you buy an apple at the market?" },
      learnerSays: "Sì, ho comprato una mela.",
      show: { object: "apple", word: "la mela", translation: { sq: "molla", en: "the apple" } },
    },
    {
      tutor: () => "Bravissimo! Per oggi è tutto. A presto!",
      translation: { sq: "Të lumtë! Për sot kaq. Shihemi së shpejti!", en: "Well done! That's all for today. See you soon!" },
      learnerSays: "Ciao, grazie!",
    },
  ],
  en: [
    {
      tutor: (n) => `Hi! I'm ${n}. How are you today?`,
      translation: { sq: "Përshëndetje! Unë jam mësuesi yt. Si je sot?", it: "Ciao! Sono il tuo tutor. Come stai oggi?" },
      learnerSays: "I'm good, thanks!",
    },
    {
      tutor: () => "Great! What did you do yesterday?",
      translation: { sq: "Shumë mirë! Çfarë bëre dje?", it: "Benissimo! Cosa hai fatto ieri?" },
      learnerSays: "I go to the market.",
    },
    {
      tutor: () => "Almost! For yesterday we say: I went to the market. Can you say it?",
      translation: { sq: "Pothuajse! Për dje themi: I went to the market. Mund ta thuash?", it: "Quasi! Per ieri diciamo: I went to the market. Riesci a dirlo?" },
      learnerSays: "I went to the market.",
      correction: {
        said: "I go to the market",
        correct: "I went to the market",
        rule: { sq: "Për të shkuarën: go → went.", it: "Al passato: go → went." },
        chunks: ["I", "went", "to the market"],
      },
    },
    {
      tutor: () => "Perfect! Did you buy an apple?",
      translation: { sq: "Përsosur! A bleve një mollë?", it: "Perfetto! Hai comprato una mela?" },
      learnerSays: "Yes, I bought an apple.",
      show: { object: "apple", word: "an apple", translation: { sq: "një mollë", it: "una mela" } },
    },
    {
      tutor: () => "Well done! That's all for today. See you soon!",
      translation: { sq: "Të lumtë! Për sot kaq. Shihemi së shpejti!", it: "Bravissimo! Per oggi è tutto. A presto!" },
      learnerSays: "Bye, thank you!",
    },
  ],
};
