import type { FileWithId } from "../store/upload";

export interface DirectoryNode {
  name: string;
  files: FileWithId[];
  subfolders: Record<string, DirectoryNode>;
}

export function buildFolderTree(files: FileWithId[]): DirectoryNode {
  const root: DirectoryNode = {
    name: "/",
    files: [],
    subfolders: {},
  };

  for (const file of files) {
    const relativePath = file.fileData.webkitRelativePath || file.fileData.name;
    const parts = relativePath.split("/");

    let currentNode = root;

    for (let i = 0; i < parts.length; i++) {
      if (parts.length === i + 1) {
        currentNode.files.push(file);
        break;
      }
      const folderName = parts[i];

      if (!currentNode.subfolders[folderName]) {
        currentNode.subfolders[folderName] = {
          name: folderName,
          files: [],
          subfolders: {},
        };
      }

      currentNode = currentNode.subfolders[folderName];
    }
  }

  return root;
}

// export async function createDirectories({
//   root,
//   createFn,
//   basePath = "/",
// }: {
//   root: DirectoryNode;
//   createFn: (
//     folderName: string,
//     base: string,
//   ) =>
//     | Promise<{ type: "success" | "error" | "warning" }>
//     | { type: "success" | "error" | "warning" };
//   basePath?: string;
// }): Promise<{ error: number; success: number }> {
//   let error = 0;
//   let success = 0;
//   if (root.name !== "/") {
//     const { type } = await createFn(root.name, basePath);
//     if (type === "error") {
//       error += 1;
//     } else {
//       success += 1;
//     }
//   }

//   const currentPath =
//     root.name === "/"
//       ? basePath
//       : `${basePath === "/" ? "" : basePath}/${root.name}`;

//   for (const dirKey of Object.keys(root.subfolders)) {
//     const { error: RError, success: RSuccess } = await createDirectories({
//       root: root.subfolders[dirKey],
//       createFn,
//       basePath: currentPath,
//     });
//     if (RError) error += RError;
//     if (RSuccess) success += RSuccess;
//   }

//   return { error, success };
// }

type CreateFolderResult = {
  type: "warning" | "success" | "error";
  message: string;
  folderId?: string;
};
export async function createDirectories({
  root,
  createFn,
  folderId,
}: {
  root: DirectoryNode;
  createFn: (
    folderName: string,
    files: FileWithId[],
    folderId?: string,
  ) => Promise<CreateFolderResult> | CreateFolderResult;
  folderId?: string;
}): Promise<{ error: number; success: number; exists: number }> {
  let error = 0;
  let success = 0;
  let exists = 0;
  let nextFoldername = folderId;

  if (root.name !== "/") {
    const { type, folderId: createdFolderId } = await createFn(
      root.name,
      root.files,
      folderId,
    );
    if (type === "error") {
      error += 1;
    }
    if (type === "warning") {
      exists += 1;
      nextFoldername = createdFolderId;
    } else {
      success += 1;
      nextFoldername = createdFolderId;
    }
  }

  for (const dirKey of Object.keys(root.subfolders)) {
    const {
      error: RError,
      success: RSuccess,
      exists: RExists,
    } = await createDirectories({
      root: root.subfolders[dirKey],
      createFn,
      folderId: nextFoldername,
    });
    if (RError) error += RError;
    if (RSuccess) success += RSuccess;
    if (RExists) exists += RExists;
  }

  return { error, success, exists };
}
