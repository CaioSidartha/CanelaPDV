export type SaleStatus = "pendente" | "autorizada" | "erro";

export type PaymentMethod = "dinheiro" | "pix" | "cartao_credito" | "cartao_debito";

/** PDV direto e venda rápida sem comanda usam o mesmo canal. */
export type OrderChannel = "bancada" | "mesa" | "delivery";

/**
 * Preparação SaaS (multi-tenant):
 * - tenantId isola clientes/contratos (SaaS).
 * - empresaId isola filiais/CNPJs dentro de um tenant.
 *
 * No modo atual (single-tenant), esses campos podem ficar ausentes.
 */
export type TenantId = string;
export type EmpresaId = string;

export type UserRole = "super_admin" | "admin" | "gerente" | "caixa" | "operador";

export type TenantModuleName =
  | "pdv"
  | "comandas"
  | "caixa"
  | "estoque"
  | "fiscal"
  | "ponto"
  | "telas"
  | "admin"
  | "multi_filial"
  | "bi";

/** Usuário local da loja (futuro: vem da API do servidor). */
export interface AppUser {
  id: string;
  tenantId: TenantId;
  empresaId?: EmpresaId;
  name: string;
  email: string;
  /** Hash SHA-256 (scaffold). Produção: bcrypt no servidor. */
  passwordHash: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: TenantId;
  empresaId?: EmpresaId;
  loggedInAt: string;
}

export interface FiscalProductFields {
  ncm: string;
  cest: string;
  cfop: string;
  origem: "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";
  cst_icms: string;
  csosn?: string;
  unidade_comercial: string;
  aliquota_icms?: number;
  pis_cst?: string;
  cofins_cst?: string;
}

/** Remessa / lote do mesmo produto (ex.: caixas da mesma fornecedora com mesmo EAN). */
export interface ProductBatch {
  id: string;
  /** Código de barras lido na remessa (várias unidades podem compartilhar o mesmo). */
  barcode: string;
  qty: number;
  /** Data de produção / fabricação (YYYY-MM-DD), opcional */
  producedAt?: string;
  /** Validade (YYYY-MM-DD), opcional */
  expiresAt?: string;
  /** Data de entrada no estoque (YYYY-MM-DD) — nova remessa da NF-e ou manual. */
  receivedAt?: string;
}

/** Como o item é precificado e vendido no PDV / comanda. */
export type ProductSaleUnit = "unidade" | "kg" | "pacote";

export interface Product {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  /** Forma de venda; ausente = unidade (ou kg se `soldByWeight` legado). */
  saleUnit?: ProductSaleUnit;
  /** Código legado ou extra; também é considerado na leitura junto com remessas. */
  barcode?: string;
  /** EAN/código original da NF ou do primeiro cadastro (referência). */
  referenceBarcode?: string;
  /** Código alterado ou gerado na loja — entra na fila de etiquetas. */
  barcodeCustomized?: boolean;
  imageUrl?: string;
  active: boolean;
  /** Vendido por kg (ex.: café no peso) — no PDV usa seção de peso */
  soldByWeight: boolean;
  /** Se true, baixa automática ao finalizar venda com NFC-e autorizada */
  trackStock?: boolean;
  /** Quantidade em estoque (unidades; use decimal se controlar kg) */
  stockQty?: number;
  /** Alerta quando estoque ≤ este valor */
  stockMin?: number;
  /** Lotes com EAN, validade e quantidade; quando existir, o estoque total é a soma das remessas. */
  batches?: ProductBatch[];
  /** Exibir e cobrar preço promocional no PDV / mesa */
  onPromotion?: boolean;
  /** Preço promocional (R$) quando onPromotion */
  promoPrice?: number;
  /** Custo da última compra (R$), vindo da NF-e do fornecedor. */
  costPrice?: number;
  /**
   * Para que a loja usa o item.
   * Revenda vai ao caixa. Matéria-prima e consumo ficam no estoque e não são vendidos.
   * Ausente = revenda (cadastros antigos).
   */
  usage?: StockUsage;
  fiscal: FiscalProductFields;
}

