import { defineRouting } from "next-intl/routing";
import { UI_LOCALES } from "@/config/app";

export const routing = defineRouting({
  locales: UI_LOCALES,
  defaultLocale: "en",
  localePrefix: "always",
});
