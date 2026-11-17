type Money = string | number | { toString(): string };

export function toCents(value: Money): number {
  const text = String(value);
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new Error("Valor monetário inválido.");
  const [whole, fraction = ""] = text.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) throw new Error("Valor monetário fora do limite.");
  return cents;
}

export function fromCents(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error("Centavos inválidos.");
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

export function allocateCents(total: number, weights: readonly number[]): number[] {
  if (!Number.isSafeInteger(total) || total < 0 || !weights.length || weights.some(w => !Number.isSafeInteger(w) || w < 0)) throw new Error("Rateio inválido.");
  const sum = weights.reduce((a, b) => a + BigInt(b), 0n);
  if (sum === 0n) {
    if (total !== 0) throw new Error("Rateio sem base de preço.");
    return weights.map(() => 0);
  }
  const parts = weights.map((weight, index) => {
    const product = BigInt(total) * BigInt(weight);
    return { index, cents: Number(product / sum), remainder: product % sum };
  });
  const result = parts.map(p => p.cents);
  const remaining = total - result.reduce((a, b) => a + b, 0);
  parts.sort((a, b) => a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1);
  for (let index = 0; index < remaining; index++) result[parts[index].index]++;
  return result;
}

export function discountedTotal(total: number, type: "PERCENTAGE" | "FIXED", value: Money): number {
  const discount = toCents(value);
  if (type === "FIXED") return Math.max(0, total - discount);
  if (discount > 10000) throw new Error("Percentual de desconto inválido.");
  return Number((BigInt(total) * BigInt(10000 - discount) + 5000n) / 10000n);
}
