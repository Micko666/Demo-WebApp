import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Droplet, Heart, Apple, Leaf } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCurrentSession } from "@/lib/db";

const Index = () => {
  const navigate = useNavigate();
  const session = getCurrentSession();

  const features = [
    {
      icon: Droplet,
      title: "Analiza krvi",
      description:
        "Automatsko prepoznavanje analita, jedinica i referentnih opsega.",
    },
    {
      icon: Heart,
      title: "Zdravstveni uvidi",
      description: "Razumljiv prikaz šta znače vaši biomarkeri.",
    },
    {
      icon: Apple,
      title: "Nutricione smjernice",
      description: "Neutralne preporuke o ishrani usklađene sa nalazima.",
    },
    {
      icon: Leaf,
      title: "Prirodna rješenja",
      description: "Ideje za navike i aktivnosti zasnovane na dokazima.",
    },
  ];

  const handleStartAnalysis = () => {
    if (!session) navigate("/login");
    else navigate("/analiza");
  };

  return (
    <div className="min-h-screen bg-background">

      {/* HERO SECTION */}
      <section className="relative overflow-hidden py-24 sm:py-40">
        {/* Gel-glass gradient */}
        <div
          className="
            absolute inset-0 
            bg-gradient-to-br 
            from-gray-200/30 
            via-white/40 
            to-gray-300/30
            backdrop-blur-xl
          "
        />

        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">

            {/* HERO ICON */}
            <div className="flex justify-center mb-10">
  <img
    src="/Defense.png"
    alt="LabGuard"
    className="
      w-38 h-32
      object-contain 
      animate-float-soft
      drop-shadow-[0_6px_20px_rgba(180,180,180,0.35)]


    "
  />
</div>



            {/* MAIN TITLE */}
            <h1
              className="
                text-4xl sm:text-5xl lg:text-6xl 
                font-bold 
                text-gray-900 
                tracking-tight
                drop-shadow-sm
              "
            >
              LabGuard
            </h1>

            {/* SUBTITLE */}
            <p
              className="
                mt-6 
                text-lg sm:text-xl 
                max-w-2xl mx-auto 
                text-gray-700 
                leading-relaxed
              "
            >
              Pretvori PDF laboratorijske nalaze u jasne uvide i CSV. Privatno,
              lokalno, pod tvojom kontrolom, uz AI objašnjenje svakog parametra.
            </p>

            {/* CTA BUTTON */}
            <Button
              size="lg"
              onClick={handleStartAnalysis}
              className="
                text-lg px-8 py-6 rounded-full 
                shadow-lg hover:shadow-xl 
                transition-all duration-300 
                hover:scale-105 
                mt-10
              "
            >
              Pokreni analizu
            </Button>

            <p className="mt-4 text-xs text-muted-foreground max-w-md mx-auto">
              Za pokretanje analize potrebno je da se prijaviš.
            </p>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 animate-fade-in">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">
                Kako funkcioniše
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                LabGuard automatski prepoznaje analite iz tvojih nalaza i pretvara ih u jasne tabele,
                trendove i neutralne uvide, pripremajući te za razgovor sa ljekarom.
              </p>
            </div>

            {/* FEATURE CARDS */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <Card
                  key={feature.title}
                  className="
                    border-transparent 
                    bg-white/40 backdrop-blur-xl 
                    shadow-lg shadow-black/10 
                    rounded-3xl 
                    transition-all duration-300 
                    hover:-translate-y-1 
                    hover:shadow-xl
                  "
                  style={{ animationDelay: `${index * 120}ms` }}
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
