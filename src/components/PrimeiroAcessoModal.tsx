'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, User, UserPlus, LogOut } from 'lucide-react';
import { carregarEscritorio, salvarEscritorio, carregarTecnico, salvarTecnico } from '@/lib/store/settings';
import { aceitarTermos, sincronizarPerfil } from '@/lib/store/perfilUso';
import { puxarConfigDaNuvem } from '@/lib/store/configNuvem';
import { auth } from '@/lib/firebase/client';

interface Props {
  open: boolean;
  onConcluir: () => void;
  onVoltarLogin?: () => void; // sai da conta e volta pra tela de login (o cadastro é travado, então esta é a saída)
}

// Primeiro acesso: em vez de já abrir na empresa do dono, o novo usuário cadastra a SUA empresa
// (ou se cadastra como profissional autônomo). Preenche escritório + responsável técnico.
export default function PrimeiroAcessoModal({ open, onConcluir, onVoltarLogin }: Props) {
  const [tipo, setTipo] = useState<'empresa' | 'autonomo' | 'auxiliar' | null>(null);
  const [emailVinculo, setEmailVinculo] = useState('');
  const [vinculando, setVinculando] = useState(false);
  const [erroVinculo, setErroVinculo] = useState('');
  const [categoria, setCategoria] = useState<'tecnico' | 'tecnico-agricola' | 'engenheiro' | 'duplo'>('tecnico');
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [cnpjEmpresa, setCnpjEmpresa] = useState('');
  const [nomeRt, setNomeRt] = useState('');
  const [formacao, setFormacao] = useState('');
  const [cft, setCft] = useState('');
  const [credenciamento, setCredenciamento] = useState('');
  const [cidade, setCidade] = useState('');
  const [telefone, setTelefone] = useState('');

  const eng = categoria === 'engenheiro';
  const agricola = categoria === 'tecnico-agricola';
  const duplo = categoria === 'duplo';
  const conselho = duplo ? 'CFT+CREA' : (eng ? 'CREA' : (agricola ? 'CFTA' : 'CFT'));
  const termo = duplo ? 'TRT/ART' : (eng ? 'ART' : 'TRT');
  const formacaoPadrao = duplo
    ? 'TÉCNICO EM AGRIMENSURA / ENGENHEIRO AGRIMENSOR'
    : (eng
      ? 'ENGENHEIRO AGRIMENSOR'
      : (agricola ? 'TÉCNICO EM AGROPECUÁRIA' : 'TÉCNICO EM AGRIMENSURA'));

  function concluir() {
    // sobrescreve os padrões (que vinham preenchidos com a empresa do criador) com os dados do usuário
    const esc = carregarEscritorio();
    salvarEscritorio({
      ...esc,
      nome: tipo === 'empresa' ? nomeEmpresa.trim() : nomeRt.trim(),
      cnpj: tipo === 'empresa' ? cnpjEmpresa.trim() : '',
      endereco: '', telefone: telefone.trim(),
      ramo: 'Agrimensura e Georreferenciamento', logoDataUrl: undefined,
    });
    const tec = carregarTecnico();
    salvarTecnico({
      ...tec, nome: nomeRt.trim(), cft: cft.trim(), cidadeAssinatura: cidade.trim(),
      credenciamentoIncra: credenciamento.trim().toUpperCase(),
      conselho,
      formacao: formacao.trim() || formacaoPadrao,
    });
    // aceite das condições de uso registrado aqui, discreto (a linha acima do botão avisa;
    // o texto completo mora em Ajustes → Padrões & Backup → Sobre o sistema)
    aceitarTermos().catch(() => {});
    onConcluir();
  }

  const podeConcluir = tipo === 'empresa'
    ? nomeEmpresa.trim() && nomeRt.trim()
    : !!nomeRt.trim();

  // Auxiliar: NUNCA preenche o próprio RT/escritório — herda tudo de quem ele ajuda, assim que o
  // vínculo liga. Diferente de "Empresa"/"Autônomo" (que preenchem o cadastro na hora), aqui só o
  // e-mail entra; puxarConfigDaNuvem(forcar=true) traz os dados certos direto da nuvem do vinculado.
  async function vincularAuxiliar() {
    const emailAlvo = emailVinculo.trim();
    if (!emailAlvo) return;
    setErroVinculo('');
    setVinculando(true);
    try {
      const token = await auth()?.currentUser?.getIdToken();
      const r = await fetch('/api/vinculo/por-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ emailAlvo }),
      });
      const data = await r.json();
      if (!r.ok) {
        setErroVinculo(data.error || 'Não consegui vincular esse e-mail.');
        return;
      }
      await sincronizarPerfil({ workspaceUid: data.uid });
      await puxarConfigDaNuvem(true);
      aceitarTermos().catch(() => {});
      onConcluir();
    } catch {
      setErroVinculo('Erro ao vincular. Confira sua conexão e tente de novo.');
    } finally {
      setVinculando(false);
    }
  }

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
            <button type="button" onClick={() => setTipo('auxiliar')} className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:bg-muted/50">
              <UserPlus className="size-5 text-primary" />
              <div><div className="text-sm font-semibold">Auxiliar</div><div className="text-xs text-muted-foreground">Você ajuda um RT ou uma empresa que já usa o sistema.</div></div>
            </button>
          </div>
        ) : tipo === 'auxiliar' ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Informe o e-mail de login do RT ou da empresa que você ajuda. Assim que o e-mail bater com uma conta existente, você já entra vinculado a ela — mesmos projetos, mesmos dados do responsável técnico. Não precisa preencher nada de RT aqui; isso vem de lá.
            </p>
            <div className="space-y-1">
              <Label>E-mail do RT ou da empresa</Label>
              <Input value={emailVinculo} onChange={(e) => setEmailVinculo(e.target.value)} placeholder="nome@exemplo.com" type="email" />
            </div>
            {erroVinculo && <p className="text-xs text-destructive">{erroVinculo}</p>}
            <p className="text-[10px] text-muted-foreground/80">Ao concluir, você concorda com as condições de uso do sistema — o texto completo fica em Ajustes, na seção “Sobre o sistema”.</p>
            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => { setTipo(null); setErroVinculo(''); }}>Voltar</Button>
              <Button size="sm" disabled={!emailVinculo.trim() || vinculando} onClick={vincularAuxiliar}>{vinculando ? 'Vinculando…' : 'Vincular e entrar'}</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {tipo === 'empresa' && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="space-y-1"><Label>Nome da empresa</Label><Input value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)} placeholder="Ex.: Agrimensura Silva Ltda" /></div>
                <div className="space-y-1"><Label>CNPJ da empresa</Label><Input value={cnpjEmpresa} onChange={(e) => setCnpjEmpresa(e.target.value)} placeholder="00.000.000/0000-00" /></div>
              </div>
            )}
            {/* categoria do responsável: define as siglas (TRT/CFT do técnico x ART/CREA do engenheiro) */}
            <div className="space-y-1">
              <Label>Você é</Label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setCategoria('tecnico')} className={`rounded-lg border p-2 text-left text-xs ${categoria === 'tecnico' ? 'border-primary bg-primary/10 font-semibold' : 'hover:bg-muted/50'}`}>
                  <div className="text-xs font-semibold leading-tight">Técnico Agrimensura</div><div className="text-[10px] text-muted-foreground mt-0.5">CFT, emite TRT</div>
                </button>
                <button type="button" onClick={() => setCategoria('tecnico-agricola')} className={`rounded-lg border p-2 text-left text-xs ${categoria === 'tecnico-agricola' ? 'border-primary bg-primary/10 font-semibold' : 'hover:bg-muted/50'}`}>
                  <div className="text-xs font-semibold leading-tight">Técnico Agrícola</div><div className="text-[10px] text-muted-foreground mt-0.5">CFTA, emite TRT</div>
                </button>
                <button type="button" onClick={() => setCategoria('engenheiro')} className={`rounded-lg border p-2 text-left text-xs ${categoria === 'engenheiro' ? 'border-primary bg-primary/10 font-semibold' : 'hover:bg-muted/50'}`}>
                  <div className="text-xs font-semibold leading-tight">Engenheiro</div><div className="text-[10px] text-muted-foreground mt-0.5">CREA, emite ART</div>
                </button>
                <button type="button" onClick={() => setCategoria('duplo')} className={`rounded-lg border p-2 text-left text-xs ${categoria === 'duplo' ? 'border-primary bg-primary/10 font-semibold' : 'hover:bg-muted/50'}`}>
                  <div className="text-xs font-semibold leading-tight">Técnico + Engenheiro</div><div className="text-[10px] text-muted-foreground mt-0.5">Ambos (CFT + CREA)</div>
                </button>
              </div>
            </div>
            <div className="space-y-1"><Label>Seu nome (responsável técnico)</Label><Input value={nomeRt} onChange={(e) => setNomeRt(e.target.value)} placeholder="Nome completo" /></div>
            <div className="space-y-1"><Label>Formação (aparece nas peças)</Label><Input value={formacao} onChange={(e) => setFormacao(e.target.value)} placeholder={formacaoPadrao} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Registro {duplo ? 'CFT / CREA' : conselho}</Label>
                <Input value={cft} onChange={(e) => setCft(e.target.value)} placeholder={duplo ? "Ex.: CFT: 123-MG / CREA: 456-MG" : "Ex.: 12345678900-MG"} />
              </div>
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
            <p className="text-[10px] text-muted-foreground/80">Ao concluir, você concorda com as condições de uso do sistema — o texto completo fica em Ajustes, na seção “Sobre o sistema”.</p>
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
