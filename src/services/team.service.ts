import { Prisma, type Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";

export async function changeTeamRole(actorId: string, targetId: string, role: Role) {
  if (actorId === targetId) throw new ApiError(400, "Você não pode alterar o próprio cargo.");
  return prisma.$transaction(async tx => {
    // Revalidar sob trava impede que remoções simultâneas deixem a casa sem organizador.
    const ids = [actorId, targetId].sort();
    await tx.$queryRaw(Prisma.sql`SELECT id FROM users WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`);
    const actor = await tx.user.findUnique({ where: { id: actorId } });
    if (actor?.role !== "ORGANIZER") throw new ApiError(403, "Acesso negado.");
    const target = await tx.user.findUnique({ where: { id: targetId } });
    if (!target) throw new ApiError(404, "Usuário não encontrado.");
    return tx.user.update({ where: { id: targetId }, data: { role } });
  });
}
