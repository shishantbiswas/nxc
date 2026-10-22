import { api } from "../lib/bknd";

export async function createFolder({
  folderId,
  folderName,
  userId,
}: {
  folderName: string;
  folderId?: string;
  userId: string;
}): Promise<{
  type: "warning" | "success" | "error";
  message: string;
  folderId?: string;
}> {
  const existingNode = await api.data.readOneBy("nodes", {
    where: {
      name: { $eq: folderName },
      parent_id: {
        ...(folderId ? { $eq: folderId } : { $isnull: true }),
      },
    },
  });

  if (existingNode.data) {
    return {
      type: "warning",
      message: "Folder already exists",
      folderId: existingNode.id,
    };
  }
  const folderRes = await api.data.createOne("nodes", {
    parent_id: folderId ?? undefined,
    name: folderName,
    type: "FOLDER",
    users_id: userId,
  });
  if (folderRes.status === 201) {
    return {
      type: "success",
      message: "Successfully created folder",
      folderId: folderRes.id,
    };
  } else {
    return { type: "error", message: folderRes.res.statusText };
  }
}
