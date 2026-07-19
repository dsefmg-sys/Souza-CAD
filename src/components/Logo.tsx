/* eslint-disable @next/next/no-img-element */

/**
 * Marca do Souza CAD. As artes oficiais ficam em /public/marca:
 *  - icone.png            → ícone do compasso (quadrado), usado no cabeçalho e na aba
 *  - logo-horizontal.png  → escudo + "SOUZA CAD" ao lado, usado na tela de login
 *  - selo-confianca.png   → selo "confiança no campo" (marketing)
 *
 * <Logo /> mostra só o ícone. <LogoHorizontal /> mostra o logo com o nome.
 * <FundoRedeMarca /> desenha o fundo de rede (splash) atrás do login.
 */
const bp = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');

export function Logo({ className = 'size-8' }: { className?: string }) {
  // Ícone SIMPLES em SVG (compasso): nítido em qualquer tamanho, inclusive minúsculo no cabeçalho e
  // no favicon. A arte detalhada (icone.png) ficava um borrão quando pequena.
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="Souza CAD" className={`rounded-md object-contain ${className}`}>
      <defs>
        <linearGradient id="scg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0e8a56"/>
          <stop offset="1" stopColor="#075437"/>
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="92" height="92" rx="22" fill="url(#scg)"/>
      <g fill="none" stroke="#eafff2" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M50 32 L33 76"/>
        <path d="M50 32 L67 76"/>
        <path d="M41 57 L59 57"/>
      </g>
      <circle cx="50" cy="30" r="9" fill="#eafff2"/>
    </svg>
  );
}

export function LogoHorizontal({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-2 select-none ${className}`}>
      <Logo className="size-9 shrink-0" />
      <div className="flex flex-col text-left leading-none uppercase font-black">
        <span className="text-[17px] tracking-wider text-emerald-500 font-extrabold">SOUZA</span>
        <span className="text-[13px] tracking-[0.2em] text-muted-foreground font-bold mt-0.5">CAD</span>
      </div>
    </div>
  );
}

/**
 * Fundo de marca: a textura do campo visto de cima (fundo-campo.png), com um véu
 * escuro por cima pra deixar o conteúdo legível. Fica atrás de tudo (absolute) e não
 * captura clique. Usado na tela de login.
 */
export function FundoRedeMarca({ className = '' }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <img src={`${bp}/marca/fundo-campo.png`} alt="" className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-[#0a1f14]/55" />
    </div>
  );
}

/**
 * Tela de abertura (splash): a arte 5, escudo com o nome e a rede de pontos no fundo
 * escuro. Ocupa a tela inteira, centralizada, sem cortar o logo. Usada enquanto a
 * nuvem verifica o login ("carregando").
 */
export function Splash({ legenda }: { legenda?: string }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0a1f14]">
      <img src={`${bp}/marca/splash.png`} alt="Souza CAD" className="max-h-full max-w-full object-contain" />
      {legenda && <p className="absolute bottom-8 text-sm text-white/70">{legenda}</p>}
    </div>
  );
}
