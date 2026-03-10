#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { writeFileSync } from "fs";
import { resolve, basename, extname } from "path";
import { imageToAsciiSvg } from "./convert.mjs";

const server = new Server(
  { name: "ascii-motion", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "image_to_ascii",
      description:
        "Convert an image file (PNG, JPG, GIF, WebP) to an ASCII art SVG. Returns the SVG content and saves to a file.",
      inputSchema: {
        type: "object",
        properties: {
          imagePath: {
            type: "string",
            description: "Absolute path to the input image file",
          },
          outputPath: {
            type: "string",
            description:
              "Absolute path for the output SVG file. Defaults to <input-name>.svg in the same directory.",
          },
          density: {
            type: "number",
            description:
              "Cell width in pixels. Smaller = more detail. Default: 6",
            default: 6,
          },
          color: {
            type: "string",
            description: 'Fill color for ASCII characters. Default: "#d4d4d4"',
            default: "#d4d4d4",
          },
          maxWidth: {
            type: "number",
            description: "Max columns of ASCII output. Default: 120",
            default: 120,
          },
          fontSize: {
            type: "number",
            description: "Font size in the SVG. Default: 8",
            default: 8,
          },
          threshold: {
            type: "number",
            description:
              "Coverage threshold 0-1. Cells below this are skipped. Default: 0.3",
            default: 0.3,
          },
        },
        required: ["imagePath"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "image_to_ascii") {
    return {
      content: [{ type: "text", text: `Unknown tool: ${request.params.name}` }],
      isError: true,
    };
  }

  const {
    imagePath,
    outputPath,
    density = 6,
    color = "#d4d4d4",
    maxWidth = 120,
    fontSize = 8,
    threshold = 0.3,
  } = request.params.arguments;

  try {
    const resolvedInput = resolve(imagePath);
    const defaultOutput =
      basename(resolvedInput, extname(resolvedInput)) + ".svg";
    const resolvedOutput = outputPath
      ? resolve(outputPath)
      : resolve(defaultOutput);

    const { svg, cells, gridCols, gridRows } = await imageToAsciiSvg(
      resolvedInput,
      {
        cellWidth: density,
        maxWidth,
        fontSize,
        coverageThreshold: threshold,
        color,
      }
    );

    writeFileSync(resolvedOutput, svg);

    return {
      content: [
        {
          type: "text",
          text: `Converted ${basename(resolvedInput)} to ASCII SVG.\n\nGrid: ${gridCols}x${gridRows} (${cells} characters)\nSaved to: ${resolvedOutput}`,
        },
      ],
    };
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
