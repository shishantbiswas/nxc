import { FolderPlus, Plus, Upload } from "lucide-react";
import { modalStore } from "../store/modal";

export function FAB() {
  return (
    <div className="fab bottom-20 md:bottom-4">
      <button type="button" className="btn btn-circle btn-lg ">
        <Plus size={22} />
      </button>

      {/* <!-- buttons that show up when FAB is open --> */}
      <div className="tooltip tooltip-left" data-tip="Upload file">
        <button
          type="button"
          className="btn btn-lg btn-circle "
          onClick={() => {
            modalStore.setType("FILE");
          }}
        >
          <Upload size={14} />
        </button>
      </div>
      <div className="tooltip tooltip-left" data-tip="Create folder">
        <button
          type="button"
          className="btn btn-lg btn-circle"
          onClick={() => {
            modalStore.setType("FOLDER");
          }}
        >
          <FolderPlus size={14} />
        </button>
      </div>
    </div>
  );
}
