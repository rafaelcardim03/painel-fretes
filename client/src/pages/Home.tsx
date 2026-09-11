import { useMemo, useRef, useState } from "react";
import {
  ArrowDownUp,
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  CloudUpload,
  FileSpreadsheet,
  Filter,
  LayoutDashboard,
  MapPin,
  Menu,
  PackageCheck,
  ReceiptText,
  Search,
  Truck,
  Upload,
  X,
} from "lucide-react";

type Freight = {
  id: string;
  ctrc: string;
  cte: string;
  destination: string;
  city: string;
  uf: string;
  emission: string;
  expected: string;
  vehicle: string;
  volume: string;
  weight: string;
  freight: number;
  invoice: number;
  carrierStatus: string;
  deliveryStatus: string;
  occurrence: string;
  raw?: Record<string, string>;
};

type RawRow = Record<string, string>;

const sampleFreights: Freight[] = [
  {
    id: "005704-5",
    ctrc: "MTX 005704-5",
    cte: "CT-e 7.355",
    destination: "Pouso Alegre",
    city: "Pouso Alegre",
    uf: "MG",
    emission: "02/01/2026",
    expected: "02/01/2026",
    vehicle: "MKQ7A04",
    volume: "159",
    weight: "3.411,71 kg",
    freight: 3211.44,
    invoice: 81962.93,
    carrierStatus: "LIQUIDADO",
    deliveryStatus: "Entregue",
    occurrence: "Mercadoria entregue",
  },
  {
    id: "005705-3",
    ctrc: "MTX 005705-3",
    cte: "CT-e 7.356",
    destination: "Santo Antônio do Amparo",
    city: "Santo Antônio do Amparo",
    uf: "MG",
    emission: "02/01/2026",
    expected: "02/01/2026",
    vehicle: "MDG7D65",
    volume: "265",
    weight: "3.705,67 kg",
    freight: 3348.74,
    invoice: 102492.53,
    carrierStatus: "LIQUIDADO",
    deliveryStatus: "Entregue",
    occurrence: "Mercadoria entregue",
  },
  {
    id: "005706-1",
    ctrc: "MTX 005706-1",
    cte: "CT-e 7.357",
    destination: "Guapé",
    city: "Guapé",
    uf: "MG",
    emission: "02/01/2026",
    expected: "02/01/2026",
    vehicle: "CUC6I21",
    volume: "228",
    weight: "4.356,94 kg",
    freight: 3245.77,
    invoice: 104849.2,
    carrierStatus: "LIQUIDADO",
    deliveryStatus: "Entregue",
    occurrence: "Mercadoria entregue",
  },
  {
    id: "005707-0",
    ctrc: "MTX 005707-0",
    cte: "CT-e 7.358",
    destination: "Extrema",
    city: "Extrema",
    uf: "MG",
    emission: "02/01/2026",
    expected: "02/01/2026",
    vehicle: "HBN4878",
    volume: "148",
    weight: "3.104,79 kg",
    freight: 3707.74,
    invoice: 57831.14,
    carrierStatus: "LIQUIDADO",
    deliveryStatus: "Entregue",
    occurrence: "Mercadoria entregue",
  },
  {
    id: "005708-8",
    ctrc: "MTX 005708-8",
    cte: "CT-e 7.359",
    destination: "Passos",
    city: "Passos",
    uf: "MG",
    emission: "02/01/2026",
    expected: "02/01/2026",
    vehicle: "HMV0A57",
    volume: "158",
    weight: "3.478,38 kg",
    freight: 4175.54,
    invoice: 85693.33,
    carrierStatus: "LIQUIDADO",
    deliveryStatus: "Entregue",
    occurrence: "Mercadoria entregue",
  },
  {
    id: "005709-6",
    ctrc: "MTX 005709-6",
    cte: "CT-e 7.360",
    destination: "Itanhandu",
    city: "Itanhandu",
    uf: "MG",
    emission: "02/01/2026",
    expected: "02/01/2026",
    vehicle: "FDZ2H10",
    volume: "195",
    weight: "3.436,66 kg",
    freight: 4082.96,
    invoice: 94972.15,
    carrierStatus: "LIQUIDADO",
    deliveryStatus: "Entregue",
    occurrence: "Mercadoria entregue",
  },
  {
    id: "005710-0",
    ctrc: "MTX 005710-0",
    cte: "CT-e 7.361",
    destination: "Formiga",
    city: "Formiga",
    uf: "MG",
    emission: "02/01/2026",
    expected: "02/01/2026",
    vehicle: "HIV8I83",
    volume: "332",
    weight: "6.084,89 kg",
    freight: 4159.36,
    invoice: 145912.07,
    carrierStatus: "LIQUIDADO",
    deliveryStatus: "Entregue",
    occurrence: "Mercadoria entregue",
  },
  {
    id: "005713-4",
    ctrc: "MTX 005713-4",
    cte: "CT-e 7.364",
    destination: "São Sebastião do Paraíso",
    city: "São Sebastião do Paraíso",
    uf: "MG",
    emission: "02/01/2026",
    expected: "13/03/2026",
    vehicle: "HNO9C84",
    volume: "2",
    weight: "16 kg",
    freight: 30,
    invoice: 1578.9,
    carrierStatus: "LIQUIDADO",
    deliveryStatus: "Entregue",
    occurrence: "Mercadoria entregue (SSWMOBILE)",
  },
];

const normalizeKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\uFEFF\u00A0]/g, " ")
    .trim()
    .toLowerCase();

const parseCsvLine = (line: string, delimiter = ";") => {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];
    if (character === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += character;
    }
  }

  cells.push(cell.trim());
  return cells;
};

const splitCsv = (text: string) => {
  const lines: string[] = [];
  let line = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"' && quoted && next === '"') {
      line += '""';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
      line += character;
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (line.trim()) lines.push(line);
      line = "";
      if (character === "\r" && next === "\n") index += 1;
    } else {
      line += character;
    }
  }
  if (line.trim()) lines.push(line);
  return lines;
};

const getValue = (row: RawRow, ...keys: string[]) => {
  for (const key of keys) {
    const normalized = normalizeKey(key);
    const match = Object.entries(row).find(([name]) => normalizeKey(name) === normalized);
    if (match?.[1]) return match[1].replace(/\u00a0/g, " ").trim();
  }
  return "";
};

const parseLocaleNumber = (value: string) => {
  const cleaned = value.replace(/\s/g, "").replace(/%/g, "");
  if (!cleaned) return 0;
  if (cleaned.includes(",")) return Number(cleaned.replace(/\./g, "").replace(",", ".")) || 0;
  return Number(cleaned) || 0;
};

const currency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const parseRows = (text: string): Freight[] => {
  const lines = splitCsv(text);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((header, index) =>
    header || `coluna_${index + 1}`,
  );

  return lines.slice(1).map((line, rowIndex) => {
    const values = parseCsvLine(line);
    const raw = headers.reduce<RawRow>((accumulator, header, index) => {
      accumulator[header] = values[index] ?? "";
      return accumulator;
    }, {});
    const occurrence = getValue(raw, "ult_ocorr_descricao") || "Sem ocorrência registrada";
    const occurrenceUpper = occurrence.toUpperCase();
    const status = getValue(raw, "situacao_ctrc") || "EM ABERTO";
    const carrierStatus = status.toUpperCase();
    const deliveryStatus = occurrenceUpper.includes("ENTREG")
      ? "Entregue"
      : occurrenceUpper.includes("CANCEL")
        ? "Cancelado"
        : occurrenceUpper.includes("ROTA") || occurrenceUpper.includes("SAÍDA")
          ? "Em trânsito"
          : "Acompanhar";
    const ctrc = getValue(raw, "sigla_ctrc", "numero_ctrc");
    const number = getValue(raw, "numero_ctrc");
    const vehicle = getValue(raw, "veiculo_entrega", "veiculo_coleta") || "Não informado";

    return {
      id: `${number || rowIndex + 1}-${rowIndex}`,
      ctrc: ctrc && number && !ctrc.includes(number) ? `${ctrc} ${number}` : ctrc || `Registro ${rowIndex + 1}`,
      cte: getValue(raw, "numero_cte") ? `CT-e ${getValue(raw, "numero_cte")}` : "Não informado",
      destination: getValue(raw, "cidade_destino") || "Destino não informado",
      city: getValue(raw, "cidade_destino") || "Destino não informado",
      uf: getValue(raw, "uf_destino") || "--",
      emission: getValue(raw, "data_emissao") || "--",
      expected: getValue(raw, "prev_ent") || "--",
      vehicle,
      volume: getValue(raw, "qtde_volume") || "0",
      weight: `${getValue(raw, "kg_real", "kg_calculo") || "0"} kg`,
      freight: parseLocaleNumber(getValue(raw, "valor_frete", "vlr_liquidado", "valor_liquido")),
      invoice: parseLocaleNumber(getValue(raw, "valor_n_fiscal")),
      carrierStatus,
      deliveryStatus,
      occurrence,
      raw,
    };
  });
};

