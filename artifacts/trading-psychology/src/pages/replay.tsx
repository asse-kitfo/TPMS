import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@workspace/api-zod";
import { History, ShieldCheck, TrendingUp, TrendingDown, AlertTriangle, Clock, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ReplayEvent {
  type: "CHECK" | "TRADE";
  timestamp: string;
  data: Record<string, unknown>;
}

interface ReplayData {
  session: {
    id: number;
    date: string;
    emotionalState: string;
    lossCount: number;
    tradeCount: number;
    createdAt: string;
    endedAt: string | null;
  };
  events: ReplayEvent[];
}

function verdictColor(v: string) {
  if (v === "TRADE") return "text-green-400 border-green-500/30 bg-green-500/10";
  if (v === "REDUCE_RISK") return "text-amber-400 border-amber-500/30 bg-amber-500/10";
  if (v === "NO_TRADE") return "text-orange-400 border-orange-500/30 bg-orange-500/10";
  return "text-red-400 border-red-500/30 bg-red-500/10";
}

function outcomeColor(o: string | null) {
  if (o === "WIN") return "text-green-400";
  if (o === "LOSS") return "text-red-400";
  return "text-muted-foreground";
}

function CheckEvent({ data }: { data: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const verdict = data.verdict as string;
  const confidenceScore = data.confidenceScore as number | undefined;
  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-accent/30 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{data.pair as string} — Pre-Trade Check</span>
            <span className={cn("text-xs px-2 py-0.5 rounded-full border font-mono font-bold", verdictColor(verdict))}>
              {verdict.replace("_", " ")}
            </span>
            {confidenceScore !== undefined && (
              <span className="text-xs text-muted-foreground font-mono">{confidenceScore}% confidence</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Setup: {(data.setupGrade as string).replace("_PLUS", "+")} · Focus {data.focusLevel as number}/10 · Urge {data.urgeLevel as number}/10
          </p>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-2 animate-in fade-in duration-150">
          {data.verdictReason && (
            <p className="text-xs leading-relaxed text-muted-foreground italic">"{data.verdictReason as string}"</p>
          )}
          <div className="grid grid-cols-3 gap-3 pt-1">
            {[
              { label: "Psych State", val: (data.psychState as string).charAt(0) + (data.psychState as string).slice(1).toLowerCase() },
              { label: "Focus", val: `${data.focusLevel as number}/10` },
              { label: "Clarity", val: `${data.decisionClarity as number}/10` },
            ].map(({ label, val }) => (
              <div key={label} className="text-center p-2 rounded-lg bg-secondary/40">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{label}</p>
                <p className="text-sm font-bold font-mono mt-0.5">{val}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TradeEvent({ data }: { data: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const outcome = data.outcome as string | null;
  const interfered = data.interfered as boolean | null;
  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-accent/30 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className={cn(
          "h-8 w-8 rounded-full border flex items-center justify-center flex-shrink-0",
          outcome === "WIN" ? "bg-green-500/10 border-green-500/30" : outcome === "LOSS" ? "bg-red-500/10 border-red-500/30" : "bg-secondary border-border/50"
        )}>
          {outcome === "WIN" ? <TrendingUp className="h-4 w-4 text-green-400" /> :
           outcome === "LOSS" ? <TrendingDown className="h-4 w-4 text-red-400" /> :
           <Clock className="h-4 w-4 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{data.pair as string} — Trade</span>
            {outcome ? (
              <span className={cn("text-xs font-bold font-mono", outcomeColor(outcome))}>{outcome}</span>
            ) : (
              <span className="text-xs text-muted-foreground font-mono">OPEN</span>
            )}
            {interfered && (
              <span className="text-xs px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Interfered
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {(data.setupGrade as string).replace("_PLUS", "+")} setup
            {data.riskRewardRatio ? ` · RR ${data.riskRewardRatio}` : ""}
            {data.pnl != null ? ` · ${Number(data.pnl) > 0 ? "+" : ""}${data.pnl}` : ""}
          </p>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-2 animate-in fade-in duration-150">
          {data.postTradeNotes && (
            <p className="text-xs leading-relaxed text-muted-foreground italic">"{data.postTradeNotes as string}"</p>
          )}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {[
              { label: "Followed Plan", val: data.followedPlan === true ? "Yes" : data.followedPlan === false ? "No" : "—" },
              { label: "Interference", val: data.interfered === true ? (data.interferenceType as string || "Yes") : "None" },
            ].map(({ label, val }) => (
              <div key={label} className="text-center p-2 rounded-lg bg-secondary/40">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{label}</p>
                <p className="text-sm font-bold font-mono mt-0.5">{val}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SessionReplay() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => apiClient.listSessions().then((r) => r.data),
  });

  const { data: replay, isLoading: replayLoading } = useQuery<ReplayData>({
    queryKey: ["session-replay", selectedId],
    queryFn: async () => {
      const r = await fetch(`/api/stats/session-replay?sessionId=${selectedId}`);
      if (!r.ok) throw new Error("Failed to fetch replay");
      return r.json();
    },
    enabled: selectedId !== null,
  });

  const checkCount = replay?.events.filter((e) => e.type === "CHECK").length ?? 0;
  const tradeCount = replay?.events.filter((e) => e.type === "TRADE").length ?? 0;
  const hardBlocks = replay?.events.filter(
    (e) => e.type === "CHECK" && (e.data.verdict as string) === "HARD_BLOCK"
  ).length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <History className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Session Replay</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Full session timeline — every gate check and trade in sequence. Use this to spot decision patterns you can't see in the moment.
        </p>
      </div>

      {/* Session Selector */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-widest">Select Session</p>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No sessions recorded yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {[...sessions].reverse().slice(0, 20).map((s: { id: number; date: string; lossCount: number; tradeCount: number }) => (
              <Button
                key={s.id}
                variant={selectedId === s.id ? "default" : "outline"}
                size="sm"
                className="h-9 font-mono text-xs"
                onClick={() => setSelectedId(s.id)}
              >
                {s.date} · {s.tradeCount}T / {s.lossCount}L
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Replay Timeline */}
      {selectedId && (
        <div className="space-y-4">
          {replayLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <span className="text-sm">Loading session timeline...</span>
            </div>
          ) : replay ? (
            <>
              {/* Session Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Session Date", val: replay.session.date },
                  { label: "Gate Checks", val: checkCount },
                  { label: "Trades", val: tradeCount },
                  { label: "Hard Blocks", val: hardBlocks, danger: hardBlocks > 0 },
                ].map(({ label, val, danger }) => (
                  <div key={label} className={cn(
                    "p-4 rounded-xl border text-center",
                    danger ? "border-red-500/30 bg-red-500/5" : "border-border/60 bg-card"
                  )}>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
                    <p className={cn("text-2xl font-black font-mono", danger ? "text-red-400" : "text-foreground")}>{val}</p>
                  </div>
                ))}
              </div>

              {/* Timeline */}
              {replay.events.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-8">No events in this session.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">Timeline</p>
                  {replay.events.map((event, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          "h-2 w-2 rounded-full mt-5 flex-shrink-0",
                          event.type === "CHECK" ? "bg-primary" : "bg-blue-400"
                        )} />
                        {idx < replay.events.length - 1 && (
                          <div className="w-px flex-1 bg-border/50 min-h-4 mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-2">
                        <p className="text-[10px] text-muted-foreground font-mono mb-1.5">
                          {format(new Date(event.timestamp), "HH:mm:ss")}
                        </p>
                        {event.type === "CHECK" ? (
                          <CheckEvent data={event.data} />
                        ) : (
                          <TradeEvent data={event.data} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {!selectedId && sessions.length > 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Select a session above to replay its timeline</p>
        </div>
      )}
    </div>
  );
}
