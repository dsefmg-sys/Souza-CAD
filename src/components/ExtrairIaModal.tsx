'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Wand2, UploadCloud, FileText, Image, Trash2 } from 'lucide-react';
import type { ImovelData } from '@/lib/topo/types';
import { auth } from '@/lib/firebase/client';

// O usuário pode colar texto ou arrastar arquivos (PDF, imagens da matrícula/escritura)
// A IA (Gemini 1.5 Flash no servidor) extrai os campos de imóvel/proprietário.
// O profissional confere e aplica ao cadastro.

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Aplica os dados extraídos ao destino escolhido: 'imovel', 'novo' (novo confrontante) ou o id de um confrontante.
   *  `arquivo` vem preenchido só quando o usuário acabou de subir um arquivo NOVO nesta tela (não quando a
   *  extração partiu de um documento já anexado) — o chamador decide se/como anexar ao projeto. */
  onAplicar: (
    parcial: Partial<ImovelData>,
    destino: string,
    arquivo?: File,
    verticesExtraidos?: { nome?: string; norte: number; leste: number; elevacao?: number }[]
  ) => void;
  /** Documento já anexado que a IA deve ler (parte da extração a partir de um arquivo guardado). */
  arquivoInicial?: { data: string; mimeType: string; nome: string } | null;
  /** Confrontantes existentes, para o roteamento "a quem pertence" depois da leitura. */
  confrontantes?: { id: string; nome: string }[];
  /** Destino pré-selecionado ('imovel' por padrão, ou um id de confrontante quando parte do doc dele). */
  destinoInicial?: string;
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

