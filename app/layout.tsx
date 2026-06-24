import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/hooks/use-auth'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'VitrineAI - Transforme suas vendas com IA',
  description: 'Crie imagens profissionais, vídeos promocionais, descrições e títulos de alta conversão para marketplaces usando Inteligência Artificial. Ideal para vendedores da Shopee, Mercado Livre, Amazon e TikTok Shop.',
  keywords: ['IA', 'marketplace', 'Shopee', 'Mercado Livre', 'Amazon', 'TikTok Shop', 'e-commerce', 'vendas online', 'geração de imagens', 'copywriting'],
  openGraph: {
    title: 'VitrineAI - Transforme suas vendas com IA',
    description: 'Crie conteúdo de alta conversão para marketplaces usando IA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VitrineAI',
    description: 'Transforme suas vendas com Inteligência Artificial',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
