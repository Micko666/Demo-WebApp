import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Droplet, Heart, Apple, Leaf } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCurrentSession } from "@/lib/db";
import { useEffect, useRef } from "react";

type LetterChar = {
  char: string;
  font: string;
  size: number;
  color: string;
  layer: number;
  coef: number;
  posX: number;
  posY: number;
};

const LetterParallaxBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const characterList = [
      "RBC","Hgb","Hct","MCV","MCH","MCHC","RDW","WBC","Neu %","Lim %","Mon %","Eo %","Ba %",
      "PLT","MPV","PCT","📈","S","t","u","v","w","x","y","z",
    ];

    const layers = {
      n: 5,
      letters: [100, 40, 30, 20, 10],
      coef: [0.1, 0.2, 0.4, 0.6, 0.8],
      size: [16, 22, 36, 40, 46],
      // blago plavkaste nijanse, u tonu primarne boje dugmeta
      color: [
        "hsl(210 65% 92%)",
        "hsl(210 65% 88%)",
        "hsl(210 65% 82%)",
        "hsl(210 65% 76%)",
        "hsl(210 65% 70%)",
      ],
      font: "Courier",
    };

    const characters: LetterChar[] = [];
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let animationFrameId: number | null = null;

    const rnd = {
      btwn(min: number, max: number) {
        return Math.floor(Math.random() * (max - min) + min);
      },
      choose<T>(list: T[]): T {
        return list[this.btwn(0, list.length)];
      },
    };

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      characters.length = 0;
      createLetters();
      update();
    }

    function createLetters() {
      for (let i = 0; i < layers.n; i++) {
        for (let j = 0; j < layers.letters[i]; j++) {
          const character = rnd.choose(characterList);
          const x = rnd.btwn(0, canvas.width);
          const y = rnd.btwn(0, canvas.height);

          characters.push({
            char: character,
            font: layers.font,
            size: layers.size[i],
            color: layers.color[i],
            layer: i,
            coef: layers.coef[i],
            posX: x,
            posY: y,
          });
        }
      }
    }

    function drawLetter(char: LetterChar) {
      ctx.font = `${char.size}px ${char.font}`;
      ctx.fillStyle = char.color;

      const x = char.posX + (mouseX - canvas.width / 2) * char.coef;
      const y = char.posY + (mouseY - canvas.height / 2) * char.coef;

      ctx.fillText(char.char, x, y);
    }

    function clear() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function render() {
      for (let i = 0; i < characters.length; i++) {
        drawLetter(characters[i]);
      }
    }

    function update() {
      clear();
      render();
    }

    function handleMouseMove(ev: MouseEvent) {
      mouseX = ev.clientX;
      mouseY = ev.clientY;

      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      animationFrameId = requestAnimationFrame(update);
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="letters-canvas absolute inset-0 z-10 pointer-events-none"
    />
  );
};

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
      title: "Trendovi kroz vrijeme",
      description:
        "Prati kako se tvoje vrijednosti mijenjaju kroz više nalaza.",
    },
    {
      icon: Apple,
      title: "Nutri-savjeti (coming soon)",
      description:
        "Neutralne informacije o uticaju navika na tvoje rezultate.",
    },
    {
      icon: Leaf,
      title: "Privatnost i kontrola",
      description:
        "Obrada fajlova lokalno – ti odlučuješ šta čuvaš i šta brišeš.",
    },
  ];

  const handleStartAnalysis = () => {
    if (session) {
      navigate("/analiza");
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      
      <section className="relative overflow-hidden py-16 sm:py-25">

        
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

        
        <LetterParallaxBackground />

        <div className="relative z-20 container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            
            <div className="flex justify-center mb-10">
              <div className="flex justify-center mb-10">
  <img
  src="/Defense.png"
  alt="LabGuard"
  className="
    w-52 h-52
    object-contain
    animate-float-soft
    drop-shadow-[0_6px_20px_rgba(180,180,180,0.35)]
  "
/>


</div>
            </div>

           
            <h1
              className="
                hero-cloud
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
                hero-cloud
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
                shadow-md shadow-black-600/20
                hover:bg-blue-100/80 
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
                LabGuard automatski prepoznaje analite iz tvojih nalaza i
                pretvara ih u jasne tabele, trendove i neutralne uvide,
                pripremajući te za razgovor sa ljekarom.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, index) => (
                <Card
  key={feature.title}
  className="
    glass-card
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
