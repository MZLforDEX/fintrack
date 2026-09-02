import { ImageResponse } from 'next/og';

export const size = {
  width: 512,
  height: 512,
};
export const contentType = 'image/png';

export default function Icon() {
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
          borderRadius: '112px',
          border: '6px solid rgba(255, 255, 255, 0.15)',
        }}
      >
        {/* Glowing Credit Card / Wallet Icon */}
        <div
          style={{
            width: '320px',
            height: '210px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: '28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '24px',
            border: '2px solid rgba(255, 255, 255, 0.3)',
          }}
        >
          {/* Chip */}
          <div
            style={{
              width: '54px',
              height: '42px',
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
              borderRadius: '8px',
              border: '2px solid rgba(255, 255, 255, 0.4)',
            }}
          />
          
          {/* Card Label */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: 'white',
              fontSize: '28px',
              fontWeight: 900,
              letterSpacing: '2px',
            }}
          >
            <span>FINTRACK</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
