"use no memo";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useNavigate,
  useRouteContext,
  useRouter,
  useSearch,
} from "@tanstack/react-router";
import { Check, CloudUpload, InfoIcon, X } from "lucide-react";
import { nanoid } from "nanoid";
import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { useSnapshot } from "valtio/react";
import { type UploadSchema, uploadSchema } from "../schema/upload-schema";
import { modalStore } from "../store/modal";
import { uploadStore } from "../store/upload";
import { cn } from "../utils/cn";
import { createFolder } from "../utils/create-folder";
import { buildFolderTree, createDirectories } from "../utils/directory";
import bytesToSize from "../utils/format-bytes";
import { useToast } from "./toast-provider";

export function CreateModal() {
  const modal = useSnapshot(modalStore);
  const isOpen = ["FILE", "FOLDER"].includes(modal.type ?? "");

  return (
    <dialog className={cn("modal", isOpen && "modal-open")}>
      {/** biome-ignore lint/a11y/noStaticElementInteractions: modal needs to be in focus */}
      <div
        tabIndex={-1}
        ref={(e) => e?.focus()}
        className="modal-box p-0 focus:outline-none"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            modalStore.setType(null);
          }
        }}
      >
        <CreateForm type={modalStore.type} />
      </div>
      <div className="modal-backdrop backdrop-blur-xs flex flex-col">
        <div></div>
        <button
          type="button"
          className="min-h-[calc(100%-3rem)]"
          onClick={() => {
            modalStore.setType(null);
          }}
        >
          close
        </button>
      </div>
    </dialog>
  );
}

export function CreateForm({ type }: { type: typeof modalStore.type }) {
  const sp = useSearch({ strict: false });
  const navigate = useNavigate();
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(uploadSchema),
  });

  useEffect(() => {
    if (type) {
      form.setValue("create", type);
    } else {
      form.reset();
    }
  }, [type, form]);

  const toast = useToast();

  const { user } = useRouteContext({ from: "/_app" });

  const onSubmit = async (form: UploadSchema) => {
    if (!user) {
      toast.error("User is required");
      return;
    }
    const folderId = sp.folderId ?? undefined;

    if (form.create === "FOLDER") {
      if (form.data.withFiles) {
        const files = form.data.files;
        const dirs = buildFolderTree(files);
        const { error, exists } = await createDirectories({
          root: dirs,
          folderId,
          createFn: async (name, files, folderId) => {
            // console.log({ name, files, folderId});
            const createdFolder = await createFolder({
              userId: user.id as string,
              folderId,
              folderName: name,
            });
            uploadStore.startUpload({
              files,
              folderId: createdFolder.folderId,
            });
            return createdFolder;
          },
        });
        if (error > 0) {
          toast.error("Error creating folders", {
            duration: 3500,
          });
          return;
        }
        if (exists > 0) {
          toast.warning("Folder already exists", {
            duration: 3500,
          });
          return;
        }
        toast.success("Created folders", {
          duration: 3500,
        });

        toast.info("Added files to upload queue", { duration: 3500 });
        modalStore.setType(null);
      } else {
        const folderName = form.data.folderName;
        const folder = await createFolder({
          folderId: folderId ?? undefined,
          folderName,
          userId: String(user.id),
        });

        toast[folder.type](folder.message, {
          duration: 3500,
        });

        navigate({
          to: ".",
          search: (pre) => ({
            ...pre,
            folderId: folder.folderId ?? undefined,
          }),
        });
        modalStore.setType(null);
      }
      return;
    }

    if (typeof form.data === "string") throw new Error(); // this shouldn't happen at all

    if (form.data.isUrl) {
      const url = form.data.url;
      uploadStore.queueUrl({
        url,
        folderId,
        onSucess: (data) => {
          toast.success(`${data.name} finished uploading`);
          router.invalidate();
        },
        onError: (error) => {
          toast.error(`${error} finished uploading`);
          router.invalidate();
        },
        onFinish: ({
          completedSuccessfully,
          errorCount,
          hasError,
          sucessCount,
        }) => {
          if (hasError) {
            toast.error(`${errorCount} files failed`);
          }
          if (completedSuccessfully) {
            toast.success(`${sucessCount} files uploaded`);
          }
          router.invalidate();
        },
      });
      toast.info("Added to queue");
      modalStore.setType(null);
    } else {
      const files = form.data.files;
      uploadStore.startUpload({
        files,
        folderId,
        onSucess: (node) => {
          toast.success(`${node.name} finished uploading`);
          router.invalidate();
        },
        onError: (error) => {
          toast.error(`${error} finished uploading`);
          router.invalidate();
        },
        onFinish: ({
          completedSuccessfully,
          errorCount,
          hasError,
          sucessCount,
        }) => {
          if (hasError) {
            toast.error(`${errorCount} files failed`);
          }
          if (completedSuccessfully) {
            toast.success(`${sucessCount} files uploaded`);
          }
          router.invalidate();
        },
      });
      toast.info("Added to queue");
      modalStore.setType(null);
    }
  };

  if (!type) return null;

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4 p-4"
      >
        <div className="form-control w-full">
          {type === "FILE" || type === "FOLDER" ? (
            <FilesForm />
          ) : (
            <CreateFormByType />
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary capitalize w-full"
          disabled={form.formState.isSubmitting}
        >
          Create {type.toLocaleLowerCase()}
        </button>
      </form>
    </FormProvider>
  );
}

