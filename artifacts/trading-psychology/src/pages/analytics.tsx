import { useQuery } from "@tanstack/react-query";
import {
  useGetGradeBreakdown,
  useGetBehavioralPatterns,
  useGetDisciplineStreak
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart2, AlertTriangle, ShieldCheck, Brain, TrendingUp, Zap } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

type EmotionBreakdown = {
  byState: Array<{ state: string; label: string; checkCount: number; tradeCount: number; winRate: number; interferenceRate: number }>;
  interferenceBreakdown: Array<{ type: string; label: string; count: number }>;
};

const PSYCH_STATE_COLORS: Record<string, string> = {
  CALM: "hsl(142, 76%, 36%)",
  FOCUSED: "hsl(221, 83%, 53%)",
  URGE: "hsl(38, 92%, 50%)",
  PRESSURE: "hsl(25, 95%, 53%)",
  FEAR: "hsl(0, 84%, 60%)",
  OVERCONFIDENT: "hsl(271, 91%, 65%)",
};

const PSYCH_STATE_LABELS: Record<string, string> = {
  CALM: "Calm",
  FOCUSED: "Focused",
  URGE: "Urge",
  PRESSURE: "Pressure",
  FEAR: "Fear",
  OVERCONFIDENT: "Overconfident",
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; fill?: string; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-sm">
      <p className="font-semibold mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.fill || p.color }}>
          {p.name}: {p.value}{typeof p.value === "number" && p.name.toLowerCase().includes("rate") ? "%" : p.name === "Win Rate %" ? "%" : ""}
        </p>
      ))}
    </div>
  );
}

