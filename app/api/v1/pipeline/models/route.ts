import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { user, supabase } = await getUserFromRequest(request.headers.get('authorization'))
  if (!user || !supabase) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Modelos já gerados pelo usuário (generated_content type=model) como biblioteca
  const { data, error } = await supabase
    .from('generated_content')
    .select('id, result_url, result_data, product_name, created_at')
    .eq('user_id', user.id)
    .eq('type', 'model')
    .eq('status', 'completed')
    .not('result_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(24)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Cada registro tem até 3 modelos em result_data.models
  const models: any[] = []
  for (const row of data || []) {
    const arr = (row.result_data as any)?.models || [{ url: row.result_url, id: row.id }]
    for (const m of arr) {
      models.push({
        id: m.id || row.id,
        url: m.url || row.result_url,
        name: row.product_name || 'Modelo',
        created_at: row.created_at,
        source: 'generated',
      })
    }
  }

  return NextResponse.json({ models: models.slice(0, 24) })
}
