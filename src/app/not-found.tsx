import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-center text-slate-100 font-sans">
      <div className="max-w-md space-y-3">
        <h1 className="text-4xl font-extrabold text-emerald-400">404</h1>
        <h2 className="text-lg font-bold text-slate-200">Página não encontrada</h2>
        <p className="text-sm text-slate-400">
          A página ou recurso solicitado não foi encontrado ou foi movido.
        </p>
        <div className="pt-2">
          <Link href="/" className="inline-block rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition-colors">
            Voltar ao Início
          </Link>
        </div>
      </div>
    </div>
  );
}
