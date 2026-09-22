import { useContext, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Icon from "../components/ui/Icon";
import IconButton from "../components/ui/IconButton";
import Badge from "../components/ui/Badge";
import Avatar from "../components/Avatar";
import Drawer from "../components/ui/Drawer";
import Dropdown, { MenuItem } from "../components/ui/Dropdown";
import { getRoleLabel } from "../utils/permissions";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { to: "./", label: "Dashboard", icon: "dashboard", end: true },
      { to: "./monitoring", label: "Monitoring SIM", icon: "monitoring" },
    ],
  },
  {
    label: "Messaging",
    items: [
      { to: "./broadcast", label: "Broadcast", icon: "send" },
      { to: "./scheduled", label: "Jadwal Pesan", icon: "calendar-clock" },
    ],
  },
  {
    label: "SIM Management",
    items: [
      { to: "./simc", label: "SIM C", icon: "id-card" },
      { to: "./sima", label: "SIM A", icon: "car" },
    ],
  },
  {
    label: "Sistem",
    items: [{ to: "./holidays", label: "Tanggal Merah", icon: "calendar-days" }],
  },
  {
    label: "Pengguna",
    items: [{ to: "./profile", label: "Profil", icon: "user" }],
  },
];

const ROUTE_TITLES = {
  "/": { title: "Dashboard", desc: "Ringkasan operasional WhatsApp Gateway" },
  "/monitoring": { title: "Monitoring SIM", desc: "Pantau masa berlaku SIM seluruh karyawan" },
  "/broadcast": { title: "Broadcast", desc: "Kirim pesan ke banyak karyawan sekaligus" },
  "/scheduled": { title: "Jadwal Pesan", desc: "Kelola pesan otomatis berdasarkan jadwal" },
  "/simc": { title: "SIM C", desc: "Pengingat perpanjangan SIM C karyawan" },
  "/sima": { title: "SIM A", desc: "Pengingat perpanjangan SIM A karyawan" },
  "/holidays": { title: "Tanggal Merah", desc: "Kelola hari libur untuk penjadwalan pesan" },
  "/profile": { title: "Profil", desc: "Informasi akun Anda" },
};

const ROLE_BADGE_VARIANT = { admin: "brand", operator: "info", viewer: "neutral" };

function SidebarContent({ collapsed, onNavigate }) {
  return (
    <nav className="flex h-full flex-col" aria-label="Navigasi utama">
      {/* Brand */}
      <div className={`flex items-center gap-2.5 px-4 py-5 ${collapsed ? "justify-center px-2" : ""}`}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
          <Icon name="send" size={18} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-[15px] font-bold leading-tight text-txt">WAG</div>
            <div className="text-[11px] text-txt-muted">WhatsApp Gateway</div>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-5">
            {!collapsed && (
              <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-txt-placeholder">
                {section.label}
              </div>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors duration-150 ${
                        collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2"
                      } ${
                        isActive
                          ? "bg-brand-soft text-brand"
                          : "text-txt-secondary hover:bg-surface-muted hover:text-txt"
                      }`
                    }
                  >
                    <Icon name={item.icon} size={18} className="shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className={`border-t border-surface-divider px-3 py-3 ${collapsed ? "text-center" : ""}`}>
        <p className="text-[11px] text-txt-placeholder">{collapsed ? "v1" : "WAG v1.0 — Enterprise"}</p>
      </div>
    </nav>
  );
}

export default function AppShell() {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const user = auth?.user;
  const pageMeta = Object.entries(ROUTE_TITLES).find(([route]) => location.pathname.endsWith(route))?.[1] || { title: "WAG", desc: "" };
  const roleVariant = ROLE_BADGE_VARIANT[user?.role] || "neutral";

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Sidebar desktop */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 border-r border-surface-border bg-surface-card transition-[width] duration-200 lg:block ${
          collapsed ? "w-[76px]" : "w-[256px]"
        }`}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      {/* Drawer mobile */}
      <Drawer open={mobileOpen} onClose={closeMobile} title="WAG — WhatsApp Gateway">
        <SidebarContent collapsed={false} onNavigate={closeMobile} />
      </Drawer>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-surface-divider bg-surface-card/90 backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <IconButton icon="menu" label="Buka menu navigasi" variant="ghost" className="lg:hidden" onClick={() => setMobileOpen(true)} />
            <IconButton
              icon={collapsed ? "chevron-right" : "chevron-left"}
              label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
              variant="ghost"
              className="hidden lg:inline-flex"
              onClick={() => setCollapsed((v) => !v)}
            />
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-bold text-txt">{pageMeta.title}</h1>
              <p className="hidden truncate text-xs text-txt-muted sm:block">{pageMeta.desc}</p>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <Badge variant={roleVariant} className="hidden sm:inline-flex">
                {getRoleLabel(user?.role)}
              </Badge>
              <Dropdown
                align="right"
                label="Menu pengguna"
                trigger={({ onClick, ariaExpanded, ariaLabel }) => (
                  <button
                    type="button"
                    onClick={onClick}
                    aria-expanded={ariaExpanded}
                    aria-label={ariaLabel}
                    className="flex items-center gap-2.5 rounded-full p-1 pr-1 transition-colors duration-150 hover:bg-surface-muted sm:pr-3"
                  >
                    <Avatar name={user?.nama} size={32} />
                    <span className="hidden max-w-[140px] text-left sm:block">
                      <span className="block truncate text-[13px] font-semibold leading-tight text-txt">{user?.nama || "—"}</span>
                      <span className="block truncate text-[11px] leading-tight text-txt-muted">NIP {user?.nip || "—"}</span>
                    </span>
                    <Icon name="chevron-down" size={14} className="hidden text-txt-muted sm:block" />
                  </button>
                )}
              >
                {({ close }) => (
                  <>
                    <MenuItem icon={<Icon name="user" size={16} />} onClick={() => navigate("./profile")} close={close}>
                      Profil Saya
                    </MenuItem>
                    <div className="my-1 h-px bg-surface-divider" />
                    <MenuItem
                      icon={<Icon name="logout" size={16} />}
                      danger
                      close={close}
                      onClick={() => {
                        auth?.logout();
                      }}
                    >
                      Keluar
                    </MenuItem>
                  </>
                )}
              </Dropdown>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
