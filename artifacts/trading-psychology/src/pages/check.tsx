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
import {
  AlertTriangle, ShieldCheck, ShieldAlert, Ban, Loader2, Wind,
  Brain, Zap, Activity, Eye
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

type Phase = "BODY_SCAN" | "AMYGDALA_RESET" | "MAIN_CHECK" | "VERDICT";
type CheckResultVerdict = "TRADE" | "REDUCE_RISK" | "NO_TRADE" | "HARD_BLOCK";
type BreathPhase = "INHALE" | "HOLD" | "EXHALE";

const BODY_SCAN_SIGNALS = [
  {
    id: "breath",
    label: "I am holding my breath or breathing shallowly",
    sub: "Breath-holding is the body's first response to perceived danger",
  },
  {
    id: "tension",
    label: "My jaw, shoulders, or chest feel tight or tense",
    sub: "Muscle tension is the body preparing for fight or flight",
  },
  {
    id: "heartrate",
    label: "My heart rate is elevated or I feel a physical urgency",
    sub: "Elevated arousal signals the amygdala is scanning for threat",
  },
  {
    id: "fixation",
    label: "I feel mentally fixated on this trade — I need it to work",
    sub: "Fixation is the survival brain trying to control an uncontrollable outcome",
  },
];

const checkSchema = z.object({
  pair: z.string().min(1, "Pair is required"),
  setupGrade: z.enum(["A_PLUS", "B", "C"]),
  psychState: z.enum(["CALM", "FOCUSED", "URGE", "PRESSURE", "FEAR", "OVERCONFIDENT"]),
  focusLevel: z.number().min(1).max(10),
  urgeLevel: z.number().min(1).max(10),
  decisionClarity: z.number().min(1).max(10),
});

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
            if (next >= TARGET_CYCLES) {
              clearInterval(interval);
            }
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
          Breathe from your belly, not your chest. This directly activates your parasympathetic nervous system and disengages the amygdala.
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
            <p className="text-sm text-muted-foreground">Fear cannot be sustained in a relaxed body. You may now proceed to assessment.</p>
          </div>
          <Button size="lg" className="px-12" onClick={onComplete}>
            Continue to Trade Gate →
          </Button>
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
  const { data: session, isLoading: isSessionLoading } = useGetCurrentSession();
  const [phase, setPhase] = useState<Phase>("BODY_SCAN");
  const [bodyScan, setBodyScan] = useState<Record<string, boolean>>({});
  const [verdict, setVerdict] = useState<{ status: CheckResultVerdict; reason: string | null } | null>(null);

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
    },
  });

  const onSubmit = (values: z.infer<typeof checkSchema>) => {
    if (!session) return;
    submitCheck.mutate(
      { data: { ...values, sessionId: session.id } },
      {
        onSuccess: (data) => {
          setVerdict({ status: data.verdict, reason: data.verdictReason || null });
          setPhase("VERDICT");
          queryClient.invalidateQueries({ queryKey: getListChecksQueryKey({ sessionId: session.id }) });
        },
      }
    );
  };

  const hijackSignals = Object.values(bodyScan).filter(Boolean).length;
  const isHijacked = hijackSignals >= 2;

  const handleBodyScanContinue = () => {
    if (isHijacked) {
      setPhase("AMYGDALA_RESET");
    } else {
      setPhase("MAIN_CHECK");
    }
  };

  const allScanned = BODY_SCAN_SIGNALS.every((s) => bodyScan[s.id] !== undefined);

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

  if (phase === "VERDICT" && verdict) {
    return (
      <div className="flex items-center justify-center h-[80vh] animate-in zoom-in-95 duration-300">
        <Card className={`w-full max-w-2xl overflow-hidden border-2 ${
          verdict.status === "TRADE" ? "border-green-500/50 bg-green-500/5" :
          verdict.status === "REDUCE_RISK" ? "border-amber-500/50 bg-amber-500/5" :
          verdict.status === "NO_TRADE" ? "border-destructive/50 bg-destructive/5" :
          "border-destructive shadow-[0_0_50px_rgba(239,68,68,0.3)] bg-destructive/10"
        }`}>
          <div className={`h-3 w-full ${verdict.status === "TRADE" ? "bg-green-500" : verdict.status === "REDUCE_RISK" ? "bg-amber-500" : "bg-destructive"}`} />
          <CardContent className="p-10 text-center space-y-8">
            <div className="flex justify-center">
              {verdict.status === "TRADE" && <ShieldCheck className="h-20 w-20 text-green-500" />}
              {verdict.status === "REDUCE_RISK" && <AlertTriangle className="h-20 w-20 text-amber-500" />}
              {verdict.status === "NO_TRADE" && <Ban className="h-20 w-20 text-destructive" />}
              {verdict.status === "HARD_BLOCK" && <ShieldAlert className="h-20 w-20 text-destructive animate-pulse" />}
            </div>

            <div className="space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">System Verdict</p>
              <h1 className="text-5xl font-black tracking-tight uppercase">
                {verdict.status.replace("_", " ")}
              </h1>
              {verdict.reason && (
                <p className="text-lg text-muted-foreground mt-3 leading-relaxed">{verdict.reason}</p>
              )}
            </div>

            {verdict.status === "HARD_BLOCK" && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-left space-y-2">
                <p className="text-sm font-semibold text-destructive">Why your brain wants to override this:</p>
                <p className="text-sm text-muted-foreground">
                  The survival brain perceives the blocked trade as losing control — which it interprets as a threat to life. The urge to override is the amygdala response, not rational thinking. Acknowledge it. Do not act on it.
                </p>
              </div>
            )}

            <Button
              size="lg"
              variant={verdict.status === "HARD_BLOCK" ? "destructive" : "default"}
              className="w-full h-14 text-lg"
              onClick={() => { setVerdict(null); setPhase("BODY_SCAN"); setBodyScan({}); form.reset(); }}
            >
              Acknowledge & Reset
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
            Your body scan detected <strong className="text-foreground">{hijackSignals} physical signals</strong> of emotional hijacking. The "low road" neurological pathway may be active — information is bypassing your thinking brain and going directly to the amygdala in nanoseconds.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">You cannot outthink this.</strong> You must regulate it through your body first. Diaphragmatic breathing directly activates the parasympathetic nervous system and interrupts the stress response before it reaches full fight-or-flight.
          </p>
        </div>
        <Card>
          <CardContent className="p-6">
            <BreathingReset onComplete={() => setPhase("MAIN_CHECK")} />
          </CardContent>
        </Card>
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
          <p className="text-muted-foreground mt-1">Step 1 of 2 — Body Scan</p>
        </div>

        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
          <div className="flex items-start gap-2">
            <Brain className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">Your body detects emotional hijacking before your mind does</p>
              <p className="text-sm text-muted-foreground">
                The amygdala triggers physical responses — breath-holding, muscle tension, elevated heart rate — in nanoseconds, before conscious awareness. Scan your body <em>now</em>. These signals reveal which brain is in control.
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
                    <button
                      type="button"
                      onClick={() => setBodyScan((prev) => ({ ...prev, [signal.id]: true }))}
                      className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${bodyScan[signal.id] === true ? "border-destructive/50 bg-destructive/10 text-red-400" : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"}`}
                    >
                      Yes — I notice this
                    </button>
                    <button
                      type="button"
                      onClick={() => setBodyScan((prev) => ({ ...prev, [signal.id]: false }))}
                      className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${bodyScan[signal.id] === false ? "border-green-500/50 bg-green-500/10 text-green-400" : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"}`}
                    >
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
                  <p className="text-sm text-muted-foreground mt-1">A breathing reset is required before your thinking brain can assess this trade accurately. This is biology, not weakness.</p>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 items-start">
                <Eye className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-400">Body is calm — Thinking brain is online</p>
                  <p className="text-sm text-muted-foreground mt-1">No significant physical stress signals. You are likely operating from your cortex. Proceed to assessment.</p>
                </div>
              </div>
            )}
          </div>
        )}

        <Button
          size="lg"
          className="w-full h-14 text-lg font-bold"
          disabled={!allScanned}
          onClick={handleBodyScanContinue}
        >
          {!allScanned ? "Complete all 4 signals above" : isHijacked ? "Start Breathing Reset →" : "Proceed to Assessment →"}
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
        <p className="text-muted-foreground mt-1">Step 2 of 2 — Psychological & Setup Assessment</p>
      </div>

      <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-green-400 flex-shrink-0" />
        <p className="text-sm text-green-400 font-medium">Body scan clear — thinking brain engaged. Proceed with clarity.</p>
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
                        <SelectItem value="A_PLUS">A+ — All criteria met, high confluence</SelectItem>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CALM">Calm & Objective — cortex in control</SelectItem>
                      <SelectItem value="FOCUSED">Highly Focused — sharp, present</SelectItem>
                      <SelectItem value="URGE">Urge to Trade — survival brain pushing</SelectItem>
                      <SelectItem value="PRESSURE">Feeling Pressure — must make money</SelectItem>
                      <SelectItem value="FEAR">Fearful / Hesitant — amygdala scanning</SelectItem>
                      <SelectItem value="OVERCONFIDENT">Overconfident — ego inflated</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="space-y-8 pt-4 border-t">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Cognitive State — Rate honestly</p>

                <FormField control={form.control} name="focusLevel" render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <FormLabel className="text-base">Focus Level</FormLabel>
                        <p className="text-xs text-muted-foreground">Can you observe the chart without bias?</p>
                      </div>
                      <span className="font-mono text-2xl text-primary font-bold">{field.value}</span>
                    </div>
                    <FormControl>
                      <Slider min={1} max={10} step={1} defaultValue={[field.value]} onValueChange={(v) => field.onChange(v[0])} className="py-4" />
                    </FormControl>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Distracted / scattered</span>
                      <span>Laser focused</span>
                    </div>
                  </FormItem>
                )} />

                <FormField control={form.control} name="urgeLevel" render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <FormLabel className="text-base">Urge to Execute</FormLabel>
                        <p className="text-xs text-muted-foreground">A high urge = survival brain demanding action</p>
                      </div>
                      <span className={`font-mono text-2xl font-bold ${field.value >= 8 ? "text-destructive" : field.value >= 5 ? "text-amber-500" : "text-green-400"}`}>{field.value}</span>
                    </div>
                    <FormControl>
                      <Slider min={1} max={10} step={1} defaultValue={[field.value]} onValueChange={(v) => field.onChange(v[0])} className="py-4" />
                    </FormControl>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Patient — waiting for edge</span>
                      <span className="text-destructive">Compelled — must trade</span>
                    </div>
                  </FormItem>
                )} />

                <FormField control={form.control} name="decisionClarity" render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <FormLabel className="text-base">Decision Clarity</FormLabel>
                        <p className="text-xs text-muted-foreground">Is this logic or is your brain creating a story to justify action?</p>
                      </div>
                      <span className="font-mono text-2xl text-green-500 font-bold">{field.value}</span>
                    </div>
                    <FormControl>
                      <Slider min={1} max={10} step={1} defaultValue={[field.value]} onValueChange={(v) => field.onChange(v[0])} className="py-4" />
                    </FormControl>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Uncertain / story-making</span>
                      <span>Absolutely clear</span>
                    </div>
                  </FormItem>
                )} />
              </div>

              <Button type="submit" size="lg" className="w-full h-14 text-lg font-bold tracking-wider" disabled={submitCheck.isPending}>
                {submitCheck.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : "Request Verdict"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
