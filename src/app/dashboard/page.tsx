import { redirect } from "next/navigation";

/** Mantido por compatibilidade — painel vive em /admin */
export default function DashboardRedirect() {
  redirect("/admin/analytics");
}
