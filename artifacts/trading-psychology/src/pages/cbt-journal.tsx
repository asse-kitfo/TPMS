import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Brain, Plus, ChevronRight, Check, Trash2, X, AlertTriangle, Lightbulb, RefreshCw, Wind, Clock } from "lucide-react";
import { format } from "date-fns";

interface ThoughtRecord {
  id: string;
  createdAt: string;
  situation: string;
  emotion: string;
  emotionIntensity: number;
  automaticThought: string;
  distortionId: string;
  rationalReframe: string;
  action: string;
}

type Step = "SITUATION" | "EMOTION" | "THOUGHT" | "DISTORTION" | "REFRAME" | "ACTION" | "DONE";

const SITUATIONS = [
  { id: "BEFORE_TRADE", label: "Before entering a trade", sub: "Feeling an urge, FOMO, or setup temptation" },
  { id: "DURING_TRADE", label: "During a live trade", sub: "Trade moving against me, urge to interfere" },
  { id: "AFTER_LOSS", label: "After a loss", sub: "Anger, urge to revenge trade, can't accept it" },
  { id: "AFTER_WIN", label: "After a win", sub: "Overconfidence, urge to overtrade, euphoria" },
  { id: "NO_SETUPS", label: "No setups visible", sub: "Boredom, forcing trades, restlessness" },
  { id: "OFF_SESSION", label: "Outside trading hours", sub: "Obsessing over charts, can't switch off" },
];

const EMOTIONS = [
  { id: "FEAR", label: "Fear / Anxiety", color: "text-orange-400", border: "border-orange-500", bg: "bg-orange-500/10" },
  { id: "URGE", label: "Urge / Compulsion", color: "text-amber-400", border: "border-amber-500", bg: "bg-amber-500/10" },
  { id: "ANGER", label: "Anger / Frustration", color: "text-red-400", border: "border-red-500", bg: "bg-red-500/10" },
  { id: "OVERCONFIDENCE", label: "Overconfidence", color: "text-purple-400", border: "border-purple-500", bg: "bg-purple-500/10" },
  { id: "DESPERATION", label: "Desperation / Pressure", color: "text-rose-400", border: "border-rose-500", bg: "bg-rose-500/10" },
  { id: "BOREDOM", label: "Boredom / Restlessness", color: "text-blue-400", border: "border-blue-500", bg: "bg-blue-500/10" },
  { id: "GUILT", label: "Guilt / Self-blame", color: "text-slate-400", border: "border-slate-500", bg: "bg-slate-500/10" },
  { id: "GREED", label: "Greed / Excitement", color: "text-yellow-400", border: "border-yellow-500", bg: "bg-yellow-500/10" },
];

const DISTORTIONS = [
  {
    id: "FOMO",
    label: "FOMO",
    description: "Fear of Missing Out",
    example: "\"If I don't enter now I'll miss the whole move\"",
    counter: "There will always be another setup. Missing one trade is irrelevant over 100 trades. Patience is the edge.",
  },
  {
    id: "LOSS_AVERSION",
    label: "Loss Aversion",
    description: "Can't close the losing trade",
    example: "\"If I close now I'll lock in the loss — it might come back\"",
    counter: "An unrealized loss is already a real loss. Closing protects capital and stops the bleed. The trade is already gone.",
  },
  {
    id: "REVENGE",
    label: "Revenge Thinking",
    description: "Need to 'get back' what the market took",
    example: "\"I need to make this back right now\"",
    counter: "The market took nothing from you. You paid the cost of a trade that didn't work. Next trade is independent.",
  },
  {
    id: "OVERCONFIDENCE",
    label: "Overconfidence",
    description: "Certainty about an uncertain outcome",
    example: "\"I know exactly where this is going\"",
    counter: "No one knows. No trade is certain. You have a probability, not a guarantee. Size accordingly.",
  },
  {
    id: "CATASTROPHIZING",
    label: "Catastrophizing",
    description: "One loss = total disaster",
    example: "\"This loss is going to destroy my account / my week / my month\"",
    counter: "One loss is one data point. Your risk management caps all damage. One trade cannot define your career.",
  },
  {
    id: "ALL_OR_NOTHING",
    label: "All-or-Nothing",
    description: "Black and white thinking about results",
    example: "\"I need to make it all back in this one trade\"",
    counter: "Professional recovery is gradual. Trying to recover everything at once is how one loss becomes ten.",
  },
  {
    id: "RECENCY_BIAS",
    label: "Recency Bias",
    description: "Recent streak overrides probability",
    example: "\"I've lost 3 in a row so this one must be a winner\"",
    counter: "Three losses in a row is statistically normal. Streaks don't predict the next outcome. The edge exists over 100+ trades.",
  },
  {
    id: "SUNK_COST",
    label: "Sunk Cost Fallacy",
    description: "Holding because you've already lost too much",
    example: "\"I've been in this too long / lost too much to exit now\"",
    counter: "Sunk cost is irrelevant to future outcome. Ask: would I enter this trade right now, at this price? If no — exit.",
  },
  {
    id: "CONFIRMATION_BIAS",
    label: "Confirmation Bias",
    description: "Only seeing what confirms the trade idea",
    example: "\"I just know price will reverse here\"",
    counter: "Look at the chart as if you had no position. What does the structure tell an impartial observer?",
  },
  {
    id: "EMOTIONAL_REASONING",
    label: "Emotional Reasoning",
    description: "Feelings treated as market facts",
    example: "\"I feel like this trade will work, so it must be right\"",
    counter: "Feelings are neurochemistry, not market data. What does your rules-based system say about this setup?",
  },
  {
    id: "MIND_READING",
    label: "Mind Reading",
    description: "Assuming market intent or manipulation",
    example: "\"The market makers are targeting my stop on purpose\"",
    counter: "Markets are probabilistic, not personal. Your stop was placed at the wrong level — adjust the methodology, not the narrative.",
  },
];

