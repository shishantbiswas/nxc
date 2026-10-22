import mime from "mime/lite";
import otherTypes from "mime/types/other.js";
import standardTypes from "mime/types/standard.js";

const getMimeTypeByExtension = (ext: string) => mime.getType(ext);

const allMimeTypes = Object.keys({ ...standardTypes, ...otherTypes });

const imageMimeType = allMimeTypes.filter((type) => type.startsWith("image/"));

const audioMimeType = allMimeTypes.filter((type) => type.startsWith("audio/"));

const videoMimeType = allMimeTypes.filter((type) => type.startsWith("video/"));

export { audioMimeType, getMimeTypeByExtension, imageMimeType, videoMimeType };
