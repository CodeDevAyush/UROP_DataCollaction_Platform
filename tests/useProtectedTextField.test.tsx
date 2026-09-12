import { describe, it, expect } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { useProtectedTextField } from "@/lib/hooks/useProtectedTextField";

// getMetadata() reads a ref, not React state (by design — it's read once at
// submit time, not on every keystroke). So the test reads it via an explicit
// "snapshot" button rather than expecting it to appear reactively in JSX.
function TestField({ allowClipboard }: { allowClipboard: boolean }) {
  const field = useProtectedTextField({ allowClipboard });
  const [snapshot, setSnapshot] = useState(0);
  return (
    <div>
      <textarea aria-label="field" {...field.fieldProps} />
      <span data-testid="word-count">{field.wordCount}</span>
      <button onClick={() => setSnapshot(field.getMetadata().pasteAttempts)}>snapshot</button>
      <span data-testid="paste-attempts">{snapshot}</span>
    </div>
  );
}

describe("useProtectedTextField integrity controls", () => {
  it("blocks paste and records a paste attempt when clipboard is disallowed", () => {
    render(<TestField allowClipboard={false} />);
    const textarea = screen.getByLabelText("field") as HTMLTextAreaElement;

    const pasteEvent = new Event("paste", { bubbles: true, cancelable: true });
    const prevented = !fireEvent(textarea, pasteEvent);
    fireEvent.click(screen.getByText("snapshot"));

    expect(prevented).toBe(true);
    expect(textarea.value).toBe("");
    expect(screen.getByTestId("paste-attempts").textContent).toBe("1");
  });

  it("allows paste through when clipboard is explicitly allowed (AI-output field)", () => {
    render(<TestField allowClipboard={true} />);
    const textarea = screen.getByLabelText("field") as HTMLTextAreaElement;

    const pasteEvent = new Event("paste", { bubbles: true, cancelable: true });
    const prevented = !fireEvent(textarea, pasteEvent);
    fireEvent.click(screen.getByText("snapshot"));

    expect(prevented).toBe(false);
    expect(screen.getByTestId("paste-attempts").textContent).toBe("0");
  });

  it("updates the live word count as the participant types", () => {
    render(<TestField allowClipboard={false} />);
    const textarea = screen.getByLabelText("field") as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: "hello world foo" } });

    expect(screen.getByTestId("word-count").textContent).toBe("3");
  });
});
