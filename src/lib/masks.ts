export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

/** (00) 0 0000-0000 — 11 digits max, no more, no less. */
export function maskPhone(value: string) {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length === 2) return `(${d}) `;
  if (d.length <= 3) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
}

/** 000.000.000-00 */
export function maskCpf(value: string) {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** 0000 0000 0000 0000 (até 19 dígitos) */
export function maskCardNumber(value: string) {
  const d = onlyDigits(value).slice(0, 19);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ");
}

/** MM/AA */
export function maskExpiry(value: string) {
  const d = onlyDigits(value).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

/** 3 dígitos (4 no Amex) */
export function maskCvv(value: string) {
  return onlyDigits(value).slice(0, 4);
}

/** 00000-000 */
export function maskCep(value: string) {
  const d = onlyDigits(value).slice(0, 8);
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value.trim());
}

export function isValidCpf(value: string) {
  const d = onlyDigits(value);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i += 1) sum += Number(d[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

/** CPF válido gerado aleatoriamente (usado quando o comprador não informa documento). */
export function generateCpf() {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const calc = (digits: number[]) => {
    const len = digits.length;
    let sum = 0;
    for (let i = 0; i < len; i += 1) sum += (digits[i] ?? 0) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  const d1 = calc(base);
  const d2 = calc([...base, d1]);
  return [...base, d1, d2].join("");
}
