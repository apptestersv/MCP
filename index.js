import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema 
} from "@modelcontextprotocol/sdk/types.js";

const app = express();

// Crear el servidor MCP
const server = new Server(
  {
    name: "mi-servidor-mcp-render",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {}, // Obligatorio para anunciar herramientas
    },
  }
);

// 1. Definir las herramientas en un array
const MIS_HERRAMIENTAS = [
  {
    name: "test_tool_render",
    description: "Una herramienta de prueba alojada en Render",
    inputSchema: {
      type: "object",
      properties: {
        mensaje: { type: "string" },
      },
    },
  },
];

// 2. Manejador para LISTAR herramientas (tools/list)
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: MIS_HERRAMIENTAS,
  };
});

// 3. Manejador para EJECUTAR herramientas (tools/call)
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "test_tool_render") {
    return {
      content: [
        {
          type: "text",
          text: `✅ Render ejecutó tu herramienta con el mensaje: "${args.mensaje || 'Sin mensaje'}"`,
        },
      ],
    };
  }

  throw new Error(`Herramienta desconocida: ${name}`);
});

// ---------------------------------------------------------
// Configuración del transporte SSE para Render
// ---------------------------------------------------------
let transport;
const PORT = process.env.PORT || 3000;

app.get("/sse", async (req, res) => {
  console.log("✅ Yeastar se ha conectado al servidor MCP en Render");
  transport = new SSEServerTransport("/messages", res);
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  await transport.handlePostMessage(req, res);
});

// Iniciar el servidor web
app.listen(PORT, () => {
  console.log(`🚀 Servidor MCP corriendo en Render en el puerto ${PORT}`);
});
