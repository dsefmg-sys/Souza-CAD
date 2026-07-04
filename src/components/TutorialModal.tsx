'use client';

import { useState, useEffect, type ComponentType } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Upload, Search, UserCheck, BookUser, Users, Brush, FileText, Save,
  ChevronLeft, ChevronRight, CircleCheck, MessageCircle, GraduationCap,
  ToggleRight, PenTool, Ruler, Leaf, Sparkles, type LucideProps,
} from 'lucide-react';
import { carregarWhatsappSuporte, linkWhatsapp } from '@/lib/store/suporte';
import { TEMAS_AJUDA } from '@/lib/ajuda/temas';
import { carregarPreferencias, salvarModo, salvarNivelExperiencia } from '@/lib/store/preferencias';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

interface Passo { icone: ComponentType<LucideProps>; titulo: string; texto: string; }

// PASSOS BÁSICOS — o caminho essencial de um projeto, na ordem em que a tela conduz. Valem pra
// todo mundo. O primeiro passo ensina a própria chave Simples/Completo, que muda a cara do app.
const PASSOS_BASE: Passo[] = [
  {
    icone: ToggleRight,
    titulo: 'A chave Simples e Completo',
    texto: 'No canto de cima, à direita, tem uma chavinha com duas palavras: Simples e Completo. No Simples a tela mostra só o caminho essencial, ideal pra qualquer pessoa se acostumar com o app sem se perder no meio de tanto botão. No Completo aparecem todas as ferramentas. Comece no Simples; quando quiser mais, é só virar a chave — nada some do seu trabalho, só aparecem mais botões. Depois de usar bastante o Completo, essa chave se recolhe pra deixar a tela limpa, e o Simples volta a ficar disponível nas Configurações.',
  },
  {
    icone: Upload,
    titulo: 'Comece importando o TXT',
    texto: 'O botão TXT, no começo da fila lá em cima, lê o arquivo do seu equipamento GNSS e já desenha o perímetro do imóvel no mapa. Se o seu aparelho exporta as colunas numa ordem diferente, você ajusta isso uma vez só em Configurações, e ele lembra pra sempre.',
  },
  {
    icone: Search,
    titulo: 'Busque os vizinhos certificados',
    texto: 'O botão SIGEF procura sozinho, no acervo do INCRA, os imóveis já certificados que encostam no seu, e já sugere os confrontantes. Depois que baixa, esse mesmo botão vira ANÁLISE, pra você ver se tem sobreposição de divisa.',
  },
  {
    icone: BookUser,
    titulo: 'Preencha os dados do imóvel',
    texto: 'O botão DADOS abre o cadastro do proprietário, dos confrontantes, do imóvel e do cartório. É a base de tudo que vai sair no memorial e na planta, então capriche aqui.',
  },
  {
    icone: Users,
    titulo: 'Pinte confrontantes e divisas',
    texto: 'Os botões CONFRO e DIVISAS ligam um modo de clique no mapa: você marca a quem pertence cada trecho da divisa e que tipo de linha é, se é cerca, córrego, estrada. Uma faixa aparece no alto do mapa pra você escolher a cor e o tipo enquanto pinta.',
  },
  {
    icone: FileText,
    titulo: 'Gere as peças finais',
    texto: 'Com tudo pintado, os botões da direita baixam cada peça pronta no formato oficial: MEM é o memorial descritivo, ODS é a planilha do SIGEF, PLANTA é o desenho em PDF, e REQ é o requerimento pro cartório. O botão TRT é onde você cola o número do seu termo de responsabilidade.',
  },
  {
    icone: Save,
    titulo: 'Salve sempre que lembrar',
    texto: 'O botão Salvar, na barra da esquerda, guarda o projeto na nuvem e registra os códigos dos vértices no seu banco de pontos, pra nunca repetir um número já usado. O app também guarda um rascunho sozinho, então fechar sem salvar não perde o trabalho. Pra alternar entre o mapa e a planta, use o botão quadrado no canto do desenho, ou a tecla Esc.',
  },
];

// PASSOS AVANÇADOS — só aparecem quando a tela está no modo Completo (é quando essas ferramentas
// existem na tela). Apresentam o que fica escondido no Simples.
const PASSOS_AVANCADOS: Passo[] = [
  {
    icone: UserCheck,
    titulo: 'Reaproveite o código do vizinho',
    texto: 'Quando um vértice de divisa já tem código oficial de outro agrimensor, você não deve criar um novo. No Completo aparecem os botões CASAR (adota automaticamente o código do certificado do INCRA que encosta no seu) e VIZINHOS (sobe um arquivo de vértices que você baixou do Acervo Fundiário). Isso evita a rejeição mais comum: dois códigos pro mesmo ponto.',
  },
  {
    icone: PenTool,
    titulo: 'Ferramentas de desenho e de vértices',
    texto: 'No Completo, a barra da esquerda ganha os cartões de desenho e de geometria: linha, polilinha, cota, texto e símbolos como poste e árvore; e a edição de vértices, pra inserir, apagar, ignorar um ponto que não é de divisa, ou medir distância e azimute direto no mapa.',
  },
  {
    icone: Leaf,
    titulo: 'Peças extras e o CAR',
    texto: 'Ainda no Completo aparecem a ERRATA perimetral, o link CERT pra certificação eletrônica no SIGEF, e o CAR, o Cadastro Ambiental Rural. São peças que nem todo projeto precisa, por isso ficam guardadas no modo Simples.',
  },
  {
    icone: Ruler,
    titulo: 'Caixa de ferramentas',
    texto: 'Lá embaixo na barra ficam os extras soltos, que não dependem do projeto: a calculadora de coordenada, distância e azimute; o editor de DXF pra abrir qualquer desenho; a porcentagem entre dois polígonos; e o Estúdio, um mini editor de imagem. Tudo isso só no Completo.',
  },
];

