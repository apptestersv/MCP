import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const app = express();

const server = new Server(
  {
    name: "mi-servidor-mcp-render",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {}, // OBLIGATORIO para que Yeastar sepa que hay herramientas
    },
  }
);

// 1. Registrar las herramientas (AQUÍ es donde defines lo que Yeastar verá)
server.tool(
  "test_tool_render",
  "Esta es una herramienta de prueba alojada en Render",
  {
    type: "object",
    properties: {
      mensaje: { type: "string" }
    }
  },
  async (args) => {
    return {
      content: [{ type: "text", text: `Render ejecutó tu herramienta con: ${args.mensaje}` }]
    };
  }
);

// 2. El handler para devolver la lista de herramientas a Yeastar
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: Array.from(server.tools.values()) // Devuelve las herramientas registradas
  };
});

// 3. Configurar el transporte SSE para Render
let transport;
// Render requiere usar el puerto que le asigna la plataforma (process.env.PORT)
const PORT = process.env.PORT || 3000;

// Ruta que usará Yeastar para conectarse
app.get("/sse", async (req, res) => {
  console.log("Cliente (Yeastar) conectado al SSE");
  transport = new SSEServerTransport("/messages", res);
  await server.connect(transport);
});

// Ruta para recibir los mensajes de vuelta de Yeastar
app.post("/messages", async (req, res) => {
  await transport.handlePostMessage(req, res);
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor MCP corriendo en Render en el puerto ${PORT}`);
});
