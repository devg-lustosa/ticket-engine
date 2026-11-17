import { describe, expect, it } from "vitest";
import { allocateCents, discountedTotal, toCents } from "@/lib/money";

describe("valores de pedidos", () => {
  it("deveConverterDecimalSemPerderCentavos", () => { expect(toCents("19.99")).toBe(1999); });
  it("deveRecusarPrecisaoMonetariaMaiorQueDoisDecimais", () => { expect(() => toCents("0.001")).toThrow(); });
  it("deveRatearDescontoEntreIngressosDePrecosDiferentes", () => { expect(allocateCents(12000, [5000, 10000])).toEqual([4000, 8000]); });
  it("deveDistribuirCentavoRestanteSemAlterarTotal", () => { expect(allocateCents(100, [100, 100, 100])).toEqual([34, 33, 33]); });
  it("devePreservarPrecisaoEmProdutosAcimaDeSafeInteger", () => { expect(allocateCents(9999999999, [5000000000, 5000000000])).toEqual([5000000000, 4999999999]); });
  it("deveAplicarCupomPercentual", () => { expect(discountedTotal(10000, "PERCENTAGE", "20")).toBe(8000); });
  it("deveAplicarCupomFixoSemTotalNegativo", () => { expect(discountedTotal(1000, "FIXED", "20")).toBe(0); });
  it("deveRecusarCupomPercentualAcimaDeCem", () => { expect(() => discountedTotal(10000, "PERCENTAGE", "101")).toThrow(); });
});