type TelaAjuda = 'menu' | 'passos' | 'aprenderMais' | 'temas' | 'tema';

export default function TutorialModal({ open, onOpenChange }: Props) {
  const [tela, setTela] = useState<TelaAjuda>('menu');
  const [passo, setPasso] = useState(0);
  const [temaId, setTemaId] = useState<string | null>(null);
  // Duas coisas DIFERENTES: `modo` (quantas ferramentas na tela) e `nivel` (quanta explicação a
  // ajuda dá, conforme o tempo de profissão). O seletor visível é o do nível, porque é ele que muda
  // o texto que a pessoa está lendo aqui. O modo só decide se aparecem os passos avançados.
  const [modo, setModo] = useState<'simples' | 'completo'>('simples');
  const [nivel, setNivel] = useState<'iniciante' | 'experiente'>('iniciante');
  const [zapSuporte, setZapSuporte] = useState('');
  useEffect(() => {
    if (!open) return;
    setTela('menu'); setPasso(0); setTemaId(null);
    const p = carregarPreferencias();
    setModo(p.modo); setNivel(p.nivelExperiencia);
    carregarWhatsappSuporte().then(setZapSuporte).catch(() => {});
  }, [open]);
  const linkSuporte = linkWhatsapp(zapSuporte);

  // O nível da ajuda é uma preferência do usuário: muda aqui, vale no app inteiro.
  function trocarNivel(n: 'iniciante' | 'experiente') { setNivel(n); salvarNivelExperiencia(n); }
  // Virar pro Completo (a partir do convite no fim do básico) muda a interface e revela mais passos.
  function irParaCompleto() { setModo('completo'); salvarModo('completo'); }

  // No Simples, só os passos básicos. No Completo, básicos + avançados.
  const passos = modo === 'completo' ? [...PASSOS_BASE, ...PASSOS_AVANCADOS] : PASSOS_BASE;
  const ultimo = passo === passos.length - 1;
  const noFimDoBasico = passo === PASSOS_BASE.length - 1;
  const p = passos[passo] ?? passos[0];
  const Icone = p.icone;
  const tema = TEMAS_AJUDA.find((t) => t.id === temaId) ?? null;

  const seletorNivel = (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center justify-center gap-1 rounded-full border bg-muted/40 p-0.5 text-xs">
        {(['iniciante', 'experiente'] as const).map((n) => (
          <button key={n} type="button" onClick={() => trocarNivel(n)}
            className={`rounded-full px-3 py-1 font-semibold capitalize transition-colors ${nivel === n ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            title={n === 'iniciante' ? 'Explica os porquês, linguagem didática — pra quem tem pouco tempo de profissão' : 'Direto ao ponto — pra o agrimensor que já tem tempo de profissão e não quer tanta explicação'}>
            {n}
          </button>
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground">Nível da ajuda — quanta explicação você quer. É separado da chave Simples/Completo.</span>
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
            {/* Banner de boas-vindas com a textura do campo (arte da marca) */}
            <div className="relative -mx-5 -mt-5 mb-1 h-24 overflow-hidden rounded-t-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/marca/fundo-campo.png" alt="" aria-hidden className="absolute inset-0 size-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a1f14]/90 via-[#0a1f14]/60 to-transparent" />
              <div className="relative flex h-full flex-col justify-center px-6 text-white">
                <div className="flex items-center gap-2 text-base font-bold drop-shadow"><GraduationCap className="size-5" /> Central de ajuda</div>
                <p className="text-xs text-white/85 drop-shadow">Bem-vindo ao Souza CAD — aprenda no seu ritmo.</p>
              </div>
            </div>
            <DialogHeader className="sr-only"><DialogTitle>Central de ajuda</DialogTitle></DialogHeader>
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
            {modo === 'simples' && noFimDoBasico && (
              <button type="button" onClick={irParaCompleto}
                className="flex items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-2 text-left text-xs text-muted-foreground hover:bg-primary/10">
                <Sparkles className="size-4 shrink-0 text-primary" />
                <span>Quer ver as ferramentas avançadas? Toque aqui pra virar a tela pro <b className="text-primary">modo Completo</b> e ganhar mais passos neste tutorial.</span>
              </button>
            )}
            <div className="flex items-center justify-center gap-1.5 py-1">
              {passos.map((_, i) => (
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
