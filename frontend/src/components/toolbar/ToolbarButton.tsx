import type { ReactNode } from 'react';

type ToolbarButtonProps = {
  onClick: () => void;
  children: ReactNode;
  label: string;
  active?: boolean;
};

export function ToolbarButton({
  onClick,
  children,
  label,
  active = false,
}: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`grid h-10.5 w-10.5 place-items-center rounded-[14px] transition-colors duration-180 hover:bg-hover-warm hover:text-ink ${active ? 'text-ink bg-hover-warm' : 'text-ink-mute'}`}
    >
      {children}
    </button>
  );
}
