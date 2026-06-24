"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowRight,
  Sparkles,
  ImageIcon,
  Video,
  User,
  FileText,
  TrendingUp,
  GraduationCap,
  Check,
  Zap,
  Shield,
  Crown,
  Star,
  Play,
  ChevronRight,
  Menu,
  X,
  Bot,
  Palette,
  ShoppingCart,
  MessageSquare,
  Target,
  Users,
  Clock,
  Gift,
} from 'lucide-react'

const features = [
  {
    icon: ImageIcon,
    title: "Geracao de Imagens",
    description: "Crie fotos profissionais, fundo branco, lifestyle e banners promocionais em segundos.",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    icon: User,
    title: "Modelos Virtuais",
    description: "Aplique seu produto em modelos virtuais de diferentes idades, estilos e cenarios.",
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    icon: Video,
    title: "Videos Promocionais",
    description: "Gere videos verticais para TikTok, Reels e Shorts que convertem.",
    gradient: "from-violet-500 to-purple-500",
  },
  {
    icon: FileText,
    title: "Copywriting",
    description: "Titulos, descricoes e hashtags otimizadas para SEO e conversao.",
    gradient: "from-orange-500 to-red-500",
  },
  {
    icon: Palette,
    title: "Templates Premium",
    description: "Biblioteca completa de templates organizados por categoria.",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    icon: TrendingUp,
    title: "Trending Products",
    description: "Descubra produtos em alta e nichos em crescimento.",
    gradient: "from-yellow-500 to-amber-500",
  },
]

const plans = [
  {
    name: "Teste",
    price: "Gratis",
    duration: "30 dias",
    credits: 10,
    features: [
      "10 creditos gratuitos",
      "Biblioteca basica de templates",
      "Geracao de imagens simples",
      "Suporte por email",
    ],
    popular: false,
    cta: "Comecar gratis",
    href: "/auth/signup",
  },
  {
    name: "Profissional",
    price: "R$ 97",
    duration: "90 dias",
    credits: 200,
    features: [
      "200 creditos",
      "Todos os templates premium",
      "Videos avancados",
      "Modelos virtuais",
      "Copywriting profissional",
      "Suporte prioritario",
      "Acesso aos trending products",
    ],
    popular: true,
    cta: "Comecar agora",
    href: "/auth/signup?plan=profissional",
  },
  {
    name: "Vitalicio",
    price: "R$ 297",
    duration: "Para sempre",
    credits: 500,
    features: [
      "500 creditos iniciais",
      "Acesso permanente",
      "Todas atualizacoes futuras",
      "Todos os recursos premium",
      "Modelos virtuais ilimitados",
      "Prioridade em novos recursos",
      "Suporte VIP",
      "Acesso vitalicio a academia",
    ],
    popular: false,
    cta: "Garantir acesso",
    href: "/auth/signup?plan=vitalicio",
  },
]

const marketplaces = [
  { name: "Shopee", logo: "shopping-bag" },
  { name: "Mercado Livre", logo: "store" },
  { name: "Amazon", logo: "package" },
  { name: "TikTok Shop", logo: "music" },
  { name: "Magalu", logo: "building-2" },
  { name: "Shein", logo: "shirt" },
]

