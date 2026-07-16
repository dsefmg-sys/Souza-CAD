'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, RotateCcw, Download, Upload } from 'lucide-react';
import { carregarModelos, salvarModelos, MODELOS_PADRAO, VARIAVEIS_MODELO, type ModelosDocs } from '@/lib/store/modelos';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const CAMPOS: { chave: keyof ModelosDocs; titulo: string; grupo: string; tipo: 'principais' | 'adicionais' }[] = [
  { tipo: 'principais', grupo: 'Memorial e planta', chave: 'declProprietario', titulo: 'Declaração do(s) proprietário(s)' },
  { tipo: 'principais', grupo: 'Memorial e planta', chave: 'declConfrontantes', titulo: 'Declaração dos confrontantes' },
  { tipo: 'principais', grupo: 'Memorial e planta', chave: 'laudoTecnico', titulo: 'Laudo técnico (planta)' },
  { tipo: 'principais', grupo: 'Memorial e planta', chave: 'memorialInfoTecnicas', titulo: 'Informações técnicas (memorial rural)' },
  { tipo: 'principais', grupo: 'Memorial e planta', chave: 'memorialObservacoes', titulo: 'Observações (memorial rural)' },
  { tipo: 'principais', grupo: 'Memorial e planta', chave: 'memorialInfoTecnicasUrbano', titulo: 'Informações técnicas (memorial urbano)' },
  { tipo: 'principais', grupo: 'Memorial e planta', chave: 'memorialObservacoesUrbano', titulo: 'Observações (memorial urbano)' },
  { tipo: 'principais', grupo: 'Requerimento', chave: 'requerimentoConfrontantes', titulo: 'Declarações sobre confrontantes (uma linha em branco separa parágrafos)' },
  { tipo: 'principais', grupo: 'Requerimento', chave: 'requerimentoResponsabilidade', titulo: 'Responsabilidade técnica' },
  { tipo: 'principais', grupo: 'Requerimento', chave: 'requerimentoVenda', titulo: 'Requerimento ao oficial: Venda / Transmissão' },
  { tipo: 'principais', grupo: 'Requerimento', chave: 'requerimentoDoacao', titulo: 'Requerimento ao oficial: Doação' },
  { tipo: 'principais', grupo: 'Requerimento', chave: 'requerimentoUnificacao', titulo: 'Requerimento ao oficial: Unificação' },
  { tipo: 'principais', grupo: 'Requerimento', chave: 'requerimentoDesmembramento', titulo: 'Requerimento ao oficial: Desmembramento' },
  { tipo: 'principais', grupo: 'Requerimento', chave: 'requerimentoUsucapiao', titulo: 'Requerimento ao oficial: Usucapião' },
  { tipo: 'principais', grupo: 'Errata', chave: 'errataRatificacao', titulo: 'Considerações finais e ratificação' },
  { tipo: 'principais', grupo: 'Anuência', chave: 'anuenciaFecho', titulo: 'Parágrafo de fecho da carta de anuência' },
  { tipo: 'principais', grupo: 'Servidão', chave: 'servidaoIntro', titulo: 'Abertura do memorial de servidão' },
  { tipo: 'principais', grupo: 'Mato Grosso (INTERMAT)', chave: 'memorialIntermatFinalidade', titulo: 'Finalidade do memorial no padrão INTERMAT (só imóveis de MT)' },
  
  { tipo: 'adicionais', grupo: 'Contrato, recibo e proposta', chave: 'contratoContratante', titulo: 'Qualificação do Contratante' },
  { tipo: 'adicionais', grupo: 'Contrato, recibo e proposta', chave: 'contratoContratado', titulo: 'Qualificação do Contratado' },
  { tipo: 'adicionais', grupo: 'Contrato, recibo e proposta', chave: 'contratoObjeto', titulo: 'Objeto do contrato' },
  { tipo: 'adicionais', grupo: 'Contrato, recibo e proposta', chave: 'contratoValor', titulo: 'Valor e pagamento (contrato)' },
  { tipo: 'adicionais', grupo: 'Contrato, recibo e proposta', chave: 'contratoPrazo', titulo: 'Prazo de execução (contrato)' },
  { tipo: 'adicionais', grupo: 'Contrato, recibo e proposta', chave: 'contratoObrigacoes', titulo: 'Obrigações das partes (contrato)' },
  { tipo: 'adicionais', grupo: 'Contrato, recibo e proposta', chave: 'contratoForo', titulo: 'Foro da comarca (contrato)' },
  { tipo: 'adicionais', grupo: 'Contrato, recibo e proposta', chave: 'reciboReferente', titulo: 'Texto "referente a…" do recibo' },
  { tipo: 'adicionais', grupo: 'Contrato, recibo e proposta', chave: 'propostaTexto', titulo: 'Corpo da proposta/orçamento' },
  { tipo: 'adicionais', grupo: 'Declarações avulsas', chave: 'declPosse', titulo: 'Declaração de posse' },
  { tipo: 'adicionais', grupo: 'Declarações avulsas', chave: 'declInexistenciaSobreposicao', titulo: 'Declaração de inexistência de sobreposição' },
  { tipo: 'adicionais', grupo: 'Declarações avulsas', chave: 'declIncapaz', titulo: 'Declaração de representação de incapaz (menores/interditos)' },
  { tipo: 'adicionais', grupo: 'Declarações avulsas', chave: 'declEspolio', titulo: 'Declaração de representação de espólio (inventariante)' },
  { tipo: 'adicionais', grupo: 'Declarações avulsas', chave: 'declRespeitoLimites', titulo: 'Declaração de respeito de limites e ausência de sobreposição' },
];

