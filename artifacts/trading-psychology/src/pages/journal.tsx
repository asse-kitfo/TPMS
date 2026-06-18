import { useState } from "react";
import { useListTrades } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2, CheckCircle2, XCircle, TrendingUp, TrendingDown, Brain,
  Filter, AlertTriangle, Zap, Activity
} from "lucide-react";
import { format } from "date-fns";

type OutcomeFilter = "ALL" | "WIN" | "LOSS" | "BREAKEVEN";
type PlanFilter = "ALL" | "FOLLOWED" | "BROKE";

function gradeColor(grade: string) {
  if (grade === "A_PLUS") return "bg-primary/20 text-primary border-primary/30";
  if (grade === "B") return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  return "bg-destructive/20 text-red-400 border-destructive/30";
}

function outcomeColor(outcome: string | null | undefined) {
  if (outcome === "WIN") return "text-green-400";
  if (outcome === "LOSS") return "text-red-400";
  if (outcome === "BREAKEVEN") return "text-amber-400";
  return "text-muted-foreground";
}

function emotionalStateColor(state: string | null | undefined) {
  if (!state) return "text-muted-foreground";
  if (state === "CALM" || state === "NEUTRAL") return "text-green-400";
  if (state === "ANXIOUS" || state === "FEARFUL") return "text-amber-400";
  if (state === "FRUSTRATED" || state === "OVERCONFIDENT") return "text-red-400";
  return "text-muted-foreground";
}

function calcRR(direction: string | null, entry: number | null, sl: number | null, tp: number | null): string {
  if (!direction || !entry || !sl || !tp) return "—";
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  if (risk === 0) return "—";
  return `1:${(reward / risk).toFixed(1)}`;
}

function interferenceTypeLabel(type: string | null | undefined): string {
  if (!type) return "";
  const map: Record<string, string> = {
    CLOSED_EARLY: "Closed early",
    MOVED_SL: "Moved stop",
    REVENGE: "Revenge trade",
    OVERSIZE: "Oversized",
  };
  return map[type] || type;
}

