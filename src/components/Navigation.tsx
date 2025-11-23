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
  <nav className="sticky top-0 z-50 border-b border-transparent bg-gradient-to-b from-white/70 to-white/40 backdrop-blur-xl">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <img
            src="/Avatar-head.png"
            alt="LabGuard mini avatar"
            className="
              h-7 w-7
              rounded-full
              object-contain
              opacity-90
              drop-shadow-[0_3px_6px_rgba(0,0,0,0.18)]
              transition-transform
              group-hover:scale-110
            "
          />
          <span className="font-semibold text-lg text-slate-900">
            LabGuard
          </span>
        </Link>

       {/* SREDINA – gel bubble nav */}
<div
  className="
    hidden md:flex items-center gap-1
    px-2 py-1
    glass-nav-shell
  "
>
  {navItems
    .filter((item) => session || item.path !== "/moji-nalazi")
    .map((item) => {
      const active = location.pathname === item.path;
      return (
        <Link
          key={item.path}
          to={item.path}
          className={`
            glass-nav-pill
            relative px-4 py-1.5 text-sm font-medium
            ${
              active
                ? "glass-nav-pill--active text-slate-900"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }
          `}
        >
          {item.name}
        </Link>
      );
    })}
</div>

        

        {/* Desno – auth info i dugme */}
        <div className="flex items-center gap-3">
          {!session ? (
            <>
              <Link
                to="/login"
                className="
                  hidden sm:inline-flex 
                  text-sm font-medium 
                  text-slate-600 hover:text-slate-900
                "
              >
                Prijava
              </Link>
              <Link
                to="/signup"
                className="
                  text-sm font-medium 
                  px-3 py-1.5 rounded-full
                  bg-white/80
                  border border-white/70
                  shadow-[0_6px_16px_rgba(15,23,42,0.12)]
                  hover:bg-white
                  hover:shadow-[0_10px_26px_rgba(15,23,42,0.16)]
                  transition-all
                "
              >
                Registracija
              </Link>
            </>
          ) : (
            <>
              <span className="hidden sm:inline text-sm text-slate-600">
                {session.email}
              </span>
              <button
                onClick={() => {
                  signOut();
                  nav("/");
                }}
                className="
                  text-sm px-3 py-1.5 rounded-full
                  bg-slate-900/90
                  text-white
                  shadow-[0_8px_20px_rgba(15,23,42,0.4)]
                  hover:bg-slate-900
                  transition-all
                "
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
