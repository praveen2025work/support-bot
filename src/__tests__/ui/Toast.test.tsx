/**
 * @jest-environment jsdom
 */
import { render, screen, act } from "@testing-library/react";
import { ToastProvider, useToast } from "@/components/ui/Toast";

function ToastTrigger() {
  const { addToast } = useToast();
  return (
    <div>
      <button onClick={() => addToast({ type: "success", message: "Saved!" })}>
        Success
      </button>
      <button
        onClick={() =>
          addToast({
            type: "error",
            message: "Failed!",
            action: { label: "Retry", onClick: jest.fn() },
          })
        }
      >
        Error
      </button>
      <button
        onClick={() => addToast({ type: "warning", message: "Watch out" })}
      >
        Warning
      </button>
    </div>
  );
}

describe("Toast", () => {
  it("shows a success toast", () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );
    act(() => screen.getByText("Success").click());
    expect(screen.getByText("Saved!")).toBeInTheDocument();
  });

  it("shows an error toast with action", () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );
    act(() => screen.getByText("Error").click());
    expect(screen.getByText("Failed!")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("auto-dismisses success toast", () => {
    jest.useFakeTimers();
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );
    act(() => screen.getByText("Success").click());
    expect(screen.getByText("Saved!")).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(6000));
    expect(screen.queryByText("Saved!")).not.toBeInTheDocument();
    jest.useRealTimers();
  });

  it("does NOT auto-dismiss error toast", () => {
    jest.useFakeTimers();
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );
    act(() => screen.getByText("Error").click());
    act(() => jest.advanceTimersByTime(10000));
    expect(screen.getByText("Failed!")).toBeInTheDocument();
    jest.useRealTimers();
  });
});
