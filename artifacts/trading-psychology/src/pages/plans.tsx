import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSetupPlans,
  useCreateSetupPlan,
  useDeleteSetupPlan,
  getListSetupPlansQueryKey,
  type SetupPlan,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BookMarked, Plus, Trash2, Clock, TrendingUp, TrendingDown, Minus,
  Loader2, AlertTriangle, Brain, CheckCircle2, XCircle, Eye
} from "lucide-react";

const GRADE_LABELS: Record<string, string> = {
  A_PLUS: "A+ — Full confluence",
  B: "B — Minor flaw",
  C: "C — Subpar",
};

const DIR_ICONS: Record<string, React.ReactNode> = {
  LONG: <TrendingUp className="h-3.5 w-3.5 text-green-400" />,
  SHORT: <TrendingDown className="h-3.5 w-3.5 text-red-400" />,
  NEUTRAL: <Minus className="h-3.5 w-3.5 text-muted-foreground" />,
};

const planSchema = z.object({
  asset: z.string().min(1, "Asset required"),
  direction: z.enum(["LONG", "SHORT", "NEUTRAL"]),
  entryZone: z.string().min(1, "Entry zone required"),
  stopLoss: z.string().min(1, "Stop loss required"),
  takeProfit: z.string().min(1, "Take profit required"),
  setupGrade: z.enum(["A_PLUS", "B", "C"]),
  thesis: z.string().min(10, "Thesis must be at least 10 characters"),
  invalidationCondition: z.string().min(5, "Invalidation condition required"),
  expiresInHours: z.number().min(1).max(72),
});

function formatTimeRemaining(expiresAt: string): { label: string; isUrgent: boolean } {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return { label: "Expired", isUrgent: true };
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const isUrgent = h < 2;
  if (h === 0) return { label: `${m}m remaining`, isUrgent };
  return { label: `${h}h ${m}m remaining`, isUrgent };
}

