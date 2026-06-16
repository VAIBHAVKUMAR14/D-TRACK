import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, Network, Trophy, FlaskConical, 
  Search, UserX, PlusCircle, X, Cpu, Crosshair
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Overview",          href: "/dashboard",    icon: LayoutDashboard },
  { title: "Live Investigate",  href: "/investigate",  icon: Crosshair, badge: "LIVE" },
  { title: "Shadow Graph",      href: "/graph",        icon: Network },
  { title: "Identity Reveal",   href: "/identity",     icon: Search, badge: "KEY" },
  { title: "Risk Leaderboard",  href: "/leaderboard",  icon: Trophy },
  { title: "NLP Inspector",     href: "/nlp",          icon: FlaskConical },
  { title: "Burner Leads",      href: "/burner",       icon: UserX },
  { title: "Tech Pipeline",     href: "/pipeline",     icon: Cpu },
  { title: "Add Profile",       href: "/add",          icon: PlusCircle },
];

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const location = useLocation();

  return (
    <aside className="w-64 flex flex-col h-full border-r"
      style={{
        background: 'hsl(222 47% 4%)',
        borderColor: 'hsla(245, 58%, 64%, 0.08)',
      }}
    >
      {/* Brand Header */}
      <div className="p-6 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight gradient-text">
            D-TRACK
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] mt-0.5"
            style={{ color: 'hsl(215 20% 45%)' }}>
            OSINT Intelligence
          </p>
        </div>
        <div className="w-2 h-2 rounded-full animate-pulse" 
          style={{ background: '#4ade80', boxShadow: '0 0 8px rgba(74,222,128,0.5)' }} 
        />
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}
            className="lg:hidden p-1">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Separator */}
      <div className="mx-4 mb-3" style={{ height: '1px', background: 'linear-gradient(to right, transparent, hsla(245, 58%, 64%, 0.2), transparent)' }} />

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 relative z-10 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <NavLink key={item.href} to={item.href}>
              <div
                className={cn(
                  "flex items-center text-[13px] font-medium rounded-lg cursor-pointer transition-all duration-200",
                  isActive
                    ? "nav-active px-3 py-2.5"
                    : "px-3 py-2.5 hover:bg-white/[0.04]"
                )}
                style={!isActive ? { color: 'hsl(215 20% 55%)' } : undefined}
              >
                <Icon className={cn("mr-3 w-4 h-4", isActive && "text-purple-400")} />
                {item.title}
                {(item as any).badge && (
                  <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'hsla(262, 83%, 65%, 0.2)', color: 'hsl(262 83% 75%)' }}>
                    {(item as any).badge}
                  </span>
                )}
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t" style={{ borderColor: 'hsla(217, 33%, 15%, 0.5)' }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#4ade80' }} />
          <p className="text-[11px]" style={{ color: 'hsl(215 20% 40%)' }}>
            D-TRACK v2.0 • Pipeline Active
          </p>
        </div>
      </div>
    </aside>
  );
}
