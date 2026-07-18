import { create } from 'zustand';

export type RecognitionCaptureStatus = 'idle' | 'recording' | 'cleaning_up';

type RecognitionCaptureState = {
  status: RecognitionCaptureStatus;
  setStatus: (status: RecognitionCaptureStatus) => void;
};

/**
 * App-wide microphone lifecycle state. The Identify screen stays in
 * `cleaning_up` until the recorder has stopped and its temporary clip has
 * either been uploaded or discarded, so tab changes cannot make an active
 * capture look idle prematurely.
 */
export const useRecognitionCaptureStore = create<RecognitionCaptureState>((set) => ({
  status: 'idle',
  setStatus: (status) => set({ status }),
}));
