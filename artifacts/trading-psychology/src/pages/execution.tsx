import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useGetCurrentSession,
  useCreateTrade,
  useUpdateTrade,
  getListTradesQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ShieldAlert, Loader2, Crosshair, Target, AlertOctagon, Wind,
  CheckCircle2, XCircle, Clock, TrendingUp, TrendingDown, Brain,
  Zap, Activity, Eye
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";

type Phase = "SETUP" | "LIVE" | "AMYGDALA_ALERT" | "VOLUNTARY_BREATHING" | "BRAIN_STATE_CHECK" | "DEBRIEF";
type InterferenceIntent = "CLOSE_EARLY" | "MOVE_SL" | "ADD_SIZE";
type BreathPhase = "INHALE" | "HOLD" | "EXHALE";

const INTERFERENCE_LABELS: Record<InterferenceIntent, { label: string; trigger: string }> = {
  CLOSE_EARLY: {
    label: "Close early",
    trigger: "Fear of losing a profit is the survival brain protecting its 'kill'. This is primal, not rational.",
  },
  MOVE_SL: {
    label: "Move your stop loss",
    trigger: "Moving a stop is the brain refusing to accept a small loss — it perceives capital loss as a threat to life.",
  },
  ADD_SIZE: {
    label: "Add to the position",
    trigger: "Adding size under emotional pressure is the overconfidence archetype hijacking risk management.",
  },
};

const MANTRAS = [
  "I trade the process, not the outcome.",
  "My edge only works if I let it play out completely.",
  "The plan was made with a clear cortex. Trust it.",
  "Emotions are information. They are not instructions.",
  "I am the variable. The market is not my enemy.",
  "An edge does not guarantee a win. It only requires execution.",
  "I do not manage trades. I manage risk.",
  "Calm is the goal, not safety. I can be calm in uncertainty.",
];

const BRAIN_SCIENCE = [
  "The urge to act IS the signal to wait. It means the survival brain is active.",
  "Your brain cannot tell the difference between losing money and losing your life.",
  "95% of trading decisions come from the subconscious emotional brain.",
  "The 'low road' fires in nanoseconds — your thinking brain is always slower.",
  "Fear cannot be sustained in a relaxed, diaphragmatically-breathing body.",
  "Discipline is a neural circuit. Repetition builds the insulation that makes it automatic.",
];

const tradeSchema = z.object({
  pair: z.string().min(1, "Required"),
  setupGrade: z.enum(["A_PLUS", "B", "C"]),
  direction: z.enum(["LONG", "SHORT"]),
  entryPrice: z.coerce.number().positive("Must be positive"),
  stopLoss: z.coerce.number().positive("Must be positive"),
  takeProfit: z.coerce.number().positive("Must be positive"),
});

type TradeDetails = z.infer<typeof tradeSchema> & { id: number };

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function calcRR(direction: string, entry: number, sl: number, tp: number): string {
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  if (risk === 0) return "—";
  return `1:${(reward / risk).toFixed(1)}`;
}

