// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navigation from "./components/Navigation";

import Index from "./pages/Index";
import About from "./pages/About";
import Contact from "./pages/Contact";
import AnalyzerPage from "./pages/AnalyzerPage";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";

import Protected from "./components/Protected";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={0}>
        <BrowserRouter>
          <Navigation />

          <Routes>
            {/* JAVNA RUTA */}
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/analiza" element={<AnalyzerPage />} />

            {/* LOGIN / SIGNUP */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* PROTEKTOVANA RUTA */}
            <Route
              path="/moji-nalazi"
              element={
                <Protected>
                  <Dashboard />
                </Protected>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>

          <Toaster />
          <Sonner />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
