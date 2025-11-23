import { Link, useNavigate, useLocation } from "react-router-dom";
import { Droplet, Heart } from "lucide-react";
import { useSyncExternalStore } from "react";
import { getCurrentSession } from "@/lib/db";
import { signOut } from "@/lib/auth";

// --- lokalni “store” da nav automatski reaguje kad se promijeni localStorage
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}
function getSnapshot() {
  return localStorage.getItem("lg_current") || "";
}

const Navigation = () => {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const session = getCurrentSession();
  const location = useLocation();
  const nav = useNavigate();

  const navItems = [
  { name: "Početna", path: "/" },
  { name: "O nama", path: "/about" },
  { name: "Analiza", path: "/analiza" },
  { name: "Moji nalazi", path: "/moji-nalazi" }, // NOVO
  { name: "Kontakt", path: "/contact" },
];


  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex items-center gap-1">
              <Droplet className="h-6 w-6 text-primary transition-transform group-hover:scale-110" />
              <Heart className="h-5 w-5 text-secondary transition-transform group-hover:scale-110" />
            </div>
            <span className="font-semibold text-lg text-foreground">
              LabGuard
            </span>
          </Link>

          {/* Linkovi */}
          <div className="flex items-center gap-6">
            {navItems
  .filter(item => session || item.path !== "/moji-nalazi")
  .map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm font-medium transition-colors relative ${
                  location.pathname === item.path
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.name}
                {location.pathname === item.path && (
                  <span className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-primary" />
                )}
              </Link>
            ))}

            {/* Auth kontrole */}
            {!session ? (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Prijava
                </Link>
                <Link
                  to="/signup"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Registracija
                </Link>
              </>
            ) : (
              <>
                <span className="text-sm text-muted-foreground">
                  {session.email}
                </span>
                <button
                  onClick={() => {
                    signOut();
                    nav("/");
                  }}
                  className="text-sm border rounded px-2 py-1 hover:bg-muted transition"
                >
                  Odjava
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
