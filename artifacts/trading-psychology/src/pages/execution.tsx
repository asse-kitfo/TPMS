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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ShieldAlert, Loader2, Crosshair, Target, AlertOctagon, Wind,
  CheckCircle2, XCircle, Clock, TrendingUp, TrendingDown, Brain
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

type Phase = "SETUP" | "LIVE" | "BREATHING" | "DEBRIEF";
type InterferenceIntent = "CLOSE_EARLY" | "MOVE_SL" | "ADD_SIZE";
type BreathPhase = "INHALE" | "HOLD" | "EXHALE";

const MANTRAS = [
  "I trade the process, not the outcome.",
  "My edge only works if I let it play out.",
  "The plan was made with a clear mind. Trust it.",
  "Emotions are information, not instructions.",
  "I am the variable. The market is not.",
  "Discipline today compounds into results tomorrow.",
  "I do not manage trades. I manage risk.",
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

export default function ActiveTradeMonitor() {
  const queryClient = useQueryClient();
  const { data: session, isLoading: isSessionLoading } = useGetCurrentSession();
  const [phase, setPhase] = useState<Phase>("SETUP");
  const [tradeDetails, setTradeDetails] = useState<TradeDetails | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [interferenceIntent, setInterferenceIntent] = useState<InterferenceIntent | null>(null);
  const [breathPhase, setBreathPhase] = useState<BreathPhase>("INHALE");
  const [breathCount, setBreathCount] = useState(0);
  const [breathTimer, setBreathTimer] = useState(4);
  const [mantraIndex] = useState(() => Math.floor(Math.random() * MANTRAS.length));
  const [emotionNote, setEmotionNote] = useState("");
  const [followedRules, setFollowedRules] = useState<boolean | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const createTrade = useCreateTrade();
  const updateTrade = useUpdateTrade();

  const form = useForm<z.infer<typeof tradeSchema>>({
    resolver: zodResolver(tradeSchema),
    defaultValues: { pair: "", setupGrade: "A_PLUS", direction: "LONG", entryPrice: 0, stopLoss: 0, takeProfit: 0 },
  });

  useEffect(() => {
    if (phase === "LIVE") {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  useEffect(() => {
    if (phase !== "BREATHING") return;
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
          setBreathCount((c) => {
            if (c + 1 >= 2) {
              clearInterval(interval);
              setTimeout(() => setPhase("LIVE"), 500);
              return c + 1;
            }
            return c + 1;
          });
        }
        remaining = PHASES[phaseIdx].duration;
        setBreathPhase(PHASES[phaseIdx].phase);
        setBreathTimer(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
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
    setBreathCount(0);
    setBreathPhase("INHALE");
    setBreathTimer(4);
    setPhase("BREATHING");
  };

  const onCloseDebrief = (values: { outcome: "WIN" | "LOSS" | "BREAKEVEN"; followedPlan: boolean; notes: string }) => {
    if (!tradeDetails) return;
    updateTrade.mutate(
      {
        id: tradeDetails.id,
        data: { outcome: values.outcome, followedPlan: values.followedPlan, notes: values.notes },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTradesQueryKey() });
          setPhase("SETUP");
          setTradeDetails(null);
          setFollowedRules(null);
          setEmotionNote("");
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

  if (phase === "BREATHING") {
    const label = breathPhase === "INHALE" ? "Breathe In" : breathPhase === "HOLD" ? "Hold" : "Breathe Out";
    const color = breathPhase === "INHALE" ? "text-blue-400" : breathPhase === "HOLD" ? "text-primary" : "text-green-400";
    const intentLabel = interferenceIntent === "CLOSE_EARLY" ? "close early" : interferenceIntent === "MOVE_SL" ? "move your stop" : "add to position";

    return (
      <div className="flex flex-col items-center justify-center h-[85vh] text-center space-y-12 animate-in fade-in duration-500">
        <div className="space-y-3">
          <Wind className="h-12 w-12 text-blue-400 mx-auto" />
          <h1 className="text-3xl font-bold">Before you {intentLabel}…</h1>
          <p className="text-muted-foreground text-lg">Complete 2 breathing cycles. Your decision can wait.</p>
        </div>

        <div className="relative flex items-center justify-center">
          <div className={`w-48 h-48 rounded-full border-4 ${breathPhase === "INHALE" ? "border-blue-400 scale-110" : breathPhase === "HOLD" ? "border-primary scale-110" : "border-green-400 scale-95"} transition-all duration-1000 flex items-center justify-center`}>
            <div className="text-center">
              <p className={`text-5xl font-black font-mono ${color}`}>{breathTimer}</p>
              <p className={`text-sm font-medium mt-1 ${color}`}>{label}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {[0, 1].map((i) => (
            <div key={i} className={`h-2 w-8 rounded-full transition-colors ${breathCount > i ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <p className="text-lg text-muted-foreground italic max-w-md">"{MANTRAS[mantraIndex]}"</p>

        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setPhase("LIVE")}>
          Skip — I am in control
        </Button>
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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Target className="h-6 w-6 text-primary" />
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

        <div className="grid md:grid-cols-2 gap-6 flex-1">
          <div className="space-y-4">
            <div className="p-5 rounded-xl border border-border bg-card/50">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Your Trade</p>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl font-black font-mono">{tradeDetails.pair.toUpperCase()}</span>
                <Badge className={tradeDetails.direction === "LONG" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-destructive/20 text-red-400 border-destructive/30"}>
                  {tradeDetails.direction === "LONG" ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  {tradeDetails.direction}
                </Badge>
                <Badge variant="outline" className="font-mono text-xs">R:R {rr}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 rounded-lg bg-secondary/30">
                  <p className="text-xs text-muted-foreground mb-1">Entry</p>
                  <p className="font-mono font-bold">{tradeDetails.entryPrice}</p>
                </div>
                <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-xs text-muted-foreground mb-1">Stop Loss</p>
                  <p className="font-mono font-bold text-red-400">{tradeDetails.stopLoss}</p>
                </div>
                <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-muted-foreground mb-1">Take Profit</p>
                  <p className="font-mono font-bold text-green-400">{tradeDetails.takeProfit}</p>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-primary/20 bg-primary/5">
              <p className="text-xs text-primary uppercase tracking-widest mb-3">Your Anchor</p>
              <p className="text-xl font-semibold leading-relaxed">
                "{MANTRAS[mantraIndex]}"
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border bg-card/50">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Feeling the urge to interfere?</p>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { intent: "CLOSE_EARLY" as InterferenceIntent, label: "I want to close early" },
                  { intent: "MOVE_SL" as InterferenceIntent, label: "I want to move my stop" },
                  { intent: "ADD_SIZE" as InterferenceIntent, label: "I want to add to position" },
                ].map(({ intent, label }) => (
                  <Button
                    key={intent}
                    variant="outline"
                    className="justify-start h-10 text-destructive border-destructive/20 hover:bg-destructive/10 hover:border-destructive/40"
                    onClick={() => triggerInterference(intent)}
                  >
                    <AlertOctagon className="h-4 w-4 mr-2 flex-shrink-0" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-xl border border-destructive/20 bg-destructive/5 space-y-4">
              <p className="text-xs text-destructive uppercase tracking-widest">Your Locked Rules</p>
              {[
                { rule: "Do NOT move your stop loss", sub: "You defined your risk. Accept it." },
                { rule: "Do NOT close early", sub: "Your edge requires full execution." },
                { rule: "Do NOT add to the position", sub: "Stick to the plan you made." },
                { rule: "Do NOT stare at the chart", sub: "Close it. Let the trade breathe." },
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
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">Psychology Truth</p>
              <div className="space-y-3">
                {[
                  "The urge to act IS the signal to wait.",
                  "Every early close robs you of the edge you earned.",
                  "The market does not know your P&L.",
                  "Fear of profit is ego protecting itself.",
                ].map((truth, i) => (
                  <div key={i} className="flex gap-2 text-sm text-muted-foreground">
                    <span className="text-primary font-bold flex-shrink-0">→</span>
                    <span>{truth}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              size="lg"
              variant="outline"
              className="w-full h-14 text-lg border-2 border-primary/30 hover:border-primary hover:bg-primary/10"
              onClick={() => {
                setBreathCount(0);
                setInterferenceIntent(null);
                setPhase("BREATHING");
              }}
            >
              <Wind className="h-5 w-5 mr-2" />
              Breathing Reset
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
        <p className="text-muted-foreground mt-1">Lock in your trade. Then step away and trust the process.</p>
      </div>

      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-sm text-primary flex gap-2">
        <Brain className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <span>Once locked, the system becomes your psychological anchor. No interference allowed.</span>
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
                        <SelectTrigger className="h-12 font-bold text-base">
                          <SelectValue />
                        </SelectTrigger>
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
                  <FormLabel>Setup Grade — only A+ is allowed</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="A_PLUS">A+ — Perfect setup, all criteria met</SelectItem>
                      <SelectItem value="B">B — Good but minor flaw (proceed with caution)</SelectItem>
                      <SelectItem value="C">C — Subpar / impulsive (you should NOT be here)</SelectItem>
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
          <p className="font-semibold">1. What was the outcome?</p>
          <div className="grid grid-cols-3 gap-3">
            {([["WIN", "text-green-400 border-green-500/40 bg-green-500/10"], ["LOSS", "text-red-400 border-destructive/40 bg-destructive/10"], ["BREAKEVEN", "text-amber-400 border-amber-500/40 bg-amber-500/10"]] as const).map(([o, cls]) => (
              <button
                key={o}
                type="button"
                onClick={() => setOutcome(o)}
                className={`p-4 rounded-xl border-2 font-bold text-lg transition-all ${outcome === o ? cls + " scale-105" : "border-border bg-card/50 text-muted-foreground hover:border-border/80"}`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="font-semibold">2. Did you follow your rules?</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFollowedPlan(true)}
              className={`p-4 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all ${followedPlan === true ? "border-green-500/40 bg-green-500/10 text-green-400 scale-105" : "border-border bg-card/50 text-muted-foreground hover:border-border/80"}`}
            >
              <CheckCircle2 className="h-5 w-5" /> Yes, fully
            </button>
            <button
              type="button"
              onClick={() => setFollowedPlan(false)}
              className={`p-4 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all ${followedPlan === false ? "border-destructive/40 bg-destructive/10 text-red-400 scale-105" : "border-border bg-card/50 text-muted-foreground hover:border-border/80"}`}
            >
              <XCircle className="h-5 w-5" /> No, I interfered
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <p className="font-semibold">3. One sentence — what happened psychologically? <span className="text-muted-foreground font-normal">(optional)</span></p>
          <Textarea
            placeholder="e.g. Felt fear when price pulled back, held anyway. Urge to close at -5 was strong."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="resize-none h-20 font-mono text-sm"
          />
        </div>
      </div>

      <Button
        size="lg"
        className="w-full h-14 text-lg font-bold"
        disabled={!canSubmit || isPending}
        onClick={() => outcome && followedPlan !== null && onSubmit({ outcome, followedPlan, notes })}
      >
        {isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : "Complete Debrief"}
      </Button>
    </div>
  );
}