const statusStyles: Record<string, string> = {
  Entregue: "status-green",
  "Em trânsito": "status-blue",
  Cancelado: "status-red",
  Acompanhar: "status-amber",
};

function MetricCard({
  icon,
  label,
  value,
  detail,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  accent: string;
}) {
  return (
    <div className="metric-card" style={{ "--metric-accent": accent } as React.CSSProperties}>
      <div className="metric-topline">
        <span className="metric-icon">{icon}</span>
        <span className="metric-label">{label}</span>
        <span className="metric-arrow">↗</span>
      </div>
      <strong>{value}</strong>
      <span className="metric-detail">{detail}</span>
    </div>
  );
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [freights, setFreights] = useState<Freight[]>(sampleFreights);
  const [fileName, setFileName] = useState("bd.csv · amostra carregada");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [ufFilter, setUfFilter] = useState("todas");
  const [activeSection, setActiveSection] = useState("Visão geral");
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState("");

  const ufs = useMemo(() => Array.from(new Set(freights.map((freight) => freight.uf))).sort(), [freights]);
  const filteredFreights = useMemo(() => {
    const term = search.toLowerCase().trim();
    return freights.filter((freight) => {
      const matchesSearch = !term || [freight.ctrc, freight.cte, freight.city, freight.vehicle, freight.occurrence]
        .join(" ")
        .toLowerCase()
        .includes(term);
      const matchesStatus = statusFilter === "todos" || freight.deliveryStatus === statusFilter;
      const matchesUf = ufFilter === "todas" || freight.uf === ufFilter;
      return matchesSearch && matchesStatus && matchesUf;
    });
  }, [freights, search, statusFilter, ufFilter]);

  const totalFreight = useMemo(() => freights.reduce((total, freight) => total + freight.freight, 0), [freights]);
  const delivered = freights.filter((freight) => freight.deliveryStatus === "Entregue").length;
  const inTransit = freights.filter((freight) => freight.deliveryStatus === "Em trânsito").length;

  const handleFile = (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setNotice("Escolha um arquivo CSV exportado do sistema de fretes.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseRows(String(reader.result ?? ""));
        if (!parsed.length) throw new Error("empty");
        setFreights(parsed);
        localStorage.setItem("rotaclara-csv", String(reader.result ?? ""));
        setFileName(`${file.name} · ${parsed.length.toLocaleString("pt-BR")} registros`);
        setNotice("Importação concluída. A visão geral foi atualizada com o novo arquivo.");
        setSearch("");
        setStatusFilter("todos");
        setUfFilter("todas");
      } catch {
        setNotice("Não foi possível ler o arquivo. Confirme se ele usa ponto e vírgula como separador.");
      }
    };
    reader.onerror = () => setNotice("O navegador não conseguiu acessar este arquivo.");
    reader.readAsText(file, "windows-1252");
  };

  const openSoon = (label: string) => {
    setActiveSection(label);
    if (label !== "Visão geral") setNotice(`${label} será configurado na próxima etapa do sistema.`);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark"><Truck size={19} strokeWidth={2.4} /></div>
          <div>
            <div className="brand-name">Rota<span>Clara</span></div>
            <div className="brand-subtitle">gestão de fretes</div>
          </div>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-avatar">O</div>
          <div className="workspace-copy"><span>Operação principal</span><strong>Unidade MTX</strong></div>
          <ChevronDown size={15} />
        </div>

        <div className="sidebar-label">Navegação</div>
        <nav className="sidebar-nav">
          <button className={activeSection === "Visão geral" ? "nav-item active" : "nav-item"} onClick={() => setActiveSection("Visão geral")}>
            <LayoutDashboard size={17} /><span>Visão geral</span><span className="nav-pip" />
          </button>
          <button className={activeSection === "Fretes" ? "nav-item active" : "nav-item"} onClick={() => setActiveSection("Fretes")}>
            <PackageCheck size={17} /><span>Fretes</span><span className="nav-count">{freights.length.toLocaleString("pt-BR")}</span>
          </button>
          <button className={activeSection === "Relatórios" ? "nav-item active" : "nav-item"} onClick={() => openSoon("Relatórios")}>
            <ReceiptText size={17} /><span>Relatórios</span><span className="soon-dot" />
          </button>
          <button className={activeSection === "Faturamento" ? "nav-item active" : "nav-item"} onClick={() => window.location.href = "/faturamento"}>
            <ArrowDownUp size={17} /><span>Faturamento</span><span className="nav-pip" />
          </button>
        </nav>

        <div className="sidebar-label sidebar-label-later">Em breve</div>
        <nav className="sidebar-nav">
          <button className="nav-item muted" onClick={() => openSoon("Indicadores")}><ArrowDownUp size={17} /><span>Indicadores</span></button>
          <button className="nav-item muted" onClick={() => openSoon("Configurações")}><CircleHelp size={17} /><span>Configurações</span></button>
        </nav>

        <div className="sidebar-footer">
          <div className="help-card">
            <div className="help-icon"><CloudUpload size={17} /></div>
            <strong>Importação diária</strong>
            <span>Atualize sua base sempre que precisar.</span>
            <button onClick={() => inputRef.current?.click()}>Importar agora <ArrowRight size={14} /></button>
          </div>
          <div className="user-row"><div className="user-avatar">RC</div><div><strong>Rafael Costa</strong><span>Administrador</span></div><Menu size={16} /></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs"><span>Operação</span><span className="crumb-separator">/</span><strong>{activeSection}</strong></div>
          <div className="topbar-actions">
            <span className="last-sync"><span className="sync-dot" /> Base local · agora</span>
            <button className="topbar-help" onClick={() => setNotice("A primeira versão lê a planilha diretamente no navegador. Relatórios detalhados entram na próxima fase.")}><CircleHelp size={17} /></button>
            <button className="topbar-avatar">RC</button>
          </div>
        </header>

        <div className="content-wrap">
          <section className="page-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> CENTRAL DE OPERAÇÃO</div>
              <h1>Fretes em <em>movimento.</em></h1>
              <p>Uma leitura clara da sua operação, direto da planilha diária.</p>
            </div>
            <div className="heading-meta"><span className="date-label">Última atualização</span><strong>{fileName.split(" · ")[0]}</strong><span className="file-pill"><FileSpreadsheet size={13} /> CSV conectado</span></div>
          </section>

          <section
            className={`import-banner ${dragging ? "dragging" : ""}`}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => { event.preventDefault(); setDragging(false); handleFile(event.dataTransfer.files[0]); }}
          >
            <div className="import-banner-icon"><CloudUpload size={23} /></div>
            <div className="import-copy"><strong>Atualize a operação com a planilha do dia</strong><span>Arraste seu CSV aqui ou selecione um arquivo para substituir a base atual.</span></div>
            <button className="import-button" onClick={() => inputRef.current?.click()}><Upload size={16} /> Importar planilha</button>
            <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={(event) => handleFile(event.target.files?.[0])} />
          </section>

          {notice && <div className="notice"><Check size={16} /><span>{notice}</span><button onClick={() => setNotice("")}><X size={15} /></button></div>}

          <section className="metrics-grid">
            <MetricCard icon={<PackageCheck size={18} />} label="Fretes carregados" value={freights.length.toLocaleString("pt-BR")} detail="nesta importação" accent="#2784ff" />
            <MetricCard icon={<ReceiptText size={18} />} label="Valor dos fretes" value={currency(totalFreight)} detail="soma da base atual" accent="#e9a33a" />
            <MetricCard icon={<MapPin size={18} />} label="Entregas concluídas" value={delivered.toLocaleString("pt-BR")} detail={freights.length ? `${Math.round((delivered / freights.length) * 100)}% da operação` : "sem dados"} accent="#2ebd8a" />
            <MetricCard icon={<Clock3 size={18} />} label="Em acompanhamento" value={inTransit.toLocaleString("pt-BR")} detail="pedidos em trânsito" accent="#8c78f4" />
          </section>

          <section className="data-section">
            <div className="section-heading-row">
              <div><div className="section-kicker">BASE DE FRETES</div><h2>Operação recente</h2><p>Consulte os registros importados e encontre um CT-e em segundos.</p></div>
              <button className="outline-action" onClick={() => openSoon("Relatórios")}>Ver relatórios <ArrowRight size={15} /></button>
            </div>

            <div className="toolbar">
              <div className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar CT-e, cidade ou veículo..." /></div>
              <div className="filter-control"><Filter size={15} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="todos">Todos os status</option><option value="Entregue">Entregues</option><option value="Em trânsito">Em trânsito</option><option value="Acompanhar">Acompanhar</option><option value="Cancelado">Cancelados</option></select></div>
              <div className="filter-control compact"><MapPin size={15} /><select value={ufFilter} onChange={(event) => setUfFilter(event.target.value)}><option value="todas">Todas UFs</option>{ufs.map((uf) => <option key={uf} value={uf}>{uf}</option>)}</select></div>
              <span className="result-count">{filteredFreights.length} de {freights.length} registros</span>
            </div>

            <div className="table-wrap">
              <table>
                <thead><tr><th>CTRC / CT-e</th><th>Destino</th><th>Emissão</th><th>Veículo</th><th>Volumes</th><th>Valor do frete</th><th>Status</th><th aria-label="Ações" /></tr></thead>
                <tbody>
                  {filteredFreights.slice(0, 10).map((freight) => (
                    <tr key={freight.id}>
                      <td><div className="doc-cell"><strong>{freight.ctrc}</strong><span>{freight.cte}</span></div></td>
                      <td><div className="destination-cell"><strong>{freight.city}</strong><span>{freight.uf} · entrega {freight.expected}</span></div></td>
                      <td className="muted-cell">{freight.emission}</td>
                      <td><span className="vehicle-chip">{freight.vehicle}</span></td>
                      <td><strong className="volume-number">{freight.volume}</strong><span className="volume-label">vol.</span></td>
                      <td><strong className="money-cell">{currency(freight.freight)}</strong><span className="invoice-cell">NF {currency(freight.invoice)}</span></td>
                      <td><span className={`status-badge ${statusStyles[freight.deliveryStatus] ?? "status-amber"}`}><span className="status-dot" />{freight.deliveryStatus}</span></td>
                      <td><button className="row-more" onClick={() => setNotice(`${freight.ctrc}: ${freight.occurrence}. Detalhamento completo será incluído na próxima fase.`)} aria-label={`Ver detalhes de ${freight.ctrc}`}><ArrowRight size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filteredFreights.length && <div className="empty-state"><Search size={20} /><strong>Nenhum frete encontrado</strong><span>Ajuste os filtros ou importe uma nova planilha.</span></div>}
            </div>
            {filteredFreights.length > 10 && <div className="table-footer"><span>Mostrando os 10 primeiros registros para uma leitura rápida.</span><button onClick={() => setNotice("A paginação completa será adicionada junto com os relatórios.")}>Ver todos <ArrowRight size={14} /></button></div>}
          </section>

          <section className="next-step-card">
            <div className="next-step-symbol"><ReceiptText size={21} /></div>
            <div><span className="section-kicker">PRÓXIMA ETAPA</span><h3>Relatórios sob medida para a sua operação</h3><p>Esta base já está preparada. Quando você definir os relatórios que precisa, adicionaremos indicadores, filtros avançados e exportações.</p></div>
            <button onClick={() => openSoon("Relatórios")}>Definir depois <ArrowRight size={15} /></button>
          </section>

          <footer className="page-footer"><span>RotaClara · primeira versão</span><span>Leitura local e segura da planilha</span></footer>
        </div>
      </main>
    </div>
  );
}
