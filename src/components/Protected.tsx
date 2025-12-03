import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getCurrentSession } from "@/lib/db";

export default function Protected({ children }: { children: ReactNode }) {
  const session = getCurrentSession();
  const loc = useLocation();
  if (!session) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return <>{children}</>;
}
