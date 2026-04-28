import { create } from "zustand";

type UiState = {
  selectedMemoryId: string | null;
  consoleAgentId: string | null;
  sidebarCollapsed: boolean;
  setSelectedMemoryId: (id: string | null) => void;
  setConsoleAgentId: (id: string | null) => void;
  toggleSidebarCollapsed: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  selectedMemoryId: null,
  consoleAgentId: null,
  sidebarCollapsed: false,
  setSelectedMemoryId: (selectedMemoryId) => set({ selectedMemoryId }),
  setConsoleAgentId: (consoleAgentId) => set({ consoleAgentId }),
  toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