export default function Debrief() {
  const { data: trades, isLoading } = useListTrades();
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>("ALL");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("ALL");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  type TradeEntry = {
    id: number; sessionId: number; pair: string | null; setupGrade: string | null; direction: string | null;
    entryPrice: number | null; stopLoss: number | null; takeProfit: number | null;
    outcome: string | null; followedPlan: boolean | null; interfered: boolean | null;
    interferenceType: string | null; emotionalState: string | null; notes: string | null;
    closedAt: string | null; createdAt: string;
  };
  const typedTrades = trades as TradeEntry[] | undefined;
  const completed = typedTrades?.filter((t) => t.outcome !== null) ?? [];
  const open = typedTrades?.filter((t) => !t.outcome) ?? [];

  const filtered = completed.filter((t) => {
    if (outcomeFilter !== "ALL" && t.outcome !== outcomeFilter) return false;
    if (planFilter === "FOLLOWED" && t.followedPlan !== true) return false;
    if (planFilter === "BROKE" && t.followedPlan !== false) return false;
    return true;
  });

  const totalFollowed = completed.filter((t) => t.followedPlan).length;
  const planRate = completed.length > 0 ? Math.round((totalFollowed / completed.length) * 100) : null;
  const wins = completed.filter((t) => t.outcome === "WIN").length;
  const losses = completed.filter((t) => t.outcome === "LOSS").length;
  const winRate = completed.length > 0 ? Math.round((wins / completed.length) * 100) : null;
  const interferenceTrades = completed.filter((t) => t.interfered === true).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" /> Trade Debrief Log
          </h1>
          <p className="text-muted-foreground mt-1">Post-trade psychological records. Every entry trains your pattern recognition.</p>
        </div>
      </div>

      {completed.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-border/50">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Total Trades</p>
              <p className="text-3xl font-black font-mono">{completed.length}</p>
            </CardContent>
          </Card>
          <Card className={`border-border/50 ${winRate !== null && winRate >= 50 ? "border-green-500/20 bg-green-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Win Rate</p>
              <p className={`text-3xl font-black font-mono ${winRate !== null && winRate >= 50 ? "text-green-400" : "text-amber-400"}`}>
                {winRate !== null ? `${winRate}%` : "—"}
              </p>
            </CardContent>
          </Card>
          <Card className={`border-border/50 ${planRate !== null && planRate >= 70 ? "border-primary/20 bg-primary/5" : planRate !== null && planRate >= 50 ? "border-amber-500/20 bg-amber-500/5" : "border-destructive/20 bg-destructive/5"}`}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Rules Followed</p>
              <p className={`text-3xl font-black font-mono ${planRate !== null && planRate >= 70 ? "text-primary" : planRate !== null && planRate >= 50 ? "text-amber-400" : "text-destructive"}`}>
                {planRate !== null ? `${planRate}%` : "—"}
              </p>
            </CardContent>
          </Card>
          <Card className={`border-border/50 ${interferenceTrades > 0 ? "border-amber-500/20 bg-amber-500/5" : "border-green-500/20 bg-green-500/5"}`}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Interferences</p>
              <p className={`text-3xl font-black font-mono ${interferenceTrades > 0 ? "text-amber-400" : "text-green-400"}`}>
                {interferenceTrades}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {completed.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="flex gap-1.5 flex-wrap">
            {(["ALL", "WIN", "LOSS", "BREAKEVEN"] as OutcomeFilter[]).map((f) => (
              <button key={f} onClick={() => setOutcomeFilter(f)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  outcomeFilter === f
                    ? f === "WIN" ? "border-green-500 bg-green-500/10 text-green-400"
                    : f === "LOSS" ? "border-destructive bg-destructive/10 text-red-400"
                    : f === "BREAKEVEN" ? "border-amber-500 bg-amber-500/10 text-amber-400"
                    : "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-border/80"
                }`}>
                {f}
              </button>
            ))}
          </div>
          <div className="w-px h-5 bg-border mx-1" />
          <div className="flex gap-1.5">
            {(["ALL", "FOLLOWED", "BROKE"] as PlanFilter[]).map((f) => (
              <button key={f} onClick={() => setPlanFilter(f)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  planFilter === f
                    ? f === "FOLLOWED" ? "border-green-500 bg-green-500/10 text-green-400"
                    : f === "BROKE" ? "border-destructive bg-destructive/10 text-red-400"
                    : "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-border/80"
                }`}>
                {f === "ALL" ? "All Plans" : f === "FOLLOWED" ? "Followed Rules" : "Broke Rules"}
              </button>
            ))}
          </div>
          {(outcomeFilter !== "ALL" || planFilter !== "ALL") && (
            <button onClick={() => { setOutcomeFilter("ALL"); setPlanFilter("ALL"); }}
              className="text-xs text-muted-foreground hover:text-foreground underline">
              Clear filters
            </button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{filtered.length} trades</span>
        </div>
      )}

      {filtered.length === 0 && completed.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto opacity-20 mb-4" />
            <p>No completed trade debriefs yet.</p>
            <p className="text-sm mt-1">Complete a trade in the Active Monitor to see records here.</p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Filter className="h-8 w-8 mx-auto opacity-30 mb-3" />
            <p>No trades match the current filter.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((trade) => {
            const rr = calcRR(trade.direction, trade.entryPrice, trade.stopLoss, trade.takeProfit);
            const isExpanded = expandedId === trade.id;
            return (
              <Card key={trade.id} className={`border transition-all ${
                trade.interfered ? "border-amber-500/20 bg-amber-500/5" :
                trade.followedPlan === false ? "border-destructive/20 bg-destructive/5" :
                trade.followedPlan === true ? "border-border" : "border-border"
              }`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
                      <span className="font-mono font-black text-lg">{(trade.pair ?? "—").toUpperCase()}</span>

                      {trade.direction === "LONG" ? (
                        <span className="flex items-center gap-1 text-green-400 text-sm font-bold"><TrendingUp className="h-3 w-3" />LONG</span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400 text-sm font-bold"><TrendingDown className="h-3 w-3" />SHORT</span>
                      )}

                      <Badge variant="outline" className={`text-xs ${gradeColor(trade.setupGrade ?? "")}`}>
                        {trade.setupGrade === "A_PLUS" ? "A+" : trade.setupGrade}
                      </Badge>

                      <span className={`font-bold font-mono ${outcomeColor(trade.outcome)}`}>
                        {trade.outcome}
                      </span>

                      {rr !== "—" && (
                        <span className="text-xs font-mono text-muted-foreground border border-border/50 rounded px-1.5 py-0.5">
                          R:R {rr}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {trade.followedPlan === true && !trade.interfered && (
                        <div className="flex items-center gap-1 text-green-400 text-xs font-medium">
                          <CheckCircle2 className="h-4 w-4" /> Followed rules
                        </div>
                      )}
                      {trade.followedPlan === false && (
                        <div className="flex items-center gap-1 text-red-400 text-xs font-medium">
                          <XCircle className="h-4 w-4" /> Broke rules
                        </div>
                      )}
                      {trade.interfered === true && (
                        <div className="flex items-center gap-1 text-amber-400 text-xs font-medium">
                          <Zap className="h-3 w-3" />
                          {interferenceTypeLabel(trade.interferenceType)}
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground font-mono">
                        {format(new Date(trade.createdAt), "MMM d, HH:mm")}
                      </span>
                      <button onClick={() => setExpandedId(isExpanded ? null : trade.id)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        {isExpanded ? "▲" : "▼"}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border/50 space-y-3 animate-in fade-in duration-200">
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="p-2 rounded-lg bg-secondary/30">
                          <p className="text-xs text-muted-foreground mb-1">Entry</p>
                          <p className="font-mono text-sm font-bold">{trade.entryPrice ?? "—"}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-destructive/10">
                          <p className="text-xs text-muted-foreground mb-1">Stop</p>
                          <p className="font-mono text-sm font-bold text-red-400">{trade.stopLoss ?? "—"}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <p className="text-xs text-muted-foreground mb-1">Target</p>
                          <p className="font-mono text-sm font-bold text-green-400">{trade.takeProfit ?? "—"}</p>
                        </div>
                      </div>

                      {trade.emotionalState && (
                        <div className="flex items-center gap-2">
                          <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Emotional state at close:</p>
                          <span className={`text-xs font-semibold ${emotionalStateColor(trade.emotionalState)}`}>
                            {trade.emotionalState.charAt(0) + trade.emotionalState.slice(1).toLowerCase()}
                          </span>
                        </div>
                      )}

                      {trade.closedAt && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Duration:</span>
                          <span className="text-xs font-mono">
                            {(() => {
                              const diff = Math.floor((new Date(trade.closedAt).getTime() - new Date(trade.createdAt).getTime()) / 1000);
                              const h = Math.floor(diff / 3600);
                              const m = Math.floor((diff % 3600) / 60);
                              if (h > 0) return `${h}h ${m}m`;
                              return `${m}m`;
                            })()}
                          </span>
                        </div>
                      )}

                      {trade.notes && (
                        <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                          <p className="text-sm text-muted-foreground italic leading-relaxed">"{trade.notes}"</p>
                        </div>
                      )}

                      {trade.followedPlan === false && !trade.notes && (
                        <div className="flex gap-2 items-center">
                          <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                          <p className="text-xs text-destructive/70">No lesson recorded for this rule break.</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {open.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Open / Unresolved</p>
          <div className="space-y-2">
            {open.map((trade) => (
              <div key={trade.id} className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-border/50 text-muted-foreground text-sm">
                <span className="font-mono font-bold text-foreground">{(trade.pair ?? "—").toUpperCase()}</span>
                <span>{trade.direction}</span>
                <Badge variant="outline" className="text-xs border-border/50">OPEN</Badge>
                <span className="ml-auto font-mono text-xs">{format(new Date(trade.createdAt), "MMM d, HH:mm")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
