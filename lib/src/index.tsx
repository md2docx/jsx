import { AlignmentType, OutputType, IBorderOptions, IBordersOptions, BorderStyle } from "docx";
import {
  IPlugin,
  toDocx,
  IDocxProps,
  ISectionProps,
  RootContent,
  Root,
  Parent,
  Literal,
  Heading,
  List,
  RootContentMap,
  Data,
  Checkbox,
  Code,
} from "mdast2docx";
import { CSSProperties, FC, Fragment, HTMLProps, RefObject, useEffect, useState } from "react";
import remarkParse from "remark-parse";
import { PluggableList, unified } from "unified";
import { uuid } from "./utils";

interface ReactMarkdownProps extends HTMLProps<HTMLDivElement> {
  children?: string;
  components?: Partial<Record<keyof HTMLElementTagNameMap, FC>>;
  remarkPlugins?: PluggableList;
  docxProps?: IDocxProps;
  sectionProps?: ISectionProps;
  docxPlugins?: IPlugin[];
  outputType?: OutputType;
  docxRef?: RefObject<
    Promise<
      | string
      | readonly number[]
      | ArrayBuffer
      | Uint8Array<ArrayBufferLike>
      | Blob
      | Buffer<ArrayBufferLike>
    >
  >;
}

const mdast2HtmlTagMap: Record<
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

interface MdProps {
  node: RootContent;
  components?: Partial<Record<keyof (HTMLElementTagNameMap & SVGElementTagNameMap), FC>>;
}

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

const createStylesFromData = (data: Data): CSSProperties => {
  const styles = {} as CSSProperties;
  const border = data.border as IBordersOptions & IBorderOptions;

  if (data.alignment) styles.textAlign = alignmentMap[data.alignment];
  if (data.bold) styles.fontWeight = "bold";
  if (data.italics) styles.fontStyle = "italic";
  if (data.underline) styles.textDecoration = "underline";
  if (data.emphasisMark) data.tag = "em";
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

const Md = ({ node, components }: MdProps) => {
  const data = node.data as Data | undefined;
  const props = {} as HTMLProps<HTMLElement>;
  const type = (node.type || node._type) as keyof RootContentMap;

  props.type = data?.type;
  switch (type) {
    case "checkbox":
      props.defaultChecked = (node as Checkbox).checked;
      break;
    case "code":
      props.className = `language-${(node as Code).lang}`;
      break;
  }
  if (data) props.style = createStylesFromData(data);

  let tag: keyof (HTMLElementTagNameMap & SVGElementTagNameMap) | "" | undefined = data?.tag;

  switch (type) {
    case "heading":
      tag ??= `h${(node as Heading).depth}`;
      break;
    case "list":
      tag ??= (node as List).ordered ? "ol" : "ul";
      break;
    case "html":
    case "definition":
    case "footnoteDefinition":
    case "yaml":
    case "footnoteReference":
    case "imageReference":
    case "linkReference":
      return null;
    case "svg":
      break;
    case "fragment":
    case "empty":
      tag ??= "";
      break;
    default:
      tag ??= mdast2HtmlTagMap[type];
  }

  const TagComponent = tag ? (components?.[tag] ?? tag) : Fragment;

  return (
    // @ts-expect-error -- too complex props
    <TagComponent {...(props, node)}>
      {(node as Parent).children?.map(node1 => <Md node={node1} key={uuid()} />) ??
        (node as Literal).value}
    </TagComponent>
  );
};

const Markdown = ({
  children,
  components,
  remarkPlugins,
  docxProps,
  sectionProps,
  docxPlugins,
  outputType,
  docxRef,
}: ReactMarkdownProps) => {
  const [mdast, setMdast] = useState<Root>();
  useEffect(() => {
    const mdast = unified()
      .use(remarkParse)
      .use(remarkPlugins ?? [])
      .parse(children);
    const docxOutput = toDocx(
      mdast,
      docxProps,
      { ...sectionProps, plugins: [...(sectionProps?.plugins ?? []), ...(docxPlugins ?? [])] },
      outputType,
    );

    setMdast(mdast as Root);
    if (docxRef) docxRef.current = docxOutput;
  }, [children, docxPlugins, docxProps, docxRef, outputType, remarkPlugins, sectionProps]);

  return mdast?.children.map(node => <Md {...{ node, components }} key={uuid()} />);
};

export default Markdown;
