import LabAnalyzer from "../components/LabAnalyzer";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Droplet, Heart, Apple, Leaf, Activity, ChevronDown } from "lucide-react";

const Index = () => {
  const [showAnalysis, setShowAnalysis] = useState(false);

  const features = [
    {
      icon: Droplet,
      title: "Analiza krvi",
      description: "Automatsko prepoznavanje analita, jedinica i referentnih opsega",
    },
    {
      icon: Heart,
      title: "Zdravstveni uvidi",
      description: "Razumljiv prikaz šta znače vaši biomarkeri",
    },
    {
      icon: Apple,
      title: "Nutricione smjernice",
      description: "Neutralne preporuke o ishrani usklađene sa nalazima",
    },
    {
      icon: Leaf,
      title: "Prirodna rješenja",
      description: "Ideje za navike i aktivnosti zasnovane na dokazima",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <div className="flex justify-center gap-3 mb-6">
              <Activity className="h-12 w-12 text-primary animate-pulse-soft" />
              <Apple className="h-12 w-12 text-secondary animate-pulse-soft" style={{ animationDelay: "0.2s" }} />
              <Heart className="h-12 w-12 text-accent animate-pulse-soft" style={{ animationDelay: "0.4s" }} />
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-foreground leading-tight">
              LabGuard<br />
              
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Pretvori PDF laboratorijske nalaze u jasne uvide i CSV. Privatno, lokalno, pod tvojom kontrolom.
            </p>

            <Button
              size="lg"
              onClick={() => setShowAnalysis(!showAnalysis)}
              className="text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              {showAnalysis ? "Sakrij analizu" : "Pokreni analizu"}
              <ChevronDown className={`ml-2 h-5 w-5 transition-transform duration-300 ${showAnalysis ? "rotate-180" : ""}`} />
            </Button>
          </div>
        </div>
      </section>

      {/* Analiza */}
      {showAnalysis && (
        <section className="animate-slide-down">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <Card className="max-w-6xl mx-auto border-2 border-primary/20 shadow-2xl">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Analiza laboratorijskih nalaza
                  </h2>
                  <p className="text-muted-foreground">
                    Učitaj jedan ili više PDF dokumenata i preuzmi rezultate kao CSV.
                  </p>
                </div>

                <div className="max-w-6xl mx-auto">
                  <LabAnalyzer />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Kako funkcioniše */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 animate-fade-in">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">
                Kako funkcioniše
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Podaci iz tvojih nalaza pretvaraju se u pregledne tabele i uvid u trendove.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <Card
                  key={feature.title}
                  className="border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="p-6 text-center">
                    <feature.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2 text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
