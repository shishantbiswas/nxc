import { Link } from "@tanstack/react-router";
import { Upload } from "lucide-react";
import { useSnapshot } from "valtio/react";
import { uploadStore } from "../store/upload";
import { cn } from "../utils/cn";

export const UploadIndicator = () => {
  return (
    <Link to="/uploads" className="indicator tooltip tooltip-bottom" data-tip="Upload">
      <UploadIndicatorInner />
    </Link>
  );
};

function UploadIndicatorInner() {
  const snap = useSnapshot(uploadStore);
  const tasks = Object.values(snap.tasks);
  const tasksLenth = tasks.length;

  const completed =
    tasks.filter((t) => t.status === "completed").length === tasksLenth;
  const uploading = tasks.filter((t) => t.status === "uploading").length;
  const isUploading = uploading > 0;
  const error = tasks.filter((t) => t.status === "error").length;

  // const total = tasksLenth * 100;
  // const progress = tasks.reduce(
  //   (acc, up) => (acc += up.progress.percentage),
  //   0,
  // );

  // if (isUploading) {
  //   return (
  //     <div className="badge badge-soft badge-primary">
  //       Uploading {((progress / total) * 100).toFixed(2)}% ...
  //     </div>
  //   );
  // }

  return (
    <>
      {tasksLenth === 0 ? null : (
        <span
          className={cn(
            "indicator-item badge badge-sm",
            isUploading && "badge-info",
            completed && "badge-success",
            error > 0 && "badge-error",
          )}
        >
          {isUploading ? uploading : error > 0 ? error : tasksLenth}
        </span>
      )}
      <button
        type="button"
        className="btn btn-sm btn-ghost hover:btn-soft btn-square"
      >
        <Upload className="size-5 swap-off" />
      </button>
    </>
  );
}
