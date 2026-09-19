type ToolbarProps = {
  draft: string;
  onDraftChange: (value: string) => void;
  onAddTask: () => void;
  searchOpen: boolean;
  onToggleSearch: () => void;
  query: string;
  onQueryChange: (value: string) => void;
  onRecenter: () => void;
  onFitAll: () => void;
};

export function Toolbar({
  draft,
  onDraftChange,
  onAddTask,
  searchOpen,
  onToggleSearch,
  query,
  onQueryChange,
  onRecenter,
  onFitAll,
}: ToolbarProps) {
  return (
    <div
      className="fixed bottom-7 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1.5 rounded-[20px] border-[1.5px] border-surface-edge bg-cloud/92 p-2 shadow-[0_10px_30px_rgba(170,120,60,.14),0_2px_5px_rgba(170,120,60,.08)] backdrop-blur-[8px]"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2.5 py-0 pr-1.5 pl-3.5">
        <svg width="19" height="19" viewBox="0 0 22 22" fill="none" stroke="#EDB648" strokeWidth="2.4" strokeLinecap="round">
          <path d="M11 4v14M4 11h14" />
        </svg>
        <input
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onAddTask();
          }}
          placeholder="New task"
          className="w-[230px] border-none bg-transparent py-2.5 font-sans text-base font-medium text-ink outline-none"
        />
      </div>

      <button
        onClick={onAddTask}
        title="Add task"
        className="flex h-[42px] items-center gap-2 rounded-[14px] bg-done px-[18px] text-[15px] font-semibold text-white transition-all duration-180 hover:brightness-105 active:translate-y-px"
      >
        <svg width="15" height="15" viewBox="0 0 12 12" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 6.4 4.7 9 10 3.2" />
        </svg>
        Add
      </button>

      <span className="mx-1 h-[26px] w-[1.5px] bg-surface-edge" />

      <div
        className="flex items-center rounded-[14px] transition-colors duration-200"
        style={{ background: searchOpen ? '#FFF3E6' : 'transparent' }}
      >
        <button
          onClick={onToggleSearch}
          title="Search tasks"
          className="grid h-[42px] w-[42px] place-items-center rounded-[14px] transition-colors duration-180 hover:bg-hover-warm hover:text-ink"
          style={{ color: searchOpen ? '#1D1712' : '#B79A78' }}
        >
          <svg width="19" height="19" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
            <circle cx="9.6" cy="9.6" r="6.4" />
            <path d="m14.4 14.4 4.4 4.4" />
          </svg>
        </button>
        <div
          className="overflow-hidden transition-[width] duration-320 ease-[cubic-bezier(.24,1.05,.32,1)]"
          style={{ width: searchOpen ? 162 : 0 }}
        >
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                onQueryChange('');
                if (searchOpen) onToggleSearch();
              }
            }}
            placeholder="Filter tasks"
            className="w-[150px] border-none bg-transparent py-2.5 pr-3 pl-0.5 text-[15px] text-ink outline-none"
          />
        </div>
      </div>

      <button
        onClick={onRecenter}
        title="Recenter canvas"
        className="grid h-[42px] w-[42px] place-items-center rounded-[14px] text-[#B79A78] transition-colors duration-180 hover:bg-hover-warm hover:text-ink"
      >
        <svg width="19" height="19" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
          <circle cx="11" cy="11" r="6.2" />
          <path d="M11 1.6v2.6M11 17.8v2.6M1.6 11h2.6M17.8 11h2.6" />
        </svg>
      </button>

      <button
        onClick={onFitAll}
        title="Fit all tasks"
        className="grid h-[42px] w-[42px] place-items-center rounded-[14px] text-[#B79A78] transition-colors duration-180 hover:bg-hover-warm hover:text-ink"
      >
        <svg width="19" height="19" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8V4.6A1.6 1.6 0 0 1 4.6 3H8M14 3h3.4A1.6 1.6 0 0 1 19 4.6V8M19 14v3.4a1.6 1.6 0 0 1-1.6 1.6H14M8 19H4.6A1.6 1.6 0 0 1 3 17.4V14" />
        </svg>
      </button>
    </div>
  );
}
