import { Link, useLocation } from "wouter";
import { 
  Activity, 
  BarChart2, 
  CheckSquare, 
  LayoutDashboard, 
  List, 
  Settings,
  Terminal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Command Center", icon: LayoutDashboard },
    { href: "/check", label: "Pre-Trade Check", icon: CheckSquare },
    { href: "/execution", label: "Execution Mode", icon: Activity },
    { href: "/journal", label: "Trade Journal", icon: List },
    { href: "/analytics", label: "Analytics", icon: BarChart2 },
  ];

  return (
    <div className="flex h-screen w-full bg-background text-foreground dark overflow-hidden selection:bg-primary/30">
      <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex">
        <div className="p-6">
          <div className="flex items-center gap-2 text-primary">
            <Terminal className="h-6 w-6" />
            <h1 className="font-bold tracking-tight text-lg text-foreground">APEX<span className="text-primary">TERM</span></h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">Behavior Control</p>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer group",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "group-hover:text-foreground")} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
          <div className="bg-secondary/50 rounded-lg p-4 border border-border/50">
            <p className="text-xs text-muted-foreground mb-2">SYSTEM STATUS</p>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-mono">ONLINE</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-background">
        <header className="h-14 border-b border-border flex items-center px-6 md:hidden">
           <div className="flex items-center gap-2 text-primary">
            <Terminal className="h-5 w-5" />
            <span className="font-bold tracking-tight text-foreground">APEX<span className="text-primary">TERM</span></span>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
