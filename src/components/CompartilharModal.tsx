import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Share2, Copy, Check, Users, Eye, Download, Landmark } from 'lucide-react';
import { ImovelData } from '@/lib/topo/types';
import { confirmar } from '@/lib/ui/dialogos';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  imovel: ImovelData;
  onChangeImovel: (i: ImovelData) => void;
  projetoId: string | null;
  onSalvarProjeto: () => void;
}

export default function CompartilharModal({
  open,
  onOpenChange,
  imovel,
  onChangeImovel,
  projetoId,
  onSalvarProjeto
}: Props) {
  const [msg, setMsg] = useState('');
  const [copiado, setCopiado] = useState(false);

  // Local state for sharing config
  const [ativo, setAtivo] = useState(false);
  const [token, setToken] = useState('');
  const [permVisualizar, setPermVisualizar] = useState(true);
  const [permBaixar, setPermBaixar] = useState(false);
  const [permCopiar, setPermCopiar] = useState(false);
  const [permEquipe, setPermEquipe] = useState(false);

  useEffect(() => {
    if (open) {
      const d = imovel.dadosLoteamento; // wait, let's store inside a generic property or inside dadosLoteamento?
      // Actually, since ImovelData has dadosLoteamento, or we can use generic property:
      // Let's store in a property or we can check if it exists:
      const s = (imovel as any).dadosCompartilhamento || {};
      setAtivo(s.ativo || false);
      setToken(s.token || Math.random().toString(36).substring(2, 10));
      setPermVisualizar(s.permVisualizar !== false);
      setPermBaixar(s.permBaixar || false);
      setPermCopiar(s.permCopiar || false);
      setPermEquipe(s.permEquipe || false);
    }
  }, [open, imovel]);

  const obterDadosAtuais = () => ({
    ativo,
    token,
    permVisualizar,
    permBaixar,
    permCopiar,
    permEquipe
  });

  const verificarModificado = () => {
    const atual = obterDadosAtuais();
    const salvo = (imovel as any).dadosCompartilhamento || {};
    return JSON.stringify(atual) !== JSON.stringify({
      ativo: salvo.ativo || false,
      token: salvo.token || '',
      permVisualizar: salvo.permVisualizar !== false,
      permBaixar: salvo.permBaixar || false,
      permCopiar: salvo.permCopiar || false,
      permEquipe: salvo.permEquipe || false
    });
  };

  const salvarLocal = () => {
    onChangeImovel({
      ...imovel,
      dadosCompartilhamento: obterDadosAtuais()
    } as any);
    setMsg('Configurações de compartilhamento salvas!');
    setTimeout(() => setMsg(''), 3000);
    onSalvarProjeto();
  };

  const fecharComVerificacao = async () => {
    if (verificarModificado()) {
      const fecharSemSalvar = await confirmar({
        titulo: 'Alterações pendentes',
        mensagem: 'Você alterou as configurações de compartilhamento. Deseja fechar e descartar?',
        okLabel: 'Descartar e Fechar',
        perigo: true
      });
      if (!fecharSemSalvar) return;
    }
    onOpenChange(false);
  };

  const shareUrl = projetoId 
    ? `${window.location.origin}/share/${projetoId}?key=${token}`
    : 'Salve o projeto primeiro para gerar o link!';

  const copiarLink = () => {
    if (!projetoId) return;
    navigator.clipboard.writeText(shareUrl);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) fecharComVerificacao(); else onOpenChange(val); }}>
      <DialogContent className="w-[96vw] sm:w-[92vw] max-w-[600px] max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden shadow-2xl" onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="shrink-0 flex flex-row items-center justify-between border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-base font-extrabold uppercase tracking-wide text-foreground">
            <Share2 className="size-5 text-indigo-500 shrink-0" /> Compartilhar &amp; Trabalho Colaborativo
          </DialogTitle>
          <div className="flex items-center gap-2">
            {msg && <span className="text-xs font-bold text-emerald-500 animate-pulse">{msg}</span>}
            <Button size="sm" variant="outline" className="text-xs font-bold" onClick={salvarLocal}>
              Salvar Configurações
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-2 text-xs sm:text-sm">
          {/* Toggle Ativar Link */}
          <div className="p-4 rounded-xl border border-border/80 bg-card/50 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-xs font-extrabold text-foreground uppercase">Compartilhamento de Link Público</h4>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Qualquer pessoa com o link poderá acessar as informações selecionadas do projeto.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={ativo} 
                onChange={(e) => setAtivo(e.target.checked)} 
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Link Container */}
          {ativo && (
            <div className="space-y-2 border-t pt-3 animate-fade-in">
              <Label className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Link Seguro de Acesso</Label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 h-8 rounded border bg-muted px-2.5 text-[11px] font-mono outline-hidden select-all"
                />
                <Button size="sm" variant="secondary" className="h-8 text-xs font-bold gap-1" onClick={copiarLink} disabled={!projetoId}>
                  {copiado ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                  {copiado ? 'Copiado!' : 'Copiar'}
                </Button>
              </div>
            </div>
          )}

          {/* Configurações de Permissões */}
          <div className="border-t pt-3">
            <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-2.5 uppercase tracking-wide">Nível de Permissão e Acesso</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-start gap-2.5 p-3 rounded-lg border bg-muted/10 cursor-pointer hover:bg-muted/20 transition-colors">
                <input
                  type="checkbox"
                  checked={permVisualizar}
                  onChange={(e) => setPermVisualizar(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 size-4"
                />
                <div className="space-y-0.5">
                  <span className="text-[11px] font-extrabold uppercase flex items-center gap-1"><Eye className="size-3 text-indigo-500" /> Visualizar Planta</span>
                  <p className="text-[10px] text-muted-foreground leading-tight">Permite visualizar a prancha oficial SVG interativa.</p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-lg border bg-muted/10 cursor-pointer hover:bg-muted/20 transition-colors">
                <input
                  type="checkbox"
                  checked={permBaixar}
                  onChange={(e) => setPermBaixar(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 size-4"
                />
                <div className="space-y-0.5">
                  <span className="text-[11px] font-extrabold uppercase flex items-center gap-1"><Download className="size-3 text-indigo-500" /> Download de Peças</span>
                  <p className="text-[10px] text-muted-foreground leading-tight">Habilita botão para baixar os memoriais, laudos e DXF.</p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-lg border bg-muted/10 cursor-pointer hover:bg-muted/20 transition-colors">
                <input
                  type="checkbox"
                  checked={permCopiar}
                  onChange={(e) => setPermCopiar(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 size-4"
                />
                <div className="space-y-0.5">
                  <span className="text-[11px] font-extrabold uppercase flex items-center gap-1"><Landmark className="size-3 text-indigo-500" /> Clonar/Importar Projeto</span>
                  <p className="text-[10px] text-muted-foreground leading-tight">Outro agrimensor poderá duplicar o projeto na conta dele.</p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-lg border bg-muted/10 cursor-pointer hover:bg-muted/20 transition-colors">
                <input
                  type="checkbox"
                  checked={permEquipe}
                  onChange={(e) => setPermEquipe(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 size-4"
                />
                <div className="space-y-0.5">
                  <span className="text-[11px] font-extrabold uppercase flex items-center gap-1"><Users className="size-3 text-indigo-500" /> Edição em Equipe</span>
                  <p className="text-[10px] text-muted-foreground leading-tight">Permite edição colaborativa em tempo real com colegas de equipe.</p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
