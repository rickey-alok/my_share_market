/**
 * Cloudflare Worker for Apna Share Calculator - Live Market Data Proxy
 * 
 * Free Deployment Instructions:
 * 1. Log in to https://dash.cloudflare.com (free account, 100,000 requests/day).
 * 2. Navigate to "Workers & Pages" -> "Create application" -> "Create Worker".
 * 3. Name your worker (e.g. "apna-market-proxy") and click "Deploy".
 * 4. Click "Edit code", paste the contents of this file, and click "Deploy".
 * 5. Copy the worker URL (e.g. https://apna-market-proxy.yourname.workers.dev)
 * 6. Paste that URL in Apna Share Calculator -> Profile Modal -> Settings -> "Market Data Proxy URL".
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle browser preflight CORS (OPTIONS)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Determine target symbol or URL
    let targetUrl = url.searchParams.get('url');
    let symbol = url.searchParams.get('symbol');

    if (!targetUrl && !symbol) {
      // Check pathname (e.g. /RELIANCE.NS)
      const pathSym = url.pathname.replace(/^\/+/, '').trim();
      if (pathSym && pathSym !== 'favicon.ico') {
        symbol = pathSym;
      }
    }

    if (symbol) {
      const cleanSym = symbol.toUpperCase().trim();
      targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cleanSym)}?interval=1d&range=1d`;
    }

    if (!targetUrl) {
      return new Response(
        JSON.stringify({
          status: 'online',
          message: 'Apna Share Market Proxy Worker is active.',
          usage: [
            '?symbol=RELIANCE.NS',
            '?symbol=ETERNAL.NS',
            '?url=https://query1.finance.yahoo.com/v8/finance/chart/RELIANCE.NS?interval=1d&range=1d'
          ]
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    // Security check: Only permit Yahoo Finance chart queries
    try {
      const parsed = new URL(targetUrl);
      if (!parsed.hostname.endsWith('finance.yahoo.com')) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized domain. Only Yahoo Finance endpoints allowed.' }),
          { status: 403, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid target URL format' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    try {
      const headers = new Headers();
      headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
      headers.set('Accept', 'application/json');

      const yahooRes = await fetch(targetUrl, {
        method: 'GET',
        headers
      });

      const body = await yahooRes.arrayBuffer();

      return new Response(body, {
        status: yahooRes.status,
        statusText: yahooRes.statusText,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Cache-Control': 'public, max-age=15'
        }
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch quote from upstream', details: err.message }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        }
      );
    }
  }
};
