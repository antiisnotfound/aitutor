import { cookies } from "next/headers";
import { BottomNav } from "@/components/bottom-nav";
import { initLocale } from "@/i18n/locale";
import { redirect } from "@/i18n/navigation";
import { THEME_COOKIE, themeFor } from "@/lib/theme";
import { getCurrentUser } from "@/lib/user";

/** Signed-in area: theme (adult / kids) + bottom navigation. */
export default async function AppLayout({ children, params }: LayoutProps<"/[locale]">) {
  const locale = await initLocale(params);

  // Reading cookies first keeps this whole signed-in area per-request (never prerendered).
  const override = (await cookies()).get(THEME_COOKIE)?.value;
  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/login", locale });
  if (!user.learner) return redirect({ href: "/onboarding", locale });

  return (
    <div data-theme={themeFor(user.ageGroup, override)} className="min-h-dvh bg-bg text-fg">
      <main id="main" className="mx-auto w-full max-w-md px-4 pb-28 pt-6 md:max-w-3xl">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
