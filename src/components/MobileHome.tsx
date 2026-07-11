import { FolderOpen, FilePlus2, Sparkles, BookUser, Map as MapIcon } from 'lucide-react';

interface Props {
  nomeProjeto: string;
  onAbrirProjetos: () => void;
  onNovoProjeto: () => void;
  onImportarIa: () => void;
  onCompletarDados: () => void;
  onVerMapa: () => void;
}

// Tela inicial do celular: em vez do mapa (que precisa de tela grande pra desenhar), mostra as
// tarefas de escritório que fazem sentido no celular. O mapa continua a um toque de distância
// (onVerMapa), só não é mais a tela padrão em telas estreitas.
export default function MobileHome({
  nomeProjeto, onAbrirProjetos, onNovoProjeto, onImportarIa, onCompletarDados, onVerMapa,
}: Props) {
  const botoes = [
    {
      icone: FolderOpen, titulo: 'Abrir projeto', cor: 'text-sky-500',
      desc: 'Continuar um projeto já salvo.', onClick: onAbrirProjetos,
    },
    {
      icone: FilePlus2, titulo: 'Novo projeto', cor: 'text-emerald-500',
      desc: 'Começar do zero e importar os pontos do GPS.', onClick: onNovoProjeto,
    },
    {
      icone: Sparkles, titulo: 'Importar documento (IA)', cor: 'text-indigo-500',
      desc: 'Envie um PDF ou foto e a IA extrai os dados pra você.', onClick: onImportarIa,
    },
    {
      icone: BookUser, titulo: 'Completar dados', cor: 'text-amber-600 dark:text-amber-400',
      desc: 'Proprietário, imóvel e confrontantes.', onClick: onCompletarDados,
    },
  ];

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 overflow-y-auto p-4">
      <div className="w-full max-w-sm text-center">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Projeto atual</div>
        <div className="mt-0.5 truncate text-base font-bold text-foreground">{nomeProjeto || 'Nenhum projeto aberto'}</div>
      </div>

      <div className="grid w-full max-w-sm grid-cols-1 gap-2.5">
        {botoes.map(({ icone: Icone, titulo, cor, desc, onClick }) => (
          <button key={titulo} type="button" onClick={onClick}
            className="flex items-center gap-3 rounded-xl border bg-background/60 p-3.5 text-left shadow-sm active:scale-[0.98] transition-transform hover:bg-muted/50">
            <span className={`flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted ${cor}`}>
              <Icone className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">{titulo}</span>
              <span className="block text-xs text-muted-foreground">{desc}</span>
            </span>
          </button>
        ))}
      </div>

      <button type="button" onClick={onVerMapa}
        className="mt-2 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
        <MapIcon className="size-3.5" /> Ver mapa
      </button>
    </div>
  );
}
