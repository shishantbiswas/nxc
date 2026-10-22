import type { DB } from "bknd";
import type { Generated, Insertable, Selectable, Updateable } from "kysely";

declare global {
  type BkndEntity<T extends keyof DB> = Selectable<DB[T]>;
  type BkndEntityCreate<T extends keyof DB> = Insertable<DB[T]>;
  type BkndEntityUpdate<T extends keyof DB> = Updateable<DB[T]>;
}

export type UserPreferences = {
  wallpaper?: string;
  hideDotfiles?: boolean;
  generateImagePreviews?: boolean;
  generateVideoPreviews?: boolean;
};

export type NodeFileMeta = {
  size: number;
} & (NodeFileVideo | NodeFileImage | NodeFileAudio | NodeFile);

export type NodeFileVideo = {
  fileType: "video";
  height: number;
  width: number;
  duration: number;
  preview?: string;
};

export type NodeFileImage = {
  fileType: "image";
  height: number;
  width: number;
  preview?: string;
};

export type NodeFileAudio = {
  fileType: "audio";
  preview?: string;
};

export type NodeFile = {
  fileType?: string;
};

export interface Nodes {
  id: Generated<string>;
  name: string;
  type: "FOLDER" | "FILE";
  metadata: NodeFileMeta;
  media_id?: string;
  mime_type?: string;
  parent_id?: string;
  users_id: string;
  created_at?: Date | string;
  deleted_at?: Date | string;
  updated_at?: Date | string;
  media?: DB["media"];
  users?: DB["users"];
}

export interface Shared {
  id: Generated<string>;
  valid_till?: Date | string;
  token?: string;
  users_id: string;
  nodes_id: string;
  users?: DB["users"];
  nodes?: DB["nodes"];
}

interface Database {
  nodes: Nodes;
  shared: Shared;
}

declare module "bknd" {
  interface Users {
    preferences?: UserPreferences;
    name?: string;
    quota?: number;
    nodes?: Nodes[];
  }

  interface DB extends Database {}
}
