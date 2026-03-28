'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Victoria route error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div
          className="min-h-screen flex items-center justify-center p-6"
          style={{ backgroundColor: '#f6efe0' }}
        >
          <div
            className="w-full max-w-md rounded-3xl p-6 text-center"
            style={{
              backgroundColor: '#fffaf0',
              border: '1px solid #d6b968',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
            }}
          >
            <p
              className="font-pixel text-[10px]"
              style={{ color: '#4f7d5c' }}
            >
              Victoria hit a snag
            </p>
            <p className="text-sm mt-4" style={{ color: '#425144' }}>
              The app ran into an unexpected loading issue. You can retry safely.
            </p>

            <div className="flex flex-col gap-3 mt-6">
              <button
                onClick={reset}
                className="w-full py-3 rounded-xl"
                style={{
                  backgroundColor: '#4f7d5c',
                  color: '#ffffff',
                  fontWeight: 600,
                }}
              >
                Try again
              </button>
              <Link
                href="/"
                className="w-full py-3 rounded-xl"
                style={{
                  backgroundColor: '#ead79a',
                  color: '#425144',
                  fontWeight: 600,
                }}
              >
                Go home
              </Link>
              <Link
                href="/onboarding"
                className="w-full py-3 rounded-xl"
                style={{
                  backgroundColor: '#fffaf0',
                  color: '#425144',
                  border: '1px solid #d6b968',
                  fontWeight: 600,
                }}
              >
                Open onboarding
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
