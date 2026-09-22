import { useEffect, useRef } from "react";
import IconButton from "./IconButton";

export default function Drawer({ open, onClose, title, children, footer }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const raf = requestAnimationFrame(() => panelRef.current?.focus());

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      previousFocus?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Navigasi"}
        tabIndex={-1}
        className="absolute inset-y-0 left-0 flex w-[300px] max-w-[85vw] flex-col bg-surface-card shadow-modal outline-none animate-fade-in"
      >
        {title && (
          <div className="flex items-center justify-between border-b border-surface-divider px-4 py-3.5">
            <span className="text-sm font-bold text-txt">{title}</span>
            <IconButton icon="x" label="Tutup menu" onClick={onClose} />
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="border-t border-surface-divider p-4">{footer}</div>}
      </div>
    </div>
  );
}