/** Finalidade do item no estoque da loja. */
export type StockUsage = "revenda" | "materia_prima" | "consumo";

export interface Category {
  id: string;
  name: string;
  icon?: string;
}

export interface WeightPriceConfig {
  id: string;
  label: string;
  pricePerKg: number;
  active: boolean;
}

export interface CompanySettings {
  /** SaaS: tenant (cliente) ao qual pertence. */
  tenantId?: TenantId;
  /** SaaS: filial/empresa atual (escopo operacional). */
  empresaId?: EmpresaId;
  name: string;
  cnpj: string;
  address: string;
  phone: string;
  /** Logo da loja (upload ou URL) — menu e login */
  logoUrl?: string;
  /** Aberto/fechado para exibição no PDV */
  storeOpen: boolean;
  /** Markup % sugerido sobre o custo na revenda (padrão 120). */
  defaultMarkupPercent?: number;
}

export interface CartLine {
  id: string;
  /** Produto do catálogo; ausente em itens só por peso configurável */
  productId?: string;
  weightConfigId?: string;
  name: string;
  unitPrice: number;
  quantity: number;
  /** gramas quando aplicável */
  grams?: number;
  subtotal: number;
}

export interface SaleItemPayload {
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  ncm?: string;
  cfop?: string;
}

export interface SalePayload {
  id: string;
  total: number;
  status: SaleStatus;
  chave_nota?: string;
  xml?: string;
  items: SaleItemPayload[];
  payment_method: PaymentMethod;
  channel: OrderChannel;
  mesaId?: number;
  cliente?: { nome?: string; documento?: string };
}

export interface FiscalEmitResponse {
  status: "autorizado" | "erro" | "rejeitado";
  chave_nota?: string;
  xml?: string;
  mensagem?: string;
  codigo?: string;
}

export interface TableState {
  id: number;
  status: "livre" | "ocupada";
  openedAt?: string;
  lines: CartLine[];
  /** Observação do cliente (último envio do PDV) */
  customerNote?: string;
}

/** Comanda dinâmica (substitui mesas fixas). */
export interface ComandaState {
  /** ID interno */
  id: string;
  /** Número curto exibido ao cliente (ex.: "033") */
  number: string;
  /**
   * Código completo do dia + sequência.
   * Ex.: "qua2004033" (qua + DDMM + 033).
   */
  code: string;
  /** SaaS: isolamento por tenant. */
  tenantId?: TenantId;
  /** SaaS: isolamento por filial (empresa). */
  empresaId?: EmpresaId;
  status: "aberta" | "fechada" | "cancelada";
  openedAt: string;
  /** Turno de caixa em que a comanda foi criada (contagem por turno). */
  openedSessionId?: string;
  closedAt?: string;
  /** Quando status = cancelada */
  cancelledAt?: string;
  cancelledByUserId?: string;
  cancelledByName?: string;
  cancelReason?: string;
  lines: CartLine[];
  /**
   * Divisão interna (mesma comanda) para pagamento em etapas.
   * - `itens`: distribui linhas entre “pessoas/slots” e paga cada slot.
   * - `valor`: não move itens; calcula parcelas iguais do total e paga cada parcela.
   */
  split?: ComandaSplitSession;
  /** Nome opcional para reconhecer a comanda (ex.: cliente / referência). */
  customerName?: string;
  /** Observação do cliente (último envio do PDV) */
  customerNote?: string;
  /** Resumo da última venda ao fechar (histórico no card; linhas vão para `sales`). */
  lastClosedTotal?: number;
  lastPaymentMethod?: PaymentMethod;
  lastItemCount?: number;
  /** Snapshot dos itens consumidos ao fechar (histórico). */
  lastClosedLines?: CartLine[];
}

/** Registro de auditoria de comandas (ex.: exclusão/cancelamento). */
export interface ComandaAuditEvent {
  id: string;
  at: string;
  tenantId?: TenantId;
  empresaId?: EmpresaId;
  comandaId: string;
  comandaCode: string;
  comandaNumber: string;
  action: "cancelada";
  userId?: string;
  userName?: string;
  reason?: string;
  /** Total dos itens no momento do cancelamento */
  snapshotTotal: number;
  snapshotItemCount: number;
  customerName?: string;
}

