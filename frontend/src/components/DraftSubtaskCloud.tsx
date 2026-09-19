import { useEffect, useRef, useState } from 'react';
import { CloudShape } from './CloudShape';
import { CLOUD_ASPECT_RATIO, SUB_CLOUD_WIDTH } from './canvasConstants';

type DraftSubtaskCloudProps = {
  originX: number;
  originY: number;
  /** Offset from the parent task's center — matches the DB default (180, -140) so a newly-created subtask doesn't jump position. */
  dx: number;
  dy: number;
  onCommit: (title: string) => void;
  onCancel: () => void;
};

/**
 * Not a real subtask yet — nothing is created until the user actually types
 * a title and confirms. Blurring or clicking away with no text just
 * discards it, so an empty-titled subtask never has to round-trip the API
 * (which would reject it anyway).
 */
export function DraftSubtaskCloud({ originX, originY, dx, dy, onCommit, onCancel }: DraftSubtaskCloudProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const settledRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function settle() {
    if (settledRef.current) return;
    settledRef.current = true;
    const trimmed = value.trim();
    if (trimmed) onCommit(trimmed);
    else onCancel();
  }

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{
        left: originX + dx,
        top: originY + dy,
        width: SUB_CLOUD_WIDTH,
        aspectRatio: CLOUD_ASPECT_RATIO,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <CloudShape strokeClassName="stroke-outline-sub" className="animate-pulse" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-[14%] text-center">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={settle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            } else if (e.key === 'Escape') {
              settledRef.current = true;
              onCancel();
            }
          }}
          placeholder="Subtask title"
          className="pointer-events-auto w-full border-none bg-transparent text-center text-[14px] leading-[1.32] font-medium text-ink outline-none placeholder:text-ink-mute"
        />
      </div>
    </div>
  );
}
