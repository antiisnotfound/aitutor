"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { THEME_COOKIE } from "@/lib/theme";

/** Lets us preview the kids theme before Phase 6 ships proper kids accounts. */
export function KidsPreviewToggle({ label, initial }: { label: string; initial: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(initial);

  function toggle() {
    const next = !on;
    setOn(next);
    document.cookie = `${THEME_COOKIE}=${next ? "kids" : "adult"}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={toggle}
      className="flex min-h-tap w-full items-center justify-between gap-4 text-left font-semibold"
    >
      {label}
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-teal" : "bg-line"}`}>
        <span className={`absolute top-1 size-5 rounded-full bg-white transition-all ${on ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}
