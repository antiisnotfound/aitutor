/**
 * Placeholder illustration library: object key (English) → emoji.
 * To be replaced by a proper illustration set (a few hundred A1–A2 objects).
 */
export const OBJECT_PICTURES: Record<string, string> = {
  apple: "🍎", banana: "🍌", orange: "🍊", lemon: "🍋", grapes: "🍇", strawberry: "🍓", pear: "🍐",
  tomato: "🍅", potato: "🥔", carrot: "🥕", bread: "🍞", cheese: "🧀", egg: "🥚", milk: "🥛",
  coffee: "☕", tea: "🍵", water: "💧", wine: "🍷", beer: "🍺", juice: "🧃", cake: "🍰",
  pizza: "🍕", pasta: "🍝", sandwich: "🥪", salad: "🥗", soup: "🍲", fish: "🐟", meat: "🥩",
  chicken: "🍗", rice: "🍚", ice_cream: "🍨", chocolate: "🍫", salt: "🧂",
  dog: "🐕", cat: "🐈", bird: "🐦", horse: "🐎", cow: "🐄", sheep: "🐑", rabbit: "🐇",
  house: "🏠", school: "🏫", hospital: "🏥", hotel: "🏨", church: "⛪", shop: "🏪", market: "🛒",
  restaurant: "🍽️", cafe: "☕", bank: "🏦", station: "🚉", airport: "✈️", beach: "🏖️", sea: "🌊",
  mountain: "⛰️", park: "🌳", city: "🏙️", street: "🛣️", bridge: "🌉", museum: "🏛️",
  car: "🚗", bus: "🚌", train: "🚆", bicycle: "🚲", plane: "✈️", boat: "⛵", taxi: "🚕",
  book: "📖", pen: "🖊️", phone: "📱", computer: "💻", bag: "👜", key: "🔑", money: "💶",
  ticket: "🎫", map: "🗺️", clock: "🕒", watch: "⌚", glasses: "👓", umbrella: "☂️",
  shirt: "👕", shoes: "👟", dress: "👗", hat: "🧢", coat: "🧥",
  table: "🪑", chair: "🪑", bed: "🛏️", door: "🚪", window: "🪟", cup: "☕", plate: "🍽️",
  sun: "☀️", rain: "🌧️", snow: "❄️", tree: "🌳", flower: "🌸", ball: "⚽", gift: "🎁",
  family: "👨‍👩‍👧", baby: "👶", doctor: "🧑‍⚕️", teacher: "🧑‍🏫",
};

export function pictureFor(object: string): string | null {
  return OBJECT_PICTURES[object.toLowerCase().trim().replace(/\s+/g, "_")] ?? null;
}
