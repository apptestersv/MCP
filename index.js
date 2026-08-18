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

// ---------------------------------------------------------
// CAMBIO AQUÍ: Usamos la sintaxis clásica para definir herramientas
// ---------------------------------------------------------
const MIS_HERRAMIENTAS = [
  {
    name: "test_tool_render",
    description: "Esta es una herramienta de prueba alojada en Render",
    inputSchema: {
      type: "object",
      properties: {
        mensaje: { type: "string" }
      }
    }
  }
];

// ---------------------------------------------------------
// Handler que responde a la lista de herramientas (tools/list)
// ---------------------------------------------------------
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: MIS_HERRAMIENTAS
  };
});

// ---------------------------------------------------------
// Handler que ejecuta la herramienta (tools/call)
// Nota: Muchos clientes MCP necesitan el método 'call' para poder usar la herramienta
// ---------------------------------------------------------
server.setRequestHandler(server.requestSchema, async (request) => {
  if (request.method === "tools/call") {
    const { name, arguments: args } = request.params;
    
    if (name === "test_tool_render") {
      return {
        content: [{ 
          type: "text", 
          text: `Render ejecutó tu herramienta con: ${args.mensaje || "Sin mensaje"}` 
        }]
      };
    }
  }
});

// ---------------------------------------------------------
// Configuración del transporte SSE para Render
// ---------------------------------------------------------
let transport;
// Render asigna el puerto automáticamente en process.env.PORT
const PORT = process.env.PORT || 3000;

app.get("/sse", async (req, res) => {
  console.log("Cliente (Yeastar) conectado al SSE");
  transport = new SSEServerTransport("/messages", res);
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  await transport.handlePostMessage(req, res);
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor MCP corriendo en Render en el puerto ${PORT}`);
});
