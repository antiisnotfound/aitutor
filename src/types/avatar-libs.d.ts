// Minimal typings for the untyped TalkingHead / HeadAudio ES modules.
declare module "@met4citizen/talkinghead" {
  export type MorphTarget = { newvalue?: number; needsUpdate?: boolean; value?: number };
  export class TalkingHead {
    constructor(node: HTMLElement, opt?: Record<string, unknown>);
    audioCtx: AudioContext;
    mtAvatar: Record<string, MorphTarget>;
    opt: Record<string, unknown> & { update?: ((dt: number) => void) | null };
    showAvatar(avatar: Record<string, unknown>, onprogress?: ((ev: ProgressEvent) => void) | null): Promise<void>;
    setMood(mood: string): void;
    lookAtCamera(ms: number): void;
    start(): void;
    stop(): void;
    dispose(): void;
  }
}

declare module "@met4citizen/headaudio/modules/headaudio.mjs" {
  export class HeadAudio extends AudioWorkletNode {
    constructor(ctx: AudioContext, options?: Record<string, unknown>);
    loadModel(url: string, reset?: boolean): Promise<void>;
    update(dtMs: number): void;
    onvalue: ((key: string, value: number) => void) | null;
    onstarted: (() => void) | null;
    onended: (() => void) | null;
  }
}
