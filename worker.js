export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Pega a URL de destino dos parâmetros ?url=...
    const targetUrl = url.searchParams.get("url");

    // Lidar com solicitações OPTIONS (CORS Preflight)
    // Isso é essencial para o Android não bloquear antes mesmo de tentar
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // Se não tiver URL, mostra uma mensagem de status
    if (!targetUrl) {
      return new Response(JSON.stringify({ 
        status: "Online", 
        message: "CineStream Edge Proxy is Running.", 
        usage: "?url=http://seu-site.com" 
      }), { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    // Prepara a requisição para o servidor da TV (engana ele fingindo ser um browser)
    const newRequest = new Request(targetUrl, {
      method: request.method,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Referer": new URL(targetUrl).origin,
        // Adicione aqui headers extras se sua IPTV exigir
      }
      // Nota: Não passamos o body em GET, mas se fosse POST, passaríamos.
    });

    try {
      const response = await fetch(newRequest);

      // Cria uma nova resposta baseada na original, mas "limpa" para o navegador aceitar
      const modifiedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });

      // INJETA OS CABEÇALHOS QUE PERMITEM RODAR NO ANDROID/VERCEL
      modifiedResponse.headers.set("Access-Control-Allow-Origin", "*");
      modifiedResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      modifiedResponse.headers.set("Access-Control-Allow-Headers", "*");
      
      // Remove restrições de segurança chatas do servidor original
      modifiedResponse.headers.delete("X-Frame-Options");
      modifiedResponse.headers.delete("Content-Security-Policy");

      return modifiedResponse;
    } catch (e) {
      return new Response("Proxy Error: " + e.message, { status: 500 });
    }
  },
};
