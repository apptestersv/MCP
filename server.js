import { createServer } from 'http';

const server = createServer(async (req, res) => {
  // ============================================
  // CONFIGURACIÓN CORS (necesario para Yeastar)
  // ============================================
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Content-Type', 'application/json');

  // Responder a preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  console.log(`📩 ${req.method} ${url.pathname}`);

  // ============================================
  // ENDPOINT MCP - GET (Descubrimiento de herramientas)
  // ============================================
  if (url.pathname === '/mcp' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      result: {
        serverInfo: {
          name: 'Tienda de Prueba Fake Store',
          version: '1.0.0'
        },
        capabilities: {
          tools: {}
        },
        tools: [
          {
            name: 'getProducts',
            description: 'Obtiene todos los productos de la tienda de prueba',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'getProductById',
            description: 'Obtiene un producto específico por su ID',
            inputSchema: {
              type: 'object',
              properties: {
                id: {
                  type: 'number',
                  description: 'ID del producto a consultar'
                }
              },
              required: ['id']
            }
          },
          {
            name: 'getProductsByCategory',
            description: 'Obtiene productos por categoría',
            inputSchema: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  description: 'Categoría: electronics, jewelery, mens clothing, womens clothing'
                }
              },
              required: ['category']
            }
          },
          {
            name: 'getUsers',
            description: 'Obtiene todos los usuarios de la tienda de prueba',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'getCarts',
            description: 'Obtiene todos los carritos de compra',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          }
        ]
      }
    }));
    return;
  }

  // ============================================
  // ENDPOINT MCP - POST (Ejecución de herramientas)
  // ============================================
  if (url.pathname === '/mcp' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        console.log('📦 Body recibido:', JSON.stringify(data, null, 2));

        // ============================================
        // DETECCIÓN DE HERRAMIENTA (múltiples formatos)
        // ============================================
        let toolName = null;
        let params = {};

        // Formato 1: { "tool": "getProducts", "params": {} }
        if (data.tool) {
          toolName = data.tool;
          params = data.params || {};
        }
        // Formato 2: { "name": "getProducts", "arguments": {} }
        else if (data.name) {
          toolName = data.name;
          params = data.arguments || data.params || {};
        }
        // Formato 3: JSON-RPC { "method": "tools/call", "params": { "name": "getProducts", "arguments": {} } }
        else if (data.method === 'tools/call' && data.params) {
          toolName = data.params.name;
          params = data.params.arguments || {};
        }
        // Formato 4: { "function": "getProducts", "parameters": {} }
        else if (data.function) {
          toolName = data.function;
          params = data.parameters || data.params || {};
        }

        console.log(`🔧 Tool detectada: ${toolName}`);
        console.log(`📋 Params:`, params);

        // ============================================
        // EJECUCIÓN DE HERRAMIENTAS
        // ============================================
        let result = null;
        let error = null;

        try {
          switch (toolName) {
            case 'getProducts': {
              const response = await fetch('https://fakestoreapi.com/products');
              const products = await response.json();
              result = {
                content: [{
                  type: 'text',
                  text: JSON.stringify(products, null, 2)
                }]
              };
              break;
            }

            case 'getProductById': {
              const id = params.id || 1;
              const response = await fetch(`https://fakestoreapi.com/products/${id}`);
              if (!response.ok) {
                throw new Error(`Producto con ID ${id} no encontrado`);
              }
              const product = await response.json();
              result = {
                content: [{
                  type: 'text',
                  text: JSON.stringify(product, null, 2)
                }]
              };
              break;
            }

            case 'getProductsByCategory': {
              const category = params.category || 'electronics';
              const response = await fetch(`https://fakestoreapi.com/products/category/${category}`);
              const products = await response.json();
              result = {
                content: [{
                  type: 'text',
                  text: JSON.stringify(products, null, 2)
                }]
              };
              break;
            }

            case 'getUsers': {
              const response = await fetch('https://fakestoreapi.com/users');
              const users = await response.json();
              result = {
                content: [{
                  type: 'text',
                  text: JSON.stringify(users, null, 2)
                }]
              };
              break;
            }

            case 'getCarts': {
              const response = await fetch('https://fakestoreapi.com/carts');
              const carts = await response.json();
              result = {
                content: [{
                  type: 'text',
                  text: JSON.stringify(carts, null, 2)
                }]
              };
              break;
            }

            default: {
              error = `Herramienta "${toolName}" no encontrada. Herramientas disponibles: getProducts, getProductById, getProductsByCategory, getUsers, getCarts`;
              result = {
                content: [{
                  type: 'text',
                  text: error
                }],
                isError: true
              };
            }
          }
        } catch (err) {
          error = err.message;
          result = {
            content: [{
              type: 'text',
              text: `Error: ${err.message}`
            }],
            isError: true
          };
        }

        // ============================================
        // RESPUESTA (formato Yeastar/JSON-RPC)
        // ============================================
        const response = {
          jsonrpc: '2.0',
          id: data.id || null,
          result: result
        };

        if (error) {
          response.error = {
            code: -32000,
            message: error
          };
        }

        res.writeHead(200);
        res.end(JSON.stringify(response));
        console.log('✅ Respuesta enviada');

      } catch (error) {
        console.error('❌ Error en POST:', error);
        res.writeHead(500);
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: `Error interno: ${error.message}`
          }
        }));
      }
    });
    return;
  }

  // ============================================
  // HEALTH CHECK (para Render)
  // ============================================
  if (url.pathname === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }));
    return;
  }

  // ============================================
  // ENDPOINT LEGACY /api/products (para pruebas)
  // ============================================
  if (url.pathname === '/api/products') {
    try {
      const response = await fetch('https://fakestoreapi.com/products');
      const data = await response.json();
      res.writeHead(200);
      res.end(JSON.stringify(data));
    } catch (error) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // ============================================
  // RAIZ (/) - Mensaje de bienvenida
  // ============================================
  res.writeHead(200);
  res.end(JSON.stringify({
    name: 'MCP Server para Yeastar P-Series',
    version: '1.0.0',
    status: 'online',
    description: 'Servidor MCP para conectar Yeastar con Fake Store API',
    endpoints: {
      mcp_get: 'GET /mcp - Descubrimiento de herramientas',
      mcp_post: 'POST /mcp - Ejecución de herramientas',
      health: 'GET /health - Health check',
      api_products: 'GET /api/products - Lista de productos (legacy)'
    },
    tools: ['getProducts', 'getProductById', 'getProductsByCategory', 'getUsers', 'getCarts']
  }));
});

// ============================================
// INICIO DEL SERVIDOR
// ============================================
const PORT = process.env.PORT || 8787;
server.listen(PORT, '0.0.0.0', () => {
  console.log('========================================');
  console.log(`✅ MCP Server para Yeastar`);
  console.log(`🌐 URL: https://mcp-s8k7.onrender.com`);
  console.log(`📡 Endpoint MCP: https://mcp-s8k7.onrender.com/mcp`);
  console.log(`💚 Health Check: https://mcp-s8k7.onrender.com/health`);
  console.log(`🔧 Herramientas: getProducts, getProductById, getProductsByCategory, getUsers, getCarts`);
  console.log('========================================');
});
