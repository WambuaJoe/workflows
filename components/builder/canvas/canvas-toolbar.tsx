"use client";

import type { ReactNode } from "react";
import {
  HandIcon,
  PointerIcon,
  RedoIcon,
  SparkleIcon,
  UndoIcon,
  ZoomScanIcon,
} from "@/components/icons";
import { Dropdown, MenuCaret, MenuItem, MenuSeparator } from "@/components/ui/dropdown";
import { cn } from "@/lib/cn";
import { BASE_ZOOM } from "./use-canvas-view";

export type Tool = "select" | "hand";

const ZOOM_PRESETS = [50, BASE_ZOOM, 100, 150];

type CanvasToolbarProps = {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomTo: (percent: number) => void;
  onFit: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  /** Width covered by the panel; the toolbar centres in what's left. */
  inset: number;
};

/** Floating tools at the bottom of the canvas. */
export function CanvasToolbar({
  tool,
  onToolChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomTo,
  onFit,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  inset,
}: CanvasToolbarProps) {
  return (
    <div
      data-control
      role="group"
      aria-label="Canvas tools"
      style={{ left: `calc((100% - ${inset}px) / 2)` }}
      className="absolute bottom-[18px] z-20 flex -translate-x-1/2 items-center gap-2.5 rounded-[16px] border border-line bg-white p-[9px] shadow-float transition-[left] duration-[240ms] ease-drawer motion-reduce:transition-none"
    >
      <ToolButton
        label="Select (V)"
        pressed={tool === "select"}
        onClick={() => onToolChange("select")}
      >
        <PointerIcon />
      </ToolButton>
      <ToolButton
        label="Pan (H, or hold Space)"
        pressed={tool === "hand"}
        onClick={() => onToolChange("hand")}
      >
        <HandIcon />
      </ToolButton>
      <button
        type="button"
        className="flex h-9 items-center gap-2 rounded-[10px] bg-gradient-to-b from-[#256a81] to-brand px-4 text-[13.5px] font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_1px_2px_rgb(16_50_62/0.3)] transition-[filter,transform] duration-150 ease-out hover:brightness-110 motion-safe:active:scale-[0.97]"
      >
        <SparkleIcon />
        Ask AI
      </button>
      <ToolButton label="Undo (Ctrl+Z)" onClick={onUndo} disabled={!canUndo}>
        <UndoIcon />
      </ToolButton>
      <ToolButton label="Redo (Ctrl+Shift+Z)" onClick={onRedo} disabled={!canRedo}>
        <RedoIcon />
      </ToolButton>
      <span aria-hidden className="mx-2 h-6 w-px bg-line" />
      <Dropdown
        side="top"
        align="end"
        menuClassName="w-44"
        trigger={({ open, toggle, menuId, triggerId }) => (
          <button
            type="button"
            onClick={toggle}
            aria-haspopup="menu"
            aria-expanded={open}
            id={triggerId}
            aria-controls={open ? menuId : undefined}
            aria-label={`Zoom ${zoom}%`}
            className="flex h-9 items-center gap-2 rounded-[10px] border border-line bg-white px-2.5 text-[13.5px] font-medium shadow-xs transition-colors duration-150 hover:bg-hover"
          >
            <ZoomScanIcon size={18} />
            <span className="w-[34px] text-left tabular-nums">{zoom}%</span>
            <MenuCaret open={open} size={13} className="text-muted" />
          </button>
        )}
      >
        {(close) => (
          <>
            <MenuItem onSelect={onZoomIn} hint="Ctrl+Scroll">
              Zoom in
            </MenuItem>
            <MenuItem onSelect={onZoomOut}>Zoom out</MenuItem>
            <MenuSeparator />
            {ZOOM_PRESETS.map((percent) => (
              <MenuItem
                key={percent}
                checked={zoom === percent}
                onSelect={() => {
                  onZoomTo(percent);
                  close();
                }}
              >
                {percent}%
              </MenuItem>
            ))}
            <MenuSeparator />
            <MenuItem
              onSelect={() => {
                onFit();
                close();
              }}
            >
              Zoom to fit
            </MenuItem>
          </>
        )}
      </Dropdown>
    </div>
  );
}

function ToolButton({
  label,
  children,
  onClick,
  pressed,
  disabled,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  pressed?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid size-9 place-items-center rounded-[10px] border border-line transition-[background-color,color,transform] duration-150 ease-out disabled:active:scale-100 motion-safe:active:scale-[0.95]",
        pressed ? "bg-active text-ink" : "bg-white text-ink shadow-xs hover:bg-hover",
        "disabled:text-subtle disabled:hover:bg-white",
      )}
    >
      {children}
    </button>
  );
}
