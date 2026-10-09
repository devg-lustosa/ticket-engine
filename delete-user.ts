import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const email = 'soufeiomil428@gmail.com'
  
  const user = await prisma.user.findUnique({
    where: { email }
  })

  if (user) {
    console.log(`Deletando usuário do Prisma: ${user.name}`)
    await prisma.user.delete({ where: { id: user.id } })
  }

  const { data } = await supabase.auth.admin.listUsers()
  const authUser = data.users.find(u => u.email === email)

  if (authUser) {
    console.log(`Deletando usuário do Supabase: ${authUser.email}`)
    await supabase.auth.admin.deleteUser(authUser.id)
  }
  
  console.log("Feito!")
}

main().catch(console.error).finally(() => prisma.$disconnect())
