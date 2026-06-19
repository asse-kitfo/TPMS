import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  BookMarked, Plus, Pencil, Trash2, ChevronRight, ChevronLeft,
  X, Check, GripVertical, Eye, AlertTriangle
} from "lucide-react";

type Category = "ENTRY" | "EXIT" | "RISK" | "PSYCHOLOGY" | "GENERAL";

interface Rule {
  id: string;
  title: string;
  body: string;
  category: Category;
  sortOrder: number;
  createdAt: string;
}

const CATEGORIES: { value: Category; label: string; color: string; bg: string; border: string }[] = [
  { value: "ENTRY",      label: "Entry",       color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/30" },
  { value: "EXIT",       label: "Exit",        color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/30" },
  { value: "RISK",       label: "Risk",        color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/30" },
  { value: "PSYCHOLOGY", label: "Psychology",  color: "text-primary",    bg: "bg-primary/10",    border: "border-primary/30" },
  { value: "GENERAL",    label: "General",     color: "text-slate-300",  bg: "bg-slate-500/10",  border: "border-slate-500/30" },
];

const DEFAULT_RULES: Rule[] = [
  {
    id: "default-1",
    title: "A+ Setups Only",
    body: "I only enter trades that meet every single criterion of my A+ setup. If any element is missing, I do not enter. A B or C setup is not a trade — it is gambling with extra steps.",
    category: "ENTRY",
    sortOrder: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: "default-2",
    title: "Stop Loss is Non-Negotiable",
    body: "My stop loss is set at entry and never moved against me. If price hits my stop, I accept the loss and move on. Moving a stop is the survival brain refusing to accept reality — it converts small losses into account-ending ones.",
    category: "EXIT",
    sortOrder: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: "default-3",
    title: "The Urge to Trade Is the Signal to Wait",
    body: "If I feel a strong urge to find a trade or enter right now, I close the charts for at least 10 minutes. The urge is the emotional brain seeking stimulation — not the analytical brain seeing an edge.",
    category: "PSYCHOLOGY",
    sortOrder: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: "default-4",
    title: "Daily Loss Limit is an Iron Rule",
    body: "I set my loss limit before the market opens, when my cortex is running the show. When reached, I close all charts immediately and do not return that day. This rule was created by my thinking brain and cannot be overridden by my survival brain mid-session.",
    category: "RISK",
    sortOrder: 3,
    createdAt: new Date().toISOString(),
  },
  {
    id: "default-5",
    title: "Never Add to a Losing Position",
    body: "A trade moving against me is telling me my analysis was wrong. Adding size when I am wrong is the ego refusing to accept error. I honor my original risk and nothing more.",
    category: "RISK",
    sortOrder: 4,
    createdAt: new Date().toISOString(),
  },
  {
    id: "default-6",
    title: "20-Minute Recovery After a Loss",
    body: "After a stop is hit, I wait at least 20 minutes before considering another trade. This gives the amygdala activation time to subside and the prefrontal cortex to come back online. Revenge trading only happens when I skip this step.",
    category: "PSYCHOLOGY",
    sortOrder: 5,
    createdAt: new Date().toISOString(),
  },
  {
    id: "default-7",
    title: "Take Profit at the Target — No Exceptions",
    body: "My take profit is set at a level where the trade has a positive expected value. Closing early because of 'gut feel' or fear of losing open profit is the survival brain robbing me of my edge. I let the methodology work.",
    category: "EXIT",
    sortOrder: 6,
    createdAt: new Date().toISOString(),
  },
  {
    id: "default-8",
    title: "Maximum 3 Trades Per Session",
    body: "Overtrading is the clearest sign of psychological hijacking. If I have a strong urge to keep trading after 3 trades, I step away. My edge does not require volume — it requires quality.",
    category: "GENERAL",
    sortOrder: 7,
    createdAt: new Date().toISOString(),
  },
];

function getCategoryMeta(cat: Category) {
  return CATEGORIES.find(c => c.value === cat) ?? CATEGORIES[4];
}

function generateId() {
  return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function ReviewMode({ rules, onClose }: { rules: Rule[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const done = index >= rules.length;
  const rule = rules[index];

  if (rules.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-xl font-semibold">No rules to review</p>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center animate-in fade-in duration-300">
        <div className="text-center space-y-6 max-w-md px-6">
          <div className="h-20 w-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto">
            <Check className="h-10 w-10 text-green-400" />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Review Complete</p>
            <h2 className="text-3xl font-black">All {rules.length} rules committed.</h2>
            <p className="text-muted-foreground">Your cortex has been briefed. Now let it do its job.</p>
          </div>
          <Button size="lg" className="w-full" onClick={onClose}>
            Begin Trading Session
          </Button>
        </div>
      </div>
    );
  }

  const meta = getCategoryMeta(rule.category);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-200">
      {/* Progress bar */}
      <div className="h-1 bg-secondary">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${(index / rules.length) * 100}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <p className="text-sm text-muted-foreground font-mono">
          Rule {index + 1} of {rules.length}
        </p>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Rule content */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="max-w-2xl w-full space-y-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-300" key={rule.id}>
          <Badge variant="outline" className={`${meta.color} ${meta.border} ${meta.bg} text-sm px-4 py-1`}>
            {meta.label}
          </Badge>
          <h1 className="text-4xl font-black leading-tight">{rule.title}</h1>
          <p className="text-xl text-muted-foreground leading-relaxed">{rule.body}</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="px-8 py-6 border-t border-border flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          onClick={() => setIndex(i => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>

        <div className="flex gap-1.5">
          {rules.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-primary" : "w-1.5 bg-secondary hover:bg-secondary/80"}`}
            />
          ))}
        </div>

        <Button onClick={() => setIndex(i => i + 1)}>
          {index === rules.length - 1 ? "Complete Review" : "Next"}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

interface EditFormProps {
  initial?: Rule;
  onSave: (data: { title: string; body: string; category: Category }) => void;
  onCancel: () => void;
}

function RuleForm({ initial, onSave, onCancel }: EditFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [category, setCategory] = useState<Category>(initial?.category ?? "GENERAL");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const canSave = title.trim().length > 0 && body.trim().length > 0;

  return (
    <div className="space-y-4 p-5 rounded-xl border-2 border-primary/30 bg-primary/5 animate-in fade-in slide-in-from-top-2 duration-200">
      <p className="text-sm font-semibold text-primary uppercase tracking-wider">
        {initial ? "Edit Rule" : "New Rule"}
      </p>

      <div className="space-y-3">
        <Input
          ref={titleRef}
          placeholder="Rule title — be direct and specific"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="h-11 text-base font-semibold"
        />

        <Textarea
          placeholder="Write the rule in full. Be explicit about what you will and won't do. Vague rules are ignored. Specific rules are followed."
          value={body}
          onChange={e => setBody(e.target.value)}
          className="resize-none h-28 text-sm font-mono leading-relaxed"
        />

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                category === cat.value
                  ? `${cat.color} ${cat.bg} ${cat.border}`
                  : "border-border text-muted-foreground hover:border-border/80"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4 mr-1" /> Cancel
        </Button>
        <Button size="sm" disabled={!canSave} onClick={() => onSave({ title: title.trim(), body: body.trim(), category })} className="flex-1">
          <Check className="h-4 w-4 mr-1" /> {initial ? "Save Changes" : "Add Rule"}
        </Button>
      </div>
    </div>
  );
}

export default function TradingRules() {
  const [rules, setRules] = useState<Rule[]>(() => {
    try {
      const stored = localStorage.getItem("trading-rules");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_RULES;
  });

  const [activeCategory, setActiveCategory] = useState<Category | "ALL">("ALL");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reviewMode, setReviewMode] = useState(false);

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem("trading-rules", JSON.stringify(rules));
  }, [rules]);

  const addRule = (data: { title: string; body: string; category: Category }) => {
    setRules(prev => [
      ...prev,
      {
        id: generateId(),
        title: data.title,
        body: data.body,
        category: data.category,
        sortOrder: prev.length,
        createdAt: new Date().toISOString(),
      },
    ]);
    setShowAddForm(false);
  };

  const updateRule = (id: string, data: { title: string; body: string; category: Category }) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    setEditingId(null);
  };

  const deleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    setDeletingId(null);
  };

  const filteredRules = activeCategory === "ALL" ? rules : rules.filter(r => r.category === activeCategory);

  const counts = CATEGORIES.reduce((acc, cat) => {
    acc[cat.value] = rules.filter(r => r.category === cat.value).length;
    return acc;
  }, {} as Record<Category, number>);

  return (
    <>
      {reviewMode && (
        <ReviewMode rules={filteredRules} onClose={() => setReviewMode(false)} />
      )}

      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <BookMarked className="h-8 w-8 text-primary" /> My Trading Rules
            </h1>
            <p className="text-muted-foreground mt-1">
              {rules.length} rule{rules.length !== 1 ? "s" : ""} — your cortex contracts with your amygdala, written in advance.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReviewMode(true)}
              disabled={filteredRules.length === 0}
            >
              <Eye className="h-4 w-4 mr-2" /> Review Mode
            </Button>
            <Button
              size="sm"
              onClick={() => { setShowAddForm(true); setEditingId(null); }}
              disabled={showAddForm}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Rule
            </Button>
          </div>
        </div>

        {/* Context banner */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 flex gap-3">
          <BookMarked className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-primary">Why written rules work</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Written rules activate the prefrontal cortex and create a commitment device. When the amygdala hijacks your thinking mid-trade, you cannot remember rules clearly — but you can <strong className="text-foreground">read</strong> them. Use <strong className="text-foreground">Review Mode</strong> before every session to prime your cortex and create a psychological contract with yourself.
            </p>
          </div>
        </div>

        {/* Add form */}
        {showAddForm && (
          <RuleForm
            onSave={addRule}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        {/* Category filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => setActiveCategory("ALL")}
            className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
              activeCategory === "ALL"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-border/80"
            }`}
          >
            All <span className="text-muted-foreground font-mono ml-1">{rules.length}</span>
          </button>
          {CATEGORIES.map(cat => (
            counts[cat.value] > 0 && (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                  activeCategory === cat.value
                    ? `${cat.color} ${cat.bg} ${cat.border}`
                    : "border-border text-muted-foreground hover:border-border/80"
                }`}
              >
                {cat.label} <span className="font-mono ml-1">{counts[cat.value]}</span>
              </button>
            )
          ))}
        </div>

        {/* Rules list */}
        {filteredRules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <BookMarked className="h-12 w-12 text-muted-foreground opacity-20" />
            <p className="text-muted-foreground">No rules in this category yet.</p>
            <Button size="sm" variant="outline" onClick={() => { setShowAddForm(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Add First Rule
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRules.map((rule, idx) => {
              const meta = getCategoryMeta(rule.category);
              const isEditing = editingId === rule.id;
              const isDeleting = deletingId === rule.id;

              if (isEditing) {
                return (
                  <RuleForm
                    key={rule.id}
                    initial={rule}
                    onSave={data => updateRule(rule.id, data)}
                    onCancel={() => setEditingId(null)}
                  />
                );
              }

              return (
                <Card key={rule.id} className={`border transition-all ${isDeleting ? "border-destructive/50 bg-destructive/5" : "border-border/50 hover:border-border"}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Index */}
                      <span className="text-muted-foreground/40 font-mono text-sm pt-0.5 flex-shrink-0 w-5 text-right">
                        {idx + 1}
                      </span>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start gap-3 flex-wrap">
                          <h3 className="font-bold text-base leading-tight flex-1">{rule.title}</h3>
                          <Badge
                            variant="outline"
                            className={`text-xs ${meta.color} ${meta.bg} ${meta.border} flex-shrink-0`}
                          >
                            {meta.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed font-mono">{rule.body}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        {isDeleting ? (
                          <>
                            <Button size="sm" variant="destructive" className="h-7 text-xs px-2" onClick={() => deleteRule(rule.id)}>
                              Delete
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setDeletingId(null)}>
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => { setEditingId(rule.id); setShowAddForm(false); }}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                              title="Edit rule"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingId(rule.id)}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              title="Delete rule"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Review CTA at bottom */}
        {rules.length > 0 && (
          <div className="pt-4 border-t border-border/50 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Read all rules in sequence before every session to prime your thinking brain.
            </p>
            <Button variant="outline" size="sm" onClick={() => setReviewMode(true)}>
              <Eye className="h-4 w-4 mr-2" /> Start Review
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
