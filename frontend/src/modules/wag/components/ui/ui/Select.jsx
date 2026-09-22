import { useId } from "react";
import Icon from "./Icon";

export default function Select({ label, hint, error, options = [], id, className = "", placeholder, ...rest }) {
  const autoId = useId();
  const selectId = id || autoId;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-[13px] font-medium text-txt-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={`h-10 w-full appearance-none rounded-lg border border-surface-border bg-white pl-3.5 pr-9 text-sm text-txt outline-none transition-all duration-150 focus:border-brand focus:ring-4 focus:ring-brand/10 disabled:bg-surface-muted disabled:cursor-not-allowed ${error ? "border-danger" : ""}`}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => {
            const value = typeof opt === "object" ? opt.value : opt;
            const labelText = typeof opt === "object" ? opt.label : opt;
            return (
              <option key={value} value={value}>
                {labelText}
              </option>
            );
          })}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-txt-muted">
          <Icon name="chevron-down" size={16} />
        </span>
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-txt-muted">{hint}</p>
      ) : null}
    </div>
  );
}
