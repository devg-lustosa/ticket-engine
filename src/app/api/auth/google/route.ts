import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  // Precisamos do origin pra redirecionar corretamente
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/api/auth/callback`,
    },
  })

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=Erro ao iniciar login com Google`, { status: 303 })
  }

  if (data.url) {
    return NextResponse.redirect(data.url, { status: 303 })
  }

  return NextResponse.redirect(`${origin}/login?error=Erro ao gerar URL do Google`, { status: 303 })
}