function formatCreatedAt(createdAt: string): string {
  return new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function SetupPlans() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: plans, isLoading } = useListSetupPlans();
  const createPlan = useCreateSetupPlan();
  const deletePlan = useDeleteSetupPlan();

  const form = useForm<z.infer<typeof planSchema>>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      asset: "",
      direction: "LONG",
      entryZone: "",
      stopLoss: "",
      takeProfit: "",
      setupGrade: "A_PLUS",
      thesis: "",
      invalidationCondition: "",
      expiresInHours: 8,
    },
  });

  const onSubmit = (values: z.infer<typeof planSchema>) => {
    createPlan.mutate(
      { data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSetupPlansQueryKey() });
          form.reset();
          setShowForm(false);
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    deletePlan.mutate(
      { id },
      {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSetupPlansQueryKey() }),
      }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BookMarked className="h-8 w-8 text-primary" /> Setup Plan Library
          </h1>
          <p className="text-muted-foreground mt-1">
            Build plans while calm. Execute them when opportunities arise — the gate will match against them.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} className="flex-shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          {showForm ? "Cancel" : "New Plan"}
        </Button>
      </div>

      {/* Why pre-commitment works */}
      <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 flex gap-3">
        <Brain className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-primary">Why pre-commitment changes everything</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Every other gate check asks a possibly-dysregulated trader to generate an honest answer in the moment.
            Pre-commitment sidesteps this entirely: the calm trader does the thinking ahead of time, and the stressed trader
            just answers "does this match what I already decided?" — a much easier, more honest question under pressure.
          </p>
        </div>
      </div>

      {/* Create Plan Form */}
      {showForm && (
        <Card className="border-primary/30 animate-in slide-in-from-top-2 duration-300">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" /> Build Your Setup Plan — While Calm
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Complete this when you are in an analytical, non-activated state. Plans built here become the matching targets at the Trade Gate.
            </p>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="asset" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset / Pair</FormLabel>
                      <FormControl>
                        <Input placeholder="EURUSD, XAUUSD…" className="font-mono uppercase" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="direction" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Direction</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="LONG">Long (Buy)</SelectItem>
                          <SelectItem value="SHORT">Short (Sell)</SelectItem>
                          <SelectItem value="NEUTRAL">Neutral / Wait</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="setupGrade" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Setup Grade</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="A_PLUS">A+ — All criteria met</SelectItem>
                          <SelectItem value="B">B — Minor flaw present</SelectItem>
                          <SelectItem value="C">C — Subpar entry</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="entryZone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entry Zone</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 1.0850 – 1.0870" className="font-mono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="stopLoss" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stop Loss</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 1.0820" className="font-mono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="takeProfit" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Take Profit</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 1.0950" className="font-mono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="thesis" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trade Thesis</FormLabel>
                    <p className="text-xs text-muted-foreground -mt-1 mb-2">
                      Why is this an A+ setup? If you struggle to write it clearly, the clarity is not there yet.
                    </p>
                    <FormControl>
                      <Textarea
                        placeholder="e.g. Price broke above key daily resistance at 1.0850 with strong bullish engulfing on H4. Structure is bullish. Expecting retest of breakout zone as support before continuation toward 1.0950."
                        className="resize-none text-sm font-mono" rows={3} {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="invalidationCondition" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invalidation Condition</FormLabel>
                    <p className="text-xs text-muted-foreground -mt-1 mb-2">
                      What price action would prove this idea wrong? This is as important as the entry.
                    </p>
                    <FormControl>
                      <Textarea
                        placeholder="e.g. Daily candle close below 1.0820 invalidates the bullish structure. If the retest shows rejection instead of support, the setup is void."
                        className="resize-none text-sm font-mono" rows={2} {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="expiresInHours" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Valid For</FormLabel>
                    <p className="text-xs text-muted-foreground -mt-1 mb-2">
                      Plans go stale. Force re-validation after this window — market conditions change.
                    </p>
                    <div className="flex gap-2">
                      {[2, 4, 8, 12, 24].map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => field.onChange(h)}
                          className={`flex-1 py-2.5 rounded-lg border-2 font-mono text-sm font-bold transition-all ${
                            field.value === h
                              ? "border-primary bg-primary/20 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/50"
                          }`}
                        >
                          {h}h
                        </button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />

                <Button type="submit" size="lg" className="w-full" disabled={createPlan.isPending}>
                  {createPlan.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Commit This Plan
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Plans List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !plans?.length ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="py-16 text-center space-y-4">
            <BookMarked className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
            <div>
              <p className="font-semibold text-lg">No active plans</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Build your plan library while the market is quiet and your cortex is online.
                When a trade opportunity arises, the gate will ask you to match against one of these.
              </p>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" /> Build Your First Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {plans.map((plan) => {
            const { label: timeLabel, isUrgent } = formatTimeRemaining(plan.expiresAt);
            return (
              <Card key={plan.id} className={`border-border/50 transition-all hover:border-primary/30 ${isUrgent ? "border-amber-500/30 bg-amber-500/5" : ""}`}>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {DIR_ICONS[plan.direction]}
                      <span className="font-mono font-black text-lg uppercase truncate">{plan.asset}</span>
                      <Badge variant="outline" className={`text-xs flex-shrink-0 ${
                        plan.setupGrade === "A_PLUS" ? "text-primary border-primary/30 bg-primary/5" :
                        plan.setupGrade === "B" ? "text-amber-400 border-amber-500/30 bg-amber-500/5" :
                        "text-red-400 border-red-500/30 bg-red-500/5"
                      }`}>
                        {plan.setupGrade === "A_PLUS" ? "A+" : plan.setupGrade}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                        isUrgent ? "text-amber-400 bg-amber-500/10" : "text-muted-foreground bg-secondary"
                      }`}>
                        <Clock className="h-3 w-3" />
                        {timeLabel}
                      </div>
                      <button
                        onClick={() => handleDelete(plan.id)}
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Entry", value: plan.entryZone },
                      { label: "Stop", value: plan.stopLoss },
                      { label: "Target", value: plan.takeProfit },
                    ].map(({ label, value }) => (
                      <div key={label} className="p-2.5 rounded-lg bg-secondary/50 border border-border/50">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
                        <p className="font-mono text-sm font-semibold truncate">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="p-3 rounded-lg bg-card border border-border/50">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Thesis</p>
                      <p className="text-xs text-foreground/80 leading-relaxed">{plan.thesis}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                      <p className="text-[10px] text-destructive uppercase tracking-widest mb-1 flex items-center gap-1">
                        <XCircle className="h-3 w-3" /> Invalidation
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{plan.invalidationCondition}</p>
                    </div>
                  </div>

                  <p className="text-[10px] text-muted-foreground">
                    Created at {formatCreatedAt(plan.createdAt)} · Direction: {plan.direction}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {(plans?.length ?? 0) > 0 && (
        <div className="p-4 rounded-lg border border-border/50 bg-secondary/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Plans expire automatically.</strong>{" "}
              Market conditions change. A plan built 24 hours ago in different market structure is not the same setup. Re-build stale plans fresh.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
