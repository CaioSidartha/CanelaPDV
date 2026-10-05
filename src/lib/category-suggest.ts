import type { Category } from "@/types";

function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

/** Se a descrição contém o nome de alguma categoria cadastrada, sugere a de maior match. */
export function suggestCategoryId(descricao: string, categories: Category[]): string | undefined {
  const text = norm(descricao);
  if (!text || !categories.length) return undefined;

  let best: { id: string; score: number } | undefined;
  for (const cat of categories) {
    const name = norm(cat.name);
    if (name.length < 3) continue;
    if (!text.includes(name)) continue;
    const score = name.length;
    if (!best || score > best.score) best = { id: cat.id, score };
  }
  return best?.id;
}
