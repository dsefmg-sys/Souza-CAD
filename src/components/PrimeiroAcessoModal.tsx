'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, User, LogOut } from 'lucide-react';
import { carregarEscritorio, salvarEscritorio, carregarTecnico, salvarTecnico } from '@/lib/store/settings';

interface Props {
  open: boolean;
  onConcluir: () => void;
  onVoltarLogin?: () => void; // sai da conta e volta pra tela de login (o cadastro é travado, então esta é a saída)
}

// Primeiro acesso: em vez de já abrir na empresa do dono, o novo usuário cadastra a SUA empresa
// (ou se cadastra como profissional autônomo). Preenche escritório + responsável técnico.
export default function PrimeiroAcessoModal({ open, onConcluir, onVoltarLogin }: Props) {
  const [tipo, setTipo] = useState<'empresa' | 'autonomo' | null>(null);
  const [categoria, setCategoria] = useState<'tecnico' | 'engenheiro'>('tecnico');
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [nomeRt, setNomeRt] = useState('');
  const [formacao, setFormacao] = useState('');
  const [cft, setCft] = useState('');
  const [credenciamento, setCredenciamento] = useState('');
  const [cidade, setCidade] = useState('');
  const [telefone, setTelefone] = useState('');

  const eng = categoria === 'engenheiro';
  const conselho = eng ? 'CREA' : 'CFT';
  const termo = eng ? 'ART' : 'TRT';
  const formacaoPadrao = eng ? 'ENGENHEIRO AGRIMENSOR' : 'TÉCNICO EM AGRIMENSURA';

  function concluir() {
    // sobrescreve os padrões (que vinham preenchidos com a empresa do criador) com os dados do usuário
    const esc = carregarEscritorio();
    salvarEscritorio({
      ...esc,
      nome: tipo === 'empresa' ? nomeEmpresa.trim() : nomeRt.trim(),
      cnpj: '', endereco: '', telefone: telefone.trim(),
      ramo: 'Agrimensura e Georreferenciamento', logoDataUrl: undefined,
    });
    const tec = carregarTecnico();
    salvarTecnico({
      ...tec, nome: nomeRt.trim(), cft: cft.trim(), cidadeAssinatura: cidade.trim(),
      credenciamentoIncra: credenciamento.trim().toUpperCase(),
      conselho: eng ? 'CREA' : 'CFT',
      formacao: formacao.trim() || formacaoPadrao,
    });
    onConcluir();
  }

  const podeConcluir = tipo === 'empresa'
    ? nomeEmpresa.trim() && nomeRt.trim()
    : !!nomeRt.trim();

  return (
    <Dialog open={open} onOpenChange={() => { /* bloqueado até concluir */ }}>
      <DialogContent className="max-w-lg" onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="flex-row items-start justify-between gap-2">
          <DialogTitle>Bem-vindo! Vamos configurar seu cadastro</DialogTitle>
          {onVoltarLogin && (
            <Button variant="ghost" size="sm" className="shrink-0 gap-1 text-xs text-muted-foreground" onClick={onVoltarLogin} title="Sair da conta e voltar para a tela de login">
              <LogOut className="size-3.5" /> Sair
            </Button>
          )}
        </DialogHeader>

        {!tipo ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Você vai usar o sistema como:</p>
            <button type="button" onClick={() => setTipo('empresa')} className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:bg-muted/50">
              <Building2 className="size-5 text-primary" />
              <div><div className="text-sm font-semibold">Empresa</div><div className="text-xs text-muted-foreground">Escritório de agrimensura com um ou mais técnicos.</div></div>
            </button>
            <button type="button" onClick={() => setTipo('autonomo')} className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:bg-muted/50">
              <User className="size-5 text-primary" />
              <div><div className="text-sm font-semibold">Profissional autônomo</div><div className="text-xs text-muted-foreground">Você mesmo assina e responde pelos trabalhos.</div></div>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tipo === 'empresa' && (
              <div className="space-y-1"><Label>Nome da empresa</Label><Input value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)} placeholder="Ex.: Agrimensura Silva Ltda" /></div>
            )}
            {/* categoria do responsável: define as siglas (TRT/CFT do técnico x ART/CREA do engenheiro) */}
            <div className="space-y-1">
              <Label>Você é</Label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setCategoria('tecnico')} className={`rounded-lg border p-2 text-left text-xs ${!eng ? 'border-primary bg-primary/10 font-semibold' : 'hover:bg-muted/50'}`}>
                  <div className="text-sm font-semibold">Técnico</div><div className="text-muted-foreground">Registro no CFT, emite TRT</div>
                </button>
                <button type="button" onClick={() => setCategoria('engenheiro')} className={`rounded-lg border p-2 text-left text-xs ${eng ? 'border-primary bg-primary/10 font-semibold' : 'hover:bg-muted/50'}`}>
                  <div className="text-sm font-semibold">Engenheiro</div><div className="text-muted-foreground">Registro no CREA, emite ART</div>
                </button>
              </div>
            </div>
            <div className="space-y-1"><Label>Seu nome (responsável técnico)</Label><Input value={nomeRt} onChange={(e) => setNomeRt(e.target.value)} placeholder="Nome completo" /></div>
            <div className="space-y-1"><Label>Formação (aparece nas peças)</Label><Input value={formacao} onChange={(e) => setFormacao(e.target.value)} placeholder={formacaoPadrao} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label>Registro {conselho}</Label><Input value={cft} onChange={(e) => setCft(e.target.value)} placeholder="Ex.: 12345678900-MG" /></div>
              <div className="space-y-1"><Label>Cidade da assinatura</Label><Input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Cidade-UF" /></div>
            </div>
            <p className="text-[11px] text-muted-foreground">O número do {termo} você emite e cola em cada projeto na hora de gerar as peças.</p>
            <div className="space-y-1">
              <Label>Código de credenciado no INCRA (prefixo dos vértices)</Label>
              <Input value={credenciamento} onChange={(e) => setCredenciamento(e.target.value.toUpperCase())} placeholder="Ex.: SEU CÓDIGO — deixe em branco se ainda não tem" />
              <p className="text-[10px] text-muted-foreground">É o seu código oficial que forma o nome dos vértices (ex.: <b>{(credenciamento.trim().toUpperCase() || 'SEU')}</b>-M-0001). É só seu — nunca use o de outra pessoa.</p>
            </div>
            <div className="space-y-1"><Label>WhatsApp / telefone</Label><Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 90000-0000" /></div>
            <p className="text-[11px] text-muted-foreground">Você pode completar e ajustar tudo depois em Configurações.</p>
            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setTipo(null)}>Voltar</Button>
              <Button size="sm" disabled={!podeConcluir} onClick={concluir}>Concluir cadastro</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
