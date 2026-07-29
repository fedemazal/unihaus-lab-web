import Link from "next/link";

export default function PreparacionClientePage() {
  return (
    <div className="min-h-screen bg-[#F8F7F4] flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <p className="font-semibold text-[#2C2C2C]">UniHaus Lab</p>
          <Link href="/" className="text-sm text-[#C07856] hover:underline">
            unihaus.com.ar
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <h1 className="text-2xl font-bold text-[#2C2C2C] mb-2 text-center">
          Guía de preparación
        </h1>
        <p className="text-gray-500 mb-10 text-center">
          Seleccioná tu caso para ver la guía.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
          <a
            href="/guia-propietarios.html"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white border-2 border-gray-200 rounded-2xl p-8 text-left hover:border-[#C07856] transition group"
          >
            <div className="w-12 h-12 bg-[#C07856]/10 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#C07856]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            </div>
            <p className="text-lg font-bold text-[#2C2C2C] group-hover:text-[#C07856] transition mb-1">Soy propietario</p>
            <p className="text-sm text-gray-500">Guía completa de preparación ambiente por ambiente</p>
          </a>

          <a
            href="/guia-inquilinos.html"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white border-2 border-gray-200 rounded-2xl p-8 text-left hover:border-[#C07856] transition group"
          >
            <div className="w-12 h-12 bg-[#C07856]/10 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#C07856]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <p className="text-lg font-bold text-[#2C2C2C] group-hover:text-[#C07856] transition mb-1">Soy inquilino</p>
            <p className="text-sm text-gray-500">Checklist breve de 7 puntos, una sola visita</p>
          </a>
        </div>
      </main>
    </div>
  );
}
