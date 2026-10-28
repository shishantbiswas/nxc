import { api } from "../lib/bknd";

export async function fileExistsByName(
  name: string,
  folderId?: string | null,
): Promise<boolean> {
  const { data } = await api.data.exists("nodes", {
    name,
    parent_id: folderId ?? undefined,
  });
  return data.exists;
}
