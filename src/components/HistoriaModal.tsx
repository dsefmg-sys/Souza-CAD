'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Share2, Copy, Check, Sparkles, Heart } from 'lucide-react';
import { Logo } from '@/components/Logo';

export default function HistoriaModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [copiado, setCopiado] = useState(false);

  const mensagemCompartilhar = `Fala, pessoal! Estou usando o Souza CAD para agilizar meus levantamentos de georreferenciamento. Ele faz a conciliação automática com o SIGEF, gera peças técnicas (memorial, ODS, requerimento, anuências, erratas) e plantas em segundos direto no navegador. 

É um software leve, rápido e feito de agrimensor para agrimensor para resolver a dor das licenças caras e softwares travados. Vale muito a pena testar no campo ou no escritório: https://souzacad.com`;

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(mensagemCompartilhar);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (e) {
      // fallback silencioso
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6 bg-background border border-border shadow-2xl rounded-xl overflow-hidden">
        <DialogHeader className="shrink-0 pb-4 border-b border-border/60 flex flex-row items-center gap-3">
          <Logo className="size-9 rounded-lg" />
          <div className="text-left">
            <DialogTitle className="text-lg font-black text-foreground flex items-center gap-1.5">
              A História e a Missão do Souza CAD <Sparkles className="size-4 text-amber-500 animate-pulse" />
            </DialogTitle>
            <p className="text-xs text-muted-foreground">De agrimensor para agrimensor: liberdade e eficiência no campo e escritório.</p>
          </div>
        </DialogHeader>

        {/* Corpo com rolagem manual para leitura confortável */}
        <div className="flex-grow overflow-y-auto pr-1 my-4 space-y-4 text-xs md:text-sm text-muted-foreground leading-relaxed">
          <div className="space-y-3">
            <h3 className="font-bold text-foreground text-sm flex items-center gap-1">
              <Heart className="size-4 text-red-500 fill-red-500" /> A Origem: Resolvendo uma Dor Real
            </h3>
            <p>
              Durante anos atuando na agrimensura e no georreferenciamento de imóveis rurais, vivi na pele as frustrações diárias da nossa profissão: softwares de topografia extremamente caros, travados por licenças anuais abusivas, pesados e que exigiam computadores de última geração apenas para gerar peças textuais ou desenhar uma poligonal simples.
            </p>
            <p>
              Muitas vezes, em campo, com pressa para validar um limite ou tirar uma dúvida geométrica, dependia de conexões lentas para tentar conectar remotamente ao computador do escritório. Foi dessa insatisfação que nasceu o <strong>Souza CAD</strong>.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-foreground text-sm">
              ⚡ A Missão: Performance e Simplicidade Sem Amarras
            </h3>
            <p>
              Desenvolvi esta plataforma com uma meta clara: <strong>dar liberdade técnica ao agrimensor</strong>. O Souza CAD roda 100% no navegador, seja em um tablet no meio do mato, em um notebook antigo ou no celular. Ele foi otimizado para ser leve, rápido e focado nas etapas que realmente importam:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-muted-foreground">
              <li><strong>Área SGL Automática:</strong> Cálculo preciso no plano topocêntrico local (GRS80/SIRGAS2000), garantindo conformidade com a terceira edição da norma técnica do INCRA.</li>
              <li><strong>Importação Inteligente:</strong> Autodetecção e leitura de arquivos TXT de campo, CSVs, GMLs e XMLs do SIGEF sem configurações manuais de colunas.</li>
              <li><strong>Geração Instantânea de Peças:</strong> Memorial descritivo em Word, planilha ODS, requerimentos cartoriais, cartas de anuência e relatórios de sobreposição espacial criados em um único clique.</li>
              <li><strong>Grade de Relevo Digital:</strong> Geração de curvas de nível realistas a partir de altitudes do Copernicus DEM, eliminando a necessidade de dezenas de pontos internos medidos apenas para traçar o relevo.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-[#87a992]/20 bg-[#05140b]/10 p-4 space-y-3">
            <h3 className="font-bold text-foreground text-sm flex items-center gap-1.5 text-[#87a992]">
              <Share2 className="size-4 text-emerald-500" /> Compartilhe e Fortaleça a Categoria!
            </h3>
            <p className="text-xs">
              A nossa maior força é a recomendação entre profissionais. Se o Souza CAD economiza suas horas de trabalho e simplifica seu faturamento, compartilhe essa ferramenta com seus colegas em grupos de topografia e agrimensura!
            </p>
            
            <div className="relative rounded-lg border border-border bg-background p-3 font-mono text-[11px] text-muted-foreground max-h-36 overflow-y-auto whitespace-pre-wrap leading-normal">
              {mensagemCompartilhar}
            </div>

            <Button
              type="button"
              onClick={handleCopiar}
              className={`w-full gap-2 font-bold text-xs h-9 transition-colors ${copiado ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
            >
              {copiado ? (
                <>
                  <Check className="size-3.5" /> Mensagem Copiada!
                </>
              ) : (
                <>
                  <Copy className="size-3.5" /> Copiar Mensagem para Compartilhar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
