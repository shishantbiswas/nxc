import { Link } from "@tanstack/react-router";
import { UploadCloud } from "lucide-react";

export function Empty({
  hideAction = false,
  title,
  description,
}: {
  hideAction?: boolean;
  title?: string;
  description?: string;
}) {
  return (
    <div className="card text-center p-8 max-w-md mx-auto">
      <div className="card-body items-center text-center">
        <UploadCloud />
        <h3 className="font-bold text-lg">{title ?? "No data available"}</h3>

        <p className="text-sm text-base-content/60 mb-4">
          {description ??
            "Get started by creating a new item or importing your data."}
        </p>

        {!hideAction && (
          <div className="card-actions">
            <Link
              to="."
              search={(pre) => ({ ...pre, create: "FILE" })}
              type="button"
              className="btn btn-soft btn-sm"
            >
              Upload file
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
