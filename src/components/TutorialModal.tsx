'use client';

import { useState, useEffect, type ComponentType } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Upload, Search, UserCheck, BookUser, Users, Brush, FileText, Save,
  ChevronLeft, ChevronRight, CircleCheck, MessageCircle, GraduationCap, type LucideProps,
} from 'lucide-react';
import { carregarWhatsappSuporte, linkWhatsapp } from '@/lib/store/suporte';
import { TEMAS_AJUDA } from '@/lib/ajuda/temas';
import { carregarPreferencias, salvarPreferencias } from '@/lib/store/preferencias';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

interface Passo { icone: ComponentType<LucideProps>; titulo: string; texto: string; }

// Os passos seguem a MESMA ordem, da esquerda pra direita, dos botões do cabeçalho do editor —
// quem já viu o tutorial reconhece o botão correspondente na tela.
const PASSOS: Passo[] = [
  {
    icone: Upload,
    titulo: 'Comece importando o TXT',
    texto: 'O botão TXT lê o arquivo do seu equipamento GNSS e já desenha o perímetro do imóvel no mapa. Se o seu equipamento exporta as colunas numa ordem diferente, ajuste isso uma vez em Configurações.',
  },
  {
    icone: Search,
    titulo: 'Busque os vizinhos certificados',
    texto: 'O botão SIGEF procura, sozinho, os imóveis já certificados que encostam no seu, no acervo do INCRA, e já sugere os confrontantes. Depois de baixar, esse mesmo botão vira ANÁLISE, para você ver se há sobreposição de divisa.',
  },
  {
    icone: UserCheck,
    titulo: 'Reaproveite o código do vizinho',
    texto: 'Quando um vértice de divisa já tem um código oficial usado por outro agrimensor, você não deve gerar um novo. Clique no vértice do vizinho no mapa para adotar o código dele, ou suba um arquivo de vértices pelo botão ao lado do SIGEF.',
  },
  {
    icone: BookUser,
    titulo: 'Preencha os dados do imóvel',
    texto: 'O botão DADOS abre o cadastro do proprietário, dos confrontantes, do imóvel e do cartório. É a base de tudo que vai aparecer no memorial e na planta.',
  },
  {
    icone: Users,
    titulo: 'Pinte confrontantes e divisas',
    texto: 'Os botões CONFRO e DIVISAS ativam um modo de clique no mapa: você marca a quem pertence cada trecho da divisa e que tipo de linha é (cerca, córrego, estrada...).',
  },
  {
    icone: FileText,
    titulo: 'Gere as peças finais',
    texto: 'Com tudo pintado, os botões da direita baixam o memorial descritivo, a planilha SIGEF, o KML, a planta em PDF e o requerimento ao cartório — cada um já pronto no formato oficial.',
  },
  {
    icone: Save,
    titulo: 'Salve sempre que lembrar',
    texto: 'O botão de salvar guarda o projeto na nuvem e registra os códigos dos vértices no seu banco de pontos, para nunca repetir um número já usado. O app também guarda um rascunho automático, então fechar sem salvar não perde o trabalho.',
  },
];

type TelaAjuda = 'menu' | 'passos' | 'aprenderMais' | 'temas' | 'tema';

