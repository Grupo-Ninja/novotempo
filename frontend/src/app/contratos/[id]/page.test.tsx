import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ContratoDetailPage from "./page";

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));

vi.mock("@/lib/api", () => ({ apiFetch: apiFetchMock }));
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "contrato-1" }),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { role: "admin" } }, status: "authenticated" }),
}));
vi.mock("@/components/Sidebar", () => ({ default: () => null }));

type ApiResponse = { ok: boolean; status: number; json: () => Promise<unknown> };

function response(body: unknown, status = 200): ApiResponse {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function baseContract() {
  return {
    id: "contrato-1",
    numeroId: "CTR001",
    status: "em_andamento",
    produto: "Soja",
    numSacas: 100,
    valorSaca: 100,
    comissaoPorSaca: 1,
    comissaoTerceiro: 0,
    comissaoPagaPor: "comprador",
    comissaoVendedor: 1,
    comissaoComprador: 0,
    funrural: 0,
    refPeso: 0,
    comprador: { id: "comprador-1", nome: "Comprador", cpfCnpj: "1", banco: "Sicoob", agencia: "0001", conta: "12345-6", pix: "comprador@pix.com" },
    produtor: { id: "produtor-1", nome: "Produtor", cpfCnpj: "2", banco: "Banco do Brasil", agencia: "2222", conta: "65432-1", pix: "produtor@pix.com" },
    carregamentos: [] as Record<string, unknown>[],
    transacoes: [] as Record<string, unknown>[],
  };
}

function formControl(modal: HTMLElement, label: string): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  const labelNode = within(modal).getByText(label, { selector: "label" });
  const control = labelNode.parentElement?.querySelector("input, select, textarea")
    || labelNode.parentElement?.parentElement?.querySelector("input, select, textarea");
  if (!control) throw new Error(`Controle não encontrado: ${label}`);
  return control as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
}

function modalFor(title: string): HTMLElement {
  const heading = screen.getByRole("heading", { name: title });
  return heading.parentElement?.parentElement as HTMLElement;
}

async function renderPage(post?: (path: string, options: RequestInit) => Promise<ApiResponse>) {
  let contract = baseContract();
  apiFetchMock.mockImplementation(async (path: string, options: RequestInit = {}) => {
    if (path === "/contratos/contrato-1" && !options.method) return response(contract);
    if (path.startsWith("/clientes")) return response({ data: [] });
    if (path.startsWith("/motoristas")) return response({ data: [] });
    if (post && (options.method === "POST" || options.method === "PUT")) return post(path, options);
    throw new Error(`Requisição inesperada: ${options.method || "GET"} ${path}`);
  });
  render(createElement(ContratoDetailPage));
  await screen.findByText("Transações (0)");
  return {
    setContract(next: ReturnType<typeof baseContract>) { contract = next; },
  };
}

function openTransactionModal() {
  const heading = screen.getByText("Transações (0)");
  fireEvent.click(within(heading.parentElement as HTMLElement).getByRole("button", { name: "+ Adicionar" }));
  return modalFor("Nova Transação");
}

function openLoadingModal() {
  const heading = screen.getByText("Carregamentos (0)");
  fireEvent.click(within(heading.parentElement as HTMLElement).getByRole("button", { name: "+ Adicionar" }));
  return modalFor("Novo Carregamento");
}

