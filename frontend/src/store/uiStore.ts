import { create } from 'zustand';

type UiState = {
  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  /** The compact account popover opened from the desktop rail's account row — never the full sidebar. */
  accountMenuOpen: boolean;
  toggleAccountMenu: () => void;
  closeAccountMenu: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: false,
  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false }),

  accountMenuOpen: false,
  toggleAccountMenu: () => set((s) => ({ accountMenuOpen: !s.accountMenuOpen })),
  closeAccountMenu: () => set({ accountMenuOpen: false }),
}));