export type ComandaSplitMode = "itens" | "valor";

export interface ComandaSplitPart {
  /** 1..N (pessoa/slot) */
  index: number;
  /** Somente no modo `itens` */
  lines: CartLine[];
  /** Somente no modo `valor` (centavos arredondados) */
  shareTotal?: number;
  paid: boolean;
  payment_method?: PaymentMethod;
  paidAt?: string;
  saleId?: string;
  chave_nota?: string;
}

export interface ComandaSplitSession {
  mode: ComandaSplitMode;
  people: number;
  parts: ComandaSplitPart[];
  /** Snapshot das linhas no momento em que a divisão começou (para conferência/estoque). */
  baselineLines: CartLine[];
  createdAt: string;
}

export interface CompletedSaleLine {
  name: string;
  subtotal: number;
  categoryId?: string;
  quantity?: number;
  unitPrice?: number;
  grams?: number;
}

export interface CompletedSale {
  id: string;
  createdAt: string;
  /** SaaS: isolamento por tenant. */
  tenantId?: TenantId;
  /** SaaS: isolamento por filial (empresa). */
  empresaId?: EmpresaId;
  total: number;
  channel: OrderChannel;
  mesaId?: number;
  /** Nova identificação (comandas). */
  comandaId?: string;
  comandaCode?: string;
  comandaNumber?: string;
  itemCount: number;
  payment_method: PaymentMethod;
  chave_nota: string;
  xml?: string;
  status: SaleStatus;
  lines: CompletedSaleLine[];
  /** Observação registrada na finalização */
  customerNote?: string;
  /** Turno de caixa (quando o PDV exigia caixa aberto) */
  caixaId?: string;
  /** Partes do pagamento (misto). Se ausente, usa só `payment_method` + `total`. */
  payments?: SalePaymentPart[];
  /** Desconto em R$ aplicado no fechamento. */
  discountAmount?: number;
  /** Valor pago em dinheiro (para troco / gaveta). */
  amountTendered?: number;
  changeGiven?: number;
}

/** Parte de um pagamento misto. */
export interface SalePaymentPart {
  method: PaymentMethod;
  amount: number;
  /** NSU / autorização da maquininha (quando houver). */
  authCode?: string;
  provider?: string;
}

/** Provedor de balança configurável. */
export type ScaleProviderId = "simulacao" | "toledo_ws" | "serial_usb";

/** Provedor de maquininha configurável. */
export type PaymentTerminalProviderId =
  | "simulacao"
  | "stone"
  | "cielo"
  | "pagbank";

export interface ScaleHardwareConfig {
  enabled: boolean;
  provider: ScaleProviderId;
  /** IP/host do WebService (Toledo etc.). */
  host?: string;
  /** Porta COM ou path (ex.: COM3). */
  port?: string;
  /** Faixa da simulação em gramas. */
  mockMinGrams?: number;
  mockMaxGrams?: number;
}

export interface PaymentTerminalConfig {
  enabled: boolean;
  provider: PaymentTerminalProviderId;
  /** teste = sandbox da adquirente; producao = loja real. */
  environment?: "teste" | "producao";
  /** Credenciais por marca. A chave é estável (stoneCode, merchantKey…). */
  fields?: Record<string, string>;
  /** Chave / token da adquirente (quando houver). */
  apiKey?: string;
  merchantId?: string;
  terminalId?: string;
  /** Delay da simulação em ms. */
  mockDelayMs?: number;
  mockApproveRate?: number;
}

export interface HardwareSettings {
  scale: ScaleHardwareConfig;
  paymentTerminal: PaymentTerminalConfig;
}

