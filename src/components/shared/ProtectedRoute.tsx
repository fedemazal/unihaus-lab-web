"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, profile, loading, isAdmin, isApproved } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (profile && profile.estado === "pendiente") {
      router.push("/login?status=pendiente");
      return;
    }

    if (profile && profile.estado === "rechazado") {
      router.push("/login?status=rechazado");
      return;
    }

    if (requireAdmin && !isAdmin) {
      router.push("/dashboard");
      return;
    }
  }, [user, profile, loading, isAdmin, isApproved, requireAdmin, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C07856]" />
      </div>
    );
  }

  if (!user || !profile || !isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C07856]" />
      </div>
    );
  }
  if (requireAdmin && !isAdmin) return null;

  return <>{children}</>;
}
