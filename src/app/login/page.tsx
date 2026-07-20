"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { loginUser, getUserProfile } from "@/lib/firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await loginUser(email, password);
      const profile = await getUserProfile(user.uid);

      if (!profile) {
        setError("No se encontró tu perfil. Contactá al administrador.");
        return;
      }

      if (profile.estado === "pendiente") {
        setError("Tu cuenta está pendiente de aprobación. Te notificaremos por email cuando sea aprobada.");
        return;
      }

      if (profile.estado === "rechazado") {
        setError("Tu cuenta fue rechazada. Contactá al administrador para más información.");
        return;
      }

      if (profile.rol === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Email o contraseña incorrectos. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/">
            <Image
              src="/img/Logo-horizontal.svg"
              alt="UniHaus Lab"
              width={440}
              height={100}
              className="h-20 w-auto mx-auto mb-8"
            />
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Iniciar sesión</h1>
          <p className="text-gray-400">Accedé a tu portal de producciones</p>
        </div>

        {status === "pendiente" && (
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-yellow-200 text-sm">
              Tu cuenta está pendiente de aprobación. Te notificaremos por email.
            </p>
          </div>
        )}

        {status === "rechazado" && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-200 text-sm">
              Tu cuenta fue rechazada. Contactá al administrador.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-gray-300">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 mt-1"
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-gray-300">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 mt-1"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C07856] hover:bg-[#a8654a] text-white py-3 rounded-lg text-base"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>

        <p className="text-center mt-6 text-gray-400 text-sm">
          ¿No tenés cuenta?{" "}
          <Link href="/registro" className="text-[#C07856] hover:underline">
            Registrate acá
          </Link>
        </p>

        <div className="text-center mt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-300 text-sm transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
