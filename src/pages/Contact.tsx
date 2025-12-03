import { Mail, MessageSquare, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const Contact = () => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast.success("Message sent successfully! We'll get back to you soon.");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Soft gel / gradient background */}
      <div
        className="
          absolute inset-0 
          bg-gradient-to-br 
          from-sky-100/60 
          via-white/70 
          to-emerald-50/60
          dark:from-slate-900/80 
          dark:via-slate-950/90 
          dark:to-sky-900/40
        "
      />

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 animate-fade-in hero-cloud">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-foreground">
              Get in Touch
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Have questions about LabGuard, your reports, or upcoming features?
              Send us a message and we&apos;ll respond as soon as possible.
            </p>
          </div>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)] items-start">
            {/* LEFT SIDE – contact info / cards */}
            <div className="space-y-6">
              <Card className="glass-card hero-cloud">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-foreground">
                        Email support
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        For anything related to LabGuard, send us a message at:
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-primary">
                    support@labguard.ai
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-foreground">
                        In-app assistant
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Use the LabGuard assistant for quick explanations of
                        your lab values, trends and neutral health insights.
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Coming soon: direct chat with our team right from your
                    dashboard.
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-foreground">
                        Response time
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        We aim to reply to most messages within:
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    24–48 hours on working days
                  </p>
                  <p className="text-xs text-muted-foreground">
                    For any urgent medical concerns, always contact your doctor
                    or local health services directly.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT SIDE – form */}
            <Card className="+">
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium mb-2 text-foreground"
                      >
                        Name
                      </label>
                      <Input
                        id="name"
                        placeholder="Your name"
                        required
                        className="bg-background/80"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium mb-2 text-foreground"
                      >
                        Email
                      </label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        required
                        className="bg-background/80"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="subject"
                      className="block text-sm font-medium mb-2 text-foreground"
                    >
                      Subject
                    </label>
                    <Input
                      id="subject"
                      placeholder="How can we help?"
                      required
                      className="bg-background/80"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium mb-2 text-foreground"
                    >
                      Message
                    </label>
                    <Textarea
                      id="message"
                      placeholder="Tell us more..."
                      rows={6}
                      required
                      className="bg-background/80 resize-none"
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full rounded-full"
                    >
                      Send Message
                    </Button>
                    <p className="mt-3 text-xs text-muted-foreground text-center">
                      By sending a message, you agree that we can use your
                      contact details to respond to your request. LabGuard does
                      not provide medical diagnosis or replace your doctor.
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
