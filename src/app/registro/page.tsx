"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { registerUser } from "@/lib/firebase/auth";
import { sendEmail, ADMIN_EMAIL } from "@/lib/email/send";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";

export default function RegistroPage() {
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    telefono: "",
    inmobiliaria: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (formData.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      await registerUser(
        formData.email,
        formData.password,
        formData.nombre,
        formData.telefono,
        formData.inmobiliaria
      );
      setSuccess(true);
      sendEmail("nueva_cuenta", ADMIN_EMAIL, {
        nombre: formData.nombre,
        email: formData.email,
        telefono: formData.telefono,
      });
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code === "auth/email-already-in-use") {
        setError("Este email ya está registrado. Intentá iniciar sesión.");
      } else {
        setError("Error al crear la cuenta. Intentá de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-white mb-4">¡Registro exitoso!</h1>
          <p className="text-gray-400 mb-8">
            Tu cuenta está pendiente de aprobación. Te enviaremos un email cuando sea aprobada
            para que puedas acceder al portal.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#C07856] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-12">
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
          <h1 className="text-3xl font-bold text-white mb-2">Crear cuenta</h1>
          <p className="text-gray-400">Registrate para solicitar producciones</p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nombre" className="text-gray-300">Nombre completo</Label>
            <Input
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Juan Pérez"
              required
              className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 mt-1"
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-gray-300">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="tu@email.com"
              required
              className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 mt-1"
            />
          </div>

          <div>
            <Label htmlFor="telefono" className="text-gray-300">Teléfono</Label>
            <Input
              id="telefono"
              name="telefono"
              type="tel"
              value={formData.telefono}
              onChange={handleChange}
              placeholder="+54 9 11 1234-5678"
              required
              className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 mt-1"
            />
          </div>

          <div>
            <Label htmlFor="inmobiliaria" className="text-gray-300">Inmobiliaria</Label>
            <Input
              id="inmobiliaria"
              name="inmobiliaria"
              value={formData.inmobiliaria}
              onChange={handleChange}
              placeholder="Nombre de tu inmobiliaria"
              required
              className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 mt-1"
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-gray-300">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Mínimo 6 caracteres"
              required
              className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 mt-1"
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="text-gray-300">Confirmar contraseña</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Repetí tu contraseña"
              required
              className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 mt-1"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C07856] hover:bg-[#a8654a] text-white py-3 rounded-lg text-base"
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </Button>
        </form>

        <p className="text-center mt-6 text-gray-400 text-sm">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="text-[#C07856] hover:underline">
            Iniciá sesión
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
