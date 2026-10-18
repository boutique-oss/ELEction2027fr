import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// Icône de l'écran d'accueil : drapeau tricolore arrondi sur fond sombre
export default function Icone() {
  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: 180, height: 180, background: '#141416', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', width: 120, height: 120, borderRadius: 30, overflow: 'hidden' }}>
          <div style={{ display: 'flex', width: 40, background: '#0055a4' }} />
          <div style={{ display: 'flex', width: 40, background: '#ffffff' }} />
          <div style={{ display: 'flex', width: 40, background: '#ef4135' }} />
        </div>
      </div>
    ),
    size,
  );
}
