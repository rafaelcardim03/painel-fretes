import { useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileSpreadsheet,
  LayoutDashboard,
  Menu,
  ReceiptText,
  Settings2,
  Target,
  Truck,
} from "lucide-react";

type BillingRow = { date: string; value: number; status: string; ctrc: string };

const sampleRows: BillingRow[] = [
  { date: "02/01/2026", value: 3211.44, status: "LIQUIDADO", ctrc: "MTX 005704-5" },
  { date: "02/01/2026", value: 3348.74, status: "LIQUIDADO", ctrc: "MTX 005705-3" },
  { date: "02/01/2026", value: 3245.77, status: "LIQUIDADO", ctrc: "MTX 005706-1" },
  { date: "02/01/2026", value: 3707.74, status: "LIQUIDADO", ctrc: "MTX 005707-0" },
  { date: "02/01/2026", value: 4175.54, status: "LIQUIDADO", ctrc: "MTX 005708-8" },
  { date: "02/01/2026", value: 4082.96, status: "LIQUIDADO", ctrc: "MTX 005709-6" },
  { date: "02/01/2026", value: 4159.36, status: "LIQUIDADO", ctrc: "MTX 005710-0" },
  { date: "02/01/2026", value: 30, status: "LIQUIDADO", ctrc: "MTX 005713-4" },
];

