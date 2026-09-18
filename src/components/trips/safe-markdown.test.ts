import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SafeMarkdown } from "@/components/trips/safe-markdown";

describe("SafeMarkdown", () => {
  it("renders raw HTML as text instead of executable markup", () => {
    const html = renderToStaticMarkup(
      createElement(SafeMarkdown, null, "<img src=x onerror=alert(1)>"),
    );

    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).not.toContain("<img");
  });

  it("renders only http(s) Markdown links as anchors", () => {
    const html = renderToStaticMarkup(
      createElement(SafeMarkdown, null, "[safe](https://example.com) [unsafe](javascript:alert(1))"),
    );

    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer noopener"');
    expect(html).not.toContain("javascript:");
    expect(html).toContain("unsafe");
  });
});
