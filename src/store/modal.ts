import { proxy } from "valtio";

export const modalStore = proxy<{
  type: "FILE" | "FOLDER" | null;
  setType: (type: "FILE" | "FOLDER" | null) => void;
}>({
  type: null,
  setType(type) {
    if (!type) modalStore.type = null;
    modalStore.type = type;
  },
});
