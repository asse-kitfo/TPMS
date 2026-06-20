import { useState, useEffect, useRef } from "react";
import {
  useGetCurrentSession,
  useGetStatsSummary,
  useGetDisciplineStreak,
  useGetBehavioralPatterns,
  useStartSession,
  useUpdateSession,
  useListTrades,
  getGetCurrentSessionQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Brain, Shield, Flame, AlertTriangle, Play, Square,
  ArrowRight, CheckSquare2, Crosshair, Zap,
  ShieldAlert, OctagonAlert, Timer,
  TrendingUp, TrendingDown, Minus, CheckCircle2, XCircle,
  Clock, BookOpen
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";

type RitualStep = "RITUAL" | "CONFIG" | "DONE";

const RITUAL_QUESTIONS = [
  {
    id: "plan",
    question: "I have reviewed my trading plan and know exactly what I am looking for today.",
    yesText: "Yes — plan reviewed",
    noText: "No — not yet",
    noWarning: "You must review your plan before trading. Open it now. No plan = no trade.",
  },
  {
    id: "noRecovery",
    question: "I am NOT trying to recover losses from yesterday or a previous session.",
    yesText: "Correct — I am starting fresh",
    noText: "I have losses I want to recover",
    noWarning: "Revenge trading is the fastest way to blow an account. The market owes you nothing. Come back when this thought has passed.",
  },
  {
    id: "sleep",
    question: "I have had adequate rest. I am not fatigued, hungover, or running on stress.",
    yesText: "Yes — I am rested",
    noText: "No — I am tired or stressed",
    noWarning: "A fatigued prefrontal cortex makes impulsive decisions. Emotional regulation requires energy. Rest first.",
  },
  {
    id: "accept",
    question: "I fully accept that I may lose on every trade I take today. The loss is pre-accepted.",
    yesText: "Yes — loss is accepted",
    noText: "I need this to work",
    noWarning: "Needing trades to work means you will interfere when they do not. You cannot trade with desperation — come back when you can afford to lose.",
  },
  {
    id: "patience",
    question: "I will only take trades that meet ALL of my A+ criteria. I am patient enough to wait.",
    yesText: "Yes — patience is the edge",
    noText: "I might trade lower-grade setups",
    noWarning: "Your edge only exists on A+ setups. B and C entries are donations to the market. Do not start a session with this mindset.",
  },
];

const READINESS_LEVELS = [
  { min: 85, label: "PEAK STATE", color: "text-green-400", border: "border-green-500/30", bg: "bg-green-500/5", bar: "bg-green-500" },
  { min: 70, label: "READY TO TRADE", color: "text-primary", border: "border-primary/30", bg: "bg-primary/5", bar: "bg-primary" },
  { min: 50, label: "PROCEED WITH CAUTION", color: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/5", bar: "bg-amber-500" },
  { min: 0, label: "STAND DOWN", color: "text-red-400", border: "border-destructive/30", bg: "bg-destructive/5", bar: "bg-destructive" },
];


function getReadiness(planFollowRate: number, interferenceRate: number, streak: number): number {
  const base = 50;
  const adherenceBonus = planFollowRate * 35;
  const interferencePenalty = interferenceRate * 40;
  const streakBonus = Math.min(streak * 3, 15);
  return Math.min(100, Math.max(0, Math.round(base + adherenceBonus - interferencePenalty + streakBonus)));
}

function formatSessionDuration(startIso: string): string {
  const diff = Math.floor((Date.now() - new Date(startIso).getTime()) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function CoolingOffBanner({ remainingMs, onDone }: { remainingMs: number; onDone: () => void }) {
  const [remaining, setRemaining] = useState(remainingMs);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (remaining <= 0) { onDone(); return; }
    ref.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1000) { clearInterval(ref.current!); onDone(); return 0; }
        return r - 1000;
      });
    }, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, []);

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  return (
    <div className="p-5 rounded-xl border-2 border-amber-500/50 bg-amber-500/5 animate-in fade-in duration-300">
      <div className="flex items-center gap-4">
        <Timer className="h-8 w-8 text-amber-400 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <p className="font-bold text-amber-400 text-sm uppercase tracking-widest">Cooling-Off Period Active</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            After a loss, your amygdala is in threat-response mode. Your cortex is currently impaired. Wait for this timer before accessing the Trade Gate.
          </p>
        </div>
        <div className="text-center flex-shrink-0">
          <p className="text-4xl font-black font-mono text-amber-400">
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">remaining</p>
        </div>
      </div>
    </div>
  );
}


