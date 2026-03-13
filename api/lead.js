export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' }
    });
  }

  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  const { name = '', email = '', phone = '', message = '', source = 'justpoint' } = body;

  // Sanitise — server side
  const clean = (s) => String(s).replace(/'/g, "''").substring(0, 500);
  const meta = JSON.stringify({ type: 'enquiry', message: clean(message) }).replace(/'/g, "''");

  const sql = `INSERT INTO cap_leads (email, name, phone, source, status, metadata)
    VALUES ('${clean(email)}','${clean(name)}','${clean(phone)}','${clean(source)}','new','${meta}'::jsonb)
    RETURNING id`;

  const BRIDGE = 'https://m5oqj21chd.execute-api.ap-southeast-2.amazonaws.com/lambda/invoke';
  const BRIDGE_API_KEY = process.env.BRIDGE_API_KEY;

  try {
    const r = await fetch(BRIDGE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'BRIDGE_API_KEY': BRIDGE_API_KEY
      },
      body: JSON.stringify({ fn: 'troy-sql-executor', sql })
    });
    const d = await r.json();
    const id = d.rows?.[0]?.id || null;
    return new Response(JSON.stringify({ ok: true, id }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
