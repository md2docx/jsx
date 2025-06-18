import { AlignmentType, IBorderOptions, IBordersOptions, BorderStyle } from "docx";
import { Data, RootContent } from "mdast2docx";
import { CSSProperties } from "react";

export const uuid = () => crypto.randomUUID();

const alignmentMap: Record<
  (typeof AlignmentType)[keyof typeof AlignmentType],
  CSSProperties["textAlign"]
> = {
  [AlignmentType.START]: "start",
  [AlignmentType.CENTER]: "center",
  [AlignmentType.END]: "end",
  [AlignmentType.JUSTIFIED]: "justify",
  [AlignmentType.MEDIUM_KASHIDA]: "justify",
  [AlignmentType.DISTRIBUTE]: "justify",
  [AlignmentType.NUM_TAB]: "justify",
  [AlignmentType.HIGH_KASHIDA]: "justify",
  [AlignmentType.LOW_KASHIDA]: "justify",
  [AlignmentType.THAI_DISTRIBUTE]: "justify",
  [AlignmentType.LEFT]: "left",
  [AlignmentType.RIGHT]: "right",
};

type BorderStyle =
  | "none"
  | "hidden"
  | "dotted"
  | "dashed"
  | "solid"
  | "double"
  | "groove"
  | "ridge"
  | "inset"
  | "outset";

const borderStyleMap: Record<(typeof BorderStyle)[keyof typeof BorderStyle], BorderStyle> = {
  single: "solid",
  dashDotStroked: "dashed",
  dashed: "dashed",
  dashSmallGap: "dashed",
  dotDash: "dashed",
  dotDotDash: "dashed",
  dotted: "dotted",
  double: "double",
  doubleWave: "double",
  inset: "inset",
  nil: "none",
  none: "none",
  outset: "outset",
  thick: "solid",
  thickThinLargeGap: "double",
  thickThinMediumGap: "double",
  thickThinSmallGap: "double",
  thinThickLargeGap: "double",
  thinThickMediumGap: "double",
  thinThickSmallGap: "double",
  thinThickThinLargeGap: "double",
  thinThickThinMediumGap: "double",
  thinThickThinSmallGap: "double",
  threeDEmboss: "ridge",
  threeDEngrave: "inset",
  triple: "double",
  wave: "solid",
};

export const createStylesFromData = (data: Data): CSSProperties => {
  const styles = {} as CSSProperties;
  const border = data.border as IBordersOptions & IBorderOptions;

  if (data.alignment) styles.textAlign = alignmentMap[data.alignment];
  if (data.bold) styles.fontWeight = "bold";
  if (data.italics) styles.fontStyle = "italic";
  if (data.underline) styles.textDecoration = "underline";
  if (data.emphasisMark) {
    if (data.tag) styles.fontStyle = "italic";
    else data.tag = "em";
  }
  if (data.strike) styles.textDecoration = "line-through";
  if (data.allCaps) styles.textTransform = "uppercase";
  if (data.smallCaps) styles.textTransform = "lowercase";
  if (data.superScript) data.tag = "sup";
  if (data.subScript) data.tag = "sub";
  if (data.color) styles.color = `#${data.color}`;
  if (data.highlight) styles.background = `#${data.highlight}`;
  if (data.frame) styles.border = "1px solid currentColor";
  if (data.pre) data.tag = "pre";

  if (border) {
    const borderStyle = data.style?.split("border:")[1];
    if (borderStyle) {
      styles.border = borderStyle.split(";")[0];
    } else if ((border as IBorderOptions).style) {
      // Single border
      styles.border = `${border.size ?? 1}px ${borderStyleMap[border.style] ?? "solid"} ${border.color}`;
    } else {
      if (border.top)
        styles.borderTop = `${border.top.size ?? 1}px ${borderStyleMap[border.top.style] ?? "solid"} ${border.top.color}`;
      if (border.bottom)
        styles.borderBottom = `${border.bottom.size ?? 1}px ${borderStyleMap[border.bottom.style] ?? "solid"} ${border.bottom.color}`;
      if (border.right)
        styles.borderRight = `${border.right.size ?? 1}px ${borderStyleMap[border.right.style] ?? "solid"} ${border.right.color}`;
      if (border.left)
        styles.borderLeft = `${border.left.size ?? 1}px ${borderStyleMap[border.left.style] ?? "solid"} ${border.left.color}`;
    }
  }

  return styles;
};

export const mdast2HtmlTagMap: Record<
  Exclude<
    RootContent["type"],
    | "heading"
    | "list"
    | ""
    | "html"
    | "definition"
    | "footnoteDefinition"
    | "yaml"
    | "footnoteReference"
    | "imageReference"
    | "linkReference"
    | "fragment"
    | "svg"
    | "empty"
  >,
  keyof HTMLElementTagNameMap
> = {
  paragraph: "p",
  break: "br",
  checkbox: "input",
  thematicBreak: "hr",
  listItem: "li",
  table: "table",
  tableRow: "tr",
  tableCell: "td",
  text: "span",
  emphasis: "em",
  strong: "strong",
  delete: "s",
  link: "a",
  image: "img",
  inlineCode: "code",
  code: "pre",
  blockquote: "blockquote",
};

export const emptyHtmlTags: (keyof (HTMLElementTagNameMap & SVGElementTagNameMap))[] = [
  "br",
  "hr",
  "img",
  "input",
];

/**
 * Converts a raw SVG string into a base64-encoded data URL.
 */
export const svgToBase64DataUrl = (svg: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const reader = new FileReader();

    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;

    reader.readAsDataURL(blob);
  });
};
