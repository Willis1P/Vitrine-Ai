"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase, Plan } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  Zap,
  Check,
  Crown,
  Star,
  Gift,
  Loader2,
  ShoppingCart,
} from 'lucide-react'

const CREDIT_PACKS = [
  { id: 'small', credits: 50, price: 29.90, popular: false },
  { id: 'medium', credits: 100, price: 49.90, popular: true },
  { id: 'large', credits: 250, price: 99.90, popular: false },
  { id: 'xl', credits: 500, price: 179.90, popular: false },
]

export default function PlansPage() {
  const { user, credits, unlimited } = useAuth()
  const { toast } = useToast()
  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [selectedPack, setSelectedPack] = useState('medium')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      const { data } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (data) setPlans(data)
    } catch (error) {
      console.error('Error fetching plans:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async () => {
    if (!user) {
      toast({ title: "Erro", description: "Voce precisa estar logado", variant: "destructive" })
      return
    }

    setProcessing(true)

    try {
      const pack = CREDIT_PACKS.find(p => p.id === selectedPack)
      if (!pack) return

      // In production, this would redirect to Mercado Pago
      // For now, we'll simulate the payment

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          amount: pack.price,
          payment_method: 'pix',
          gateway: 'mercadopago',
          status: 'pending',
          credits_added: pack.credits,
        })
        .select()
        .single()

      if (paymentError) throw paymentError

      // Simulate successful payment
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Add credits
      await supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: pack.credits,
        type: 'purchase',
        description: `Compra de ${pack.credits} creditos`,
        reference_type: 'payment',
        reference_id: payment.id,
      })

      // Update payment status
      await supabase
        .from('payments')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', payment.id)

      toast({
        title: "Pagamento processado!",
        description: `${pack.credits} creditos adicionados a sua conta`
      })

      // Refresh page to show new credits
      window.location.reload()
    } catch (error: any) {
      toast({
        title: "Erro no pagamento",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setProcessing(false)
    }
  }

  const handlePlanSubscribe = async (plan: Plan) => {
    if (!user) {
      toast({ title: "Erro", description: "Voce precisa estar logado", variant: "destructive" })
      return
    }

    setProcessing(true)

    try {
      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          plan_id: plan.id,
          amount: plan.price,
          payment_method: 'pix',
          gateway: 'mercadopago',
          status: 'pending',
          credits_added: plan.credits,
        })
        .select()
        .single()

      if (paymentError) throw paymentError

      // Simulate successful payment
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Add credits
      await supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: plan.credits,
        type: 'purchase',
        description: `Plano ${plan.name}`,
        reference_type: 'plan',
        reference_id: plan.id,
      })

      // Create subscription
      const expiresAt = plan.duration_days
        ? new Date(Date.now() + plan.duration_days * 24 * 60 * 60 * 1000).toISOString()
        : null

      await supabase.from('user_subscriptions').insert({
        user_id: user.id,
        plan_id: plan.id,
        credits_remaining: plan.credits,
        expires_at: expiresAt,
        status: 'active',
      })

      // Update payment status
      await supabase
        .from('payments')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', payment.id)

      toast({
        title: "Assinatura ativada!",
        description: `Plano ${plan.name} ativado com sucesso`
      })

      window.location.reload()
    } catch (error: any) {
      toast({
        title: "Erro na assinatura",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Planos e Creditos</h1>
        <p className="text-slate-400 mt-1">Escolha o plano ideal para seu negocio</p>
      </div>

      {/* Current Credits */}
      <Card className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-emerald-500/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Seus creditos</p>
                {unlimited ? (
                  <p className="text-4xl font-bold text-cyan-400">Ilimitado</p>
                ) : (
                  <p className="text-4xl font-bold text-white">{credits}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plans */}
      <div className="grid md:grid-cols-3 gap-6">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-80 rounded-xl bg-slate-800 animate-pulse" />
          ))
        ) : (
          plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative bg-slate-900/50 border-slate-800 ${
                plan.slug === 'profissional' ? 'border-emerald-500/50 ring-1 ring-emerald-500/50' : ''
              }`}
            >
              {plan.slug === 'profissional' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white border-0">
                    Mais popular
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center pt-8">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
                  {plan.slug === 'teste' ? <Gift className="w-6 h-6 text-white" /> :
                   plan.slug === 'vitalicio' ? <Crown className="w-6 h-6 text-white" /> :
                   <Star className="w-6 h-6 text-white" />}
                </div>
                <CardTitle className="text-white text-2xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-white">
                    R$ {Number(plan.price).toLocaleString('pt-BR')}
                  </span>
                  {plan.duration_days && (
                    <span className="text-slate-400"> / {plan.duration_days} dias</span>
                  )}
                  {!plan.duration_days && plan.price > 0 && (
                    <span className="text-slate-400"> / unica vez</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {(plan.features as string[])?.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.slug === 'profissional' ? 'default' : 'outline'}
                  onClick={() => handlePlanSubscribe(plan)}
                  disabled={processing || plan.price === 0}
                >
                  {processing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : plan.price === 0 ? (
                    ' Gratis'
                  ) : (
                    <ShoppingCart className="w-4 h-4 mr-2" />
                  )}
                  {plan.price === 0 ? 'Ja incluido' : 'Assinar agora'}
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {/* Credit Packs */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-400" />
            Comprar Creditos Avulsos
          </CardTitle>
          <CardDescription>Adicione creditos extras quando precisar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={selectedPack} onValueChange={setSelectedPack} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CREDIT_PACKS.map((pack) => (
              <div key={pack.id} className="relative">
                {pack.popular && (
                  <Badge className="absolute -top-2 right-2 bg-emerald-500 text-white text-xs">
                    Popular
                  </Badge>
                )}
                <RadioGroupItem
                  value={pack.id}
                  id={pack.id}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={pack.id}
                  className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-slate-700 bg-slate-800/50 cursor-pointer hover:border-slate-600 peer-data-[state=checked]:border-emerald-500 peer-data-[state=checked]:bg-emerald-500/10 transition-all"
                >
                  <Zap className="w-8 h-8 text-emerald-400 mb-2" />
                  <span className="text-2xl font-bold text-white">{pack.credits}</span>
                  <span className="text-sm text-slate-400">creditos</span>
                  <span className="text-lg font-semibold text-emerald-400 mt-2">
                    R$ {pack.price.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-xs text-slate-500">
                    {(pack.price / pack.credits * 100).toFixed(0)} centavos/credito
                  </span>
                </Label>
              </div>
            ))}
          </RadioGroup>

          <Button
            className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold h-12"
            onClick={handlePurchase}
            disabled={processing}
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <ShoppingCart className="w-5 h-5 mr-2" />
                Comprar Agora (PIX)
              </>
            )}
          </Button>

          <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
            <div className="flex items-center gap-1">
              <Check className="w-4 h-4 text-emerald-400" />
              Pagamento seguro
            </div>
            <div className="flex items-center gap-1">
              <Check className="w-4 h-4 text-emerald-400" />
              Creditos imediatos
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
