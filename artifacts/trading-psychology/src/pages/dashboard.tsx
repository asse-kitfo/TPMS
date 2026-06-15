import { useState, useEffect } from "react";
import {
  useGetCurrentSession,
  useGetStatsSummary,
  useGetDisciplineStreak,
  useGetBehavioralPatterns,
  useStartSession,
  useUpdateSession,
  getGetCurrentSessionQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Brain, Shield, Flame, AlertTriangle, Play, Square,
  ArrowRight, CheckSquare2, Crosshair, Activity
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";

const READINESS_LABELS = [
  { min: 85, label: "PEAK STATE", color: "text-green-400", border: "border-green-500/30", bg: "bg-green-500/5" },
  { min: 70, label: "READY TO TRADE", color: "text-primary", border: "border-primary/30", bg: "bg-primary/5" },
  { min: 50, label: "PROCEED WITH CAUTION", color: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/5" },
  { min: 0, label: "STAND DOWN", color: "text-red-400", border: "border-destructive/30", bg: "bg-destructive/5" },
];

function getReadiness(planFollowRate: number, interferenceRate: number, streak: number): number {
  const base = 50;
  const adherenceBonus = planFollowRate * 35;
  const interferencePenalty = interferenceRate * 40;
  const streakBonus = Math.min(streak * 3, 15);
  return Math.min(100, Math.max(0, Math.round(base + adherenceBonus - interferencePenalty + streakBonus)));
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { data: session } = useGetCurrentSession();
  const { data: stats } = useGetStatsSummary();
  const { data: streak } = useGetDisciplineStreak();
  const { data: patterns } = useGetBehavioralPatterns();

  const startSession = useStartSession();
  const updateSession = useUpdateSession();

  const [intention, setIntention] = useState(() => localStorage.getItem("daily-intention") || "");
  const [editingIntention, setEditingIntention] = useState(false);

  const activeSession = session && !session.endedAt;

  const readinessScore = stats
    ? getReadiness(stats.planFollowRate ?? 0, stats.interferenceRate ?? 0, streak?.currentStreak ?? 0)
    : null;

  const readinessLevel = readinessScore !== null
    ? READINESS_LABELS.find((r) => readinessScore >= r.min)!
    : null;

  const handleStart = () => {
    startSession.mutate({ data: {} }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCurrentSessionQueryKey() }),
    });
  };

  const handleEnd = () => {
    if (!session) return;
    updateSession.mutate(
      { id: session.id, data: { endedAt: new Date().toISOString() } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCurrentSessionQueryKey() }) }
    );
  };

  const saveIntention = () => {
    localStorage.setItem("daily-intention", intention);
    setEditingIntention(false);
  };

  const highPatterns = patterns?.filter((p) => p.severity === "HIGH") ?? [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" /> Psychology Hub
          </h1>
          <p className="text-muted-foreground mt-1">Your behavioral control center.</p>
        </div>
        <div className="flex items-center gap-3">
          {activeSession ? (
            <>
              <Badge variant="outline" className="px-3 py-1 font-mono text-sm bg-primary/10 text-primary border-primary/20">
                SESSION ACTIVE
              </Badge>
              <Button variant="destructive" size="sm" onClick={handleEnd} disabled={updateSession.isPending}>
                <Square className="h-4 w-4 mr-2" /> End Session
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={handleStart} disabled={startSession.isPending}>
              <Play className="h-4 w-4 mr-2" /> Start Session
            </Button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {readinessLevel && readinessScore !== null && (
          <Card className={`md:col-span-1 border-2 ${readinessLevel.border} ${readinessLevel.bg}`}>
            <CardContent className="p-6 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Psychological Readiness</p>
              <p className={`text-6xl font-black font-mono ${readinessLevel.color} mb-2`}>{readinessScore}</p>
              <p className={`text-sm font-bold tracking-wider ${readinessLevel.color}`}>{readinessLevel.label}</p>
              <div className="mt-4 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${readinessScore >= 85 ? "bg-green-500" : readinessScore >= 70 ? "bg-primary" : readinessScore >= 50 ? "bg-amber-500" : "bg-destructive"}`}
                  style={{ width: `${readinessScore}%` }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="md:col-span-1">
          <CardContent className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Discipline Streak</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-black font-mono">{streak?.currentStreak ?? 0}</span>
                  <span className="text-muted-foreground text-sm">/ best {streak?.bestStreak ?? 0}</span>
                </div>
              </div>
              <Flame className="h-10 w-10 text-orange-500 opacity-70" />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Plan Follow</p>
                <p className="text-xl font-bold text-primary font-mono">{((stats?.planFollowRate ?? 0) * 100).toFixed(0)}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Interference</p>
                <p className="text-xl font-bold text-amber-500 font-mono">{((stats?.interferenceRate ?? 0) * 100).toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Today's Intention</p>
              {!editingIntention && (
                <button onClick={() => setEditingIntention(true)} className="text-xs text-primary hover:underline">Edit</button>
              )}
            </div>
            {editingIntention ? (
              <div className="space-y-2">
                <Textarea
                  value={intention}
                  onChange={(e) => setIntention(e.target.value)}
                  placeholder="e.g. Only A+ setups. I walk away after 2 losses."
                  className="resize-none h-20 text-sm font-mono"
                  autoFocus
                />
                <Button size="sm" className="w-full" onClick={saveIntention}>Save</Button>
              </div>
            ) : intention ? (
              <p className="text-sm font-mono text-foreground/80 italic leading-relaxed">"{intention}"</p>
            ) : (
              <button onClick={() => setEditingIntention(true)} className="text-sm text-muted-foreground italic hover:text-foreground transition-colors text-left w-full">
                Click to set today's intention…
              </button>
            )}
          </CardContent>
        </Card>
      </div>

      {highPatterns.length > 0 && (
        <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 flex gap-3 items-start">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-destructive text-sm">Active Behavior Warnings</p>
            <div className="mt-1 space-y-1">
              {highPatterns.map((p, i) => (
                <p key={i} className="text-sm text-muted-foreground">{p.label} — {p.insight}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Link href="/check">
          <Card className="cursor-pointer border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all group">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckSquare2 className="h-5 w-5 text-primary" />
                    <p className="font-bold text-lg">Trade Gate</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Required psychological checkpoint before entering any trade. System returns a verdict.
                  </p>
                  <p className="text-xs text-primary font-mono">
                    Checks: setup grade · psych state · focus · urge · clarity
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/execution">
          <Card className="cursor-pointer border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all group">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Crosshair className="h-5 w-5 text-primary" />
                    <p className="font-bold text-lg">Active Trade Monitor</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Lock in your trade parameters. The system becomes your psychological anchor during execution.
                  </p>
                  <p className="text-xs text-primary font-mono">
                    Live timer · rules · breathing · interference blocks
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Behavioral Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            {patterns && patterns.length > 0 ? (
              <div className="space-y-3">
                {patterns.slice(0, 4).map((p, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-card/50">
                    <Badge variant="outline" className={`flex-shrink-0 text-xs ${p.severity === "HIGH" ? "text-destructive border-destructive/30" : p.severity === "MEDIUM" ? "text-amber-500 border-amber-500/30" : "text-green-500 border-green-500/30"}`}>
                      {p.severity}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{p.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{p.insight}</p>
                    </div>
                    <span className="font-mono text-lg font-bold text-muted-foreground/40 flex-shrink-0">{p.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Shield className="h-10 w-10 mb-3 opacity-20" />
                <p className="text-sm">No critical patterns yet.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4 text-muted-foreground" />
              Principles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Your edge is in the A+ setup only.", "Every trade outside that is gambling."],
              ["Emotions are not the enemy.", "Acting on them is."],
              ["The outcome is never in your control.", "The process always is."],
              ["A loss following your rules is a win.", "A win breaking them is a loss."],
            ].map(([principle, sub]) => (
              <div key={principle} className="space-y-0.5">
                <p className="text-sm font-medium">{principle}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
