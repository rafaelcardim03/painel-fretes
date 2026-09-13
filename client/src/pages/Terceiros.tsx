import { ChangeEvent, useMemo, useState } from "react";
import { Check, FileSpreadsheet, Search, Upload, Wallet } from "lucide-react";

type ThirdPartyRow = {
  ctrb: string;
  tipo: string;
  situacao: string;
  emissao: string;
  plate: string;
  owner: string;
  origin: string;
  destination: string;
  km: number;
  total: number;
  liquid: number;
  toll: number;
};

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const numberValue = (value: string) => {
  const text = String(value || "").replace(/\u00a0/g, "").trim();
  if (!text) return 0;
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  return Number(normalized.replace(/[^\d.-]/g, "")) || 0;
};
const clean = (value: string) => String(value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
const normalize = (value: string) => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

function parseCsv(raw: string): ThirdPartyRow[] {
  const firstLine = raw.split(/\r?\n/, 1)[0] || "";
  const delimiter = firstLine.includes(";") ? ";" : firstLine.includes("\t") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];
    const next = raw[i + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell); if (row.some((value) => clean(value))) rows.push(row);
      row = []; cell = "";
    } else cell += char;
  }
  row.push(cell); if (row.some((value) => clean(value))) rows.push(row);
  if (rows.length < 3) return [];
  const headers = rows[1].map(normalize);
  const index = (name: string) => headers.indexOf(normalize(name));
  const get = (cells: string[], name: string) => clean(cells[index(name)] || "");
  return rows.slice(2).map((cells) => ({
    ctrb: get(cells, "CTRB"), tipo: get(cells, "TIPO"), situacao: get(cells, "SITUACAO"), emissao: get(cells, "DATA E HORA EMISSAO"),
    plate: get(cells, "PLACA CAVALO"), owner: get(cells, "PROPRIETARIO"), origin: get(cells, "CIDADE/UF ORIGEM"), destination: get(cells, "CIDADE/UF DESTINO"),
    km: numberValue(get(cells, "DISTANCIA KM")), total: numberValue(get(cells, "TOTAL CTRB")), liquid: numberValue(get(cells, "VALOR LIQUIDO")), toll: numberValue(get(cells, "VALE PEDAGIO")),
  })).filter((row) => row.ctrb || row.plate || row.total);
}

const navItem = (route: string, icon: string, label: string, active = false) => active
  ? <button className="nav-item active"><span className="nav-text-icon">{icon}</span><span>{label}</span><span className="nav-pip" /></button>
  : <button className="nav-item" onClick={() => { window.location.href = route; }}><span className="nav-text-icon">{icon}</span><span>{label}</span></button>;

