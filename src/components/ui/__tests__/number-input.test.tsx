import { createElement, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NumberInput } from "@/components/ui/number-input";

function CurrencyHarness({ initialValue = 54000 }: { initialValue?: number }) {
  const [value, setValue] = useState(initialValue);

  return createElement(
    "div",
    null,
    createElement("label", { htmlFor: "currency-input" }, "Annual expenses"),
    createElement(NumberInput, {
      id: "currency-input",
      value,
      onValueChange: setValue,
      inputMode: "numeric",
    }),
    createElement("output", { "data-testid": "committed-value" }, value),
  );
}

function DecimalHarness({ initialValue = 0.035 }: { initialValue?: number }) {
  const [value, setValue] = useState(initialValue);

  return createElement(
    "div",
    null,
    createElement(
      "label",
      { htmlFor: "decimal-input" },
      "Safer withdrawal rate",
    ),
    createElement(NumberInput, {
      id: "decimal-input",
      value,
      onValueChange: setValue,
      inputMode: "decimal",
    }),
    createElement("output", { "data-testid": "decimal-value" }, value),
  );
}

function BoundedHarness({
  initialValue = 34,
  min = 18,
  max = 80,
}: {
  initialValue?: number;
  min?: number;
  max?: number;
}) {
  const [value, setValue] = useState(initialValue);

  return createElement(
    "div",
    null,
    createElement("label", { htmlFor: "bounded-input" }, "Age"),
    createElement(NumberInput, {
      id: "bounded-input",
      value,
      onValueChange: setValue,
      inputMode: "numeric",
      min,
      max,
    }),
    createElement("output", { "data-testid": "bounded-value" }, value),
  );
}

describe("NumberInput", () => {
  it("allows clearing a field temporarily without forcing an immediate reset", () => {
    render(createElement(CurrencyHarness));

    const input = screen.getByLabelText("Annual expenses");
    const committedValue = screen.getByTestId("committed-value");

    fireEvent.change(input, { target: { value: "" } });

    expect(input).toHaveValue("");
    expect(committedValue).toHaveTextContent("54000");
  });

  it("lets users replace an existing value naturally", () => {
    render(createElement(CurrencyHarness));

    const input = screen.getByLabelText("Annual expenses");
    const committedValue = screen.getByTestId("committed-value");

    fireEvent.change(input, { target: { value: "" } });
    fireEvent.change(input, { target: { value: "60000" } });

    expect(input).toHaveValue("60000");
    expect(committedValue).toHaveTextContent("60000");
  });

  it("preserves intermediate decimal typing while committing valid values", () => {
    render(createElement(DecimalHarness));

    const input = screen.getByLabelText("Safer withdrawal rate");
    const committedValue = screen.getByTestId("decimal-value");

    fireEvent.change(input, { target: { value: "0." } });
    expect(input).toHaveValue("0.");
    expect(committedValue).toHaveTextContent("0");

    fireEvent.change(input, { target: { value: "0.037" } });
    expect(input).toHaveValue("0.037");
    expect(committedValue).toHaveTextContent("0.037");
  });

  it("reverts to the last committed value on blur when left blank", () => {
    render(createElement(CurrencyHarness));

    const input = screen.getByLabelText("Annual expenses");

    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);

    expect(input).toHaveValue("54000");
  });

  it("clamps committed values to the configured min and max", () => {
    render(createElement(BoundedHarness));

    const input = screen.getByLabelText("Age");
    const committedValue = screen.getByTestId("bounded-value");

    fireEvent.change(input, { target: { value: "120" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("80");
    expect(committedValue).toHaveTextContent("80");

    fireEvent.change(input, { target: { value: "12" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("18");
    expect(committedValue).toHaveTextContent("18");
  });
});
