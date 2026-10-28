import { proxy } from "valtio";

export type ModalType =
  | "FILE:UPLOAD"
  | "FILE:DELETE"
  | "FILE:MOVE"
  | "FOLDER:UPLOAD"
  | "SEARCH"
  | null;

export const modalStore = proxy<{
  type: ModalType;
  setType: (type: ModalType) => void;
  selectedNodes: string[];
  setSelectedNodes: (data: string[]) => void;
}>({
  type: null,
  setType(type) {
    if (!type) modalStore.type = null;
    modalStore.type = type;
  },
  selectedNodes: [],
  setSelectedNodes: (data) => (modalStore.selectedNodes = data),
});
