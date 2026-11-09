import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Maximize2, RefreshCw, X } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { loadFreightRaw } from "@/lib/freightStorage";

type Row = {
  date: string;
  value: number;
  status: string;
  vehicle: string;
  vehicleCandidates: string[];
  payer: string;
  returnMarked: boolean;
};
type CostRow = { plate?: string; date?: string; cost?: number };
const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);
const normalize = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\uFEFF\u00A0]/g, " ")
    .trim()
    .toLowerCase();
const plate = (value: unknown) =>
  String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
const numberValue = (value: unknown) => {
  const text = String(value ?? "")
    .replace(/\s/g, "")
    .replace(/%/g, "");
  if (!text) return 0;
  return (
    Number(
      text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text
    ) || 0
  );
};
const isoDate = (value: unknown) => {
  const raw = String(value || "").trim();
  const br = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (br) return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  const us = raw.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
  return us
    ? `${us[1]}-${us[2].padStart(2, "0")}-${us[3].padStart(2, "0")}`
    : "";
};
const readJson = <T,>(key: string, fallback: T): T => {
  try {
    return JSON.parse(localStorage.getItem(key) || "") || fallback;
  } catch {
    return fallback;
  }
};
const csvRows = (text: string) => {
  const first = text.split(/\r?\n/, 1)[0] || "";
  const delimiter = first.includes(";")
    ? ";"
    : first.includes("\t")
      ? "\t"
      : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (c === '"') quoted = !quoted;
    else if (c === delimiter && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && next === "\n") i += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
};
const parseRows = (raw: string): Row[] => {
  const rows = csvRows(raw);
  if (rows.length < 2) return [];
  const headers = rows[0].map(normalize);
  const find = (...names: string[]) =>
    names
      .map(normalize)
      .map(name => headers.indexOf(name))
      .find(index => index >= 0) ?? -1;
  const dateIndex = find("data_emissao", "data");
  const valueIndex = find("valor_frete", "vlr_liquidado", "valor_liquido");
  const statusIndex = find("situacao_ctrc", "situacao", "status");
  const deliveryVehicleIndex = find("veiculo_entrega");
  const collectionVehicleIndex = find("veiculo_coleta");
  const plateIndex = find("placa", "veiculo");
  const payerIndex = find("pagador_nome", "pagador", "cliente_pagador");
  const baHeaderIndex = headers.findIndex(header =>
    ["observ1", "ba", "valor_ba"].includes(header)
  );
  const baIndex = baHeaderIndex >= 0 ? baHeaderIndex : 52;
  return rows
    .slice(1)
    .map(cells => {
      const vehicleCandidates = Array.from(
        new Set(
          [
            cells[deliveryVehicleIndex],
            cells[collectionVehicleIndex],
            cells[plateIndex],
          ]
            .map(plate)
            .filter(Boolean)
        )
      );
      return {
        date: isoDate(cells[dateIndex]),
        value: numberValue(cells[valueIndex]),
        status: normalize(cells[statusIndex]),
        vehicle: vehicleCandidates[0] || "",
        vehicleCandidates,
        payer: String(cells[payerIndex] || "Não informado").trim(),
        returnMarked: /retorno/i.test(cells[baIndex] || ""),
      };
    })
    .filter(
      row =>
        /^\d{4}-\d{2}-\d{2}$/.test(row.date) &&
        row.value >= 0 &&
        !["cancelado", "cancelada"].includes(row.status)
    );
};