/** Turno de caixa (abertura → fechamento). */
export interface CashRegisterSession {
  id: string;
  openedAt: string;
  closedAt?: string;
  /** SaaS: isolamento por tenant. */
  tenantId?: TenantId;
  /** SaaS: isolamento por filial (empresa). */
  empresaId?: EmpresaId;
  status: "aberto" | "fechado";
  /** Nome do responsável pela abertura */
  openedBy?: string;
  /** Funcionário que abriu o turno (quando selecionado no cadastro). */
  openedByEmployeeId?: string;
  /** Troco / fundo inicial em dinheiro no gaveta */
  initialFloat?: number;
  /** Lembrete: até quando o turno deveria fechar (ISO) */
  expectedCloseAt?: string;
  closingNotes?: string;
  /** Controle opcional de desperdício / sobras */
  wasteDescription?: string;
  wasteWeightKg?: number;
  wasteValue?: number;
  leftoversNote?: string;
  /** Dinheiro esperado no gaveta no momento do fechamento (cálculo do sistema). */
  expectedDrawerAtClose?: number;
  /** Valor contado fisicamente no gaveta ao fechar (opcional). */
  countedDrawerCash?: number;
  /** contado − esperado (positivo = sobra, negativo = falta). */
  drawerDifference?: number;
}

/** Slot de exibição: uma categoria na programação da TV. */
export interface DisplaySlot {
  id: string;
  categoryId: string;
  /** Vazio = todos os produtos ativos da categoria (exceto vendidos só por peso); senão só estes IDs. */
  productIds: string[];
}

/** Configuração de um monitor de preços (TV). */
export interface DisplayTV {
  id: string;
  /** Ex.: TV1, área de atendimento */
  label: string;
  /** Ordem das categorias na rotação */
  slots: DisplaySlot[];
  /**
   * Segundos **por categoria** no ciclo (tempo total naquela categoria antes da próxima).
   * Repartido em partes iguais entre as “páginas” de itens da mesma categoria.
   */
  rotationSeconds: number;
  /** Quantos itens por página sem comprimir demais (ex.: 15 em TV 32"). */
  maxRowsPerPage: number;
}

export type CashMovementKind = "sangria" | "suprimento" | "ajuste";

/** Sangria / suprimento / ajuste ligados ao turno. */
export interface CashMovement {
  id: string;
  sessionId: string;
  createdAt: string;
  /** SaaS: isolamento por tenant. */
  tenantId?: TenantId;
  /** SaaS: isolamento por filial (empresa). */
  empresaId?: EmpresaId;
  kind: CashMovementKind;
  /** Sempre valor absoluto ≥ 0; sangria retira, suprimento entra; ajuste usa sinal (+ entra, − sai). */
  amount: number;
  note?: string;
}

export type StockMovementReason =
  | "venda_balcao"
  | "venda_mesa"
  | "ajuste_manual"
  | "ajuste_cadastro"
  | "entrada_remessa"
  | "entrada_nfe";

/** Movimentação de estoque (kardex) */
export interface StockMovement {
  id: string;
  createdAt: string;
  /** SaaS: isolamento por tenant. */
  tenantId?: TenantId;
  /** SaaS: isolamento por filial (empresa). */
  empresaId?: EmpresaId;
  productId: string;
  productName: string;
  /** Positivo = entrada, negativo = saída */
  delta: number;
  balanceAfter: number;
  reason: StockMovementReason;
  saleId?: string;
  mesaId?: number;
  note?: string;
}

export type StockActionResult =
  | { ok: true }
  | { ok: false; error: string };

/** Fornecedor da loja. Nasce na importação da NF-e ou no cadastro manual. */
export interface Supplier {
  id: string;
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  ie?: string;
  phone?: string;
  email?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  logoUrl?: string;
  note?: string;
  active: boolean;
  createdAt: string;
}

export interface GoodsReceiptItem {
  id: string;
  productId: string;
  productName: string;
  descricaoNota: string;
  ean?: string;
  ncm?: string;
  cfop?: string;
  unidade: string;
  /** Quantidade na unidade da NF (qCom). */
  quantidade: number;
  /** Unidades de venda dentro de cada unidade da NF (padrão 1). */
  unitsPerNfUnit?: number;
  /** Quantidade em unidades de venda que entrou no estoque. Ausente enquanto a nota está a caminho. */
  quantidadeRecebida?: number;
  valorUnitario: number;
  valorTotal: number;
  /** Finalidade gravada na confirmação da nota. */
  usage?: StockUsage;
}

