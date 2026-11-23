"use client";

import { useEffect, useRef, useState } from "react";
import { avatarUrl, type AvatarConfig } from "@/config/avatars";
import type { AvatarEngine } from "@/lib/avatar/engine";
import type { RealtimeTransport } from "@/lib/ai/client";

type State = "portrait" | "loading" | "ready";

/**
 * The tutor in the video area: a realistic 3D head with audio-driven
 * lip-sync, or the still portrait while loading, on weak devices, or when
 * no avatar file is configured.
 */
export function TutorAvatar({
  name,
  avatar,
  speaking,
  transport,
  loadingLabel,
}: {
  name: string;
  avatar: AvatarConfig;
  speaking: boolean;
  transport: RealtimeTransport | null;
  loadingLabel: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<AvatarEngine | null>(null);
  const [state, setState] = useState<State>("portrait");
  const url = avatarUrl(avatar);

  // Load the 3D avatar (lazily) once the call is live.
  useEffect(() => {
    if (!url || !host.current || !transport) return;
    let cancelled = false;
    let detach: (() => void) | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;

    (async () => {
      const mod = await import("@/lib/avatar/engine");
      if (cancelled || !mod.deviceCanRender3D()) return;
      setState("loading");
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const e = await mod.createAvatarEngine(host.current!, url, avatar, {
        reducedMotion,
        onSlow: (fps) => {
          console.info(`3D tutor too slow (${fps.toFixed(1)} fps), using portrait`);
          // Too slow to animate smoothly: drop back to the still portrait.
          detach?.();
          transport.setPlaybackMuted(false);
          engine.current?.dispose();
          engine.current = null;
          setState("portrait");
        },
      });
      if (cancelled) return e.dispose();
      engine.current = e;
      setState("ready");

      // Demo tutor: no audio to analyse, so move the mouth with the voice level.
      const driveByLevel = () => e.setLevelDriver(() => transport.levels().tutor);
      if (!transport.hasAudioStream) return driveByLevel();

      // Real voice: audio-driven lip-sync once the WebRTC track has arrived.
      const tryAttach = async () => {
        const stream = transport.remoteStream();
        if (!stream || detach || cancelled) return;
        if (poll) clearInterval(poll);
        try {
          detach = await e.attachStream(stream);
          transport.setPlaybackMuted(true); // the avatar now plays the (slightly delayed) voice
        } catch (err) {
          console.warn("audio lip-sync unavailable", err);
          driveByLevel();
        }
      };
      poll = setInterval(tryAttach, 300);
      void tryAttach();
    })().catch((err) => {
      console.warn("3D tutor unavailable, using portrait", err);
      if (!cancelled) setState("portrait");
    });

    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
      detach?.();
      transport.setPlaybackMuted(false);
      engine.current?.dispose();
      engine.current = null;
    };
  }, [url, avatar, transport]);

  return (
    <div className="absolute inset-0">
      {/* 3D canvas host (TalkingHead mounts its canvas here) */}
      <div
        ref={host}
        aria-hidden="true"
        className={`absolute inset-0 transition-opacity duration-700 ${state === "ready" ? "opacity-100" : "opacity-0"}`}
      />
      {state !== "ready" && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="-translate-y-10 md:-translate-y-6">
            <TutorPortrait name={name} size="xl" speaking={speaking} />
            {state === "loading" && <span className="sr-only">{loadingLabel}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

/** Still portrait: shown while the 3D tutor loads, and as the fallback. */
export function TutorPortrait({ name, size, speaking }: { name: string; size: "lg" | "xl"; speaking?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`relative grid place-items-center rounded-full border-4 bg-gradient-to-b from-teal-dark to-navy font-display text-lime shadow-2xl transition-colors ${
        size === "xl" ? "size-32 text-6xl sm:size-40 md:size-56 md:text-7xl" : "size-28 text-5xl"
      } ${speaking ? "border-lime" : "border-white/15"}`}
    >
      {name[0]}
    </div>
  );
}
