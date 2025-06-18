import { Root, RootContent, PhrasingContent, Parent, SVG } from "mdast2docx";
import { vi } from "vitest";

// Mock createImageBitmap
globalThis.createImageBitmap = vi.fn(async () => {
  return {
    width: 100,
    height: 100,
    close: vi.fn(() => {}),
  };
});

// @ts-expect-error Mock getBBox (required for SVG operations)
SVGElement.prototype.getBBox = () => ({
  x: 0,
  y: 0,
  width: 100,
  height: 100,
});

const mockFetch = vi.fn(async (url: string) => {
  if (url.endsWith(".svg")) {
    const svgText = `
      <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
        <circle cx="50" cy="50" r="40" stroke="green" fill="yellow" />
      </svg>
    `.trim();

    return {
      ok: true,
      status: 200,
      headers: {
        get: (header: string) => {
          if (header.toLowerCase() === "content-type") return "image/svg+xml";
          return null;
        },
      },
      text: async () => svgText,
      arrayBuffer: async () => new TextEncoder().encode(svgText).buffer,
    };
  }

  if (url.includes("example")) {
    return {
      ok: false,
      status: 404,
      headers: {
        get: (header: string) => {
          if (header.toLowerCase() === "content-type") return "image/png";
          return null;
        },
      },
      arrayBuffer: async () => new Uint8Array().buffer,
    };
  }

  // For PNG or other image mocks
  const fakePng = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG file signature
  return {
    ok: true,
    status: 200,
    headers: {
      get: (header: string) => {
        if (header.toLowerCase() === "content-type") return "image/png";
        return null;
      },
    },
    arrayBuffer: async () => fakePng.buffer,
  };
}) as any;

vi.stubGlobal("fetch", mockFetch);

globalThis.fetch = mockFetch;

globalThis.Image = class {
  _src = "";
  width = 100;
  height = 100;
  onload: (() => void) | null = null;
  onerror: ((err?: unknown) => void) | null = null;

  set src(value: string) {
    this._src = value;

    // simulate successful image load after a small delay
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 1);
  }

  get src() {
    return this._src;
  }
} as unknown as typeof Image;

vi.mock("@m2d/mermaid", () => {
  const preprocess = (node: Root | RootContent | PhrasingContent) => {
    // Preprocess the AST to detect and cache Mermaid or Mindmap blocks
    (node as Parent).children?.forEach(preprocess);

    // Only process code blocks with a supported language tag
    if (node.type === "code" && /(mindmap|mermaid|mmd)/.test(node.lang ?? "")) {
      // Create an extended MDAST-compatible SVG node
      const svgNode: SVG = {
        type: "svg",
        value: '<svg xmlns="http://www.w3.org/2000/svg"><text>Mock</text></svg>',
        // Store original Mermaid source in data for traceability/debug
        data: { mermaid: node.value },
      };

      // Replace the code block with a paragraph that contains the SVG
      Object.assign(node, {
        type: "paragraph",
        children: [svgNode],
        data: { alignment: "center" }, // center-align diagram
      });
    }
  };
  return {
    __esModule: true,
    mermaidPlugin: () => ({
      preprocess,
    }),
  };
});

vi.mock("@mermaid/core/dist/utils/cache", () => {
  return {
    __esModule: true,
    createPersistentCache: (mermaidProcessor: Function) => mermaidProcessor,
    simpleCleanup: () => null,
  };
});

(SVGElement.prototype as any).getComputedTextLength = () => 100; // or any fixed number

(HTMLCanvasElement.prototype as any).getContext = vi.fn(() => {
  return {
    drawImage: vi.fn(),
    toDataURL: vi.fn(() => "data:image/png;base64,fakepng"),
    get fillStyle() {
      return "#FF0000";
    },
    set fillStyle(value: string) {
      // do nothing
    },
  };
});
