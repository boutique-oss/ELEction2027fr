import { ImageResponse } from 'next/og';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

export default function Favicon() {
  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: 64, height: 64, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', width: 22, background: '#0055a4' }} />
        <div style={{ display: 'flex', width: 21, background: '#ffffff' }} />
        <div style={{ display: 'flex', width: 21, background: '#ef4135' }} />
      </div>
    ),
    size,
  );
}
