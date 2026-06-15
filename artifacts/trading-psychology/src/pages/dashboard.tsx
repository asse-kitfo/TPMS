import { useState } from "react";
import { 
  useGetCurrentSession, 
  useGetStatsSummary, 
  useGetBehavioralPatterns, 
  useGetDisciplineStreak,
  useStartSession,
  useUpdateSession,
  getGetCurrentSessionQueryKey
} from "@workspace/api-client-react";
type SessionMode = "ANALYSIS" | "PRE_TRADE" | "EXECUTION" | "LOCKED";
const SESSION_MODES: SessionMode[] = ["ANALYSIS", "PRE_TRADE", "EXECUTION", "LOCKED"];
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Target, Activity, Flame, AlertTriangle, Play, Square, Settings2, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Dashboard() {
  const queryClient = useQueryClient();
  
  const { data: session, isLoading: isSessionLoading } = useGetCurrentSession();
  const { data: stats, isLoading: isStatsLoading } = useGetStatsSummary();
  const { data: patterns, isLoading: isPatternsLoading } = useGetBehavioralPatterns();
  const { data: streak, isLoading: isStreakLoading } = useGetDisciplineStreak();

  const startSession = useStartSession();
  const updateSession = useUpdateSession();

  const handleStartSession = () => {
    startSession.mutate(
      { data: {} },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCurrentSessionQueryKey() });
        }
      }
    );
  };

  const handleEndSession = () => {
    if (!session) return;
    updateSession.mutate(
      { id: session.id, data: { endedAt: new Date().toISOString() } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCurrentSessionQueryKey() });
        }
      }
    );
  };

  const setMode = (mode: SessionMode) => {
    if (!session) return;
    updateSession.mutate(
      { id: session.id, data: { mode } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCurrentSessionQueryKey() });
        }
      }
    );
  };

  const activeSession = session && !session.endedAt;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground">System overview and session control.</p>
        </div>

        <div className="flex items-center gap-3">
          {activeSession ? (
            <>
              <Badge variant="outline" className="px-3 py-1 font-mono text-sm bg-primary/10 text-primary border-primary/20">
                SESSION ACTIVE
              </Badge>
              <Button variant="destructive" size="sm" onClick={handleEndSession} disabled={updateSession.isPending}>
                <Square className="h-4 w-4 mr-2" />
                END SESSION
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={handleStartSession} disabled={startSession.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Play className="h-4 w-4 mr-2" />
              START SESSION
            </Button>
          )}
        </div>
      </div>

      {activeSession && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
              Session Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {SESSION_MODES.map((mode) => (
                <Button
                  key={mode}
                  variant={session.mode === mode ? "default" : "outline"}
                  className={`h-12 w-full font-mono text-sm ${session.mode === mode ? 'shadow-[0_0_15px_rgba(59,130,246,0.3)]' : ''}`}
                  onClick={() => setMode(mode)}
                  disabled={updateSession.isPending}
                >
                  {mode}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Win Rate</p>
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-bold font-mono">{(stats?.winRate ?? 0).toFixed(1)}%</h2>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Plan Adherence</p>
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-bold font-mono text-primary">{(stats?.planFollowRate ?? 0).toFixed(1)}%</h2>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Interference</p>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-bold font-mono text-amber-500">{(stats?.interferenceRate ?? 0).toFixed(1)}%</h2>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Discipline Streak</p>
              <Flame className="h-4 w-4 text-orange-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-bold font-mono">{streak?.currentStreak ?? 0}</h2>
              <span className="text-sm text-muted-foreground">/ best {streak?.bestStreak ?? 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-muted-foreground" />
              Behavioral Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            {patterns && patterns.length > 0 ? (
              <div className="space-y-4">
                {patterns.slice(0, 5).map((pattern, i) => (
                  <div key={i} className="flex items-start justify-between p-3 rounded-lg border bg-card/50">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`
                          ${pattern.severity === 'HIGH' ? 'text-destructive border-destructive/30' : ''}
                          ${pattern.severity === 'MEDIUM' ? 'text-amber-500 border-amber-500/30' : ''}
                          ${pattern.severity === 'LOW' ? 'text-green-500 border-green-500/30' : ''}
                        `}>
                          {pattern.severity}
                        </Badge>
                        <span className="font-medium text-sm">{pattern.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{pattern.insight}</p>
                    </div>
                    <div className="font-mono text-xl font-bold text-muted-foreground/50">
                      {pattern.count}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Shield className="h-12 w-12 mb-4 opacity-20" />
                <p>No critical patterns detected yet.</p>
                <p className="text-sm">Maintain discipline to build healthy data.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-full bg-secondary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings2 className="h-5 w-5 text-muted-foreground" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
             <Button variant="outline" className="w-full justify-start h-12" asChild>
                <a href="/check">Run Pre-Trade Check</a>
             </Button>
             <Button variant="outline" className="w-full justify-start h-12" asChild>
                <a href="/execution">Enter Execution Mode</a>
             </Button>
             <Button variant="outline" className="w-full justify-start h-12" asChild>
                <a href="/journal">Review Journal</a>
             </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
