import { useEffect, useRef, useState } from "react";
import { Bell, Check, X } from "lucide-react";

type NotificationItem = { id: string; title: string; message: string; time: string; read: boolean };

const STORAGE_KEY = "rotaclara-notifications";
const defaultNotifications: NotificationItem[] = [
  { id: "welcome", title: "Central de notificações ativa", message: "Você receberá aqui os avisos importantes da operação.", time: "agora", read: false },
];

const loadNotifications = (): NotificationItem[] => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return Array.isArray(saved) && saved.length ? saved : defaultNotifications;
  } catch {
    return defaultNotifications;
  }
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(loadNotifications);
  const ref = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((item) => !item.read).length;

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications)); } catch { /* funciona mesmo sem persistência */ }
  }, [notifications]);

  useEffect(() => {
    const close = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const markAllRead = () => setNotifications((items) => items.map((item) => ({ ...item, read: true })));
  const clearAll = () => setNotifications([]);

  return <div className="notification-wrap" ref={ref}>
    <button className="topbar-notification" onClick={() => setOpen((value) => !value)} aria-label="Abrir notificações" title="Notificações">
      <Bell size={17} />{unread > 0 && <span className="notification-badge">{unread > 9 ? "9+" : unread}</span>}
    </button>
    {open && <div className="notification-popover" role="dialog" aria-label="Central de notificações">
      <div className="notification-heading"><div><strong>Notificações</strong><span>{unread ? `${unread} não lida(s)` : "Tudo lido"}</span></div><button onClick={() => setOpen(false)} aria-label="Fechar notificações"><X size={15} /></button></div>
      <div className="notification-list">{notifications.length ? notifications.map((item) => <div className={`notification-item ${item.read ? "read" : ""}`} key={item.id}><span className="notification-dot" /><div><strong>{item.title}</strong><p>{item.message}</p><small>{item.time}</small></div></div>) : <div className="notification-empty"><Bell size={19} /><span>Nenhuma notificação no momento.</span></div>}</div>
      <div className="notification-actions">{unread > 0 && <button onClick={markAllRead}><Check size={14} /> Marcar como lidas</button>}{notifications.length > 0 && <button onClick={clearAll}>Limpar</button>}</div>
    </div>}
  </div>;
}