function CreateFormByType() {
  const form = useFormContext<UploadSchema>();
  const type = form.watch("create");

  return (
    <fieldset>
      <label
        className="capitalize label select-none"
        htmlFor={`form_input_${type}`}
      >
        Create {type.toLocaleLowerCase()}
      </label>
      <input
        id={`form_input_${type}`}
        defaultValue=""
        className="input w-full"
        {...form.register("data")}
      />
      {form.formState.errors.data?.message && (
        <p className=" mt-2 px-2">{form.formState.errors.data?.message}</p>
      )}
    </fieldset>
  );
}

function FilesForm() {
  const form = useFormContext<UploadSchema>();
  const type = form.watch("create");

  const usingUrl = form.watch("data.isUrl");
  const withFiles = form.watch("data.withFiles");

  const renderFileOrFolder = type === "FILE" ? !usingUrl : withFiles;

  // biome-ignore lint/suspicious/noExplicitAny: type narrowing is insufficient
  const urlErrorMessage = (form.formState?.errors?.data as any)?.url?.message;
  // biome-ignore lint/suspicious/noExplicitAny: type narrowing is insufficient
  const folderNameErrorMessage = (form.formState?.errors?.data as any)
    ?.folderName?.message;

  const errorMessage = urlErrorMessage || folderNameErrorMessage;

  return (
    <div>
      {renderFileOrFolder ? (
        <>
          <DropzoneInput />
          <FileFolderStaticAlert />
          <PreviewFiles />
          <p>{form.formState.errors.data?.message}</p>
        </>
      ) : (
        <>
          <label className="input w-full">
            {type === "FILE" && <span className="label">https://</span>}
            <input
              type="text"
              className=""
              placeholder={type === "FILE" ? "URL" : "Study Material"}
              {...form.register(
                type === "FILE" ? "data.url" : "data.folderName",
              )}
            />
          </label>
          {errorMessage && (
            <p className="label-text-alt text-error mt-2">{errorMessage}</p>
          )}
        </>
      )}
      <ToggleInput checked={renderFileOrFolder} />
    </div>
  );
}

function FileFolderStaticAlert() {
  const form = useFormContext<UploadSchema>();

  const type = form.watch("create");

  if (type === "FOLDER")
    return (
      <div className="text-xs alert-info alert-soft alert mt-2">
        <InfoIcon size={10} />
        <p>
          Want to upload just files ? <br />
          Use{" "}
          <button
            type="button"
            className="link"
            onClick={() => modalStore.setType("FILE")}
          >
            Upload Files
          </button>{" "}
          to ignore folder structure and upload files only
        </p>
      </div>
    );

  return (
    <div className="text-xs alert-info alert-soft alert mt-2">
      <InfoIcon size={10} />
      <p>
        Uploading folders here will only upload it's file use{" "}
        <button
          type="button"
          className="link"
          onClick={() => modalStore.setType("FOLDER")}
        >
          Upload Folder
        </button>{" "}
        to retain the folder structure
      </p>
    </div>
  );
}

function ToggleInput({ checked }: { checked: boolean }) {
  const form = useFormContext<UploadSchema>();
  const type = form.watch("create");

  return (
    <fieldset className="fieldset bg-base-100 border-base-300 rounded-box border p-4">
      <legend className="fieldset-legend">
        {type === "FILE" ? "Using URL" : "Upload Files"}
      </legend>
      <label className="label">
        <div className="toggle text-base-content">
          <input
            type="checkbox"
            defaultChecked={checked}
            {...form.register(
              type === "FILE" ? "data.isUrl" : "data.withFiles",
            )}
          />
          <X size={14} strokeWidth="4" />
          <Check size={14} strokeWidth="4" />
        </div>
        {type === "FILE" ? "Upload file from URL" : "Toggle dropzope"}
      </label>
    </fieldset>
  );
}

function DropzoneInput() {
  const form = useFormContext<UploadSchema>();
  const type = form.watch("create");

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      const currentFiles = form.getValues("data.files") || [];
      form.setValue(
        "data.files",
        [
          ...currentFiles,
          ...acceptedFiles.map((file) => ({
            id: nanoid(),
            fileData: file,
          })),
        ],
        {
          shouldValidate: true,
        },
      );
    },
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-base-200 border-base-300",
        isDragActive && "border-primary",
      )}
    >
      <div className="flex flex-col items-center justify-center pt-5 pb-6">
        <CloudUpload opacity={60} />
        <p className="mb-2 text-sm text-base-content/70">
          <span className="font-semibold">Click to upload</span> or drag and
          drop
        </p>
        <p className="text-xs text-base-content/50">SVG, PNG, JPG or GIF</p>
      </div>
      <input
        type="file"
        className="hidden"
        {...getInputProps(
          type === "FOLDER"
            ? ({
                webkitdirectory: "",
                directory: "",
                mozdirectory: "",
              } as React.InputHTMLAttributes<HTMLInputElement>)
            : {},
        )}
      />
    </div>
  );
}