export default function BehavioralAnalytics() {
  const { data: breakdown, isLoading: isBreakdownLoading } = useGetGradeBreakdown();
  const { data: patterns, isLoading: isPatternsLoading } = useGetBehavioralPatterns();
  const { data: streak, isLoading: isStreakLoading } = useGetDisciplineStreak();
  const { data: emotionData, isLoading: isEmotionLoading } = useQuery<EmotionBreakdown>({
    queryKey: ["/api/stats/emotion-breakdown"],
    queryFn: async () => {
      const res = await fetch("/api/stats/emotion-breakdown");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const isLoading = isBreakdownLoading || isPatternsLoading || isStreakLoading || isEmotionLoading;

  if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const gradeChartData = breakdown?.map((b: { grade: string; winRate: number; planFollowRate: number; count: number }) => ({
    name: b.grade === "A_PLUS" ? "A+" : b.grade,
    "Win Rate %": Number((b.winRate * 100).toFixed(1)),
    "Plan Follow %": Number((b.planFollowRate * 100).toFixed(1)),
    count: b.count,
    grade: b.grade,
  })) || [];

  const emotionChartData = (emotionData?.byState || []).map(e => ({
    name: PSYCH_STATE_LABELS[e.state] || e.state,
    state: e.state,
    "Win Rate %": e.winRate,
    "Interference %": e.interferenceRate,
    checks: e.checkCount,
    trades: e.tradeCount,
  }));

  const radarData = emotionChartData.map(e => ({
    subject: e.name,
    winRate: e["Win Rate %"],
  }));

  const interferenceData = emotionData?.interferenceBreakdown || [];

  const highPatterns = patterns?.filter((p: { severity: string }) => p.severity === "HIGH") || [];
  const medPatterns = patterns?.filter((p: { severity: string }) => p.severity === "MEDIUM") || [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <BarChart2 className="h-8 w-8 text-primary" /> Behavioral Analytics
        </h1>
        <p className="text-muted-foreground">Your psychological patterns — data that reveals where the cortex and amygdala compete.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6 text-center space-y-2">
            <ShieldCheck className="h-10 w-10 text-primary mx-auto mb-2" />
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-widest">Current Streak</h3>
            <p className="text-5xl font-mono font-bold text-primary">{streak?.currentStreak || 0}</p>
            <p className="text-sm text-muted-foreground">consecutive trades following plan</p>
            <p className="text-xs text-muted-foreground">Best: {streak?.bestStreak || 0} · Total: {streak?.totalFollowed || 0}/{streak?.totalTrades || 0}</p>
          </CardContent>
        </Card>

        {highPatterns.length > 0 && (
          <Card className="md:col-span-2 border-destructive/30 bg-destructive/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-5 w-5 text-destructive" />
                <p className="font-semibold text-destructive text-sm uppercase tracking-widest">High-Severity Patterns Active</p>
              </div>
              <div className="space-y-2">
                {highPatterns.map((p: { label: string; insight: string }, i: number) => (
                  <div key={i} className="flex gap-3 items-start">
                    <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold">{p.label}</p>
                      <p className="text-xs text-muted-foreground">{p.insight}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {highPatterns.length === 0 && (
          <Card className="md:col-span-2 border-green-500/20 bg-green-500/5">
            <CardContent className="p-6 flex items-center gap-4">
              <ShieldCheck className="h-10 w-10 text-green-400 flex-shrink-0" />
              <div>
                <p className="font-bold text-green-400">No high-severity patterns detected</p>
                <p className="text-sm text-muted-foreground mt-1">Your behavioral data shows no critical emotional hijacking patterns. Continue building consistency.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Edge Realization by Setup Grade</CardTitle>
            <CardDescription>Win rate and plan-follow rate across A+, B, and C setups. Your edge only exists at A+.</CardDescription>
          </CardHeader>
          <CardContent>
            {gradeChartData.length === 0 || gradeChartData.every((d: { count: number }) => d.count === 0) ? (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
                <div className="text-center">
                  <Brain className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No trade data yet</p>
                </div>
              </div>
            ) : (
              <div className="h-[260px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gradeChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted)/0.3)" }} />
                    <Bar dataKey="Win Rate %" radius={[4, 4, 0, 0]}>
                      {gradeChartData.map((entry: { grade: string }, i: number) => (
                        <Cell key={i} fill={
                          entry.grade === "A_PLUS" ? "hsl(var(--primary))" :
                          entry.grade === "B" ? "hsl(38, 92%, 50%)" : "hsl(0, 84%, 60%)"
                        } />
                      ))}
                    </Bar>
                    <Bar dataKey="Plan Follow %" radius={[4, 4, 0, 0]} opacity={0.4}>
                      {gradeChartData.map((entry: { grade: string }, i: number) => (
                        <Cell key={i} fill={
                          entry.grade === "A_PLUS" ? "hsl(var(--primary))" :
                          entry.grade === "B" ? "hsl(38, 92%, 50%)" : "hsl(0, 84%, 60%)"
                        } />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Win Rate by Psychological State</CardTitle>
            <CardDescription>Your performance broken down by how you felt when you checked in. Data does not lie.</CardDescription>
          </CardHeader>
          <CardContent>
            {emotionChartData.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
                <div className="text-center">
                  <Brain className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Complete pre-trade checks to see emotion data</p>
                </div>
              </div>
            ) : (
              <div className="h-[260px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={emotionChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted)/0.3)" }} />
                    <Bar dataKey="Win Rate %" radius={[4, 4, 0, 0]}>
                      {emotionChartData.map((entry: { state: string }, i: number) => (
                        <Cell key={i} fill={PSYCH_STATE_COLORS[entry.state] || "hsl(var(--primary))"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {emotionChartData.length > 0 && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Emotional State Detail</CardTitle>
              <CardDescription>Check frequency, trade count, and interference rate by psychological state.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {emotionChartData.map((e) => (
                  <div key={e.state} className="flex items-center gap-3">
                    <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PSYCH_STATE_COLORS[e.state] }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{e.name}</span>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{e.checks} checks</span>
                          <span className={`font-bold ${e["Win Rate %"] >= 60 ? "text-green-400" : e["Win Rate %"] >= 40 ? "text-amber-400" : "text-destructive"}`}>
                            {e["Win Rate %"]}% W/R
                          </span>
                          {e["Interference %"] > 0 && (
                            <span className="text-amber-400">{e["Interference %"]}% int.</span>
                          )}
                        </div>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${e["Win Rate %"]}%`, backgroundColor: PSYCH_STATE_COLORS[e.state] }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {interferenceData.length > 0 && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Interference Type Breakdown</CardTitle>
                <CardDescription>Which types of emotional interference you engage in most. Each type has a specific cortex counter-strategy.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {interferenceData.map((item) => {
                    const total = interferenceData.reduce((a, b) => a + b.count, 0);
                    const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                    const colorMap: Record<string, string> = {
                      CLOSED_EARLY: "bg-amber-500",
                      MOVED_SL: "bg-destructive",
                      REVENGE: "bg-red-600",
                      OVERSIZE: "bg-orange-500",
                    };
                    return (
                      <div key={item.type}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div>
                            <p className="text-sm font-semibold">{item.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.type === "CLOSED_EARLY" ? "Fear of giving back profits — survival instinct protecting perceived gains" :
                               item.type === "MOVED_SL" ? "Refusal to accept pre-defined risk — loss aversion overriding discipline" :
                               item.type === "REVENGE" ? "Most dangerous — amygdala trying to recover perceived threat to survival" :
                               "Greed archetype hijacking risk management with inflated confidence"}
                            </p>
                          </div>
                          <span className="font-mono font-bold text-lg ml-4">{item.count}x</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${colorMap[item.type] || "bg-primary"}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Identified Behavioral Patterns</CardTitle>
          <CardDescription>Recurring emotional patterns extracted from your journal. Naming a pattern is the first step to interrupting it.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {patterns?.map((pattern: { severity: string; label: string; count: number; insight: string }, i: number) => (
              <div key={i} className="p-4 rounded-lg border bg-card hover:bg-secondary/20 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <Badge variant="outline" className={`
                    ${pattern.severity === "HIGH" ? "text-destructive border-destructive/30 bg-destructive/5" : ""}
                    ${pattern.severity === "MEDIUM" ? "text-amber-500 border-amber-500/30 bg-amber-500/5" : ""}
                    ${pattern.severity === "LOW" ? "text-green-500 border-green-500/30 bg-green-500/5" : ""}
                  `}>
                    {pattern.severity}
                  </Badge>
                  <span className="font-mono text-xl font-bold opacity-30">{pattern.count}x</span>
                </div>
                <h4 className="font-bold mb-1">{pattern.label}</h4>
                <p className="text-sm text-muted-foreground">{pattern.insight}</p>
              </div>
            ))}
            {!patterns?.length && (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Insufficient data to detect behavioral patterns.</p>
                <p className="text-xs mt-1">Complete more trades to generate insights.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