export default function Dashboard() {
  const queryClient = useQueryClient();
  const { data: session } = useGetCurrentSession();
  const { data: stats } = useGetStatsSummary();
  const { data: streak } = useGetDisciplineStreak();
  const { data: patterns } = useGetBehavioralPatterns();
  const { data: allTrades } = useListTrades();

  const startSession = useStartSession();
  const updateSession = useUpdateSession();

  const [intention, setIntention] = useState(() => localStorage.getItem("daily-intention") || "");
  const [editingIntention, setEditingIntention] = useState(false);

  const [ritualStep, setRitualStep] = useState<RitualStep>("DONE");
  const [ritualAnswers, setRitualAnswers] = useState<Record<string, boolean | null>>({});
  const [ritualBlocked, setRitualBlocked] = useState<string | null>(null);

  const [showSessionConfig, setShowSessionConfig] = useState(false);
  const [maxLossesConfig, setMaxLossesConfig] = useState(2);
  const [coolingOffConfig, setCoolingOffConfig] = useState(10);
  const [showKillConfirm, setShowKillConfirm] = useState(false);
  const [sessionDuration, setSessionDuration] = useState("");

  const [maxLossesFromStorage, setMaxLossesFromStorage] = useState(2);
  const [coolingOffMs, setCoolingOffMs] = useState(0);

  useEffect(() => {
    const stored = parseInt(localStorage.getItem("maxLosses") || "2", 10);
    setMaxLossesFromStorage(stored);
    const coolingMin = parseInt(localStorage.getItem("coolingOffMinutes") || "10", 10);
    const lastLoss = parseInt(localStorage.getItem("lastLossTimestamp") || "0", 10);
    if (lastLoss > 0 && coolingMin > 0) {
      const elapsed = Date.now() - lastLoss;
      const totalMs = coolingMin * 60 * 1000;
      const remaining = totalMs - elapsed;
      if (remaining > 0) setCoolingOffMs(remaining);
    }
  }, [session?.id]);

  useEffect(() => {
    if (!session || session.endedAt) return;
    const interval = setInterval(() => {
      setSessionDuration(formatSessionDuration(session.createdAt));
    }, 10000);
    setSessionDuration(formatSessionDuration(session.createdAt));
    return () => clearInterval(interval);
  }, [session]);

  const activeSession = session && !session.endedAt;
  const currentLossCount = session?.lossCount ?? 0;
  const lossLimitHit = activeSession && currentLossCount >= maxLossesFromStorage;

  type TradeItem = { sessionId: number; outcome: string | null; [key: string]: unknown };
  const sessionTrades = (allTrades as TradeItem[] | undefined)?.filter((t) => t.sessionId === session?.id && t.outcome !== null) ?? [];
  const sessionWins = sessionTrades.filter((t) => t.outcome === "WIN").length;
  const sessionLosses = sessionTrades.filter((t) => t.outcome === "LOSS").length;
  const sessionBE = sessionTrades.filter((t) => t.outcome === "BREAKEVEN").length;

  const readinessScore = stats
    ? getReadiness(stats.planFollowRate ?? 0, stats.interferenceRate ?? 0, streak?.currentStreak ?? 0)
    : null;
  const readinessLevel = readinessScore !== null
    ? READINESS_LEVELS.find((r) => readinessScore >= r.min)!
    : null;

  const handleStartSession = () => {
    const allAnswered = RITUAL_QUESTIONS.every((q) => ritualAnswers[q.id] !== undefined);
    if (!allAnswered || Object.values(ritualAnswers).some((v) => v === false)) {
      setRitualStep("RITUAL");
      setRitualAnswers({});
      setRitualBlocked(null);
    } else {
      setShowSessionConfig(true);
    }
  };

  const handleRitualAnswer = (id: string, answer: boolean) => {
    if (!answer) {
      const q = RITUAL_QUESTIONS.find((q) => q.id === id);
      setRitualBlocked(q?.noWarning ?? null);
      return;
    }
    const next = { ...ritualAnswers, [id]: true };
    setRitualAnswers(next);
    setRitualBlocked(null);
    const allDone = RITUAL_QUESTIONS.every((q) => next[q.id] === true);
    if (allDone) {
      setRitualStep("CONFIG");
      setShowSessionConfig(true);
    }
  };

  const handleStartConfirm = () => {
    localStorage.setItem("maxLosses", String(maxLossesConfig));
    localStorage.setItem("coolingOffMinutes", String(coolingOffConfig));
    setMaxLossesFromStorage(maxLossesConfig);
    setRitualStep("DONE");
    setRitualAnswers({});
    setShowSessionConfig(false);
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
    setShowKillConfirm(false);
  };

  const saveIntention = () => {
    localStorage.setItem("daily-intention", intention);
    setEditingIntention(false);
  };

  const highPatterns = Array.isArray(patterns) ? patterns.filter((p) => p.severity === "HIGH") : [];
  const answeredCount = RITUAL_QUESTIONS.filter((q) => ritualAnswers[q.id] === true).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" /> Psychology Hub
          </h1>
          <p className="text-muted-foreground mt-1">Reprogram the brain. Trade from the cortex, not the amygdala.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {activeSession ? (
            <>
              <Badge variant="outline" className="px-3 py-1 font-mono text-sm bg-primary/10 text-primary border-primary/20">
                SESSION ACTIVE {sessionDuration ? `· ${sessionDuration}` : ""}
              </Badge>
              {showKillConfirm ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => setShowKillConfirm(false)}>Cancel</Button>
                  <Button size="sm" variant="destructive" onClick={handleEnd} disabled={updateSession.isPending} className="animate-pulse">
                    <OctagonAlert className="h-4 w-4 mr-1" /> Confirm Kill Switch
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive"
                    onClick={() => setShowKillConfirm(true)}>
                    <ShieldAlert className="h-4 w-4 mr-1" /> Kill Switch
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleEnd} disabled={updateSession.isPending}>
                    <Square className="h-4 w-4 mr-2" /> End Session
                  </Button>
                </>
              )}
            </>
          ) : (
            <Button size="sm" onClick={handleStartSession} disabled={startSession.isPending}>
              <Play className="h-4 w-4 mr-2" /> Start Session
            </Button>
          )}
        </div>
      </div>

      {!activeSession && ritualStep === "RITUAL" && (
        <div className="p-6 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <div>
            <p className="text-xs text-primary uppercase tracking-widest mb-1">Pre-Session Ritual — Mental Fitness Check</p>
            <p className="font-bold text-xl">Before your cortex commits capital, it must answer honestly.</p>
            <p className="text-sm text-muted-foreground mt-1">
              {answeredCount} of {RITUAL_QUESTIONS.length} questions passed
            </p>
            <div className="mt-3 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${(answeredCount / RITUAL_QUESTIONS.length) * 100}%` }} />
            </div>
          </div>

          {ritualBlocked && (
            <div className="p-4 rounded-lg border border-destructive/40 bg-destructive/5 animate-in fade-in duration-200">
              <div className="flex gap-3">
                <OctagonAlert className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive text-sm mb-1">Session Blocked</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{ritualBlocked}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => { setRitualStep("DONE"); setRitualAnswers({}); setRitualBlocked(null); }}>
                Close — I'll come back later
              </Button>
            </div>
          )}

          {!ritualBlocked && RITUAL_QUESTIONS.map((q, i) => {
            const answered = ritualAnswers[q.id] === true;
            const pending = ritualAnswers[q.id] === undefined;
            const isNext = RITUAL_QUESTIONS.slice(0, i).every((prev) => ritualAnswers[prev.id] === true);

            if (!isNext && !answered) return null;

            return (
              <div key={q.id} className={`space-y-3 transition-all ${answered ? "opacity-60" : ""}`}>
                <div className="flex gap-3 items-start">
                  {answered
                    ? <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    : <div className="h-5 w-5 rounded-full border-2 border-primary/40 flex-shrink-0 mt-0.5" />
                  }
                  <p className="text-sm font-medium leading-relaxed">{q.question}</p>
                </div>
                {!answered && (
                  <div className="flex gap-3 pl-8">
                    <button
                      onClick={() => handleRitualAnswer(q.id, true)}
                      className="flex-1 py-2.5 px-3 rounded-lg border border-green-500/40 text-green-400 text-sm font-medium hover:bg-green-500/10 transition-all"
                    >
                      {q.yesText}
                    </button>
                    <button
                      onClick={() => handleRitualAnswer(q.id, false)}
                      className="flex-1 py-2.5 px-3 rounded-lg border border-destructive/30 text-muted-foreground text-sm hover:bg-destructive/5 hover:text-destructive transition-all"
                    >
                      {q.noText}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!activeSession && showSessionConfig && (
        <div className="p-5 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
          <div>
            <p className="font-bold text-lg">Configure Today's Session</p>
            <p className="text-sm text-muted-foreground mt-1">Set your rules while your cortex is calm — not when your amygdala is running the session mid-trade.</p>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold mb-1">Max losses before circuit breaker</p>
              <p className="text-xs text-muted-foreground mb-3">When this limit is hit, the Trade Gate locks. Your calm cortex is setting the rule now so the amygdala cannot override it.</p>
              <div className="flex gap-3">
                {[1, 2, 3].map(n => (
                  <button key={n} type="button" onClick={() => setMaxLossesConfig(n)}
                    className={`flex-1 py-3 rounded-lg border-2 font-mono font-black text-2xl transition-all ${maxLossesConfig === n ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                    {n}
                    <p className="text-xs font-sans font-normal mt-1">{n === 1 ? "Iron rule" : n === 2 ? "Strict" : "Standard"}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-1">Cooling-off period after each loss</p>
              <p className="text-xs text-muted-foreground mb-3">After a loss, you must wait this long before the Trade Gate unlocks. Prevents revenge trades taken in amygdala hijack state.</p>
              <div className="flex gap-2">
                {[0, 5, 10, 15, 20].map(n => (
                  <button key={n} type="button" onClick={() => setCoolingOffConfig(n)}
                    className={`flex-1 py-2.5 rounded-lg border-2 font-mono text-sm font-bold transition-all ${coolingOffConfig === n ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                    {n === 0 ? "None" : `${n}m`}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-secondary/50 border border-border/50 text-xs text-muted-foreground">
              <strong className="text-foreground">Your rules:</strong> After {maxLossesConfig} {maxLossesConfig === 1 ? "loss" : "losses"} the gate locks for the day.{coolingOffConfig > 0 ? ` After each loss, you wait ${coolingOffConfig} minutes before trading again.` : ""}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={() => { setShowSessionConfig(false); setRitualStep("DONE"); }}>Cancel</Button>
            <Button size="sm" className="flex-1" onClick={handleStartConfirm} disabled={startSession.isPending}>
              <Play className="h-4 w-4 mr-2" /> Begin Session
            </Button>
          </div>
        </div>
      )}

      {activeSession && coolingOffMs > 0 && (
        <CoolingOffBanner remainingMs={coolingOffMs} onDone={() => setCoolingOffMs(0)} />
      )}

      {activeSession && (
        <div className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
          lossLimitHit ? "border-destructive bg-destructive/10 animate-pulse"
          : currentLossCount > 0 ? "border-amber-500/50 bg-amber-500/5"
          : "border-border/50 bg-card/30"
        }`}>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Session Loss Counter</p>
              {lossLimitHit && <Badge variant="destructive" className="text-xs animate-pulse">CIRCUIT BREAKER ACTIVE</Badge>}
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-mono font-black ${lossLimitHit ? "text-destructive" : currentLossCount > 0 ? "text-amber-400" : "text-green-400"}`}>
                {currentLossCount}
              </span>
              <span className="text-muted-foreground font-mono text-lg">/ {maxLossesFromStorage}</span>
              <span className="text-muted-foreground text-sm ml-1">
                {lossLimitHit ? "— Stop trading immediately" : currentLossCount === 0 ? "— Clean session" : `— ${maxLossesFromStorage - currentLossCount} remaining`}
              </span>
            </div>
            <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${lossLimitHit ? "bg-destructive" : currentLossCount > 0 ? "bg-amber-400" : "bg-green-400"}`}
                style={{ width: `${Math.min(100, (currentLossCount / maxLossesFromStorage) * 100)}%` }} />
            </div>
          </div>
          {lossLimitHit && (
            <div className="text-center flex-shrink-0">
              <p className="text-xs text-destructive font-bold mb-2">Your cortex set this rule.<br />Honor it.</p>
              <Button size="sm" variant="destructive" onClick={handleEnd} disabled={updateSession.isPending}>End Session Now</Button>
            </div>
          )}
        </div>
      )}

      {activeSession && sessionTrades.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Trades", value: sessionTrades.length, color: "text-foreground" },
            { label: "Wins", value: sessionWins, color: "text-green-400", icon: <TrendingUp className="h-3 w-3" /> },
            { label: "Losses", value: sessionLosses, color: "text-red-400", icon: <TrendingDown className="h-3 w-3" /> },
            { label: "B/E", value: sessionBE, color: "text-amber-400", icon: <Minus className="h-3 w-3" /> },
          ].map((stat) => (
            <Card key={stat.label} className="border-border/50">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{stat.label}</p>
                <div className={`flex items-center justify-center gap-1 ${stat.color}`}>
                  {stat.icon}
                  <span className="text-2xl font-black font-mono">{stat.value}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">Plan adherence · Interference rate · Streak</p>
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
                  <p className="text-sm text-muted-foreground">Body scan → rules checklist → amygdala check → verdict + position sizing. Intercepts the emotional brain before it commits capital.</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {["Body scan", "Rules checklist", "Verdict + position size"].map(t => (
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
                  <p className="text-sm text-muted-foreground">Your in-trade psychological anchor. Intercepts interference urges with breathing resets. Forces cortex re-engagement before you act.</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {["Interference interception", "Breathing reset", "Debrief"].map(t => (
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

      <Link href="/cbt">
        <Card className="cursor-pointer border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all group">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-amber-400" />
                  <p className="font-bold text-lg">Thought Record</p>
                  <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-400 bg-amber-500/10">CBT Tool</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Real-time cognitive reframing. When a trade urge, fear, or emotional pull hits — name the distortion, write the reframe, re-engage the cortex.</p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {["Name the distortion", "Write the reframe", "Commit to action"].map(t => (
                    <span key={t} className="text-xs text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded">{t}</span>
                  ))}
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-amber-400 transition-colors mt-1 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
