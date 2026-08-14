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

// 2. Definir las Herramientas (Tools) que Yeastar podrá ver
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "saludar",
        description: "Una herramienta de prueba para verificar la conexión con Yeastar",
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
        description: "Busca información de un cliente por su número de teléfono",
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

// 3. Ejecutar la lógica cuando Yeastar active una herramienta
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const args = request.params.arguments;

  if (toolName === "saludar") {
    const nombre = args.nombre || "Invitado";
    console.log(`Herramienta 'saludar' ejecutada para: ${nombre}`);
    return {
      content: [{ 
        type: "text", 
        text: `¡Hola ${nombre}! La conexión con Render y Yeastar está funcionando perfectamente.` 
      }]
    };
  }

  if (toolName === "consultar_cliente") {
    const telefono = args.telefono;
    console.log(`Buscando cliente con teléfono: ${telefono}`);
    return {
      content: [{ 
        type: "text", 
        text: `Cliente encontrado para el número ${telefono}. Nombre: Juan Pérez.` 
      }]
    };
  }

  throw new Error(`Herramienta desconocida: ${toolName}`);
});

// 4. Configuración del servidor HTTP Express
const app = express();
app.use(cors()); // Permite conexiones externas
app.use(express.json());

// Variable para guardar el transporte activo
let activeTransport = null;

// Ruta donde Yeastar se conectará para abrir el canal (GET)
// CRUCIAL: SSEServerTransport manejará los headers correctos para evitar el error de escritura doble
app.get("/mcp", async (req, res) => {
  console.log("=== Yeastar está solicitando conexión SSE ===");
  
  try {
    // Inicializamos el transporte SSE usando directamente la respuesta de Express
    // Así, el SDK maneja los headers 'text/event-stream' sin conflictos
    const transport = new SSEServerTransport("/mcp/message", res);
    activeTransport = transport; // Lo guardamos para usarlo en el POST

    await server.connect(transport);
    console.log("✅ CONEXIÓN EXITOSA: Yeastar conectado al servidor MCP.");

    // Cuando Yeastar cierra la ventana o se desconecta
    req.on("close", () => {
      console.log("Yeastar ha cerrado la conexión.");
      activeTransport = null;
    });

  } catch (error) {
    console.error("Error conectando a Yeastar:", error);
    // No enviamos res.status aquí para evitar el error "Headers already sent"
  }
});

// Ruta donde Yeastar enviará las peticiones de herramientas (POST)
app.post("/mcp/message", async (req, res) => {
  console.log("Recibido mensaje POST de Yeastar...");
  
  if (activeTransport) {
    // Pasamos la petición al SDK para que la procese
    await activeTransport.handlePostMessage(req, res);
  } else {
    console.warn("Se recibió un POST pero no hay un canal SSE abierto.");
    res.status(400).send("No hay conexión SSE activa.");
  }
});

// 5. Arrancar el servidor en el puerto que Render asigna
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor MCP Streamable HTTP para Yeastar corriendo en el puerto ${PORT}`);
  console.log(`🔗 Endpoint configurado en: /mcp`);
  console.log(`📞 Listo para recibir conexiones desde la P-Series.`);
});
