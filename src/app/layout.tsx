import type { Metadata } from 'next'
import { Cormorant_Garamond, Source_Serif_4 } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cormorant',
})

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-source-serif',
})

export const metadata: Metadata = {
  title: 'POS TINOCO',
  description: 'Sistema de Punto de Venta — TINOCO software',
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${cormorant.variable} ${sourceSerif.variable} font-body antialiased`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
