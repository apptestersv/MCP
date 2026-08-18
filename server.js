import { createServer } from 'http';

const server = createServer((req, res) => {
  console.log(`📩 ${req.method} ${req.url}`);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // ============================================
  // ENDPOINT MCP - GET
  // ============================================
  if (url.pathname === '/mcp' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({
      tools: [
        {
          name: 'getProducts',
          description: 'Obtiene todos los productos de la tienda de prueba',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'getProductById',
          description: 'Obtiene un producto por su ID',
          inputSchema: {
            type: 'object',
            properties: { id: { type: 'number' } },
            required: ['id']
          }
        }
      ]
    }));
    return;
  }

  // ============================================
  // ENDPOINT MCP - POST
  // ============================================
  if (url.pathname === '/mcp' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        console.log('📦 Body:', data);
        
        const tool = data.tool || data.name;
        const params = data.params || data.arguments || {};

        let result;
        if (tool === 'getProducts') {
          const response = await fetch('https://fakestoreapi.com/products');
          const products = await response.json();
          result = products;
        } else if (tool === 'getProductById') {
          const response = await fetch(`https://fakestoreapi.com/products/${params.id || 1}`);
          const product = await response.json();
          result = product;
        } else {
          result = { error: `Tool "${tool}" no encontrada` };
        }

        res.writeHead(200);
        res.end(JSON.stringify({ result }));
      } catch (error) {
        console.error('❌ Error:', error);
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // ============================================
  // HEALTH CHECK
  // ============================================
  if (url.pathname === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  // ============================================
  // ROOT
  // ============================================
  res.writeHead(200);
  res.end(JSON.stringify({
    message: 'MCP Server funcionando correctamente',
    endpoints: {
      mcp: '/mcp (GET para descubrimiento, POST para ejecución)',
      health: '/health'
    }
  }));
});

const PORT = process.env.PORT || 8787;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`========================================`);
  console.log(`✅ Servidor funcionando en puerto ${PORT}`);
  console.log(`🌐 URL: http://0.0.0.0:${PORT}`);
  console.log(`📡 MCP: http://0.0.0.0:${PORT}/mcp`);
  console.log(`💚 Health: http://0.0.0.0:${PORT}/health`);
  console.log(`========================================`);
});
