import { createServer } from 'http';

// ============================================
// IMPLEMENTACIÓN MCP PARA YEASTAR
// ============================================

const server = createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  console.log(`📩 ${req.method} ${url.pathname}`);

  // ============================================
  // ENDPOINT MCP - SSE (para descubrimiento)
  // ============================================
  if (url.pathname === '/mcp' && req.method === 'GET') {
    // Respuesta para el descubrimiento de herramientas
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    });
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      result: {
        serverInfo: {
          name: 'Tienda de Prueba Fake Store',
          version: '1.0.0'
        },
        capabilities: {
          tools: {},
          resources: {},
          prompts: {}
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
                  description: 'ID del producto'
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
          }
        ]
      }
    }));
    return;
  }

  // ============================================
  // ENDPOINT MCP - POST (ejecución de herramientas)
  // ============================================
  if (url.pathname === '/mcp' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const requestData = JSON.parse(body || '{}');
        console.log('📦 Request body:', JSON.stringify(requestData, null, 2));

        // Manejar diferentes formatos de solicitud
        let toolName = requestData.tool || requestData.name;
        let params = requestData.params || requestData.parameters || requestData.arguments || {};

        // Si es formato JSON-RPC
        if (requestData.method === 'tools/call') {
          const parts = requestData.params?.name?.split('.') || [];
          toolName = parts[0] || requestData.params?.name;
          params = requestData.params?.arguments || {};
        }

        // Si es formato Yeastar directo
        if (requestData.tool) {
          toolName = requestData.tool;
          params = requestData.params || {};
        }

        console.log(`🔧 Tool: ${toolName}, Params:`, params);

        let result;
        let error = null;

        try {
          switch (toolName) {
            case 'getProducts':
              const productsRes = await fetch('https://fakestoreapi.com/products');
              const productsData = await productsRes.json();
              result = { 
                content: [{ 
                  type: 'text', 
                  text: JSON.stringify(productsData, null, 2) 
                }]
              };
              break;

            case 'getProductById':
              const id = params.id || params.productId || 1;
              const productRes = await fetch(`https://fakestoreapi.com/products/${id}`);
              const productData = await productRes.json();
              result = { 
                content: [{ 
                  type: 'text', 
                  text: JSON.stringify(productData, null, 2) 
                }]
              };
              break;

            case 'getProductsByCategory':
              const category = params.category || 'electronics';
              const categoryRes = await fetch(`https://fakestoreapi.com/products/category/${category}`);
              const categoryData = await categoryRes.json();
              result = { 
                content: [{ 
                  type: 'text', 
                  text: JSON.stringify(categoryData, null, 2) 
                }]
              };
              break;

            default:
              error = `Herramienta "${toolName}" no encontrada. Herramientas disponibles: getProducts, getProductById, getProductsByCategory`;
              result = {
                content: [{ type: 'text', text: error }],
                isError: true
              };
          }
        } catch (err) {
          error = err.message;
          result = {
            content: [{ type: 'text', text: `Error: ${err.message}` }],
            isError: true
          };
        }

        // Formato de respuesta para Yeastar
        const response = {
          jsonrpc: '2.0',
          id: requestData.id || null,
          result: result
        };

        if (error) {
          response.error = {
            code: -32000,
            message: error
          };
        }

        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(response));

        console.log('✅ Respuesta enviada');

      } catch (error) {
        console.error('❌ Error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
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
  // HEALTH CHECK
  // ============================================
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // ============================================
  // API LEGACY (para pruebas)
  // ============================================
  if (url.pathname === '/api/products') {
    const response = await fetch('https://fakestoreapi.com/products');
    const data = await response.json();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
    return;
  }

  // ============================================
  // ROOT
  // ============================================
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    name: 'MCP Server para Yeastar',
    version: '1.0.0',
    description: 'Servidor MCP para conectar Yeastar P-Series con Fake Store API',
    endpoints: {
      mcp: 'GET/POST https://' + req.headers.host + '/mcp',
      health: 'GET https://' + req.headers.host + '/health',
      api_products: 'GET https://' + req.headers.host + '/api/products'
    }
  }));
});

const PORT = process.env.PORT || 8787;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`========================================`);
  console.log(`✅ Servidor MCP para Yeastar`);
  console.log(`📡 URL: http://0.0.0.0:${PORT}`);
  console.log(`🔗 Endpoint MCP: http://0.0.0.0:${PORT}/mcp`);
  console.log(`💚 Health: http://0.0.0.0:${PORT}/health`);
  console.log(`========================================`);
});
