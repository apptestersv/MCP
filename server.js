import express from "express";
import cors from "cors";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  ListResourcesRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

// 1. Configuración del servidor MCP
const server = new Server(
  {
    name: "yeastar-mcp-helper",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {}
    },
  }
);

// 2. Definir las Herramientas que Yeastar podrá ver y usar
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.log("Yeastar está solicitando la lista de herramientas...");
  return {
    tools: [
      {
        name: "saludar",
        description: "Una herramienta de prueba para verificar la conexión MCP.",
        inputSchema: {
          type: "object",
          properties: {
            nombre: {
              type: "string",
              description: "El nombre de la persona a saludar",
            },
          },
          required: ["nombre"],
        },
      },
      {
        name: "consultar_cliente",
        description: "Busca información de un cliente por su número de teléfono.",
        inputSchema: {
          type: "object",
          properties: {
            telefono: {
              type: "string",
              description: "El número de teléfono del cliente (ej: 555-1234)",
            },
          },
          required: ["telefono"],
        },
      },
    ],
  };
});

// 3. Lógica para ejecutar las herramientas cuando Yeastar las active
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const args = request.params.arguments || {};

  console.log(`Herramienta ejecutada: "${toolName}"`, args);

  let respuesta = "Lo siento, no pude procesar la solicitud.";

  // Lógica de la herramienta 'saludar'
  if (toolName === "saludar") {
    const nombre = args.nombre || "Invitado";
    respuesta = `¡Hola ${nombre}! La conexión MCP con Yeastar está funcionando perfectamente.`;
  } 
  // Lógica de la herramienta 'consultar_cliente'
  else if (toolName === "consultar_cliente") {
    const telefono = args.telefono || "desconocido";
    // Aquí puedes conectar con tu base de datos real.
    respuesta = `Cliente encontrado para el número ${telefono}. Nombre: Juan Pérez. Estado: Activo.`;
  }

  return {
    content: [{ type: "text", text: respuesta }]
  };
});

// 4. Configuración del servidor Express
const app = express();
app.use(cors()); // Permite conexiones externas
app.use(express.json());

let activeTransport = null;

// === RUTA PRINCIPAL (GET) para abrir el canal SSE ===
// Aquí está la corrección de los Headers para que Yeastar ponga el círculo verde
app.get("/mcp", async (req, res) => {
  console.log("Yeastar solicitó conexión SSE...");
  
  // Forzamos los headers exactos que exige la P-Series para validar el servidor
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders(); // Envía los headers inmediatamente

  try {
    // Creamos el transporte usando la misma ruta para POST
    const transport = new SSEServerTransport("/mcp", res);
    activeTransport = transport;
    
    // Conectamos el servidor MCP al transporte
    await server.connect(transport);
    console.log("✅ ¡VALIDACIÓN EXITOSA! Yeastar ha conectado y validado el servidor.");
    
    // Manejo de desconexión
    req.on("close", () => {
      console.log("Yeastar cerró la conexión SSE.");
      activeTransport = null;
    });

  } catch (error) {
    console.error("Error crítico conectando a Yeastar:", error);
  }
});

// === RUTA DE MENSAJES (POST) ===
// Yeastar envía aquí las peticiones para ejecutar las herramientas
app.post("/mcp", async (req, res) => {
  console.log("Mensaje POST recibido (ejecutando herramienta)...");
  if (activeTransport) {
    await activeTransport.handlePostMessage(req, res);
  } else {
    res.status(400).send("No hay un canal SSE activo en este momento.");
  }
});

// 5. Arrancar el servidor en el puerto asignado por Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor MCP Streamable HTTP para Yeastar corriendo en puerto ${PORT}`);
  console.log(`🔗 Endpoint configurado en: /mcp`);
});
