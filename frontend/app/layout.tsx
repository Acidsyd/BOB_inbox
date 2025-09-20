import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BOBinbox - B2B Email Marketing Automation Platform',
  description: 'Scale your B2B email marketing with BOBinbox - intelligent automation, professional account management, and superior deliverability',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BOBinbox',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-touch-fullscreen': 'yes',
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#9333ea',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="apple-touch-icon" sizes="180x180" href="/bobinbox-logo.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/bobinbox-logo.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/bobinbox-logo.png" />
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Ensure gradient text works */
            .gradient-text {
              background: linear-gradient(to right, #9333ea, #2563eb) !important;
              -webkit-background-clip: text !important;
              background-clip: text !important;
              -webkit-text-fill-color: transparent !important;
              color: transparent !important;
            }
            
            .btn-primary {
              background: linear-gradient(to right, #9333ea, #7c3aed) !important;
              color: white !important;
              font-weight: 500 !important;
              padding: 12px 24px !important;
              border-radius: 12px !important;
              border: none !important;
              cursor: pointer !important;
              transition: all 0.2s ease !important;
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
            }
            
            .btn-primary:hover {
              background: linear-gradient(to right, #7c3aed, #6d28d9) !important;
              transform: translateY(-1px) !important;
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1) !important;
            }

            /* Additional animation utilities */
            @keyframes slide-in-right {
              from {
                transform: translateX(100%);
                opacity: 0;
              }
              to {
                transform: translateX(0);
                opacity: 1;
              }
            }
            
            @keyframes slide-out-right {
              from {
                transform: translateX(0);
                opacity: 1;
              }
              to {
                transform: translateX(100%);
                opacity: 0;
              }
            }
            
            @keyframes progress-bar {
              from {
                width: 100%;
              }
              to {
                width: 0%;
              }
            }
            
            .animate-slide-in-right {
              animation: slide-in-right 0.3s ease-out;
            }
            
            .animate-slide-out-right {
              animation: slide-out-right 0.15s ease-in;
            }
            
            .animate-progress-bar {
              animation: progress-bar 5s linear;
              animation-fill-mode: forwards;
            }
          `
        }} />
        <script dangerouslySetInnerHTML={{
          __html: `
            // Register service worker
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
                  .then(function(registration) {
                    console.log('Service Worker registered successfully:', registration.scope);
                  })
                  .catch(function(error) {
                    console.log('Service Worker registration failed:', error);
                  });
              });
            }
            
            // Handle offline/online events
            window.addEventListener('online', function() {
              document.body.classList.remove('offline');
            });
            
            window.addEventListener('offline', function() {
              document.body.classList.add('offline');
            });
          `
        }} />
      </head>
      <body className={`${inter.className} bg-white text-gray-900`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}