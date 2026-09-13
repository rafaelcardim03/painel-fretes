export type ThirdPartyRow = {
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

const clean = (value: string) => String(value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
const normalize = (value: string) => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
const numberValue = (value: string) => {
  const text = String(value || "").replace(/\u00a0/g, "").trim();
  if (!text) return 0;
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  return Number(normalized.replace(/[^\d.-]/g, "")) || 0;
};

export function parseThirdPartyCsv(raw: string): ThirdPartyRow[] {
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
  })).filter((item) => item.ctrb || item.plate || item.total);
}
