"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

interface ChipSelectorProps {
  label: string;
  description?: string;
  options: readonly { readonly value: string; readonly label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  /** Class for the wrapper — admin vs partner styling */
  inputClassName?: string;
  /** Whether to show the required asterisk */
  required?: boolean;
}

export function ChipSelector({
  label,
  description,
  options,
  value,
  onChange,
  inputClassName = "",
  required = false,
}: ChipSelectorProps) {
  const [customInput, setCustomInput] = useState("");

  const knownValues = options.map((o) => o.value);
  const customValues = value.filter((v) => !knownValues.includes(v));

  function toggle(val: string) {
    if (value.includes(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
  }

  function addCustom() {
    const trimmed = customInput.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setCustomInput("");
  }

  function removeCustom(val: string) {
    onChange(value.filter((v) => v !== val));
  }

  return (
    <div>
      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-xs text-muted-foreground font-medium">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
      </div>
      {description && (
        <p className="text-[10px] text-muted-foreground mb-2">{description}</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const isSelected = value.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors duration-200 ${
                isSelected
                  ? "bg-[#45636b] text-white border-[#45636b]"
                  : "bg-surface-container-low text-muted-foreground border-surface-container-high hover:border-primary/30"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
        {/* Custom values as removable chips */}
        {customValues.map((val) => (
          <span
            key={val}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-[#45636b] text-white border border-[#45636b]"
          >
            {val}
            <button
              type="button"
              onClick={() => removeCustom(val)}
              className="ml-0.5 hover:text-red-300 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      {/* Custom "Other" input */}
      <div className="flex items-center gap-2 mt-2">
        <Input
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Other..."
          className={`h-8 text-xs max-w-[200px] ${inputClassName}`}
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!customInput.trim()}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium border border-surface-container-high text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>
    </div>
  );
}
