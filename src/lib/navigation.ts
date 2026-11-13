export type NavigationRole = "BUYER" | "ORGANIZER" | "STAFF" | string | null;
export type NavigationGroup = { label: string; links: { label: string; href: string; description: string }[] };

export function homeForRole(role: NavigationRole) {
  if (role === "ORGANIZER") return "/painel";
  if (role === "STAFF") return "/portaria";
  return "/eventos";
}

export function navigationForRole(role: NavigationRole): NavigationGroup[] {
  const groups: NavigationGroup[] = [];
  if (role === "ORGANIZER") groups.push({ label: "Gestão", links: [
    { label: "Meus eventos e borderôs", href: "/painel", description: "Vendas, cupons e fechamento por evento" },
    { label: "Criar evento", href: "/painel/eventos/novo", description: "Prepare a programação e os lotes" },
    { label: "Equipe", href: "/painel/equipe", description: "Contas de operação da casa" },
    { label: "Configurações", href: "/painel/configuracoes", description: "Dados da sua conta de organização" },
  ] });
  if (role === "ORGANIZER" || role === "STAFF") groups.push({ label: "Operação", links: [
    { label: "Portaria", href: "/portaria", description: "Selecione o evento e valide ingressos" },
    { label: "Ajuda da portaria", href: "/ajuda#portaria", description: "Lista offline e conflitos de entrada" },
  ] });
  groups.push({ label: "Ingressos", links: [
    { label: "Próximos eventos", href: "/eventos", description: "Programação e ingressos disponíveis" },
    ...(role ? [{ label: "Meus ingressos", href: "/meus-ingressos", description: "QR Code, participante e reembolso" }] : []),
  ] });
  groups.push({ label: "Ajuda", links: [
    { label: "Central de ajuda", href: "/ajuda", description: "Como comprar, gerenciar e operar" },
    { label: "Acessibilidade", href: "/ajuda#acessibilidade", description: "Teclado, leitura e avisos" },
  ] });
  return groups;
}