const currency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const number = (value: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value);
const toIso = (date: string) => {
  const [day, month, year] = date.split("/");
  return year && month && day ? `${year}-${month}-${day}` : "";
};
const fromIso = (date: string) => {
  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}/${month}/${year}` : "";
};
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\uFEFF\u00A0]/g, " ").trim().toLowerCase();
const parseValue = (value: string) => {
  const clean = value.replace(/\s/g, "").replace(/%/g, "");
  if (!clean) return 0;
  return Number(clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean) || 0;
};
const csvLines = (text: string) => {
  const result: string[] = []; let current = ""; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i]; const next = text[i + 1];
    if (c === '"' && quoted && next === '"') { current += '"'; i += 1; }
    else if (c === '"') { quoted = !quoted; }
    else if ((c === "\n" || c === "\r") && !quoted) { if (current.trim()) result.push(current); current = ""; if (c === "\r" && next === "\n") i += 1; }
    else current += c;
  }
  if (current.trim()) result.push(current);
  return result;
};
const csvCells = (line: string) => {
  const result: string[] = []; let current = ""; let quoted = false;
  for (let i = 0; i < line.length; i += 1) { const c = line[i]; const next = line[i + 1]; if (c === '"' && quoted && next === '"') { current += '"'; i += 1; } else if (c === '"') quoted = !quoted; else if (c === ";" && !quoted) { result.push(current.trim()); current = ""; } else current += c; }
  result.push(current.trim()); return result;
};
const parseImported = (text: string): BillingRow[] => {
  const lines = csvLines(text); if (lines.length < 2) return [];
  const headers = csvCells(lines[0]).map(normalize);
  const find = (...names: string[]) => names.map(normalize).map((name) => headers.findIndex((header) => header === name)).find((index) => index >= 0) ?? -1;
  const dateIndex = find("data_emissao");
  const valueIndex = find("valor_frete", "vlr_liquidado", "valor_liquido");
  const statusIndex = find("situacao_ctrc");
  const ctrcIndex = find("sigla_ctrc", "numero_ctrc");
  return lines.slice(1).map((line) => { const cells = csvCells(line); return { date: cells[dateIndex] || "", value: parseValue(cells[valueIndex] || ""), status: (cells[statusIndex] || "").toUpperCase(), ctrc: cells[ctrcIndex] || "" }; }).filter((row) => row.date && row.value >= 0);
};
const businessDaysInMonth = (year: number, month: number) => {
  let total = 0; const days = new Date(year, month, 0).getDate();
  for (let day = 1; day <= days; day += 1) { const weekday = new Date(year, month - 1, day).getDay(); if (weekday !== 0 && weekday !== 6) total += 1; }
  return total;
};

function Metric({ icon, label, value, detail, accent }: { icon: React.ReactNode; label: string; value: string; detail: string; accent: string }) {
  return <div className="metric-card" style={{ "--metric-accent": accent } as React.CSSProperties}><div className="metric-topline"><span className="metric-icon">{icon}</span><span className="metric-label">{label}</span><span className="metric-arrow">↗</span></div><strong>{value}</strong><span className="metric-detail">{detail}</span></div>;
}

export default function Faturamento() {
  const [rows, setRows] = useState<BillingRow[]>(() => { try { const saved = localStorage.getItem("rotaclara-csv"); return saved ? parseImported(saved) : sampleRows; } catch { return sampleRows; } });
  const [start, setStart] = useState("2026-01-01");
  const [end, setEnd] = useState("2026-01-31");
  const [goal, setGoal] = useState(() => Number(localStorage.getItem("rotaclara-goal") || 100000));
  const [businessDays, setBusinessDays] = useState(() => Number(localStorage.getItem("rotaclara-business-days") || 22));
  const [goalInput, setGoalInput] = useState(String(goal));
  const [daysInput, setDaysInput] = useState(String(businessDays));
  const [notice, setNotice] = useState("");
  const [section, setSection] = useState("Faturamento");
  const dailyGoal = businessDays > 0 ? goal / businessDays : 0;

  const periodRows = useMemo(() => rows.filter((row) => row.status !== "CANCELADO" && row.status !== "CANCELADA" && toIso(row.date) >= start && toIso(row.date) <= end), [rows, start, end]);
  const total = periodRows.reduce((sum, row) => sum + row.value, 0);
  const activeDates = new Set(periodRows.map((row) => row.date));
  const average = activeDates.size ? total / activeDates.size : 0;
  const startDate = new Date(`${start}T12:00:00`); const endDate = new Date(`${end}T12:00:00`);
  const calendarBusinessDays = Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) ? 0 : (() => { let count = 0; const cursor = new Date(startDate); while (cursor <= endDate) { const day = cursor.getDay(); if (day !== 0 && day !== 6) count += 1; cursor.setDate(cursor.getDate() + 1); } return count; })();
  const progress = dailyGoal ? Math.min(100, (average / dailyGoal) * 100) : 0;

  const saveGoal = () => { const nextGoal = parseValue(goalInput); const nextDays = Math.max(1, Number(daysInput) || 1); setGoal(nextGoal); setBusinessDays(nextDays); localStorage.setItem("rotaclara-goal", String(nextGoal)); localStorage.setItem("rotaclara-business-days", String(nextDays)); setNotice("Meta geral e dias úteis atualizados."); };
  const useMonthDays = () => { const date = new Date(`${start}T12:00:00`); const days = businessDaysInMonth(date.getFullYear(), date.getMonth() + 1); setBusinessDays(days); setDaysInput(String(days)); setNotice(`${days} dias úteis calculados para o mês selecionado.`); };
  const resetPeriod = () => { setStart("2026-01-01"); setEnd("2026-01-31"); setNotice("Período de janeiro de 2026 selecionado."); };

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand-lockup"><div className="brand-mark"><Truck size={19} strokeWidth={2.4} /></div><div><div className="brand-name">Rota<span>Clara</span></div><div className="brand-subtitle">gestão de fretes</div></div></div>
      <div className="workspace-switcher"><div className="workspace-avatar">O</div><div className="workspace-copy"><span>Operação principal</span><strong>Unidade MTX</strong></div><ChevronDown size={15} /></div>
      <div className="sidebar-label">Navegação</div><nav className="sidebar-nav"><button className="nav-item" onClick={() => window.location.href = "/"}><LayoutDashboard size={17} /><span>Visão geral</span></button><button className="nav-item" onClick={() => window.location.href = "/"}><ReceiptText size={17} /><span>Fretes</span></button><button className="nav-item active"><BarChart3 size={17} /><span>Faturamento</span><span className="nav-pip" /></button></nav>
      <div className="sidebar-label sidebar-label-later">Em breve</div><nav className="sidebar-nav"><button className="nav-item muted" onClick={() => setNotice("Indicadores detalhados serão adicionados na próxima etapa.")}><Target size={17} /><span>Indicadores</span></button><button className="nav-item muted" onClick={() => setNotice("Configurações gerais serão adicionadas na próxima etapa.")}><CircleHelp size={17} /><span>Configurações</span></button></nav>
      <div className="sidebar-footer"><div className="help-card"><div className="help-icon"><Target size={17} /></div><strong>Meta diária</strong><span>Configure a meta geral e os dias úteis do mês.</span><button onClick={() => document.getElementById("meta-config")?.scrollIntoView({ behavior: "smooth" })}>Configurar agora <ArrowRight size={14} /></button></div><div className="user-row"><div className="user-avatar">RC</div><div><strong>Rafael Costa</strong><span>Administrador</span></div><Menu size={16} /></div></div>
    </aside>
    <main className="main-content"><header className="topbar"><div className="breadcrumbs"><span>Operação</span><span className="crumb-separator">/</span><strong>Faturamento</strong></div><div className="topbar-actions"><span className="last-sync"><span className="sync-dot" /> Base local · agora</span><button className="topbar-help" onClick={() => setNotice("O faturamento considera somente CTs cuja coluna H seja diferente de CANCELADO.")}><CircleHelp size={17} /></button><button className="topbar-avatar">RC</button></div></header>
      <div className="content-wrap"><section className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> CONTROLE FINANCEIRO</div><h1>Faturamento em <em>foco.</em></h1><p>Veja quanto foi faturado, acompanhe a média e compare com sua meta diária.</p></div><div className="heading-meta"><span className="file-pill"><FileSpreadsheet size={13} /> {rows.length.toLocaleString("pt-BR")} CTs na base</span></div></section>
        <section className="period-filter"><div className="period-filter-heading"><div><div className="section-kicker"><CalendarDays size={14} /> PERÍODO DE ANÁLISE</div><h2>Selecione o intervalo do faturamento</h2></div><button className="text-action" onClick={resetPeriod}>Usar mês atual <ArrowRight size={14} /></button></div><div className="period-fields"><label>Data inicial<input type="date" value={start} onChange={(event) => setStart(event.target.value)} /></label><span className="period-dash">até</span><label>Data final<input type="date" value={end} onChange={(event) => setEnd(event.target.value)} /></label><div className="period-rule"><Check size={14} /> CTs cancelados excluídos automaticamente</div></div></section>
        {notice && <div className="notice"><Check size={16} /><span>{notice}</span><button onClick={() => setNotice("")}>×</button></div>}
        <section className="metrics-grid billing-metrics"><Metric icon={<ReceiptText size={18} />} label="Faturado no período" value={currency(total)} detail={`${number(periodRows.length)} CTs válidos no intervalo`} accent="#2784ff" /><Metric icon={<BarChart3 size={18} />} label="Média diária" value={currency(average)} detail={`${number(activeDates.size)} dia(s) com faturamento`} accent="#2ebd8a" /><Metric icon={<Target size={18} />} label="Meta diária" value={currency(dailyGoal)} detail={`${currency(goal)} ÷ ${businessDays} dias úteis`} accent="#e9a33a" /><Metric icon={<Clock3 size={18} />} label="Atingimento médio" value={`${progress.toFixed(0)}%`} detail={progress >= 100 ? "meta diária alcançada" : "comparado à meta diária"} accent="#8c78f4" /></section>
        <section className="billing-grid"><div className="billing-card"><div className="section-heading-row"><div><div className="section-kicker">EVOLUÇÃO DO PERÍODO</div><h2>Faturamento x meta diária</h2><p>Leitura rápida dos valores válidos por dia.</p></div><span className="legend"><i className="legend-blue" />Faturado <i className="legend-amber" />Meta</span></div><div className="chart-area">{Array.from({ length: Math.min(14, Math.max(calendarBusinessDays, activeDates.size, 1)) }, (_, index) => { const dayRows = periodRows.filter((row) => { const d = Number(row.date.split("/")[0]); return d === index + 1; }); const dayValue = dayRows.reduce((sum, row) => sum + row.value, 0); const height = total ? Math.max(8, (dayValue / Math.max(total / 3, dailyGoal || 1)) * 100) : 8; return <div className="chart-column" key={index}><div className="chart-value">{dayValue ? currency(dayValue).replace(",00", "").replace("R$ ", "") : "—"}</div><div className="chart-bars"><div className="bar-target" style={{ height: `${Math.min(100, dailyGoal ? 100 : 15)}%` }} /><div className="bar-real" style={{ height: `${Math.min(100, height)}%` }} /></div><span>dia {index + 1}</span></div>; })}</div><div className="chart-note"><span><i className="legend-blue" /> azul = faturado</span><span><i className="legend-amber" /> âmbar = referência da meta</span></div></div>
          <div className="insight-card"><div className="insight-icon"><BarChart3 size={19} /></div><div className="section-kicker">RESUMO DO PERÍODO</div><h3>{progress >= 100 ? "Ritmo acima da meta" : "Acompanhe o ritmo da operação"}</h3><p>Você faturou <strong>{currency(total)}</strong> no intervalo selecionado. A média dos dias com movimento está em <strong>{currency(average)}</strong>.</p><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><div className="progress-label"><span>Meta diária</span><strong>{progress.toFixed(0)}%</strong></div></div></section>
        <section className="meta-config" id="meta-config"><div className="meta-config-copy"><div className="next-step-symbol"><Settings2 size={21} /></div><div><div className="section-kicker">CONFIGURAÇÃO DE META</div><h2>Defina a meta geral do mês</h2><p>A meta diária é calculada automaticamente dividindo o valor geral pela quantidade de dias úteis informada.</p></div></div><div className="meta-fields"><label>Meta geral (R$)<input inputMode="decimal" value={goalInput} onChange={(event) => setGoalInput(event.target.value)} placeholder="100000" /></label><label>Dias úteis do mês<input type="number" min="1" max="31" value={daysInput} onChange={(event) => setDaysInput(event.target.value)} /></label><button className="import-button" onClick={saveGoal}><Check size={16} /> Salvar meta</button><button className="outline-action" onClick={useMonthDays}>Calcular mês <CalendarDays size={14} /></button></div><div className="meta-formula"><span>Fórmula aplicada</span><strong>{currency(goal)} ÷ {businessDays} dias úteis = <em>{currency(dailyGoal)} por dia</em></strong></div></section>
        <footer className="page-footer"><span>RotaClara · faturamento</span><span>Critério: coluna H diferente de CANCELADO</span></footer>
      </div></main>
  </div>;
}
