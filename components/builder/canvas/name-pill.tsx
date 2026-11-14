"use client";

import { useEffect, useRef, useState } from "react";
import { PencilIcon } from "@/components/icons";

/** The rule's name, top-left of the canvas. Click the pencil or double-click to rename. */
export function NamePill({ name, onRename }: { name: string; onRename: (name: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const pencil = useRef<HTMLButtonElement>(null);
  // Enter and Escape hand focus back to the pencil; clicking away leaves it where it went.
  const refocus = useRef(false);

  useEffect(() => {
    if (draft !== null || !refocus.current) return;
    refocus.current = false;
    pencil.current?.focus();
  }, [draft]);

  const commit = () => {
    const next = draft?.trim();
    if (next) onRename(next);
    setDraft(null);
  };

  return (
    <div className="absolute top-[18px] left-[17px] z-20 flex h-[34px] max-w-[calc(100%-34px)] items-center gap-5 rounded-[10px] border border-line bg-white pr-1.5 pl-3.5 shadow-card">
      {draft === null ? (
        <>
          <span
            className="truncate text-[13.5px] font-semibold"
            onDoubleClick={() => setDraft(name)}
          >
            {name}
          </span>
          <button
            ref={pencil}
            type="button"
            aria-label="Rename automation"
            title="Rename"
            onClick={() => setDraft(name)}
            className="grid size-6 shrink-0 place-items-center rounded-[6px] text-muted transition-colors duration-150 hover:bg-hover hover:text-ink"
          >
            <PencilIcon />
          </button>
        </>
      ) : (
        <input
          autoFocus
          value={draft}
          size={Math.max(draft.length, 8)}
          aria-label="Automation name"
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key !== "Enter" && e.key !== "Escape") return;
            refocus.current = true;
            if (e.key === "Enter") commit();
            else setDraft(null);
          }}
          className="mr-2 min-w-0 bg-transparent text-[13.5px] font-semibold outline-none"
        />
      )}
    </div>
  );
}