function DiaphragmaticBreathing({ cycles, onComplete }: { cycles: number; onComplete: () => void }) {
  const [breathPhase, setBreathPhase] = useState<BreathPhase>("INHALE");
  const [breathTimer, setBreathTimer] = useState(4);
  const [cyclesComplete, setCyclesComplete] = useState(0);
  const done = cyclesComplete >= cycles;

  useEffect(() => {
    if (done) return;
    const PHASES: { phase: BreathPhase; duration: number }[] = [
      { phase: "INHALE", duration: 4 },
      { phase: "HOLD", duration: 7 },
      { phase: "EXHALE", duration: 8 },
    ];
    let phaseIdx = 0;
    let remaining = PHASES[0].duration;
    setBreathPhase("INHALE");
    setBreathTimer(remaining);

    const interval = setInterval(() => {
      remaining -= 1;
      setBreathTimer(remaining);
      if (remaining <= 0) {
        phaseIdx = (phaseIdx + 1) % 3;
        if (phaseIdx === 0) setCyclesComplete((c) => c + 1);
        remaining = PHASES[phaseIdx].duration;
        setBreathPhase(PHASES[phaseIdx].phase);
        setBreathTimer(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [done, cycles]);

  const phaseColor = breathPhase === "INHALE" ? "text-blue-400 border-blue-400" : breathPhase === "HOLD" ? "text-primary border-primary" : "text-green-400 border-green-400";
  const scale = breathPhase === "INHALE" || breathPhase === "HOLD" ? "scale-110" : "scale-90";
  const phaseLabel = breathPhase === "INHALE" ? "Breathe In — belly rises" : breathPhase === "HOLD" ? "Hold" : "Breathe Out — belly falls";

  if (done) {
    return (
      <div className="flex flex-col items-center gap-6 py-4">
        <div className="h-32 w-32 rounded-full border-4 border-green-500 flex items-center justify-center">
          <ShieldAlert className="h-10 w-10 text-green-500" />
        </div>
        <p className="text-center font-semibold">Parasympathetic activated.<br /><span className="text-muted-foreground font-normal text-sm">Fear cannot sustain itself in a relaxed body.</span></p>
        <Button onClick={onComplete} className="px-12">Thinking Brain Check →</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className={`h-36 w-36 rounded-full border-4 transition-all duration-1000 flex items-center justify-center ${phaseColor} ${scale}`}>
        <div className="text-center">
          <p className={`text-5xl font-black font-mono ${phaseColor.split(" ")[0]}`}>{breathTimer}</p>
          <p className={`text-xs font-medium mt-1 ${phaseColor.split(" ")[0]}`}>{breathPhase}</p>
        </div>
      </div>
      <p className="text-sm font-medium text-center">{phaseLabel}</p>
      <div className="flex gap-2 items-center">
        {Array.from({ length: cycles }).map((_, i) => (
          <div key={i} className={`h-2 w-7 rounded-full transition-colors ${cyclesComplete > i ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>
    </div>
  );
}

export default function ActiveTradeMonitor() {
  const queryClient = useQueryClient();
  const { data: session, isLoading: isSessionLoading } = useGetCurrentSession();
  const [phase, setPhase] = useState<Phase>("SETUP");
  const [tradeDetails, setTradeDetails] = useState<TradeDetails | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [interferenceIntent, setInterferenceIntent] = useState<InterferenceIntent | null>(null);
  const [mantraIndex] = useState(() => Math.floor(Math.random() * MANTRAS.length));
  const [scienceIndex, setScienceIndex] = useState(0);
  const [brainStateAnswer, setBrainStateAnswer] = useState<"THINKING" | "EMOTIONAL" | null>(null);
  const [brainCheckNotes, setBrainCheckNotes] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scienceRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const createTrade = useCreateTrade();
  const updateTrade = useUpdateTrade();

  const form = useForm<z.infer<typeof tradeSchema>>({
    resolver: zodResolver(tradeSchema),
    defaultValues: { pair: "", setupGrade: "A_PLUS", direction: "LONG", entryPrice: 0, stopLoss: 0, takeProfit: 0 },
  });

  useEffect(() => {
    if (phase === "LIVE") {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      scienceRef.current = setInterval(() => setScienceIndex((i) => (i + 1) % BRAIN_SCIENCE.length), 18000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (scienceRef.current) clearInterval(scienceRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (scienceRef.current) clearInterval(scienceRef.current);
    };
  }, [phase]);

  const onLock = (values: z.infer<typeof tradeSchema>) => {
    if (!session) return;
    createTrade.mutate(
      { data: { ...values, sessionId: session.id } },
      {
        onSuccess: (data) => {
          setTradeDetails({ ...values, id: data.id });
          setElapsed(0);
          setPhase("LIVE");
          queryClient.invalidateQueries({ queryKey: getListTradesQueryKey() });
        },
      }
    );
  };

  const triggerInterference = (intent: InterferenceIntent) => {
    setInterferenceIntent(intent);
    setPhase("AMYGDALA_ALERT");
  };

  const onCloseDebrief = (values: { outcome: "WIN" | "LOSS" | "BREAKEVEN"; followedPlan: boolean; notes: string }) => {
    if (!tradeDetails) return;
    updateTrade.mutate(
      { id: tradeDetails.id, data: { outcome: values.outcome, followedPlan: values.followedPlan, notes: values.notes } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTradesQueryKey() });
          setPhase("SETUP");
          setTradeDetails(null);
          setBrainStateAnswer(null);
          setBrainCheckNotes("");
          form.reset();
        },
      }
    );
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

  if (phase === "VOLUNTARY_BREATHING") {
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-300 py-8">
        <div className="space-y-2 text-center">
          <Wind className="h-10 w-10 text-primary mx-auto" />
          <h2 className="text-2xl font-bold">Breathing Reset</h2>
          <p className="text-muted-foreground">Proactive parasympathetic activation. Keep the amygdala quiet before the urge escalates.</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <DiaphragmaticBreathing cycles={2} onComplete={() => setPhase("LIVE")} />
          </CardContent>
        </Card>
        <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setPhase("LIVE")}>
          Skip — return to monitor
        </Button>
      </div>
    );
  }

  if (phase === "AMYGDALA_ALERT" && interferenceIntent) {
    const info = INTERFERENCE_LABELS[interferenceIntent];
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-300 py-8">
        <div className="p-5 rounded-xl border-2 border-destructive/50 bg-destructive/5 space-y-4">
          <div className="flex items-center gap-3">
            <Zap className="h-7 w-7 text-destructive" />
            <div>
              <p className="text-xs text-destructive uppercase tracking-widest">Low Road Activated</p>
              <h2 className="text-xl font-bold text-destructive">Amygdala Alert</h2>
            </div>
          </div>
          <div className="space-y-2">
            <p className="font-semibold">You want to {info.label}.</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{info.trigger}</p>
          </div>
          <div className="pt-2 border-t border-destructive/20">
            <p className="text-sm text-muted-foreground leading-relaxed">
              This response travels from your thalamus directly to your amygdala in <strong className="text-foreground">nanoseconds</strong>, bypassing your thinking brain entirely. You cannot outthink it. You must regulate it through your body first.
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-center font-semibold mb-2">Diaphragmatic Breathing Reset</p>
            <p className="text-center text-sm text-muted-foreground mb-6">Belly breathing activates the vagus nerve and directly signals the brain to stand down from fight-or-flight. 2 cycles required.</p>
            <DiaphragmaticBreathing cycles={2} onComplete={() => setPhase("BRAIN_STATE_CHECK")} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "BRAIN_STATE_CHECK") {
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-300 py-8">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" /> Thinking Brain Check
          </h2>
          <p className="text-muted-foreground mt-1">After breathing, honestly assess: which brain is in control now?</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setBrainStateAnswer("THINKING")}
            className={`p-5 rounded-xl border-2 text-left space-y-2 transition-all ${brainStateAnswer === "THINKING" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
          >
            <Eye className="h-6 w-6 text-primary" />
            <p className="font-bold">Thinking Brain</p>
            <p className="text-xs text-muted-foreground">I am calm and objective. I can see this trade without needing a specific outcome.</p>
          </button>
          <button
            type="button"
            onClick={() => setBrainStateAnswer("EMOTIONAL")}
            className={`p-5 rounded-xl border-2 text-left space-y-2 transition-all ${brainStateAnswer === "EMOTIONAL" ? "border-destructive bg-destructive/10" : "border-border hover:border-destructive/50"}`}
          >
            <Zap className="h-6 w-6 text-destructive" />
            <p className="font-bold">Emotional Brain</p>
            <p className="text-xs text-muted-foreground">I still feel the urge strongly. My body is still activated. I need more time.</p>
          </button>
        </div>

        {brainStateAnswer === "EMOTIONAL" && (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 animate-in fade-in">
            <p className="text-sm font-semibold text-amber-400">Repeat the breathing. Then return to this check.</p>
            <p className="text-sm text-muted-foreground mt-1">The emotional brain is still dominant. Acting now would mean the survival brain is managing your trade, not your methodology.</p>
            <Button variant="outline" className="mt-3 w-full" onClick={() => setPhase("AMYGDALA_ALERT")}>
              <Wind className="h-4 w-4 mr-2" /> Breathe Again
            </Button>
          </div>
        )}

        {brainStateAnswer === "THINKING" && (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 animate-in fade-in space-y-3">
            <p className="text-sm font-semibold text-green-400">Cortex re-engaged. Now decide with clarity.</p>
            <p className="text-sm text-muted-foreground">You now have access to your probability-based mind. The interference urge was biological, not rational.</p>
            <div className="flex gap-3 pt-1">
              <Button
                className="flex-1 bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30"
                variant="outline"
                onClick={() => setPhase("LIVE")}
              >
                ✓ Stay in trade — let it run
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => setPhase("DEBRIEF")}
              >
                Close trade — still want to exit
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (phase === "DEBRIEF") {
    return (
      <DebriefPhase
        trade={tradeDetails!}
        elapsed={elapsed}
        onSubmit={onCloseDebrief}
        isPending={updateTrade.isPending}
      />
    );
  }

  if (phase === "LIVE" && tradeDetails) {
    const rr = calcRR(tradeDetails.direction, tradeDetails.entryPrice, tradeDetails.stopLoss, tradeDetails.takeProfit);

    return (
      <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Target className="h-5 w-5 text-primary" />
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
            </div>
            <Badge variant="outline" className="text-primary border-primary/40 bg-primary/10 font-mono px-3 py-1 tracking-widest text-xs">
              LIVE TRADE
            </Badge>
            <div className="flex items-center gap-2 text-muted-foreground font-mono">
              <Clock className="h-4 w-4" />
              <span className="text-lg font-bold text-foreground">{formatDuration(elapsed)}</span>
            </div>
          </div>
          <Button variant="outline" size="sm" className="text-muted-foreground" onClick={() => setPhase("DEBRIEF")}>
            Close Trade
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-5 flex-1">
          <div className="space-y-4">
            <div className="p-5 rounded-xl border border-border bg-card/50">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Locked Trade</p>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl font-black font-mono">{tradeDetails.pair.toUpperCase()}</span>
                <Badge className={tradeDetails.direction === "LONG" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-destructive/20 text-red-400 border-destructive/30"}>
                  {tradeDetails.direction === "LONG" ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {tradeDetails.direction}
                </Badge>
                <Badge variant="outline" className="font-mono text-xs">R:R {rr}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground mb-1">Entry</p>
                  <p className="font-mono font-bold text-sm">{tradeDetails.entryPrice}</p>
                </div>
                <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-xs text-muted-foreground mb-1">Stop</p>
                  <p className="font-mono font-bold text-sm text-red-400">{tradeDetails.stopLoss}</p>
                </div>
                <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-muted-foreground mb-1">Target</p>
                  <p className="font-mono font-bold text-sm text-green-400">{tradeDetails.takeProfit}</p>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-primary/20 bg-primary/5">
              <p className="text-xs text-primary uppercase tracking-widest mb-2">Your Anchor</p>
              <p className="text-lg font-semibold leading-relaxed">"{MANTRAS[mantraIndex]}"</p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card/50">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Brain Science</p>
              <p className="text-sm text-muted-foreground leading-relaxed italic transition-all duration-500">→ {BRAIN_SCIENCE[scienceIndex]}</p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card/50">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Feeling the urge to interfere?</p>
              <div className="space-y-2">
                {(["CLOSE_EARLY", "MOVE_SL", "ADD_SIZE"] as InterferenceIntent[]).map((intent) => (
                  <Button
                    key={intent}
                    variant="outline"
                    className="w-full justify-start h-10 text-sm text-destructive border-destructive/20 hover:bg-destructive/10"
                    onClick={() => triggerInterference(intent)}
                  >
                    <Zap className="h-4 w-4 mr-2 flex-shrink-0" />
                    I want to {INTERFERENCE_LABELS[intent].label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-xl border border-destructive/20 bg-destructive/5 space-y-4">
              <p className="text-xs text-destructive uppercase tracking-widest">Locked Rules — Non-Negotiable</p>
              {[
                { rule: "Do NOT move your stop loss", sub: "You defined your risk with your thinking brain. Honor it." },
                { rule: "Do NOT close early", sub: "Your edge is a probability over many trades. This is one sample." },
                { rule: "Do NOT add to the position", sub: "Adding size under pressure is the survival brain gambling." },
                { rule: "Do NOT stare at the chart", sub: "Close it. The market does not know your P&L." },
              ].map(({ rule, sub }) => (
                <div key={rule} className="flex gap-3 items-start">
                  <AlertOctagon className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">{rule}</p>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/50">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">The Probability-Based Mind</p>
              <div className="space-y-3">
                {[
                  ["Your job is done.", "You found the edge, sized correctly, placed the stop. Nothing remains."],
                  ["This is one sample.", "A single trade has no statistical meaning. Only process does."],
                  ["Calm is the goal.", "Not safety. Not certainty. Just calm in the uncertainty."],
                  ["The outcome is not yours.", "Only the execution is. You have already executed."],
                ].map(([title, body]) => (
                  <div key={title}>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="text-xs text-muted-foreground">{body}</p>
                  </div>
                ))}
              </div>
            </div>

            <Button
              size="lg"
              variant="outline"
              className="w-full h-12 border-primary/30 hover:border-primary hover:bg-primary/10"
              onClick={() => setPhase("VOLUNTARY_BREATHING")}
            >
              <Wind className="h-5 w-5 mr-2" /> Breathing Reset
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Crosshair className="h-8 w-8 text-primary" /> Active Trade Monitor
        </h1>
        <p className="text-muted-foreground mt-1">Lock in the plan. Then let your methodology work.</p>
      </div>

      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 flex gap-2">
        <Brain className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-sm text-primary">Once locked, this screen becomes your psychological anchor. The system protects your thinking brain from the survival brain's interference.</p>
      </div>

      <Card className="border-primary/20">
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onLock)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="pair" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset / Pair</FormLabel>
                    <FormControl><Input placeholder="EURUSD" className="font-mono uppercase h-12 text-lg" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="direction" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Direction</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 font-bold text-base"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="LONG" className="font-bold text-green-500">↑ LONG</SelectItem>
                        <SelectItem value="SHORT" className="font-bold text-red-500">↓ SHORT</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="setupGrade" render={({ field }) => (
                <FormItem>
                  <FormLabel>Setup Grade</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="A_PLUS">A+ — All criteria met. Probability edge confirmed.</SelectItem>
                      <SelectItem value="B">B — Good setup, minor flaw (proceed with caution)</SelectItem>
                      <SelectItem value="C">C — Impulsive / emotional entry (you should not be here)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="entryPrice" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entry</FormLabel>
                    <FormControl><Input type="number" step="any" className="font-mono bg-secondary/30" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="stopLoss" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-red-400">Stop Loss</FormLabel>
                    <FormControl><Input type="number" step="any" className="font-mono bg-destructive/10 border-destructive/30" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="takeProfit" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-green-400">Take Profit</FormLabel>
                    <FormControl><Input type="number" step="any" className="font-mono bg-green-500/10 border-green-500/30" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <Button type="submit" size="lg" className="w-full h-14 text-lg font-bold tracking-wider" disabled={createTrade.isPending}>
                {createTrade.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : "LOCK IN & ENTER MONITOR"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

function DebriefPhase({
  trade,
  elapsed,
  onSubmit,
  isPending,
}: {
  trade: TradeDetails;
  elapsed: number;
  onSubmit: (v: { outcome: "WIN" | "LOSS" | "BREAKEVEN"; followedPlan: boolean; notes: string }) => void;
  isPending: boolean;
}) {
  const [outcome, setOutcome] = useState<"WIN" | "LOSS" | "BREAKEVEN" | null>(null);
  const [followedPlan, setFollowedPlan] = useState<boolean | null>(null);
  const [notes, setNotes] = useState("");

  const canSubmit = outcome !== null && followedPlan !== null;

  return (
    <div className="max-w-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 py-8">
      <div>
        <h1 className="text-3xl font-bold">Post-Trade Debrief</h1>
        <p className="text-muted-foreground mt-1">
          {trade.pair.toUpperCase()} · {formatDuration(elapsed)} · {trade.direction}
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <p className="font-semibold">1. Outcome?</p>
          <div className="grid grid-cols-3 gap-3">
            {(["WIN", "LOSS", "BREAKEVEN"] as const).map((o) => {
              const styles = o === "WIN" ? "text-green-400 border-green-500/40 bg-green-500/10" : o === "LOSS" ? "text-red-400 border-destructive/40 bg-destructive/10" : "text-amber-400 border-amber-500/40 bg-amber-500/10";
              return (
                <button key={o} type="button" onClick={() => setOutcome(o)}
                  className={`p-4 rounded-xl border-2 font-bold text-lg transition-all ${outcome === o ? styles + " scale-105" : "border-border bg-card/50 text-muted-foreground hover:border-border/80"}`}>
                  {o}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <p className="font-semibold">2. Did you execute without emotional interference?</p>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setFollowedPlan(true)}
              className={`p-4 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all ${followedPlan === true ? "border-green-500/40 bg-green-500/10 text-green-400 scale-105" : "border-border bg-card/50 text-muted-foreground hover:border-border/80"}`}>
              <CheckCircle2 className="h-5 w-5" /> Yes — Ruler held
            </button>
            <button type="button" onClick={() => setFollowedPlan(false)}
              className={`p-4 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all ${followedPlan === false ? "border-destructive/40 bg-destructive/10 text-red-400 scale-105" : "border-border bg-card/50 text-muted-foreground hover:border-border/80"}`}>
              <XCircle className="h-5 w-5" /> No — Caveman took over
            </button>
          </div>
        </div>

        {followedPlan === false && (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 animate-in fade-in">
            <p className="text-sm font-semibold text-amber-400">Important — this is data, not failure</p>
            <p className="text-sm text-muted-foreground mt-1">Interference is your survival brain operating normally. The goal is to identify the trigger so you can intercept it earlier next time. What happened?</p>
          </div>
        )}

        <div className="space-y-2">
          <p className="font-semibold">3. What did your internal emotional state do? <span className="text-muted-foreground font-normal text-sm">(optional)</span></p>
          <p className="text-xs text-muted-foreground">Name the emotion, the physical sensation, and the thought. This builds self-awareness over many trades.</p>
          <Textarea
            placeholder="e.g. Felt chest tightness at -15 pips. Brain said 'it won't recover.' Held anyway — it did. / Urge to close at +20 pips overwhelmed me. Closed early. Hit +60."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="resize-none h-24 font-mono text-sm"
          />
        </div>
      </div>

      <Button size="lg" className="w-full h-14 text-lg font-bold" disabled={!canSubmit || isPending}
        onClick={() => outcome && followedPlan !== null && onSubmit({ outcome, followedPlan, notes })}>
        {isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : "Complete Debrief"}
      </Button>
    </div>
  );
}
