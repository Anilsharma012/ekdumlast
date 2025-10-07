import React from "react";

interface WatermarkProps {
  text?: string;
  small?: boolean;
  className?: string;
}

export default function Watermark({
  text = "AshishProperties.in",
  small = false,
  className = "",
}: WatermarkProps) {
  return (
    <div
      className={[
        "pointer-events-none select-none absolute bottom-1 left-1/2 -translate-x-1/2 z-10",
        small
          ? "text-[4px] px-1.5 py-[1px]"
          : "text-[2px] sm:text-xs px-2 py-0.5",
        "font-semibold text-white rounded bg-black/35 shadow",
        className,
      ].join(" ")}
    >
      {text}
    </div>
  );
}