const ACTIONS = [
  { id: "CLOSE_CHARTS", label: "Close charts for 10 minutes", sub: "Remove access to the trigger" },
  { id: "BREATHE", label: "4-7-8 breathing — 3 cycles", sub: "Engage parasympathetic nervous system" },
  { id: "WALK_AWAY", label: "Step away from the screen", sub: "Physical break resets cortisol" },
  { id: "REVIEW_RULES", label: "Re-read my trading rules", sub: "Re-engage the prefrontal cortex" },
  { id: "OBSERVE", label: "Observe the thought — do nothing", sub: "Name it, don't act on it" },
  { id: "SMALL_SIZE", label: "If I trade, cut size by 50%", sub: "Limit damage if emotional brain wins" },
];

const QUICK_THOUGHTS = [
  "I need to get my money back right now.",
  "If I don't enter now I'll miss the whole move.",
  "This trade has to work — I've already lost too much today.",
  "I just know this is going to reverse.",
  "I can't accept this loss — I'll wait for it to come back.",
  "After losing 3 trades I'm due for a win.",
  "I should add to this position — it's definitely going my way.",
  "I feel an overwhelming urge to trade something.",
];

function generateId() {
  return `tr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function loadRecords(): ThoughtRecord[] {
  try {
    const s = localStorage.getItem("cbt-thought-records");
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

function saveRecords(records: ThoughtRecord[]) {
  localStorage.setItem("cbt-thought-records", JSON.stringify(records));
}

function getDistortionById(id: string) {
  return DISTORTIONS.find(d => d.id === id);
}

function EmotionIntensityPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const color = value >= 8 ? "bg-destructive" : value >= 6 ? "bg-orange-500" : value >= 4 ? "bg-amber-500" : "bg-primary";
  const label = value >= 8 ? "Intense — high impairment" : value >= 6 ? "Strong — be careful" : value >= 4 ? "Moderate" : "Mild";
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Mild</span>
        <span className="font-mono font-bold text-foreground text-base">{value}/10</span>
        <span>Overwhelming</span>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 h-8 rounded transition-all ${n <= value ? color : "bg-secondary/50 hover:bg-secondary"}`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium text-center ${value >= 8 ? "text-destructive" : value >= 6 ? "text-orange-400" : value >= 4 ? "text-amber-400" : "text-primary"}`}>
        {label}
      </p>
    </div>
  );
}

export default function CBTJournal() {
  const [step, setStep] = useState<Step>("SITUATION");
  const [situation, setSituation] = useState("");
  const [emotion, setEmotion] = useState("");
  const [emotionIntensity, setEmotionIntensity] = useState(6);
  const [automaticThought, setAutomaticThought] = useState("");
  const [distortionId, setDistortionId] = useState("");
  const [rationalReframe, setRationalReframe] = useState("");
  const [action, setAction] = useState("");
  const [records, setRecords] = useState<ThoughtRecord[]>(() => loadRecords());
  const [isActive, setIsActive] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { saveRecords(records); }, [records]);

  const selectedDistortion = getDistortionById(distortionId);

  const resetForm = () => {
    setStep("SITUATION");
    setSituation("");
    setEmotion("");
    setEmotionIntensity(6);
    setAutomaticThought("");
    setDistortionId("");
    setRationalReframe("");
    setAction("");
    setIsActive(false);
  };

  const handleComplete = () => {
    const record: ThoughtRecord = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      situation,
      emotion,
      emotionIntensity,
      automaticThought,
      distortionId,
      rationalReframe,
      action,
    };
    const updated = [record, ...records];
    setRecords(updated);
    setStep("DONE");
  };

  const deleteRecord = (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  const steps: Step[] = ["SITUATION", "EMOTION", "THOUGHT", "DISTORTION", "REFRAME", "ACTION"];
  const stepIndex = steps.indexOf(step);

  if (!isActive) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Brain className="h-8 w-8 text-primary" /> Thought Record
            </h1>
            <p className="text-muted-foreground mt-1">Real-time CBT. Name the distortion. Rewrite the thought. Regain the cortex.</p>
          </div>
          <Button onClick={() => setIsActive(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New Record
          </Button>
        </div>

        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 grid sm:grid-cols-3 gap-4 text-sm">
          <div className="space-y-1">
            <p className="font-semibold text-primary flex items-center gap-2"><Lightbulb className="h-4 w-4" /> How this works</p>
            <p className="text-muted-foreground text-xs leading-relaxed">The moment you feel an urge, fear, or emotional pull — do a thought record. Naming a cognitive distortion reduces its power over your behavior.</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-amber-400 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> When to use it</p>
            <p className="text-muted-foreground text-xs leading-relaxed">Before chasing a trade. During a loss you can't accept. When you feel revenge building. When you've already broken a rule.</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-green-400 flex items-center gap-2"><RefreshCw className="h-4 w-4" /> The science</p>
            <p className="text-muted-foreground text-xs leading-relaxed">Writing activates the prefrontal cortex, directly counteracting amygdala hijack. You cannot think rationally AND be emotionally hijacked simultaneously.</p>
          </div>
        </div>

        {records.length === 0 ? (
          <Card className="border-dashed border-border">
            <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
              <Brain className="h-12 w-12 text-muted-foreground opacity-20" />
              <div>
                <p className="font-semibold text-muted-foreground">No thought records yet</p>
                <p className="text-sm text-muted-foreground mt-1">The next time you feel an emotional pull toward a trade, do a record instead of acting.</p>
              </div>
              <Button variant="outline" onClick={() => setIsActive(true)}>
                <Plus className="h-4 w-4 mr-2" /> Start First Record
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">{records.length} thought record{records.length !== 1 ? "s" : ""}</p>
            {records.map(record => {
              const dist = getDistortionById(record.distortionId);
              const sitMeta = SITUATIONS.find(s => s.id === record.situation);
              const emotMeta = EMOTIONS.find(e => e.id === record.emotion);
              const isExpanded = expandedId === record.id;
              const intensityColor = record.emotionIntensity >= 8 ? "text-destructive" : record.emotionIntensity >= 6 ? "text-orange-400" : record.emotionIntensity >= 4 ? "text-amber-400" : "text-primary";

              return (
                <Card key={record.id} className="border-border/50">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          {dist && (
                            <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-400 bg-amber-500/10">
                              {dist.label}
                            </Badge>
                          )}
                          {emotMeta && (
                            <Badge variant="outline" className={`text-xs ${emotMeta.border}/40 ${emotMeta.color} ${emotMeta.bg}`}>
                              {emotMeta.label}
                            </Badge>
                          )}
                          <span className={`font-mono font-bold text-sm ${intensityColor}`}>{record.emotionIntensity}/10</span>
                        </div>
                        <p className="text-sm text-muted-foreground italic">"{record.automaticThought}"</p>
                        {isExpanded && record.rationalReframe && (
                          <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20 animate-in fade-in duration-200">
                            <p className="text-xs text-primary uppercase tracking-widest mb-1">Rational Reframe</p>
                            <p className="text-sm leading-relaxed">"{record.rationalReframe}"</p>
                          </div>
                        )}
                        {isExpanded && record.action && (
                          <div className="mt-2 flex items-center gap-2">
                            <Check className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                            <p className="text-xs text-muted-foreground">
                              Action: {ACTIONS.find(a => a.id === record.action)?.label ?? record.action}
                            </p>
                          </div>
                        )}
                        {isExpanded && sitMeta && (
                          <p className="text-xs text-muted-foreground">Context: {sitMeta.label}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground font-mono">
                          {format(new Date(record.createdAt), "MMM d, HH:mm")}
                        </span>
                        <button onClick={() => setExpandedId(isExpanded ? null : record.id)}
                          className="text-xs text-muted-foreground hover:text-foreground">{isExpanded ? "▲" : "▼"}</button>
                        <button onClick={() => deleteRecord(record.id)}
                          className="p-1 text-muted-foreground/40 hover:text-destructive transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (step === "DONE") {
    return (
      <div className="flex items-center justify-center min-h-[70vh] animate-in zoom-in-95 duration-300">
        <div className="text-center space-y-6 max-w-md w-full">
          <div className="h-20 w-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mx-auto">
            <Check className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Thought Record Complete</p>
            <h2 className="text-3xl font-black">Cortex re-engaged.</h2>
            <p className="text-muted-foreground leading-relaxed">
              You named the distortion. You wrote the reframe. The amygdala cannot sustain its hijack when the prefrontal cortex is active.
            </p>
          </div>
          {selectedDistortion && (
            <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 text-left">
              <p className="text-xs text-primary uppercase tracking-widest mb-2">Your counter to {selectedDistortion.label}</p>
              <p className="text-sm text-muted-foreground leading-relaxed italic">"{selectedDistortion.counter}"</p>
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" /> New Record
            </Button>
            <Button className="flex-1" onClick={resetForm}>
              View Records
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" /> Thought Record
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Step {stepIndex + 1} of {steps.length} — {
            step === "SITUATION" ? "What triggered this?" :
            step === "EMOTION" ? "What are you feeling?" :
            step === "THOUGHT" ? "What is the automatic thought?" :
            step === "DISTORTION" ? "Name the cognitive distortion" :
            step === "REFRAME" ? "Write the rational reframe" :
            "Commit to an action"
          }</p>
        </div>
        <button onClick={resetForm} className="text-muted-foreground hover:text-foreground transition-colors p-1">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex gap-1">
        {steps.map((s, i) => (
          <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i < stepIndex ? "bg-primary" : i === stepIndex ? "bg-primary/60" : "bg-secondary"}`} />
        ))}
      </div>

      {step === "SITUATION" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
            <p className="text-sm font-semibold mb-1">What is happening right now?</p>
            <p className="text-xs text-muted-foreground">The specific context that triggered this thought or feeling.</p>
          </div>
          <div className="space-y-2">
            {SITUATIONS.map(s => (
              <button key={s.id} type="button" onClick={() => { setSituation(s.id); setStep("EMOTION"); }}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  situation === s.id ? "border-primary bg-primary/10" : "border-border/50 hover:border-border"
                }`}>
                <p className="font-semibold text-sm">{s.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "EMOTION" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
            <p className="text-sm font-semibold mb-1">What emotion is present?</p>
            <p className="text-xs text-muted-foreground">Be honest — naming the emotion reduces its intensity by up to 50%.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {EMOTIONS.map(e => (
              <button key={e.id} type="button" onClick={() => setEmotion(e.id)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  emotion === e.id ? `${e.border} ${e.bg}` : "border-border/50 hover:border-border"
                }`}>
                <p className={`font-semibold text-sm ${emotion === e.id ? e.color : ""}`}>{e.label}</p>
              </button>
            ))}
          </div>
          {emotion && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <p className="text-sm font-semibold">Intensity — how strongly are you feeling this?</p>
              <EmotionIntensityPicker value={emotionIntensity} onChange={setEmotionIntensity} />
            </div>
          )}
          <Button disabled={!emotion} className="w-full" onClick={() => setStep("THOUGHT")}>
            Continue <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {step === "THOUGHT" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
            <p className="text-sm font-semibold mb-1">What is the exact thought running through your mind?</p>
            <p className="text-xs text-muted-foreground">Write the automatic thought word-for-word. No editing — write what the emotional brain is actually saying.</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Quick select</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_THOUGHTS.map(t => (
                <button key={t} type="button" onClick={() => setAutomaticThought(t)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all text-left ${
                    automaticThought === t ? "border-amber-500/50 bg-amber-500/10 text-amber-400" : "border-border/50 text-muted-foreground hover:border-border"
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <Textarea
            value={automaticThought}
            onChange={(e) => setAutomaticThought(e.target.value)}
            placeholder="Write the exact thought the emotional brain is running..."
            className="resize-none h-24 text-sm font-mono"
            autoFocus
          />
          <Button disabled={automaticThought.trim().length < 3} className="w-full" onClick={() => setStep("DISTORTION")}>
            Continue <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {step === "DISTORTION" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
            <p className="text-sm font-semibold mb-1">Name the cognitive distortion</p>
            <p className="text-xs text-muted-foreground">Identifying the distortion type interrupts the automatic pattern. Which one fits what you wrote?</p>
          </div>
          <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
            <p className="text-xs text-amber-400 font-mono">Your thought: <span className="text-foreground italic">"{automaticThought}"</span></p>
          </div>
          <div className="space-y-2">
            {DISTORTIONS.map(d => (
              <button key={d.id} type="button" onClick={() => setDistortionId(d.id)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  distortionId === d.id ? "border-amber-500/60 bg-amber-500/10" : "border-border/50 hover:border-border"
                }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className={`font-bold text-sm ${distortionId === d.id ? "text-amber-400" : ""}`}>{d.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{d.description}</p>
                    {distortionId === d.id && (
                      <p className="text-xs text-amber-400/70 mt-2 italic animate-in fade-in duration-200">{d.example}</p>
                    )}
                  </div>
                  {distortionId === d.id && <Check className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />}
                </div>
              </button>
            ))}
          </div>
          <Button disabled={!distortionId} className="w-full" onClick={() => setStep("REFRAME")}>
            Continue <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {step === "REFRAME" && selectedDistortion && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
            <p className="text-sm font-semibold mb-1">Write the rational reframe</p>
            <p className="text-xs text-muted-foreground">What would your best, most objective self say back to that thought? One clear, honest sentence.</p>
          </div>
          <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
            <p className="text-xs text-primary uppercase tracking-widest">Evidence-based counter for {selectedDistortion.label}</p>
            <p className="text-sm text-muted-foreground italic leading-relaxed">"{selectedDistortion.counter}"</p>
            <button onClick={() => setRationalReframe(selectedDistortion.counter)}
              className="text-xs text-primary hover:underline">
              Use this as my reframe →
            </button>
          </div>
          <Textarea
            value={rationalReframe}
            onChange={(e) => setRationalReframe(e.target.value)}
            placeholder="Write your own reframe — in your own words, it's more powerful..."
            className="resize-none h-24 text-sm font-mono"
            autoFocus
          />
          <Button disabled={rationalReframe.trim().length < 5} className="w-full" onClick={() => setStep("ACTION")}>
            Continue <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {step === "ACTION" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
            <p className="text-sm font-semibold mb-1">Commit to an action</p>
            <p className="text-xs text-muted-foreground">The final step: what will you do right now? A committed action closes the loop and prevents the emotional brain from re-engaging.</p>
          </div>
          <div className="space-y-2">
            {ACTIONS.map(a => (
              <button key={a.id} type="button" onClick={() => setAction(a.id)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  action === a.id ? "border-primary bg-primary/10" : "border-border/50 hover:border-border"
                }`}>
                <div className="flex items-center gap-3">
                  {a.id === "BREATHE" ? <Wind className="h-4 w-4 text-blue-400 flex-shrink-0" /> :
                   a.id === "CLOSE_CHARTS" ? <X className="h-4 w-4 text-amber-400 flex-shrink-0" /> :
                   a.id === "REVIEW_RULES" ? <Brain className="h-4 w-4 text-primary flex-shrink-0" /> :
                   a.id === "WALK_AWAY" ? <Clock className="h-4 w-4 text-green-400 flex-shrink-0" /> :
                   <Check className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                  <div>
                    <p className={`font-semibold text-sm ${action === a.id ? "text-primary" : ""}`}>{a.label}</p>
                    <p className="text-xs text-muted-foreground">{a.sub}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <Button disabled={!action} size="lg" className="w-full h-12" onClick={handleComplete}>
            <Check className="h-4 w-4 mr-2" /> Complete Record
          </Button>
        </div>
      )}
    </div>
  );
}
