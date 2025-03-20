import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  ImageContent,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "minesweeper-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "start_game",
        description: "Start a new game of Minesweeper",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "click",
        description: "Click at a cell on the Minesweeper board",
        inputSchema: {
          type: "object",
          properties: {
            row: { type: "number" },
            col: { type: "number" },
          },
          required: ["row", "col"],
        },
      },
      {
        name: "flag",
        description: "Place a flag at a cell on the Minesweeper board",
        inputSchema: {
          type: "object",
          properties: {
            row: { type: "number" },
            col: { type: "number" },
          },
          required: ["row", "col"],
        },
      },
      {
        name: "unflag",
        description: "Remove the flag at a cell on the Minesweeper board",
        inputSchema: {
          type: "object",
          properties: {
            row: { type: "number" },
            col: { type: "number" },
          },
          required: ["row", "col"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = request.params.arguments;
  const row = args?.row;
  const col = args?.col;
  let url = new URL("http://localhost:5000/api/play");
  if (request.params.name === "start_game") {
    url.searchParams.set("new", "1");
  } else if (request.params.name === "click") {
    url.searchParams.set("reveal", "1");
    url.searchParams.set("pos", `${row},${col}`);
  } else if (request.params.name === "flag") {
    url.searchParams.set("flag", "1");
    url.searchParams.set("pos", `${row},${col}`);
  } else if (request.params.name === "unflag") {
    url.searchParams.set("unflag", "1");
    url.searchParams.set("pos", `${row},${col}`);
  } else {
    throw new McpError(ErrorCode.InternalError, "Tool not found");
  }

  const response = await fetch(url, {
    headers: {
      Accept: "image/png",
    },
  });

  if (!response.ok) {
    throw new McpError(ErrorCode.InternalError, "Game server failed.");
  }

  const blob = await response.blob();
  const buffer = Buffer.from(await blob.arrayBuffer());

  return {
    content: [
      {
        type: "image",
        data: buffer.toString("base64"),
        mimeType: "image/png",
      } as ImageContent,
    ],
    isError: false,
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
