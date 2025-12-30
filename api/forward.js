// api/forward.js
// Node 18+ (Vercel runtime) - no extra packages required
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  try {
    const body = req.body;
    // Basic validation
    if (!body || !body.type) {
      res.status(400).send('Bad request');
      return;
    }

    const FORWARD_WEBHOOK = process.env.FORWARD_WEBHOOK_URL;
    if (!FORWARD_WEBHOOK) {
      res.status(500).send('Server not configured: FORWARD_WEBHOOK_URL missing');
      return;
    }

    // Build a FormData object
    const form = new FormData();
    const contentLines = [
      `**${(body.type || 'complaint').toUpperCase()}** • Priority: ${(body.priority||'normal')}`,
      `**From:** ${(body.user && body.user.username) || 'Unknown'} (${(body.user && body.user.id) || '—'})`,
      `**Email:** ${(body.user && body.user.email) || '—'}`,
      `**Time:** ${body.created_at || new Date().toISOString()}`,
      ``,
      `${body.description || '*No description provided*'}`
    ];
    form.append('content', contentLines.join('\n'));

    // Attach files
    if (Array.isArray(body.files)) {
      for (let i = 0; i < body.files.length; i++) {
        const f = body.files[i];
        const buffer = Buffer.from(f.data, 'base64');
        // Node's FormData in modern runtimes supports append(name, Blob|Buffer, filename)
        form.append('file' + i, new Blob([buffer]), f.name);
      }
    }

    // POST to Discord webhook
    const resp = await fetch(FORWARD_WEBHOOK, {
      method: 'POST',
      body: form
    });

    if (!resp.ok) {
      const txt = await resp.text();
      res.status(502).send('Webhook failed: ' + resp.status + ' ' + txt);
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal error: ' + String(err.message || err));
  }
}
