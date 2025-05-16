import { describe, it, vi } from "vitest";
import { toDocx } from "@m2d/core"; // Adjust path based on your setup
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import fs from "fs";
import { emojiPlugin } from "../src";

const markdown = fs.readFileSync("../sample.md", "utf-8");

/**
 * concurrently run unit tests.
 */
describe.concurrent("toDocx", () => {
  const mdast = unified().use(remarkParse).use(remarkGfm).parse(markdown);

  /**
   * Intentionally combining two tests in one as docx generation could be resource consuming, especially for very large files.
   */
  it("should handle emoji and should not have any console.log", async ({ expect }) => {
    const consoleSpy = vi.spyOn(console, "log");
    const docxBlob = await toDocx(mdast, {}, { plugins: [emojiPlugin()] });
    expect(consoleSpy).not.toHaveBeenCalled();
    expect(docxBlob).toBeInstanceOf(Blob);
  });
});
