import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  useGetCurrentSession,
  useCreateTrade,
  getListTradesQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldAlert, Loader2, Target, Crosshair, AlertOctagon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const tradeSchema = z.object({
  pair: z.string().min(1, "Pair is required"),
  setupGrade: z.enum(["A_PLUS", "B", "C"]),
  direction: z.enum(["LONG", "SHORT"]),
  entryPrice: z.coerce.number().positive("Must be positive"),
  stopLoss: z.coerce.number().positive("Must be positive"),
  takeProfit: z.coerce.number().positive("Must be positive"),
});

export default function ExecutionMode() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: session, isLoading: isSessionLoading } = useGetCurrentSession();
  const [isActiveTrade, setIsActiveTrade] = useState(false);

  const createTrade = useCreateTrade();

  const form = useForm<z.infer<typeof tradeSchema>>({
    resolver: zodResolver(tradeSchema),
    defaultValues: {
      pair: "",
      setupGrade: "A_PLUS",
      direction: "LONG",
      entryPrice: 0,
      stopLoss: 0,
      takeProfit: 0,
    },
  });

  const onSubmit = (values: z.infer<typeof tradeSchema>) => {
    if (!session) return;
    createTrade.mutate(
      { 
        data: {
          ...values,
          sessionId: session.id,
        }
      },
      {
        onSuccess: () => {
          setIsActiveTrade(true);
          queryClient.invalidateQueries({ queryKey: getListTradesQueryKey() });
          toast({ title: "Trade Registered", description: "You are now in execution mode." });
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
          <p className="text-muted-foreground">You must start a session before entering Execution Mode.</p>
          <Button asChild className="mt-4"><a href="/">Go to Command Center</a></Button>
        </div>
      </div>
    );
  }

  if (isActiveTrade) {
    return (
      <div className="flex flex-col h-full animate-in fade-in duration-700">
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-12">
          
          <div className="space-y-4 animate-pulse">
            <Target className="h-20 w-20 text-primary mx-auto opacity-80" />
            <Badge variant="outline" className="text-primary border-primary bg-primary/10 px-4 py-1 text-sm font-mono tracking-widest">LIVE TRADE ACTIVE</Badge>
          </div>

          <div className="max-w-4xl space-y-8">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-foreground/90 uppercase leading-tight">
              I DO NOT MANAGE TRADES. <br/>
              <span className="text-primary">I MANAGE RISK.</span>
            </h1>
            
            <p className="text-xl md:text-3xl font-medium text-muted-foreground max-w-3xl mx-auto leading-relaxed border-l-4 border-primary pl-6 text-left">
              The setup is valid. The stop is set. <br/>
              There is nothing left to do but wait.<br/>
              Close the chart. Let it play out.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl mt-12">
             <Card className="border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors">
               <CardContent className="p-6 text-center space-y-2">
                 <AlertOctagon className="h-8 w-8 text-destructive mx-auto mb-4" />
                 <h3 className="font-bold text-destructive">Do Not Move Stop</h3>
                 <p className="text-sm text-muted-foreground">Accept the defined risk.</p>
               </CardContent>
             </Card>
             <Card className="border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors">
               <CardContent className="p-6 text-center space-y-2">
                 <AlertOctagon className="h-8 w-8 text-destructive mx-auto mb-4" />
                 <h3 className="font-bold text-destructive">Do Not Close Early</h3>
                 <p className="text-sm text-muted-foreground">Let edge play out fully.</p>
               </CardContent>
             </Card>
             <Card className="border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors">
               <CardContent className="p-6 text-center space-y-2">
                 <AlertOctagon className="h-8 w-8 text-destructive mx-auto mb-4" />
                 <h3 className="font-bold text-destructive">Do Not Add Size</h3>
                 <p className="text-sm text-muted-foreground">Stick to the plan.</p>
               </CardContent>
             </Card>
          </div>

          <Button size="lg" variant="outline" className="mt-12 h-14 px-8 text-lg" onClick={() => setIsActiveTrade(false)}>
            Close Trade & Log Outcome
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
          <Crosshair className="h-8 w-8" /> Execution Mode
        </h1>
        <p className="text-muted-foreground">Log the entry and step away.</p>
      </div>

      <Card className="border-primary/20">
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="pair"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset / Pair</FormLabel>
                      <FormControl>
                        <Input placeholder="EURUSD" className="font-mono uppercase h-12 text-lg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="direction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Direction</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 text-lg font-bold">
                            <SelectValue placeholder="Direction" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="LONG" className="text-green-500 font-bold">LONG</SelectItem>
                          <SelectItem value="SHORT" className="text-destructive font-bold">SHORT</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="setupGrade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Setup Grade</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12">
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

              <div className="grid grid-cols-3 gap-4 pt-4">
                <FormField
                  control={form.control}
                  name="entryPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entry Price</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" className="font-mono bg-secondary/50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="stopLoss"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-destructive">Stop Loss</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" className="font-mono bg-destructive/10 border-destructive/30" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="takeProfit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-green-500">Take Profit</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" className="font-mono bg-green-500/10 border-green-500/30" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-6">
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full h-14 text-lg font-bold tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={createTrade.isPending}
                >
                  {createTrade.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : "LOCK EXECUTION"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