export default function GestaoOperacional() {
  const [rows, setRows] = useState<Row[]>([]);
  const [month, setMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const fleet = useMemo(
    () =>
      readJson<string[]>("rotaclara-fleet-vehicles", [])
        .map(plate)
        .filter(Boolean),
    []
  );
  const costRows = useMemo(
    () => readJson<CostRow[]>("rotaclara-costs", []),
    []
  );
  const costPlates = useMemo(
    () => new Set(costRows.map(item => plate(item.plate)).filter(Boolean)),
    [costRows]
  );
  const fixedOperations = useMemo(
    () =>
      readJson<{ name: string; enabled: boolean }[]>(
        "rotaclara-fleet-fixed-payers",
        [
          { name: "LOJAS EDMIL SA", enabled: true },
          { name: "EVS EXPRESS TRANSPORTES LTDA", enabled: true },
        ]
      ).filter(item => item.enabled && item.name.trim()),
    []
  );
  const load = async () => {
    setLoading(true);
    try {
      const stored = await loadFreightRaw();
      const fallback = stored
        ? ""
        : await fetch("/manus-storage/bd_fd19ed05.csv").then(response =>
            response.ok ? response.text() : ""
          );
      const parsed = parseRows(stored || fallback);
      setRows(parsed);
      const months = Array.from(
        new Set(parsed.map(row => row.date.slice(0, 7)))
      ).sort();
      setMonth(current =>
        current && months.includes(current)
          ? current
          : months[months.length - 1] || ""
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
    const onFullscreen = () =>
      setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);
  const monthRows = useMemo(
    () => rows.filter(row => row.date.startsWith(month)),
    [rows, month]
  );
  const fleetRows = useMemo(
    () =>
      monthRows.filter(row =>
        row.vehicleCandidates.some(vehicle => fleet.includes(vehicle))
      ),
    [monthRows, fleet]
  );
  const byVehicle = useMemo(
    () =>
      fleet
        .map(vehicle => ({
          vehicle,
          value: fleetRows
            .filter(row => row.vehicleCandidates.includes(vehicle))
            .reduce((sum, row) => sum + row.value, 0),
        }))
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value),
    [fleet, fleetRows]
  );
  const thirdPartyRevenue = monthRows
    .filter(
      row =>
        row.vehicleCandidates.length > 0 &&
        !row.vehicleCandidates.some(vehicle => fleet.includes(vehicle)) &&
        !row.vehicleCandidates.some(vehicle => costPlates.has(vehicle))
    )
    .reduce((sum, row) => sum + row.value, 0);
  const thirdPartyCost = costRows
    .filter(row => String(row.date || "").startsWith(month))
    .reduce((sum, row) => sum + Number(row.cost || 0), 0);
  const rate = thirdPartyRevenue
    ? (thirdPartyCost / thirdPartyRevenue) * 100
    : null;
  const openFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      /* navegador sem suporte */
    }
  };
  const closeFullscreen = async () => {
    try {
      await document.exitFullscreen?.();
    } catch {
      /* noop */
    }
  };
  if (loading)
    return (
      <div className="tv-page operational-tv">
        <div className="tv-loading">
          <RefreshCw className="spin" size={24} /> Carregando os indicadores...
        </div>
      </div>
    );
  const totalFleet = fleetRows.reduce((sum, row) => sum + row.value, 0);
  const fixedComposition = fixedOperations.map(operation => ({
    name: operation.name,
    value: fleetRows
      .filter(row => normalize(row.payer).includes(normalize(operation.name)))
      .reduce((sum, row) => sum + row.value, 0),
  }));
  const fixedCompositionRows = fleetRows.filter(row =>
    fixedOperations.some(operation =>
      normalize(row.payer).includes(normalize(operation.name))
    )
  );
  const returnValue = fleetRows
    .filter(row => row.returnMarked)
    .reduce((sum, row) => sum + row.value, 0);
  const extraValue = fleetRows
    .filter(row => !fixedCompositionRows.includes(row) && !row.returnMarked)
    .reduce((sum, row) => sum + row.value, 0);
  const compositionRows = [
    ...fixedComposition,
    { name: "FRETE DESEMPENHO", value: returnValue },
    { name: "FRETE EXTRA", value: extraValue },
  ]
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);
  return (
    <div className="tv-page operational-tv">
      <header className="tv-header">
        <div>
          <h1 style={{ fontSize: "12px" }}>Operação em foco</h1>
        </div>
        <div className="tv-controls">
          <label>
            <CalendarDays size={16} /> Competência
            <select
              value={month}
              onChange={event => setMonth(event.target.value)}
            >
              {Array.from(new Set(rows.map(row => row.date.slice(0, 7))))
                .sort()
                .map(item => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
            </select>
          </label>
          <button onClick={() => void load()} title="Atualizar agora">
            <RefreshCw size={17} />
          </button>
          <button
            onClick={fullscreen ? closeFullscreen : openFullscreen}
            title={fullscreen ? "Sair da tela cheia" : "Abrir tela cheia"}
          >
            {fullscreen ? <X size={17} /> : <Maximize2 size={17} />}
          </button>
        </div>
      </header>
      <main className="tv-main operational-main">
        <section className="operational-kpis">
          <article className="tv-panel operational-rate-card">
            <div className="tv-panel-heading">
              <div>
                <span style={{ color: "#f0782d", fontSize: "12px" }}>
                  CUSTO TERCEIRO
                </span>
              </div>
            </div>
            <strong
              className={`operational-rate ${rate === null ? "is-unavailable" : ""}`}
            >
              {rate === null
                ? "Indisponível"
                : `${rate.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`}
            </strong>
            <div className="tv-rate-detail">
              {rate === null
                ? "Importe a Base de Terceiros e tenha frete de terceiros no período."
                : `${money(thirdPartyCost)} de custo ÷ ${money(thirdPartyRevenue)} de frete de terceiros`}
            </div>
          </article>
          <article className="tv-panel operational-summary operational-composition-card">
            <div className="operational-composition-heading">
              <span>COMPOSIÇÃO</span>
            </div>
            {compositionRows.length > 0 ? (
              <div className="operational-composition-list">
                {compositionRows.map(item => (
                  <div className="operational-composition-row" key={item.name}>
                    <span>{item.name}</span>
                    <strong>{money(item.value)}</strong>
                    <em>
                      {totalFleet
                        ? `${((item.value / totalFleet) * 100).toFixed(1).replace(".", ",")}%`
                        : "0,0%"}
                    </em>
                  </div>
                ))}
              </div>
            ) : (
              <div className="operational-composition-empty">
                Sem faturamento na competência.
              </div>
            )}
          </article>
        </section>
        <section className="tv-panel operational-chart-panel">
          <div className="tv-panel-heading">
            <div>
              <span style={{ fontSize: "12px" }}>FATURAMENTO DA FROTA</span>
            </div>
            <strong>{money(totalFleet)}</strong>
          </div>
          {byVehicle.length > 0 && (
            <ResponsiveContainer
              width="100%"
              height={Math.max(420, byVehicle.length * 42)}
            >
              <BarChart
                data={byVehicle}
                layout="vertical"
                margin={{ top: 12, right: 32, left: 24, bottom: 12 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#ececec" />
                <XAxis
                  type="number"
                  tickFormatter={value =>
                    `R$${Math.round(Number(value) / 1000)}k`
                  }
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  type="category"
                  dataKey="vehicle"
                  width={78}
                  tick={{ fontSize: 13, fontWeight: 700 }}
                />
                <Tooltip
                  formatter={(value: number) => money(value)}
                  labelFormatter={label => `Placa ${label}`}
                />
                <Bar
                  dataKey="value"
                  name="Faturamento"
                  barSize={23}
                  fill="#f0782d"
                  radius={[0, 7, 7, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
          {byVehicle.length === 0 && (
            <div className="tv-empty">
              Nenhum faturamento encontrado para as placas cadastradas como
              frota nesta competência.
            </div>
          )}
        </section>
      </main>
      <footer className="tv-footer">
        <span>Base mensal · cancelados excluídos</span>
      </footer>
    </div>
  );
}
