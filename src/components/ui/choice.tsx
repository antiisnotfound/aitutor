import type { ReactNode } from "react";

/**
 * A real radio/checkbox styled as a chip or card. Native inputs keep
 * keyboard and screen-reader behaviour for free.
 */
export function Choice({
  type,
  name,
  value,
  checked,
  onChange,
  children,
  variant = "chip",
  lang,
}: {
  type: "radio" | "checkbox";
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
  variant?: "chip" | "segment" | "card";
  lang?: string;
}) {
  const shape = {
    chip: "rounded-full px-4",
    segment: "flex-1 justify-center rounded-xl px-2",
    card: "flex-col justify-center rounded-card p-4 text-center",
  }[variant];

  return (
    <label
      lang={lang}
      className={`flex min-h-tap cursor-pointer items-center gap-2 border text-sm font-semibold transition-colors has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-link ${shape} ${
        checked ? "border-accent bg-accent text-on-accent" : "border-line text-fg hover:border-link"
      }`}
    >
      <input type={type} name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      {children}
    </label>
  );
}
