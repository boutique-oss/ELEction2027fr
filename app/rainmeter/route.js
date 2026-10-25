// GET /rainmeter : skin Rainmeter « Présidentielle 2027 · Sondages » en .zip, déjà réglé sur l'adresse du site.
// À décompresser dans Documents\Rainmeter\Skins, rien à modifier. Le .ini est converti en UTF-16 LE
// (seul encodage où Rainmeter lit les accents), le .lua reste en ASCII.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const DOSSIER = 'Presidentielle2027Sondages';

const TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// Archive .zip minimale, fichiers stockés sans compression
function zip(fichiers) {
  const d = new Date();
  const heure = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const jour = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const locaux = [], central = [];
  let pos = 0;
  for (const [nom, contenu] of fichiers) {
    const n = Buffer.from(nom, 'utf8'), crc = crc32(contenu);
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(0, 8);
    h.writeUInt16LE(heure, 10); h.writeUInt16LE(jour, 12); h.writeUInt32LE(crc, 14);
    h.writeUInt32LE(contenu.length, 18); h.writeUInt32LE(contenu.length, 22); h.writeUInt16LE(n.length, 26);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8);
    c.writeUInt16LE(0, 10); c.writeUInt16LE(heure, 12); c.writeUInt16LE(jour, 14); c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(contenu.length, 20); c.writeUInt32LE(contenu.length, 24); c.writeUInt16LE(n.length, 28);
    c.writeUInt32LE(pos, 42);
    locaux.push(h, n, contenu);
    central.push(c, n);
    pos += 30 + n.length + contenu.length;
  }
  const taille = central.reduce((t, b) => t + b.length, 0);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(fichiers.length, 8); fin.writeUInt16LE(fichiers.length, 10);
  fin.writeUInt32LE(taille, 12); fin.writeUInt32LE(pos, 16);
  return Buffer.concat([...locaux, ...central, fin]);
}

const crlf = (t) => t.replace(/\r?\n/g, '\r\n');

export async function GET(req) {
  const site = new URL(req.url).origin;
  const lire = (f) => readFile(join(process.cwd(), 'rainmeter', DOSSIER, f), 'utf-8');
  const [ini, lua] = await Promise.all([lire('Sondages.ini'), lire('Sondages.lua')]);
  const archive = zip([
    [`${DOSSIER}/Sondages.ini`, Buffer.from('﻿' + crlf(ini.replace('__SITE__', site)), 'utf16le')],
    [`${DOSSIER}/Sondages.lua`, Buffer.from(crlf(lua), 'utf8')],
  ]);
  return new Response(archive, {
    headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${DOSSIER}.zip"` },
  });
}
