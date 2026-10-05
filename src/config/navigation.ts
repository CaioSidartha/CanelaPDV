import type { LucideIcon } from "lucide-react";
import {
  Home,
  LayoutDashboard,
  Monitor,
  Package,
  Settings,
  ShoppingCart,
  Timer,
  UtensilsCrossed,
  Wallet,
  Shield,
  BarChart3,
  ChefHat,
  UserRound,
} from "lucide-react";
import type { TenantModuleName, UserRole } from "@/types";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Módulo do plano; se ausente, sempre visível (com role). */
  module?: TenantModuleName;
  /** Role mínima */
  minRole?: UserRole;
  group: "operacao" | "admin";
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/inicio", label: "Início", icon: Home, group: "operacao" },
  { href: "/venda", label: "Caixa", icon: ShoppingCart, module: "pdv", group: "operacao" },
  { href: "/rampa", label: "Rampa", icon: ChefHat, module: "comandas", group: "operacao" },
  { href: "/comandas", label: "Comandas", icon: UtensilsCrossed, module: "comandas", group: "operacao" },
  { href: "/caixa", label: "Turno", icon: Wallet, module: "caixa", group: "operacao" },
  { href: "/estoque", label: "Estoque", icon: Package, module: "estoque", group: "operacao" },
  { href: "/ponto", label: "Ponto", icon: Timer, module: "ponto", group: "operacao" },
  { href: "/telas", label: "Telas", icon: Monitor, module: "telas", group: "operacao" },
  { href: "/admin", label: "Painel Admin", icon: LayoutDashboard, module: "admin", minRole: "gerente", group: "admin" },
  { href: "/admin/funcionarios", label: "Funcionários", icon: UserRound, module: "admin", minRole: "gerente", group: "admin" },
  { href: "/admin/analytics", label: "Relatórios", icon: BarChart3, module: "admin", minRole: "gerente", group: "admin" },
  { href: "/configuracoes", label: "Configurações", icon: Settings, minRole: "admin", group: "admin" },
  { href: "/admin/sistema", label: "Sistema", icon: Shield, module: "admin", minRole: "admin", group: "admin" },
];
