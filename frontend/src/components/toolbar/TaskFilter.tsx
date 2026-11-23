import { useState } from 'react';
import { IoSearch } from 'react-icons/io5';
import { ToolbarButton } from './ToolbarButton';

type TaskFilterProps = {
  query: string;
  onQueryChange: (value: string) => void;
};

export function TaskFilter({ query, onQueryChange }: TaskFilterProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  function handleToggle() {
    if (searchOpen) onQueryChange('');
    setSearchOpen(!searchOpen);
  }

  return (
    <div
      className={`flex items-center rounded-[14px] transition-colors duration-200 ${
        searchOpen ? 'bg-hover-warm' : 'bg-transparent'
      }`}
    >
      <ToolbarButton
        onClick={handleToggle}
        label="Filter tasks"
        active={searchOpen}
      >
        <IoSearch size={19} />
      </ToolbarButton>

      <div
        className={`overflow-hidden transition-[width] duration-320 ease-[cubic-bezier(.24,1.05,.32,1)] ${searchOpen ? 'w-40.5' : 'w-0'}`}
      >
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && searchOpen) handleToggle();
          }}
          placeholder="Filter tasks"
          aria-label="Filter tasks"
          className="w-37.5 border-none bg-transparent py-2.5 pr-3 pl-0.5 text-[15px] text-ink outline-none"
        />
      </div>
    </div>
  );
}
