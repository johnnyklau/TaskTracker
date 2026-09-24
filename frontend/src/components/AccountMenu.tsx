import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

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
      <button
        onClick={() => setOpen((v) => !v)}
        title="Account"
        className="grid h-[42px] w-[42px] place-items-center rounded-[14px] text-[#B79A78] transition-colors duration-180 hover:bg-hover-warm hover:text-ink"
      >
        <svg
          width="19"
          height="19"
          viewBox="0 0 22 22"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="7.6" r="3.6" />
          <path d="M3.6 19c1.1-3.6 4.2-5.6 7.4-5.6s6.3 2 7.4 5.6" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-[52px] right-0 min-w-[190px] rounded-[14px] border-[1.5px] border-surface-edge bg-cloud/97 p-1.5 shadow-[0_10px_30px_rgba(170,120,60,.14),0_2px_5px_rgba(170,120,60,.08)] backdrop-blur-[8px]">
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
