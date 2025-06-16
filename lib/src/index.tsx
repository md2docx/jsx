import { OutputType } from "docx";
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
import { FC, Fragment, HTMLProps, RefObject, useEffect, useState } from "react";
import remarkParse from "remark-parse";
import { PluggableList, unified } from "unified";
import { createStylesFromData, emptyHtmlTags, mdast2HtmlTagMap, uuid } from "./utils";
import { ErrorBoundary } from "react-error-boundary";

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

interface MdProps {
  node: RootContent;
  components?: Partial<Record<keyof (HTMLElementTagNameMap & SVGElementTagNameMap), FC>>;
}

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

  const TBody =
    tag === "table" && (node as Parent).children?.[0].type === "tableRow" ? "tbody" : Fragment;

  return (
    <ErrorBoundary fallback="something went wrong here" onError={console.error}>
      {tag && emptyHtmlTags.includes(tag) ? (
        // @ts-expect-error -- too complex props
        <TagComponent {...props} node={node} />
      ) : (
        // @ts-expect-error -- too complex props
        <TagComponent {...props} node={node}>
          <TBody>
            {(node as Parent).children?.map(node1 => <Md node={node1} key={uuid()} />) ??
              (node as Literal).value}
          </TBody>
        </TagComponent>
      )}
    </ErrorBoundary>
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
