import { useState } from "react";
import { 
  useListTrades, 
  useUpdateTrade,
  getListTradesQueryKey
} from "@workspace/api-client-react";
import type { Trade } from "@workspace/api-client-react";
type TradeOutcome = "WIN" | "LOSS" | "BREAKEVEN";
type TradeInterferenceType = "CLOSED_EARLY" | "MOVED_SL" | "REVENGE" | "OVERSIZE";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, List as ListIcon, FileEdit, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { LucideIcon } from "lucide-react";

function TooltipIcon({ icon: Icon, color, tooltip }: { icon: LucideIcon; color: string; tooltip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span><Icon className={`h-4 w-4 ${color}`} /></span>
      </TooltipTrigger>
      <TooltipContent><p>{tooltip}</p></TooltipContent>
    </Tooltip>
  );
}
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";


export default function TradeJournal() {
  const queryClient = useQueryClient();
  const { data: trades, isLoading } = useListTrades();
  const updateTrade = useUpdateTrade();
  
  const [filter, setFilter] = useState("ALL");
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTrade) return;

    const formData = new FormData(e.currentTarget);
    const outcome = formData.get("outcome") as TradeOutcome | "";
    const followedPlan = formData.get("followedPlan") === "true";
    const interfered = formData.get("interfered") === "true";
    const interferenceType = formData.get("interferenceType") as TradeInterferenceType | "";
    const notes = formData.get("notes") as string;

    updateTrade.mutate(
      {
        id: editingTrade.id,
        data: {
          outcome: outcome || undefined,
          followedPlan,
          interfered,
          interferenceType: interferenceType || undefined,
          notes,
          closedAt: new Date().toISOString()
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTradesQueryKey() });
          setEditingTrade(null);
        }
      }
    );
  };

  const filteredTrades = trades?.filter(t => {
    if (filter === "ALL") return true;
    if (filter === "OPEN") return !t.outcome;
    if (filter === "WIN") return t.outcome === "WIN";
    if (filter === "LOSS") return t.outcome === "LOSS";
    return true;
  }) || [];

  if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <ListIcon className="h-8 w-8 text-primary" /> Trade Journal
          </h1>
          <p className="text-muted-foreground">Historical records and post-trade reviews.</p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Trades</SelectItem>
              <SelectItem value="OPEN">Open Only</SelectItem>
              <SelectItem value="WIN">Wins</SelectItem>
              <SelectItem value="LOSS">Losses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <div className="rounded-md border border-border/50">
          <Table>
            <TableHeader className="bg-secondary/20">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Pair</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Discipline</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTrades.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                    No trades found matching criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTrades.map((trade) => (
                  <TableRow key={trade.id} className="hover:bg-secondary/10">
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {format(new Date(trade.createdAt), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell className="font-bold">{trade.pair}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={trade.setupGrade === 'A_PLUS' ? 'text-primary border-primary/50' : 'text-muted-foreground'}>
                        {trade.setupGrade}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`font-mono text-xs font-bold ${trade.direction === 'LONG' ? 'text-green-500' : 'text-destructive'}`}>
                        {trade.direction}
                      </span>
                    </TableCell>
                    <TableCell>
                      {trade.outcome ? (
                        <Badge className={`
                          ${trade.outcome === 'WIN' ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : ''}
                          ${trade.outcome === 'LOSS' ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' : ''}
                          ${trade.outcome === 'BREAKEVEN' ? 'bg-secondary text-secondary-foreground hover:bg-secondary' : ''}
                        `}>
                          {trade.outcome}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-dashed animate-pulse text-amber-500 border-amber-500">OPEN</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                       {trade.outcome && (
                         <div className="flex gap-2">
                           {trade.followedPlan ? (
                             <TooltipIcon icon={CheckCircle2} color="text-green-500" tooltip="Followed Plan" />
                           ) : (
                             <TooltipIcon icon={XCircle} color="text-destructive" tooltip="Broke Plan" />
                           )}
                           {trade.interfered && (
                             <TooltipIcon icon={AlertTriangle} color="text-amber-500" tooltip={`Interfered: ${trade.interferenceType}`} />
                           )}
                         </div>
                       )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog open={editingTrade?.id === trade.id} onOpenChange={(open) => !open && setEditingTrade(null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => setEditingTrade(trade)}>
                            <FileEdit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                          <DialogHeader>
                            <DialogTitle>Update Trade: {trade.pair}</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleUpdate} className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="outcome">Outcome</Label>
                                <Select name="outcome" defaultValue={trade.outcome || undefined}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select outcome" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="WIN">WIN</SelectItem>
                                    <SelectItem value="LOSS">LOSS</SelectItem>
                                    <SelectItem value="BREAKEVEN">BREAKEVEN</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            <div className="space-y-2 pt-2 border-t">
                              <Label>Discipline Review</Label>
                              <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground">Followed Plan?</Label>
                                  <Select name="followedPlan" defaultValue={trade.followedPlan ? "true" : "false"}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="true">Yes</SelectItem>
                                      <SelectItem value="false">No</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground">Interfered?</Label>
                                  <Select name="interfered" defaultValue={trade.interfered ? "true" : "false"}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="false">No</SelectItem>
                                      <SelectItem value="true">Yes</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                               <Label className="text-xs text-muted-foreground">Interference Type (If Yes)</Label>
                               <Select name="interferenceType" defaultValue={trade.interferenceType || undefined}>
                                 <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                                 <SelectContent>
                                   <SelectItem value="CLOSED_EARLY">Closed Early</SelectItem>
                                   <SelectItem value="MOVED_SL">Moved Stop Loss</SelectItem>
                                   <SelectItem value="REVENGE">Revenge Trade</SelectItem>
                                   <SelectItem value="OVERSIZE">Oversize</SelectItem>
                                 </SelectContent>
                               </Select>
                             </div>

                            <div className="space-y-2">
                              <Label>Notes</Label>
                              <Input name="notes" defaultValue={trade.notes || ""} placeholder="What were you thinking during execution?" />
                            </div>

                            <div className="pt-4 flex justify-end">
                              <Button type="submit" disabled={updateTrade.isPending}>
                                {updateTrade.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Outcome"}
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}


