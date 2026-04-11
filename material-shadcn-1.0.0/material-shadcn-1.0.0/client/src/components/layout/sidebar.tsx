import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, Network, Trophy, FlaskConical, 
  Search, UserX, PlusCircle, X
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Overview",          href: "/",             icon: LayoutDashboard },
  { title: "Shadow Graph",      href: "/graph",        icon: Network },
  { title: "Risk Leaderboard",  href: "/leaderboard",  icon: Trophy },
  { title: "NLP Inspector",     href: "/nlp",          icon: FlaskConical },
  { title: "Identity Dive",     href: "/identity",     icon: Search },
  { title: "Burner Leads",      href: "/burner",       icon: UserX },
  { title: "Add Profile",       href: "/add",          icon: PlusCircle },
];

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const location = useLocation();

  return (
    <aside className="w-60 bg-white lg:bg-transparent flex flex-col relative z-10 h-full border-r border-stone-200 lg:border-0">
      {/* Brand Header */}
      <div className="p-6 pb-0 relative z-10 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-stone-900 tracking-wider">
          D-TRACK
        </h1>
        {/* Close button for mobile */}
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="lg:hidden p-1 text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>
      <p className="px-6 pt-1 text-xs text-stone-400 tracking-wide">OSINT Intelligence Platform</p>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 relative z-10">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <NavLink key={item.href} to={item.href}>
              <div
                className={cn(
                  "flex items-center text-sm font-normal rounded-lg cursor-pointer",
                  isActive
                    ? "px-3 py-2 shadow-sm hover:shadow-md bg-stone-800 hover:bg-stone-700 relative bg-gradient-to-b from-stone-700 to-stone-800 border border-stone-900 text-stone-50 hover:bg-gradient-to-b hover:from-stone-800 hover:to-stone-800 hover:border-stone-900 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.25),inset_0_-2px_0px_rgba(0,0,0,0.35)] after:pointer-events-none duration-300 ease-in align-middle select-none font-sans text-center antialiased"
                    : "px-3 py-2 text-stone-700 hover:bg-stone-100 transition-colors duration-200 border border-transparent"
                )}
              >
                <Icon className="mr-3 w-4 h-4" />
                {item.title}
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* Version footer */}
      <div className="p-4 border-t border-stone-200">
        <p className="text-xs text-stone-400 text-center">D-TRACK v2.0 • MVP</p>
      </div>
    </aside>
  );
}
