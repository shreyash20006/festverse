import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, Phone, MapPin, Send, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contact Us · FestVerse" }] }),
  component: ContactPage,
});

function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      toast.success("Thank you! Your message has been sent. We'll get back to you shortly.");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      setSending(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[oklch(0.99_0.003_250)] dark:bg-[oklch(0.12_0.01_265)]">
      <SiteHeader />
      
      {/* Hero section */}
      <section className="relative overflow-hidden py-20 px-6 text-center border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-hero opacity-30" />
        <div className="container relative mx-auto max-w-3xl">
          <span className="inline-block rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold px-3 py-1 uppercase tracking-wider">
            Get In Touch
          </span>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
            We'd love to hear from you.
          </h1>
          <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Have questions about pricing, setup, or deploying a portal for your college? Drop us a line.
          </p>
        </div>
      </section>

      {/* Main Grid */}
      <section className="container mx-auto px-6 py-16 max-w-5xl">
        <div className="grid gap-12 md:grid-cols-5">
          {/* Info cards */}
          <div className="md:col-span-2 space-y-6">
            <h2 className="font-display text-2xl font-bold text-foreground">Support Helpdesk</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you're a student experiencing check-in or certificate issues, or a college representative interested in our Enterprise features, get in touch with our helpdesk.
            </p>

            <div className="space-y-4 pt-4 border-t border-border/60">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-semibold text-xs text-muted-foreground uppercase block">Email support</span>
                  <a href="mailto:support@festverse.app" className="text-sm font-semibold hover:underline">
                    support@festverse.app
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-semibold text-xs text-muted-foreground uppercase block">Call sales</span>
                  <span className="text-sm font-semibold">+91 (800) 555-0199</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-semibold text-xs text-muted-foreground uppercase block">Headquarters</span>
                  <span className="text-sm font-semibold">Nagpur, Maharashtra, India</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form card */}
          <div className="md:col-span-3 rounded-3xl border border-border bg-card p-8 shadow-card">
            <h3 className="font-display text-lg font-bold text-foreground mb-6 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Send a Message
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="c-name">Your Name</Label>
                  <Input
                    id="c-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="E.g. Rahul Sharma"
                    className="rounded-xl border-border bg-background/50 h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-email">College Email</Label>
                  <Input
                    id="c-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="E.g. rahul@college.edu"
                    className="rounded-xl border-border bg-background/50 h-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="c-subject">Subject</Label>
                <Input
                  id="c-subject"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="How can we help you?"
                  className="rounded-xl border-border bg-background/50 h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="c-msg">Message</Label>
                <Textarea
                  id="c-msg"
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your query in detail..."
                  className="rounded-xl border-border bg-background/50 resize-none"
                />
              </div>

              <Button 
                type="submit" 
                disabled={sending}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 flex items-center justify-center gap-2 shadow-soft active:scale-98"
              >
                {sending ? "Sending..." : <>Send Message <Send className="h-4 w-4" /></>}
              </Button>
            </form>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
