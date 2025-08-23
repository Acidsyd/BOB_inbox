import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'OPhir - Cold Email Automation Platform',
  description: 'Scale your cold email outreach with intelligent automation and superior deliverability',
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
          `
        }} />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}