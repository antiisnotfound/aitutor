import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { initLocale } from "@/i18n/locale";
import { getStore } from "@/lib/data/store";
import { getCurrentUser } from "@/lib/user";
import { ReviewDeck } from "./review-deck";

export async function generateMetadata({ params }: PageProps<"/[locale]/practice/review">): Promise<Metadata> {
  const locale = await initLocale(params);
  const t = await getTranslations({ locale, namespace: "review" });
  return { title: t("metaTitle") };
}

export default async function ReviewPage({ params, searchParams }: PageProps<"/[locale]/practice/review">) {
  await initLocale(params);
  const learner = (await getCurrentUser())?.learner;
  if (!learner) return null;
  const { more } = await searchParams;
  const queue = await (await getStore()).reviewQueue(learner.id, 20, more === "1");

  return (
    <ReviewDeck
      target={learner.targetLanguage}
      cards={queue.map((v) => ({ id: v.id, term: v.term, translation: v.translation, note: v.note ?? null, kind: v.kind }))}
      upcoming={more === "1"}
    />
  );
}
