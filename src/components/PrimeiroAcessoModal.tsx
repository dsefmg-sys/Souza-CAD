'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, User } from 'lucide-react';
import { carregarEscritorio, salvarEscritorio, carregarTecnico, salvarTecnico } from '@/lib/store/settings';

interface Props {
  open: boolean;
  onConcluir: () => void;
}

// Primeiro acesso: em vez de já abrir na empresa do dono, o novo usuário cadastra a SUA empresa
// (ou se cadastra como profissional autônomo). Preenche escritório + responsável técnico.
export default function PrimeiroAcessoModal({ open, onConcluir }: Props) {
  const [tipo, setTipo] = useState<'empresa' | 'autonomo' | null>(null);
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [nomeRt, setNomeRt] = useState('');
  const [cft, setCft] = useState('');
  const [cidade, setCidade] = useState('');
  const [telefone, setTelefone] = useState('');

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
    salvarTecnico({ ...tec, nome: nomeRt.trim(), cft: cft.trim(), cidadeAssinatura: cidade.trim(), credenciamentoIncra: '' });
    onConcluir();
  }

  const podeConcluir = tipo === 'empresa'
    ? nomeEmpresa.trim() && nomeRt.trim()
    : !!nomeRt.trim();

  return (
    <Dialog open={open} onOpenChange={() => { /* bloqueado até concluir */ }}>
      <DialogContent className="max-w-lg" onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Bem-vindo! Vamos configurar seu cadastro</DialogTitle>
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
            <div className="space-y-1"><Label>Seu nome (responsável técnico)</Label><Input value={nomeRt} onChange={(e) => setNomeRt(e.target.value)} placeholder="Nome completo" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label>Registro CFT/CREA</Label><Input value={cft} onChange={(e) => setCft(e.target.value)} placeholder="Ex.: 12345678900-MG" /></div>
              <div className="space-y-1"><Label>Cidade da assinatura</Label><Input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Cidade-UF" /></div>
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
