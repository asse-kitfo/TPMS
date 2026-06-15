import { 
  useGetGradeBreakdown, 
  useGetBehavioralPatterns, 
  useGetDisciplineStreak 
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart2, TrendingUp, AlertTriangle, ShieldCheck } from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";

export default function BehavioralAnalytics() {
  const { data: breakdown, isLoading: isBreakdownLoading } = useGetGradeBreakdown();
  const { data: patterns, isLoading: isPatternsLoading } = useGetBehavioralPatterns();
  const { data: streak, isLoading: isStreakLoading } = useGetDisciplineStreak();

  const isLoading = isBreakdownLoading || isPatternsLoading || isStreakLoading;

  if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  // Format data for chart
  const chartData = breakdown?.map(b => ({
    name: b.grade,
    winRate: Number(b.winRate.toFixed(1)),
    count: b.count,
    planFollowRate: Number(b.planFollowRate.toFixed(1))
  })) || [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <BarChart2 className="h-8 w-8 text-primary" /> Behavioral Analytics
        </h1>
        <p className="text-muted-foreground">Data-driven insights into your trading psychology.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-border/50">
          <CardHeader>
            <CardTitle>Edge Realization by Setup Grade</CardTitle>
            <CardDescription>Win rates and volume across A+, B, and C setups.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{fill: 'hsl(var(--muted-foreground))'}} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{fill: 'hsl(var(--muted-foreground))'}} tickFormatter={(value) => `${value}%`} />
                  <Tooltip 
                    cursor={{fill: 'hsl(var(--muted)/0.5)'}}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                  />
                  <Bar dataKey="winRate" name="Win Rate %" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={
                        entry.name === 'A_PLUS' ? 'hsl(var(--primary))' : 
                        entry.name === 'B' ? 'hsl(var(--chart-2))' : 
                        'hsl(var(--destructive))'
                      } />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6 text-center space-y-2">
              <ShieldCheck className="h-10 w-10 text-primary mx-auto mb-2" />
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-widest">Current Streak</h3>
              <p className="text-5xl font-mono font-bold text-primary">{streak?.currentStreak || 0}</p>
              <p className="text-sm text-muted-foreground">consecutive trades following plan</p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Critical Insight</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-secondary/50 border border-border/50 text-sm leading-relaxed">
                <p className="font-medium text-foreground mb-2">Your losses come from psychology, not strategy.</p>
                <p className="text-muted-foreground">
                  The data shows a severe drop in win rate on C-grade setups. 
                  Focus entirely on patience and executing only A+ setups.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Identified Behavioral Patterns</CardTitle>
          <CardDescription>Recurring emotional states and actions extracted from your journal.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {patterns?.map((pattern, i) => (
              <div key={i} className="p-4 rounded-lg border bg-card hover:bg-secondary/20 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <Badge variant="outline" className={`
                    ${pattern.severity === 'HIGH' ? 'text-destructive border-destructive/30 bg-destructive/5' : ''}
                    ${pattern.severity === 'MEDIUM' ? 'text-amber-500 border-amber-500/30 bg-amber-500/5' : ''}
                    ${pattern.severity === 'LOW' ? 'text-green-500 border-green-500/30 bg-green-500/5' : ''}
                  `}>
                    {pattern.severity}
                  </Badge>
                  <span className="font-mono text-xl font-bold opacity-30">{pattern.count}x</span>
                </div>
                <h4 className="font-bold mb-1">{pattern.label}</h4>
                <p className="text-sm text-muted-foreground">{pattern.insight}</p>
              </div>
            ))}
            
            {!patterns?.length && (
               <div className="col-span-full py-12 text-center text-muted-foreground">
                 <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                 <p>Insufficient data to detect behavioral patterns.</p>
               </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
