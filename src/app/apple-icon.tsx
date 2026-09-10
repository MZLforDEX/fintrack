import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';
export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #064e3b 50%, #10b981 100%)',
          borderRadius: '40px',
          border: '3px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        <div
          style={{
            width: '110px',
            height: '75px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '10px',
            boxShadow: '0 10px 20px rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
          }}
        >
          <div
            style={{
              width: '20px',
              height: '16px',
              background: '#fbbf24',
              borderRadius: '4px',
            }}
          />
          <span style={{ color: 'white', fontSize: '11px', fontWeight: 800, letterSpacing: '1px' }}>
            FINTRACK
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
