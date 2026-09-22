import { useId } from "react";
import Icon from "./Icon";

const baseCls =
  "w-full h-10 rounded-lg border border-surface-border bg-white px-3.5 text-sm text-txt placeholder:text-txt-placeholder outline-none transition-all duration-150 focus:border-brand focus:ring-4 focus:ring-brand/10 disabled:bg-surface-muted disabled:cursor-not-allowed";

export default function Input({ label, hint, error, icon, rightElement, id, className = "", ...rest }) {
  const autoId = useId();
  const inputId = id || autoId;
  const errorId = `${inputId}-error`;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-medium text-txt-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-txt-placeholder">
            <Icon name={icon} size={16} />
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? `${inputId}-hint` : undefined}
          className={`${baseCls} ${icon ? "pl-9" : ""} ${rightElement ? "pr-10" : ""} ${error ? "border-danger focus:border-danger focus:ring-danger/10" : ""}`}
          {...rest}
        />
        {rightElement && (
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2">{rightElement}</span>
        )}
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 flex items-center gap-1 text-xs text-danger">
          <Icon name="alert-circle" size={13} /> {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-txt-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