export default function TutorialModal({ open, onOpenChange }: Props) {
  const [tela, setTela] = useState<TelaAjuda>('menu');
  const [passo, setPasso] = useState(0);
  const [temaId, setTemaId] = useState<string | null>(null);
  const [nivel, setNivel] = useState<'iniciante' | 'experiente'>('iniciante');
  const [zapSuporte, setZapSuporte] = useState('');
  useEffect(() => {
    if (!open) return;
    setTela('menu'); setPasso(0); setTemaId(null);
    setNivel(carregarPreferencias().nivelExperiencia);
    carregarWhatsappSuporte().then(setZapSuporte).catch(() => {});
  }, [open]);
  const linkSuporte = linkWhatsapp(zapSuporte);

  // o nível é uma configuração do usuário: muda aqui, vale no app inteiro
  function trocarNivel(n: 'iniciante' | 'experiente') {
    setNivel(n);
    salvarPreferencias({ ...carregarPreferencias(), nivelExperiencia: n });
  }

  const ultimo = passo === PASSOS.length - 1;
  const p = PASSOS[passo];
  const Icone = p.icone;
  const tema = TEMAS_AJUDA.find((t) => t.id === temaId) ?? null;

  const seletorNivel = (
    <div className="flex items-center justify-center gap-1 rounded-full border bg-muted/40 p-0.5 text-xs">
      {(['iniciante', 'experiente'] as const).map((n) => (
        <button key={n} type="button" onClick={() => trocarNivel(n)}
          className={`rounded-full px-3 py-1 font-semibold capitalize transition-colors ${nivel === n ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
          title={n === 'iniciante' ? 'Linguagem didática, explica os porquês (ex.: menos de 3 anos de profissão)' : 'Linguagem objetiva e técnica, direto ao ponto'}>
          {n}
        </button>
      ))}
    </div>
  );

  const botaoSuporte = linkSuporte && (
    <a href={linkSuporte} target="_blank" rel="noopener noreferrer"
       className="flex items-center justify-center gap-2 rounded-md border border-emerald-600/40 bg-emerald-600/10 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-600/20 dark:text-emerald-400">
      <MessageCircle className="size-4" /> Falar com o suporte no WhatsApp
    </a>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col">
        {tela === 'menu' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base"><GraduationCap className="size-5 text-primary" /> Central de ajuda</DialogTitle>
            </DialogHeader>
            {seletorNivel}
            <button type="button" onClick={() => { setPasso(0); setTela('passos'); }}
              className="rounded-lg border p-3 text-left hover:bg-muted/50">
              <div className="flex items-center gap-2 text-sm font-semibold"><CircleCheck className="size-4 text-primary" /> Tutorial passo a passo</div>
              <p className="mt-1 text-sm text-muted-foreground">O fluxo completo de um projeto, na ordem dos botões da tela. Comece por aqui.</p>
            </button>
            <button type="button" onClick={() => setTela('temas')}
              className="rounded-lg border p-3 text-left hover:bg-muted/50">
              <div className="flex items-center gap-2 text-sm font-semibold"><BookUser className="size-4 text-primary" /> Aprender por tema</div>
              <p className="mt-1 text-sm text-muted-foreground">Cada área que o app atende, explicada no seu nível: SIGEF, fuso, confrontantes, memorial, planta, requerimento e mais.</p>
            </button>
            {botaoSuporte}
          </>
        )}

        {tela === 'passos' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Icone className="size-5 text-primary" /> {p.titulo}
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm leading-relaxed text-muted-foreground">{p.texto}</p>
            <div className="flex items-center justify-center gap-1.5 py-1">
              {PASSOS.map((_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all ${i === passo ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30'}`} />
              ))}
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <Button variant="ghost" size="sm" onClick={() => setTela('menu')}>Voltar ao menu</Button>
              <div className="flex items-center gap-2">
                {passo > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setPasso((n) => n - 1)}><ChevronLeft className="size-4" /> Voltar</Button>
                )}
                {ultimo ? (
                  <Button size="sm" onClick={() => setTela('aprenderMais')}><CircleCheck className="size-4" /> Entendi</Button>
                ) : (
                  <Button size="sm" onClick={() => setPasso((n) => n + 1)}>Avançar <ChevronRight className="size-4" /></Button>
                )}
              </div>
            </div>
          </>
        )}

        {tela === 'aprenderMais' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base"><GraduationCap className="size-5 text-primary" /> Deseja aprender mais?</DialogTitle>
            </DialogHeader>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Tem muito mais dica por aqui: explicações de cada área do trabalho — SIGEF, fuso, confrontantes, memorial, planta, requerimento — no seu nível de experiência.
            </p>
            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Agora não</Button>
              <Button size="sm" onClick={() => setTela('temas')}><BookUser className="size-4" /> Sim, ver os temas</Button>
            </div>
          </>
        )}

        {tela === 'temas' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base"><BookUser className="size-5 text-primary" /> Aprender por tema</DialogTitle>
            </DialogHeader>
            {seletorNivel}
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
              {TEMAS_AJUDA.map((t) => (
                <button key={t.id} type="button" onClick={() => { setTemaId(t.id); setTela('tema'); }}
                  className="flex w-full items-center justify-between rounded-lg border p-2.5 text-left text-sm font-medium hover:bg-muted/50">
                  {t.titulo} <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <Button variant="ghost" size="sm" onClick={() => setTela('menu')}>Voltar ao menu</Button>
              <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
            </div>
          </>
        )}

        {tela === 'tema' && tema && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base"><BookUser className="size-5 text-primary" /> {tema.titulo}</DialogTitle>
            </DialogHeader>
            {seletorNivel}
            <p className="min-h-0 flex-1 overflow-y-auto pr-1 text-sm leading-relaxed text-muted-foreground">
              {nivel === 'iniciante' ? tema.iniciante : tema.experiente}
            </p>
            <div className="flex items-center justify-between border-t pt-3">
              <Button variant="ghost" size="sm" onClick={() => setTela('temas')}><ChevronLeft className="size-4" /> Todos os temas</Button>
              <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
