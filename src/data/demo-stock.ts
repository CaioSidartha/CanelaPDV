import { defaultFiscalFields } from "@/lib/default-fiscal";
import type {
  Category,
  CompletedSale,
  GoodsReceipt,
  Product,
  StockMovement,
  Supplier,
} from "@/types";

/**
 * Dados locais de demonstração. Não são notas fiscais reais:
 * servem para mostrar revenda, matéria-prima, consumo e as três etapas da entrada.
 */

const fiscal = (
  ncm: string,
  unidade: string,
  cfop = "5102",
): Product["fiscal"] => ({
  ...defaultFiscalFields,
  ncm,
  cfop,
  unidade_comercial: unidade,
});

export const demoCategories: Category[] = [
  { id: "insumos", name: "Insumos", icon: "wheat" },
  { id: "consumo", name: "Uso e consumo", icon: "spray" },
];

export const demoProducts: Product[] = [
  {
    id: "demo-queijo",
    name: "Queijo mussarela",
    price: 54.9,
    costPrice: 32.9,
    categoryId: "frios",
    barcode: "7891000311103",
    usage: "revenda",
    active: true,
    soldByWeight: true,
    trackStock: true,
    stockQty: 4.2,
    stockMin: 2,
    fiscal: fiscal("04061010", "KG"),
  },
  {
    id: "demo-cafe",
    name: "Café moído 500 g",
    price: 24.9,
    costPrice: 14.2,
    categoryId: "secos",
    barcode: "7891910000197",
    usage: "revenda",
    active: true,
    soldByWeight: false,
    trackStock: true,
    stockQty: 4,
    stockMin: 6,
    fiscal: fiscal("09012100", "UN"),
  },
  {
    id: "demo-refri",
    name: "Refrigerante lata 350 ml",
    price: 6.5,
    costPrice: 3.1,
    categoryId: "bebidas",
    barcode: "7894900011517",
    usage: "revenda",
    active: true,
    soldByWeight: false,
    trackStock: true,
    stockQty: 24,
    stockMin: 12,
    fiscal: fiscal("22021000", "UN"),
  },
  {
    id: "demo-farinha",
    name: "Farinha de trigo 25 kg",
    price: 0,
    costPrice: 89,
    categoryId: "insumos",
    barcode: "7891000315507",
    usage: "materia_prima",
    active: true,
    soldByWeight: false,
    trackStock: true,
    stockQty: 3,
    stockMin: 2,
    fiscal: fiscal("11010010", "SC", "1101"),
  },
  {
    id: "demo-ovos",
    name: "Ovos brancos",
    price: 0,
    costPrice: 11.8,
    categoryId: "insumos",
    barcode: "7891000241100",
    usage: "materia_prima",
    active: true,
    soldByWeight: false,
    trackStock: true,
    stockQty: 9,
    stockMin: 4,
    fiscal: fiscal("04072100", "DZ", "1101"),
  },
  {
    id: "demo-manteiga",
    name: "Manteiga com sal 500 g",
    price: 0,
    costPrice: 18.5,
    categoryId: "insumos",
    barcode: "7891000242206",
    usage: "materia_prima",
    active: true,
    soldByWeight: false,
    trackStock: true,
    stockQty: 5,
    stockMin: 3,
    fiscal: fiscal("04051000", "UN", "1101"),
  },
  {
    id: "demo-fermento",
    name: "Fermento biológico 500 g",
    price: 0,
    costPrice: 12.5,
    categoryId: "insumos",
    barcode: "7891000317709",
    usage: "materia_prima",
    active: true,
    soldByWeight: false,
    trackStock: true,
    stockQty: 2,
    stockMin: 2,
    fiscal: fiscal("21021000", "UN", "1101"),
  },
  {
    id: "demo-detergente",
    name: "Detergente neutro 500 ml",
    price: 0,
    costPrice: 3.4,
    categoryId: "consumo",
    barcode: "7891000248741",
    usage: "consumo",
    active: true,
    soldByWeight: false,
    trackStock: true,
    stockQty: 6,
    stockMin: 4,
    fiscal: fiscal("34025000", "UN", "1556"),
  },
  {
    id: "demo-saco",
    name: "Saco de lixo 100 L",
    price: 0,
    costPrice: 9.9,
    categoryId: "consumo",
    barcode: "7891000881001",
    usage: "consumo",
    active: true,
    soldByWeight: false,
    trackStock: true,
    stockQty: 8,
    stockMin: 3,
    fiscal: fiscal("39232110", "UN", "1556"),
  },
  {
    id: "demo-luva",
    name: "Luva descartável",
    price: 0,
    costPrice: 16.4,
    categoryId: "consumo",
    barcode: "7891000882008",
    usage: "consumo",
    active: true,
    soldByWeight: false,
    trackStock: true,
    stockQty: 4,
    stockMin: 2,
    fiscal: fiscal("40151900", "CX", "1556"),
  },
];

