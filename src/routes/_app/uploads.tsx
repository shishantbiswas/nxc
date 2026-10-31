import { createFileRoute } from "@tanstack/react-router";
import { CircleCheck, Info } from "lucide-react";
import { useSnapshot } from "valtio/react";
import { uploadStore } from "../../store/upload";
import bytesToSize from "../../utils/format-bytes";
import { truncateText } from "../../utils/truncate-text";

export const Route = createFileRoute("/_app/uploads")({
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: "Progress Manager",
      },
    ],
  }),
});

function RouteComponent() {
  const snap = useSnapshot(uploadStore);
  const tasks = Object.values(snap.tasks);

  const activeCount = tasks.filter((t) => t.status === "uploading").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const errorCount = tasks.filter((t) => t.status === "error").length;

  return (
    <div className="container p-4 space-y-6 min-w-full">
      {/* Page Header */}
      <div className="flex justify-between items-center pb-4">
        <div>
          <h1 className="text-2xl font-bold">Progress Manager</h1>
          <p className="text-sm text-base-content/70">
            Monitor and manage individual background file queues/uploads
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="stats shadow w-full stats-vertical sm:stats-horizontal">
        <div className="stat">
          <div className="stat-title">Total Files</div>
          <div className="stat-value">{tasks.length}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Uploading</div>
          <div className="stat-value">{activeCount}</div>
        </div>
        <div className="stat">
          <div className="stat-figure">
            <CircleCheck />
          </div>
          <div className="stat-title">Completed</div>
          <div className="stat-value">{completedCount}</div>
          {completedCount > 0 && (
            <div className="stat-actions">
              <button
                type="button"
                className="btn btn-xs "
                onClick={() => uploadStore.clearCompleted()}
              >
                Clear Completed
              </button>
            </div>
          )}
        </div>
        <div className="stat">
          <div className="stat-title">Failed</div>
          <div className="stat-value">{errorCount}</div>
          {errorCount > 0 && (
            <div className="stat-actions">
              <button
                type="button"
                className="btn btn-xs "
                onClick={() => uploadStore.clearError()}
              >
                Clear Error
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Full Page Data Table */}
      <div className="overflow-x-auto rounded-box  bg-base-100/60 shadow-sm">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>File Name</th>
              <th>Relative Path</th>
              <th>Size</th>
              <th>Type</th>
              <th>Progress</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-12 text-base-content/50"
                >
                  No active or recent uploads found.
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task.id}>
                  {/* File Name */}
                  <td className="font-semibold text-sm">
                    {truncateText(task.name, 24)}
                  </td>

                  {/* Path */}
                  <td className="text-xs font-mono text-base-content/70 truncate max-w-xs">
                    {truncateText(task.path, 24)}
                  </td>

                  {/* Size */}
                  <td className="text-xs whitespace-nowrap">
                    {bytesToSize(task.size)}
                  </td>

                  <td className="text-xs whitespace-nowrap">{task.type}</td>

                  {/* Progress Bar & Percentage */}
                  <td className="w-1/4">
                    <div className="flex items-center gap-3">
                      <progress
                        className={`progress w-full ${
                          task.status === "error"
                            ? "progress-error"
                            : task.status === "completed"
                              ? "progress-success"
                              : "progress-primary"
                        }`}
                        value={task.progress.percentage}
                        max="100"
                      />
                      <span className="text-xs font-mono w-10 text-right">
                        {task.progress.percentage}%
                      </span>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td>
                    {task.status === "pending" && (
                      <span className="badge badge-ghost badge-sm">
                        Pending
                      </span>
                    )}
                    {task.status === "converting" && (
                      <span className="badge badge-info badge-sm">
                        <span className="loading loading-spinner loading-xs" />
                        Converting
                      </span>
                    )}
                    {task.status === "uploading" && (
                      <span className="badge badge-info badge-sm gap-1">
                        <span className="loading loading-spinner loading-xs" />
                        Uploading
                      </span>
                    )}
                    {task.status === "completed" && (
                      <span className="badge badge-success badge-sm">Done</span>
                    )}
                    {task.status === "error" && (
                      <span
                        className="badge badge-error badge-sm tooltip hover:tooltip-open tooltip-error"
                        data-tip={task.error}
                      >
                        <Info size={10} />
                        Failed
                      </span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="text-right">
                    <button
                      type="button"
                      onClick={() => uploadStore.cancelTask(task.id)}
                      className="btn btn-ghost btn-xs text-error"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
