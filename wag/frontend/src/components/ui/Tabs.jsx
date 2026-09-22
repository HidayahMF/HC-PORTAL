import { useId, useRef } from "react";
import Icon from "./Icon";

export default function Tabs({ items, active, onChange, ariaLabel, size = "md" }) {
  const listRef = useRef(null);
  const panelId = useId();

  const onKeyDown = (e, key) => {        const idx = items.findIndex((t) => t.key === key);
        let next;
    if (e.key === "ArrowRight") next = items[(idx + 1) % items.length].key;
    else if (e.key === "ArrowLeft") next = items[(idx - 1 + items.length) % items.length].key;
    else if (e.key === "Home") next = items[0].key;
    else if (e.key === "End") next = items[items.length - 1].key;
    else return;

    e.preventDefault();
    onChange(next);
    const el = listRef.current?.querySelector(`#tab-${next}`);
    el?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      ref={listRef}
      className="flex gap-1 overflow-x-auto rounded-xl bg-surface-muted p-1"
    >
      {items.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            id={`tab-${tab.key}`}
            role="tab"
            aria-selected={isActive}
            aria-controls={`${panelId}-panel`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.key)}
            onKeyDown={(e) => onKeyDown(e, tab.key)}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand ${
              size === "md" ? "px-4 py-2 text-[13px]" : "px-3 py-1.5 text-xs"
            } ${isActive ? "bg-surface-card text-brand shadow-sm" : "text-txt-muted hover:text-txt"}`}
          >
            {tab.icon && <Icon name={tab.icon} size={15} />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