function PreviewFiles() {
  const form = useFormContext<UploadSchema>();
  const files = form.watch("data.files");

  const removeFile = (idToRemove: string) => {
    const updatedFiles = files.filter((item) => item.id !== idToRemove);
    form.setValue("data.files", updatedFiles, { shouldValidate: true });
  };

  return (
    <div>
      {files?.length > 0 && (
        <ul className="list bg-base-100 rounded-box shadow-md mt-4 divide-y divide-base-200 max-h-[30vh] overflow-y-scroll">
          {files.map((file) => (
            <FileRow
              file={file}
              key={file.id}
              onRemove={() => removeFile(file.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function FileRow({
  file,
  onRemove,
}: {
  file: { id: string; fileData: File };
  onRemove: () => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (file.fileData.type.startsWith("image/")) {
      const objectUrl = URL.createObjectURL(file.fileData);
      setPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [file.fileData]);

  const folderPath = file.fileData.webkitRelativePath
    .split("/")
    .slice(0, -1)
    .join("/");
  return (
    <li className="list-row flex items-center justify-between p-3">
      <div className="flex items-center gap-3 min-w-0">
        {preview ? (
          <img
            src={preview}
            alt={file.fileData.name}
            className="w-10 h-10 object-cover rounded-lg"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-base-300 flex items-center justify-center text-xs font-bold uppercase">
            {file.fileData.name.split(".").pop() || "file"}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{file.fileData.name}</p>
          <p className="text-xs text-base-content/60">
            {folderPath} | {bytesToSize(file.fileData.size)}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="btn btn-ghost btn-xs btn-square text-error"
      >
        ✕
      </button>
    </li>
  );
}