export type GoodsReceiptStatus = "a_lancar" | "a_caminho" | "recebida";

/** Entrada de mercadoria a partir do XML da NF-e. */
export interface GoodsReceipt {
  id: string;
  supplierId: string;
  nfeChave: string;
  nfeNumero?: string;
  dataEmissao?: string;
  /** Vencimento da primeira duplicata, quando o XML traz. */
  vencimento?: string;
  total: number;
  createdAt: string;
  /** Ausente = recebida (notas lançadas antes deste status). */
  status?: GoodsReceiptStatus;
  receivedAt?: string;
  itens: GoodsReceiptItem[];
}

export type ReceiveNfeLine = {
  descricaoNota: string;
  ean?: string;
  ncm?: string;
  cfop?: string;
  unidade: string;
  quantidade: number;
  /** Unidades de venda por cada unidade da NF (ex.: 10 caixas por PCT). */
  unitsPerNfUnit?: number;
  valorUnitario: number;
  valorTotal: number;
  productId?: string;
  usage?: StockUsage;
  novoProduto?: { name: string; categoryId: string; price: number; usage?: StockUsage };
  saleUnit?: ProductSaleUnit;
  /** Atualiza preço PDV do produto vinculado na baixa. */
  precoVendaAtualizado?: number;
};

// ----------------------------
// Módulo Ponto (relógio)
// ----------------------------

export type Weekday = "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom";

export type WorkShift = {
  /** "08:00" */
  start: string;
  /** "12:00" */
  end: string;
};

/** Carga horária / escala base (pode ter 1–3 turnos no dia). */
export interface TimeSchedule {
  id: string;
  name: string;
  /** Dias que trabalham e seus turnos */
  days: Partial<Record<Weekday, WorkShift[]>>;
  /** SaaS: isolamento por tenant. */
  tenantId?: TenantId;
  /** SaaS: isolamento por filial (empresa). */
  empresaId?: EmpresaId;
  active: boolean;
}

/** Cargo da loja — vincula um horário (carga) usado no ponto e na abertura do caixa. */
export interface JobPosition {
  id: string;
  name: string;
  scheduleId: string;
  active: boolean;
  createdAt: string;
  tenantId?: TenantId;
  empresaId?: EmpresaId;
}

export interface Employee {
  id: string;
  name: string;
  /** CPF (opcional) */
  cpf?: string;
  /** Matrícula interna (ex.: "001") */
  registry?: string;
  /** Cargo cadastrado (herda o horário do cargo). */
  jobPositionId?: string;
  /** Legado / texto livre se não houver cargo cadastrado */
  role?: string;
  /** Carga horária direta (legado); prefira `jobPositionId`. */
  scheduleId?: string;
  /** Foto do colaborador (data URL ou URL). */
  photoUrl?: string;
  /** Código curto para bater ponto (pode ser a matrícula) */
  clockCode: string;
  active: boolean;
  createdAt: string;
  /** SaaS: isolamento por tenant. */
  tenantId?: TenantId;
  /** SaaS: isolamento por filial (empresa). */
  empresaId?: EmpresaId;
}

export type TimeOffKind = "folga" | "ferias" | "atestado" | "falta" | "feriado" | "outro";

export interface TimeOffEntry {
  id: string;
  /** Vazio em feriado da loja (todos). */
  employeeId?: string;
  /** YYYY-MM-DD */
  date: string;
  kind: TimeOffKind;
  note?: string;
  createdAt: string;
  /** SaaS: isolamento por tenant. */
  tenantId?: TenantId;
  /** SaaS: isolamento por filial (empresa). */
  empresaId?: EmpresaId;
}

export type PunchKind = "entrada_1" | "saida_1" | "entrada_2" | "saida_2" | "entrada_3" | "saida_3";

export interface TimePunch {
  id: string;
  employeeId: string;
  /** ISO timestamp */
  at: string;
  kind: PunchKind;
  source?: "web" | "admin";
  createdAt: string;
  /** SaaS: isolamento por tenant. */
  tenantId?: TenantId;
  /** SaaS: isolamento por filial (empresa). */
  empresaId?: EmpresaId;
}
