/**
 * 3D tutor engine: TalkingHead (three.js) for the avatar, HeadAudio for
 * audio-driven lip-sync. Loaded lazily (dynamic import) so three.js never
 * lands in the main bundle. Browser only.
 */
import { TalkingHead } from "@met4citizen/talkinghead";
import { HeadAudio } from "@met4citizen/headaudio/modules/headaudio.mjs";
import type { AvatarConfig } from "@/config/avatars";

const WORKLET_URL = "/vendor/headaudio/headworklet.min.mjs";
const MODEL_URL = "/vendor/headaudio/model-en-mixed.bin";
/** Delay the audible voice slightly so lips and sound line up (HeadAudio needs ~50–100 ms). */
const LIPSYNC_DELAY_S = 0.08;
/** Below this frame rate the still portrait is used instead. 0 disables the check (testing). */
const MIN_FPS = Number(process.env.NEXT_PUBLIC_AVATAR_MIN_FPS ?? 12);

export type AvatarEngine = {
  /** Route the tutor's voice through lip-sync analysis (and play it, delayed). */
  attachStream(stream: MediaStream): Promise<() => void>;
  /** Fallback mouth movement from a 0–1 level when there is no audio stream (demo tutor). */
  setLevelDriver(fn: (() => number) | null): void;
  dispose(): void;
};

export async function createAvatarEngine(
  node: HTMLElement,
  url: string,
  cfg: AvatarConfig,
  opts: { reducedMotion: boolean; onSlow: (fps: number) => void; onProgress?: (p: number) => void },
): Promise<AvatarEngine> {
  let headaudio: HeadAudio | null = null;
  let levelDriver: (() => number) | null = null;
  let mouth = 0;

  // Frame-rate watchdog: weak devices fall back to the still portrait.
  // Starts only once the avatar is on screen (loading a GLB stalls frames),
  // skips a warm-up second and ignores hidden tabs (browsers throttle them).
  let frames = 0;
  let watchStart = 0;
  let watching = false;

  const head = new TalkingHead(node, {
    lipsyncModules: [], // text-driven lip-sync not used: we lip-sync from audio
    cameraView: "head",
    cameraDistance: cfg.camera?.distance ?? 1.2,
    cameraY: cfg.camera?.y ?? 0.2,
    cameraRotateEnable: false,
    cameraPanEnable: false,
    cameraZoomEnable: false,
    modelFPS: 30,
    modelPixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    modelMovementFactor: 0.2,
    // Calm: steady eye contact, minimal head movement.
    avatarIdleEyeContact: 0.5,
    avatarIdleHeadMove: opts.reducedMotion ? 0 : 0.15,
    avatarSpeakingEyeContact: 0.75,
    avatarSpeakingHeadMove: opts.reducedMotion ? 0.05 : 0.2,
    // Soft, warm key light; no coloured spot.
    lightAmbientIntensity: 2,
    lightDirectColor: 0xfff4e6,
    lightDirectIntensity: 18,
    lightSpotIntensity: 0,
    update: (dt: number) => {
      headaudio?.update(dt);
      if (levelDriver) {
        // Simple jaw movement for the demo tutor (no real audio to analyse).
        const target = levelDriver();
        mouth += (target - mouth) * 0.35;
        setMorph("viseme_aa", mouth * 0.7);
        setMorph("viseme_O", mouth * 0.25);
      }
      if (watching) {
        const now = performance.now();
        if (document.visibilityState !== "visible") {
          watchStart = 0; // restart the measurement when visible again
          return;
        }
        if (!watchStart) {
          watchStart = now;
          frames = 0;
        }
        frames++;
        if (now - watchStart > 5000) {
          watching = false;
          // Never dispose from inside TalkingHead's own animation frame.
          const fps = (frames * 1000) / (now - watchStart);
          if (fps < MIN_FPS) setTimeout(() => opts.onSlow(fps), 0);
        }
      }
    },
  });

  function setMorph(key: string, value: number) {
    const m = head.mtAvatar?.[key];
    if (m) Object.assign(m, { newvalue: value, needsUpdate: true });
  }

  try {
    await head.showAvatar(
      { url, body: cfg.body, avatarMood: "neutral", baseline: cfg.baseline ?? {}, ...(cfg.retarget ? { retarget: cfg.retarget } : {}) },
      (ev) => ev.lengthComputable && opts.onProgress?.(ev.loaded / ev.total),
    );
  } catch (err) {
    head.dispose();
    throw err;
  }
  setTimeout(() => {
    watching = true;
  }, 1000);

  return {
    async attachStream(stream) {
      const ctx = head.audioCtx;
      if (!headaudio) {
        await ctx.audioWorklet.addModule(WORKLET_URL);
        const node = new HeadAudio(ctx, {
          parameterData: { vadGateActiveDb: -40, vadGateInactiveDb: -60, silMode: 0 },
        });
        await node.loadModel(MODEL_URL);
        let lastEnded = 0;
        node.onvalue = (key, value) => setMorph(key, value);
        node.onended = () => {
          lastEnded = Date.now();
        };
        node.onstarted = () => {
          if (Date.now() - lastEnded > 150) head.lookAtCamera(500); // new sentence: eye contact
        };
        headaudio = node;
      }
      await ctx.resume();
      const source = ctx.createMediaStreamSource(stream);
      const delay = new DelayNode(ctx, { delayTime: LIPSYNC_DELAY_S });
      source.connect(headaudio);
      source.connect(delay).connect(ctx.destination);
      return () => {
        source.disconnect();
        delay.disconnect();
      };
    },

    setLevelDriver(fn) {
      levelDriver = fn;
      if (!fn) {
        setMorph("viseme_aa", 0);
        setMorph("viseme_O", 0);
      }
    },

    dispose() {
      watching = false;
      levelDriver = null;
      try {
        headaudio?.disconnect();
      } catch {
        /* already disconnected */
      }
      head.dispose();
      void head.audioCtx?.close().catch(() => {});
    },
  };
}

/** Cheap capability check before downloading anything. */
export function deviceCanRender3D(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return false;
  if ((nav.hardwareConcurrency ?? 4) <= 2) return false;
  if ((nav.deviceMemory ?? 4) < 2) return false;
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}
