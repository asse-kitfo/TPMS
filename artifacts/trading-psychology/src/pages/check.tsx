import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  useSubmitCheck, 
  useGetCurrentSession,
  useListChecks,
  getListChecksQueryKey
} from "@workspace/api-client-react";
type CheckResultVerdict = "TRADE" | "REDUCE_RISK" | "NO_TRADE" | "HARD_BLOCK";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { AlertTriangle, ShieldCheck, ShieldAlert, Ban, Loader2, ArrowRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const checkSchema = z.object({
  pair: z.string().min(1, "Pair is required (e.g. EURUSD)"),
  setupGrade: z.enum(["A_PLUS", "B", "C"]),
  psychState: z.enum(["CALM", "FOCUSED", "URGE", "PRESSURE", "FEAR", "OVERCONFIDENT"]),
  focusLevel: z.number().min(1).max(10),
  urgeLevel: z.number().min(1).max(10),
  decisionClarity: z.number().min(1).max(10),
});

export default function PreTradeCheck() {
  const queryClient = useQueryClient();
  const { data: session, isLoading: isSessionLoading } = useGetCurrentSession();
  const [verdict, setVerdict] = useState<{ status: CheckResultVerdict, reason: string | null } | null>(null);

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
      { 
        data: {
          ...values,
          sessionId: session.id,
        }
      },
      {
        onSuccess: (data) => {
          setVerdict({ status: data.verdict, reason: data.verdictReason || null });
          queryClient.invalidateQueries({ queryKey: getListChecksQueryKey({ sessionId: session.id }) });
        }
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
          <p className="text-muted-foreground">You must start a session in the Command Center before performing pre-trade checks.</p>
          <Button asChild className="mt-4"><a href="/">Go to Command Center</a></Button>
        </div>
      </div>
    );
  }

  if (verdict) {
    return (
      <div className="flex items-center justify-center h-[80vh] animate-in zoom-in-95 duration-300">
        <Card className={`w-full max-w-2xl overflow-hidden border-2 ${
          verdict.status === 'TRADE' ? 'border-green-500/50 bg-green-500/5' :
          verdict.status === 'REDUCE_RISK' ? 'border-amber-500/50 bg-amber-500/5' :
          verdict.status === 'NO_TRADE' ? 'border-destructive/50 bg-destructive/5' :
          'border-destructive shadow-[0_0_50px_rgba(239,68,68,0.3)] bg-destructive/10'
        }`}>
          <div className={`h-4 w-full ${
            verdict.status === 'TRADE' ? 'bg-green-500' :
            verdict.status === 'REDUCE_RISK' ? 'bg-amber-500' :
            'bg-destructive'
          }`} />
          <CardContent className="p-10 text-center space-y-8">
            <div className="flex justify-center">
              {verdict.status === 'TRADE' && <ShieldCheck className="h-24 w-24 text-green-500" />}
              {verdict.status === 'REDUCE_RISK' && <AlertTriangle className="h-24 w-24 text-amber-500" />}
              {verdict.status === 'NO_TRADE' && <Ban className="h-24 w-24 text-destructive" />}
              {verdict.status === 'HARD_BLOCK' && <ShieldAlert className="h-24 w-24 text-destructive animate-pulse" />}
            </div>
            
            <div className="space-y-2">
              <h1 className="text-5xl font-black tracking-tight uppercase">
                {verdict.status.replace('_', ' ')}
              </h1>
              {verdict.reason && (
                <p className="text-xl text-muted-foreground font-mono mt-4">
                  {verdict.reason}
                </p>
              )}
            </div>

            <div className="pt-8">
              <Button 
                size="lg" 
                variant={verdict.status === 'HARD_BLOCK' ? 'destructive' : 'default'}
                className="w-full text-lg h-14"
                onClick={() => setVerdict(null)}
              >
                Acknowledge
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pre-Trade Check</h1>
        <p className="text-muted-foreground">Assess your setup and psychology before execution.</p>
      </div>

      <Card className="border-primary/20">
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="pair"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset / Pair</FormLabel>
                      <FormControl>
                        <Input placeholder="EURUSD" className="font-mono uppercase text-lg h-12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="setupGrade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Setup Grade</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 text-lg">
                            <SelectValue placeholder="Select grade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="A_PLUS">A+ (Perfect Setup)</SelectItem>
                          <SelectItem value="B">B (Good, minor flaws)</SelectItem>
                          <SelectItem value="C">C (Subpar/Impulsive)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="psychState"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Psychological State</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CALM">Calm & Objective</SelectItem>
                        <SelectItem value="FOCUSED">Highly Focused</SelectItem>
                        <SelectItem value="URGE">Urge to Trade</SelectItem>
                        <SelectItem value="PRESSURE">Feeling Pressure</SelectItem>
                        <SelectItem value="FEAR">Fearful / Hesitant</SelectItem>
                        <SelectItem value="OVERCONFIDENT">Overconfident</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-8 pt-4 border-t">
                <FormField
                  control={form.control}
                  name="focusLevel"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between items-center mb-4">
                        <FormLabel className="text-base">Focus Level</FormLabel>
                        <span className="font-mono text-xl text-primary">{field.value}/10</span>
                      </div>
                      <FormControl>
                        <Slider
                          min={1}
                          max={10}
                          step={1}
                          defaultValue={[field.value]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                          className="py-4"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="urgeLevel"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between items-center mb-4">
                        <FormLabel className="text-base">Urge to Execute</FormLabel>
                        <span className={`font-mono text-xl ${field.value > 7 ? 'text-destructive' : 'text-amber-500'}`}>{field.value}/10</span>
                      </div>
                      <FormControl>
                        <Slider
                          min={1}
                          max={10}
                          step={1}
                          defaultValue={[field.value]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                          className="py-4"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="decisionClarity"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between items-center mb-4">
                        <FormLabel className="text-base">Decision Clarity</FormLabel>
                        <span className="font-mono text-xl text-green-500">{field.value}/10</span>
                      </div>
                      <FormControl>
                        <Slider
                          min={1}
                          max={10}
                          step={1}
                          defaultValue={[field.value]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                          className="py-4"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <Button 
                type="submit" 
                size="lg" 
                className="w-full h-14 text-lg font-bold tracking-wider"
                disabled={submitCheck.isPending}
              >
                {submitCheck.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : "REQUEST VERDICT"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
