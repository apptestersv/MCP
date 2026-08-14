import { createServer } from 'http';

const server = createServer(async (req, res) => {
  // Habilitar CORS para que Yeastar pueda acceder
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // ============================================
  // ENDPOINT PRINCIPAL MCP - Streamable HTTP
  // ============================================
  if (url.pathname === '/mcp' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const requestData = JSON.parse(body || '{}');
        const { tool, params } = requestData;

        let result;
        switch (tool) {
          case 'getProducts':
            const productsRes = await fetch('https://fakestoreapi.com/products');
            const products = await productsRes.json();
            result = products;
            break;
          case 'getProductById':
            const productRes = await fetch(`https://fakestoreapi.com/products/${params?.id || 1}`);
            result = await productRes.json();
            break;
          case 'getProductsByCategory':
            const categoryRes = await fetch(`https://fakestoreapi.com/products/category/${params?.category || 'electronics'}`);
            result = await categoryRes.json();
            break;
          default:
            result = { error: `Herramienta "${tool}" no encontrada` };
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', data: result }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: error.message }));
      }
    });
    return;
  }

  // ============================================
  // ENDPOINT GET /mcp - Descubre herramientas
  // ============================================
  if (url.pathname === '/mcp' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      name: 'Tienda de Prueba',
      description: 'Servidor MCP para consultar productos de Fake Store API',
      version: '1.0.0',
      tools: [
        {
          name: 'getProducts',
          description: 'Obtiene todos los productos de la tienda de prueba',
          parameters: {}
        },
        {
          name: 'getProductById',
          description: 'Obtiene un producto específico por su ID',
          parameters: { id: { type: 'number', description: 'ID del producto' } }
        },
        {
          name: 'getProductsByCategory',
          description: 'Obtiene productos por categoría',
          parameters: { category: { type: 'string', description: 'Categoría (electronics, jewelery, etc)' } }
        }
      ]
    }));
    return;
  }

  // ============================================
  // HEALTH CHECK (para Render)
  // ============================================
  if (url.pathname === '/health') {
    res.writeHead(200);
    res.end('OK');
    return;
  }

  // ============================================
  // API Products (legado)
  // ============================================
  if (url.pathname === '/api/products') {
    const response = await fetch('https://fakestoreapi.com/products');
    const data = await response.json();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
    return;
  }

  // Root
  res.writeHead(200);
  res.end('Servidor MCP para Yeastar funcionando');
});

const PORT = process.env.PORT || 8787;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://0.0.0.0:${PORT}`);
  console.log(`Endpoint MCP: http://0.0.0.0:${PORT}/mcp`);
});