import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Close a web overlay when the user presses Escape. React Native's <Modal>
 * already does this via onRequestClose, but our lightweight popovers and
 * sheets are plain absolute-fill Views, so they need this explicitly to stay
 * keyboard-dismissible. No-op on native, where there is no hardware Escape.
 */
export function useEscapeToClose(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, onClose]);
}