// Editor dos modelos de texto das peças. Cada empresa personaliza; as variáveis {chave} são trocadas
// pelos dados reais na geração. A estrutura das peças (tabela, narrativa, assinaturas) segue automática.
export default function ModelosDocsModal({ open, onOpenChange }: Props) {
  const [m, setM] = useState<ModelosDocs>(MODELOS_PADRAO);
  const [guiaModelos, setGuiaModelos] = useState<'principais' | 'adicionais'>('principais');
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) setM(carregarModelos()); }, [open]);

  function set(chave: keyof ModelosDocs, valor: string) {
    const novo = { ...m, [chave]: valor };
    setM(novo); salvarModelos(novo);
  }

  // Baixa os modelos atuais num arquivo, pra guardar ou passar pra outra empresa.
  function baixarModelos() {
    const blob = new Blob([JSON.stringify(m, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'modelos-souzacad.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Importa modelos de um arquivo baixado antes (substitui os campos que vierem no arquivo).
  async function importarModelos(file: File) {
    try {
      const dados = JSON.parse(await file.text()) as Partial<ModelosDocs>;
      // Só aceita chaves conhecidas; o resto do padrão preenche o que faltar.
      const limpo: Partial<ModelosDocs> = {};
      for (const c of CAMPOS) if (typeof dados[c.chave] === 'string') limpo[c.chave] = dados[c.chave];
      const novo = { ...MODELOS_PADRAO, ...limpo };
      setM(novo); salvarModelos(novo);
    } catch { /* arquivo inválido — ignora silenciosamente */ }
  }

  function restaurarTudo() {
    setM(MODELOS_PADRAO); salvarModelos(MODELOS_PADRAO);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileText className="size-5 text-primary" /> Modelos dos documentos</DialogTitle>
        </DialogHeader>

        {/* Tab selectors for Principais vs Adicionais */}
        <div className="flex border-b border-border mb-2">
          <button
            type="button"
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              guiaModelos === 'principais'
                ? 'border-primary text-primary font-black'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setGuiaModelos('principais')}
          >
            Peças Principais
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
              guiaModelos === 'adicionais'
                ? 'border-primary text-primary font-black'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setGuiaModelos('adicionais')}
          >
            Peças Adicionais
          </button>
        </div>

        <div className="rounded-sm border bg-muted/30 p-2 text-[11px]">
          <div className="mb-1 font-semibold">Variáveis disponíveis (o sistema troca pelos dados reais):</div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {VARIAVEIS_MODELO.map((v) => (
              <span key={v.chave}><code className="rounded-sm bg-background px-1 font-mono text-primary">{v.chave}</code> <span className="text-muted-foreground">{v.descricao}</span></span>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {CAMPOS.filter((c) => c.tipo === guiaModelos).map(({ chave, titulo, grupo }, idx, arr) => (
            <div key={chave} className="space-y-1">
              {(idx === 0 || arr[idx - 1].grupo !== grupo) && (
                <div className="pt-1 text-[11px] font-bold uppercase tracking-wide text-primary">{grupo}</div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">{titulo}</span>
                <button type="button" className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground" onClick={() => set(chave, MODELOS_PADRAO[chave])}><RotateCcw className="size-3" /> restaurar padrão</button>
              </div>
              <textarea
                className="min-h-[70px] w-full rounded-sm border bg-background p-2 text-xs leading-relaxed"
                value={m[chave]}
                onChange={(e) => set(chave, e.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] text-muted-foreground">Salvo automaticamente. Empresas novas já começam com estes modelos; edite ou restaure quando quiser.</span>
          <div className="flex items-center gap-1.5">
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importarModelos(f); e.target.value = ''; }} />
            <Button size="sm" variant="outline" className="gap-1" onClick={baixarModelos} title="Baixar os modelos atuais num arquivo"><Download className="size-3.5" /> Baixar</Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => fileRef.current?.click()} title="Carregar modelos de um arquivo baixado antes"><Upload className="size-3.5" /> Importar</Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={restaurarTudo} title="Voltar todos os modelos ao padrão do sistema"><RotateCcw className="size-3.5" /> Restaurar tudo</Button>
            <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
