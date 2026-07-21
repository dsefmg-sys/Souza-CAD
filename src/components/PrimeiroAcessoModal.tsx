'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, User, UserPlus, LogOut } from 'lucide-react';
import { carregarEscritorio, salvarEscritorio, carregarTecnico, salvarTecnico } from '@/lib/store/settings';
import { aceitarTermos, criarSolicitacaoVinculo, sincronizarPerfil } from '@/lib/store/perfilUso';
import { ufDoMunicipio } from '@/lib/topo/municipios';

interface Props {
  open: boolean;
  onConcluir: () => void;
  onVoltarLogin?: () => void; // sai da conta e volta pra tela de login
}

// Primeiro acesso: cadastra empresa ou autônomo (opcional, pode ser pulado)
export default function PrimeiroAcessoModal({ open, onConcluir, onVoltarLogin }: Props) {
  const [tipo, setTipo] = useState<'empresa' | 'autonomo' | 'auxiliar' | null>(null);
  const [emailVinculo, setEmailVinculo] = useState('');
  const [vinculando, setVinculando] = useState(false);
  const [erroVinculo, setErroVinculo] = useState('');
  const [solicitacaoEnviada, setSolicitacaoEnviada] = useState(false);
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
    const esc = carregarEscritorio();
    const rtNomeFinal = nomeRt.trim() || 'Profissional Responsável';
    const empNomeFinal = nomeEmpresa.trim() || (tipo === 'empresa' ? 'Minha Empresa' : rtNomeFinal);

    salvarEscritorio({
      ...esc,
      nome: empNomeFinal,
      cnpj: cnpjEmpresa.trim(),
      endereco: '', telefone: telefone.trim(),
      ramo: 'Agrimensura e Georreferenciamento', logoDataUrl: undefined,
    });
    const tec = carregarTecnico();
    salvarTecnico({
      ...tec, nome: rtNomeFinal, cft: cft.trim(), cidadeAssinatura: cidade.trim(),
      credenciamentoIncra: credenciamento.trim().toUpperCase(),
      conselho,
      formacao: formacao.trim() || formacaoPadrao,
    });

    sincronizarPerfil({
      empresaNome: empNomeFinal,
      empresaCnpj: cnpjEmpresa.trim(),
      rtNome: rtNomeFinal,
      rtCft: cft.trim(),
      municipio: cidade.trim(),
      uf: ufDoMunicipio(cidade.trim()) || undefined,
    }).catch(() => {});

    aceitarTermos().catch(() => {});
    onConcluir();
  }

  function pular() {
    aceitarTermos().catch(() => {});
    onConcluir();
  }

  async function pedirVinculo() {
    const emailAlvo = emailVinculo.trim();
    if (!emailAlvo) return;
    setErroVinculo('');
    setVinculando(true);
    try {
      await criarSolicitacaoVinculo(emailAlvo);
      aceitarTermos().catch(() => {});
      setSolicitacaoEnviada(true);
    } catch (e) {
      setErroVinculo((e as Error)?.message || 'Erro ao enviar o pedido. Confira sua conexão e tente de novo.');
    } finally {
      setVinculando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(openState) => { if (!openState) pular(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="flex-row items-start justify-between gap-2">
          <DialogTitle>Bem-vindo! Vamos configurar seu cadastro</DialogTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="shrink-0 text-xs text-emerald-400 font-bold hover:bg-emerald-500/10" onClick={pular} title="Ignorar e preencher mais tarde em Ajustes">
              Pular / Preencher depois
            </Button>
            {onVoltarLogin && (
              <Button variant="ghost" size="sm" className="shrink-0 gap-1 text-xs text-muted-foreground" onClick={onVoltarLogin} title="Sair da conta e voltar para a tela de login">
                <LogOut className="size-3.5" /> Sair
              </Button>
            )}
          </div>
        </DialogHeader>

        {!tipo ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Você pode escolher uma opção ou pular para começar direto:</p>
            <button type="button" onClick={() => setTipo('empresa')} className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:bg-muted/50 transition-colors">
              <Building2 className="size-5 text-primary" />
              <div><div className="text-sm font-semibold">Empresa</div><div className="text-xs text-muted-foreground">Escritório de agrimensura com um ou mais técnicos.</div></div>
            </button>
            <button type="button" onClick={() => setTipo('autonomo')} className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:bg-muted/50 transition-colors">
              <User className="size-5 text-primary" />
              <div><div className="text-sm font-semibold">Profissional autônomo</div><div className="text-xs text-muted-foreground">Você mesmo assina e responde pelos trabalhos.</div></div>
            </button>
            <button type="button" onClick={() => setTipo('auxiliar')} className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:bg-muted/50 transition-colors">
              <UserPlus className="size-5 text-primary" />
              <div><div className="text-sm font-semibold">Auxiliar</div><div className="text-xs text-muted-foreground">Você ajuda um RT ou uma empresa que já usa o sistema.</div></div>
            </button>
            <div className="pt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={pular} className="text-xs font-semibold">
                Pular por enquanto e ir ao sistema
              </Button>
            </div>
          </div>
        ) : tipo === 'auxiliar' ? (
          solicitacaoEnviada ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1.5">
                <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Pedido enviado</div>
                <p className="text-xs text-muted-foreground leading-snug">
                  Pedimos pra <strong>{emailVinculo.trim()}</strong> te liberar. Quando essa pessoa aprovar (na tela de Equipe dela), você entra vinculado automaticamente no próximo login — mesmos projetos e dados do responsável técnico. Avise-a que o pedido está lá esperando.
                </p>
              </div>
              <div className="flex justify-between items-center">
                <Button variant="ghost" size="sm" onClick={pular}>Pular e explorar o sistema</Button>
                {onVoltarLogin && (
                  <Button size="sm" onClick={onVoltarLogin}>Sair e aguardar aprovação</Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Informe o e-mail de login do RT ou da empresa que você ajuda. Vamos registrar um pedido de acesso — quem recebe é o dono da conta, que aprova na tela de Equipe. Assim que ele liberar, você entra vinculado no próximo login, com os mesmos projetos e dados do responsável técnico. Ninguém entra na conta de outra pessoa sem essa aprovação.
              </p>
              <div className="space-y-1">
                <Label>E-mail do RT ou da empresa</Label>
                <Input value={emailVinculo} onChange={(e) => setEmailVinculo(e.target.value)} placeholder="nome@exemplo.com" type="email" />
              </div>
              {erroVinculo && <p className="text-xs text-destructive">{erroVinculo}</p>}
              <p className="text-[10px] text-muted-foreground/80">Ao pedir acesso, você concorda com as condições de uso do sistema — o texto completo fica em Ajustes, na seção “Sobre o sistema”.</p>
              <div className="flex justify-between">
                <Button variant="ghost" size="sm" onClick={() => { setTipo(null); setErroVinculo(''); }}>Voltar</Button>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={pular}>Pular</Button>
                  <Button size="sm" disabled={!emailVinculo.trim() || vinculando} onClick={pedirVinculo}>{vinculando ? 'Enviando…' : 'Pedir acesso'}</Button>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-3">
            {tipo === 'empresa' && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="space-y-1"><Label>Nome da empresa (opcional)</Label><Input value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)} placeholder="Ex.: Agrimensura Silva Ltda" /></div>
                <div className="space-y-1"><Label>CNPJ da empresa (opcional)</Label><Input value={cnpjEmpresa} onChange={(e) => setCnpjEmpresa(e.target.value)} placeholder="00.000.000/0000-00" /></div>
              </div>
            )}
            {/* categoria do responsável */}
            <div className="space-y-1">
              <Label>Você é (opcional)</Label>
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
            <div className="space-y-1"><Label>Seu nome (opcional)</Label><Input value={nomeRt} onChange={(e) => setNomeRt(e.target.value)} placeholder="Nome completo" /></div>
            <div className="space-y-1"><Label>Formação (opcional)</Label><Input value={formacao} onChange={(e) => setFormacao(e.target.value)} placeholder={formacaoPadrao} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Registro {duplo ? 'CFT / CREA' : conselho} (opcional)</Label>
                <Input value={cft} onChange={(e) => setCft(e.target.value)} placeholder={duplo ? "Ex.: CFT: 123-MG / CREA: 456-MG" : "Ex.: 12345678900-MG"} />
              </div>
              <div className="space-y-1"><Label>Cidade da assinatura (opcional)</Label><Input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Cidade-UF" /></div>
            </div>
            <p className="text-[11px] text-muted-foreground">O número do {termo} você emite e cola em cada projeto na hora de gerar as peças.</p>
            <div className="space-y-1">
              <Label>Código de credenciado no INCRA (opcional)</Label>
              <Input value={credenciamento} onChange={(e) => setCredenciamento(e.target.value.toUpperCase())} placeholder="Ex.: SEU CÓDIGO — deixe em branco se ainda não tem" />
            </div>
            <div className="space-y-1"><Label>WhatsApp / telefone (opcional)</Label><Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 90000-0000" /></div>
            <p className="text-[11px] text-muted-foreground">Você pode completar e ajustar tudo depois em Configurações.</p>
            <p className="text-[10px] text-muted-foreground/80">Ao concluir, você concorda com as condições de uso do sistema — o texto completo fica em Ajustes, na seção “Sobre o sistema”.</p>
            <div className="flex justify-between items-center pt-2">
              <Button variant="ghost" size="sm" onClick={() => setTipo(null)}>Voltar</Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={pular}>Pular por enquanto</Button>
                <Button size="sm" onClick={concluir}>Concluir cadastro</Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
