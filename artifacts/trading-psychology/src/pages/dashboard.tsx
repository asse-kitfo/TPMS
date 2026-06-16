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
  ArrowRight, CheckSquare2, Crosshair, Wind, Zap, Crown,
  Sword, Heart, Eye
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";

type BreathPhase = "INHALE" | "HOLD" | "EXHALE" | "IDLE";

const READINESS_LEVELS = [
  { min: 85, label: "PEAK STATE", color: "text-green-400", border: "border-green-500/30", bg: "bg-green-500/5", bar: "bg-green-500" },
  { min: 70, label: "READY TO TRADE", color: "text-primary", border: "border-primary/30", bg: "bg-primary/5", bar: "bg-primary" },
  { min: 50, label: "PROCEED WITH CAUTION", color: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/5", bar: "bg-amber-500" },
  { min: 0, label: "STAND DOWN", color: "text-red-400", border: "border-destructive/30", bg: "bg-destructive/5", bar: "bg-destructive" },
];

const ARCHETYPES = [
  {
    icon: Crown,
    name: "The Ruler",
    color: "text-primary",
    border: "border-primary/20",
    healthy: "Enforces your rules absolutely. Sets the structure your caveman brain needs to operate within.",
    hijacked: "Becomes rigid, controlling — tries to force the market to comply.",
  },
  {
    icon: Sword,
    name: "The Warrior",
    color: "text-red-400",
    border: "border-destructive/20",
    healthy: "Acts decisively on A+ setups without hesitation. Accepts loss as the cost of doing business.",
    hijacked: "Becomes combative — fights the market, refuses to accept stops.",
  },
  {
    icon: Heart,
    name: "The Caregiver",
    color: "text-pink-400",
    border: "border-pink-500/20",
    healthy: "Protects capital with patience. Nurtures the account through risk discipline.",
    hijacked: "Becomes fearful — avoids all risk, misses valid setups out of over-protection.",
  },
  {
    icon: Eye,
    name: "The Sage",
    color: "text-amber-400",
    border: "border-amber-500/20",
    healthy: "Sees the market with probability-based objectivity. No ego in the analysis.",
    hijacked: "Rationalizes — creates stories to justify what the emotional brain already decided.",
  },
];

function getReadiness(planFollowRate: number, interferenceRate: number, streak: number): number {
  const base = 50;
  const adherenceBonus = planFollowRate * 35;
  const interferencePenalty = interferenceRate * 40;
  const streakBonus = Math.min(streak * 3, 15);
  return Math.min(100, Math.max(0, Math.round(base + adherenceBonus - interferencePenalty + streakBonus)));
}

function MiniBreathingWidget() {
  const [phase, setPhase] = useState<BreathPhase>("IDLE");
  const [timer, setTimer] = useState(0);
  const [cycles, setCycles] = useState(0);

  useEffect(() => {
    if (phase === "IDLE") return;
    const PHASES: { phase: BreathPhase; duration: number }[] = [
      { phase: "INHALE", duration: 4 },
      { phase: "HOLD", duration: 7 },
      { phase: "EXHALE", duration: 8 },
    ];
    let phaseIdx = PHASES.findIndex(p => p.phase === phase);
    if (phaseIdx < 0) phaseIdx = 0;
    let remaining = PHASES[phaseIdx].duration;
    setTimer(remaining);

    const interval = setInterval(() => {
      remaining -= 1;
      setTimer(remaining);
      if (remaining <= 0) {
        phaseIdx = (phaseIdx + 1) % 3;
        if (phaseIdx === 0) setCycles(c => c + 1);
        remaining = PHASES[phaseIdx].duration;
        setPhase(PHASES[phaseIdx].phase);
        setTimer(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const phaseLabel = phase === "INHALE" ? "Breathe In" : phase === "HOLD" ? "Hold" : phase === "EXHALE" ? "Breathe Out" : "";
  const phaseColor = phase === "INHALE" ? "text-blue-400" : phase === "HOLD" ? "text-primary" : phase === "EXHALE" ? "text-green-400" : "text-muted-foreground";

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground uppercase tracking-widest">Daily Practice — Diaphragmatic Breathing</p>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Breathing practice builds myelinated neural circuitry over time. You are not just calming down — you are reprogramming your brain's automatic responses. This must be practiced daily.
      </p>
      {phase === "IDLE" ? (
        <Button variant="outline" className="w-full" size="sm" onClick={() => { setCycles(0); setPhase("INHALE"); }}>
          <Wind className="h-4 w-4 mr-2" /> Start 3-Minute Practice
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 ${phaseColor}`}>
              <Wind className="h-4 w-4" />
              <span className="font-semibold text-sm">{phaseLabel}</span>
            </div>
            <span className={`font-mono text-2xl font-bold ${phaseColor}`}>{timer}</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${phase === "INHALE" ? "bg-blue-400" : phase === "HOLD" ? "bg-primary" : "bg-green-400"}`}
              style={{ width: `${((phase === "INHALE" ? 4 - timer : phase === "HOLD" ? 7 - timer : 8 - timer) / (phase === "INHALE" ? 4 : phase === "HOLD" ? 7 : 8)) * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{cycles} cycles complete</span>
            <button onClick={() => { setPhase("IDLE"); setCycles(0); }} className="text-muted-foreground hover:text-foreground">Stop</button>
          </div>
        </div>
      )}
    </div>
  );
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
  const [archetypeExpanded, setArchetypeExpanded] = useState<number | null>(null);

  const activeSession = session && !session.endedAt;

  const readinessScore = stats
    ? getReadiness(stats.planFollowRate ?? 0, stats.interferenceRate ?? 0, streak?.currentStreak ?? 0)
    : null;

  const readinessLevel = readinessScore !== null
    ? READINESS_LEVELS.find((r) => readinessScore >= r.min)!
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
          <p className="text-muted-foreground mt-1">Reprogram the brain. Trade from the cortex, not the amygdala.</p>
        </div>
        <div className="flex items-center gap-3">
          {activeSession ? (
            <>
              <Badge variant="outline" className="px-3 py-1 font-mono text-sm bg-primary/10 text-primary border-primary/20">SESSION ACTIVE</Badge>
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
          <Card className={`border-2 ${readinessLevel.border} ${readinessLevel.bg}`}>
            <CardContent className="p-6 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Psychological Readiness</p>
              <p className={`text-6xl font-black font-mono mb-2 ${readinessLevel.color}`}>{readinessScore}</p>
              <p className={`text-sm font-bold tracking-wider ${readinessLevel.color}`}>{readinessLevel.label}</p>
              <div className="mt-4 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${readinessLevel.bar}`} style={{ width: `${readinessScore}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                Based on plan adherence, interference rate, and discipline streak
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Discipline Streak</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-black font-mono">{streak?.currentStreak ?? 0}</span>
                  <span className="text-muted-foreground text-sm">/ best {streak?.bestStreak ?? 0}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Consecutive trades following rules</p>
              </div>
              <Flame className="h-10 w-10 text-orange-500 opacity-70" />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Plan Follow</p>
                <p className="text-2xl font-bold text-primary font-mono">{((stats?.planFollowRate ?? 0) * 100).toFixed(0)}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Interference</p>
                <p className="text-2xl font-bold text-amber-500 font-mono">{((stats?.interferenceRate ?? 0) * 100).toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Today's Intention</p>
              {!editingIntention && (
                <button onClick={() => setEditingIntention(true)} className="text-xs text-primary hover:underline">Edit</button>
              )}
            </div>
            {editingIntention ? (
              <div className="space-y-2 flex-1 flex flex-col">
                <Textarea value={intention} onChange={(e) => setIntention(e.target.value)}
                  placeholder="e.g. Only A+ setups today. I walk away after 2 losses. I trade from calm, not from need."
                  className="resize-none flex-1 text-sm font-mono" autoFocus />
                <Button size="sm" className="w-full" onClick={saveIntention}>Save Intention</Button>
              </div>
            ) : intention ? (
              <p className="text-sm font-mono text-foreground/80 italic leading-relaxed flex-1">"{intention}"</p>
            ) : (
              <button onClick={() => setEditingIntention(true)} className="text-sm text-muted-foreground italic hover:text-foreground transition-colors text-left w-full flex-1">
                Set your trading intention for today…
              </button>
            )}
          </CardContent>
        </Card>
      </div>

      {highPatterns.length > 0 && (
        <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 flex gap-3 items-start">
          <Zap className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-destructive text-sm">Active Amygdala Patterns Detected</p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-2">These behaviors indicate the survival brain has been hijacking your execution. Review and interrupt the pattern.</p>
            {highPatterns.map((p, i) => (
              <p key={i} className="text-sm text-muted-foreground">→ {p.label} — {p.insight}</p>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Link href="/check">
          <Card className="cursor-pointer border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all group h-full">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckSquare2 className="h-5 w-5 text-primary" />
                    <p className="font-bold text-lg">Trade Gate</p>
                  </div>
                  <p className="text-sm text-muted-foreground">Body scan → amygdala check → psychological verdict. Intercepts the emotional brain before it commits capital.</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {["Body scan", "Amygdala check", "Verdict system"].map(t => (
                      <span key={t} className="text-xs text-primary font-mono bg-primary/10 px-2 py-0.5 rounded">{t}</span>
                    ))}
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors mt-1 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/execution">
          <Card className="cursor-pointer border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all group h-full">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Crosshair className="h-5 w-5 text-primary" />
                    <p className="font-bold text-lg">Active Trade Monitor</p>
                  </div>
                  <p className="text-sm text-muted-foreground">Your in-trade psychological anchor. Detects low-road activation. Breathing circuit breaker prevents impulsive interference.</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {["Amygdala alerts", "Breathing reset", "Brain state check"].map(t => (
                      <span key={t} className="text-xs text-primary font-mono bg-primary/10 px-2 py-0.5 rounded">{t}</span>
                    ))}
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors mt-1 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" /> Self-Mastery Framework
            </CardTitle>
            <p className="text-xs text-muted-foreground">Your mind has 4 archetypes. Each has a healthy form and a hijacked form. Know which is running.</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {ARCHETYPES.map((arch, i) => (
              <button
                key={arch.name}
                type="button"
                onClick={() => setArchetypeExpanded(archetypeExpanded === i ? null : i)}
                className="w-full text-left p-3 rounded-lg border border-border hover:border-border/80 hover:bg-accent/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <arch.icon className={`h-4 w-4 ${arch.color} flex-shrink-0`} />
                  <span className="font-semibold text-sm">{arch.name}</span>
                  <span className={`ml-auto text-xs ${arch.color} opacity-60`}>{archetypeExpanded === i ? "▲" : "▼"}</span>
                </div>
                {archetypeExpanded === i && (
                  <div className="mt-3 space-y-2 animate-in fade-in duration-200">
                    <div className="flex gap-2">
                      <span className="text-xs text-green-400 font-medium flex-shrink-0 w-16">Healthy:</span>
                      <p className="text-xs text-muted-foreground">{arch.healthy}</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-xs text-destructive font-medium flex-shrink-0 w-16">Hijacked:</span>
                      <p className="text-xs text-muted-foreground">{arch.hijacked}</p>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wind className="h-4 w-4 text-primary" /> Daily Practice
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <MiniBreathingWidget />
            <div className="pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Why daily?</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You are building <strong className="text-foreground">myelinated neural circuitry</strong> — insulated pathways that make emotional regulation automatic and instinctive. This cannot be rushed. Discipline today compounds into performance tomorrow. Practice breathing until it is your first response, not your last resort.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