export default function Terceiros() {
  const [fileName, setFileName] = useState(() => localStorage.getItem("rotaclara-terceiros-name") || "");
  const [rows, setRows] = useState<ThirdPartyRow[]>(() => { try { return JSON.parse(localStorage.getItem("rotaclara-terceiros") || "[]"); } catch { return []; } });
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("TODOS");

  const importFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCsv(String(reader.result || ""));
      if (!parsed.length) { setNotice("Não foi possível identificar registros neste arquivo."); return; }
      localStorage.setItem("rotaclara-terceiros", JSON.stringify(parsed));
      localStorage.setItem("rotaclara-terceiros-name", file.name);
      setRows(parsed); setFileName(file.name); setNotice(`${parsed.length} registros de Terceiros importados com sucesso.`);
    };
    reader.readAsText(file, "windows-1252");
  };

  const filtered = useMemo(() => rows.filter((row) => {
    const term = normalize(search);
    const matchesSearch = !term || [row.ctrb, row.plate, row.owner, row.origin, row.destination].some((value) => normalize(value).includes(term));
    return matchesSearch && (status === "TODOS" || normalize(row.situacao) === status);
  }), [rows, search, status]);
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const km = rows.reduce((sum, row) => sum + row.km, 0);
  const statuses = Array.from(new Set(rows.map((row) => normalize(row.situacao)).filter(Boolean))).sort();

  return <div className="app-shell"><aside className="sidebar"><div className="brand-lockup"><div className="brand-mark"><Wallet size={19} /></div><div><div className="brand-name">Rota<span>Clara</span></div><div className="brand-subtitle">gestão de fretes</div></div></div><nav className="sidebar-nav sidebar-nav-compact"><div className="sidebar-nav-section">VISUALIZAÇÃO</div>{navItem("/faturamento", "▥", "Faturamento")}{navItem("/frota", "▣", "Operações com frota")}{navItem("/agregados", "▦", "Agregados")}<div className="sidebar-nav-section support-section">SUPORTE</div>{navItem("/importacao", "↥", "Importar arquivos")}{navItem("/terceiros", "◫", "Terceiros", true)}{navItem("/cadastros", "⚙", "Cadastros")}</nav></aside><main className="main-content"><header className="topbar"><div className="breadcrumbs"><span>Suporte</span><span>/</span><strong>Terceiros</strong></div><div className="topbar-actions"><span className="last-sync"><span className="sync-dot" /> Base local · agora</span><button className="topbar-avatar">RC</button></div></header><div className="content-wrap"><section className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> IMPORTAÇÃO OPERACIONAL</div><h1>Terceiros <em>em foco.</em></h1><p>Importe a relação de CTRBs e consulte os registros de transportadores terceiros.</p></div></section>{notice && <div className="notice"><Check size={16} /><span>{notice}</span><button onClick={() => setNotice("")}>×</button></div>}<section className="third-party-import-card"><div className="import-card-icon violet"><FileSpreadsheet size={21} /></div><div className="third-party-import-copy"><span className="section-kicker">BASE DE TERCEIROS</span><h2>Relação de CTRBs emitidos</h2><p>Arquivo CSV SSW com situação, placa, proprietário, rota, valores, km e pedágio.</p><strong>{fileName || "Nenhum arquivo importado"}</strong></div><label className="import-button third-party-upload"><Upload size={16} /> Importar CSV<input type="file" accept=".csv,text/csv" onChange={importFile} /></label></section><section className="metric-grid third-party-metrics"><div className="metric-card"><span>Registros carregados</span><strong>{rows.length.toLocaleString("pt-BR")}</strong><small>CTRBs identificados</small></div><div className="metric-card"><span>Valor total CTRB</span><strong>{money(total)}</strong><small>Soma da coluna TOTAL CTRB</small></div><div className="metric-card"><span>Distância registrada</span><strong>{km.toLocaleString("pt-BR")} km</strong><small>Soma da distância informada</small></div><div className="metric-card"><span>Valor líquido</span><strong>{money(rows.reduce((sum, row) => sum + row.liquid, 0))}</strong><small>Após retenções</small></div></section><section className="table-card third-party-table-card"><div className="table-card-heading"><div><span className="section-kicker">CONSULTA</span><h2>Detalhamento dos terceiros</h2><p>{filtered.length.toLocaleString("pt-BR")} de {rows.length.toLocaleString("pt-BR")} registros exibidos</p></div><div className="table-filters"><label className="table-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar CTRB, placa ou cidade" /></label><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="TODOS">Todos os status</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></div></div>{rows.length ? <div className="table-scroll"><table><thead><tr><th>CTRB</th><th>Situação</th><th>Emissão</th><th>Placa</th><th>Origem / destino</th><th>KM</th><th>Total</th><th>Líquido</th></tr></thead><tbody>{filtered.slice(0, 100).map((row, index) => <tr key={`${row.ctrb}-${index}`}><td><strong>{row.ctrb || "—"}</strong><small>{row.tipo}</small></td><td><span className="status-pill">{row.situacao || "—"}</span></td><td>{row.emissao || "—"}</td><td><strong>{row.plate || "—"}</strong><small>{row.owner}</small></td><td><strong>{row.origin || "—"}</strong><small>→ {row.destination || "—"}</small></td><td>{row.km.toLocaleString("pt-BR")}</td><td>{money(row.total)}</td><td>{money(row.liquid)}</td></tr>)}</tbody></table>{filtered.length > 100 && <div className="table-more">Mostrando os 100 primeiros registros filtrados.</div>}</div> : <div className="third-party-empty"><FileSpreadsheet size={28} /><strong>Importe o CSV de Terceiros para começar</strong><span>A tela está pronta para receber a relação de CTRBs emitidos.</span></div>}</section><div className="data-note"><Check size={15} /> Os dados de Terceiros ficam salvos somente neste navegador e ainda não alteram os relatórios de faturamento.</div></div></main></div>;
}
