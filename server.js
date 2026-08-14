import express from "express";
import cors from "cors";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  ListResourcesRequestSchema // Añadido por si Yeastar pide recursos primero
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "yeastar-helper-sse",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {} // Añadido para que Yeastar se sienta más cómodo
    },
  }
);

// 1. Listar Herramientas (Tools)
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.log("Yeastar solicitó la lista de herramientas.");
  return {
    tools: [
      {
        name: "saludar",
        description: "Saluda a una persona",
        inputSchema: {
          type: "object",
          properties: {
            nombre: { type: "string", description: "Nombre a saludar" },
          },
          required: ["nombre"],
        },
      },
      {
        name: "test", // Añadimos una herramienta genérica por si Yeastar usa esta palabra por defecto
        description: "Herramienta de prueba",
        inputSchema: {
          type: "object",
          properties: {
            mensaje: { type: "string" },
          },
        },
      }
    ],
  };
});

// 2. Ejecutar Herramientas (Con captura comodín)
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const args = request.params.arguments || {};
  
  console.log(`Herramienta recibida: "${toolName}" con argumentos:`, args);

  let respuesta = "Lo siento, no tengo una respuesta específica para esa herramienta.";
  let nombre = args.nombre || args.mensaje || "Invitado";

  // Respondemos a cualquier nombre que la IA pida
  if (toolName === "saludar" || toolName === "test" || toolName.includes("saludo")) {
    respuesta = `¡Hola ${nombre}! La conexión con la IA de Yeastar funciona perfectamente.`;
  } else {
    // Respuesta genérica si pide algo que no tenemos programado
    respuesta = `Recibí la petición "${toolName}", pero solo tengo la herramienta de saludo configurada. ¡Hola ${nombre}!`;
  }

  return {
    content: [{ type: "text", text: respuesta }]
  };
});

// 3. Configuración de Express y MCP
const app = express();
app.use(cors());
app.use(express.json());

let activeTransport = null;

app.get("/mcp", async (req, res) => {
  console.log("Yeastar abriendo canal SSE...");
  try {
    const transport = new SSEServerTransport("/mcp", res);
    activeTransport = transport;
    await server.connect(transport);
    console.log("✅ Yeastar conectado.");
    req.on("close", () => { activeTransport = null; });
  } catch (error) {
    console.error("Error de conexión:", error);
  }
});

app.post("/mcp", async (req, res) => {
  console.log("Mensaje POST recibido en /mcp");
  if (activeTransport) {
    await activeTransport.handlePostMessage(req, res);
  } else {
    res.status(400).send("Sin conexión activa.");
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor MCP listo en puerto ${PORT}, ruta /mcp`);
});
