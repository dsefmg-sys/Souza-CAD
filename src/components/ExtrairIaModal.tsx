'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Wand2, UploadCloud, FileText, Image, Trash2 } from 'lucide-react';
import type { ImovelData } from '@/lib/topo/types';

// O usuário pode colar texto ou arrastar arquivos (PDF, imagens da matrícula/escritura)
// A IA (Gemini 1.5 Flash no servidor) extrai os campos de imóvel/proprietário.
// O profissional confere e aplica ao cadastro.

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAplicar: (parcial: Partial<ImovelData>) => void;
}

const CAMPOS: { chave: string; rotulo: string }[] = [
  { chave: 'denominacao', rotulo: 'Denominação do imóvel' },
  { chave: 'matricula', rotulo: 'Matrícula' },
  { chave: 'cns', rotulo: 'Cartório (CNS)' },
  { chave: 'codigoImovelIncra', rotulo: 'Código do imóvel (INCRA)' },
  { chave: 'proprietario', rotulo: 'Proprietário' },
  { chave: 'cpfProprietario', rotulo: 'CPF do proprietário' },
  { chave: 'conjugeProprietario', rotulo: 'Cônjuge' },
  { chave: 'cpfConjugeProprietario', rotulo: 'CPF do cônjuge' },
  { chave: 'municipio', rotulo: 'Município' },
  { chave: 'areaAnteriorHa', rotulo: 'Área anterior (ha)' },
];

export default function ExtrairIaModal({ open, onOpenChange, onAplicar }: Props) {
  const [texto, setTexto] = useState('');
  const [arquivo, setArquivo] = useState<{ data: string; mimeType: string; nome: string } | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [campos, setCampos] = useState<Record<string, string> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    setErro('');
    if (file.size > 15 * 1024 * 1024) {
      setErro('O arquivo deve ter no máximo 15MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setArquivo({
        data: reader.result as string,
        mimeType: file.type,
        nome: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  async function extrair() {
    setErro(''); setCarregando(true); setCampos(null);
    try {
      const r = await fetch('/api/ia/extrair-imovel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto, arquivo }),
      });
      const j = await r.json();
      if (!r.ok) { setErro(j.erro || 'A IA não conseguiu processar.'); return; }
      
      const d = (j.dados ?? {}) as Record<string, string>;
      const base: Record<string, string> = {};
      for (const c of CAMPOS) base[c.chave] = (d[c.chave] ?? '').toString();
      setCampos(base);
    } catch (e) { 
      setErro('Falha ao chamar a IA: ' + ((e as Error).message || 'erro')); 
    } finally { 
      setCarregando(false); 
    }
  }

  function aplicar() {
    if (!campos) return;
    const { areaAnteriorHa, ...resto } = campos;
    const parcial: Partial<ImovelData> = {};
    for (const [k, v] of Object.entries(resto)) if (v.trim()) (parcial as Record<string, string>)[k] = v.trim();
    const areaNum = parseFloat((areaAnteriorHa || '').replace(',', '.'));
    if (Number.isFinite(areaNum) && areaNum > 0) parcial.areaAnterior = areaNum;
    onAplicar(parcial);
    onOpenChange(false);
    setTexto(''); setArquivo(null); setCampos(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-6 rounded-xl border border-border bg-background shadow-2xl">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-foreground">
            <div className="p-1.5 bg-violet-500/10 rounded-lg text-violet-600 dark:text-violet-400">
              <Sparkles className="size-5" />
            </div>
            Leitura e Extração de Dados com IA
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 min-h-0 pr-1">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Arraste um arquivo (PDF da Matrícula, Escritura ou Foto do Documento) ou cole o texto abaixo. 
            A inteligência artificial irá analisar os dados e preencher o cadastro para você conferir.
          </p>

          {/* Area Multimodal: Upload / Dropzone */}
          <div
            className={`border-2 border-dashed rounded-xl p-6 transition-all flex flex-col items-center justify-center cursor-pointer ${
              dragOver 
                ? 'border-violet-500 bg-violet-500/5' 
                : arquivo 
                ? 'border-emerald-500 bg-emerald-500/5' 
                : 'border-muted hover:border-violet-500 hover:bg-muted/40'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,image/png,image/jpeg,image/jpg"
              onChange={handleFileChange}
            />

            {arquivo ? (
              <div className="flex items-center gap-3 w-full justify-between" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400">
                    {arquivo.mimeType === 'application/pdf' ? <FileText className="size-6" /> : <Image className="size-6" />}
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-foreground truncate max-w-[320px]">{arquivo.nome}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">{arquivo.mimeType.split('/')[1]} adicionado</div>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setArquivo(null)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-2 pointer-events-none">
                <div className="p-3 bg-muted/80 rounded-full inline-flex text-muted-foreground">
                  <UploadCloud className="size-6" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">Arraste a Matrícula (PDF ou Imagem)</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">ou clique para selecionar do computador (máx 15MB)</div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="h-px bg-border flex-1" />
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Ou cole o texto</span>
            <div className="h-px bg-border flex-1" />
          </div>

          <textarea
            className="min-h-[100px] w-full rounded-lg border border-input bg-background p-3 text-xs leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Se preferir, cole o texto da matrícula ou escritura copiado aqui..."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />

          <div className="flex items-center gap-3 pt-2">
            <Button
              size="sm"
              disabled={carregando || (!texto.trim() && !arquivo)}
              onClick={extrair}
              className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs shadow-md"
            >
              <Wand2 className="size-4" /> 
              {carregando ? 'A IA está lendo o documento...' : 'Iniciar Extração com IA'}
            </Button>
            {erro && <span className="text-xs font-semibold text-destructive">{erro}</span>}
          </div>

          {campos && (
            <div className="border border-border rounded-xl p-4 bg-muted/30 shadow-inner space-y-4">
              <div className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5 uppercase tracking-wide">
                <Sparkles className="size-4" /> 
                Dados Extraídos (Confira antes de aplicar)
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {CAMPOS.map((c) => (
                  <label key={c.chave} className="flex flex-col gap-1 text-[11px]">
                    <span className="font-semibold text-muted-foreground">{c.rotulo}</span>
                    <input
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                      value={campos[c.chave] ?? ''}
                      onChange={(e) => setCampos((p) => ({ ...(p ?? {}), [c.chave]: e.target.value }))}
                    />
                  </label>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <Button 
                  size="sm" 
                  onClick={aplicar}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
                >
                  Confirmar e Salvar no Projeto
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
