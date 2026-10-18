// GET /scriptable : le script du widget iPhone, déjà réglé sur l'adresse du site
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function GET(req) {
  const site = new URL(req.url).origin;
  const code = await readFile(join(process.cwd(), 'scriptable', 'Presidentielle2027.js'), 'utf-8');
  return new Response(code.replace('__SITE__', site), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
