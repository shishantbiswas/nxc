import {
  FastForward,
  Headphones,
  Play,
  Repeat,
  Rewind,
  Shuffle,
  Volume1,
} from "lucide-react";
import { cn } from "../utils/cn";

export function MusicPlayer({ mini }: { mini?: boolean }) {
  return
  return (
    <div className="card bg-base-100/30  card-sm overflow-hidden group-data-[expanded=false]:hidden">
      <div className={cn(" flex flex-col px-6 ", !mini && "hidden")}>
        <div className="relative mt-6">
          <div
            className="tooltip tooltip-open tooltip-bottom absolute top-4 before:text-xs"
            data-tip="13:39"
            style={{
              insetInlineStart: "10%",
            }}
          ></div>
          <progress className="progress" value="10" max="100"></progress>
        </div>
        <div className="flex justify-between text-xs opacity-50">
          <span>13:39</span> <span>120:00</span>
        </div>
      </div>
      <div className="card-body flex-col-reverse my-2">
        <div className="flex items-center justify-around">
          <button className="btn btn-square " type="button">
            <Rewind size={12} />
          </button>
          <button className="btn btn-square  btn-lg" type="button">
            <Play size={22} />
          </button>
          <button className="btn btn-square " type="button">
            <FastForward size={12} />
          </button>
        </div>
        <div className="mt-2 text-center">
          <h6 className="text-sm font-bold">PM Zoomcall ASMR</h6>
          <p className="text-xs opacity-50">
            Project Manager talking for 2 hours
          </p>
        </div>
      </div>
      <div className={cn(" flex flex-col px-6 py-4", mini && "hidden")}>
        <div className="relative mt-6">
          <div
            className="tooltip tooltip-open absolute top-2 before:text-xs"
            data-tip="13:39"
            style={{
              insetInlineStart: "10%",
            }}
          ></div>
          <progress className="progress" value="10" max="100"></progress>
        </div>
        <div className="flex justify-between text-xs opacity-50">
          <span>13:39</span> <span>120:00</span>
        </div>
      </div>
      <div
        className={cn(
          "flex items-center justify-around px-2 pb-6",
          mini && "hidden",
        )}
      >
        <button className="btn btn-square" type="button">
          <Volume1 size={16} />
        </button>
        <button className="btn btn-square" type="button">
          <Shuffle size={16} />
        </button>
        <button className="btn btn-square" type="button">
          <Repeat size={16} />
        </button>
        <button className="btn btn-square" type="button">
          <Headphones size={16} />
        </button>
      </div>
    </div>
  );
}
