import { Link, useLocation } from "wouter";
import {
  Brain,
  BarChart2,
  ShieldCheck,
  Crosshair,
  BookOpen,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Psychology Hub", icon: Brain, sub: "Readiness & control" },
    { href: "/check", label: "Trade Gate", icon: ShieldCheck, sub: "Pre-trade check" },
    { href: "/execution", label: "Active Monitor", icon: Crosshair, sub: "In-trade control" },
    { href: "/journal", label: "Debrief Log", icon: BookOpen, sub: "Post-trade records" },
    { href: "/analytics", label: "My Patterns", icon: BarChart2, sub: "Behavioral insights" },
  ];

  return (
    <div className="flex h-screen w-full bg-background text-foreground dark overflow-hidden selection:bg-primary/30">
      <aside className="w-60 border-r border-border bg-card flex flex-col hidden md:flex">
        <div className="p-5 border-b border-border/50">
          <div className="flex items-center gap-2 text-primary">
            <Terminal className="h-5 w-5" />
            <h1 className="font-bold tracking-tight text-base text-foreground">
              APEX<span className="text-primary">TERM</span>
            </h1>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-widest">Psychology Engine</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer group",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-primary" : "group-hover:text-foreground")} />
                  <div className="min-w-0">
                    <p className="truncate">{item.label}</p>
                    {!isActive && <p className="text-[10px] text-muted-foreground/60 truncate">{item.sub}</p>}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/50">
          <div className="bg-secondary/50 rounded-lg p-3 border border-border/50">
            <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-widest">System Status</p>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-mono">ONLINE</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-background">
        <header className="h-13 border-b border-border flex items-center px-6 md:hidden">
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
