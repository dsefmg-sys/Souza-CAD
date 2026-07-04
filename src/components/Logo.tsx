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
export function Logo({ className = 'size-8' }: { className?: string }) {
  return <img src="/marca/icone.png" alt="Souza CAD" className={`rounded-md object-contain ${className}`} />;
}

export function LogoHorizontal({ className = 'h-10' }: { className?: string }) {
  return <img src="/marca/logo-horizontal.png" alt="Souza CAD" className={`w-auto object-contain ${className}`} />;
}

/**
 * Fundo de marca: a textura do campo visto de cima (fundo-campo.png), com um véu
 * escuro por cima pra deixar o conteúdo legível. Fica atrás de tudo (absolute) e não
 * captura clique. Usado na tela de login.
 */
export function FundoRedeMarca({ className = '' }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <img src="/marca/fundo-campo.png" alt="" className="absolute inset-0 size-full object-cover" />
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
      <img src="/marca/splash.png" alt="Souza CAD" className="max-h-full max-w-full object-contain" />
      {legenda && <p className="absolute bottom-8 text-sm text-white/70">{legenda}</p>}
    </div>
  );
}