const testimonials = [
  {
    name: "Marina Costa",
    role: "Vendedora Shopee",
    content: "Aumentei minhas vendas em 340% depois de comecar a usar o VitrineAI. As imagens ficam profissionais e a descricao e perfeita.",
    avatar: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?w=100&h=100&fit=crop",
  },
  {
    name: "Roberto Silva",
    role: "Dropshipper Amazon",
    content: "Economizo horas todo dia. Antes eu gastava um tempao editando fotos no Photoshop. Agora e so um clique.",
    avatar: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?w=100&h=100&fit=crop",
  },
  {
    name: "Carla Mendes",
    role: "Afiliada TikTok",
    content: "Os videos gerados sao incriveis! Meus reels estao tendo milhoes de visualizacoes. O retorno sobre investimento e absurdo.",
    avatar: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?w=100&h=100&fit=crop",
  },
]

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'glass border-b border-slate-800/50' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-white">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
                <span className="text-slate-900 font-bold">V</span>
              </div>
              VitrineAI
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-slate-400 hover:text-white transition-colors">Recursos</Link>
              <Link href="#pricing" className="text-slate-400 hover:text-white transition-colors">Precos</Link>
              <Link href="#testimonials" className="text-slate-400 hover:text-white transition-colors">Depoimentos</Link>
              <Link href="/academy" className="text-slate-400 hover:text-white transition-colors">Academia</Link>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <Link href="/auth/login">
                <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800">
                  Entrar
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold">
                  Criar conta gratis
                </Button>
              </Link>
            </div>

            <button
              className="md:hidden p-2 text-slate-400"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden glass border-b border-slate-800">
            <div className="px-4 py-4 space-y-4">
              <Link href="#features" className="block text-slate-300 hover:text-white">Recursos</Link>
              <Link href="#pricing" className="block text-slate-300 hover:text-white">Precos</Link>
              <Link href="#testimonials" className="block text-slate-300 hover:text-white">Depoimentos</Link>
              <Link href="/academy" className="block text-slate-300 hover:text-white">Academia</Link>
              <div className="flex flex-col gap-2 pt-4 border-t border-slate-700">
                <Link href="/auth/login">
                  <Button variant="outline" className="w-full border-slate-700 text-slate-300">Entrar</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500">Criar conta</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-950 to-slate-950" />

        <div className="absolute top-20 left-1/4 w-72 h-72 bg-emerald-500/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative max-w-7xl mx-auto text-center">
          <Badge className="mb-6 px-4 py-2 bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20">
            <Sparkles className="w-4 h-4 mr-2" />
            Inteligencia Artificial para Vendedores
          </Badge>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Transforme suas vendas
            <br />
            com <span className="gradient-text">Inteligencia Artificial</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Crie imagens profissionais, videos promocionais, descricoes e titulos de alta conversao
            para Shopee, Mercado Livre, Amazon e TikTok Shop. Sem precisar de prompts ou ferramentas complexas.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/auth/signup">
              <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold px-8 h-14 text-lg group">
                Comecar gratis
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="#demo">
              <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 px-8 h-14">
                <Play className="mr-2 w-5 h-5" />
                Ver demonstracao
              </Button>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              10 creditos gratis
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              Sem cartao de credito
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              Cancele quando quiser
            </div>
          </div>
        </div>

        {/* Hero Image */}
        <div className="relative max-w-6xl mx-auto mt-16">
          <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-emerald-500/20 rounded-2xl blur-2xl" />
          <div className="relative glass rounded-2xl border border-slate-700/50 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/50">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="inline-flex items-center gap-3 px-6 py-4 rounded-xl bg-slate-800/50 border border-slate-700 mb-6">
                  <ShoppingCart className="w-8 h-8 text-emerald-400" />
                  <div className="text-left">
                    <p className="text-white font-medium">Vestido Feminino Floral</p>
                    <p className="text-slate-400 text-sm">Moda Feminina</p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-4">
                  <ChevronRight className="w-6 h-6 text-slate-600" />
                  <div className="px-6 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                    <p className="text-emerald-400 text-sm">Objetivo: Aumentar Conversao</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-slate-600" />
                  <div className="px-6 py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                    <p className="text-cyan-400 text-sm">Marketplace: Shopee</p>
                  </div>
                </div>
                <div className="mt-8 flex items-center justify-center gap-6">
                  <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 flex items-center justify-center">
                    <Video className="w-8 h-8 text-violet-400" />
                  </div>
                  <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-cyan-400" />
                  </div>
                  <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 flex items-center justify-center">
                    <User className="w-8 h-8 text-orange-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marketplaces */}
      <section className="py-16 px-4 border-y border-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-slate-500 text-sm mb-8">Compativel com os principais marketplaces</p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {marketplaces.map((marketplace) => (
              <div key={marketplace.name} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                <ShoppingCart className="w-6 h-6" />
                <span className="font-medium">{marketplace.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 px-4 py-2 bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
              Recursos
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Tudo que voce precisa para vender mais
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Ferramentas poderosas criadas especificamente para vendedores de marketplace.
              Resultados profissionais em segundos.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="group bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 transition-all duration-300 overflow-hidden">
                <CardHeader>
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <CardTitle className="text-white text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4 bg-gradient-to-b from-slate-900/0 via-slate-800/50 to-slate-900/0">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 px-4 py-2 bg-cyan-500/10 border-cyan-500/20 text-cyan-400">
              Simplicidade
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              3 cliques para resultados incriveis
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Nossa IA guia voce em cada passo. Basta informar o produto e escolher o objetivo.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Informe seu produto", desc: "Descreva, envie uma foto ou cole a URL do seu produto", icon: Target },
              { step: "02", title: "Escolha seu objetivo", desc: "Selecione o tipo de conteudo e marketplace de destino", icon: Zap },
              { step: "03", title: "Receba resultados", desc: "IA gera imagens, videos, titulos e descricoes otimizados", icon: Sparkles },
            ].map((item, i) => (
              <div key={item.step} className="relative">
                {i < 2 && (
                  <div className="hidden md:block absolute top-20 right-0 w-1/2 h-0.5 bg-gradient-to-r from-slate-700 to-transparent" />
                )}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 mb-6">
                    <item.icon className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div className="text-4xl font-bold text-slate-700 mb-2">{item.step}</div>
                  <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 px-4 py-2 bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
              Precos
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Planos para todos os tamanhos
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Comece gratis e escale conforme suas necessidades. Sem surpresas, sem taxas ocultas.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative bg-slate-900/50 border-slate-800 ${
                  plan.popular ? 'border-emerald-500/50 ring-1 ring-emerald-500/50' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white border-0">
                      Mais popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pt-8">
                  <CardTitle className="text-white text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    {plan.duration !== "Para sempre" && (
                      <span className="text-slate-400"> / {plan.duration}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Gift className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">{plan.credits} creditos</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="text-slate-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href={plan.href} className="w-full">
                    <Button
                      className={`w-full ${plan.popular ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}
                      size="lg"
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-6 px-8 py-4 rounded-xl bg-slate-800/50 border border-slate-700">
              <div className="flex items-center gap-2 text-slate-300">
                <Shield className="w-5 h-5 text-emerald-400" />
                Pagamento seguro
              </div>
              <div className="w-px h-6 bg-slate-700" />
              <div className="flex items-center gap-2 text-slate-300">
                <Clock className="w-5 h-5 text-emerald-400" />
                Garantia de 7 dias
              </div>
              <div className="w-px h-6 bg-slate-700" />
              <div className="flex items-center gap-2 text-slate-300">
                <Users className="w-5 h-5 text-emerald-400" />
                +5.000 usuarios
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-4 bg-gradient-to-b from-slate-900/0 via-slate-800/50 to-slate-900/0">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 px-4 py-2 bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
              Depoimentos
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              O que nossos usuarios dizem
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.name} className="bg-slate-900/50 border-slate-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-slate-300 mb-6">&ldquo;{testimonial.content}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-medium text-white">{testimonial.name}</p>
                      <p className="text-sm text-slate-400">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass rounded-3xl border border-slate-700/50 p-12 md:p-16 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-emerald-500/10" />
            <div className="relative">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                Pronto para vender mais?
              </h2>
              <p className="text-slate-400 text-lg mb-8 max-w-2xl mx-auto">
                Junte-se a milhares de vendedores que ja estao usando IA para criar conteudo de alta conversao.
              </p>
              <Link href="/auth/signup">
                <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold px-12 h-14 text-lg group">
                  Comecar agora - e gratis
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <p className="mt-4 text-sm text-slate-500">
                Nenhum cartao de credito necessario
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <Link href="/" className="flex items-center gap-2 text-xl font-bold text-white mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
                  <span className="text-slate-900 font-bold">V</span>
                </div>
                VitrineAI
              </Link>
              <p className="text-slate-400 text-sm">
                Transformando vendas com Inteligencia Artificial. Crie conteudo de alta conversao em segundos.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="#features" className="hover:text-white transition-colors">Recursos</Link></li>
                <li><Link href="#pricing" className="hover:text-white transition-colors">Precos</Link></li>
                <li><Link href="/templates" className="hover:text-white transition-colors">Templates</Link></li>
                <li><Link href="/trending" className="hover:text-white transition-colors">Trending</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Recursos</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="/academy" className="hover:text-white transition-colors">Academia</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/help" className="hover:text-white transition-colors">Central de Ajuda</Link></li>
                <li><Link href="/api" className="hover:text-white transition-colors">API</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="/terms" className="hover:text-white transition-colors">Termos de Uso</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacidade</Link></li>
                <li><Link href="/refund" className="hover:text-white transition-colors">Reembolso</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-sm">
              {new Date().getFullYear()} VitrineAI. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-4 text-slate-400">
              <a href="#" className="hover:text-white transition-colors">
                <MessageSquare className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