const day = new Date().toISOString();

export const demoSuppliers: Supplier[] = [
  {
    id: "demo-forn-moinho",
    razaoSocial: "Moinho Boa Massa Ltda",
    cnpj: "10445566000172",
    ie: "001234567",
    phone: "(81) 3333-1001",
    email: "pedidos@moinhoboamassa.example",
    note: "Entrega de farinha e fermento. Cadastro de demonstração.",
    active: true,
    createdAt: day,
  },
  {
    id: "demo-forn-alvorada",
    razaoSocial: "Distribuidora Alvorada",
    cnpj: "22887766000140",
    ie: "009876543",
    phone: "(81) 3333-2040",
    email: "vendas@alvorada.example",
    note: "Mercearia e material de limpeza. Cadastro de demonstração.",
    active: true,
    createdAt: day,
  },
  {
    id: "demo-forn-serra",
    razaoSocial: "Laticínios Serra",
    cnpj: "33001122000158",
    ie: "005551234",
    phone: "(81) 3333-3010",
    email: "nfe@laticiniosserra.example",
    note: "Frios. Cadastro de demonstração.",
    active: true,
    createdAt: day,
  },
];

export const demoReceipts: GoodsReceipt[] = [
  {
    id: "demo-nota-lancada",
    supplierId: "demo-forn-serra",
    nfeChave: "35261033001122000158550010000001011000000011",
    nfeNumero: "SIM-1011",
    dataEmissao: day,
    vencimento: new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10),
    total: 1186.7,
    createdAt: day,
    status: "recebida",
    receivedAt: day,
    itens: [
      item("demo-queijo", "Queijo mussarela", "7891000311103", "04061010", "1102", "KG", 6, 32.9, "revenda"),
      item("demo-farinha", "Farinha de trigo 25 kg", "7891000315507", "11010010", "1101", "SC", 3, 89, "materia_prima"),
      item("demo-ovos", "Ovos brancos", "7891000241100", "04072100", "1101", "DZ", 9, 11.8, "materia_prima"),
      item("demo-manteiga", "Manteiga com sal 500 g", "7891000242206", "04051000", "1101", "UN", 5, 18.5, "materia_prima"),
      item("demo-cafe", "Café moído 500 g", "7891910000197", "09012100", "1102", "UN", 20, 14.2, "revenda"),
      item("demo-refri", "Refrigerante lata 350 ml", "7894900011517", "22021000", "1102", "UN", 24, 3.1, "revenda"),
      item("demo-detergente", "Detergente neutro 500 ml", "7891000248741", "34025000", "1556", "UN", 6, 3.4, "consumo"),
      item("demo-saco", "Saco de lixo 100 L", "7891000881001", "39232110", "1556", "UN", 8, 9.9, "consumo"),
      item("demo-luva", "Luva descartável", "7891000882008", "40151900", "1556", "CX", 4, 16.4, "consumo"),
    ],
  },
  {
    id: "demo-nota-rota",
    supplierId: "demo-forn-alvorada",
    nfeChave: "35261022887766000140550010000002021000000028",
    nfeNumero: "SIM-2028",
    dataEmissao: day,
    vencimento: new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10),
    total: 170.4 + 20.4,
    createdAt: day,
    status: "a_caminho",
    itens: [
      item("demo-cafe", "Café moído 500 g", "7891910000197", "09012100", "1102", "UN", 12, 14.2, "revenda", false),
      item("demo-detergente", "Detergente neutro 500 ml", "7891000248741", "34025000", "1556", "UN", 6, 3.4, "consumo", false),
    ],
  },
  {
    id: "demo-nota-alancar",
    supplierId: "demo-forn-moinho",
    nfeChave: "35261010445566000172550010000003031000000035",
    nfeNumero: "SIM-3035",
    dataEmissao: day,
    vencimento: new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10),
    total: 267 + 50,
    createdAt: day,
    status: "a_lancar",
    itens: [
      item("demo-farinha", "Farinha de trigo 25 kg", "7891000315507", "11010010", "1101", "SC", 3, 89, "materia_prima", false),
      item("demo-fermento", "Fermento biológico 500 g", "7891000317709", "21021000", "1101", "UN", 4, 12.5, "materia_prima", false),
    ],
  },
];

