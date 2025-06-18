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
  SVG,
  Image,
} from "mdast2docx";
import { FC, Fragment, HTMLProps, RefObject, useEffect, useState } from "react";
import remarkParse from "remark-parse";
import { PluggableList, unified } from "unified";
import {
  createStylesFromData,
  emptyHtmlTags,
  mdast2HtmlTagMap,
  svgToBase64DataUrl,
  uuid,
} from "./utils";
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

interface SVGProps {
  node: SVG;
  components?: Partial<Record<keyof (HTMLElementTagNameMap & SVGElementTagNameMap), FC>>;
  props?: HTMLProps<HTMLElement>;
}

const SVGComponent = ({ node, components, props }: SVGProps) => {
  const [jsx, setJsx] = useState(<i>loading...</i>);
  useEffect(() => {
    (async () => {
      const svg = typeof node.value === "string" ? node.value : (await node.value)?.svg;
      if (components?.svg) {
        // @ts-expect-error -- complex props
        setJsx(<components.svg {...props} svg={svg} />);
      } else {
        // @ts-expect-error -- complex props
        setJsx(svg ? <img src={await svgToBase64DataUrl(svg)} {...props} /> : <></>);
      }
    })();
  }, [components, node, props]);
  return jsx;
};

const Md = ({ node, components }: MdProps) => {
  const data = node.data as Data | undefined;
  const props = {} as HTMLProps<HTMLElement> & { node?: RootContent };
  const type = (node.type || node._type) as keyof RootContentMap;

  if (data) props.style = createStylesFromData(data);
  props.type = data?.type;

  switch (type) {
    case "checkbox":
      props.defaultChecked = (node as Checkbox).checked;
      break;
    case "code":
      props.className = `language-${(node as Code).lang}`;
      break;
  }

  let tag: keyof (HTMLElementTagNameMap & SVGElementTagNameMap) | "" | undefined = data?.tag;

  switch (type) {
    // @ts-expect-error -- available if using remark-math
    case "math":
    // @ts-expect-error -- available if using remark-math
    // eslint-disable-next-line no-fallthrough
    case "inlineMath":
      console.log(node);
      tag ||= "code";
      break;
    case "heading":
      tag ||= `h${(node as Heading).depth}`;
      break;
    case "list":
      tag ||= (node as List).ordered ? "ol" : "ul";
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
      tag ||= "svg";
      break;
    case "fragment":
    case "empty":
      tag ||= "";
      break;
    default:
      tag ||= mdast2HtmlTagMap[type];
  }

  const children =
    (node as Parent).children?.map(node1 => <Md node={node1} key={uuid()} />) ??
    (node as Literal).value;

  if (!tag) return <Fragment>{children}</Fragment>;

  const TagComponent = components?.[tag] ?? tag;

  if (typeof TagComponent !== "string") props.node = node;

  const TBody =
    tag === "table" && (node as Parent).children?.[0].type === "tableRow" ? "tbody" : Fragment;

  if (tag === "img") {
    props.src = (node as Image).url;
    props.alt = (node as Image).alt ?? "";
  }

  return node.type === "svg" ? (
    <SVGComponent {...{ node: node as SVG, components, props }} />
  ) : (
    <ErrorBoundary
      fallback={<i>⚠ unknown error!</i>}
      onError={(error, info) => {
        console.error(error);
        console.info(info);
        console.debug("node: ", node);
      }}>
      {typeof TagComponent === "string" && tag && emptyHtmlTags.includes(tag) ? (
        // @ts-expect-error -- too complex props
        <TagComponent {...props} />
      ) : (
        // @ts-expect-error -- too complex props
        <TagComponent {...props}>
          <TBody>{children}</TBody>
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
