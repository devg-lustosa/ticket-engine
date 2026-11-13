import { notFound, redirect } from "next/navigation";

export default async function LegacyCheckoutPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(batchId)) notFound();
  redirect("/checkout?" + batchId + "=1");
}
