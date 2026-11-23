import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { ToolbarButton } from './ToolbarButton';
import { IoPersonOutline } from 'react-icons/io5';

export function AccountMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () =>
      document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [open]);

  function handleLogout() {
    setOpen(false);
    logout();
  }

  if (!user) return null;

  return (
    <div ref={containerRef} className="relative">
      <ToolbarButton
        onClick={() => setOpen((v) => !v)}
        label="Account"
        active={open}
      >
        <IoPersonOutline size={19} />
      </ToolbarButton>

      {open && (
        <div className="absolute bottom-13 right-0 min-w-47.5 rounded-[14px] border-[1.5px] border-surface-edge bg-cloud/97 p-1.5 shadow-[0_10px_30px_rgba(170,120,60,.14),0_2px_5px_rgba(170,120,60,.08)] backdrop-blur-sm">
          <div className="truncate px-2.5 py-2 text-[13px] font-medium text-ink-mute">
            {user.email}
          </div>
          <span className="my-1 block h-[1.5px] w-full bg-surface-edge" />
          <button
            onClick={handleLogout}
            className="w-full rounded-[10px] px-2.5 py-2 text-left text-[14px] font-medium text-ink-soft transition-colors duration-150 hover:bg-hover-warm"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
