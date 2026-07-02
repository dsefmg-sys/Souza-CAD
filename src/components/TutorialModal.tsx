'use client';

import { useState, useEffect, type ComponentType } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Upload, Search, UserCheck, BookUser, Users, Brush, FileText, Save,
  ChevronLeft, ChevronRight, CircleCheck, MessageCircle, type LucideProps,
} from 'lucide-react';
import { carregarWhatsappSuporte, linkWhatsapp } from '@/lib/store/suporte';

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

export default function TutorialModal({ open, onOpenChange }: Props) {
  const [passo, setPasso] = useState(0);
  const [zapSuporte, setZapSuporte] = useState('');
  useEffect(() => {
    if (!open) return;
    setPasso(0);
    carregarWhatsappSuporte().then(setZapSuporte).catch(() => {});
  }, [open]);
  const linkSuporte = linkWhatsapp(zapSuporte);

  const ultimo = passo === PASSOS.length - 1;
  const p = PASSOS[passo];
  const Icone = p.icone;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
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

        {/* botão de suporte: só existe quando o master configurou um número */}
        {linkSuporte && (
          <a href={linkSuporte} target="_blank" rel="noopener noreferrer"
             className="flex items-center justify-center gap-2 rounded-md border border-emerald-600/40 bg-emerald-600/10 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-600/20 dark:text-emerald-400">
            <MessageCircle className="size-4" /> Falar com o suporte no WhatsApp
          </a>
        )}

        <div className="flex items-center justify-between border-t pt-3">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Pular</Button>
          <div className="flex items-center gap-2">
            {passo > 0 && (
              <Button variant="outline" size="sm" onClick={() => setPasso((n) => n - 1)}><ChevronLeft className="size-4" /> Voltar</Button>
            )}
            {ultimo ? (
              <Button size="sm" onClick={() => onOpenChange(false)}><CircleCheck className="size-4" /> Entendi</Button>
            ) : (
              <Button size="sm" onClick={() => setPasso((n) => n + 1)}>Avançar <ChevronRight className="size-4" /></Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
