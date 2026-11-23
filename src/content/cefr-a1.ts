import type { Skill } from "@/config/learning";
import type { UiLocale } from "@/config/app";

/**
 * A1 "can-do" checklist shared by every target language.
 *
 * Each item is a learner-friendly paraphrase of a descriptor from the
 * Council of Europe CEFR Companion Volume (2020); `scale` names the CV scale
 * it comes from so it can be checked against the source. Per-language
 * overlays (script, formal "you", cases…) will be layered on later.
 */
export type CanDo = {
  id: string;
  level: "A1";
  skill: Skill;
  scale: string;
  label: Record<UiLocale, string>;
};

export const A1_CANDOS: CanDo[] = [
  {
    id: "A1.interaction.greetings",
    level: "A1", skill: "speaking", scale: "Conversation",
    label: { en: "Greet people and say goodbye", sq: "Përshëndet dhe përshëndetu kur ikën", it: "Salutare e congedarsi" },
  },
  {
    id: "A1.production.introduce-self",
    level: "A1", skill: "speaking", scale: "Sustained monologue: describing experience",
    label: { en: "Introduce yourself and say where you're from", sq: "Prezanto veten dhe thuaj nga je", it: "Presentarti e dire da dove vieni" },
  },
  {
    id: "A1.interaction.personal-questions",
    level: "A1", skill: "speaking", scale: "Information exchange",
    label: { en: "Ask and answer simple questions about yourself", sq: "Bëj dhe përgjigju pyetjeve të thjeshta për veten", it: "Fare e rispondere a domande semplici su di te" },
  },
  {
    id: "A1.production.family",
    level: "A1", skill: "speaking", scale: "Sustained monologue: describing experience",
    label: { en: "Talk about your family in simple words", sq: "Fol për familjen me fjalë të thjeshta", it: "Parlare della tua famiglia con parole semplici" },
  },
  {
    id: "A1.interaction.numbers-prices",
    level: "A1", skill: "speaking", scale: "Information exchange",
    label: { en: "Use numbers, prices and times", sq: "Përdor numrat, çmimet dhe orët", it: "Usare numeri, prezzi e orari" },
  },
  {
    id: "A1.interaction.ordering",
    level: "A1", skill: "speaking", scale: "Obtaining goods and services",
    label: { en: "Ask for things and order food and drink", sq: "Kërko gjëra dhe porosit ushqim e pije", it: "Chiedere cose e ordinare da mangiare e da bere" },
  },
  {
    id: "A1.interaction.days-time",
    level: "A1", skill: "speaking", scale: "Information exchange",
    label: { en: "Talk about days, dates and times", sq: "Fol për ditët, datat dhe orët", it: "Parlare di giorni, date e orari" },
  },
  {
    id: "A1.listening.slow-speech",
    level: "A1", skill: "listening", scale: "Overall oral comprehension",
    label: { en: "Understand slow, clear speech", sq: "Kupto të folurit e ngadaltë dhe të qartë", it: "Capire un parlato lento e chiaro" },
  },
  {
    id: "A1.listening.directions",
    level: "A1", skill: "listening", scale: "Understanding instructions",
    label: { en: "Follow short, simple directions", sq: "Ndiq udhëzime të shkurtra e të thjeshta", it: "Seguire indicazioni brevi e semplici" },
  },
  {
    id: "A1.reading.signs",
    level: "A1", skill: "reading", scale: "Reading for orientation",
    label: { en: "Understand familiar words and simple signs", sq: "Kupto fjalë të njohura dhe tabela të thjeshta", it: "Capire parole note e cartelli semplici" },
  },
  {
    id: "A1.writing.forms",
    level: "A1", skill: "writing", scale: "Completing forms",
    label: { en: "Fill in a form with your personal details", sq: "Plotëso një formular me të dhënat e tua", it: "Compilare un modulo con i tuoi dati" },
  },
  {
    id: "A1.writing.short-message",
    level: "A1", skill: "writing", scale: "Correspondence",
    label: { en: "Write a short, simple message", sq: "Shkruaj një mesazh të shkurtër e të thjeshtë", it: "Scrivere un messaggio breve e semplice" },
  },
];
