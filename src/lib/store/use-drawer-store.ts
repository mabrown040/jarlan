import { create } from "zustand";

interface DrawerStore {
  isOpen: boolean;
  openSection?: string;
  open: (section?: string) => void;
  close: () => void;
  toggle: () => void;
}

export const useDrawerStore = create<DrawerStore>((set) => ({
  isOpen: false,
  openSection: undefined,
  open: (section) => set({ isOpen: true, openSection: section }),
  close: () => set({ isOpen: false, openSection: undefined }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));
