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

export const bundledNovemberThirdPartyRows: ThirdPartyRow[] = [
  {
    ctrb: "MTX002175-0",
    tipo: "TRANSFERENCIA",
    situacao: "EMITIDO",
    emissao: "02/11/2026 20:05",
    plate: "IPQ7D93",
    owner: "TRANSPORTES JR QUADROS LTDA",
    origin: "LOUVEIRA/SP",
    destination: "ELOI MENDES/MG",
    km: 319,
    total: 2700,
    liquid: 2700,
    toll: 154.47,
  },
  {
    ctrb: "MTX002190-3",
    tipo: "TRANSFERENCIA",
    situacao: "ENCERRADO",
    emissao: "04/11/2026 10:29",
    plate: "TRF8I48",
    owner: "SUL TRIANGULO TRANSPORTES LOGISTICA E COMERCIO LTD",
    origin: "MACHADO/MG",
    destination: "FAZENDA RIO GRANDE/PR",
    km: 725,
    total: 5500,
    liquid: 5500,
    toll: 145.92,
  },
  {
    ctrb: "MTX002197-1",
    tipo: "TRANSFERENCIA",
    situacao: "ENCERRADO",
    emissao: "04/11/2026 17:43",
    plate: "BAM8E67",
    owner: "TULIO FLAUSINO LIMA",
    origin: "VARGINHA/MG",
    destination: "RIBEIRAO PRETO/SP",
    km: 320,
    total: 2000,
    liquid: 1990,
    toll: 63.2,
  },
  {
    ctrb: "MTX002207-1",
    tipo: "TRANSFERENCIA",
    situacao: "EMITIDO",
    emissao: "06/11/2026 08:46",
    plate: "DPC5A47",
    owner: "LUCAS RIBEIRO TEIXEIRA",
    origin: "CACULE/BA",
    destination: "MARACANAU/CE",
    km: 1592,
    total: 7254.9,
    liquid: 7059.02,
    toll: 0,
  },
  {
    ctrb: "MTX002217-9",
    tipo: "TRANSFERENCIA",
    situacao: "EMITIDO",
    emissao: "07/11/2026 06:24",
    plate: "FXP7B73",
    owner: "LEANDRO DA SILVA RIBEIRO",
    origin: "VARGINHA/MG",
    destination: "RONDONOPOLIS/MT",
    km: 1365,
    total: 8800,
    liquid: 8756,
    toll: 566.76,
  },
  {
    ctrb: "MTX002222-5",
    tipo: "TRANSFERENCIA",
    situacao: "EMITIDO",
    emissao: "08/11/2026 22:42",
    plate: "HAT1I88",
    owner: "CLAUDIO FERNANDES",
    origin: "VARGINHA/MG",
    destination: "ANAPOLIS/GO",
    km: 940,
    total: 5000,
    liquid: 4975,
    toll: 306,
  },
];

const clean = (value: string) =>
  String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const normalize = (value: string) =>
  clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
const numberValue = (value: string) => {
  const text = String(value || "")
    .replace(/\u00a0/g, "")
    .trim();
  if (!text) return 0;
  const normalized = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text;
  return Number(normalized.replace(/[^\d.-]/g, "")) || 0;
};

export function parseThirdPartyCsv(raw: string): ThirdPartyRow[] {
  const firstLine = raw.split(/\r?\n/, 1)[0] || "";
  const delimiter = firstLine.includes(";")
    ? ";"
    : firstLine.includes("\t")
      ? "\t"
      : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];
    const next = raw[i + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some(value => clean(value))) rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  row.push(cell);
  if (row.some(value => clean(value))) rows.push(row);
  const headerIndex = rows.findIndex(candidate => {
    const normalized = candidate.map(normalize);
    return (
      normalized.includes("CTRB") &&
      (normalized.includes("TOTAL CTRB") ||
        normalized.includes("VALOR LIQUIDO"))
    );
  });
  if (headerIndex < 0 || rows.length <= headerIndex + 1) return [];
  const headers = rows[headerIndex].map(normalize);
  const index = (name: string) => headers.indexOf(normalize(name));
  const get = (cells: string[], name: string) =>
    clean(cells[index(name)] || "");
  return rows
    .slice(headerIndex + 1)
    .map(cells => ({
      ctrb: get(cells, "CTRB"),
      tipo: get(cells, "TIPO"),
      situacao: get(cells, "SITUACAO"),
      emissao: get(cells, "DATA E HORA EMISSAO"),
      plate: get(cells, "PLACA CAVALO"),
      owner: get(cells, "PROPRIETARIO"),
      origin: get(cells, "CIDADE/UF ORIGEM"),
      destination: get(cells, "CIDADE/UF DESTINO"),
      km: numberValue(get(cells, "DISTANCIA KM")),
      total: numberValue(get(cells, "TOTAL CTRB")),
      liquid: numberValue(get(cells, "VALOR LIQUIDO")),
      toll: numberValue(get(cells, "VALE PEDAGIO")),
    }))
    .filter(item => item.ctrb || item.plate || item.total);
}
