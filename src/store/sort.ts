import { proxy } from "valtio";
import type { Nodes } from "../../bknd-types";

const getNestedValue = (obj: any, path: string) => {
  return path.split(".").reduce((acc, part) => acc?.[part], obj);
};

export const sortStore = proxy<{
  nodes: (Omit<Nodes, "id"> & {
    id: string;
  })[];
  dir: "asc" | "desc";
  setNodes: (
    nodes: (Omit<Nodes, "id"> & {
      id: string;
    })[],
    sort: keyof Nodes | string,
    dir: "asc" | "desc",
  ) => void;
}>({
  nodes: [],
  dir: "asc",
  setNodes: (newNodes, sort, dir) => {
    sortStore.dir = dir
    const sorted = [...newNodes].sort((a, b) => {
      const aVal = getNestedValue(a, sort);
      const bVal = getNestedValue(b, sort);

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return dir === "asc" ? 1 : -1;
      if (bVal == null) return dir === "asc" ? -1 : 1;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return dir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      const aTime =
        aVal instanceof Date
          ? aVal.getTime()
          : typeof aVal === "string"
            ? new Date(aVal).getTime()
            : NaN;
      const bTime =
        bVal instanceof Date
          ? bVal.getTime()
          : typeof bVal === "string"
            ? new Date(bVal).getTime()
            : NaN;

      if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) {
        return dir === "asc" ? aTime - bTime : bTime - aTime;
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return dir === "asc" ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    sortStore.nodes = sorted;
  },
});
