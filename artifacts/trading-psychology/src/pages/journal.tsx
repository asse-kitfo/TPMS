import { useListTrades } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, TrendingUp, TrendingDown, Brain } from "lucide-react";
import { format } from "date-fns";

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

export default function Debrief() {
  const { data: trades, isLoading } = useListTrades();

  if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const completed = trades?.filter((t) => t.outcome !== null) ?? [];
  const totalFollowed = completed.filter((t) => t.followedPlan).length;
  const planRate = completed.length > 0 ? Math.round((totalFollowed / completed.length) * 100) : null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" /> Trade Debrief Log
          </h1>
          <p className="text-muted-foreground mt-1">Post-trade psychological records. Not performance metrics.</p>
        </div>
        {planRate !== null && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Rules Followed</p>
            <p className={`text-3xl font-black font-mono ${planRate >= 70 ? "text-primary" : planRate >= 50 ? "text-amber-400" : "text-destructive"}`}>{planRate}%</p>
          </div>
        )}
      </div>

      {completed.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto opacity-20 mb-4" />
            <p>No completed trade debriefs yet.</p>
            <p className="text-sm mt-1">Complete a trade in the Active Monitor to see records here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {completed.map((trade) => (
            <Card key={trade.id} className={`border ${trade.followedPlan ? "border-border" : "border-destructive/20 bg-destructive/5"}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 flex-wrap">
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
                      {trade.outcome ?? "OPEN"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {trade.followedPlan === true && (
                      <div className="flex items-center gap-1 text-green-400 text-xs font-medium">
                        <CheckCircle2 className="h-4 w-4" /> Followed rules
                      </div>
                    )}
                    {trade.followedPlan === false && (
                      <div className="flex items-center gap-1 text-red-400 text-xs font-medium">
                        <XCircle className="h-4 w-4" /> Broke rules
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground font-mono">
                      {format(new Date(trade.createdAt), "MMM d, HH:mm")}
                    </span>
                  </div>
                </div>

                {trade.notes && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-sm text-muted-foreground italic">"{trade.notes}"</p>
                  </div>
                )}

                {trade.followedPlan === false && !trade.notes && (
                  <div className="mt-3 pt-3 border-t border-destructive/20">
                    <p className="text-xs text-destructive/70">No psychological note recorded for this interference.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {trades && trades.filter((t) => !t.outcome).length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Open / Unresolved</p>
          <div className="space-y-2">
            {trades.filter((t) => !t.outcome).map((trade) => (
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