function item(
  productId: string,
  name: string,
  ean: string,
  ncm: string,
  cfop: string,
  unidade: string,
  quantidade: number,
  valorUnitario: number,
  usage: NonNullable<Product["usage"]>,
  posted = true,
): GoodsReceipt["itens"][number] {
  return {
    id: `demo-item-${productId}-${cfop}-${posted ? "ok" : "pend"}`,
    productId,
    productName: name,
    descricaoNota: name,
    ean,
    ncm,
    cfop,
    unidade,
    quantidade,
    quantidadeRecebida: posted ? quantidade : undefined,
    valorUnitario,
    valorTotal: Math.round(quantidade * valorUnitario * 100) / 100,
    usage,
  };
}

export const demoLedger: StockMovement[] = [
  move("demo-mov-farinha", "demo-farinha", "Farinha de trigo 25 kg", 3, 3, "entrada_nfe", "NF-e SIM-1011 · demonstração"),
  move("demo-mov-cafe-in", "demo-cafe", "Café moído 500 g", 20, 20, "entrada_nfe", "NF-e SIM-1011 · demonstração"),
  move("demo-mov-cafe-out", "demo-cafe", "Café moído 500 g", -16, 4, "venda_balcao", "Vendas de demonstração"),
  move("demo-mov-queijo-in", "demo-queijo", "Queijo mussarela", 6, 6, "entrada_nfe", "NF-e SIM-1011 · demonstração"),
  move("demo-mov-queijo-out", "demo-queijo", "Queijo mussarela", -1.8, 4.2, "venda_balcao", "Vendas de demonstração"),
  move("demo-mov-refri", "demo-refri", "Refrigerante lata 350 ml", 24, 24, "entrada_nfe", "NF-e SIM-1011 · demonstração"),
];

function move(
  id: string,
  productId: string,
  productName: string,
  delta: number,
  balanceAfter: number,
  reason: StockMovement["reason"],
  note: string,
): StockMovement {
  return {
    id,
    createdAt: day,
    productId,
    productName,
    delta,
    balanceAfter,
    reason,
    note,
  };
}

export const demoSales: CompletedSale[] = [
  {
    id: "demo-sale-balcao",
    createdAt: day,
    total: 497.22,
    channel: "bancada",
    itemCount: 2,
    payment_method: "pix",
    chave_nota: "",
    status: "autorizada",
    lines: [
      { name: "Café moído 500 g", subtotal: 398.4, quantity: 16, unitPrice: 24.9, categoryId: "secos" },
      { name: "Queijo mussarela", subtotal: 98.82, quantity: 1.8, unitPrice: 54.9, categoryId: "frios" },
    ],
  },
];

export function mergeDemoSales(sales: CompletedSale[]) {
  const ids = new Set(sales.map((sale) => sale.id));
  return [...sales, ...demoSales.filter((sale) => !ids.has(sale.id))];
}

export function mergeDemoStock<T extends {
  categories: Category[];
  products: Product[];
  suppliers: Supplier[];
  goodsReceipts: GoodsReceipt[];
  stockLedger: StockMovement[];
}>(state: T): T {
  return {
    ...state,
    categories: state.categories,
    products: state.products,
    suppliers: state.suppliers,
    goodsReceipts: state.goodsReceipts,
    stockLedger: state.stockLedger ?? [],
  };
}
