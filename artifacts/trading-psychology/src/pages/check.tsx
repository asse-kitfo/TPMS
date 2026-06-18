import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useSubmitCheck,
  useGetCurrentSession,
  getListChecksQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle, ShieldCheck, ShieldAlert, Ban, Loader2, Wind,
  Brain, Zap, Activity, Eye, Crosshair, OctagonAlert, Timer,
  CheckCircle2, ListChecks, TrendingUp
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

type Phase = "COOLING_OFF" | "BODY_SCAN" | "AMYGDALA_RESET" | "RULES_CHECK" | "MAIN_CHECK" | "VERDICT";
type CheckResultVerdict = "TRADE" | "REDUCE_RISK" | "NO_TRADE" | "HARD_BLOCK";
type BreathPhase = "INHALE" | "HOLD" | "EXHALE";

const DEFAULT_RULES = [
  "I have a clearly defined entry, stop loss, and take profit BEFORE entering.",
  "This setup meets ALL of my A+ criteria — no exceptions.",
  "I am not entering because of FOMO or because price is already moving.",
  "My risk on this trade is within my daily max loss parameters.",
  "I can walk away and let this trade run without monitoring it obsessively.",
];

const BODY_SCAN_SIGNALS = [
  { id: "breath", label: "I am holding my breath or breathing shallowly", sub: "Breath-holding is the body's first response to perceived danger" },
  { id: "tension", label: "My jaw, shoulders, or chest feel tight or tense", sub: "Muscle tension is the body preparing for fight or flight" },
  { id: "heartrate", label: "My heart rate is elevated or I feel a physical urgency", sub: "Elevated arousal signals the amygdala is scanning for threat" },
  { id: "fixation", label: "I feel mentally fixated on this trade — I need it to work", sub: "Fixation is the survival brain trying to control an uncontrollable outcome" },
];

const checkSchema = z.object({
  pair: z.string().min(1, "Pair is required"),
  setupGrade: z.enum(["A_PLUS", "B", "C"]),
  psychState: z.enum(["CALM", "FOCUSED", "URGE", "PRESSURE", "FEAR", "OVERCONFIDENT"]),
  focusLevel: z.number().min(1).max(10),
  urgeLevel: z.number().min(1).max(10),
  decisionClarity: z.number().min(1).max(10),
  patience: z.number().min(1).max(10),
  notes: z.string().optional(),
});

const PSYCH_STATE_LABELS: Record<string, string> = {
  CALM: "Calm & Objective",
  FOCUSED: "Highly Focused",
  URGE: "Urge to Trade",
  PRESSURE: "Feeling Pressure",
  FEAR: "Fear / Anxiety",
  OVERCONFIDENT: "Overconfident",
};

function computeReadinessScore(values: {
  focusLevel: number;
  urgeLevel: number;
  decisionClarity: number;
  patience: number;
  psychState: string;
  setupGrade: string;
}): number {
  let score = 0;
  score += values.focusLevel * 10;
  score += (10 - values.urgeLevel) * 10;
  score += values.decisionClarity * 10;
  score += values.patience * 10;
  if (values.psychState === "CALM" || values.psychState === "FOCUSED") score += 60;
  else if (values.psychState === "PRESSURE" || values.psychState === "URGE") score -= 40;
  else if (values.psychState === "FEAR" || values.psychState === "OVERCONFIDENT") score -= 80;
  if (values.setupGrade === "A_PLUS") score += 40;
  else if (values.setupGrade === "B") score -= 20;
  else score -= 80;
  return Math.min(100, Math.max(0, Math.round(score / 4.8)));
}

function getPositionSize(verdict: CheckResultVerdict, score: number): { pct: number; label: string; color: string } {
  if (verdict === "HARD_BLOCK" || verdict === "NO_TRADE") return { pct: 0, label: "0% — Do NOT trade", color: "text-destructive" };
  if (verdict === "REDUCE_RISK") return { pct: 50, label: "50% of normal size", color: "text-amber-400" };
  if (score >= 85) return { pct: 100, label: "100% — Full size", color: "text-green-400" };
  if (score >= 70) return { pct: 75, label: "75% of normal size", color: "text-primary" };
  return { pct: 50, label: "50% of normal size — Marginal conditions", color: "text-amber-400" };
}

