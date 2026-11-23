import { cookies } from "next/headers";
import { initLocale } from "@/i18n/locale";
import { redirect } from "@/i18n/navigation";
import { THEME_COOKIE, themeFor } from "@/lib/theme";
import { getCurrentUser } from "@/lib/user";

/** Signed-in, full-screen area without the bottom nav (live call, summary). */
export default async function FocusLayout({ children, params }: LayoutProps<"/[locale]">) {
  const locale = await initLocale(params);
  const override = (await cookies()).get(THEME_COOKIE)?.value;
  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/login", locale });
  if (!user.learner) return redirect({ href: "/onboarding", locale });

  return (
    <div data-theme={themeFor(user.ageGroup, override)} className="min-h-dvh bg-bg text-fg">
      {children}
    </div>
  );
}
