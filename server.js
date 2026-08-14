import express from "express";
import cors from "cors";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

// 1. Crear el servidor MCP
const server = new Server(
  {
    name: "yeastar-helper-sse",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 2. Definir las Herramientas (Tools)
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "saludar",
        description: "Herramienta de prueba para verificar la conexión con Yeastar",
        inputSchema: {
          type: "object",
          properties: {
            nombre: { type: "string", description: "El nombre a saludar" },
          },
          required: ["nombre"],
        },
      }
    ],
  };
});

// 3. Ejecutar la herramienta
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "saludar") {
    const nombre = request.params.arguments.nombre || "Invitado";
    console.log(`Ejecutando 'saludar' para: ${nombre}`);
    return {
      content: [{ 
        type: "text", 
        text: `¡Hola ${nombre}! La conexión con Render está 100% operativa.` 
      }]
    };
  }
  throw new Error("Herramienta desconocida");
});

// 4. Configuración Express
const app = express();
app.use(cors());
app.use(express.json());

let activeTransport = null;

// CRUCIAL: Yeastar usará la misma ruta exacta tanto para abrir el canal como para enviar mensajes.
// La librería de MCP entiende si es GET o POST y actúa en consecuencia.
app.get("/mcp", async (req, res) => {
  console.log("Yeastar está intentando abrir el canal SSE...");
  try {
    const transport = new SSEServerTransport("/mcp", res);
    activeTransport = transport;
    await server.connect(transport);
    console.log("✅ Yeastar CONECTADO exitosamente al servidor MCP.");
    
    req.on("close", () => {
      console.log("Yeastar cerró la conexión.");
      activeTransport = null;
    });
  } catch (error) {
    console.error("Error de conexión:", error);
  }
});

app.post("/mcp", async (req, res) => {
  console.log("Mensaje POST recibido en /mcp (ejecutando herramienta)...");
  if (activeTransport) {
    await activeTransport.handlePostMessage(req, res);
  } else {
    res.status(400).send("No hay conexión activa.");
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor MCP listo en puerto ${PORT}, ruta /mcp`);
});
