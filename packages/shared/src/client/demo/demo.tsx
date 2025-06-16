"use client";

import md from "../../../../../sample.md?raw";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import remarkMath from "remark-math";
import styles from "./demo.module.scss";
import Markdown from "@m2d/jsx";
import {
  tablePlugin,
  listPlugin,
  mathPlugin,
  imagePlugin,
  htmlPlugin,
  mermaidPlugin,
  emojiPlugin,
} from "mdast2docx/dist/plugins";

/** React live demo */
export function Demo() {
  return (
    <div className={styles.demo}>
      <h1>MDAST (Markdown Abstract Syntax Tree) to DOCX</h1>
      <div className={styles.md}>
        <Markdown
          remarkPlugins={[remarkGfm, remarkFrontmatter, remarkMath]}
          docxPlugins={[
            htmlPlugin(),
            mermaidPlugin(),
            tablePlugin(),
            listPlugin(),
            emojiPlugin(),
            mathPlugin(),
            imagePlugin(),
          ]}>
          {md}
        </Markdown>
      </div>
    </div>
  );
}
