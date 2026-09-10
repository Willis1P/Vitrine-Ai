import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest, getServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const { user, supabase } = await getUserFromRequest(request.headers.get('authorization'))

  if (!user || !supabase) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado: apenas administradores' }, { status: 403 })
  }

  let body: { email?: string; amount?: number; action?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const email = (body.email || '').trim().toLowerCase()
  if (!email) {
    return NextResponse.json({ error: 'Informe o email do usuário' }, { status: 400 })
  }

  const admin = getServiceClient()

  const { data: authUsers, error: authError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })

  if (authError || !authUsers) {
    return NextResponse.json({ error: authError?.message || 'Erro ao buscar usuário' }, { status: 500 })
  }

  const target = authUsers.users.find(
    (u) => (u.email || '').toLowerCase() === email
  )

  if (!target) {
    return NextResponse.json({ error: `Usuário não encontrado: ${email}` }, { status: 404 })
  }

  if (body.action === 'activate_vitalicio') {
    const { data: plan } = await admin
      .from('plans')
      .select('id, credits')
      .eq('slug', 'vitalicio')
      .eq('is_active', true)
      .maybeSingle()

    if (!plan) {
      return NextResponse.json({ error: 'Plano vitalicio não encontrado' }, { status: 500 })
    }

    await admin
      .from('user_subscriptions')
      .update({ status: 'cancelled' })
      .eq('user_id', target.id)
      .eq('status', 'active')

    const { data: subscription, error: subError } = await admin
      .from('user_subscriptions')
      .insert({
        user_id: target.id,
        plan_id: plan.id,
        credits_remaining: plan.credits,
        credits_used: 0,
        started_at: new Date().toISOString(),
        expires_at: null,
        status: 'active',
      })
      .select()
      .single()

    if (subError) {
      return NextResponse.json({ error: subError.message }, { status: 500 })
    }

    const { error: txError } = await admin.from('credit_transactions').insert({
      user_id: target.id,
      amount: plan.credits,
      type: 'purchase',
      description: 'Plano Vitalício (admin)',
      reference_type: 'plan',
      reference_id: plan.id,
    })

    if (txError) {
      return NextResponse.json({ error: txError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      user_id: target.id,
      plan: 'vitalicio',
      credits_added: plan.credits,
      subscription_id: subscription.id,
    })
  }

  if (body.action === 'add_credits') {
    const amount = Number(body.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Quantidade de créditos inválida' }, { status: 400 })
    }

    const { data: tx, error: txError } = await admin
      .from('credit_transactions')
      .insert({
        user_id: target.id,
        amount,
        type: 'bonus',
        description: 'Créditos adicionados (admin)',
        reference_type: 'payment',
      })
      .select()
      .single()

    if (txError) {
      return NextResponse.json({ error: txError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      user_id: target.id,
      credits_added: amount,
      transaction_id: tx.id,
    })
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}