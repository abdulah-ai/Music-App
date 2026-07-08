import { create } from 'zustand';

export type VideoMode = 'closed' | 'expanded' | 'mini';

type VideoPlayerState = {
  mediaId: string | null;
  mode: VideoMode;
  /** Opens (or switches to) a video in fullscreen. */
  openExpanded: (mediaId: string) => void;
  /** Shrinks the fullscreen player into the floating dockable mini window — playback keeps running. */
  minimize: () => void;
  /** Restores the mini window back to fullscreen. */
  expand: () => void;
  /** Stops playback entirely and hides both the fullscreen and mini views. */
  close: () => void;
  setMediaId: (mediaId: string) => void;
};

export const useVideoPlayerStore = create<VideoPlayerState>((set) => ({
  mediaId: null,
  mode: 'closed',

  openExpanded(mediaId) {
    set({ mediaId, mode: 'expanded' });
  },
  minimize() {
    set((s) => (s.mediaId ? { mode: 'mini' } : s));
  },
  expand() {
    set((s) => (s.mediaId ? { mode: 'expanded' } : s));
  },
  close() {
    set({ mediaId: null, mode: 'closed' });
  },
  setMediaId(mediaId) {
    set({ mediaId });
  },
}));
