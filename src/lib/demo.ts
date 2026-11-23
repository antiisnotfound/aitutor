import "server-only";
import { cookies } from "next/headers";
import { DEMO_COOKIE, isDemoMode } from "@/lib/demo-config";
import type { DemoState } from "@/lib/types";

/**
 * Demo mode: local development without Supabase keys.
 * The whole "account" lives in one cookie so every screen can be tried.
 * Off in production unless the deployment sets DEMO_MODE=1.
 */
export { isDemoMode };

export async function readDemo(): Promise<DemoState | null> {
  if (!isDemoMode()) return null;
  const raw = (await cookies()).get(DEMO_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DemoState;
  } catch {
    return null;
  }
}

export async function writeDemo(state: DemoState) {
  (await cookies()).set(DEMO_COOKIE, JSON.stringify(state), {
    path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearDemo() {
  (await cookies()).delete(DEMO_COOKIE);
}