describe("modais do contrato", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    apiFetchMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("não envia umidade negativa e mantém o carregamento preenchido aberto", async () => {
    await renderPage();
    const modal = openLoadingModal();
    fireEvent.change(formControl(modal, "Peso líquido (kg)"), { target: { value: "60" } });
    const humidity = formControl(modal, "Umidade (%)") as HTMLInputElement;
    fireEvent.change(humidity, { target: { value: "-0.03" } });
    fireEvent.click(within(modal).getByRole("button", { name: "Salvar" }));

    expect(await within(modal).findByText("Umidade: valores negativos não são permitidos.")).toBeTruthy();
    expect(humidity.value).toBe("-0.03");
    expect(apiFetchMock.mock.calls.some(([, options]) => options?.method === "POST")).toBe(false);
    expect(screen.getByRole("heading", { name: "Novo Carregamento" })).toBeTruthy();
  });

  it("calcula automaticamente sacas e valor da carga a partir do peso", async () => {
    await renderPage();
    const modal = openLoadingModal();

    expect((formControl(modal, "Peso por saca (kg)") as HTMLInputElement).value).toBe("60");
    expect((formControl(modal, "Valor por saca (R$)") as HTMLInputElement).value).toBe("100,00");

    fireEvent.change(formControl(modal, "Peso líquido (kg)"), { target: { value: "30.000" } });

    expect(within(modal).getByText("500,000")).toBeTruthy();
    expect(within(modal).getByText((text) => /R\$\s*50\.000,00/.test(text))).toBeTruthy();
  });

  it("não persiste valor monetário inválido no frontend", async () => {
    await renderPage();
    const modal = openTransactionModal();
    const value = formControl(modal, "Valor Debitado (R$)") as HTMLInputElement;
    fireEvent.change(value, { target: { value: "-1" } });
    fireEvent.click(within(modal).getByRole("button", { name: "Salvar" }));

    expect(await within(modal).findByText("Valor Debitado: valores negativos não são permitidos.")).toBeTruthy();
    expect(apiFetchMock.mock.calls.some(([, options]) => options?.method === "POST")).toBe(false);
    expect(screen.getByRole("heading", { name: "Nova Transação" })).toBeTruthy();
  });

  it("mantém modal e campos após erro da API", async () => {
    await renderPage(async () => response({
      error: "Dados inválidos.",
      details: [{ field: "valorDebitado", message: "Valor inválido" }],
    }, 422));
    const modal = openTransactionModal();
    const category = formControl(modal, "Categoria") as HTMLInputElement;
    fireEvent.change(category, { target: { value: "Adiantamento" } });
    fireEvent.change(formControl(modal, "Método Pagamento"), { target: { value: "PIX" } });
    fireEvent.click(within(modal).getByRole("button", { name: "Salvar" }));

    expect(await within(modal).findByText("Valor inválido")).toBeTruthy();
    expect(category.value).toBe("Adiantamento");
    expect((formControl(modal, "Método Pagamento") as HTMLSelectElement).value).toBe("PIX");
    expect(screen.getByRole("heading", { name: "Nova Transação" })).toBeTruthy();
    expect(screen.getByText("Transações (0)")).toBeTruthy();
  });

  it("cria uma única transação, envia status e método e atualiza lista e contador", async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    let payload: Record<string, unknown> = {};
    let harness!: Awaited<ReturnType<typeof renderPage>>;

    harness = await renderPage(async (path, options) => {
      expect(path).toBe("/transacoes");
      payload = JSON.parse(String(options.body));
      await pending;
      const created = {
        id: "trx-1", numeroId: "TRX001", categoria: "Venda", metodoPagamento: "PIX",
        status: "pago", valorDebitado: 123.45, refComissao: 10, refProdutor: 113.45,
      };
      harness.setContract({ ...baseContract(), transacoes: [created] });
      return response(created, 201);
    });

    const modal = openTransactionModal();
    fireEvent.change(formControl(modal, "Categoria"), { target: { value: "Venda" } });
    fireEvent.change(formControl(modal, "Método Pagamento"), { target: { value: "PIX" } });
    fireEvent.change(formControl(modal, "Status"), { target: { value: "pago" } });
    fireEvent.change(formControl(modal, "Valor Debitado (R$)"), { target: { value: "123,45" } });
    fireEvent.change(formControl(modal, "Ref. Comissão (R$)"), { target: { value: "10,00" } });
    fireEvent.change(formControl(modal, "Ref. Produtor (R$)"), { target: { value: "113,45" } });

    const save = within(modal).getByRole("button", { name: "Salvar" });
    fireEvent.click(save);
    fireEvent.click(save);
    expect(apiFetchMock.mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(1);
    expect((within(modal).getByRole("button", { name: "Salvando..." }) as HTMLButtonElement).disabled).toBe(true);

    await act(async () => release());
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Nova Transação" })).toBeNull());
    expect(screen.getByText("Transações (1)")).toBeTruthy();
    expect(screen.getByText("TRX001")).toBeTruthy();
    expect(screen.queryByText("Nenhuma transação registrada")).toBeNull();
    expect(payload).toMatchObject({
      contratoId: "contrato-1",
      categoria: "Venda",
      metodoPagamento: "PIX",
      status: "pago",
      valorDebitado: 123.45,
      refComissao: 10,
      refProdutor: 113.45,
    });
  });

  it("exibe os dados bancarios das partes na tela do contrato", async () => {
    await renderPage();

    expect(screen.getByText("Sicoob")).toBeTruthy();
    expect(screen.getByText("comprador@pix.com")).toBeTruthy();
    expect(screen.getByText("Banco do Brasil")).toBeTruthy();
    expect(screen.getByText("produtor@pix.com")).toBeTruthy();
  });

  it("cria ordem de carregamento com motorista mesmo sem peso", async () => {
    let payload: Record<string, unknown> = {};
    let harness!: Awaited<ReturnType<typeof renderPage>>;

    harness = await renderPage(async (path, options) => {
      expect(path).toBe("/carregamentos");
      payload = JSON.parse(String(options.body));
      const created = {
        id: "car-1",
        numeroId: "CAR001",
        motorista: payload.motorista,
        produto: payload.produto,
        pesoKg: 0,
        qntSacas: 0,
        valorCarga: 0,
        refPeso: 60,
        refValorSaca: 100,
      };
      harness.setContract({ ...baseContract(), carregamentos: [created] });
      return response(created, 201);
    });

    const modal = openLoadingModal();
    fireEvent.change(formControl(modal, "Motorista"), { target: { value: "Joao Silva" } });
    fireEvent.click(within(modal).getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(screen.queryByRole("heading", { name: "Novo Carregamento" })).toBeNull());
    expect(payload).toMatchObject({
      contratoId: "contrato-1",
      motorista: "Joao Silva",
      pesoKg: 0,
      qntSacas: 0,
      valorCarga: 0,
      refPeso: 60,
      refValorSaca: 100,
    });
    expect(screen.getByText("Carregamentos (1)")).toBeTruthy();
    expect(screen.getByText("Joao Silva")).toBeTruthy();
    expect(screen.getAllByText("Pendente").length).toBeGreaterThan(0);
  });
});
