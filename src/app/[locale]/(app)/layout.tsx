import { initLocale } from "@/i18n/locale";
import { cookies } from "next/headers";
import { BottomNav } from "@/components/bottom-nav";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/profile";
import { THEME_COOKIE } from "@/lib/theme";

/** Signed-in area: theme (adult / kids) + bottom navigation. */
export default async function AppLayout({ children, params }: LayoutProps<"/[locale]">) {
  const locale = await initLocale(params);

  // Reading cookies first keeps this whole signed-in area per-request (never prerendered).
  const override = (await cookies()).get(THEME_COOKIE)?.value;
  const profile = await getCurrentProfile();
  if (!profile) return redirect({ href: "/login", locale });

  const theme = override === "kids" || override === "adult" ? override : profile.ageGroup === "kid" ? "kids" : "adult";

  return (
    <div data-theme={theme} className="min-h-dvh bg-bg text-fg">
      <main id="main" className="mx-auto w-full max-w-md px-4 pb-28 pt-6 md:max-w-3xl">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
