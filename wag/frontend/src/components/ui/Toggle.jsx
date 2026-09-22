import { useId } from "react";

export default function Toggle({ checked, onChange, label, disabled, size = "md", className = "" }) {
  const autoId = useId();
  const toggleId = autoId;
  const dims = size === "lg" ? "h-7 w-12" : "h-6 w-10";
  const knob = size === "lg" ? "h-5 w-5 left-[4px] peer-checked:translate-x-5" : "h-4 w-4 left-[3px] peer-checked:translate-x-4";

  return (
    <label
      htmlFor={toggleId}
      className={`inline-flex items-center gap-2.5 select-none ${disabled ? "opacity-50" : "cursor-pointer"} ${className}`}
    >
      <input
        id={toggleId}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`relative inline-flex ${dims} shrink-0 rounded-full border-none transition-colors duration-200 ${
          checked ? "bg-brand" : "bg-slate-300"
        } peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand`}
      >
        <span
          className={`absolute top-1/2 -translate-y-1/2 ${knob} rounded-full bg-white shadow transition-transform duration-200`}
        />
      </span>
      {label && <span className="text-sm text-txt">{label}</span>}
    </label>
  );
}
