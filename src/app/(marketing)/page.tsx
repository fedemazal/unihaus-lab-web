import Link from "next/link";
import {
  ArrowRight,
  Camera,
  Video,
  Scan,
  Plane,
  PenTool,
  Sofa,
  ClipboardList,
  CalendarCheck,
  Aperture,
  Download,
} from "lucide-react";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="min-h-screen flex items-center bg-black text-white relative pt-20 overflow-hidden">
        {/* Video de fondo */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-25 scale-105"
        >
          <source src="/img/hero-bg.mp4" type="video/mp4" />
        </video>
        {/* Gradiente sobre el video */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/80 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            DESTACÁ TUS PROPIEDADES
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Producción fotográfica profesional que convierte visitas en ventas
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/registro"
              className="inline-flex items-center gap-2 bg-[#F2B968] hover:bg-[#d9a050] text-black font-semibold py-4 px-10 rounded-full text-lg transition"
            >
              Cotizá tu producción
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 border border-gray-600 hover:border-white text-white font-medium py-4 px-10 rounded-full text-lg transition"
            >
              Iniciar sesión
            </Link>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mt-16 max-w-5xl mx-auto">
            {[
              { value: "+1.100", label: "Producciones realizadas" },
              { value: "+6",     label: "Años de experiencia" },
              { value: "+100",   label: "Clientes felices" },
              { value: "+75k",   label: "Fotos tomadas" },
              { value: "+200hs", label: "Videos realizados" },
              { value: "48hs",   label: "Entrega del material" },
            ].map((m) => (
              <div key={m.label}>
                <div className="text-2xl md:text-3xl font-bold text-[#F2B968]">{m.value}</div>
                <p className="text-gray-500 mt-1 text-sm">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="py-28 bg-black border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <span className="text-[#F2B968] text-sm font-semibold uppercase tracking-widest">
              Simple y rápido
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mt-3">Cómo funciona</h2>
          </div>

          <div className="relative">
            {/* Línea conectora desktop */}
            <div className="hidden md:block absolute top-12 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

            <div className="grid md:grid-cols-4 gap-10">
              {[
                {
                  icon: ClipboardList,
                  step: "01",
                  title: "Cotizá online",
                  desc: "Ingresá los datos de la propiedad y recibí tu precio al instante sin hablar con nadie.",
                },
                {
                  icon: CalendarCheck,
                  step: "02",
                  title: "Coordinamos la visita",
                  desc: "Elegís el día y horario que mejor te quede. Confirmamos en el día.",
                },
                {
                  icon: Aperture,
                  step: "03",
                  title: "Relevamos la propiedad",
                  desc: "Nuestro equipo captura cada rincón con equipos profesionales de alta calidad.",
                },
                {
                  icon: Download,
                  step: "04",
                  title: "Descargá tu material",
                  desc: "Fotos, videos y planos listos en tu portal privado en menos de 48 hs.",
                },
              ].map(({ icon: Icon, step, title, desc }) => (
                <div key={step} className="relative flex flex-col items-center text-center">
                  {/* Ícono con número */}
                  <div className="relative mb-6">
                    <div className="w-24 h-24 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-[#F2B968] transition">
                      <Icon className="w-9 h-9 text-[#F2B968]" />
                    </div>
                    <span className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-[#F2B968] text-black text-xs font-bold flex items-center justify-center">
                      {step}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed max-w-[220px]">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-gray-400 mt-12 text-base">
            Una sola plataforma para gestionar todas tus producciones y descargas.
          </p>

          <div className="text-center mt-8">
            <Link
              href="/registro"
              className="inline-flex items-center gap-2 bg-[#F2B968] hover:bg-[#d9a050] text-black font-semibold py-3 px-8 rounded-full transition"
            >
              Empezar ahora
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Servicios */}
      <section id="servicios" className="py-24 bg-black border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[#F2B968] text-sm font-semibold uppercase tracking-widest">
              Nuestros servicios
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mt-3">Todo lo que necesitás</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Camera,
                title: "Fotografía HDR Profesional",
                desc: "Imágenes de alto rango dinámico para destacar cada detalle de la propiedad.",
              },
              {
                icon: Video,
                title: "Video Recorrido",
                desc: "Videos dinámicos + opción de video adicional para anuncios impactantes.",
              },
              {
                icon: Scan,
                title: "Tour Virtual 360°",
                desc: "Experiencias inmersivas para que el cliente explore la propiedad desde cualquier dispositivo.",
              },
              {
                icon: PenTool,
                title: "Planos 2D",
                desc: "Planos profesionales que complementan la presentación de tu propiedad.",
              },
              {
                icon: Plane,
                title: "Drone",
                desc: "Tomas aéreas que muestran la propiedad y su entorno desde una perspectiva única.",
              },
              {
                icon: Sofa,
                title: "Amoblamiento Virtual",
                desc: "Transformá ambientes vacíos en espacios decorados para cautivar a los compradores.",
              },
            ].map((service) => (
              <div
                key={service.title}
                className="bg-zinc-950 p-8 rounded-2xl border border-zinc-800 hover:border-[#F2B968]/50 transition group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#F2B968]/10 flex items-center justify-center mb-5 group-hover:bg-[#F2B968]/20 transition">
                  <service.icon className="w-6 h-6 text-[#F2B968]" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{service.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Contacto */}
      <section id="contacto" className="py-24 bg-black border-t border-zinc-900 relative overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-25 scale-105"
        >
          <source src="/img/hero-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70 pointer-events-none" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <span className="text-[#F2B968] text-sm font-semibold uppercase tracking-widest">
            Hablemos
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mt-3 mb-6">Contactanos</h2>
          <p className="text-xl text-gray-400 mb-12">
            Estamos listos para elevar tus propiedades
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link
              href="/registro"
              className="inline-flex items-center gap-2 bg-[#F2B968] hover:bg-[#d9a050] text-black font-semibold py-4 px-10 rounded-full text-lg transition"
            >
              Cotizá tu producción
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          <div className="text-gray-500 space-y-2">
            <p>
              Email:{" "}
              <a
                href="mailto:producciones@unihaus.com.ar"
                className="text-[#F2B968] hover:underline"
              >
                producciones@unihaus.com.ar
              </a>
            </p>
            <p>
              Instagram:{" "}
              <a
                href="https://instagram.com/unihaus.lab"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#F2B968] hover:underline"
              >
                @unihaus.lab
              </a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
