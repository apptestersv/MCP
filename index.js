import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema 
} from "@modelcontextprotocol/sdk/types.js";

const app = express();

const server = new Server(
  {
    name: "mcp-render-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Definimos la herramienta
const MIS_HERRAMIENTAS = [
  {
    name: "test_tool_render",
    description: "Herramienta de prueba en Render",
    inputSchema: {
      type: "object",
      properties: {
        mensaje: { type: "string" },
      },
    },
  },
];

// Manejador para listar herramientas
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.log("🛠️ Yeastar preguntó por la lista de herramientas.");
  return { tools: MIS_HERRAMIENTAS };
});

// Manejador para ejecutar herramientas
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  console.log(`🚀 Yeastar ejecutó la herramienta: ${name}`);
  
  if (name === "test_tool_render") {
    return {
      content: [{ type: "text", text: `✅ Éxito: ${args.mensaje || 'Sin mensaje'}` }],
    };
  }
  throw new Error(`Herramienta desconocida: ${name}`);
});

// ---------------------------------------------------------
// CONFIGURACIÓN DEL SERVIDOR WEB (EXPRESS)
// ---------------------------------------------------------
const PORT = process.env.PORT || 10000; // Forzamos el puerto 10000 si no lo da Render

// 1. Ruta RAÍZ (Para que Render haga su Health Check y no muera)
app.get("/", (req, res) => {
  res.status(200).send("Servidor MCP activo");
});

// 2. Ruta para conectar SSE (La que usa Yeastar)
let transport;
app.get("/sse", async (req, res) => {
  console.log("✅ ¡Yeastar se ha conectado exitosamente al SSE!");
  transport = new SSEServerTransport("/messages", res);
  await server.connect(transport);
});

// 3. Ruta para recibir mensajes de Yeastar
app.post("/messages", async (req, res) => {
  await transport.handlePostMessage(req, res);
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor MCP corriendo en el puerto ${PORT}`);
  console.log(`🌐 URL disponible en: https://mcp-s8k7.onrender.com/sse`);
});
