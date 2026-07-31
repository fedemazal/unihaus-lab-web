"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { signOut } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import {
  LayoutDashboard,
  FolderOpen,
  BarChart3,
  Gift,
  ClipboardCheck,
  Settings,
  LogOut,
  Shield,
  Menu,
  X,
  FileStack,
} from "lucide-react";
import { useState } from "react";

const agentNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/producciones", label: "Producciones", icon: FolderOpen },
  { href: "/estadisticas", label: "Estadísticas", icon: BarChart3 },
  { href: "/beneficios", label: "Beneficios", icon: Gift },
  { href: "/preparacion", label: "Preparación", icon: ClipboardCheck },
];

const adminNav = [
  { href: "/admin", label: "Admin", icon: Shield },
  { href: "/admin/cuentas", label: "Cuentas", icon: Settings },
  { href: "/admin/inmobiliarias", label: "Inmobiliarias", icon: Settings },
  { href: "/admin/producciones", label: "Producciones", icon: FolderOpen },
  { href: "/admin/beneficios", label: "Beneficios", icon: Gift },
  { href: "/admin/materiales", label: "Materiales", icon: FileStack },
  { href: "/admin/estadisticas", label: "Estadísticas", icon: BarChart3 },
];

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { profile, isAdmin } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  const navItems = isAdmin ? [...agentNav, ...adminNav] : agentNav;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0D1117]">
        {/* Top bar */}
        <header className="fixed top-0 w-full z-40 bg-[#161C26] border-b border-[#263040] h-16">
          <div className="h-full px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden text-[#E2ECF4]"
              >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <Link href="/dashboard">
                <Image
                  src="/img/Logo-horizontal.svg"
                  alt="UniHaus Lab"
                  width={300}
                  height={68}
                  className="h-10 w-auto"
                />
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-[#7A96A8] hidden sm:block">
                {profile?.nombre}
              </span>
              <div className="w-8 h-8 rounded-full bg-[#F2B968] flex items-center justify-center text-[#0D1117] text-sm font-bold">
                {profile?.nombre?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Sidebar */}
        <aside
          className={`fixed top-16 left-0 z-30 h-[calc(100vh-4rem)] w-64 bg-[#161C26] border-r border-[#263040] transition-transform duration-200 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0`}
        >
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? "bg-[#F2B968]/10 text-[#F2B968]"
                      : "text-[#7A96A8] hover:bg-[#1E2A38] hover:text-[#E2ECF4]"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}

            <hr className="my-4 border-[#263040]" />

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#7A96A8] hover:bg-[#1E2A38] hover:text-[#E2ECF4] transition w-full"
            >
              <LogOut className="w-5 h-5" />
              Cerrar sesión
            </button>
          </nav>
        </aside>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/60 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="pt-16 lg:pl-64">
          <div className="p-6 md:p-8 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
