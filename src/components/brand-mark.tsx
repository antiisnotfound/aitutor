import { APP_NAME } from "@/config/app";

export function BrandMark({ size = "lg" }: { size?: "lg" | "sm" }) {
  return (
    <span
      className={`font-display tracking-wide text-fg ${size === "lg" ? "text-4xl" : "text-xl"}`}
    >
      {APP_NAME}
    </span>
  );
}
