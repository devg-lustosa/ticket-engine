import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  let next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Sincronizar Prisma aqui para o Google OAuth!
      try {
        const dbUser = await prisma.user.findUnique({ where: { authId: data.user.id } });
        
        if (!dbUser) {
          // É uma conta nova do Google
          const fullName = data.user.user_metadata?.full_name || data.user.user_metadata?.name || "Usuário";
          const avatarUrl = data.user.user_metadata?.avatar_url || null;
          
          await prisma.user.create({
            data: {
              authId: data.user.id,
              email: data.user.email!,
              name: fullName,
              avatarUrl: avatarUrl, // O Google já nos dá a fotinha de graça!
              role: "BUYER",
            },
          });
          
          // Se for conta nova e ele veio pro /, redirecionar para o onboarding!
          if (next === '/') {
            next = '/completar-perfil';
          }
        } else if (!dbUser.nickname && next === '/') {
          // Mesmo se já existir, mas não completou o perfil (sem nickname)
          next = '/completar-perfil';
        }
      } catch (err) {
        console.error("Erro na sincronização do Google OAuth", err);
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Se der erro ou não tiver code
  return NextResponse.redirect(`${origin}/login?error=O%20link%20expirou%20ou%20é%20inválido`)
}
