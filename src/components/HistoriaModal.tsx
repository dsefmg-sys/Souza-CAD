'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Share2, Copy, Check } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { carregarAppUrl } from '@/lib/store/suporte';

export default function HistoriaModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [copiado, setCopiado] = useState(false);
  const [appUrl, setAppUrl] = useState('https://souzacad--souza-cad.us-east4.hosted.app/');

  useEffect(() => {
    if (open) {
      void carregarAppUrl().then(setAppUrl);
    }
  }, [open]);

  const mensagemCompartilhar = `Olá! Estou utilizando o Souza CAD para otimizar os processos de georreferenciamento. Ele realiza conciliação automática com dados do SIGEF, calcula áreas e perímetros na projeção adequada e gera peças técnicas (memorial descritivo, planilha ODS, requerimento, anuências e erratas) além de plantas em formato A3 de maneira rápida diretamente no navegador.

É uma ferramenta leve, prática e desenvolvida para resolver as limitações de softwares pesados ou com custos de licenciamento abusivos. Caso queira testar a ferramenta no campo ou escritório, acesse: ${appUrl}`;

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
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6 bg-background shadow-2xl rounded-xl overflow-hidden">
        <DialogHeader className="shrink-0 pb-4 border-b border-border/60 flex flex-row items-center gap-3">
          <Logo className="size-9 rounded-lg" />
          <div className="text-left">
            <DialogTitle className="text-lg font-black text-foreground">
              A História e a Missão do Souza CAD
            </DialogTitle>
            <p className="text-xs text-muted-foreground">Eficiência técnica e simplicidade no processamento de dados geográficos.</p>
          </div>
        </DialogHeader>

        {/* Corpo com rolagem manual para leitura confortável */}
        <div className="flex-grow overflow-y-auto pr-1 my-4 space-y-4 text-xs md:text-sm text-muted-foreground leading-relaxed">
          <div className="space-y-3">
            <h3 className="font-bold text-foreground text-sm">
              A Origem: Superando Limitações Técnicas e Financeiras
            </h3>
            <p>
              O Souza CAD surgiu a partir da necessidade de simplificar e agilizar o processamento de levantamentos topográficos e de georreferenciamento. Tradicionalmente, o mercado de software de topografia é dominado por soluções de alto custo, com licenças restritivas e requisitos de hardware elevados, o que limita a atuação do profissional no campo e no escritório.
            </p>
            <p>
              Com a proposta de criar uma alternativa leve, multiplataforma e focada em produtividade, a aplicação foi desenvolvida para rodar diretamente em navegadores web, eliminando a dependência de computadores de alto desempenho e permitindo acesso rápido a partir de dispositivos móveis.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-foreground text-sm">
              A Missão: Autonomia e Precisão para o Profissional
            </h3>
            <p>
              A principal missão do Souza CAD é fornecer autonomia técnica e ferramentas precisas ao profissional de georreferenciamento. O sistema foi desenvolvido com foco nos fluxos de trabalho reais das certificações junto ao INCRA e cartórios, destacando-se por:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-muted-foreground">
              <li><strong>Cálculo Geodésico em SGL:</strong> Processamento matemático no plano topocêntrico local (GRS80/SIRGAS2000) em total conformidade com as diretrizes técnicas oficiais.</li>
              <li><strong>Importação Direta de Dados:</strong> Leitura automática de dados de levantamento de campo (arquivos de pontos TXT/CSV) e dados de certificações oficiais (arquivos CSV ou GML do SIGEF), minimizando a necessidade de redigitação.</li>
              <li><strong>Geração Ágil de Peças Técnicas:</strong> Exportação estruturada de memoriais descritivos, planilhas no formato ODS, requerimentos de retificação, termos de anuência e relatórios de sobreposição geográfica.</li>
              <li><strong>Grade de Altitude Digital:</strong> Geração integrada de curvas de nível baseadas em dados do Copernicus DEM para otimizar a visualização altimétrica do relevo.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-[#87a992]/20 bg-[#05140b]/10 p-4 space-y-3">
            <h3 className="font-bold text-[#87a992] text-sm flex items-center gap-1.5">
              <Share2 className="size-4" /> Compartilhe o Souza CAD
            </h3>
            <p className="text-xs">
              A recomendação entre profissionais fortalece a categoria e ajuda a divulgar uma ferramenta que preza pela liberdade técnica. Utilize o modelo de texto abaixo para compartilhar a ferramenta com outros profissionais da área:
            </p>
            
            <div className="relative rounded-lg border border-border bg-background p-3 font-mono text-[11px] text-muted-foreground max-h-36 overflow-y-auto whitespace-pre-wrap leading-normal">
              {mensagemCompartilhar}
            </div>

            <Button
              type="button"
              onClick={handleCopiar}
              className={`w-full gap-2 font-bold text-xs h-9 transition-colors ${copiado ? 'bg-[#1b4d3e] text-white hover:bg-[#12362b]' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
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
