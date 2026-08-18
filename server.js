import { createServer } from 'http';

// ============================================
// DATOS DE PRUEBA LOCALES
// ============================================
const MOCK_PRODUCTS = [
  { id: 1, title: "Producto de Prueba 1", price: 29.99, category: "electronics", description: "Descripción del producto 1" },
  { id: 2, title: "Producto de Prueba 2", price: 49.99, category: "jewelery", description: "Descripción del producto 2" },
  { id: 3, title: "Producto de Prueba 3", price: 19.99, category: "mens clothing", description: "Descripción del producto 3" },
  { id: 4, title: "Producto de Prueba 4", price: 39.99, category: "womens clothing", description: "Descripción del producto 4" },
  { id: 5, title: "Producto de Prueba 5", price: 59.99, category: "electronics", description: "Descripción del producto 5" }
];

const MOCK_USERS = [
  { id: 1, name: "Usuario Prueba 1", email: "test1@example.com" },
  { id: 2, name: "Usuario Prueba 2", email: "test2@example.com" }
];

const server = createServer(async (req, res) => {
  // ============================================
  // CONFIGURACIÓN CORS
  // ============================================
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  console.log(`📩 ${req.method} ${url.pathname}`);

  // ============================================
  // ENDPOINT MCP - GET (Descubrimiento)
  // ============================================
  if (url.pathname === '/mcp' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      result: {
        serverInfo: { name: 'Tienda de Prueba Fake Store', version: '1.0.0' },
        capabilities: { tools: {} },
        tools: [
          { name: 'getProducts', description: 'Obtiene todos los productos', inputSchema: { type: 'object', properties: {} } },
          { name: 'getProductById', description: 'Obtiene un producto por ID', inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
          { name: 'getProductsByCategory', description: 'Obtiene productos por categoría', inputSchema: { type: 'object', properties: { category: { type: 'string' } }, required: ['category'] } },
          { name: 'getUsers', description: 'Obtiene todos los usuarios', inputSchema: { type: 'object', properties: {} } },
          { name: 'getCarts', description: 'Obtiene todos los carritos', inputSchema: { type: 'object', properties: {} } }
        ]
      }
    }));
    return;
  }

  // ============================================
  // ENDPOINT MCP - POST (Ejecución con fallback)
  // ============================================
  if (url.pathname === '/mcp' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        console.log('📦 Body:', JSON.stringify(data, null, 2));

        // Detectar herramienta
        let toolName = data.tool || data.name || (data.params && data.params.name) || data.function;
        let params = data.params || data.arguments || data.parameters || {};

        console.log(`🔧 Tool: ${toolName}, Params:`, params);

        let result = null;
        let error = null;

        try {
          switch (toolName) {
            case 'getProducts': {
              try {
                const response = await fetch('https://fakestoreapi.com/products');
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const products = await response.json();
                result = { content: [{ type: 'text', text: JSON.stringify(products, null, 2) }] };
              } catch (err) {
                console.log('⚠️ Usando datos locales para getProducts');
                result = { content: [{ type: 'text', text: JSON.stringify(MOCK_PRODUCTS, null, 2) }] };
              }
              break;
            }

            case 'getProductById': {
              const id = params.id || 1;
              try {
                const response = await fetch(`https://fakestoreapi.com/products/${id}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const product = await response.json();
                result = { content: [{ type: 'text', text: JSON.stringify(product, null, 2) }] };
              } catch (err) {
                console.log(`⚠️ Usando datos locales para getProductById(${id})`);
                const mock = MOCK_PRODUCTS.find(p => p.id === id) || MOCK_PRODUCTS[0];
                result = { content: [{ type: 'text', text: JSON.stringify(mock, null, 2) }] };
              }
              break;
            }

            case 'getProductsByCategory': {
              const category = params.category || 'electronics';
              try {
                const response = await fetch(`https://fakestoreapi.com/products/category/${category}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const products = await response.json();
                result = { content: [{ type: 'text', text: JSON.stringify(products, null, 2) }] };
              } catch (err) {
                console.log(`⚠️ Usando datos locales para getProductsByCategory(${category})`);
                const filtered = MOCK_PRODUCTS.filter(p => p.category === category);
                result = { content: [{ type: 'text', text: JSON.stringify(filtered.length ? filtered : MOCK_PRODUCTS, null, 2) }] };
              }
              break;
            }

            case 'getUsers': {
              try {
                const response = await fetch('https://fakestoreapi.com/users');
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const users = await response.json();
                result = { content: [{ type: 'text', text: JSON.stringify(users, null, 2) }] };
              } catch (err) {
                console.log('⚠️ Usando datos locales para getUsers');
                result = { content: [{ type: 'text', text: JSON.stringify(MOCK_USERS, null, 2) }] };
              }
              break;
            }

            case 'getCarts': {
              try {
                const response = await fetch('https://fakestoreapi.com/carts');
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const carts = await response.json();
                result = { content: [{ type: 'text', text: JSON.stringify(carts, null, 2) }] };
              } catch (err) {
                console.log('⚠️ Usando datos locales para getCarts');
                result = { content: [{ type: 'text', text: JSON.stringify([], null, 2) }] };
              }
              break;
            }

            default: {
              error = `Herramienta "${toolName}" no encontrada. Disponibles: getProducts, getProductById, getProductsByCategory, getUsers, getCarts`;
              result = { content: [{ type: 'text', text: error }], isError: true };
            }
          }
        } catch (err) {
          error = err.message;
          result = { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
        }

        const response = {
          jsonrpc: '2.0',
          id: data.id || null,
          result: result
        };

        if (error) {
          response.error = { code: -32000, message: error };
        }

        res.writeHead(200);
        res.end(JSON.stringify(response));
        console.log('✅ Respuesta enviada');

      } catch (error) {
        console.error('❌ Error en POST:', error);
        res.writeHead(500);
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32603, message: `Error interno: ${error.message}` }
        }));
      }
    });
    return;
  }

  // ============================================
  // HEALTH CHECK
  // ============================================
  if (url.pathname === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() }));
    return;
  }

  // ============================================
  // RAIZ
  // ============================================
  res.writeHead(200);
  res.end(JSON.stringify({
    name: 'MCP Server para Yeastar P-Series',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      mcp_get: 'GET /mcp - Descubrimiento',
      mcp_post: 'POST /mcp - Ejecución',
      health: 'GET /health - Health check'
    },
    tools: ['getProducts', 'getProductById', 'getProductsByCategory', 'getUsers', 'getCarts']
  }));
});

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
