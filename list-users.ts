import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const users = await prisma.user.findMany()
  console.log("Usuarios no banco:", users.map(u => ({ id: u.id, name: u.name, email: u.email })))

  const { data } = await supabase.auth.admin.listUsers()
  console.log("Usuarios no Supabase:", data.users.map(u => ({ id: u.id, email: u.email, name: u.user_metadata?.name })))
}

main().catch(console.error).finally(() => prisma.$disconnect())