function BreathingReset({ onComplete }: { onComplete: () => void }) {
  const [breathPhase, setBreathPhase] = useState<BreathPhase>("INHALE");
  const [breathTimer, setBreathTimer] = useState(4);
  const [cyclesComplete, setCyclesComplete] = useState(0);
  const TARGET_CYCLES = 3;

  useEffect(() => {
    const PHASES: { phase: BreathPhase; duration: number }[] = [
      { phase: "INHALE", duration: 4 },
      { phase: "HOLD", duration: 7 },
      { phase: "EXHALE", duration: 8 },
    ];
    let phaseIdx = 0;
    let remaining = PHASES[0].duration;
    setBreathPhase(PHASES[0].phase);
    setBreathTimer(remaining);

    const interval = setInterval(() => {
      remaining -= 1;
      setBreathTimer(remaining);
      if (remaining <= 0) {
        phaseIdx = (phaseIdx + 1) % 3;
        if (phaseIdx === 0) {
          setCyclesComplete((c) => {
            const next = c + 1;
            if (next >= TARGET_CYCLES) clearInterval(interval);
            return next;
          });
        }
        remaining = PHASES[phaseIdx].duration;
        setBreathPhase(PHASES[phaseIdx].phase);
        setBreathTimer(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const isComplete = cyclesComplete >= TARGET_CYCLES;
  const phaseLabel = breathPhase === "INHALE" ? "Breathe In — belly first" : breathPhase === "HOLD" ? "Hold" : "Breathe Out — slowly";
  const phaseColor = breathPhase === "INHALE" ? "text-blue-400 border-blue-400" : breathPhase === "HOLD" ? "text-primary border-primary" : "text-green-400 border-green-400";

  return (
    <div className="flex flex-col items-center text-center space-y-8 py-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground uppercase tracking-widest">Diaphragmatic Reset</p>
        <p className="text-base text-muted-foreground max-w-sm">
          Breathe from your belly, not your chest. This directly activates the parasympathetic nervous system and disengages the amygdala.
        </p>
      </div>

      {isComplete ? (
        <div className="space-y-6">
          <div className="h-36 w-36 rounded-full border-4 border-green-500 flex items-center justify-center">
            <div className="text-center">
              <ShieldCheck className="h-10 w-10 text-green-500 mx-auto" />
              <p className="text-xs text-green-400 mt-1 font-medium">Complete</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="font-semibold">Thinking brain re-engaged.</p>
            <p className="text-sm text-muted-foreground">Fear cannot be sustained in a relaxed body. Proceed to your rules check.</p>
          </div>
          <Button size="lg" className="px-12" onClick={onComplete}>Continue to Rules Check →</Button>
        </div>
      ) : (
        <>
          <div className={`h-40 w-40 rounded-full border-4 transition-all duration-1000 flex items-center justify-center ${phaseColor} ${breathPhase === "INHALE" ? "scale-110" : breathPhase === "HOLD" ? "scale-110" : "scale-90"}`}>
            <div className="text-center">
              <p className={`text-5xl font-black font-mono ${phaseColor.split(" ")[0]}`}>{breathTimer}</p>
              <p className={`text-xs font-medium mt-1 ${phaseColor.split(" ")[0]}`}>{breathPhase}</p>
            </div>
          </div>
          <p className="text-base font-medium">{phaseLabel}</p>
          <div className="flex gap-2 items-center">
            {Array.from({ length: TARGET_CYCLES }).map((_, i) => (
              <div key={i} className={`h-2 w-8 rounded-full transition-colors ${cyclesComplete > i ? "bg-primary" : "bg-muted"}`} />
            ))}
            <span className="text-xs text-muted-foreground ml-1">{cyclesComplete}/{TARGET_CYCLES}</span>
          </div>
        </>
      )}
    </div>
  );
}

export default function TradeGate() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { data: session, isLoading: isSessionLoading } = useGetCurrentSession();
  const [phase, setPhase] = useState<Phase>("BODY_SCAN");
  const [bodyScan, setBodyScan] = useState<Record<string, boolean>>({});
  const [rulesChecked, setRulesChecked] = useState<Record<number, boolean>>({});
  const [verdict, setVerdict] = useState<{ status: CheckResultVerdict; reason: string | null; readinessScore: number } | null>(null);
  const [submittedData, setSubmittedData] = useState<{ pair: string; setupGrade: string } | null>(null);
  const [coolingOffRemaining, setCoolingOffRemaining] = useState(0);
  const [userRules] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("user-trade-rules");
      return stored ? JSON.parse(stored) : DEFAULT_RULES;
    } catch { return DEFAULT_RULES; }
  });

  const submitCheck = useSubmitCheck();

  const form = useForm<z.infer<typeof checkSchema>>({
    resolver: zodResolver(checkSchema),
    defaultValues: {
      pair: "",
      setupGrade: "A_PLUS",
      psychState: "CALM",
      focusLevel: 8,
      urgeLevel: 2,
      decisionClarity: 8,
      patience: 8,
    },
  });

  const watchedValues = form.watch();
  const liveScore = computeReadinessScore({
    focusLevel: watchedValues.focusLevel ?? 8,
    urgeLevel: watchedValues.urgeLevel ?? 2,
    decisionClarity: watchedValues.decisionClarity ?? 8,
    patience: watchedValues.patience ?? 8,
    psychState: watchedValues.psychState ?? "CALM",
    setupGrade: watchedValues.setupGrade ?? "A_PLUS",
  });

  const maxLosses = parseInt(localStorage.getItem("maxLosses") || "2", 10);
  const lossLimitHit = session && !session.endedAt && (session.lossCount ?? 0) >= maxLosses;

  useEffect(() => {
    const coolingMin = parseInt(localStorage.getItem("coolingOffMinutes") || "0", 10);
    const lastLoss = parseInt(localStorage.getItem("lastLossTimestamp") || "0", 10);
    if (coolingMin > 0 && lastLoss > 0) {
      const elapsed = Date.now() - lastLoss;
      const totalMs = coolingMin * 60 * 1000;
      const remaining = totalMs - elapsed;
      if (remaining > 0) {
        setCoolingOffRemaining(remaining);
        setPhase("COOLING_OFF");
      }
    }
  }, []);

  useEffect(() => {
    if (phase !== "COOLING_OFF") return;
    if (coolingOffRemaining <= 0) { setPhase("BODY_SCAN"); return; }
    const interval = setInterval(() => {
      setCoolingOffRemaining((r) => {
        if (r <= 1000) { clearInterval(interval); setPhase("BODY_SCAN"); return 0; }
        return r - 1000;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, coolingOffRemaining]);

  const onSubmit = (values: z.infer<typeof checkSchema>) => {
    if (!session) return;
    setSubmittedData({ pair: values.pair, setupGrade: values.setupGrade });
    const score = computeReadinessScore(values);
    submitCheck.mutate(
      { data: { ...values, sessionId: session.id } },
      {
        onSuccess: (data: { verdict: string; verdictReason?: string | null }) => {
          setVerdict({ status: data.verdict as CheckResultVerdict, reason: data.verdictReason || null, readinessScore: score });
          setPhase("VERDICT");
          queryClient.invalidateQueries({ queryKey: getListChecksQueryKey({ sessionId: session.id }) });
        },
      }
    );
  };

  const hijackSignals = Object.values(bodyScan).filter(Boolean).length;
  const isHijacked = hijackSignals >= 2;
  const allScanned = BODY_SCAN_SIGNALS.every((s) => bodyScan[s.id] !== undefined);
  const allRulesChecked = userRules.every((_, i) => rulesChecked[i] === true);

  const handleBodyScanContinue = () => {
    if (isHijacked) setPhase("AMYGDALA_RESET");
    else setPhase("RULES_CHECK");
  };

  if (isSessionLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!session || session.endedAt) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center space-y-4 max-w-md">
          <ShieldAlert className="h-16 w-16 text-muted-foreground mx-auto opacity-20" />
          <h2 className="text-2xl font-bold">No Active Session</h2>
          <p className="text-muted-foreground">Start a session from the Psychology Hub first.</p>
          <Button asChild><a href="/">Go to Psychology Hub</a></Button>
        </div>
      </div>
    );
  }

  if (lossLimitHit) {
    return (
      <div className="flex items-center justify-center h-[80vh] animate-in zoom-in-95 duration-300">
        <div className="text-center space-y-6 max-w-md">
          <OctagonAlert className="h-20 w-20 text-destructive mx-auto animate-pulse" />
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-destructive uppercase">Circuit Breaker Active</h2>
            <p className="text-muted-foreground">You have reached your {maxLosses}-loss limit. The Trade Gate is locked.</p>
          </div>
          <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-left space-y-2">
            <p className="text-sm font-semibold text-destructive">Why this rule exists:</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              After {maxLosses} {maxLosses === 1 ? "loss" : "losses"}, your brain is in threat-detection mode. Every subsequent trade is made by an emotionally compromised brain trying to recover — the precise state that turns small losses into account-ending drawdowns.
            </p>
            <p className="text-sm font-semibold text-muted-foreground mt-2">Your cortex set this rule when it was calm. Honor it.</p>
          </div>
          <Button className="w-full" asChild><a href="/">Return to Psychology Hub</a></Button>
        </div>
      </div>
    );
  }

  if (phase === "COOLING_OFF") {
    const minutes = Math.floor(coolingOffRemaining / 60000);
    const seconds = Math.floor((coolingOffRemaining % 60000) / 1000);
    return (
      <div className="flex items-center justify-center h-[80vh] animate-in zoom-in-95 duration-300">
        <div className="text-center space-y-8 max-w-md">
          <Timer className="h-20 w-20 text-amber-400 mx-auto" />
          <div className="space-y-3">
            <p className="text-xs text-amber-400 uppercase tracking-widest font-bold">Cooling-Off Period</p>
            <p className="text-5xl font-black font-mono text-amber-400">
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </p>
            <p className="text-muted-foreground">Trade Gate unlocks when the timer reaches zero.</p>
          </div>
          <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 text-left space-y-2">
            <p className="text-sm font-semibold text-amber-400">Your brain right now after that loss:</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The amygdala has triggered a cortisol and adrenaline response. Your prefrontal cortex — responsible for rational decision-making — is temporarily impaired. Any trade taken now comes from survival instinct, not methodology.
            </p>
            <p className="text-sm font-semibold text-muted-foreground">Use this time to breathe and decompress.</p>
          </div>
          <Button variant="outline" className="w-full" asChild><a href="/">Return to Hub — Practice Breathing</a></Button>
        </div>
      </div>
    );
  }

  if (phase === "VERDICT" && verdict) {
    const posSize = getPositionSize(verdict.status, verdict.readinessScore);
    const scoreColor = verdict.readinessScore >= 80 ? "text-green-400" : verdict.readinessScore >= 60 ? "text-primary" : verdict.readinessScore >= 40 ? "text-amber-400" : "text-destructive";
    return (
      <div className="flex items-center justify-center min-h-[80vh] animate-in zoom-in-95 duration-300 py-8">
        <Card className={`w-full max-w-2xl overflow-hidden border-2 ${
          verdict.status === "TRADE" ? "border-green-500/50 bg-green-500/5" :
          verdict.status === "REDUCE_RISK" ? "border-amber-500/50 bg-amber-500/5" :
          verdict.status === "NO_TRADE" ? "border-destructive/50 bg-destructive/5" :
          "border-destructive shadow-[0_0_50px_rgba(239,68,68,0.3)] bg-destructive/10"
        }`}>
          <div className={`h-3 w-full ${verdict.status === "TRADE" ? "bg-green-500" : verdict.status === "REDUCE_RISK" ? "bg-amber-500" : "bg-destructive"}`} />
          <CardContent className="p-8 space-y-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                {verdict.status === "TRADE" && <ShieldCheck className="h-16 w-16 text-green-500" />}
                {verdict.status === "REDUCE_RISK" && <AlertTriangle className="h-16 w-16 text-amber-500" />}
                {verdict.status === "NO_TRADE" && <Ban className="h-16 w-16 text-destructive" />}
                {verdict.status === "HARD_BLOCK" && <ShieldAlert className="h-16 w-16 text-destructive animate-pulse" />}
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest">System Verdict</p>
                <h1 className="text-4xl font-black tracking-tight uppercase mt-1">{verdict.status.replace("_", " ")}</h1>
                {verdict.reason && <p className="text-base text-muted-foreground mt-3 leading-relaxed">{verdict.reason}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-border/50 bg-card/50">
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Readiness Score</p>
                <p className={`text-4xl font-black font-mono ${scoreColor}`}>{verdict.readinessScore}</p>
                <p className="text-xs text-muted-foreground mt-1">/ 100</p>
              </div>
              <div className="text-center border-l border-border/50">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Position Size</p>
                <p className={`text-2xl font-black font-mono ${posSize.color}`}>{posSize.pct}%</p>
                <p className={`text-xs mt-1 font-medium ${posSize.color}`}>{posSize.label}</p>
              </div>
            </div>

            {posSize.pct > 0 && (
              <div className="p-3 rounded-lg border border-border/50 bg-secondary/30">
                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-widest">Position Sizing Rule</p>
                <div className="flex gap-2 items-center">
                  <TrendingUp className={`h-4 w-4 flex-shrink-0 ${posSize.color}`} />
                  <p className="text-sm">
                    Trade at <strong className={posSize.color}>{posSize.pct}% of your normal position size.</strong>
                    {posSize.pct < 100 && " Reduced size protects capital when psychological conditions are not optimal."}
                    {posSize.pct === 100 && " All conditions are optimal. Execute with full discipline — then leave it alone."}
                  </p>
                </div>
              </div>
            )}

            {verdict.status === "HARD_BLOCK" && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 space-y-2">
                <p className="text-sm font-semibold text-destructive">Why your brain wants to override this:</p>
                <p className="text-sm text-muted-foreground">
                  The survival brain perceives a blocked trade as losing control — which it interprets as a threat. The urge to override is the amygdala response, not rational thinking. Acknowledge it. Do not act on it.
                </p>
              </div>
            )}

            {(verdict.status === "TRADE" || verdict.status === "REDUCE_RISK") && submittedData && (
              <Button
                size="lg"
                className={`w-full h-14 text-lg font-bold ${verdict.status === "TRADE" ? "bg-green-600 hover:bg-green-700 text-white" : "border-amber-500/50 text-amber-400 hover:bg-amber-500/10"}`}
                variant={verdict.status === "REDUCE_RISK" ? "outline" : "default"}
                onClick={() => {
                  sessionStorage.setItem("pendingTrade", JSON.stringify(submittedData));
                  navigate("/execution");
                }}
              >
                <Crosshair className="h-5 w-5 mr-2" />
                {verdict.status === "TRADE" ? "Enter Active Trade Monitor →" : "Enter Monitor — Reduced Risk →"}
              </Button>
            )}

            <Button
              size="lg"
              variant={verdict.status === "HARD_BLOCK" || verdict.status === "NO_TRADE" ? "destructive" : "outline"}
              className="w-full h-12 text-base"
              onClick={() => { setVerdict(null); setPhase("BODY_SCAN"); setBodyScan({}); setRulesChecked({}); form.reset(); setSubmittedData(null); }}
            >
              {verdict.status === "TRADE" || verdict.status === "REDUCE_RISK" ? "← Run Another Check" : "Acknowledge & Reset"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "AMYGDALA_RESET") {
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-400">
        <div className="p-5 rounded-xl border-2 border-destructive/40 bg-destructive/5 space-y-3">
          <div className="flex items-center gap-3">
            <Zap className="h-6 w-6 text-destructive" />
            <h2 className="text-xl font-bold text-destructive">Amygdala Activation Detected</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your body scan detected <strong className="text-foreground">{hijackSignals} physical signals</strong> of emotional hijacking. Information is bypassing your thinking brain in nanoseconds.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">You cannot outthink this.</strong> You must regulate it through your body first. Diaphragmatic breathing directly activates the parasympathetic nervous system.
          </p>
        </div>
        <Card>
          <CardContent className="p-6">
            <BreathingReset onComplete={() => setPhase("RULES_CHECK")} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "RULES_CHECK") {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <ListChecks className="h-8 w-8 text-primary" /> Trade Gate
          </h1>
          <p className="text-muted-foreground mt-1">Step 2 of 3 — Rules Checklist</p>
        </div>

        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 flex gap-2">
          <Brain className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-primary">Your cortex-set rules. Every checkbox is a promise to your methodology. You cannot proceed until all are confirmed.</p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Confirm each rule applies to this trade:</p>
            <div className="space-y-3">
              {userRules.map((rule, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRulesChecked((prev) => ({ ...prev, [i]: !prev[i] }))}
                  className={`w-full text-left flex gap-3 items-start p-3.5 rounded-lg border transition-all ${
                    rulesChecked[i] ? "border-green-500/40 bg-green-500/5" : "border-border hover:border-border/80"
                  }`}
                >
                  <div className={`flex-shrink-0 mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${
                    rulesChecked[i] ? "border-green-500 bg-green-500/20" : "border-border"
                  }`}>
                    {rulesChecked[i] && <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />}
                  </div>
                  <p className={`text-sm leading-relaxed transition-colors ${rulesChecked[i] ? "text-foreground" : "text-muted-foreground"}`}>{rule}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button
          size="lg"
          className="w-full h-14 text-lg font-bold"
          disabled={!allRulesChecked}
          onClick={() => setPhase("MAIN_CHECK")}
        >
          {allRulesChecked ? "All rules confirmed — Proceed to Assessment →" : `Confirm all ${userRules.length} rules above`}
        </Button>
      </div>
    );
  }

  if (phase === "BODY_SCAN") {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" /> Trade Gate
          </h1>
          <p className="text-muted-foreground mt-1">Step 1 of 3 — Body Scan</p>
        </div>

        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
          <div className="flex items-start gap-2">
            <Brain className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">Your body detects emotional hijacking before your mind does</p>
              <p className="text-sm text-muted-foreground">
                The amygdala triggers physical responses in nanoseconds, before conscious awareness. Scan your body <em>now</em>. These signals reveal which brain is in control.
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">What is your body doing right now?</p>
            <div className="space-y-3">
              {BODY_SCAN_SIGNALS.map((signal) => (
                <div key={signal.id} className="space-y-2">
                  <p className="text-sm font-medium">{signal.label}</p>
                  <p className="text-xs text-muted-foreground">{signal.sub}</p>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setBodyScan((prev) => ({ ...prev, [signal.id]: true }))}
                      className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${bodyScan[signal.id] === true ? "border-destructive/50 bg-destructive/10 text-red-400" : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"}`}>
                      Yes — I notice this
                    </button>
                    <button type="button" onClick={() => setBodyScan((prev) => ({ ...prev, [signal.id]: false }))}
                      className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${bodyScan[signal.id] === false ? "border-green-500/50 bg-green-500/10 text-green-400" : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"}`}>
                      No — I am clear
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {allScanned && (
          <div className={`p-4 rounded-lg border animate-in fade-in duration-300 ${isHijacked ? "border-destructive/40 bg-destructive/5" : "border-green-500/40 bg-green-500/5"}`}>
            {isHijacked ? (
              <div className="flex gap-3 items-start">
                <Zap className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive">{hijackSignals} signals detected — Amygdala may be active</p>
                  <p className="text-sm text-muted-foreground mt-1">A breathing reset is required before your thinking brain can assess this trade. This is biology, not weakness.</p>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 items-start">
                <Eye className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-400">Body is calm — Thinking brain is online</p>
                  <p className="text-sm text-muted-foreground mt-1">No significant physical stress signals. Proceed to your rules checklist.</p>
                </div>
              </div>
            )}
          </div>
        )}

        <Button size="lg" className="w-full h-14 text-lg font-bold" disabled={!allScanned} onClick={handleBodyScanContinue}>
          {!allScanned ? "Complete all 4 signals above" : isHijacked ? "Start Breathing Reset →" : "Proceed to Rules Check →"}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-primary" /> Trade Gate
        </h1>
        <p className="text-muted-foreground mt-1">Step 3 of 3 — Psychological Assessment</p>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 p-3 rounded-lg bg-green-500/5 border border-green-500/20 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-green-400 flex-shrink-0" />
          <p className="text-sm text-green-400 font-medium">Body clear · Rules confirmed · Thinking brain engaged</p>
        </div>
        <div className="p-3 rounded-lg border border-border/50 bg-card/50 text-center flex-shrink-0 min-w-[80px]">
          <p className="text-xs text-muted-foreground mb-0.5">Live Score</p>
          <p className={`text-xl font-black font-mono ${liveScore >= 70 ? "text-primary" : liveScore >= 50 ? "text-amber-400" : "text-destructive"}`}>{liveScore}</p>
        </div>
      </div>

      <Card className="border-primary/20">
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="pair" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset / Pair</FormLabel>
                    <FormControl><Input placeholder="EURUSD" className="font-mono uppercase text-lg h-12" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="setupGrade" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Setup Grade</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 text-lg"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="A_PLUS">A+ — All criteria met, full confluence</SelectItem>
                        <SelectItem value="B">B — Good setup, minor flaw present</SelectItem>
                        <SelectItem value="C">C — Subpar, emotional / impulsive entry</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="psychState" render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Psychological State</FormLabel>
                  <p className="text-xs text-muted-foreground -mt-1 mb-2">Be honest. 95% of decisions are made by the subconscious brain. Name it accurately.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(["CALM", "FOCUSED", "URGE", "PRESSURE", "FEAR", "OVERCONFIDENT"] as const).map((state) => (
                      <button
                        key={state}
                        type="button"
                        onClick={() => field.onChange(state)}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all text-left ${
                          field.value === state
                            ? state === "CALM" || state === "FOCUSED"
                              ? "border-green-500/50 bg-green-500/10 text-green-400"
                              : "border-destructive/50 bg-destructive/10 text-red-400"
                            : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
                        }`}
                      >
                        <p className="font-semibold">{PSYCH_STATE_LABELS[state]}</p>
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {([
                  { name: "focusLevel" as const, label: "Focus Level", low: "Scattered", high: "Laser sharp", dangerBelow: 4 },
                  { name: "urgeLevel" as const, label: "Urge to Trade", low: "None", high: "Overwhelming", dangerAbove: 6 },
                  { name: "decisionClarity" as const, label: "Decision Clarity", low: "Confused", high: "Crystal clear", dangerBelow: 5 },
                  { name: "patience" as const, label: "Patience Level", low: "Need to act now", high: "Fully patient", dangerBelow: 5 },
                ]).map(({ name, label, low, high, dangerBelow, dangerAbove }) => (
                  <FormField key={name} control={form.control} name={name} render={({ field }) => {
                    const val = Array.isArray(field.value) ? field.value[0] : field.value;
                    const isDanger = dangerBelow !== undefined ? val < dangerBelow : dangerAbove !== undefined ? val > dangerAbove : false;
                    return (
                      <FormItem>
                        <div className="flex items-center justify-between mb-2">
                          <FormLabel>{label}</FormLabel>
                          <span className={`font-mono font-black text-xl ${isDanger ? "text-destructive" : "text-primary"}`}>{val}</span>
                        </div>
                        <FormControl>
                          <Slider min={1} max={10} step={1} value={[val]} onValueChange={(v) => field.onChange(v[0])}
                            className={isDanger ? "[&_.slider-thumb]:border-destructive" : ""} />
                        </FormControl>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>{low}</span><span>{high}</span>
                        </div>
                        {isDanger && (
                          <p className="text-xs text-destructive mt-1">
                            {dangerBelow !== undefined ? `⚠ Below ${dangerBelow} — may trigger block or risk reduction` : `⚠ Above ${dangerAbove} — may trigger block or risk reduction`}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }} />
                ))}
              </div>

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Trade Thesis (optional)</FormLabel>
                  <p className="text-xs text-muted-foreground -mt-1 mb-2">Articulate exactly why this is an edge. If you struggle to write it clearly, the clarity is not there.</p>
                  <FormControl>
                    <Textarea placeholder="e.g. Price broke above key resistance with strong momentum. Structure is bullish on H4. Entry at retest of breakout zone with clear invalidation below the level." className="resize-none text-sm font-mono" rows={3} {...field} />
                  </FormControl>
                </FormItem>
              )} />

              <Button type="submit" size="lg" className="w-full h-14 text-lg font-bold" disabled={submitCheck.isPending}>
                {submitCheck.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                Get Verdict
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
