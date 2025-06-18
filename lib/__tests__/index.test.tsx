import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, test } from "vitest";
import Markdown from "..";
import React from "react";
import md from "../../sample.md?raw";

// ../__tests__/index.test.tsx

describe.concurrent("Markdown", () => {
  afterEach(cleanup);

  test("renders simple markdown text", ({ expect }) => {
    render(<Markdown>hello **world**</Markdown>);
    expect(screen.getByText("hello")).toBeInTheDocument();
    expect(screen.getByText("world")).toBeInTheDocument();
  });

  test("render sample.md", () => {
    render(<Markdown>{md}</Markdown>);
  });

  test("renders headings", ({ expect }) => {
    render(<Markdown>{"# Heading 1\n## Heading 2"}</Markdown>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Heading 1");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Heading 2");
  });

  test("renders lists", ({ expect }) => {
    render(<Markdown>{"- item 1\n- item 2"}</Markdown>);
    expect(screen.getByText("item 1")).toBeInTheDocument();
    expect(screen.getByText("item 2")).toBeInTheDocument();
  });

  test("renders images", ({ expect }) => {
    render(<Markdown>{"![alt text](img.png)"}</Markdown>);
    const img = screen.getByAltText("alt text");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "img.png");
  });

  test("renders code blocks", ({ expect }) => {
    render(<Markdown>{"```js\nconsole.log('hi')\n```"}</Markdown>);
    expect(screen.getByText("console.log('hi')")).toBeInTheDocument();
  });

  test("renders with custom components", ({ expect }) => {
    const CustomH1 = ({ children }: { children: React.ReactNode }) => (
      <h1 data-testid="custom">{children}</h1>
    );
    render(<Markdown components={{ h1: CustomH1 }}>{"# Custom Heading"}</Markdown>);
    expect(screen.getByTestId("custom")).toHaveTextContent("Custom Heading");
  });

  test("handles empty input", ({ expect }) => {
    const { container } = render(<Markdown>{""}</Markdown>);
    expect(container).toBeEmptyDOMElement();
  });

  test("renders checkboxes", ({ expect }) => {
    render(<Markdown>{"- [x] checked\n- [ ] unchecked"}</Markdown>);
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
  });

  test("shows error boundary fallback UI", ({ expect }) => {
    const BadComponent = () => {
      throw new Error("fail");
    };
    render(<Markdown components={{ p: BadComponent }}>{"paragraph"}</Markdown>);
    expect(screen.getByText(/unknown error/i)).toBeInTheDocument();
  });
});
