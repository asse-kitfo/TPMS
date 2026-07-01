import { useState, useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const COOKIE_NAME = "apexterm-disclaimer-v1";
const COOKIE_DAYS = 365;

function hasAccepted(): boolean {
  try {
    return document.cookie.split(";").some(c => c.trim().startsWith(COOKIE_NAME + "="));
  } catch {
    return false;
  }
}

function setAccepted() {
  try {
    const expires = new Date();
    expires.setDate(expires.getDate() + COOKIE_DAYS);
    document.cookie = `${COOKIE_NAME}=1; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
  } catch {
    // cookie write unavailable — degrade silently
  }
}

export function DisclaimerModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!hasAccepted()) setOpen(true);
  }, []);

  if (!open) return null;

  const accept = () => {
    setAccepted();
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-lg w-full p-8 space-y-6 animate-in zoom-in-95 duration-300">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-primary flex-shrink-0" />
          <h2 className="text-xl font-bold tracking-tight">Before You Begin</h2>
        </div>

        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground">ApexTerm is a psychological awareness tool</strong>, not a financial advisory service. Nothing in this application constitutes investment advice, trading recommendations, or a guarantee of trading performance.
          </p>
          <p>
            The Trade Gate, verdict system, and scoring algorithms are designed to help you examine your <em>psychological state</em> before trading decisions — not to predict market outcomes. All verdicts reflect your self-reported emotional and cognitive state only.
          </p>
          <p>
            Trading financial instruments involves substantial risk of loss. You are solely responsible for all trading decisions and their consequences. Always consult a qualified financial professional before trading.
          </p>
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-foreground font-medium">
              By continuing, you confirm you understand this is a psychological awareness tool, not financial advice, and that all risk remains with you as the trader.
            </p>
          </div>
        </div>

        <Button size="lg" className="w-full h-12 font-bold" onClick={accept}>
          I Understand — Open ApexTerm
        </Button>
      </div>
    </div>
  );
}
