import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { FileExclamationPoint, X } from "lucide-react";
import { convert } from "mhtml2html";
import { useState } from "react";
import { toast } from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGemoji from "remark-gemoji";
import remarkGfm from "remark-gfm";
import useSWR from "swr";
import type { NodeFileVideo, Nodes } from "../../bknd-types";
import { api } from "../lib/bknd";
import { cn } from "../utils/cn";

export function PreviewFile() {
  const { fileId } = useSearch({ strict: false });

  const { data, isLoading, error, isValidating } = useSWR(
    fileId,
    async (fileId: string) => {
      const mediaInfo = fileId
        ? await api.data.readOneBy("media", {
            where: {
              id: fileId,
            },
          })
        : null;

      const mediaNodeInfo = fileId
        ? await api.data.readOneBy("nodes", {
            where: {
              media_id: mediaInfo?.data.id,
            },
          })
        : null;

      return {
        mediaInfo: mediaInfo?.data ?? null,
        mediaNodeInfo: mediaNodeInfo?.data ?? null,
      };
    },
  );
  const navigate = useNavigate();

  if (isLoading || isValidating) return <p>Loading ...</p>;
  if (error) return <p>Error ...</p>;
  if (!fileId || !data?.mediaNodeInfo || !data?.mediaInfo) return;

  return (
    <div className={cn("modal", fileId && "modal-open")}>
      {/** biome-ignore lint/a11y/noStaticElementInteractions: modal needs to be a interactive div */}
      <div
        tabIndex={-1}
        ref={(e) => e?.focus()}
        className="modal-box p-0 focus:outline-none w-fit max-w-[80vw] max-h-[80vh]"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            navigate({
              to: ".",
              search: (pre) => ({ ...pre, fileId: undefined }),
            });
          }
        }}
      >
        <FileEntryByType
          node={data?.mediaNodeInfo}
          mime_type={data?.mediaNodeInfo?.mime_type}
          fileUrl={`/api/media/file/${data?.mediaInfo?.path}`}
        />
      </div>
      <div className="modal-backdrop flex flex-col">
        <div
          className={cn(
            "h-12 bg-neutral/50 flex items-center justify-between px-2",
            !data?.mediaInfo && "hidden",
          )}
        >
          <ActionBar
            mime_type={data?.mediaNodeInfo?.mime_type}
            videoResolution={
              (data.mediaNodeInfo.metadata as NodeFileVideo).height
            }
            id={data.mediaNodeInfo.id as string}
          />
          <div>
            <Link
              to="."
              className="min-h-[calc(100%-3rem)]"
              search={(pre) => ({ ...pre, fileId: undefined })}
            >
              <button
                type="button"
                className="btn btn-sm btn-square btn-soft hover:btn-error"
              >
                <X />
              </button>
            </Link>
          </div>
        </div>
        <Link
          to="."
          className="min-h-[calc(100%-3rem)]"
          search={(pre) => ({ ...pre, fileId: undefined })}
        ></Link>
      </div>
    </div>
  );
}

function PreviewMHTML({ fileUrl }: { fileUrl: string }) {
  const { data, isLoading } = useSWR(fileUrl, async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");

    const htmlContent = await response.text();
    const data = await convert(htmlContent);
    return data.window.document.documentElement.outerHTML;
  });

  if (isLoading) return <p>Loading...</p>;
  return (
    <iframe
      srcDoc={data}
      title={"mhtml preview"}
      className="w-[80vw] h-[85vh]"
    ></iframe>
  );
}

function PreviewText({ fileUrl }: { fileUrl: string }) {
  const { data, isLoading } = useSWR(fileUrl, (url: string) =>
    fetch(url).then((e) => e.text()),
  );
  if (isLoading) return <p>Loading...</p>;
  return <p>{data}</p>;
}

function PreviewMarkdown({ fileUrl }: { fileUrl: string }) {
  const { data, isLoading } = useSWR(fileUrl, (url: string) =>
    fetch(url).then((e) => e.text()),
  );
  if (isLoading) return <p>Loading...</p>;
  return (
    <div className="markdown-body p-4">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkGemoji]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
      >
        {data}
      </ReactMarkdown>
    </div>
  );
}

function FileEntryByType({
  mime_type,
  fileUrl,
  node,
}: {
  fileUrl: string;
  mime_type?: string;
  node?: (Omit<Nodes, "id"> & { id: string }) | null;
}) {
  if (!mime_type) return;
  if (mime_type.startsWith("image/")) {
    return (
      <img
        src={fileUrl}
        className="min-h-96 object-contain"
        alt={`${node?.name} preview`}
      />
    );
  }

  if (mime_type.startsWith("video/")) {
    return <video controls src={fileUrl} />;
  }

  if (mime_type.startsWith("audio/")) {
    return <audio controls src={fileUrl} />;
  }

  if (mime_type === "application/pdf") {
    return (
      <iframe
        src={fileUrl}
        title={"pdf preview"}
        className="w-[80vw] h-[85vh]"
      ></iframe>
    );
  }

  if (mime_type === "plain/txt") {
    return <PreviewText fileUrl={fileUrl} />;
  }

  if (mime_type === "text/markdown") {
    return <PreviewMarkdown fileUrl={fileUrl} />;
  }

  if (node?.name.endsWith(".mhtml") || node?.name.endsWith(".mht")) {
    return <PreviewMHTML fileUrl={fileUrl} />;
  }

  return (
    <div className="min-h-48 min-w-48 p-4 text-center flex flex-col items-center justify-center">
      <FileExclamationPoint />
      <p>Unsupported format</p>
    </div>
  );
}

function ActionBar({
  mime_type,
  videoResolution,
  id,
}: {
  mime_type?: string;
  videoResolution: number;
  id: string;
}) {
  const [resolution, setResolution] = useState("");
  const navigate = useNavigate();

  if (!mime_type) return <div></div>;

  if (mime_type.startsWith("video/"))
    return (
      <div className="flex gap-2">
        <select
          defaultValue="Convert"
          className="select w-36 border-none text-base-content select-sm"
          onChange={(e) => {
            setResolution(e.target.value);
          }}
        >
          <option disabled={true}>Convert</option>
          {videoResolution >= 1080 && <option>1080p</option>}
          {videoResolution >= 720 && <option>720p</option>}
          {videoResolution >= 480 && <option>480p</option>}
          {videoResolution >= 320 && <option>320p</option>}
          {videoResolution >= 240 && <option>240p</option>}
        </select>
        {resolution && (
          <button
            type="submit"
            className="btn btn-sm"
            onClick={async () => {
              const res = await fetch("/api/convert", {
                method: "POST",
                body: JSON.stringify({
                  id,
                  resolution,
                }),
              });
              
              const data = await res.json();
              console.log({ data });
              toast.success(`converting to ${resolution}`);
              // navigate({
              //   to: ".",
              //   search: (pre) => ({ ...pre, fileId: undefined }),
              // });
            }}
          >
            Submit
          </button>
        )}
      </div>
    );
  return <div></div>;
}
