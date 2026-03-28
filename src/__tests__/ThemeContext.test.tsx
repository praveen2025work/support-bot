/**
 * @jest-environment jsdom
 */
import { render, screen, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";

function ThemeDisplay() {
  const { theme, setTheme, isDark, availableThemes } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="isDark">{String(isDark)}</span>
      <span data-testid="themes">{availableThemes.join(",")}</span>
      <button onClick={() => setTheme("dark")}>Dark</button>
      <button onClick={() => setTheme("midnight")}>Midnight</button>
      <button onClick={() => setTheme("ocean")}>Ocean</button>
      <button onClick={() => setTheme("light")}>Light</button>
    </div>
  );
}

describe("ThemeContext", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("defaults to light theme", () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    expect(screen.getByTestId("isDark")).toHaveTextContent("false");
  });

  it("lists all 4 available themes", () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("themes")).toHaveTextContent(
      "light,dark,midnight,ocean",
    );
  });

  it("switches to dark and applies class", () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    act(() => screen.getByText("Dark").click());
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(screen.getByTestId("isDark")).toHaveTextContent("true");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("switches to midnight and applies class", () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    act(() => screen.getByText("Midnight").click());
    expect(screen.getByTestId("theme")).toHaveTextContent("midnight");
    expect(screen.getByTestId("isDark")).toHaveTextContent("true");
    expect(document.documentElement.classList.contains("midnight")).toBe(true);
  });

  it("switches to ocean (light variant)", () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    act(() => screen.getByText("Ocean").click());
    expect(screen.getByTestId("theme")).toHaveTextContent("ocean");
    expect(screen.getByTestId("isDark")).toHaveTextContent("false");
    expect(document.documentElement.classList.contains("ocean")).toBe(true);
  });
});
