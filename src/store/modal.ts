import { proxy } from "valtio";

export type ModalType =
  | "FILE:UPLOAD"
  | "FILE:DELETE"
  | "FILE:MOVE"
  | "FOLDER:UPLOAD"
  | "SEARCH"
  | null;

interface ModalState {
  type: ModalType;
  setType: (type: ModalType) => void;
  selectedNodes: string[];
  setSelectedNodes: (data: string[]) => void;
  deletedNodes: { id: string; type: string }[];
  setDeletedNodes: (data: { id: string; type: string }[]) => void;
}

export const modalStore = proxy<ModalState>({
  type: null,
  setType: (type) => (modalStore.type = type),
  selectedNodes: [],
  setSelectedNodes: (data) => {
    modalStore.selectedNodes = data;
  },
  deletedNodes: [],
  setDeletedNodes: (data) => {
    modalStore.deletedNodes = data;
  },
});
