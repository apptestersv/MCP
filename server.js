import express from "express";
import cors from "cors";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

// 1. Crear la instancia del servidor MCP
const server = new Server(
  {
    name: "yeastar-helper-sse",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {}
    },
  }
);

// 2. Definir las HERRAMIENTAS (Tools) que Yeastar va a ver
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "saludar",
        description: "Una herramienta de prueba para verificar que la conexión funciona",
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
        description: "Busca información de un cliente por su número de teléfono en la base de datos",
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

// 3. Ejecutar la lógica cuando Yeastar llama a una herramienta
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const args = request.params.arguments;

  if (toolName === "saludar") {
    const nombre = args.nombre || "Invitado";
    return {
      content: [{ 
        type: "text", 
        text: `¡Hola ${nombre}! La conexión con Render y Yeastar ha sido exitosa a través de Streamable HTTP.` 
      }]
    };
  }

  if (toolName === "consultar_cliente") {
    const telefono = args.telefono;
    // Aquí puedes conectar a tu base de datos SQL, Excel o API externa.
    // De momento, devolvemos un ejemplo simulado:
    return {
      content: [{ 
        type: "text", 
        text: `Cliente encontrado para el número ${telefono}. Nombre: Juan Pérez. Saldo: $0.00.` 
      }]
    };
  }

  throw new Error(`Herramienta desconocida: ${toolName}`);
});

// 4. CONFIGURACIÓN DEL SERVIDOR HTTP / STREAMABLE HTTP (SSE)
const app = express();
app.use(cors()); // Permite que Yeastar se conecte sin bloqueos de seguridad
app.use(express.json());

let transport; // Variable para mantener el transporte activo

// Ruta donde Yeastar se conectará (GET)
// Reemplaza TU app.get("/mcp"...) actual por este:

app.get("/mcp", async (req, res) => {
  console.log("Yeastar solicitó conexión SSE...");
  
  // CRUCIAL: Forzar el Content-Type exacto que exige Yeastar P-Series
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });
  
  // Configuramos el transporte SSE usando la respuesta (res)
  transport = new SSEServerTransport("/mcp/message", res);
  
  try {
    await server.connect(transport);
    console.log("✅ Conexión SSE establecida con Yeastar.");
    
    req.on("close", () => {
      console.log("Yeastar cerró la conexión.");
    });
  } catch (error) {
    console.error("Error conectando a Yeastar:", error);
    // No enviar res.status aquí porque ya enviamos writeHead
  }
});

// Ruta donde Yeastar enviará los comandos y respuestas (POST)
app.post("/mcp/message", async (req, res) => {
  console.log("Mensaje recibido de Yeastar:", req.body);
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send("No hay conexión SSE activa.");
  }
});

// 5. ARRANCAR EL SERVIDOR
const PORT = process.env.PORT || 10000; // Render usa el 10000 por defecto en sus logs, pero se adapta automático
app.listen(PORT, () => {
  console.log(`🚀 Servidor MCP Streamable HTTP corriendo en el puerto ${PORT}`);
  console.log(`🔗 Endpoint MCP listo en: /mcp`);
});
