import { useEffect, useId, useRef, useState } from "react";

export default function Dropdown({ trigger, children, align = "right", width = "w-60", label }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      {trigger({ onClick: () => setOpen((v) => !v), open, ariaExpanded: open, ariaControls: menuId, ariaLabel: label })}
      {open && (
        <div
          id={menuId}
          role="menu"
          className={`absolute top-full z-40 mt-2 ${align === "right" ? "right-0" : "left-0"} ${width} rounded-xl border border-surface-border bg-surface-card p-1.5 shadow-popover animate-fade-in`}
        >
          {children({ close: () => setOpen(false) })}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ icon, children, onClick, close, danger = false, className = "" }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        onClick?.();
        close?.();
      }}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors duration-100 ${
        danger ? "text-danger hover:bg-danger-soft" : "text-txt-secondary hover:bg-surface-muted hover:text-txt"
      } ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="truncate">{children}</span>
    </button>
  );
}
