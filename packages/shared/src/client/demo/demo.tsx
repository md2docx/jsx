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
import { useRef } from "react";

/** React live demo */
export function Demo() {
  const docxRef = useRef<Promise<string | ArrayBuffer | Blob | Buffer>>(undefined);
  return (
    <div className={styles.demo}>
      <h1>MDAST (Markdown Abstract Syntax Tree) to DOCX</h1>
      <button
        onClick={() =>
          docxRef.current?.then(blob => {
            const url = URL.createObjectURL(blob as Blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "document.docx";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          })
        }>
        Download Docx
      </button>
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
          ]}
          docxRef={docxRef}>
          {md}
        </Markdown>
      </div>
    </div>
  );
}
