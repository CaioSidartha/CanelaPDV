import { redirect } from "next/navigation";

/** Rota legada — catálogo agora é modal no caixa. */
export default function VendaCatalogoRedirect() {
  redirect("/venda");
}