export default function ExtrairIaModal({ open, onOpenChange, onAplicar, arquivoInicial, confrontantes = [], destinoInicial }: Props) {
  const [texto, setTexto] = useState('');
  const [arquivo, setArquivo] = useState<{ data: string; mimeType: string; nome: string } | null>(null);
  // Guarda o File BRUTO só quando o usuário sobe um arquivo novo aqui na tela (não quando a
  // extração parte de um documento já anexado) — é o que permite anexar ao projeto depois de
  // aplicar, sem duplicar um anexo que já existia.
  const [arquivoFile, setArquivoFile] = useState<File | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [campos, setCampos] = useState<Record<string, string> | null>(null);
  const [verticesExtraidos, setVerticesExtraidos] = useState<{ nome?: string; norte: number; leste: number; elevacao?: number }[] | null>(null);
  const [destino, setDestino] = useState('imovel'); // a quem aplicar: 'imovel' | 'novo' | id do confrontante
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // Ao abrir vindo de um documento anexado, já carrega o arquivo e limpa o resultado anterior.
  // `arquivoFile` fica de fora de propósito: esse arquivo já existe no projeto, não é upload novo.
  useEffect(() => {
    if (open && arquivoInicial) { setArquivo(arquivoInicial); setArquivoFile(null); setCampos(null); setVerticesExtraidos(null); setErro(''); setTexto(''); }
  }, [open, arquivoInicial]);
  // Ao abrir, o destino começa no que foi pedido (imóvel, ou o confrontante de onde partiu o documento).
  useEffect(() => {
    if (open) setDestino(destinoInicial || 'imovel');
  }, [open, destinoInicial]);

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
      setArquivoFile(file);
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
    setErro(''); setCarregando(true); setCampos(null); setVerticesExtraidos(null);
    try {
      // manda o comprovante de login junto — o servidor só gasta a cota da IA com usuário logado
      const usuario = auth()?.currentUser;
      const token = usuario ? await usuario.getIdToken() : '';
      const r = await fetch('/api/ia/extrair-imovel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ texto, arquivo }),
      });
      
      const rawText = await r.text();
      let j: { erro?: string; dados?: Record<string, unknown> };
      try {
        j = JSON.parse(rawText);
      } catch {
        setErro(rawText.slice(0, 200) || `Erro de comunicação com o servidor (${r.status}).`);
        return;
      }

      if (!r.ok) { 
        setErro(j.erro || 'A IA não conseguiu processar.'); 
        return; 
      }
      
      const d = (j.dados ?? {}) as Record<string, unknown>;
      const base: Record<string, string> = {};
      for (const c of CAMPOS) base[c.chave] = (d[c.chave] as string | undefined ?? '').toString();
      setCampos(base);

      if (Array.isArray(d.vertices) && d.vertices.length > 0) {
        setVerticesExtraidos(d.vertices as { nome?: string; norte: number; leste: number; elevacao?: number }[]);
      }
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
    onAplicar(parcial, destino, arquivoFile ?? undefined, verticesExtraidos ?? undefined);
    onOpenChange(false);
    setTexto(''); setArquivo(null); setArquivoFile(null); setCampos(null); setVerticesExtraidos(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-6 rounded-xl bg-background shadow-2xl">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-foreground">
            <div className="p-1.5 bg-violet-500/10 rounded-lg text-violet-600 dark:text-violet-400">
              <Sparkles className="size-5" />
            </div>
            Leitura e Extração de Dados &amp; Vértices com IA
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 min-h-0 pr-1">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Arraste qualquer tipo de arquivo (PDF de Matrícula, Escritura, Memorial, Tabela de Coordenadas ou Imagem) para ler e extrair os dados cadastrais e os vértices do polígono automaticamente.
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
                  title="Remover o arquivo anexado"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => { setArquivo(null); setArquivoFile(null); }}
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
                  <div className="text-xs font-bold text-foreground">Arraste a Matrícula / Memorial (PDF ou Imagem)</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">ou clique para selecionar do computador (máx 15MB)</div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              size="sm"
              disabled={carregando || !arquivo}
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

              {verticesExtraidos && verticesExtraidos.length > 0 && (
                <div className="border border-indigo-500/30 rounded-lg p-3 bg-indigo-500/5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    <span>Vértices Extraídos para Polígono ({verticesExtraidos.length} pontos encontrados)</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto border rounded bg-background text-[11px]">
                    <table className="w-full border-collapse text-left">
                      <thead className="bg-muted sticky top-0 font-bold border-b text-muted-foreground">
                        <tr>
                          <th className="p-1 px-2">Vértice</th>
                          <th className="p-1 px-2">Norte (Y)</th>
                          <th className="p-1 px-2">Leste (X)</th>
                          <th className="p-1 px-2">Altitude (Z)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {verticesExtraidos.map((v, i) => (
                          <tr key={i} className="border-b last:border-0 hover:bg-muted/40">
                            <td className="p-1 px-2 font-semibold">{v.nome || `P-${i + 1}`}</td>
                            <td className="p-1 px-2">{v.norte}</td>
                            <td className="p-1 px-2">{v.leste}</td>
                            <td className="p-1 px-2">{v.elevacao ?? 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* A quem pertence este documento — o roteamento pedido: a IA leu, agora você decide o dono. */}
              <div className="rounded-lg border border-border/70 bg-background p-2.5 space-y-1">
                <span className="block text-[11px] font-semibold text-muted-foreground">A quem pertence este documento?</span>
                <select
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                >
                  <option value="imovel">Imóvel / proprietário deste levantamento</option>
                  {confrontantes.map((c) => (
                    <option key={c.id} value={c.id}>Confrontante: {c.nome || '(sem nome)'}</option>
                  ))}
                  <option value="novo">Novo confrontante (criar a partir deste documento)</option>
                </select>
                <p className="text-[10px] leading-snug text-muted-foreground">
                  {destino === 'imovel'
                    ? 'Os dados vão para o cadastro do imóvel/proprietário e os vértices extraídos geram/atualizam o polígono.'
                    : destino === 'novo'
                    ? 'Cria um confrontante novo com estes dados — depois é só pintar as divisas dele no mapa.'
                    : 'Os dados vão para o confrontante escolhido (nome, CPF, cônjuge, matrícula e cartório).'}
                </p>
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
