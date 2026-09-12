import { useEffect, useMemo, useState } from "react";
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

type BillingRow = { date: string; value: number; status: string; ctrc: string; payer: string; vehicle: string; baValue: number; category?: "normal" | "complementar" };

const sampleRows: BillingRow[] = [
  { date: "02/01/2026", value: 3211.44, status: "LIQUIDADO", ctrc: "MTX 005704-5", payer: "LOJAS EDMIL SA", vehicle: "MKQ7A04", baValue: 0 },
  { date: "02/01/2026", value: 3348.74, status: "LIQUIDADO", ctrc: "MTX 005705-3", payer: "LOJAS EDMIL SA", vehicle: "MDG7D65", baValue: 0 },
  { date: "02/01/2026", value: 3245.77, status: "LIQUIDADO", ctrc: "MTX 005706-1", payer: "LOJAS EDMIL SA", vehicle: "CUC6I21", baValue: 0 },
  { date: "02/01/2026", value: 3707.74, status: "LIQUIDADO", ctrc: "MTX 005707-0", payer: "LOJAS EDMIL SA", vehicle: "HBN4878", baValue: 0 },
  { date: "02/01/2026", value: 4175.54, status: "LIQUIDADO", ctrc: "MTX 005708-8", payer: "LOJAS EDMIL SA", vehicle: "HMV0A57", baValue: 0 },
  { date: "02/01/2026", value: 4082.96, status: "LIQUIDADO", ctrc: "MTX 005709-6", payer: "LOJAS EDMIL SA", vehicle: "FDZ2H10", baValue: 0 },
  { date: "02/01/2026", value: 4159.36, status: "LIQUIDADO", ctrc: "MTX 005710-0", payer: "LOJAS EDMIL SA", vehicle: "HIV8I83", baValue: 0 },
  { date: "02/01/2026", value: 30, status: "LIQUIDADO", ctrc: "MTX 005713-4", payer: "COMPANHIA BRASILEIRA DE DISTRI", vehicle: "HNO9C84", baValue: 0 },
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
const complementaryTerms = ["complementar", "descarga", "veiculo dedicado", "estadia", "reembolso"];
const isComplementary = (value: string) => { const normalized = normalize(value); return complementaryTerms.some((term) => normalized.includes(normalize(term))); };
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
  const payerIndex = find("pagador_nome");
  const vehicleIndex = find("veiculo_entrega", "veiculo_coleta");
  const bbIndex = 53;
  return lines.slice(1).map((line) => { const cells = csvCells(line); const bbValue = `${cells[bbIndex] || ""} ${cells[bbIndex - 1] || ""}`; return { date: cells[dateIndex] || "", value: parseValue(cells[valueIndex] || ""), status: (cells[statusIndex] || "").toUpperCase(), ctrc: cells[ctrcIndex] || "", payer: cells[payerIndex] || "Não informado", vehicle: cells[vehicleIndex] || "", baValue: parseValue(cells[52] || ""), category: (isComplementary(bbValue) ? "complementar" : "normal") as "normal" | "complementar" }; }).filter((row) => row.date && row.value >= 0);
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
  const [rows, setRows] = useState<BillingRow[]>(() => { try { const saved = localStorage.getItem("rotaclara-csv"); return saved ? parseImported(saved) : []; } catch { return []; } });
  const [month, setMonth] = useState("2026-01");
  const [payer, setPayer] = useState("todos");
  const [fleetVehicles, setFleetVehicles] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem("rotaclara-fleet-vehicles") || "[]"); } catch { return []; } });
  const [vehicleInput, setVehicleInput] = useState("");
  const [goal, setGoal] = useState(() => { try { const goals = JSON.parse(localStorage.getItem("rotaclara-monthly-goals") || "{}"); return Number(goals["2026-01"]?.goal || 100000); } catch { return 100000; } });
  const [businessDays, setBusinessDays] = useState(() => { try { const goals = JSON.parse(localStorage.getItem("rotaclara-monthly-goals") || "{}"); return Number(goals["2026-01"]?.days || 22); } catch { return 22; } });
  const [goalInput, setGoalInput] = useState(String(goal));
  const [daysInput, setDaysInput] = useState(String(businessDays));
  const [notice, setNotice] = useState("");
  const [section, setSection] = useState("Faturamento");
  const dailyGoal = businessDays > 0 ? goal / businessDays : 0;
  useEffect(() => { if (localStorage.getItem("rotaclara-csv")) return; fetch("/manus-storage/bd_fd19ed05.csv").then((response) => response.text()).then((raw) => { const parsed = parseImported(raw); if (parsed.length) { setRows(parsed); localStorage.setItem("rotaclara-csv", raw); } }).catch(() => undefined); }, []);

  const [year, monthNumber] = month.split("-").map(Number);
  const start = `${month}-01`;
  const end = `${month}-${String(new Date(year, monthNumber, 0).getDate()).padStart(2, "0")}`;
  const payers = useMemo(() => Array.from(new Set(rows.map((row) => row.payer).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR")), [rows]);
  const periodRows = useMemo(() => rows.filter((row) => row.status !== "CANCELADO" && row.status !== "CANCELADA" && toIso(row.date) >= start && toIso(row.date) <= end && (payer === "todos" || row.payer === payer)), [rows, start, end, payer]);
  const total = periodRows.reduce((sum, row) => sum + row.value, 0);
  const normalRows = periodRows.filter((row) => row.category !== "complementar");
  const complementaryRows = periodRows.filter((row) => row.category === "complementar");
  const normalTotal = normalRows.reduce((sum, row) => sum + row.value, 0);
  const complementaryTotal = complementaryRows.reduce((sum, row) => sum + row.value, 0);
  const normalShare = total ? (normalTotal / total) * 100 : 0;
  const complementaryShare = total ? (complementaryTotal / total) * 100 : 0;
  const fleetRows = periodRows.filter((row) => fleetVehicles.includes(row.vehicle.trim().toUpperCase()));
  const fleetEdmil = fleetRows.filter((row) => normalize(row.payer).includes("lojas edmil sa")).reduce((sum, row) => sum + row.value, 0);
  const fleetEvs = fleetRows.filter((row) => normalize(row.payer).includes("evs express transportes ltda")).reduce((sum, row) => sum + row.value, 0);
  const fleetPerformance = fleetRows.reduce((sum, row) => sum + row.baValue, 0);
  const fleetExtra = fleetRows.reduce((sum, row) => sum + row.value, 0) - fleetEdmil - fleetEvs - fleetPerformance;
  const activeDates = new Set(periodRows.map((row) => row.date));
  const average = activeDates.size ? total / activeDates.size : 0;
  const startDate = new Date(`${start}T12:00:00`); const endDate = new Date(`${end}T12:00:00`);
  const calendarBusinessDays = Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) ? 0 : (() => { let count = 0; const cursor = new Date(startDate); while (cursor <= endDate) { const day = cursor.getDay(); if (day !== 0 && day !== 6) count += 1; cursor.setDate(cursor.getDate() + 1); } return count; })();
  const progress = dailyGoal ? Math.min(100, (average / dailyGoal) * 100) : 0;

  const saveGoal = () => { const nextGoal = parseValue(goalInput); const nextDays = Math.max(1, Number(daysInput) || 1); const goals = JSON.parse(localStorage.getItem("rotaclara-monthly-goals") || "{}"); goals[month] = { goal: nextGoal, days: nextDays }; localStorage.setItem("rotaclara-monthly-goals", JSON.stringify(goals)); setGoal(nextGoal); setBusinessDays(nextDays); setNotice(`Meta de ${month} salva com sucesso.`); };
  const useMonthDays = () => { const days = businessDaysInMonth(year, monthNumber); setBusinessDays(days); setDaysInput(String(days)); setNotice(`${days} dias úteis calculados para o mês selecionado.`); };
  const changeMonth = (nextMonth: string) => { setMonth(nextMonth); setPayer("todos"); try { const goals = JSON.parse(localStorage.getItem("rotaclara-monthly-goals") || "{}"); const saved = goals[nextMonth]; const [nextYear, nextMonthNumber] = nextMonth.split("-").map(Number); const nextDays = Number(saved?.days || businessDaysInMonth(nextYear, nextMonthNumber)); const nextGoal = Number(saved?.goal || 100000); setGoal(nextGoal); setBusinessDays(nextDays); setGoalInput(String(nextGoal)); setDaysInput(String(nextDays)); } catch { /* mantém os valores atuais */ } };
  const resetPeriod = () => { const now = new Date(); changeMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`); setNotice("Mês atual selecionado."); };
  const addFleetVehicle = () => { const vehicle = vehicleInput.trim().toUpperCase(); if (!vehicle) return; const next = Array.from(new Set([...fleetVehicles, vehicle])); setFleetVehicles(next); localStorage.setItem("rotaclara-fleet-vehicles", JSON.stringify(next)); setVehicleInput(""); setNotice(`Veículo ${vehicle} cadastrado na frota.`); };
  const removeFleetVehicle = (vehicle: string) => { const next = fleetVehicles.filter((item) => item !== vehicle); setFleetVehicles(next); localStorage.setItem("rotaclara-fleet-vehicles", JSON.stringify(next)); };

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand-lockup"><div className="brand-mark"><Truck size={19} strokeWidth={2.4} /></div><div><div className="brand-name">Rota<span>Clara</span></div><div className="brand-subtitle">gestão de fretes</div></div></div>
      <nav className="sidebar-nav sidebar-nav-compact"><button className="nav-item active" onClick={() => window.location.href = "/faturamento"}><BarChart3 size={17} /><span>Faturamento</span><span className="nav-pip" /></button><button className="nav-item" onClick={() => window.location.href = "/frota"}><Truck size={17} /><span>Operações com frota</span></button><button className="nav-item" onClick={() => window.location.href = "/importacao"}><span className="nav-text-icon">↥</span><span>Importar arquivos</span></button><button className="nav-item" onClick={() => window.location.href = "/agregados"}><span className="nav-text-icon">▦</span><span>Agregados</span></button><button className="nav-item" onClick={() => window.location.href = "/cadastros"}><span className="nav-text-icon">⚙</span><span>Cadastros</span></button></nav></aside>
    <main className="main-content"><header className="topbar"><div className="breadcrumbs"><span>Operação</span><span className="crumb-separator">/</span><strong>Faturamento</strong></div><div className="topbar-actions"><span className="last-sync"><span className="sync-dot" /> Base local · agora</span><button className="topbar-help" onClick={() => setNotice("O faturamento considera somente CTs cuja coluna H seja diferente de CANCELADO.")}><CircleHelp size={17} /></button><button className="topbar-avatar">RC</button></div></header>
      <div className="content-wrap"><section className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> CONTROLE FINANCEIRO</div><h1>Faturamento em <em>foco.</em></h1><p>Veja quanto foi faturado, acompanhe a média e compare com sua meta diária.</p></div><div className="heading-meta"><span className="file-pill"><FileSpreadsheet size={13} /> {rows.length.toLocaleString("pt-BR")} CTs na base</span></div></section>
        <section className="period-filter"><div className="period-filter-heading"><div><div className="section-kicker"><CalendarDays size={14} /> COMPETÊNCIA MENSAL</div><h2>Selecione o mês e o cliente pagador</h2></div><button type="button" className="text-action" onClick={resetPeriod}>Usar mês atual <ArrowRight size={14} /></button></div><div className="period-fields"><label>Mês de referência<input type="month" value={month} onChange={(event) => changeMonth(event.target.value)} /></label><label>Cliente pagador<select className="payer-select" value={payer} onChange={(event) => setPayer(event.target.value)}><option value="todos">Todos os pagadores</option>{payers.map((name) => <option key={name} value={name}>{name}</option>)}</select></label><div className="period-rule"><Check size={14} /> Janela fixa de 30 dias · CTs cancelados excluídos</div></div></section>
        {notice && <div className="notice"><Check size={16} /><span>{notice}</span><button onClick={() => setNotice("")}>×</button></div>}
        <section className="metrics-grid billing-metrics"><Metric icon={<ReceiptText size={18} />} label="Faturado no período" value={currency(total)} detail={`${number(periodRows.length)} CTs válidos no intervalo`} accent="#2784ff" /><Metric icon={<BarChart3 size={18} />} label="Média diária" value={currency(average)} detail={`${number(activeDates.size)} dia(s) com faturamento`} accent="#2ebd8a" /><Metric icon={<Target size={18} />} label="Meta diária" value={currency(dailyGoal)} detail={`${currency(goal)} ÷ ${businessDays} dias úteis`} accent="#e9a33a" /><Metric icon={<Clock3 size={18} />} label="Atingimento médio" value={`${progress.toFixed(0)}%`} detail={progress >= 100 ? "meta diária alcançada" : "comparado à meta diária"} accent="#8c78f4" /></section>
        <section className="freight-split"><div className="freight-split-heading"><div><div className="section-kicker">COMPOSIÇÃO DO FATURAMENTO</div><h2>Frete normal x complementar</h2><p>Classificação pela coluna BB da planilha.</p></div><span className="split-rule">Complementar: complementar · descarga · veículo dedicado · estadia · reembolso</span></div><div className="split-cards"><div className="split-card normal"><div className="split-card-top"><span className="split-icon"><ReceiptText size={17} /></span><span className="split-title">Frete normal</span><strong>{normalShare.toFixed(1)}%</strong></div><div className="split-value">{currency(normalTotal)}</div><div className="split-detail">{number(normalRows.length)} CTs no mês selecionado</div><div className="split-track"><span style={{ width: `${normalShare}%` }} /></div></div><div className="split-card complementary"><div className="split-card-top"><span className="split-icon"><Target size={17} /></span><span className="split-title">Frete complementar</span><strong>{complementaryShare.toFixed(1)}%</strong></div><div className="split-value">{currency(complementaryTotal)}</div><div className="split-detail">{number(complementaryRows.length)} CTs identificados na coluna BB</div><div className="split-track"><span style={{ width: `${complementaryShare}%` }} /></div></div></div></section>
        <section className="billing-grid"><div className="billing-card"><div className="section-heading-row"><div><div className="section-kicker">EVOLUÇÃO DO PERÍODO</div><h2>Faturamento x meta diária</h2><p>Leitura rápida dos valores válidos por dia.</p></div><span className="legend"><i className="legend-blue" />Faturado <i className="legend-amber" />Meta</span></div><div className="chart-area">{Array.from({ length: Math.min(14, Math.max(calendarBusinessDays, activeDates.size, 1)) }, (_, index) => { const dayRows = periodRows.filter((row) => { const d = Number(row.date.split("/")[0]); return d === index + 1; }); const dayValue = dayRows.reduce((sum, row) => sum + row.value, 0); const height = total ? Math.max(8, (dayValue / Math.max(total / 3, dailyGoal || 1)) * 100) : 8; return <div className="chart-column" key={index}><div className="chart-value">{dayValue ? currency(dayValue).replace(",00", "").replace("R$ ", "") : "—"}</div><div className="chart-bars"><div className="bar-target" style={{ height: `${Math.min(100, dailyGoal ? 100 : 15)}%` }} /><div className="bar-real" style={{ height: `${Math.min(100, height)}%` }} /></div><span>dia {index + 1}</span></div>; })}</div><div className="chart-note"><span><i className="legend-blue" /> azul = faturado</span><span><i className="legend-amber" /> âmbar = referência da meta</span></div></div>
          <div className="insight-card"><div className="insight-icon"><BarChart3 size={19} /></div><div className="section-kicker">RESUMO DO PERÍODO</div><h3>{progress >= 100 ? "Ritmo acima da meta" : "Acompanhe o ritmo da operação"}</h3><p>Você faturou <strong>{currency(total)}</strong> no intervalo selecionado. A média dos dias com movimento está em <strong>{currency(average)}</strong>.</p><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><div className="progress-label"><span>Meta diária</span><strong>{progress.toFixed(0)}%</strong></div></div></section>
        <section className="meta-config" id="meta-config"><div className="meta-config-copy"><div className="next-step-symbol"><Settings2 size={21} /></div><div><div className="section-kicker">CONFIGURAÇÃO MÊS A MÊS</div><h2>Cadastre a meta de {month}</h2><p>Cada competência possui sua própria meta geral e quantidade de dias úteis. Ao trocar o mês, os valores salvos são carregados automaticamente.</p></div></div><div className="meta-fields"><label>Meta geral de {month} (R$)<input inputMode="decimal" value={goalInput} onChange={(event) => setGoalInput(event.target.value)} placeholder="100000" /></label><label>Dias úteis de {month}<input type="number" min="1" max="31" value={daysInput} onChange={(event) => setDaysInput(event.target.value)} /></label><button className="import-button" onClick={saveGoal}><Check size={16} /> Salvar meta do mês</button><button className="outline-action" onClick={useMonthDays}>Calcular mês <CalendarDays size={14} /></button></div><div className="meta-formula"><span>Fórmula aplicada</span><strong>{currency(goal)} ÷ {businessDays} dias úteis = <em>{currency(dailyGoal)} por dia</em></strong></div></section>
        <footer className="page-footer"><span>RotaClara · faturamento</span><span>Critério: coluna H diferente de CANCELADO</span></footer>
      </div></main>
  </div>;
}
