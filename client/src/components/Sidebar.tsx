import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Truck } from "lucide-react";

const STORAGE_KEY = "rotaclara-sidebar-collapsed";

const items = [
  ["/faturamento", "▥", "Faturamento"],
  ["/frota", "▣", "Operações com frota"],
  ["/agregados", "▦", "Agregados"],
  ["/dre-frota", "◫", "DRE Frota"],
  ["/terceiros", "◫", "Terceiros"],
] as const;

const supportItems = [
  ["/importacao", "↥", "Importar arquivos"],
  ["/cadastros", "⚙", "Cadastros"],
] as const;

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      // O menu continua funcionando mesmo sem persistência local.
    }
  }, [collapsed]);

  const currentPath = window.location.pathname || "/";
  const navigate = (path: string) => {
    window.location.href = path;
  };

  return (
    <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : ""}`}>
      <div className="brand-lockup">
        <div className="brand-mark"><Truck size={19} /></div>
        <div className="sidebar-brand-copy">
          <div className="brand-name">Rota<span>Clara</span></div>
          <div className="brand-subtitle">gestão de fretes</div>
        </div>
      </div>
      <button
        className="sidebar-collapse-button"
        onClick={() => setCollapsed((value) => !value)}
        aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
        title={collapsed ? "Expandir menu" : "Recolher menu"}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
      <nav className="sidebar-nav sidebar-nav-compact">
        <div className="sidebar-nav-section">VISUALIZAÇÃO</div>
        {items.map(([path, icon, label]) => (
          <button className={`nav-item ${currentPath === path ? "active" : ""}`} key={path} onClick={() => navigate(path)} title={collapsed ? label : undefined}>
            <span className="nav-text-icon">{icon}</span><span className="nav-label">{label}</span>{currentPath === path && <span className="nav-pip" />}
          </button>
        ))}
        <div className="sidebar-nav-section support-section">SUPORTE</div>
        {supportItems.map(([path, icon, label]) => (
          <button className={`nav-item ${currentPath === path ? "active" : ""}`} key={path} onClick={() => navigate(path)} title={collapsed ? label : undefined}>
            <span className="nav-text-icon">{icon}</span><span className="nav-label">{label}</span>{currentPath === path && <span className="nav-pip" />}
          </button>
        ))}
      </nav>
    </aside>
  );
}
