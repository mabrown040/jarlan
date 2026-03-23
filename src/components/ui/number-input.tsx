"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const transientNumberStates = new Set(["", "-", ".", "-."]);

function formatNumberValue(value: number) {
  return Number.isFinite(value) ? String(value) : "";
}

function parseBoundaryValue(value: string | number | undefined) {
  if (value === undefined || value === "") {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export interface NumberInputProps
  extends Omit<
    React.ComponentProps<typeof Input>,
    "type" | "value" | "onChange" | "defaultValue"
  > {
  value: number;
  onValueChange: (value: number) => void;
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      value,
      onValueChange,
      onBlur,
      onFocus,
      inputMode = "decimal",
      className,
      min,
      max,
      ...props
    },
    ref,
  ) => {
    const [draftValue, setDraftValue] = React.useState(() =>
      formatNumberValue(value),
    );
    const [isFocused, setIsFocused] = React.useState(false);

    React.useEffect(() => {
      if (!isFocused) {
        setDraftValue(formatNumberValue(value));
      }
    }, [isFocused, value]);

    const commitDraft = React.useCallback(
      (nextValue: string) => {
        const trimmedValue = nextValue.trim();

        if (transientNumberStates.has(trimmedValue)) {
          return null;
        }

        const parsedValue = Number(trimmedValue);

        if (!Number.isFinite(parsedValue)) {
          return null;
        }

        const minValue = parseBoundaryValue(min);
        const maxValue = parseBoundaryValue(max);
        const clampedValue = Math.min(
          maxValue ?? Number.POSITIVE_INFINITY,
          Math.max(parsedValue, minValue ?? Number.NEGATIVE_INFINITY),
        );

        onValueChange(clampedValue);
        return clampedValue;
      },
      [max, min, onValueChange],
    );

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        min={min}
        max={max}
        inputMode={inputMode}
        className={cn("font-mono tabular-nums", className)}
        value={draftValue}
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        onChange={(event) => {
          const nextValue = event.target.value;
          if (!isFocused) {
            setIsFocused(true);
          }
          setDraftValue(nextValue);
          commitDraft(nextValue);
        }}
        onBlur={(event) => {
          setIsFocused(false);

          const committedValue = commitDraft(draftValue);

          if (committedValue === null) {
            setDraftValue(formatNumberValue(value));
          } else {
            setDraftValue(formatNumberValue(committedValue));
          }

          onBlur?.(event);
        }}
      />
    );
  },
);

NumberInput.displayName = "NumberInput";

export { NumberInput };
