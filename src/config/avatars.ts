import type { TargetLanguage } from "./app";
import type { TutorGender } from "./learning";

/**
 * 3D tutor avatars (GLB with a Mixamo-compatible rig + ARKit and Oculus
 * viseme blend shapes, e.g. Avaturn Type-2 exports).
 *
 * Files are hosted outside git. Set NEXT_PUBLIC_AVATAR_BASE_URL to the folder
 * (e.g. "/avatars" for public/avatars, or a storage/CDN URL); each tutor is
 * loaded from `${base}/${file}`. Without it, the still portrait is used.
 */
export type AvatarConfig = {
  file: string;
  body: "F" | "M";
  /** Blend-shape baseline tweaks (Avaturn: slight head tilt, relaxed lids). */
  baseline?: Record<string, number>;
  /** Skeleton corrections passed to TalkingHead (bone → offsets). */
  retarget?: Record<string, unknown>;
  /** Framing for the fixed head-and-shoulders camera (defaults: distance 1.2, y 0.2 — keeps the face above the captions). */
  camera?: { distance?: number; y?: number };
};

/** Avaturn Type-2 tweaks (from TalkingHead's reference config): head tilt, lids, shoulders. */
const AVATURN = {
  baseline: { headRotateX: -0.05, eyeBlinkLeft: 0.15, eyeBlinkRight: 0.15 },
  retarget: {
    Hips: { y: 0.03 }, Spine: { y: 0.02 }, Spine1: { y: 0.02, z: 0.01 },
    Spine2: { y: 0.02, z: 0.01 }, Neck: { z: 0.02, y: 0.01 }, Head: { z: 0.02 },
    LeftShoulder: { rx: -0.5 }, RightShoulder: { rx: -0.5 },
    scaleToHipsLevel: 1.0,
  },
};

export const AVATARS: Record<TargetLanguage | "sq", Record<TutorGender, AvatarConfig>> = {
  it: {
    female: { file: "giulia.glb", body: "F", ...AVATURN },
    male: { file: "marco.glb", body: "M", ...AVATURN },
  },
  en: {
    female: { file: "emma.glb", body: "F", ...AVATURN },
    male: { file: "james.glb", body: "M", ...AVATURN },
  },
  sq: {
    female: { file: "elira.glb", body: "F", ...AVATURN },
    male: { file: "arben.glb", body: "M", ...AVATURN },
  },
};

export function avatarUrl(cfg: AvatarConfig): string | null {
  const base = process.env.NEXT_PUBLIC_AVATAR_BASE_URL;
  return base ? `${base.replace(/\/$/, "")}/${cfg.file}` : null;
}
