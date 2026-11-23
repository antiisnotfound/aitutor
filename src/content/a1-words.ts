import type { TargetLanguage, UiLocale } from "@/config/app";

/**
 * Starter A1 vocabulary per target language. Used to fill check-in quizzes
 * for new learners and as distractors. Translations only for the MVP pairs.
 */
export type StarterWord = { term: string; tr: Partial<Record<UiLocale, string>> };

export const A1_WORDS: Record<TargetLanguage, StarterWord[]> = {
  it: [
    { term: "la mela", tr: { sq: "molla", en: "the apple" } },
    { term: "il pane", tr: { sq: "buka", en: "the bread" } },
    { term: "l'acqua", tr: { sq: "uji", en: "the water" } },
    { term: "il caffè", tr: { sq: "kafeja", en: "the coffee" } },
    { term: "la casa", tr: { sq: "shtëpia", en: "the house" } },
    { term: "la famiglia", tr: { sq: "familja", en: "the family" } },
    { term: "il fratello", tr: { sq: "vëllai", en: "the brother" } },
    { term: "la sorella", tr: { sq: "motra", en: "the sister" } },
    { term: "il cane", tr: { sq: "qeni", en: "the dog" } },
    { term: "il gatto", tr: { sq: "macja", en: "the cat" } },
    { term: "la scuola", tr: { sq: "shkolla", en: "the school" } },
    { term: "il treno", tr: { sq: "treni", en: "the train" } },
    { term: "il biglietto", tr: { sq: "bileta", en: "the ticket" } },
    { term: "la strada", tr: { sq: "rruga", en: "the street" } },
    { term: "il mercato", tr: { sq: "tregu", en: "the market" } },
    { term: "il libro", tr: { sq: "libri", en: "the book" } },
    { term: "oggi", tr: { sq: "sot", en: "today" } },
    { term: "domani", tr: { sq: "nesër", en: "tomorrow" } },
    { term: "buongiorno", tr: { sq: "mirëmëngjes", en: "good morning" } },
    { term: "grazie", tr: { sq: "faleminderit", en: "thank you" } },
    { term: "rosso", tr: { sq: "i kuq", en: "red" } },
    { term: "grande", tr: { sq: "i madh", en: "big" } },
    { term: "mangiare", tr: { sq: "të hash", en: "to eat" } },
    { term: "bere", tr: { sq: "të pish", en: "to drink" } },
    { term: "dieci", tr: { sq: "dhjetë", en: "ten" } },
  ],
  en: [
    { term: "an apple", tr: { sq: "një mollë", it: "una mela" } },
    { term: "bread", tr: { sq: "bukë", it: "il pane" } },
    { term: "water", tr: { sq: "ujë", it: "l'acqua" } },
    { term: "coffee", tr: { sq: "kafe", it: "il caffè" } },
    { term: "a house", tr: { sq: "një shtëpi", it: "una casa" } },
    { term: "family", tr: { sq: "familja", it: "la famiglia" } },
    { term: "brother", tr: { sq: "vëlla", it: "fratello" } },
    { term: "sister", tr: { sq: "motër", it: "sorella" } },
    { term: "a dog", tr: { sq: "një qen", it: "un cane" } },
    { term: "a cat", tr: { sq: "një mace", it: "un gatto" } },
    { term: "school", tr: { sq: "shkolla", it: "la scuola" } },
    { term: "a train", tr: { sq: "një tren", it: "un treno" } },
    { term: "a ticket", tr: { sq: "një biletë", it: "un biglietto" } },
    { term: "street", tr: { sq: "rruga", it: "la strada" } },
    { term: "market", tr: { sq: "tregu", it: "il mercato" } },
    { term: "a book", tr: { sq: "një libër", it: "un libro" } },
    { term: "today", tr: { sq: "sot", it: "oggi" } },
    { term: "tomorrow", tr: { sq: "nesër", it: "domani" } },
    { term: "good morning", tr: { sq: "mirëmëngjes", it: "buongiorno" } },
    { term: "thank you", tr: { sq: "faleminderit", it: "grazie" } },
    { term: "red", tr: { sq: "i kuq", it: "rosso" } },
    { term: "big", tr: { sq: "i madh", it: "grande" } },
    { term: "to eat", tr: { sq: "të hash", it: "mangiare" } },
    { term: "to drink", tr: { sq: "të pish", it: "bere" } },
    { term: "ten", tr: { sq: "dhjetë", it: "dieci" } },
  ],
};

/** Short sentences for "put the words in order" when the learner has no saved phrases yet. */
export const A1_SENTENCES: Record<TargetLanguage, { chunks: string[]; tr: Partial<Record<UiLocale, string>> }[]> = {
  it: [
    { chunks: ["sono", "andato", "al mercato"], tr: { sq: "Shkova në treg.", en: "I went to the market." } },
    { chunks: ["vorrei", "un caffè,", "per favore"], tr: { sq: "Do të doja një kafe, ju lutem.", en: "I'd like a coffee, please." } },
    { chunks: ["mi chiamo", "Anna", "e abito", "a Tirana"], tr: { sq: "Quhem Anna dhe jetoj në Tiranë.", en: "My name is Anna and I live in Tirana." } },
  ],
  en: [
    { chunks: ["I", "went", "to the market"], tr: { sq: "Shkova në treg.", it: "Sono andato al mercato." } },
    { chunks: ["can I have", "a coffee,", "please?"], tr: { sq: "Mund të kem një kafe, ju lutem?", it: "Posso avere un caffè, per favore?" } },
    { chunks: ["my name is", "Anna", "and I live", "in Tirana"], tr: { sq: "Quhem Anna dhe jetoj në Tiranë.", it: "Mi chiamo Anna e abito a Tirana." } },
  ],
};
