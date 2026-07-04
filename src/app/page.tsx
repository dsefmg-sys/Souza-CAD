'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import {
  Upload, FileText, Map as MapIcon, Printer, Plus, Trash2,
  RotateCcw, Flag, Save, FolderOpen, MousePointer2, Crosshair,
  CheckCircle2, AlertTriangle, XCircle, Database, BookUser, Eye, EyeOff,
  Moon, Sun, Pencil, PenTool, Magnet, Lock, LockOpen, Brush, Download, Undo2, Redo2, Users, ShieldCheck,
  Settings, LogOut, Table, FileWarning, Target, Search, Check, X, Ruler, ChevronRight, Move, Camera, PencilRuler, Percent, ImagePlus, Info, UserCheck, HelpCircle, GraduationCap, Palette, BarChart3, Crown, FlaskConical, Package, Sparkles, Leaf, Waypoints, CreditCard, GripVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { confirmar, avisar, perguntar } from '@/lib/ui/dialogos';
import { Input } from '@/components/ui/input';
import ModalSpreadsheet from '@/components/ModalSpreadsheet';
import { Logo } from '@/components/Logo';
import DocumentosProjeto from '@/components/DocumentosProjeto';
import type { ArquivoProjeto } from '@/lib/store/arquivosProjeto';
import ModalImport from '@/components/ModalImport';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Planta from '@/components/Planta';
import RequerimentoModal, { PESSOA_VAZIA } from '@/components/RequerimentoModal';
import ExtrairIaModal from '@/components/ExtrairIaModal';
import CarModal from '@/components/CarModal';
import TrtModal from '@/components/TrtModal';
import ErrataModal from '@/components/ErrataModal';
import MemorialPreviewModal from '@/components/MemorialPreviewModal';
import ConsultarModal from '@/components/ConsultarModal';
import { Packer } from 'docx';
import { gerarAnuenciaDocumento } from '@/lib/export/anuencia';
import ConfiguracoesModal from '@/components/ConfiguracoesModal';
import GestaoProjetoModal from '@/components/GestaoProjetoModal';
import TutorialModal from '@/components/TutorialModal';
import AssinaturaModal from '@/components/AssinaturaModal';
import IntroVideo from '@/components/IntroVideo';
import { IntroAudioPill, TutorialAudioPill } from '@/components/IntroAudio';
import ImportPreviewModal, { type SelecaoImport as ImportSelecao } from '@/components/ImportPreviewModal';
import CalculadoraModal from '@/components/CalculadoraModal';
import VerticeVirtualModal, { type DadosVerticeVirtual } from '@/components/VerticeVirtualModal';
import PrecoSugeridoModal from '@/components/PrecoSugeridoModal';
import ConfrontanteEditModal from '@/components/ConfrontanteEditModal';
import DxfEditorModal from '@/components/DxfEditorModal';
import PorcentagemModal from '@/components/PorcentagemModal';
import EstudioModal from '@/components/EstudioModal';
import ProjetoInfoModal, { infoJaVista } from '@/components/ProjetoInfoModal';
import PontosBancoModal from '@/components/PontosBancoModal';
import type { ModoEdicao } from '@/components/MapEditor';
import type { Vertex, ImovelData, Confrontante, TecnicoData, EscritorioData, Projeto, ProprietarioCad, ConfrontanteCad, ImovelCad, CartorioCad, Gleba, PessoaQualificada, ObjetoDesenho, PontoLL, PlantaConfig, Contadores, Lado, VerticeVizinho, TipoVertice } from '@/lib/topo/types';
import { novaPolilinha, novoTexto, novaCota, novoSimbolo, areaPoligonoObjeto, CAR_TEMAS } from '@/lib/topo/objetos';
import { SIMBOLOS, simboloSvgInterno } from '@/lib/topo/simbolos';
import type { RotuloMapa } from '@/components/MapEditor';
import { parseTxt, pontosDePerimetro } from '@/lib/topo/parseTxt';
import { montarVertices, reordenar, definirInicio, novoVertice, reprojetar, iniciarDoNorteHorario, recodificar } from '@/lib/topo/vertices';
import { montarConfrontantes } from '@/lib/topo/confrontantes';
import { novaGlebaVazia, glebaDe, migrarProjeto, dividirGleba, unirGlebas, dividirPorAreaAlvo, mapearAtributosGlebaDividida } from '@/lib/topo/glebas';
import { calcular } from '@/lib/topo/calcular';
import { detectarZona, escolherZonaPorAncora, geoParaUtm, utmParaGeo, convergenciaMeridiana } from '@/lib/topo/coords';
import { exportarDxf as gerarDxf, importarDxf, anelDeDxf } from '@/lib/io/dxf';
import { gerarShapefileZip, importarShapefileZip, lerShp } from '@/lib/io/shapefile';
import { gerarSituacao } from '@/lib/io/situacao';
import { importarGeoJsonAneis } from '@/lib/io/geojson';
import { parseParcelasSigef, parseGmlParcelas, parcelasParaReferencias, parcelasVizinhas, confrontantesDeVizinhas } from '@/lib/io/sigefVizinhos';
import { parseVerticesVizinho } from '@/lib/io/verticesVizinho';
import { ufsNoBbox, temaIncra, TEMAS_CONFRONTANTE, INCRA_UFS } from '@/lib/io/incraTemas';
import { linhasRotuloConfrontante } from '@/lib/topo/rotuloConfrontante';
import { ancoraMunicipio, MUNICIPIOS, detectarFusoPorRegiao, ufDoMunicipio } from '@/lib/topo/municipios';
import { atribuirProvisorio, semente } from '@/lib/topo/registroCore';
import { snapUtm } from '@/lib/topo/snap';
import { conferir, valoresEfetivos, type Problema, detectarConflitosDivisas, type ConflitoDivisa } from '@/lib/topo/conferencia';
import { corPorConfrontante } from '@/lib/topo/coresConfrontante';
import { conferirProntoParaExportar } from '@/lib/topo/conferenciaExportacao';
import { TIPOS_VERTICE, TIPOS_LIMITE, METODOS_POSICIONAMENTO, REPRESENTACOES, REPRES_LABEL, corDivisa } from '@/lib/topo/sigefVocab';
import { numBR, azimuteDMS, azimute } from '@/lib/topo/geometry';
import { carregarTecnico, carregarEscritorio, carregarPlantaPadrao, salvarPlantaPadrao, salvarTemaUsuario, carregarTemaUsuario, carregarImportTxt, carregarModeloSigef, carregarImportVerticesVizinho, tutorialJaVisto, marcarTutorialVisto } from '@/lib/store/settings';
import { useAuth, sair } from '@/lib/firebase/auth';
import { puxarConfigDaNuvem, empurrarConfigParaNuvem, limparConfigLocalNaSaida } from '@/lib/store/configNuvem';
import { salvarProjeto, listarProjetos, carregarProjeto, excluirProjeto, novoId, NuvemSemPermissao, sincronizarProjetosLocalParaNuvem } from '@/lib/store/projects';
import { lerContadores, registrarPontos, totalPontosRegistrados } from '@/lib/store/registro';
import { carregarTitulos, adicionarTitulo } from '@/lib/store/titulos';
import { gerarProjetoFicticio } from '@/lib/demo/projetoFicticio';
import { iniciarCoresDivisa, salvarCorDivisa, coresEfetivas } from '@/lib/store/coresDivisa';
import { termosAceitosLocal, termosAceitosNuvem, sincronizarPerfil, registrarProjetoSalvo } from '@/lib/store/perfilUso';
import { carregarPreferencias, salvarPreferencias, salvarModo, registrarTempoCompleto, confirmarApagar, casasTela, LIMITE_MODO_FIXO_MS, PREFERENCIAS_PADRAO, type PreferenciasApp } from '@/lib/store/preferencias';
import { carregarPadroes } from '@/lib/store/padroes';
import { souMaster } from '@/lib/store/suporte';
import { carregarConfigAssinatura } from '@/lib/store/assinatura';
import TermosModal from '@/components/TermosModal';
import MasterPainelModal from '@/components/MasterPainelModal';
import PrimeiroAcessoModal from '@/components/PrimeiroAcessoModal';
import PlanilhaConferenciaModal from '@/components/PlanilhaConferenciaModal';
import { proprietarios as cadProp, confrontantesCad as cadConf, cartoriosCad as cadCart, sincronizarCadastrosLocalParaNuvem } from '@/lib/store/cadastros';
import { gerarMemorialDocx } from '@/lib/export/memorial';
import { gerarSigefOds, gerarSigefOdsSeparadas } from '@/lib/export/sigefOds';
import { exportarKML } from '@/lib/export/kml';
import RelatorioSobreposicaoModal from '@/components/RelatorioSobreposicaoModal';
import ErrorBoundary from '@/components/ErrorBoundary';
import JSZip from 'jszip';
import { gerarRequerimentoDocx, type TipoAtoRequerimento } from '@/lib/export/requerimento';
import { compatibilizarWord2007 } from '@/lib/export/compatWord2007';

const MapEditor = dynamic(() => import('@/components/MapEditor'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Carregando mapa…</div>,
});

const IMOVEL_VAZIO: ImovelData = {
  denominacao: '', matricula: '', cns: '', codigoImovelIncra: '', proprietario: '',
  cpfProprietario: '', tipoPessoa: 'Física', comprador: '', cpfComprador: '', municipio: '', local: '',
  naturezaServico: 'Particular', situacao: 'Imóvel Registrado', naturezaArea: 'Particular',
  tipoImovel: 'rural', usarValoresSigef: true, inscricaoMunicipal: '', frenteM: undefined, fundosM: undefined, distanciaEsquinaM: undefined, esquinaRua: '',
};

const CORES_CABECALHO = [
  { id: 'cinza', label: 'Cinza', text: 'text-muted-foreground', border: 'border-muted', bg: 'bg-muted-foreground/30' },
  { id: 'forest', label: 'Verde Floresta', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-600/30', bg: 'bg-emerald-500' },
  { id: 'hydro', label: 'Azul Hidro', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-600/30', bg: 'bg-sky-500' },
  { id: 'terra', label: 'Marrom Solo', text: 'text-amber-800 dark:text-amber-500', border: 'border-amber-800/30', bg: 'bg-amber-700' },
  { id: 'olive', label: 'Verde Oliva', text: 'text-lime-700 dark:text-lime-500', border: 'border-lime-700/30', bg: 'bg-lime-600' },
  { id: 'sigef', label: 'Ciano SIGEF', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-600/30', bg: 'bg-cyan-500' },
  { id: 'orange', label: 'Laranja Curvas', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-600/30', bg: 'bg-orange-500' },
  { id: 'purple', label: 'Roxo Marcos', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-600/30', bg: 'bg-indigo-500' },
  { id: 'rose', label: 'Vermelho Divisas', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-600/30', bg: 'bg-rose-500' },
  { id: 'slate', label: 'Grafite Escuro', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-700/30', bg: 'bg-slate-500' },
];

function gerarTituloAutomatico(im: ImovelData): string {
  const partes: string[] = [];
  let propComp = (im.proprietario || '').trim();
  if (im.comprador && im.comprador.trim()) {
    propComp = propComp ? `${propComp} / ${im.comprador.trim()}` : im.comprador.trim();
  }
  if (propComp) partes.push(propComp);
  if (im.denominacao && im.denominacao.trim()) partes.push(im.denominacao.trim());
  if (im.local && im.local.trim()) partes.push(im.local.trim());
  return partes.join(' — ');
}

type Aba = 'imovel' | 'vertices' | 'confrontantes' | 'planta' | 'conferencia' | 'projetos';

// tons médios e suaves (funcionam no tema claro e escuro via opacidade)
// municípios mais atendidos (atalho na importação; cada um ancora o fuso 23/24)
const MUNICIPIOS_ATALHO = ['Espera Feliz-MG', 'Dores do Rio Preto-ES', 'Caiana-MG', 'Guaçuí-ES', 'Carangola-MG', 'Caparaó-MG'];

// Linguagem de cor por FUNÇÃO do botão (deixa o cabeçalho intuitivo: a cor diz o que o grupo faz).
// O ícone ainda muda de cor pelo progresso (verde=feito, azul=andamento) por cima disso.
const COR_IMPORT = 'bg-background hover:bg-muted/60 text-sky-600 dark:text-sky-400 border-border/70 hover:border-border';       // entrada de dados
const COR_VIZINHO = 'bg-background hover:bg-muted/60 text-teal-600 dark:text-teal-400 border-border/70 hover:border-border'; // vizinho certificado (SIGEF/INCRA)
const COR_DADOS = 'bg-background hover:bg-muted/60 text-violet-600 dark:text-violet-400 border-border/70 hover:border-border'; // cadastro e IA
const COR_MARCAR = 'bg-background hover:bg-muted/60 text-amber-600 dark:text-amber-400 border-border/70 hover:border-border';    // marcar no mapa
const COR_PECA = 'bg-background hover:bg-muted/60 text-emerald-600 dark:text-emerald-400 border-border/70 hover:border-border'; // peças de saída
const PREM_BTN = 'shadow-xs hover:shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 font-bold border rounded-lg';

type EtapaEstado = 'feito' | 'andamento' | 'pendente';
// Sinaliza o progresso da etapa por um SELO no canto do botão (não mais pela cor do ícone, que
// destoava do texto): check verde = feita; bolinha azul pulsando = em andamento; nada = pendente.
function Etapa({ st, children }: { st: EtapaEstado; children: ReactNode }) {
  return (
    <div className="relative flex shrink-0">
      {children}
      {st === 'feito' && (
        <span className="pointer-events-none absolute -right-1 -top-1 z-10 flex size-3.5 items-center justify-center rounded-full bg-green-600 text-white ring-2 ring-background" aria-label="etapa concluída">
          <Check className="size-2.5" strokeWidth={3.5} />
        </span>
      )}
      {st === 'andamento' && (
        <span className="pointer-events-none absolute -right-1 -top-1 z-10 size-2.5 animate-pulse rounded-full bg-blue-500 ring-2 ring-background" aria-label="etapa em andamento" />
      )}
    </div>
  );
}

// Botão único de AÇÕES: desfazer à esquerda, refazer à direita, rótulo no meio (economiza espaço).
function BotaoAcoes({ onUndo, onRedo }: { onUndo: () => void; onRedo: () => void }) {
  return (
    <div className="flex h-9 w-full items-stretch overflow-hidden rounded-md border bg-background">
      <button type="button" onClick={onUndo} title="Desfazer" className="flex flex-1 items-center justify-center hover:bg-muted"><Undo2 className="size-4" /></button>
      <span className="flex items-center border-x px-1.5 text-[9px] font-bold tracking-wide text-muted-foreground">AÇÕES</span>
      <button type="button" onClick={onRedo} title="Refazer" className="flex flex-1 items-center justify-center hover:bg-muted"><Redo2 className="size-4" /></button>
    </div>
  );
}

function IconeCota({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="3" y1="6" x2="3" y2="18" />
      <line x1="21" y1="6" x2="21" y2="18" />
      <line x1="3" y1="12" x2="8" y2="12" />
      <line x1="16" y1="12" x2="21" y2="12" />
      <path d="M10.5 9.5v5M12.5 9.5h2v2h-2v2h2" />
    </svg>
  );
}

const PALETA_DESENHO = [
  { nome: 'Azul', hex: '#2563eb' },
  { nome: 'Vermelho', hex: '#dc2626' },
  { nome: 'Verde', hex: '#16a34a' },
  { nome: 'Laranja', hex: '#ea580c' },
  { nome: 'Amarelo', hex: '#eab308' },
  { nome: 'Ciano', hex: '#0891b2' },
  { nome: 'Rosa', hex: '#db2777' },
  { nome: 'Roxo', hex: '#9333ea' },
  { nome: 'Preto', hex: '#000000' },
  { nome: 'Cinza', hex: '#4b5563' },
];

export default function EditorPage() {
  const { user, carregando: authCarregando, disponivel: nuvemDisponivel } = useAuth();
  // zoom/pan da PRÉVIA da planta (não afeta o PDF exportado, que lê o SVG original)
  const [plantaZoom, setPlantaZoom] = useState(1);
  const [plantaPan, setPlantaPan] = useState({ x: 0, y: 0 });
  // espelho de zoom/pan pra calcular o zoom-no-cursor sem atualizador aninhado (que o React roda 2x em dev)
  const vistaPlantaRef = useRef({ z: 1, x: 0, y: 0 });
  const [editarPlanta, setEditarPlanta] = useState(true); // planta abre já no modo edição
  const [folhaTravada, setFolhaTravada] = useState(true); // por padrão, reposicionamento da moldura travado
  const [menuContexto, setMenuContexto] = useState<{
    tipo: 'texto' | 'vertice' | 'divisa' | 'mapa' | 'objeto';
    x: number;
    y: number;
    id?: string;
    atual?: string;
    vertice?: Vertex;
    verticeIdx?: number;
    lat?: number;
    lon?: number;
    objetoTipo?: string;
  } | null>(null);
  const aviseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const plantaPanRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const [tecnico, setTecnico] = useState<TecnicoData | null>(null);
  const [escritorio, setEscritorio] = useState<EscritorioData | null>(null);
  const [vertices, setVertices] = useState<Vertex[]>([]);
  const [verticesIgnorados, setVerticesIgnorados] = useState<Vertex[]>([]); // fora do anel (ferramenta ignorar/considerar)
  const [imovel, setImovel] = useState<ImovelData>(IMOVEL_VAZIO);
  const [confrontantes, setConfrontantes] = useState<Confrontante[]>([]);
  const [confrontantePorLado, setConfrontantePorLado] = useState<Record<number, string>>({});
  // Multi-gleba: `glebas` é a lista completa (a ativa pode estar desatualizada); o estado de
  // trabalho acima (vertices/confrontantes/confrontantePorLado) é a FONTE da gleba ativa.
  // `sincronizarGlebas()` devolve a lista com a ativa atualizada a partir do estado de trabalho.
  const [glebas, setGlebas] = useState<Gleba[]>([]);
  const [glebaAtivaId, setGlebaAtivaId] = useState<string>('');
  // bloqueia trocar/criar gleba e importar enquanto uma operação assíncrona (importar/salvar)
  // está em andamento — evita corrida que jogaria dados na gleba errada.
  const [processando, setProcessando] = useState(false);
  const [zona, setZona] = useState(23);
  const [hemisferio, setHemisferio] = useState<'N' | 'S'>('S');
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [realceId, setRealceId] = useState<string | null>(null); // vértice destacado ao passar o mouse na lista
  const [modo, setModo] = useState<ModoEdicao>('navegar');
  const ignorouRef = useRef(false);       // ignorou vértice desde que entrou no modo ignorar
  const modoAntesRef = useRef<ModoEdicao>('navegar');
  const [selMulti, setSelMulti] = useState<Set<string>>(new Set()); // vértices marcados no modo "triângulo"
  const [mostrarRotulos, setMostrarRotulos] = useState(true);
  const [tamNomes, setTamNomes] = useState(11); // tamanho da fonte dos nomes dos vértices no mapa
  const [simboloSel, setSimboloSel] = useState('arvore'); // elemento cartográfico ativo (modo 'simbolo')
  const [elementosAberto, setElementosAberto] = useState(false); // popover do seletor de elementos
  const [escalaInterface, setEscalaInterface] = useState(1); // acessibilidade: escala das letras da interface
  const [snapAtivo, setSnapAtivo] = useState(false);
  const [bloqueado, setBloqueado] = useState(true); // vértices travados por padrão (protege o georref)
  const [tipoDivisaPincel, setTipoDivisaPincel] = useState<string>('estrada'); // pincel do modo "pintar divisa"
  const [corPickerAberto, setCorPickerAberto] = useState(false); // painel de ajuste rápido das cores de divisa
  const [corBump, setCorBump] = useState(0); // força re-render após trocar uma cor (cores vivem em módulo)
  const [prefs, setPrefs] = useState<PreferenciasApp>(PREFERENCIAS_PADRAO); // preferências de interface
  const [avisoReconciliarAberto, setAvisoReconciliarAberto] = useState(false);
  const [avisoReconciliarResolve, setAvisoReconciliarResolve] = useState<((v: 'exportar' | 'voltar' | 'conciliar') => void) | null>(null);
  const [explicacaoReconciliarAberta, setExplicacaoReconciliarAberta] = useState(false);
  const iconeCab = (chave: string, icone: React.ReactNode) => (prefs.iconesCabecalhoOcultos.includes(chave) ? null : icone);
  const [termosOk, setTermosOk] = useState(true); // aceite dos termos de uso
  const [termosModalAberto, setTermosModalAberto] = useState(false); // abre ao CRIAR projeto (não na 1ª abertura)
  const acaoAposTermos = useRef<null | (() => void)>(null);
  const [setupOk, setSetupOk] = useState(true); // primeiro acesso: cadastro de empresa/autônomo
  const [planilhaConfAberta, setPlanilhaConfAberta] = useState(false); // conferência da planilha SIGEF
  const [masterAberto, setMasterAberto] = useState(false); // painel do titular (só master)
  const [confrontantePincelId, setConfrontantePincelId] = useState<string>(''); // pincel do modo "pintar confrontantes"
  const [pincelInicioId, setPincelInicioId] = useState<string | null>(null); // início do trecho selecionado para pintura de divisa/confrontante
  // barra de ferramentas (esquerda, fixa, largura redimensionável e salva por usuário)
  const [toolW, setToolW] = useState(340); // largura confortável pra não espremer os rótulos dos botões
  const toolDrag = useRef(false);
  const [centralizarSig, setCentralizarSig] = useState(0); // incrementa para enquadrar o desenho
  // largura do painel da direita (redimensionável, salva por usuário)
  const [asideW, setAsideW] = useState(380);
  const asideDrag = useRef(false);
  const [painelAberto, setPainelAberto] = useState(false); // painel direito recolhido; abre ao passar o mouse
  const painelWrap = useRef<HTMLDivElement>(null);
  const painelMouseDentro = useRef(false);
  // camada de desenho livre (objetos da gleba ativa)
  const [objetos, setObjetos] = useState<ObjetoDesenho[]>([]);
  const [desenhoBuffer, setDesenhoBuffer] = useState<PontoLL[]>([]);
  const [objetoSelId, setObjetoSelId] = useState<string | null>(null);
  const [vSplitInicioId, setVSplitInicioId] = useState<string | null>(null);
  const [vSplitFimId, setVSplitFimId] = useState<string | null>(null);
  const [areaAlvoHa, setAreaAlvoHa] = useState(''); // divisão por área alvo (ha)
  const [focoLatLng, setFocoLatLng] = useState<[number, number] | null>(null);
  const [dragVtxIdx, setDragVtxIdx] = useState<number | null>(null);
  const [situacaoUrl, setSituacaoUrl] = useState<string | undefined>(undefined);
  // referências (confrontantes certificados importados de GeoJSON) — desenho + alvos de snap
  const [referencias, setReferencias] = useState<{ lat: number; lon: number; leste: number; norte: number }[][]>([]);
  const [parcelasCert, setParcelasCert] = useState<{ anel: [number, number][]; info: { titulo: string; linhas: string[] } }[]>([]);
  // vértices de imóveis vizinhos já certificados (importados do Distribuidor de Coordenadas): ficam
  // guardados no projeto para reaproveitar coordenada/sigma/nome na planta e servir de alvo de encaixe
  const [verticesVizinho, setVerticesVizinho] = useState<VerticeVizinho[]>([]);
  const [parcelaSel, setParcelaSel] = useState<number | null>(null); // parcela INCRA selecionada (painel)
  const [mostrarCert, setMostrarCert] = useState(true);              // liga/desliga a camada de parcelas
  const [opacidadeCert, setOpacidadeCert] = useState(0.06);          // opacidade do preenchimento
  const conflitos = useMemo(() => detectarConflitosDivisas(vertices, referencias), [vertices, referencias]);
  const [tema, setTema] = useState<'claro' | 'escuro'>('escuro');
  const [temaCarregadoDaNuvem, setTemaCarregadoDaNuvem] = useState(false);
  const [planilhaAberta, setPlanilhaAberta] = useState(false);
  const [contadorSugerido, setContadorSugerido] = useState<Contadores | null>(null);
  const [importModalAberto, setImportModalAberto] = useState(false);
  const [importPendingFile, setImportPendingFile] = useState<File | null>(null);
  const [vista, setVista] = useState<'mapa' | 'planta'>('mapa');
  const [aba, setAba] = useState<Aba>('imovel');
  const [projetoId, setProjetoId] = useState<string | null>(null);
  const [nomeProjeto, setNomeProjeto] = useState('');
  const [nomeProjetoManual, setNomeProjetoManual] = useState(false);
  const [reqAberto, setReqAberto] = useState(false);
  const [modalSobreposicaoAberto, setModalSobreposicaoAberto] = useState(false);
  const [trtAberto, setTrtAberto] = useState(false);
  const [calcAberta, setCalcAberta] = useState(false);
  const [vvAberto, setVvAberto] = useState(false);
  const [vvBase, setVvBase] = useState<{ leste: number; norte: number; elevacao?: number } | null>(null);
  const [dxfEditorAberto, setDxfEditorAberto] = useState(false);
  const [porcentagemAberta, setPorcentagemAberta] = useState(false);
  const [estudioAberto, setEstudioAberto] = useState(false);
  const [confEditId, setConfEditId] = useState<string | null>(null);

  const [posBarra, setPosBarra] = useState(() => {
    if (typeof window !== 'undefined') {
      const salva = localStorage.getItem('metrica:pos_barra_flutuante');
      if (salva) {
        try {
          const p = JSON.parse(salva);
          if (typeof p.x === 'number' && typeof p.y === 'number') {
            return p;
          }
        } catch (_) {}
      }
    }
    return { x: 80, y: 12 };
  });

  const [arrastandoBarra, setArrastandoBarra] = useState<{
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
  } | null>(null);

  useEffect(() => {
    if (!arrastandoBarra) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - arrastandoBarra.startX;
      const dy = e.clientY - arrastandoBarra.startY;
      const novoX = Math.max(10, Math.min(window.innerWidth - 120, arrastandoBarra.startPosX + dx));
      const novoY = Math.max(5, Math.min(window.innerHeight - 50, arrastandoBarra.startPosY + dy));
      setPosBarra({ x: novoX, y: novoY });
    };

    const handleMouseUp = () => {
      localStorage.setItem('metrica:pos_barra_flutuante', JSON.stringify(posBarra));
      setArrastandoBarra(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [arrastandoBarra, posBarra]);

  const [plantaDark, setPlantaDark] = useState(true); // modo escuro só da folha A3 (conforto noturno)
  // progresso por etapa (ações do usuário que não se completam sozinhas)
  const [sigefStatus, setSigefStatus] = useState<'idle' | 'clicado' | 'enviado'>('idle');
  const [baixou, setBaixou] = useState<{ memorial?: boolean; ods?: boolean; planta?: boolean; req?: boolean; errata?: boolean }>({});
  const [salvoOk, setSalvoOk] = useState(false);
  const [salvoNuvem, setSalvoNuvem] = useState(false); // verde só quando gravou no banco (nuvem); amarelo se só local
  const [salvarLaranja, setSalvarLaranja] = useState(false); // disquete laranja: há mudança não salva há >1s
  const ultimoSalvoSig = useRef<string>('');
  const acabouDeSalvar = useRef(false);
  const [errataAberto, setErrataAberto] = useState(false);
  const [prevMemorialAberto, setPrevMemorialAberto] = useState(false);
  const [prevMemorialModo, setPrevMemorialModo] = useState<'normal' | 'servidao'>('normal');
  const [consultarAberto, setConsultarAberto] = useState(false);
  const [iaAberta, setIaAberta] = useState(false);
  // arquivo já anexado que a IA vai ler (quando a extração parte de um documento guardado)
  const [iaArquivoInicial, setIaArquivoInicial] = useState<{ data: string; mimeType: string; nome: string } | null>(null);
  // quando a extração parte de um documento de confrontante, guarda para quem aplicar (senão é o imóvel)
  const [iaConfrontanteId, setIaConfrontanteId] = useState<string | null>(null);
  function abrirExtracao(a: ArquivoProjeto, confrontanteId: string | null) {
    const r = new FileReader();
    r.onloadend = () => {
      setIaConfrontanteId(confrontanteId);
      setIaArquivoInicial({ data: String(r.result), mimeType: a.tipo, nome: a.nome });
      setIaAberta(true);
    };
    r.readAsDataURL(a.blob);
  }
  // Abre a extração por IA já carregando um documento anexado do imóvel.
  function extrairDocumento(a: ArquivoProjeto) { abrirExtracao(a, null); }
  // Idem, mirando um confrontante específico (os dados extraídos preenchem aquele confrontante).
  function extrairDocumentoConfrontante(a: ArquivoProjeto, confrontanteId: string) { abrirExtracao(a, confrontanteId); }
  const [carAberto, setCarAberto] = useState(false);
  const [configAberta, setConfigAberta] = useState(false);
  const [configAba, setConfigAba] = useState<'pessoal' | 'escritorio' | 'numeracao' | 'modelos' | undefined>(undefined);
  const [gestaoAberta, setGestaoAberta] = useState(false);
  const [precoSugAberto, setPrecoSugAberto] = useState(false);
  const [tutorialAberto, setTutorialAberto] = useState(false);
  const [assinaturaAberta, setAssinaturaAberta] = useState(false);
  // A CHAVE do app: 'simples' (tela enxuta, ideal pra aprender) x 'completo' (tudo à mostra).
  // Novo usuário começa no simples. Fica salvo nas preferências e vale no app inteiro.
  const [modoApp, setModoApp] = useState<'simples' | 'completo'>('simples');
  const [tempoCompletoMs, setTempoCompletoMs] = useState(0);
  const [introTocando, setIntroTocando] = useState(() => {
    if (typeof window === 'undefined') return false;
    return carregarPreferencias().introVideoAtiva;
  }); // enquanto a abertura roda, escondemos a chave de modo
  useEffect(() => { try { const p = carregarPreferencias(); setModoApp(p.modo); setTempoCompletoMs(p.tempoCompletoMs || 0); } catch { /* ignore */ } }, []);
  useEffect(() => {
    const h = (e: Event) => setIntroTocando(!!(e as CustomEvent<boolean>).detail);
    window.addEventListener('souzacad:intro', h);
    return () => window.removeEventListener('souzacad:intro', h);
  }, []);
  function trocarModoApp(m: 'simples' | 'completo') { setModoApp(m); try { salvarModo(m); } catch { /* ignore */ } }
  const completo = modoApp === 'completo';
  // Enquanto está no Completo, acumula tempo de uso (resolução de 1 min). Passou de 5 h, a chave
  // do topo some pra deixar a tela limpa — voltar ao Simples fica só nas Configurações.
  useEffect(() => {
    if (modoApp !== 'completo') return;
    const t = setInterval(() => { try { setTempoCompletoMs(registrarTempoCompleto(60000)); } catch { /* ignore */ } }, 60000);
    return () => clearInterval(t);
  }, [modoApp]);
  // No Simples a chave sempre aparece (pra poder subir pro Completo). No Completo ela só some depois
  // de 5 h acumuladas — antes disso ainda dá pra voltar fácil pelo topo.
  const chaveTopoVisivel = modoApp === 'simples' || tempoCompletoMs < LIMITE_MODO_FIXO_MS;
  // primeira vez neste navegador: abre o tutorial sozinho (independe de login/rascunho).
  useEffect(() => { if (!tutorialJaVisto()) setTutorialAberto(true); }, []);
  function fecharTutorial(o: boolean) { setTutorialAberto(o); if (!o) marcarTutorialVisto(); }
  const [infoAberto, setInfoAberto] = useState(false);
  const [pontosAberto, setPontosAberto] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [situacaoVersSnapshot, setSituacaoVersSnapshot] = useState<string>('');
  const rascunhoRestaurado = useRef(false); // garante restaurar o rascunho só uma vez
  const [requerente, setRequerente] = useState<PessoaQualificada | undefined>(undefined);
  const [transmitente, setTransmitente] = useState<PessoaQualificada | undefined>(undefined);
  const [tipoAto, setTipoAto] = useState<TipoAtoRequerimento>('venda');
  const [partesAdicionais, setPartesAdicionais] = useState<PessoaQualificada[]>([]);
  const [ocultarCobranca, setOcultarCobranca] = useState(false);
  useEffect(() => {
    carregarConfigAssinatura().then((c) => setOcultarCobranca(!!c.ocultarCobranca)).catch(() => {});
  }, [user]);
  const [plantaConfig, setPlantaConfig] = useState<PlantaConfig>({});
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [sugProp, setSugProp] = useState<ProprietarioCad[]>([]);
  const [sugConf, setSugConf] = useState<ConfrontanteCad[]>([]);
  const [sugCns, setSugCns] = useState<string[]>([]);
  const [sugCartorios, setSugCartorios] = useState<CartorioCad[]>([]);
  const [totalPontos, setTotalPontos] = useState(0);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [corCabecalho, setCorCabecalho] = useState('cinza');
  const [mostrandoCoresHeader, setMostrandoCoresHeader] = useState(false);
  const [mostrarEscalaToast, setMostrarEscalaToast] = useState(false);
  const scaleTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('metrica.corCabecalho');
      if (saved) setCorCabecalho(saved);
    } catch { /* ignore */ }
  }, []);

  const salvarCorCabecalho = (cor: string) => {
    setCorCabecalho(cor);
    try {
      localStorage.setItem('metrica.corCabecalho', cor);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    setMostrarEscalaToast(true);
    if (scaleTimerRef.current) clearTimeout(scaleTimerRef.current);
    scaleTimerRef.current = setTimeout(() => {
      setMostrarEscalaToast(false);
    }, 1500);
    return () => {
      if (scaleTimerRef.current) clearTimeout(scaleTimerRef.current);
    };
  }, [plantaConfig.escalaManual]);

  const themeCabecalho = CORES_CABECALHO.find((c) => c.id === corCabecalho) ?? CORES_CABECALHO[0];
  const dxfRef = useRef<HTMLInputElement>(null);
  const geojsonRef = useRef<HTMLInputElement>(null);
  const shapefileRef = useRef<HTMLInputElement>(null);
  const vizinhosRef = useRef<HTMLInputElement>(null);
  const verticesVizinhoRef = useRef<HTMLInputElement>(null);
  const jsonBackupRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTecnico(carregarTecnico());
    setEscritorio(carregarEscritorio());
    cadProp.listar().then(setSugProp).catch(() => {});
    cadConf.listar().then(setSugConf).catch(() => {});
    cadCart.listar().then((cs) => { setSugCns(cs.map((c) => c.cns).filter(Boolean)); setSugCartorios(cs); }).catch(() => {});
    totalPontosRegistrados().then(setTotalPontos).catch(() => {});
    const t = (localStorage.getItem('metrica.tema') as 'claro' | 'escuro') || 'escuro';
    setTema(t);
    setPlantaConfig(carregarPlantaPadrao()); // ajustes-padrão da planta (trabalhos futuros)
    iniciarCoresDivisa(); // aplica as cores de divisa personalizadas do projetista
    setPrefs(carregarPreferencias()); // preferências de interface (ícones do cabeçalho etc.)
    // termos de uso: bloqueia até aceitar (checa local, depois nuvem)
    if (termosAceitosLocal()) setTermosOk(true);
    else { setTermosOk(false); termosAceitosNuvem().then((ok) => { if (ok) setTermosOk(true); }).catch(() => {}); }
    // primeiro acesso: só pede cadastro pra quem não é o titular e ainda não configurou
    try { setSetupOk(souMaster() || localStorage.getItem('metrica.setupFeito') === '1'); } catch { setSetupOk(true); }
    // registra/atualiza o perfil de uso (o titular acompanha empresa, RT, projetos)
    const esc = carregarEscritorio(); const tec = carregarTecnico();
    sincronizarPerfil({ ultimoAcessoEm: Date.now(), empresaNome: esc.nome, empresaCnpj: esc.cnpj, rtNome: tec.nome, rtCft: tec.cft }).catch(() => {});
    try { const w = Number(localStorage.getItem('metrica.toolW')); if (w >= 52 && w <= 480) setToolW(w); } catch { /* ignore */ }
    try { const n = Number(localStorage.getItem('metrica.tamNomes')); if (n >= 7 && n <= 22) setTamNomes(n); } catch { /* ignore */ }
    // tamanho do texto da interface: fonte única = preferência (Configurações › Comportamento › Aparência)
    try { const s = carregarPreferencias().escalaFonte; if (s >= 0.8 && s <= 1.6) setEscalaInterface(s); } catch { /* ignore */ }
    try { const w = Number(localStorage.getItem('metrica.asideW')); if (w >= 300 && w <= 680) setAsideW(w); } catch { /* ignore */ }
    // começa com uma gleba
    const g = glebaDe(1, [], [], {}, 'Parcela 1');
    setGlebas([g]);
    setGlebaAtivaId(g.id);
  }, []);

  // 1. Ao logar, carrega o tema da nuvem primeiro e sincroniza dados locais offline
  useEffect(() => {
    if (user?.uid) {
      setTemaCarregadoDaNuvem(false);
      carregarTemaUsuario(user.uid).then((t) => {
        if (t === 'claro' || t === 'escuro') {
          setTema(t);
        }
        setTemaCarregadoDaNuvem(true);
      }).catch(() => {
        setTemaCarregadoDaNuvem(true);
      });

      // Cadastro do RT/escritório é POR CONTA (multi-empresa): puxa da nuvem, atualiza a tela e
      // decide se ainda precisa do primeiro acesso. Se a conta for nova, o cache local é resetado
      // (em branco), então um usuário nunca herda o cadastro de outro no mesmo navegador.
      puxarConfigDaNuvem().then((configurado) => {
        setTecnico(carregarTecnico());
        setEscritorio(carregarEscritorio());
        setSetupOk(souMaster() || configurado);
      }).catch(() => {});

      // Sincroniza dados locais (salvos enquanto offline/sem permissão) com a nuvem
      sincronizarProjetosLocalParaNuvem().then(() => {
        atualizarLista();
      }).catch(() => {});
      sincronizarCadastrosLocalParaNuvem().then(() => {
        cadProp.listar().then(setSugProp).catch(() => {});
        cadConf.listar().then(setSugConf).catch(() => {});
        cadCart.listar().then((cs) => { setSugCns(cs.map((c) => c.cns).filter(Boolean)); setSugCartorios(cs); }).catch(() => {});
      }).catch(() => {});
    } else if (!authCarregando) {
      // Auth já resolveu e não há usuário logado (modo local): pode liberar a restauração do
      // rascunho na chave 'local'. Enquanto a auth ainda carrega, NÃO liberamos — senão a tela
      // restauraria cedo demais a chave errada e o trabalho salvo sob o uid se perderia.
      limparConfigLocalNaSaida();
      setTecnico(carregarTecnico());
      setEscritorio(carregarEscritorio());
      setTemaCarregadoDaNuvem(true);
    }
  }, [user, authCarregando]);

  // Limpar o primeiro clique de pintura ao mudar de modo de pintura ou pincel
  useEffect(() => {
    setPincelInicioId(null);
  }, [modo, confrontantePincelId, tipoDivisaPincel]);

  // Listener para sincronizar automaticamente quando o computador recuperar conexão de internet
  useEffect(() => {
    if (!user?.uid) return;
    function aoVoltarOnline() {
      sincronizarProjetosLocalParaNuvem().then(() => {
        atualizarLista();
      }).catch(() => {});
      sincronizarCadastrosLocalParaNuvem().then(() => {
        cadProp.listar().then(setSugProp).catch(() => {});
        cadConf.listar().then(setSugConf).catch(() => {});
        cadCart.listar().then((cs) => { setSugCns(cs.map((c) => c.cns).filter(Boolean)); setSugCartorios(cs); }).catch(() => {});
      }).catch(() => {});
    }
    window.addEventListener('online', aoVoltarOnline);
    return () => window.removeEventListener('online', aoVoltarOnline);
  }, [user]);

  // 2. Aplica localmente e salva na nuvem apenas após carregar para evitar sobrescrever dados do Firestore
  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'escuro');
    try { localStorage.setItem('metrica.tema', tema); } catch { /* ignore */ }
    if (user?.uid && temaCarregadoDaNuvem) {
      salvarTemaUsuario(user.uid, tema);
    }
  }, [tema, user, temaCarregadoDaNuvem]);

  // restaura o rascunho UMA vez, quando a autenticação já resolveu (para usar a chave do usuário certo)
  useEffect(() => {
    if (rascunhoRestaurado.current || !temaCarregadoDaNuvem) return;
    rascunhoRestaurado.current = true;
    try {
      if (new URLSearchParams(window.location.search).get('projetoId')) return; // abrindo projeto específico
      const raw = localStorage.getItem(rascunhoKey());
      if (raw && aplicarRascunho(JSON.parse(raw))) aviso('Trabalho anterior restaurado automaticamente.');
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temaCarregadoDaNuvem]);

  // aplica a fila "Inserir no projeto" vinda da tela de Dados (após restaurar o rascunho)
  const filaInserirAplicada = useRef(false);
  useEffect(() => {
    if (filaInserirAplicada.current || !temaCarregadoDaNuvem) return;
    filaInserirAplicada.current = true;
    try {
      // Chave com o uid: evita que a fila de um usuário seja aplicada na conta de outro que
      // logue depois no mesmo navegador (mesmo esquema de metrica.rascunho:${uid}).
      const chave = `metrica.filaInserir:${user?.uid ?? 'local'}`;
      const raw = localStorage.getItem(chave);
      if (!raw) return;
      localStorage.removeItem(chave);
      const fila = JSON.parse(raw) as { tipo: string; item: ProprietarioCad & ConfrontanteCad & ImovelCad & CartorioCad }[];
      for (const f of fila) {
        if (f.tipo === 'prop') inserirPropConsulta(f.item);
        else if (f.tipo === 'conf') inserirConfConsulta(f.item);
        else if (f.tipo === 'imovel') inserirImovelConsulta(f.item);
        else if (f.tipo === 'cartorio') inserirCartorioConsulta(f.item);
      }
      if (fila.length) aviso(`${fila.length} cadastro(s) inserido(s) no projeto.`);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temaCarregadoDaNuvem]);

  // salva o rascunho automaticamente (com atraso), depois de já ter restaurado
  useEffect(() => {
    if (!rascunhoRestaurado.current) return;
    const t = setTimeout(() => {
      try {
        if (!temConteudoTrabalho()) { localStorage.removeItem(rascunhoKey()); return; }
        localStorage.setItem(rascunhoKey(), JSON.stringify(montarRascunho()));
      } catch { /* cota cheia/indisponível — ignora */ }
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vertices, confrontantes, confrontantePorLado, objetos, glebas, imovel, zona, hemisferio, requerente, transmitente, plantaConfig, nomeProjeto, projetoId, glebaAtivaId]);

  // salva posição/altura da barra de ferramentas
  useEffect(() => { try { localStorage.setItem('metrica.toolW', String(toolW)); } catch { /* ignore */ } }, [toolW]);
  useEffect(() => { try { localStorage.setItem('metrica.tamNomes', String(tamNomes)); } catch { /* ignore */ } }, [tamNomes]);
  // acessibilidade: escala das letras da interface (afeta o app inteiro; textos em rem crescem)
  useEffect(() => {
    document.documentElement.style.fontSize = `${(16 * escalaInterface).toFixed(1)}px`;
  }, [escalaInterface]);
  // as Configurações mudam o tamanho do texto pela preferência e avisam por evento; mantém em sincronia
  useEffect(() => {
    const h = (e: Event) => { const v = (e as CustomEvent<number>).detail; if (typeof v === 'number') setEscalaInterface(v); };
    window.addEventListener('souzacad:escala-fonte', h);
    return () => window.removeEventListener('souzacad:escala-fonte', h);
  }, []);
  useEffect(() => { try { localStorage.setItem('metrica.asideW', String(asideW)); } catch { /* ignore */ } }, [asideW]);
  // ao SAIR do modo "ignorar" tendo ignorado algum vértice, oferece renumerar o polígono novo
  useEffect(() => {
    const antes = modoAntesRef.current;
    modoAntesRef.current = modo;
    if (antes === 'ignorar' && modo !== 'ignorar' && ignorouRef.current) {
      ignorouRef.current = false;
      (async () => {
        const ok = await confirmar({
          titulo: 'Renomear os vértices?',
          mensagem: 'Você ignorou vértices e o polígono mudou. Deseja renumerar os vértices automaticamente para a nova configuração?',
          okLabel: 'Sim, renumerar', cancelLabel: 'Manter como está',
        });
        if (ok) await renumerar();
      })();
    }
  }, [modo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Avisa sobre alterações não salvas antes de fechar ou recarregar a página e salva rascunho preventivo
  useEffect(() => {
    function aoSair(e: BeforeUnloadEvent) {
      try {
        if (temConteudoTrabalho()) {
          localStorage.setItem(rascunhoKey(), JSON.stringify(montarRascunho()));
        }
      } catch { /* ignore */ }

      if (salvarLaranja) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', aoSair);
    return () => window.removeEventListener('beforeunload', aoSair);
  }, [salvarLaranja, vertices, confrontantes, confrontantePorLado, objetos, glebas, imovel, zona, hemisferio, requerente, transmitente, plantaConfig, nomeProjeto, projetoId, glebaAtivaId]);

  // Auto-ajusta e centraliza a folha A3 sempre que a aba Planta é aberta, redimensionada ou as larguras dos painéis mudam
  useEffect(() => {
    if (vista === 'planta') {
      const t = setTimeout(ajustarPlanta, 100);
      return () => clearTimeout(t);
    }
  }, [vista, toolW, asideW]);

  useEffect(() => {
    if (vista === 'planta') {
      const handleResize = () => ajustarPlanta();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [vista]);

  // Na PRIMEIRA vez que a planta é aberta já existindo ao menos um polígono (3+ vértices),
  // gera a planta de situação sozinha (recorte de satélite). Dispara uma única vez por projeto
  // e nunca por cima de uma situação que já exista — o agrimensor segue podendo refazer ou
  // remover pela câmera. Falha em silêncio se a rede/satélite não responder.
  const situacaoAutoRef = useRef(false);
  useEffect(() => { situacaoAutoRef.current = false; }, [projetoId]);
  useEffect(() => {
    if (vista !== 'planta' || situacaoAutoRef.current || situacaoUrl) return;
    if (vertices.length < 3) return;
    situacaoAutoRef.current = true;
    gerarSituacaoPlanta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, situacaoUrl, vertices.length]);

  // Atualiza automaticamente o nome do projeto se não foi modificado manualmente
  useEffect(() => {
    if (!nomeProjetoManual && imovel) {
      const auto = gerarTituloAutomatico(imovel);
      if (auto) {
        setNomeProjeto(auto);
      }
    }
  }, [imovel, nomeProjetoManual]);

  // atalhos remapeados em ordem crescente
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      const k = e.key;
      if (k === 'F1') { e.preventDefault(); setModo('navegar'); } // MOVER / EDITAR
      else if (k === 'F2') { e.preventDefault(); setModo('navegar'); }
      else if (k === 'F3') { e.preventDefault(); setSnapAtivo((s) => !s); }
      else if (k === 'F4') { e.preventDefault(); setMostrarRotulos((m) => !m); }
      else if (k === 'F5') { e.preventDefault(); setBloqueado((b) => !b); }
      else if (k === 'F6') { e.preventDefault(); setModo('linha'); setDesenhoBuffer([]); }
      else if (k === 'F7') { e.preventDefault(); setModo('polilinha'); setDesenhoBuffer([]); }
      else if (k === 'F8') { e.preventDefault(); setModo('tracejado'); setDesenhoBuffer([]); }
      else if (k === 'F9') { e.preventDefault(); setModo('texto'); }
      else if (k === 'F10') { e.preventDefault(); setModo('cota'); setDesenhoBuffer([]); }
      else if (k === 'F11') { e.preventDefault(); setVista('mapa'); setModo((m) => (m === 'considerar' ? 'navegar' : 'considerar')); }
      else if (k === 'F12') { e.preventDefault(); setVista('mapa'); setModo((m) => (m === 'ignorar' ? 'navegar' : 'ignorar')); }
      else if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'z') {
        e.preventDefault();
        desfazer();
      }
      else if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'y') {
        e.preventDefault();
        refazer();
      }
      else if ((k === 'Delete' || k === 'Backspace') && modo === 'multi') {
        e.preventDefault();
        apagarMultiSelecionados();
      }
      else if (k === 'Escape') {
        if (modo === 'multi' && selMulti.size > 0) { e.preventDefault(); setSelMulti(new Set()); }
        else if (modo === 'linha' || modo === 'polilinha' || modo === 'tracejado' || modo === 'cota' || modo === 'texto' || modo === 'medir') {
          e.preventDefault();
          cancelarDesenho();
          setModo('navegar');
        }
        // sem desenho pra cancelar: Esc alterna entre mapa e planta
        else { e.preventDefault(); setVista((v) => (v === 'mapa' ? 'planta' : 'mapa')); }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, desenhoBuffer, selMulti, vertices, confrontantePorLado, desfazer, refazer]);

  // ao sair do modo "triângulo", esvazia a seleção múltipla
  useEffect(() => { if (modo !== 'multi') setSelMulti((s) => (s.size ? new Set() : s)); }, [modo]);

  const res = useMemo(() => (vertices.length >= 3 ? calcular(vertices, confrontantePorLado) : null), [vertices, confrontantePorLado]);

  // resumo de área/perímetro de TODAS as glebas do desenho (para o "Quadro de áreas" da planta).
  // A gleba ativa usa os vértices em edição; as demais, os vértices salvos na própria gleba.
  const resumoGlebas = useMemo(() => {
    const lista = glebas.length ? glebas : [];
    return lista.map((g, i) => {
      const vs = g.id === glebaAtivaId ? vertices : g.vertices;
      if (vs.length < 3) return { nome: g.denominacao || `Parcela ${i + 1}`, areaHa: 0, perimetro: 0 };
      const r = calcular(vs, {});
      return { nome: g.denominacao || `Parcela ${i + 1}`, areaHa: r.areaHa, perimetro: r.perimetro };
    }).filter((g) => g.areaHa > 0);
  }, [glebas, glebaAtivaId, vertices]);

  // assinatura do conteúdo do projeto, para acender o disquete laranja quando há mudança não salva
  const projSig = useMemo(
    () => JSON.stringify({ v: vertices, i: imovel, c: confrontantes, cpl: confrontantePorLado, o: objetos, pc: plantaConfig, g: glebas.map((g) => g.id), vv: verticesVizinho, ig: verticesIgnorados, np: nomeProjeto, rq: requerente, tr: transmitente, ta: tipoAto, pa: partesAdicionais }),
    [vertices, imovel, confrontantes, confrontantePorLado, objetos, plantaConfig, glebas, verticesVizinho, verticesIgnorados, nomeProjeto, requerente, transmitente, tipoAto, partesAdicionais],
  );
  useEffect(() => {
    // o salvar muda os vértices (códigos); adota essa mudança imediata como "salva"
    if (acabouDeSalvar.current) { acabouDeSalvar.current = false; ultimoSalvoSig.current = projSig; setSalvarLaranja(false); return; }
    if (projSig === ultimoSalvoSig.current) { setSalvarLaranja(false); return; }
    setSalvoOk(false);
    const t = setTimeout(() => setSalvarLaranja(true), 1000);
    return () => clearTimeout(t);
  }, [projSig]);

  function aviso(t: string) {
    setMsg(t);
    if (aviseTimerRef.current) clearTimeout(aviseTimerRef.current);
    aviseTimerRef.current = setTimeout(() => setMsg(''), 4000);
  }

  // ---------- desfazer / refazer (histórico de vértices + trechos de confrontante) ----------
  const histRef = useRef<{ v: Vertex[]; cpl: Record<number, string> }[]>([]);
  const redoRef = useRef<{ v: Vertex[]; cpl: Record<number, string> }[]>([]);
  function snap() {
    histRef.current.push({ v: vertices, cpl: confrontantePorLado });
    if (histRef.current.length > 60) histRef.current.shift();
    redoRef.current = []; // uma ação nova invalida o que havia para refazer
  }
  function desfazer() {
    const s = histRef.current.pop();
    if (!s) { aviso('Nada para desfazer.'); return; }
    redoRef.current.push({ v: vertices, cpl: confrontantePorLado });
    setVertices(s.v);
    setConfrontantePorLado(s.cpl);
    aviso('Última ação desfeita.');
  }
  function refazer() {
    const s = redoRef.current.pop();
    if (!s) { aviso('Nada para refazer.'); return; }
    histRef.current.push({ v: vertices, cpl: confrontantePorLado });
    setVertices(s.v);
    setConfrontantePorLado(s.cpl);
    aviso('Ação refeita.');
  }

  // redimensionar a barra de ferramentas (largura, arrastando a borda direita)
  function toolDown(e: ReactPointerEvent) { toolDrag.current = true; try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* ignore */ } }
  function toolMove(e: ReactPointerEvent) { if (toolDrag.current) setToolW(Math.min(480, Math.max(52, e.clientX))); }
  function toolUp(e: ReactPointerEvent) { toolDrag.current = false; try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ } }

  // centraliza/enquadra o desenho atual no mapa
  function centralizar() { setCentralizarSig((n) => n + 1); }

  // zoom/pan da prévia da planta (aproxima na posição do cursor do mouse).
  // Calcula tudo a partir do espelho (ref) e aplica UMA vez — sem atualizador aninhado, que o React
  // roda 2x em dev e dobrava o deslocamento (dava a impressão de a planta escorregar de lado).
  function onPlantaWheel(e: ReactWheelEvent) {
    if (e.ctrlKey) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const { z, x: px, y: py } = vistaPlantaRef.current;
    const nextZ = Math.min(6, Math.max(0.3, +(z * (e.deltaY < 0 ? 1.12 : 0.89)).toFixed(3)));
    const factor = nextZ / z;
    const nextX = +(mx - (mx - px) * factor).toFixed(1);
    const nextY = +(my - (my - py) * factor).toFixed(1);
    vistaPlantaRef.current = { z: nextZ, x: nextX, y: nextY };
    setPlantaZoom(nextZ);
    setPlantaPan({ x: nextX, y: nextY });
  }
  function plantaPanDown(e: ReactPointerEvent) { plantaPanRef.current = { px: e.clientX, py: e.clientY, ox: plantaPan.x, oy: plantaPan.y }; try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* ignore */ } }
  function plantaPanMove(e: ReactPointerEvent) { const d = plantaPanRef.current; if (d) { const nx = d.ox + (e.clientX - d.px), ny = d.oy + (e.clientY - d.py); vistaPlantaRef.current = { ...vistaPlantaRef.current, x: nx, y: ny }; setPlantaPan({ x: nx, y: ny }); } }
  function plantaPanUp(e: ReactPointerEvent) { plantaPanRef.current = null; try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ } }
  function ajustarPlanta() {
    const el = document.getElementById('planta-print');
    if (el) {
      const rect = el.getBoundingClientRect();
      const pad = 6; // margem pequena; a folha ocupa quase toda a área
      // maior escala que ainda mostra a folha A3 (1587x1123) inteira, centralizada
      const scale = Math.min((rect.width - pad * 2) / 1587, (rect.height - pad * 2) / 1123);
      const px = (rect.width - 1587 * scale) / 2;
      const py = (rect.height - 1123 * scale) / 2;
      setPlantaZoom(scale);
      setPlantaPan({ x: px, y: py });
      vistaPlantaRef.current = { z: scale, x: px, y: py };
    } else {
      setPlantaZoom(1);
      setPlantaPan({ x: 0, y: 0 });
      vistaPlantaRef.current = { z: 1, x: 0, y: 0 };
    }
    // NÃO zera offsetX/offsetY aqui: isso é a posição da folha em relação ao polígono, ajustada
    // à mão pelo usuário e salva no projeto. Antes, o auto-ajuste ao abrir a Planta apagava essa
    // posição toda vez. O enquadramento acima é só da tela (zoom/pan da viewport), não da folha.
  }
  // reposiciona a folha A3 em relação ao polígono (que é georreferenciado e fixo)
  function moverFolhaPlanta(dx: number, dy: number) {
    setPlantaConfig((c) => ({ ...c, offsetX: +(((c.offsetX ?? 0) + dx).toFixed(1)), offsetY: +(((c.offsetY ?? 0) + dy).toFixed(1)) }));
  }
  // reposiciona um texto na planta A3 por id (salva o deslocamento dx/dy em pixel)
  function moverTextoPlanta(id: string, dx: number, dy: number) {
    snap();
    setPlantaConfig((c) => ({
      ...c,
      textos: {
        ...(c.textos ?? {}),
        [id]: { ...(c.textos?.[id] ?? {}), dx: +dx.toFixed(1), dy: +dy.toFixed(1) }
      }
    }));
  }

  // ---- edição de textos da planta (conteúdo/escala/negrito por id) ----
  function patchTextoPlanta(id: string, patch: { texto?: string; escala?: number; negrito?: boolean; dx?: number; dy?: number; larguraChars?: number }) {
    snap();
    setPlantaConfig((c) => ({ ...c, textos: { ...(c.textos ?? {}), [id]: { ...(c.textos?.[id] ?? {}), ...patch } } }));
  }
  function editarTextoPlanta(id: string, novoTexto: string, larguraChars?: number) {
    if (id.startsWith('vert.')) {
      const vId = id.slice(5);
      snap();
      setVertices((vs) => vs.map((v) => (v.id === vId ? { ...v, codigoSigef: novoTexto } : v)));
    } else {
      patchTextoPlanta(id, { texto: novoTexto, larguraChars });
    }
  }
  function restaurarTextoPlanta(id: string) {
    setPlantaConfig((c) => { const m = { ...(c.textos ?? {}) }; delete m[id]; return { ...c, textos: m }; });
  }
  // Botão direito na rosa dos ventos / barra de escala / diagrama: cicla o estilo e já grava como
  // PADRÃO dos próximos projetos do usuário (planta padrão).
  function ciclarEstiloPlanta(campo: 'estiloRosa' | 'estiloEscala' | 'estiloDiagrama', total: number) {
    const prox = (((plantaConfig[campo] as number | undefined) ?? 0) + 1) % total;
    setPlantaConfig((c) => ({ ...c, [campo]: prox }));
    try { salvarPlantaPadrao({ ...carregarPlantaPadrao(), [campo]: prox }); } catch { /* ignore */ }
    aviso('Estilo trocado e salvo como padrão dos próximos projetos.');
  }
  const escTextoAtual = (id: string) => plantaConfig.textos?.[id]?.escala ?? 1;

  // redimensionar o painel da direita
  function asideDown(e: ReactPointerEvent) { asideDrag.current = true; try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* ignore */ } }
  function asideMove(e: ReactPointerEvent) { if (asideDrag.current) setAsideW(Math.min(680, Math.max(300, window.innerWidth - e.clientX))); }
  function asideUp(e: ReactPointerEvent) { asideDrag.current = false; try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ } }

  // ---------- glebas ----------
  // Devolve a lista completa de glebas com a ativa atualizada a partir do estado de trabalho.
  function sincronizarGlebas(): Gleba[] {
    if (!glebas.length) {
      return [{ ...glebaDe(1, vertices, confrontantes, confrontantePorLado, 'Parcela 1'), objetos }];
    }
    if (!glebas.some((g) => g.id === glebaAtivaId)) {
      return glebas.map((g, i) => (i === 0 ? { ...g, vertices, confrontantes, confrontantePorLado, objetos } : g));
    }
    return glebas.map((g) => (g.id === glebaAtivaId ? { ...g, vertices, confrontantes, confrontantePorLado, objetos } : g));
  }
  function carregarGleba(g: Gleba) {
    setVertices(g.vertices);
    setConfrontantes(g.confrontantes);
    setConfrontantePorLado(g.confrontantePorLado);
    setObjetos(g.objetos ?? []);
    setDesenhoBuffer([]);
    setObjetoSelId(null);
    setVerticesIgnorados([]);
    setGlebaAtivaId(g.id);
    setSelecionadoId(null);
    if (g.vertices.length >= 2) setCentralizarSig((n) => n + 1); // enquadra a gleba carregada
  }
  function trocarGleba(id: string) {
    if (id === glebaAtivaId) return;
    const gs = sincronizarGlebas();
    setGlebas(gs);
    const g = gs.find((x) => x.id === id);
    if (g) carregarGleba(g);
  }
  function novaGleba() {
    const gs = sincronizarGlebas();
    const nova = novaGlebaVazia(gs.length + 1);
    setGlebas([...gs, nova]);
    carregarGleba(nova);
    aviso(`Gleba "${nova.denominacao}" criada.`);
  }
  async function removerGleba(id: string) {
    if (sincronizarGlebas().length > 1 && !(await confirmarApagar('Remover esta gleba do imóvel?'))) return;
    const gs = sincronizarGlebas().filter((g) => g.id !== id);
    if (gs.length === 0) { aviso('O imóvel precisa de ao menos uma gleba.'); return; }
    setGlebas(gs);
    if (id === glebaAtivaId) carregarGleba(gs[0]);
  }
  function renomearGlebaAtiva(denominacao: string) {
    setGlebas(sincronizarGlebas().map((g) => (g.id === glebaAtivaId ? { ...g, denominacao } : g)));
  }
  const glebaAtivaNome = glebas.find((g) => g.id === glebaAtivaId)?.denominacao ?? 'Parcela 1';

  async function importarArquivo(file: File) {
    if (processando) return;
    setImportPendingFile(file);
    setImportModalAberto(true);
  }

  async function processarImportacao(data: { numGlebas: number; municipio: string; fuso: number }) {
    if (!importPendingFile || processando) return;
    const { numGlebas, municipio, fuso } = data;
    setProcessando(true);
    try {
      const buf = await importPendingFile.arrayBuffer();
      // TXT do GNSS costuma vir em Windows-1252 (acentos)
      const texto = new TextDecoder('windows-1252').decode(buf);
      const pontos = parseTxt(texto, carregarImportTxt());
      const perim = pontosDePerimetro(pontos);
      if (perim.length < 3) { aviso('O arquivo não tem pontos de perímetro suficientes.'); return; }

      // Define o município no imóvel
      const novoImovel = { ...imovel, municipio, local: `${municipio}` };

      const tec = tecnico ?? carregarTecnico();
      const fusos = tec.fusosPermitidos ?? [18, 19, 20, 21, 22, 23, 24, 25];
      
      // Fuso AUTOMÁTICO pela região (não precisa do município): testa cada fuso e fica com o que
      // coloca o ponto dentro da nossa área de trabalho (resolve a divisa 23/24 sozinho).
      let z = detectarFusoPorRegiao(perim[0].leste, perim[0].norte, hemisferio, fusos).zona;
      // Se o município foi informado, sua âncora confirma/refina (mais específica).
      const anc = ancoraMunicipio(municipio);
      if (anc) z = escolherZonaPorAncora(perim[0].leste, perim[0].norte, hemisferio, anc, fusos);

      // numeração provisória a partir do banco de pontos (para não colidir com o já usado)
      const cont = await lerContadores(tec.credenciamentoIncra, tec).catch(() => semente(tec.credenciamentoIncra, tec));
      const vs0 = montarVertices(perim, z, hemisferio, { credenciamentoIncra: tec.credenciamentoIncra, contadorMarco: cont.M, contadorPonto: cont.P });
      const vs = recodificar(iniciarDoNorteHorario(vs0), tec.credenciamentoIncra, cont.M, cont.P);
      // defesa: não importar coordenadas que viraram inválidas (NaN/fora de faixa) — protege a peça
      if (vs.some((v) => !Number.isFinite(v.lat) || !Number.isFinite(v.lon) || Math.abs(v.lat) > 90 || Math.abs(v.lon) > 180)) {
        aviso('Coordenadas inválidas após a conversão — confira o fuso/hemisfério e o arquivo.'); return;
      }

      setPreviewData({
        perim,
        vs,
        numGlebas,
        municipio,
        fuso,
        z,
        novoImovel,
        contM: cont.M,
        contP: cont.P,
        prefixo: tec.credenciamentoIncra,
      });

    } catch (e) {
      aviso('Erro na importação: ' + (e as Error).message);
    } finally {
      setProcessando(false);
    }
  }

  function concluirImportacao(gerarPoligono: boolean, zonaEscolhida: number | undefined, selecao?: ImportSelecao) {
    if (!previewData) return;
    const { vs: vs0, numGlebas, municipio, z: z0, novoImovel, contM, contP, prefixo } = previewData;
    // se o usuário corrigiu o fuso na prévia, reprojeta os vértices (E/N iguais, lat/lon novos)
    const z = (zonaEscolhida && zonaEscolhida !== z0) ? zonaEscolhida : z0;
    const vsRepro: Vertex[] = z !== z0 ? reprojetar(vs0, z, hemisferio) : vs0;

    // aplica a seleção da prévia: ordem (arrastar), importar (traz?) e noPoligono (perímetro passa?)
    const ordem = selecao?.ordem ?? vsRepro.map((_, i) => i);
    const importar = selecao?.importar ?? vsRepro.map(() => true);
    const noPoligono = selecao?.noPoligono ?? vsRepro.map(() => true);
    const importados = ordem.filter((i) => importar[i]).map((i) => ({ v: vsRepro[i], poligono: noPoligono[i] !== false }));
    // "Só vértices" (gerarPoligono=false): NENHUM ponto forma o perímetro — todos entram como
    // pontos soltos (verticesIgnorados) e o anel fica vazio, então nenhum polígono é desenhado.
    // "Gerar polígono": anel = importados marcados "no polígono"; ignorados = os fora do polígono.
    const anel = gerarPoligono ? importados.filter((p) => p.poligono).map((p) => p.v) : [];
    const ignorados = gerarPoligono ? importados.filter((p) => !p.poligono).map((p) => p.v) : importados.map((p) => p.v);
    // renumera o anel na ordem final (M/P sequenciais a partir do contador do banco)
    const vs = recodificar(anel, prefixo || 'VER', contM, contP);

    setImovel(novoImovel);
    setZona(z);

    const gs: Gleba[] = [];
    const { confrontantes: cs, confrontantePorLado: mapa } = gerarPoligono && vs.length >= 3
      ? montarConfrontantes(vs)
      : { confrontantes: [], confrontantePorLado: {} };
    for (let i = 1; i <= numGlebas; i++) {
      gs.push(i === 1 ? glebaDe(1, vs, cs, mapa, 'Parcela 1') : novaGlebaVazia(i));
    }

    setProjetoId(null); // importar um TXT começa um projeto novo (não sobrescreve o salvo anterior)
    setReferencias([]); // não deixa mais referência tracejada de importação anterior
    setGlebas(gs);
    carregarGleba(gs[0]);
    // carregarGleba zera os ignorados; reaplica os que o usuário tirou do polígono
    if (ignorados.length) setVerticesIgnorados(ignorados);

    if (!nomeProjeto || !nomeProjetoManual) {
      const auto = gerarTituloAutomatico(novoImovel);
      setNomeProjeto(auto || importPendingFile?.name.replace(/\.[^.]+$/, '') || '');
    }
    if (gerarPoligono) {
      const extra = ignorados.length ? ` (${ignorados.length} fora do polígono)` : '';
      aviso(`${vs.length} vértices importados e perímetro gerado na Parcela 1${extra} — fuso ${z}${hemisferio} (${municipio}).`);
    } else {
      aviso(`${ignorados.length} vértices importados como pontos soltos, SEM perímetro — fuso ${z}${hemisferio} (${municipio}). Use a ferramenta "Considerar" para formar o polígono quando quiser.`);
    }
    setPreviewData(null);
    setImportPendingFile(null);
  }

  function trocarZona(z: number) {
    if (!Number.isFinite(z) || z < 1 || z > 60) { setZona(z); return; }
    setZona(z);
    setVertices((vs) => reprojetar(vs, z, hemisferio));
    setGlebas((prev) => prev.map((g) => ({
      ...g,
      vertices: reprojetar(g.vertices, z, hemisferio)
    })));
    // também reprojeta o que ficava esquecido no fuso antigo (senão "considerar" um vértice ignorado
    // ou usar uma referência trazia coordenada deslocada de centenas de metros)
    setVerticesIgnorados((vs) => reprojetar(vs, z, hemisferio));
    setReferencias((refs) => refs.map((anel) => anel.map((p) => ({ ...p, ...geoParaUtm(p.lat, p.lon, z, hemisferio) }))));
  }

  function trocarHemisferio(h: 'N' | 'S') {
    setHemisferio(h);
    setVertices((vs) => reprojetar(vs, zona, h));
    setGlebas((prev) => prev.map((g) => ({
      ...g,
      vertices: reprojetar(g.vertices, zona, h)
    })));
    setVerticesIgnorados((vs) => reprojetar(vs, zona, h));
    setReferencias((refs) => refs.map((anel) => anel.map((p) => ({ ...p, ...geoParaUtm(p.lat, p.lon, zona, h) }))));
  }

  // Ao informar o município, tenta acertar o fuso pela âncora (resolve a divisa 23/24).
  function aoMudarMunicipio(novo: string) {
    setImovel((im) => ({ ...im, municipio: novo }));
    const anc = ancoraMunicipio(novo);
    if (anc && vertices.length) {
      const tec = tecnico ?? carregarTecnico();
      const z = escolherZonaPorAncora(vertices[0].leste, vertices[0].norte, hemisferio, anc, tec.fusosPermitidos ?? [18, 19, 20, 21, 22, 23, 24, 25]);
      if (z !== zona) { trocarZona(z); aviso(`Fuso ajustado para ${z}${hemisferio} pelo município.`); }
    }
  }

  // Ao alterar a localidade (local), tenta adivinhar o município pelo texto
  // e reusa a lógica de aoMudarMunicipio se encontrar um correspondente.
  function aoMudarLocalidade(novaLocalidade: string) {
    setImovel((im) => ({ ...im, local: novaLocalidade }));
    const n = novaLocalidade.toLowerCase();
    const mapCapitalizado: Record<string, string> = {
      'espera feliz-mg': 'Espera Feliz-MG',
      'caparaó-mg': 'Caparaó-MG',
      'alto caparaó-mg': 'Alto Caparaó-MG',
      'caiana-mg': 'Caiana-MG',
      'carangola-mg': 'Carangola-MG',
      'fervedouro-mg': 'Fervedouro-MG',
      'manhuaçu-mg': 'Manhuaçu-MG',
      'manhumirim-mg': 'Manhumirim-MG',
      'tombos-mg': 'Tombos-MG',
      'dores do rio preto-es': 'Dores do Rio Preto-ES',
      'guaçuí-es': 'Guaçuí-ES',
      'ibitirama-es': 'Ibitirama-ES',
      'divino-mg': 'Divino-MG'
    };
    for (const muni of Object.keys(MUNICIPIOS)) {
      const nomeMuni = muni.replace(/-[a-z]{2}$/, '');
      if (n.includes(muni) || n.includes(nomeMuni)) {
        const muniCapitalizado = mapCapitalizado[muni] || muni;
        aoMudarMunicipio(muniCapitalizado);
        break;
      }
    }
  }

  // alvos de snap: outros vértices da gleba ativa + vértices das demais glebas (divisas coincidentes)
  // + parcelas certificadas de referência + vértices de imóveis vizinhos já certificados (coordenada
  // oficial). Assim, ao desenhar/arrastar perto de um ponto do vizinho, a divisa gruda exatamente
  // nele — é o que evita vão e sobreposição na fronteira.
  function alvosSnap(excluirId?: string) {
    const a = vertices.filter((v) => v.id !== excluirId).map((v) => ({ leste: v.leste, norte: v.norte }));
    for (const g of glebas) if (g.id !== glebaAtivaId) for (const v of g.vertices) a.push({ leste: v.leste, norte: v.norte });
    for (const anel of referencias) for (const p of anel) a.push({ leste: p.leste, norte: p.norte });
    for (const p of verticesVizinho) a.push({ leste: p.leste, norte: p.norte });
    return a;
  }

  function moverVertice(id: string, lat: number, lon: number) {
    snap();
    let { leste, norte } = geoParaUtm(lat, lon, zona, hemisferio);
    if (snapAtivo) {
      const s = snapUtm(leste, norte, alvosSnap(id), { tolVerticeM: 2 });
      if (s.tipo) { leste = s.leste; norte = s.norte; const g = utmParaGeo(leste, norte, zona, hemisferio); lat = g.lat; lon = g.lon; }
    }
    setVertices((vs) => vs.map((v) => (v.id === id ? { ...v, lat, lon, leste, norte } : v)));
  }

  function apagarVertice(id: string) {
    snap();
    setVertices((vs) => reordenar(vs.filter((v) => v.id !== id)));
    if (selecionadoId === id) setSelecionadoId(null);
  }

  // --- multi-seleção de vértices (modo "triângulo") ---
  function alternarMulti(id: string) {
    setSelMulti((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function adicionarMulti(ids: string[]) {
    setSelMulti((s) => { const n = new Set(s); ids.forEach((i) => n.add(i)); return n; });
  }
  async function apagarMultiSelecionados() {
    if (selMulti.size === 0) return;
    if (!(await confirmarApagar(`Apagar ${selMulti.size} vértice(s) selecionado(s)?`))) return;
    snap();
    setVertices((vs) => reordenar(vs.filter((v) => !selMulti.has(v.id))));
    setSelMulti(new Set());
  }

  // Apaga TODO o polígono (vértices + ignorados + trechos), para redesenhar à mão depois.
  async function limparPoligono() {
    if (vertices.length === 0 && verticesIgnorados.length === 0) return;
    if (!(await confirmarApagar(`Apagar todo o polígono (${vertices.length} vértices)? Você poderá desenhar de novo com a ferramenta "Inserir vértice".`))) return;
    snap();
    setVertices([]);
    setVerticesIgnorados([]);
    setConfrontantePorLado({});
    setSelecionadoId(null);
    setModo('inserir');
    aviso('Polígono apagado. Clique no mapa com "Inserir vértice" para desenhar o novo.');
  }

  // Ignorar vértice: tira-o do desenho do polígono (vai para a lista de ignorados, pode voltar).
  async function renomearVertice(id: string) {
    const v = vertices.find((x) => x.id === id);
    if (!v) return;
    const novo = await perguntar({ titulo: 'Renomear vértice', mensagem: 'Novo código/nome do vértice:', valorInicial: v.codigoSigef || '' });
    if (novo == null) return;
    snap();
    setVertices((vs) => vs.map((x) => (x.id === id ? { ...x, codigoSigef: novo.trim().toUpperCase() } : x)));
  }

  function ignorarVertice(id: string) {
    const v = vertices.find((x) => x.id === id);
    if (!v) return;
    ignorouRef.current = true; // marca que houve mudança no polígono (pergunta ao sair do modo)
    setVertices((vs) => reordenar(vs.filter((x) => x.id !== id)));
    setVerticesIgnorados((xs) => (xs.some((x) => x.id === id) ? xs : [...xs, v]));
    if (selecionadoId === id) setSelecionadoId(null);
    aviso('Vértice ignorado (o desenho passa direto). Use "considerar" para trazê-lo de volta.');
  }

  // Considerar vértice: reinsere um vértice ignorado no segmento mais próximo do anel atual.
  function considerarVertice(id: string) {
    const v = verticesIgnorados.find((x) => x.id === id);
    if (!v || vertices.length < 2) return;
    let melhor = vertices.length - 1, melhorD = Infinity;
    for (let i = 0; i < vertices.length; i++) {
      const a = vertices[i], b = vertices[(i + 1) % vertices.length];
      const d = distPontoSegmento(v.leste, v.norte, a.leste, a.norte, b.leste, b.norte);
      if (d < melhorD) { melhorD = d; melhor = i; }
    }
    setVertices((vs) => {
      const out = [...vs];
      out.splice(melhor + 1, 0, v);
      return reordenar(out);
    });
    setVerticesIgnorados((xs) => xs.filter((x) => x.id !== id));
    aviso('Vértice reincluído no segmento mais próximo.');
  }

  async function executarDivisaoGleba() {
    if (!vSplitInicioId || !vSplitFimId) return;
    try {
      const { verticesA, confrontantePorLadoA, verticesB, confrontantePorLadoB } = dividirGleba(
        vertices,
        confrontantes,
        confrontantePorLado,
        vSplitInicioId,
        vSplitFimId
      );

      const gAtiva = glebas.find(g => g.id === glebaAtivaId);
      if (!gAtiva) return;

      const nomeA = (await perguntar({ titulo: 'Dividir gleba', mensagem: 'Nome da Parcela A:', valorInicial: `${gAtiva.denominacao} - Parte A` })) || `${gAtiva.denominacao} - Parte A`;
      const nomeB = (await perguntar({ titulo: 'Dividir gleba', mensagem: 'Nome da Parcela B:', valorInicial: `${gAtiva.denominacao} - Parte B` })) || `${gAtiva.denominacao} - Parte B`;

      const gA = glebaDe(glebas.length + 1, verticesA, confrontantes, confrontantePorLadoA, nomeA);
      const gB = glebaDe(glebas.length + 2, verticesB, confrontantes, confrontantePorLadoB, nomeB);

      const novasGlebas = glebas.filter(g => g.id !== glebaAtivaId).concat(gA, gB);
      setGlebas(novasGlebas);
      setGlebaAtivaId(gA.id);

      setVertices(verticesA);
      setConfrontantePorLado(confrontantePorLadoA);

      setVSplitInicioId(null);
      setVSplitFimId(null);
      setSelecionadoId(null);

      await avisar({ titulo: 'Gleba desmembrada', mensagem: 'Gleba desmembrada com sucesso!' });
    } catch (e) {
      await avisar({ titulo: 'Erro', mensagem: (e as Error).message });
    }
  }

  // Divide a gleba ativa por ÁREA ALVO: a linha de corte fica paralela à reta De→Até.
  async function executarDivisaoPorArea() {
    const alvoHa = Number(String(areaAlvoHa).replace(',', '.'));
    if (!(alvoHa > 0)) { await avisar({ titulo: 'Área alvo', mensagem: 'Informe a área alvo em hectares (ex.: 0,4).' }); return; }
    if (!vSplitInicioId || !vSplitFimId) { await avisar({ titulo: 'Divisão por área', mensagem: 'Selecione dois vértices (De e Até): a linha de divisão sai paralela a eles.' }); return; }
    const vi = vertices.find((v) => v.id === vSplitInicioId), vf = vertices.find((v) => v.id === vSplitFimId);
    if (!vi || !vf) return;
    const az = azimute({ e: vi.leste, n: vi.norte }, { e: vf.leste, n: vf.norte });
    const poly = vertices.map((v) => ({ leste: v.leste, norte: v.norte }));
    try {
      const { anelA, anelB, areaA, areaB } = dividirPorAreaAlvo(poly, alvoHa * 10000, az);
      const ts = Date.now().toString(36);
      const toVerts = (anel: { leste: number; norte: number }[], pref: string) => reordenar(anel.map((p) => {
        const orig = vertices.find((v) => Math.hypot(v.leste - p.leste, v.norte - p.norte) < 0.05);
        if (orig) return { ...orig, id: `${pref}_${orig.id}_${ts}` };
        const g = utmParaGeo(p.leste, p.norte, zona, hemisferio);
        return novoVertice({ lat: g.lat, lon: g.lon, leste: p.leste, norte: p.norte, elevacao: 0 });
      }));
      const vertsA = toVerts(anelA, 'da'), vertsB = toVerts(anelB, 'db');
      const gAtiva = glebas.find((g) => g.id === glebaAtivaId);
      if (!gAtiva) return;
      snap();
      const gA = glebaDe(glebas.length + 1, vertsA, [], {}, `${gAtiva.denominacao} - ${numBR(areaA / 10000, 4)} ha`);
      const gB = glebaDe(glebas.length + 2, vertsB, [], {}, `${gAtiva.denominacao} - ${numBR(areaB / 10000, 4)} ha`);
      setGlebas(glebas.filter((g) => g.id !== glebaAtivaId).concat(gA, gB));
      setGlebaAtivaId(gA.id);
      setVertices(vertsA);
      setConfrontantePorLado({});
      setVerticesIgnorados([]);
      setVSplitInicioId(null); setVSplitFimId(null); setAreaAlvoHa('');
      aviso(`Gleba dividida: ${numBR(areaA / 10000, 4)} ha e ${numBR(areaB / 10000, 4)} ha. Repinte as divisas da nova linha.`);
    } catch (e) { await avisar({ titulo: 'Erro', mensagem: (e as Error).message }); }
  }

  async function executarFusaoGlebas(gAlvoId: string) {
    const gAtiva = glebas.find(g => g.id === glebaAtivaId);
    const gAlvo = glebas.find(g => g.id === gAlvoId);
    if (!gAtiva || !gAlvo) return;

    if (await confirmar({ titulo: 'Unir glebas', mensagem: `Deseja unir a gleba ativa "${gAtiva.denominacao}" com a gleba "${gAlvo.denominacao}"?`, okLabel: 'Unir' })) {
      try {
        const { vertices: vFuso, confrontantePorLado: cFuso } = unirGlebas(
          vertices,
          gAlvo.vertices,
          confrontantePorLado,
          gAlvo.confrontantePorLado
        );

        const novoNome = (await perguntar({ titulo: 'Unir glebas', mensagem: 'Nome da Gleba Unificada:', valorInicial: `${gAtiva.denominacao} + ${gAlvo.denominacao}` })) || `${gAtiva.denominacao} + ${gAlvo.denominacao}`;

        const gUnida = glebaDe(glebas.length + 1, vFuso, confrontantes, cFuso, novoNome);
        const novasGlebas = glebas.filter(g => g.id !== glebaAtivaId && g.id !== gAlvoId).concat(gUnida);

        setGlebas(novasGlebas);
        setGlebaAtivaId(gUnida.id);

        setVertices(vFuso);
        setConfrontantePorLado(cFuso);
        setSelecionadoId(null);

        await avisar({ titulo: 'Glebas unificadas', mensagem: 'Glebas unificadas com sucesso!' });
      } catch (e) {
        await avisar({ titulo: 'Erro', mensagem: (e as Error).message });
      }
    }
  }

  // Aplica códigos provisórios (renumeração) a uma lista, lendo os contadores do banco.
  async function aplicarCodigos(lista: Vertex[]) {
    const tec = tecnico ?? carregarTecnico();
    const cont = await lerContadores(tec.credenciamentoIncra, tec).catch(() => semente(tec.credenciamentoIncra, tec));
    const codificados = atribuirProvisorio(lista, cont);
    // funde por id: mantém a ORDEM/códigos novos, mas preserva edições de coordenada/altitude
    // feitas durante o await (ex.: arrastar outro vértice no mapa).
    setVertices((cur) => {
      const curById = new Map(cur.map((v) => [v.id, v]));
      return codificados.map((v) => {
        const c = curById.get(v.id);
        return c ? { ...v, leste: c.leste, norte: c.norte, lat: c.lat, lon: c.lon, elevacao: c.elevacao } : v;
      });
    });
  }

  /**
   * Insere um vértice no perímetro. Quando `codigoOficial` é informado (vértice ADOTADO de um
   * vizinho já certificado), o vértice nasce com esse código e `registrado: true` — isso faz o
   * sistema de numeração (atribuirProvisorio/atribuirDefinitivo) NUNCA reescrever nem tentar
   * registrar esse código no NOSSO banco de pontos, porque ele já foi registrado pelo outro
   * agrimensor sob o credenciamento dele. Sem `codigoOficial`, gera um código provisório nosso,
   * como sempre.
   */
  function inserirVertice(
    lat: number,
    lon: number,
    codigoOficial?: string,
    opts?: { tipo?: TipoVertice; metodo?: string; elevacao?: number; sigmaX?: number; sigmaY?: number; sigmaZ?: number; semSnap?: boolean },
  ) {
    snap();
    let { leste, norte } = geoParaUtm(lat, lon, zona, hemisferio);
    // Vértice virtual (V) vem de coordenada CALCULADA (afastamento/interseção): não gruda no ímã,
    // senão a conta feita à mão seria descartada. Por isso `semSnap`.
    if (snapAtivo && !opts?.semSnap) {
      const s = snapUtm(leste, norte, alvosSnap(), { tolVerticeM: 2 });
      if (s.tipo) { leste = s.leste; norte = s.norte; const g = utmParaGeo(leste, norte, zona, hemisferio); lat = g.lat; lon = g.lon; }
    }
    const base = novoVertice({ lat, lon, leste, norte, elevacao: opts?.elevacao ?? 0 });
    let novo = codigoOficial
      ? { ...base, codigoSigef: codigoOficial, nome: codigoOficial, codigoCampo: codigoOficial, registrado: true }
      : base;
    if (opts?.tipo) novo = { ...novo, tipo: opts.tipo, isDivisa: opts.tipo === 'M' };
    if (opts?.metodo) novo = { ...novo, metodo: opts.metodo };
    if (opts?.sigmaX != null) novo = { ...novo, sigmaX: opts.sigmaX };
    if (opts?.sigmaY != null) novo = { ...novo, sigmaY: opts.sigmaY };
    if (opts?.sigmaZ != null) novo = { ...novo, sigmaZ: opts.sigmaZ };
    let out: Vertex[];
    if (vertices.length < 2) {
      out = reordenar([...vertices, novo]);
    } else {
      // acha o lado mais próximo (no plano UTM) e insere ali
      let melhor = 0, melhorD = Infinity;
      for (let i = 0; i < vertices.length; i++) {
        const a = vertices[i], b = vertices[(i + 1) % vertices.length];
        const d = distPontoSegmento(leste, norte, a.leste, a.norte, b.leste, b.norte);
        if (d < melhorD) { melhorD = d; melhor = i; }
      }
      const out2 = [...vertices];
      out2.splice(melhor + 1, 0, novo);
      out = reordenar(out2);
    }
    aplicarCodigos(out); // já atribui código aos que ainda não têm (o adotado é preservado)
  }

  /** Adota um vértice de um imóvel vizinho certificado (clique na divisa dele no mapa): pede o
   * código oficial que o outro agrimensor já usou, se o dono souber (do memorial do vizinho). */
  async function adotarVerticeVizinho(lat: number, lon: number) {
    const digitado = await perguntar({
      titulo: 'Vértice de vizinho',
      mensagem: 'Se você já sabe o código oficial que o agrimensor vizinho usou para este vértice (ex.: CODI-P-0007), digite aqui — ele será reaproveitado em vez de gerar um novo.\n\nDeixe em branco se não souber (o sistema gera um código provisório seu).',
    });
    const codigo = digitado?.trim();
    inserirVertice(lat, lon, codigo ? codigo.toUpperCase() : undefined);
  }

  /** Cria um vértice virtual (tipo V) a partir da coordenada calculada no modal (afastamento ou
   * interseção de alinhamentos) e o insere no perímetro, no lado mais próximo. */
  function criarVerticeVirtual(d: DadosVerticeVirtual) {
    inserirVertice(d.lat, d.lon, undefined, {
      tipo: 'V', metodo: d.metodo, elevacao: d.elevacao,
      sigmaX: d.sigmaX, sigmaY: d.sigmaY, sigmaZ: d.sigmaZ, semSnap: true,
    });
    aviso('Vértice virtual (V) criado e inserido no perímetro.');
  }

  // Casa AUTOMATICAMENTE os vértices do imóvel com os vértices certificados das parcelas INCRA
  // importadas: para cada ponto meu quase em cima de um ponto certificado (dentro da tolerância),
  // adoto a coordenada oficial exata. É o que o SIGEF exige na divisa comum — sem clicar ponto a ponto.
  function casarVerticesCertificados() {
    if (!parcelasCert.length) { aviso('Importe as parcelas do INCRA primeiro (botão SIGEF).'); return; }
    const TOL = 0.5; // metros
    const cert = parcelasCert.flatMap((p) => p.anel.map(([lat, lon]) => ({ ...geoParaUtm(lat, lon, zona, hemisferio), lat, lon })));
    if (!cert.length) { aviso('As parcelas importadas não têm vértices utilizáveis.'); return; }
    let casados = 0;
    const novos = vertices.map((v) => {
      let melhor: typeof cert[number] | null = null; let dmin = TOL;
      for (const c of cert) {
        const d = Math.hypot(c.leste - v.leste, c.norte - v.norte);
        if (d <= dmin) { dmin = d; melhor = c; }
      }
      if (melhor && (Math.abs(melhor.leste - v.leste) > 1e-4 || Math.abs(melhor.norte - v.norte) > 1e-4)) {
        casados++;
        return { ...v, lat: melhor.lat, lon: melhor.lon, leste: melhor.leste, norte: melhor.norte };
      }
      return v;
    });
    if (!casados) { aviso(`Nenhum vértice seu está a menos de ${TOL} m de um vértice certificado. Nada a casar.`); return; }
    snap();
    setVertices(novos);
    aviso(`${casados} vértice(s) casado(s) com a coordenada oficial certificada do INCRA.`);
  }

  async function renumerar() {
    snap();
    await aplicarCodigos(vertices);
    aviso('Vértices renumerados.');
  }

  // Reordena a partir do vértice mais ao norte, sentido horário (praxe), e renumera.
  async function ordenarNorteHorario() {
    if (vertices.length < 3) return;
    snap();
    await aplicarCodigos(iniciarDoNorteHorario(vertices));
    aviso('Reordenado do norte em sentido horário.');
  }

  // Reordena o anel arrastando na lista e renumera (muda o polígono e os nomes).
  async function reordenarVertice(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= vertices.length || to >= vertices.length) return;
    snap();
    const out = [...vertices];
    const [m] = out.splice(from, 1);
    out.splice(to, 0, m);
    await aplicarCodigos(reordenar(out));
  }

  // ---------- desenho livre (CAD leve) ----------
  function pontoLL(lat: number, lon: number, comSnap = true): PontoLL {
    let { leste, norte } = geoParaUtm(lat, lon, zona, hemisferio);
    if (comSnap && snapAtivo) {
      const s = snapUtm(leste, norte, alvosSnap(), { tolVerticeM: 2 });
      if (s.tipo) { leste = s.leste; norte = s.norte; const g = utmParaGeo(leste, norte, zona, hemisferio); lat = g.lat; lon = g.lon; }
    }
    return { lat, lon, leste, norte };
  }
  // ponta de linha/polilinha/cota: SEMPRE encaixa no vértice mais próximo (mesmo com o imã
  // desligado) e com tolerância maior, para a extremidade poder ficar exatamente sobre um vértice.
  function pontoDesenho(lat: number, lon: number): PontoLL {
    let { leste, norte } = geoParaUtm(lat, lon, zona, hemisferio);
    const s = snapUtm(leste, norte, alvosSnap(), { tolVerticeM: snapAtivo ? 12 : 10 });
    if (s.tipo) { leste = s.leste; norte = s.norte; const g = utmParaGeo(leste, norte, zona, hemisferio); lat = g.lat; lon = g.lon; }
    return { lat, lon, leste, norte };
  }
  async function onCliqueDesenho(lat: number, lon: number) {
    const p = pontoDesenho(lat, lon);
    if (modo === 'simbolo') {
      setObjetos((os) => [...os, novoSimbolo(p, simboloSel)]);
      return;
    } else if (modo === 'texto') {
      const t = await perguntar({ titulo: 'Inserir texto', mensagem: 'Texto a inserir:' }); if (!t) return;
      setObjetos((os) => [...os, novoTexto(p, t)]);
    } else if (modo === 'cota') {
      setDesenhoBuffer((buf) => {
        const nb = [...buf, p];
        if (nb.length >= 2) { setObjetos((os) => [...os, novaCota(nb[0], nb[1])]); return []; }
        return nb;
      });
    } else if (modo === 'linha') {
      // linha = traço reto de 2 pontos (fecha sozinho no 2º clique)
      setDesenhoBuffer((buf) => {
        const nb = [...buf, p];
        if (nb.length >= 2) { setObjetos((os) => [...os, novaPolilinha(nb)]); return []; }
        return nb;
      });
    } else if (modo === 'polilinha') {
      // polilinha = vários pontos; ao CLICAR PERTO DO 1º ponto, fecha e vira polígono (preenchido)
      if (desenhoBuffer.length >= 3) {
        const first = desenhoBuffer[0];
        const lats = desenhoBuffer.map((q) => q.lat), lons = desenhoBuffer.map((q) => q.lon);
        const ext = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lons) - Math.min(...lons)) || 0.0005;
        if (Math.hypot(p.lat - first.lat, p.lon - first.lon) < ext * 0.05) {
          const buf = desenhoBuffer;
          setDesenhoBuffer([]);
          // pergunta o que é o polígono: uma GLEBA (entra na área/peças) ou um item do mapa (casa etc.)
          const ehGleba = await confirmar({ titulo: 'Polígono fechado', mensagem: 'O que este polígono representa?', okLabel: 'Gleba do imóvel', cancelLabel: 'Item do mapa' });
          if (ehGleba) {
            const novos: Vertex[] = buf.map((q, i) => ({ id: `v_${Date.now().toString(36)}_${i}`, lat: q.lat, lon: q.lon, leste: q.leste, norte: q.norte, tipo: 'P', codigoSigef: `P${i + 1}`, isDivisa: false, ordem: i + 1, nome: `P${i + 1}`, codigoCampo: `P${i + 1}`, elevacao: 0 }));
            snap();
            if (vertices.length < 3) { setVertices(novos); aviso('Polígono definido como perímetro da gleba.'); }
            else { const gs = sincronizarGlebas(); const nova = { ...novaGlebaVazia(gs.length + 1), vertices: novos }; setGlebas([...gs, nova]); carregarGleba(nova); aviso('Nova gleba criada a partir do polígono.'); }
          } else {
            setObjetos((os) => [...os, novaPolilinha(buf, { preenchido: true })]);
            aviso('Polígono adicionado como item do mapa.');
          }
          return;
        }
      }
      setDesenhoBuffer((buf) => [...buf, p]);
    } else if (modo === 'tracejado' || modo === 'medir') {
      // tracejado/medir = adiciona pontos ao buffer de desenho
      setDesenhoBuffer((buf) => [...buf, p]);
    }
  }
  function finalizarLinha() {
    if (desenhoBuffer.length >= 2) setObjetos((os) => [...os, novaPolilinha(desenhoBuffer, modo === 'tracejado' ? { tracejado: true, cor: '#334155' } : {})]);
    setDesenhoBuffer([]);
  }
  function cancelarDesenho() {
    setDesenhoBuffer((buf) => {
      if (buf.length > 0) {
        return buf.slice(0, -1);
      }
      setModo('navegar');
      return buf;
    });
  }
  function salvarAlteracoesPlanilha(novos: Vertex[]) {
    snap();
    const atualizados = novos.map((v) => {
      const { lat, lon } = utmParaGeo(v.leste, v.norte, zona, hemisferio);
      return { ...v, lat, lon };
    });
    setVertices(atualizados);
  }
  async function abrirPlanilha() {
    if (tecnico) {
      try {
        const cont = await lerContadores(tecnico.credenciamentoIncra, tecnico);
        setContadorSugerido(cont);
      } catch (e) {
        console.warn('Erro ao ler contadores para a planilha:', e);
      }
    }
    setPlanilhaAberta(true);
  }
  function onMoverPontoObjeto(id: string, idx: number, lat: number, lon: number) {
    const p = pontoLL(lat, lon);
    setObjetos((os) => os.map((o) => (o.id === id ? { ...o, pontos: o.pontos.map((q, i) => (i === idx ? p : q)) } : o)));
  }
  function apagarObjetoSel() {
    if (!objetoSelId) return;
    setObjetos((os) => os.filter((o) => o.id !== objetoSelId));
    setObjetoSelId(null);
  }
  function editarObjetoSel(patch: Partial<ObjetoDesenho>) {
    if (!objetoSelId) return;
    setObjetos((os) => os.map((o) => (o.id === objetoSelId ? { ...o, ...patch } : o)));
  }
  function definirDivisaLado(id: string, tipo: string) {
    snap();
    setVertices((vs) => vs.map((v) => (v.id === id ? { ...v, representacao: tipo as Vertex['representacao'] } : v)));
  }
  function definirConfrontanteLado(idx: number, confrontanteId: string) {
    snap();
    setConfrontantePorLado((m) => {
      const copy = { ...m };
      if (confrontanteId) copy[idx] = confrontanteId;
      else delete copy[idx];
      return copy;
    });
  }
  function onMoverRotulo(id: string, lat: number, lon: number) {
    setConfrontantes((cs) => cs.map((c) => (c.id === id ? { ...c, posRotulo: { lat, lon } } : c)));
  }
  // edição direta do confrontante na planta (duplo clique abre o editor com prévia)
  function editarConfrontantePlanta(id: string) {
    if (confrontantes.some((x) => x.id === id)) setConfEditId(id);
  }
  // ajusta o tique de troca de confrontante (azimute/comprimento) de um marco M
  function ajustarDivisaConf(id: string, az: number, len: number) {
    snap();
    setVertices((vs) => vs.map((v) => (v.id === id ? { ...v, divisaConfAz: az, divisaConfLen: len } : v)));
  }

  // tamanho da fonte do rótulo do confrontante selecionado/por id (A-/A+ na planta)
  function ajustarTamRotuloConf(id: string, delta: number) {
    setConfrontantes((cs) => cs.map((x) => (x.id === id ? { ...x, tamRotulo: Math.max(4, Math.min(18, (x.tamRotulo ?? 7) + delta)) } : x)));
  }
  function onMoverRotuloVertice(id: string, lat: number, lon: number) {
    snap();
    setVertices((vs) => vs.map((v) => (v.id === id ? { ...v, posRotulo: { lat, lon } } : v)));
  }

  function alternarTipo(id: string) {
    snap();
    const prox = { M: 'P', P: 'V', V: 'M' } as const;
    setVertices((vs) => vs.map((v) => { if (v.id !== id) return v; const t = prox[v.tipo as 'M' | 'P' | 'V'] ?? 'P'; return { ...v, tipo: t, isDivisa: t === 'M' }; }));
  }

  function editarVertice(id: string, patch: Partial<Vertex>) {
    setVertices((vs) => vs.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }

  function editarVariosVertices(patch: Partial<Vertex>) {
    snap();
    const ids = selMulti.size > 0 ? Array.from(selMulti) : vertices.map(v => v.id);
    setVertices((vs) => vs.map((v) => (ids.includes(v.id) ? { ...v, ...patch } : v)));
    aviso(`Atributos aplicados a ${ids.length} vértice(s).`);
  }

  // Pintar divisa: aplica o tipo de divisa aos segmentos do perímetro.
  // Suporta processo de 2 cliques: seleciona o primeiro vértice e depois o final para pintar todos os segmentos no caminho.
  function pintarDivisa(id: string) {
    if (!pincelInicioId) {
      setPincelInicioId(id);
      aviso('Vértice inicial selecionado. Clique no próximo vértice para pintar o trecho.');
      return;
    }

    const start = vertices.findIndex((v) => v.id === pincelInicioId);
    const end = vertices.findIndex((v) => v.id === id);

    if (start < 0 || end < 0) {
      setPincelInicioId(null);
      return;
    }

    const indices: number[] = [];
    if (start === end) {
      indices.push(start);
    } else {
      let curr = start;
      const maxIter = vertices.length + 1; // guarda contra loop infinito se vértice for apagado entre cliques
      let iter = 0;
      while (curr !== end && iter < maxIter) {
        indices.push(curr);
        curr = (curr + 1) % vertices.length;
        iter++;
      }
    }

    const idsToPaint = indices.map((idx) => vertices[idx].id);
    snap();
    setVertices((vs) => vs.map((v) => idsToPaint.includes(v.id) ? { ...v, representacao: tipoDivisaPincel } : v));
    setPincelInicioId(null);
    aviso(`Divisa "${tipoDivisaPincel.toUpperCase()}" pintada em ${indices.length} segmento(s).`);
  }

  // Pintar confrontante: aplica o confrontante selecionado aos segmentos do perímetro.
  // Suporta processo de 2 cliques: seleciona o primeiro vértice e depois o final para pintar todos os segmentos no caminho.
  function pintarConfrontante(id: string) {
    if (!confrontantePincelId) { aviso('Escolha (ou crie) um confrontante para pintar.'); return; }
    
    if (!pincelInicioId) {
      setPincelInicioId(id);
      aviso('Vértice inicial selecionado. Clique no próximo vértice para pintar o trecho.');
      return;
    }

    const start = vertices.findIndex((v) => v.id === pincelInicioId);
    const end = vertices.findIndex((v) => v.id === id);

    if (start < 0 || end < 0) {
      setPincelInicioId(null);
      return;
    }

    const indices: number[] = [];
    if (start === end) {
      indices.push(start);
    } else {
      let curr = start;
      const maxIter = vertices.length + 1; // guarda contra loop infinito se vértice for apagado entre cliques
      let iter = 0;
      while (curr !== end && iter < maxIter) {
        indices.push(curr);
        curr = (curr + 1) % vertices.length;
        iter++;
      }
    }

    snap();
    setConfrontantePorLado((m) => {
      const updated = { ...m };
      indices.forEach((idx) => {
        updated[idx] = confrontantePincelId;
      });
      return updated;
    });
    setPincelInicioId(null);
    aviso(`Confrontante aplicado em ${indices.length} segmento(s).`);
  }

  // Cria um confrontante novo já como pincel ativo (nome preenchível depois na aba Confront.).
  async function novoConfrontantePincel() {
    const nome = (await perguntar({ titulo: 'Novo confrontante', mensagem: 'Nome do confrontante (pode completar depois):' })) ?? '';
    const id = `c_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)}`;
    setConfrontantes((cs) => [...cs, { id, nome: nome.trim(), cpf: '', matricula: '', cns: '' }]);
    setConfrontantePincelId(id);
    setModo('confrontante');
  }


  // ---------- exportações ----------
  // Garante que todos os vértices tenham código SIGEF antes de exportar (peça sem código é
  // inválida). Se faltar, renumera provisoriamente e devolve os vértices já com código.
  async function comCodigos(): Promise<Vertex[]> {
    if (vertices.length > 0 && vertices.every((v) => v.codigoSigef)) return vertices;
    const tec = tecnico ?? carregarTecnico();
    const cont = await lerContadores(tec.credenciamentoIncra, tec).catch(() => semente(tec.credenciamentoIncra, tec));
    const vs = atribuirProvisorio(vertices, cont);
    setVertices(vs);
    return vs;
  }

  async function verificarConciliacaoSigef(): Promise<boolean> {
    if (!imovel.areaSigefHa || !imovel.perimetroSigef) {
      return new Promise<'exportar' | 'voltar' | 'conciliar'>((resolve) => {
        setAvisoReconciliarResolve(() => resolve);
        setAvisoReconciliarAberto(true);
      }).then((opcao) => {
        if (opcao === 'exportar') {
          return true;
        } else if (opcao === 'conciliar') {
          setExplicacaoReconciliarAberta(true);
          setPainelAberto(true);
          setAba('imovel');
          return false;
        } else {
          return false;
        }
      });
    }
    return true;
  }

  /**
   * Verifica se o projeto está pronto para gerar uma peça oficial. Problema GRAVE (geometria
   * incompleta ou código de vértice repetido) TRAVA de verdade, sem opção de ignorar — o SIGEF
   * rejeitaria mesmo. Problema leve (campo de cadastro faltando, CPF com cara de inválido) só
   * avisa, com opção de prosseguir.
   */
  async function verificarProntoParaExportar(): Promise<boolean> {
    const prefs = carregarPreferencias();
    const { ok, problemas, graves } = conferirProntoParaExportar(imovel, vertices, confrontantes, tecnico, confrontantePorLado, { exigirConjuge: prefs.exigirConjuge, exigirCns: prefs.exigirCns });
    if (ok) return true;
    // Trava de verdade só quando o usuário mantém "bloquear exportação incompleta" ligado (padrão).
    // Desligado nos Ajustes, um problema grave vira aviso e ele pode prosseguir por conta própria.
    if (graves.length > 0 && prefs.bloquearExportacaoIncompleta) {
      await avisar({ titulo: 'Não dá para exportar ainda', mensagem: `Há um problema grave que o SIGEF rejeitaria:\n\n• ${graves.join('\n• ')}\n\nCorrija antes de tentar de novo.` });
      return false;
    }
    return confirmar({ titulo: 'Faltam dados — exportar assim mesmo?', mensagem: `Antes de exportar, notei que faltam:\n\n• ${problemas.join('\n• ')}`, okLabel: 'Exportar assim mesmo', cancelLabel: 'Voltar e completar' });
  }

  async function exportarMemorial(modo: 'normal' | 'servidao' = 'normal') {
    if (!tecnico || vertices.length < 3) { aviso('Importe pontos primeiro.'); return; }
    if (!(await verificarConciliacaoSigef())) return;
    if (!(await verificarProntoParaExportar())) return;
    try {
      const vs = await comCodigos();
      const r = calcular(vs, confrontantePorLado);
      const blobBruto = await gerarMemorialDocx({ res: r, imovel, tecnico, confrontantes, confrontantePorLado, dataExtenso: dataPorExtenso(), requerente, transmitente, zonaUtm: zona, modo });
      const blob = await compatibilizarWord2007(blobBruto);
      const sufixo = glebas.length > 1 ? ` - ${glebaAtivaNome}` : '';
      const prefixo = modo === 'servidao' ? 'Memorial de servidao' : 'Memorial';
      saveAs(blob, `${prefixo} - ${imovel.denominacao || nomeProjeto || 'imovel'}${sufixo}.docx`);
      setBaixou((b) => ({ ...b, memorial: true }));
    } catch (e) { aviso((e as Error).message || 'Erro ao gerar o memorial.'); }
  }

  async function exportarOds() {
    if (!tecnico || vertices.length < 3) { aviso('Importe pontos primeiro.'); return; }
    if (!(await verificarProntoParaExportar())) return;
    const tec = tecnico;
    try {
      // usa o modelo SIGEF do usuário, se ele substituiu; senão, o modelo embutido do sistema
      const modeloProprio = carregarModeloSigef();
      const tpl: ArrayBuffer = modeloProprio !== null ? modeloProprio : await fetch('/templates/sigef.ods').then((rr) => rr.arrayBuffer());
      if (glebas.length > 1) {
        // Multi-gleba: registra os pontos de todas (códigos únicos entre parcelas) e gera uma
        // aba perimetro_N por gleba.
        setProcessando(true);
        const id = projetoId ?? novoId();
        const gs = sincronizarGlebas();
        const registradas: Gleba[] = [];
        for (const g of gs) {
          if (g.vertices.length < 3) { registradas.push(g); continue; }
          const r = await registrarPontos(g.vertices, tec.credenciamentoIncra, id, zona, hemisferio, tec);
          registradas.push({ ...g, vertices: r.vertices });
        }
        setGlebas(registradas);
        const ativa = registradas.find((g) => g.id === glebaAtivaId);
        if (ativa) setVertices(ativa.vertices);
        const glebasSigef = registradas.filter((g) => g.vertices.length >= 3).map((g) => ({
          res: calcular(g.vertices, g.confrontantePorLado),
          confrontantes: g.confrontantes, confrontantePorLado: g.confrontantePorLado,
          denominacao: g.denominacao, parcela: g.parcela,
        }));
        const nome = imovel.denominacao || nomeProjeto || 'imovel';
        // escolha: uma planilha com várias abas, ou planilhas separadas (zip)
        const unica = await confirmar({
          titulo: 'Planilha SIGEF',
          mensagem: `Planilha SIGEF com ${glebasSigef.length} glebas: gerar uma planilha única (uma aba por gleba) ou planilhas separadas num .zip?`,
          okLabel: 'Planilha única', cancelLabel: 'Separadas (.zip)',
        });
        if (unica) {
          const blob = await gerarSigefOds({ templateBytes: tpl, res: glebasSigef[0].res, imovel, tecnico: tec, confrontantes: glebasSigef[0].confrontantes, confrontantePorLado: glebasSigef[0].confrontantePorLado, glebas: glebasSigef });
          saveAs(blob, `SIGEF - ${nome} (${glebasSigef.length} glebas).ods`);
        } else {
          const zip = await gerarSigefOdsSeparadas(tpl, imovel, tec, glebasSigef);
          saveAs(zip, `SIGEF - ${nome} (${glebasSigef.length} planilhas).zip`);
        }
      } else {
        const vs = await comCodigos();
        const r = calcular(vs, confrontantePorLado);
        const ativa = glebas.find((g) => g.id === glebaAtivaId);
        const blob = await gerarSigefOds({
          templateBytes: tpl,
          res: r,
          imovel,
          tecnico: tec,
          confrontantes,
          confrontantePorLado,
          glebas: ativa ? [{
            res: r,
            confrontantes,
            confrontantePorLado,
            denominacao: ativa.denominacao || 'Parcela 1',
            parcela: ativa.parcela || '001'
          }] : undefined
        });
        saveAs(blob, `SIGEF - ${imovel.denominacao || nomeProjeto || 'imovel'}.ods`);
      }
      setBaixou((b) => ({ ...b, ods: true }));
    } catch (e) { aviso((e as Error).message || 'Erro ao gerar a planilha.'); }
    finally { setProcessando(false); }
  }

  async function exportarPlanta() {
    if (vertices.length < 3) { aviso('Importe pontos primeiro.'); return; }
    if (!(await verificarConciliacaoSigef())) return;
    if (!(await verificarProntoParaExportar())) return;
    await comCodigos();
    setVista('planta');
    setObjetoSelId(null); setDesenhoBuffer([]); // limpa realces de edição (a superfície de captura é invisível no PDF)
    aviso('Gerando PDF da planta…');
    setTimeout(() => {
      const svg = document.getElementById('planta-svg') as SVGSVGElement | null;
      if (!svg) { aviso('Abra a planta e tente de novo.'); return; }
      const xml = new XMLSerializer().serializeToString(svg);
      const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
      const img = new Image();
      img.onload = () => {
        const scale = 2;
        const canvas = document.createElement('canvas');
        canvas.width = 1587 * scale; canvas.height = 1123 * scale;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 420, 297);
        const sufixo = glebas.length > 1 ? ` - ${glebaAtivaNome}` : '';
        pdf.save(`Planta - ${imovel.denominacao || nomeProjeto || 'imovel'}${sufixo}.pdf`);
        setBaixou((b) => ({ ...b, planta: true }));
        aviso('PDF da planta gerado.');
      };
      img.onerror = () => { URL.revokeObjectURL(url); aviso('Não consegui rasterizar a planta.'); };
      img.src = url;
    }, 450);
  }

  // Gera o PDF da planta como Blob (mesma rasterização do exportarPlanta), sem baixar — pro pacote.
  function gerarPlantaPdfBlob(): Promise<Blob | null> {
    return new Promise((resolve) => {
      setVista('planta'); setObjetoSelId(null); setDesenhoBuffer([]);
      setTimeout(() => {
        const svg = document.getElementById('planta-svg') as SVGSVGElement | null;
        if (!svg) { resolve(null); return; }
        const xml = new XMLSerializer().serializeToString(svg);
        const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
        const img = new Image();
        img.onload = () => {
          const scale = 2;
          const canvas = document.createElement('canvas');
          canvas.width = 1587 * scale; canvas.height = 1123 * scale;
          const ctx = canvas.getContext('2d')!;
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);
          const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 420, 297);
          resolve(pdf.output('blob'));
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
        img.src = url;
      }, 500);
    });
  }

  // Pacote de entrega num clique: memorial + planilha SIGEF + requerimento + planta (PDF), num zip só.
  async function baixarPacoteEntrega() {
    if (!tecnico || vertices.length < 3) { aviso('Importe pontos primeiro.'); return; }
    if (!(await verificarConciliacaoSigef())) return;
    if (!(await verificarProntoParaExportar())) return;
    setProcessando(true);
    aviso('Montando o pacote de entrega (memorial, planilha, requerimento e planta)…');
    try {
      const vs = await comCodigos();
      const r = calcular(vs, confrontantePorLado);
      const ef = valoresEfetivos(r, imovel);
      const nome = imovel.denominacao || nomeProjeto || 'imovel';
      const memorialBruto = await gerarMemorialDocx({ res: r, imovel, tecnico, confrontantes, confrontantePorLado, dataExtenso: dataPorExtenso(), requerente, transmitente });
      const memorial = await compatibilizarWord2007(memorialBruto);
      const modeloProprio = carregarModeloSigef();
      const tpl: ArrayBuffer = modeloProprio !== null ? modeloProprio : await fetch('/templates/sigef.ods').then((rr) => rr.arrayBuffer());
      const ativa = glebas.find((g) => g.id === glebaAtivaId);
      const ods = await gerarSigefOds({
        templateBytes: tpl,
        res: r,
        imovel,
        tecnico,
        confrontantes,
        confrontantePorLado,
        glebas: ativa ? [{
          res: r,
          confrontantes,
          confrontantePorLado,
          denominacao: ativa.denominacao || 'Parcela 1',
          parcela: ativa.parcela || '001'
        }] : undefined
      });
      // se requerente/transmitente ainda não foram preenchidos, cai no proprietário do imóvel
      const propComoParte: PessoaQualificada = { ...PESSOA_VAZIA, nome: imovel.proprietario || '—', cpf: imovel.cpfProprietario || '', cidadeUf: imovel.municipio || '' };
      const padroes = carregarPadroes();
      const comarca = padroes.comarcaPadrao || imovel.municipio || '—';
      const requerimentoBruto = await gerarRequerimentoDocx({ imovel, tecnico, requerente: requerente ?? propComoParte, transmitente: transmitente ?? propComoParte, areaRealHa: ef.areaHa, dataExtenso: dataPorExtenso(), tipoAto, partesAdicionais, comarca });
      const requerimento = await compatibilizarWord2007(requerimentoBruto);
      const planta = await gerarPlantaPdfBlob();
      const zip = new JSZip();
      zip.file(`Memorial - ${nome}.docx`, memorial);
      zip.file(`SIGEF - ${nome}.ods`, ods);
      zip.file(`Requerimento - ${nome}.docx`, requerimento);
      if (planta) zip.file(`Planta - ${nome}.pdf`, planta);
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, `Pacote de entrega - ${nome}.zip`);
      setBaixou((b) => ({ ...b, memorial: true, ods: true, req: true, planta: planta ? true : b.planta }));
      aviso(planta ? 'Pacote de entrega gerado com todas as peças.' : 'Pacote gerado (a planta falhou ao rasterizar — gere-a à parte).');
    } catch (e) { aviso((e as Error).message || 'Erro ao montar o pacote.'); }
    finally { setProcessando(false); }
  }

  async function importarReferenciaGeoJson(file: File) {
    try {
      const texto = await file.text();
      const { aneis, geografico } = importarGeoJsonAneis(texto);
      if (!aneis.length) { aviso('Nenhum polígono encontrado no GeoJSON.'); return; }
      const refs = aneis.map((anel) => anel.map((p) => {
        if (geografico) { const lat = p.y, lon = p.x; const u = geoParaUtm(lat, lon, zona, hemisferio); return { lat, lon, leste: u.leste, norte: u.norte }; }
        const leste = p.x, norte = p.y; const g = utmParaGeo(leste, norte, zona, hemisferio); return { lat: g.lat, lon: g.lon, leste, norte };
      }));
      setReferencias(refs);
      aviso(`${refs.length} parcela(s) de referência importada(s). Ligue o snap para encostar nos pontos certificados.`);
    } catch { aviso('GeoJSON inválido.'); }
  }

  // Importa um SHAPEFILE (.zip com shp/shx/dbf/prj, ou um .shp solto). As geometrias entram como
  // referência tracejada ao lado do desenho (alvo de snap), igual ao GeoJSON. O fuso vem do .prj
  // quando existe; senão usa o fuso atual do projeto.
  async function importarShapefileRef(file: File) {
    try {
      const buf = await file.arrayBuffer();
      const lido = file.name.toLowerCase().endsWith('.zip') ? await importarShapefileZip(buf) : lerShp(buf);
      if (!lido.aneis.length) { aviso('Nenhuma geometria encontrada no shapefile.'); return; }
      const z = lido.zona ?? zona, h = lido.hemisferio ?? hemisferio;
      const isGeografico = lido.aneis.some((anel) => anel.some((p) => Math.abs(p.leste) <= 180 && Math.abs(p.norte) <= 90));
      const refs = lido.aneis.map((anel) => anel.map((p) => {
        if (isGeografico) {
          const lat = p.norte, lon = p.leste;
          const u = geoParaUtm(lat, lon, z, h);
          return { lat, lon, leste: u.leste, norte: u.norte };
        } else {
          const g = utmParaGeo(p.leste, p.norte, z, h);
          return { lat: g.lat, lon: g.lon, leste: p.leste, norte: p.norte };
        }
      }));
      setReferencias(refs);
      aviso(`${refs.length} geometria(s) do shapefile importada(s) como referência (fuso ${z}${h}). Ligue o snap para encostar nos pontos.`);
    } catch (e) { aviso('Não consegui ler o shapefile: ' + ((e as Error).message || 'arquivo inválido')); }
  }

  // Importa parcelas certificadas (GeoJSON do INCRA/SIGEF): desenha ao lado, e as que ENCOSTAM na
  // nossa divisa viram confrontantes automaticamente (dados + vértices encaixados).
  // Importa o arquivo de vértices de um imóvel VIZINHO já certificado (baixado manualmente pelo
  // agrimensor do Distribuidor de Coordenadas do Acervo Fundiário — exige o login gov.br dele,
  // por isso não dá pra automatizar). Compara cada vértice do arquivo com os do NOSSO perímetro
  // por proximidade; os que baterem ADOTAM o código oficial do vizinho (e ficam marcados como já
  // registrados, para o sistema nunca reescrever nem tentar registrar esse código de novo).
  async function importarVerticesVizinho(file: File) {
    const TOL_M = 2; // mesma tolerância usada no snap de vértice
    try {
      const texto = await file.text();
      const cfg = carregarImportVerticesVizinho();
      const origem = file.name.replace(/\.[^.]+$/, '');
      const lidos: VerticeVizinho[] = parseVerticesVizinho(texto, cfg, zona, hemisferio)
        .filter((l) => l.nome)
        .map((l) => {
          const u = geoParaUtm(l.lat, l.lon, zona, hemisferio);
          return {
            nome: l.nome, lat: l.lat, lon: l.lon, leste: u.leste, norte: u.norte,
            ...(l.elevacao != null ? { elevacao: l.elevacao } : {}),
            ...(l.sigmaX != null ? { sigmaX: l.sigmaX } : {}),
            ...(l.sigmaY != null ? { sigmaY: l.sigmaY } : {}),
            ...(l.metodo ? { metodo: l.metodo } : {}),
            origem,
          };
        });
      if (!lidos.length) { aviso('Nenhum vértice com nome/código reconhecido neste arquivo. Confira o mapeamento de colunas em Configurações → Importação e Modelos.'); return; }

      // GUARDA os vértices do vizinho no projeto (dedupe por nome + coordenada ~1 cm), para desenhar
      // na planta e servir de encaixe — mesmo os que estão perto mas não encostam no nosso perímetro.
      let guardados = 0;
      setVerticesVizinho((prev) => {
        const chave = (p: VerticeVizinho) => `${p.nome}|${p.leste.toFixed(2)}|${p.norte.toFixed(2)}`;
        const vistos = new Set(prev.map(chave));
        const add = lidos.filter((l) => !vistos.has(chave(l)));
        guardados = add.length;
        return [...prev, ...add];
      });

      // Continua ADOTANDO a coordenada/código oficial nos meus vértices que estão colados (até 2 m).
      let adotados = 0;
      const novos = vertices.map((v) => {
        let melhor: VerticeVizinho | null = null, melhorD = TOL_M;
        for (const l of lidos) {
          const d = Math.hypot(l.leste - v.leste, l.norte - v.norte);
          if (d < melhorD) { melhorD = d; melhor = l; }
        }
        if (!melhor) return v;
        adotados++;
        return { ...v, codigoSigef: melhor.nome, nome: melhor.nome, codigoCampo: melhor.nome, registrado: true };
      });
      if (adotados) { snap(); setVertices(novos); }
      setSnapAtivo(true); // deixa o encaixe ligado: arrastar um vértice meu gruda no ponto do vizinho

      const partes = [];
      if (guardados) partes.push(`${guardados} vértice(s) do vizinho guardado(s) para a planta`);
      if (adotados) partes.push(`${adotados} do seu perímetro adotaram o código oficial`);
      aviso(partes.length ? `${partes.join('; ')}.` : 'Esses vértices do vizinho já estavam guardados.');
    } catch { aviso('Não consegui ler o arquivo de vértices do vizinho.'); }
  }

  async function importarVizinhosCertificados(file: File) {
    try {
      const texto = await file.text();
      let parcelas = parseParcelasSigef(texto);
      if (!parcelas.length) {
        parcelas = parseGmlParcelas(texto);
      }
      if (!parcelas.length) { aviso('Nenhuma parcela certificada encontrada no arquivo (aceita GeoJSON e GML do SIGEF).'); return; }
      setReferencias(parcelasParaReferencias(parcelas, zona, hemisferio));
      const meuAnel = vertices.map((v) => ({ lat: v.lat, lon: v.lon }));
      const vizinhas = vertices.length >= 3 ? parcelasVizinhas(meuAnel, parcelas, 15) : [];
      const novos = confrontantesDeVizinhas(vizinhas);
      if (novos.length) {
        snap();
        setConfrontantes((cs) => {
          const nomes = new Set(cs.map((c) => c.nome.trim().toUpperCase()).filter(Boolean));
          return [...cs, ...novos.filter((c) => !nomes.has(c.nome.trim().toUpperCase()))];
        });
        setSnapAtivo(true);
      }
      setSigefStatus('enviado');
      aviso(`${parcelas.length} parcela(s) desenhada(s) ao lado; ${novos.length} vizinho(s) viraram confrontantes. Use "pintar confrontante" para marcar os lados.`);
    } catch { aviso('Não consegui ler o arquivo de parcelas certificadas.'); }
  }

  // Importa automaticamente os vizinhos certificados do INCRA (por bbox, via rota de servidor).
  // Consulta MG e ES (região de fronteira) e fica só com os que ENCOSTAM no nosso imóvel.
  async function importarVizinhosAuto() {
    if (vertices.length < 3) { aviso('Importe os pontos do imóvel primeiro, depois busque os vizinhos.'); return; }
    setSigefStatus((s) => (s === 'enviado' ? s : 'clicado'));
    setProcessando(true);
    aviso('Buscando imóveis vizinhos certificados no INCRA…');
    try {
      const lats = vertices.map((v) => v.lat), lons = vertices.map((v) => v.lon);
      const mrg = 0.01; // ~1 km de folga ao redor do imóvel
      const minLon = Math.min(...lons) - mrg, minLat = Math.min(...lats) - mrg;
      const maxLon = Math.max(...lons) + mrg, maxLat = Math.max(...lats) + mrg;
      const bbox = `${minLon},${minLat},${maxLon},${maxLat}`;
      // só consulta as UFs (MG/ES/RJ) cujo retângulo cobre a região, e os temas certificados
      const ufs = ufsNoBbox(minLon, minLat, maxLon, maxLat);
      const ufsAlvo = ufs.length ? ufs : INCRA_UFS.slice();
      const todas: import('@/lib/io/sigefVizinhos').ParcelaSigef[] = [];
      for (const uf of ufsAlvo) {
        for (const base of TEMAS_CONFRONTANTE) {
          try {
            const r = await fetch(`/api/vizinhos-sigef?tema=${temaIncra(base, uf)}&bbox=${encodeURIComponent(bbox)}`);
            const j = await r.json();
            if (Array.isArray(j.parcelas)) todas.push(...j.parcelas);
          } catch { /* tenta o próximo tema/UF */ }
        }
      }
      if (!todas.length) { aviso('Nenhuma parcela certificada na região (ou INCRA indisponível). Tente o import manual.'); return; }
      const meuAnel = vertices.map((v) => ({ lat: v.lat, lon: v.lon }));
      const vizinhas = parcelasVizinhas(meuAnel, todas, 15);
      if (!vizinhas.length) { aviso(`${todas.length} parcela(s) na região, mas nenhuma encostando no imóvel.`); return; }
      setReferencias((prev) => [...prev, ...parcelasParaReferencias(vizinhas, zona, hemisferio)]);
      setParcelasCert((prev) => [...prev, ...vizinhas.map((p) => ({
        anel: p.anel.map((q) => [q.lat, q.lon] as [number, number]),
        info: {
          titulo: p.denominacao || 'Imóvel certificado SIGEF',
          linhas: [
            p.codigoImovel ? `Código INCRA: ${p.codigoImovel}` : '',
            p.matricula ? `Matrícula: ${p.matricula}` : '',
            p.municipio ? `Cód. município (IBGE): ${p.municipio}` : '',
          ].filter(Boolean),
        },
      }))]);
      const novos = confrontantesDeVizinhas(vizinhas);
      snap();
      setConfrontantes((cs) => {
        const nomes = new Set(cs.map((c) => c.nome.trim().toUpperCase()).filter(Boolean));
        return [...cs, ...novos.filter((c) => !nomes.has(c.nome.trim().toUpperCase()))];
      });
      setSnapAtivo(true);
      setSigefStatus('enviado');
      aviso(`${vizinhas.length} vizinho(s) certificado(s) encontrado(s) e desenhado(s). Use "pintar confrontante" para marcar os lados.`);
    } catch {
      aviso('Não consegui consultar o INCRA agora. Use o import manual (arquivo GeoJSON).');
    } finally { setProcessando(false); }
  }

  // Exporta os shapefiles do CAR: o perímetro do imóvel + cada camada ambiental (APP, reserva legal,
  // vegetação, uso consolidado) desenhada, num zip. É a base da entrega pro SICAR (o formato de
  // campos exato do SICAR se ajusta quando o dono trouxer um CAR de referência).
  async function exportarCarShapefiles() {
    const camadas: { nome: string; pontos: { leste: number; norte: number }[] }[] = [];
    if (vertices.length >= 3) camadas.push({ nome: 'imovel', pontos: vertices.map((v) => ({ leste: v.leste, norte: v.norte })) });
    for (const t of CAR_TEMAS) {
      for (const o of objetos.filter((o) => o.tipo === 'polilinha' && o.carTema === t.chave && o.pontos.length >= 3)) {
        camadas.push({ nome: t.chave, pontos: o.pontos.map((p) => ({ leste: p.leste, norte: p.norte })) });
      }
    }
    if (!camadas.length) { aviso('Desenhe ao menos o perímetro do imóvel ou uma camada CAR primeiro.'); return; }
    setProcessando(true);
    try {
      const externo = new JSZip();
      let i = 0;
      for (const c of camadas) {
        const nomeArq = `${c.nome}_${++i}`;
        const blob = await gerarShapefileZip(c.pontos, { zona, hemisferio, nome: nomeArq, formato: 'geo' });
        const interno = await JSZip.loadAsync(await blob.arrayBuffer());
        for (const fn of Object.keys(interno.files)) {
          const ext = fn.split('.').pop();
          externo.file(`${nomeArq}.${ext}`, await interno.file(fn)!.async('arraybuffer'));
        }
      }
      const out = await externo.generateAsync({ type: 'blob' });
      saveAs(out, `CAR shapefiles - ${imovel.denominacao || nomeProjeto || 'imovel'}.zip`);
      aviso(`Shapefiles do CAR gerados (${camadas.length} camada(s)).`);
    } catch (e) { aviso('Erro ao gerar os shapefiles: ' + ((e as Error).message || 'erro')); }
    finally { setProcessando(false); }
  }

  async function gerarSituacaoPlanta() {
    if (vertices.length < 3) { aviso('Importe pontos primeiro.'); return; }
    aviso('Buscando satélite da situação…');
    // todas as glebas (a ativa primeiro), para a situação mostrar mais de um polígono; e também os
    // polígonos DESENHADOS (polilinha fechada/preenchida) — assim um polígono novo aparece na situação.
    const aneis = [
      vertices.map((v) => ({ lat: v.lat, lon: v.lon })),
      ...glebas.filter((g) => g.id !== glebaAtivaId).map((g) => g.vertices.map((v) => ({ lat: v.lat, lon: v.lon }))),
      ...objetos.filter((o) => o.tipo === 'polilinha' && o.preenchido && o.pontos.length >= 3).map((o) => o.pontos.map((p) => ({ lat: p.lat, lon: p.lon }))),
    ];
    const url = await gerarSituacao(aneis);
    if (url) {
      setSituacaoUrl(url);
      setSituacaoVersSnapshot(JSON.stringify(vertices));
      // guarda no projeto pra não precisar recapturar ao reabrir (limite: cabe no doc da nuvem)
      setPlantaConfig((c) => ({ ...c, situacaoDataUrl: url.length < 700_000 ? url : undefined }));
      aviso('Planta de situação atualizada.');
    } else {
      // NÃO apaga a situação anterior quando a rebusca falha (antes zerava e a imagem sumia)
      aviso('Não consegui atualizar o satélite agora (rede/CORS). A situação anterior foi mantida — tente de novo.');
    }
  }

  function obterEscalaEfetiva(): number {
    if (plantaConfig.escalaManual && plantaConfig.escalaManual > 0) {
      return plantaConfig.escalaManual;
    }
    if (vertices.length < 3) return 1000;

    const outras = glebas.filter((g) => g.id !== glebaAtivaId);
    const outrasPts = outras.flatMap((g) => g.vertices ?? []);
    const xs = [...vertices.map((v) => v.leste), ...outrasPts.map((p) => p.leste)];
    const ys = [...vertices.map((v) => v.norte), ...outrasPts.map((p) => p.norte)];
    let minX = Math.min(...xs), maxX = Math.max(...xs);
    let minY = Math.min(...ys), maxY = Math.max(...ys);

    const padX = (maxX - minX) * 0.15 || 10;
    const padY = (maxY - minY) * 0.15 || 10;
    minX -= padX; maxX += padX; minY -= padY; maxY += padY;

    const areaW = 1091 - 95; // 996
    const areaH = 887 - 26; // 861
    const escalaFit = Math.min(areaW / (maxX - minX), areaH / (maxY - minY));
    const denomNatural = 1 / (escalaFit * 0.0002645);

    const TABELA = [250, 500, 750, 1000, 1500, 2000, 2500, 4000, 5000, 7500, 10000, 15000, 20000, 25000, 50000, 100000];
    return TABELA.find((d) => d >= denomNatural) ?? Math.ceil(denomNatural / 10000) * 10000;
  }

  function alterarEscala(delta: number) {
    const atual = obterEscalaEfetiva();
    const arredondado = Math.round(atual / 250) * 250;
    const nova = Math.max(250, arredondado + delta);
    setPlantaConfig((c) => ({ ...c, escalaManual: nova }));
  }

  async function exportarDxf() {
    if (vertices.length < 3) { aviso('Importe pontos primeiro.'); return; }
    const vs = await comCodigos();
    const dxf = gerarDxf(
      vs.map((v) => ({ leste: v.leste, norte: v.norte, codigoSigef: v.codigoSigef, tipo: v.tipo })),
      { zona, hemisferio, titulo: imovel.denominacao || nomeProjeto }
    );
    const sufixo = glebas.length > 1 ? ` - ${glebaAtivaNome}` : '';
    saveAs(new Blob([dxf], { type: 'application/dxf' }), `${imovel.denominacao || nomeProjeto || 'desenho'}${sufixo}.dxf`);
  }

  // Baixa o polígono de uma parcela certificada (importada do SIGEF) como DXF.
  function baixarDxfParcela(idx: number) {
    const pc = parcelasCert[idx];
    if (!pc || pc.anel.length < 3) { aviso('Parcela sem contorno para exportar.'); return; }
    const vs = pc.anel.map(([lat, lon], i) => {
      const u = geoParaUtm(lat, lon, zona, hemisferio);
      return { leste: u.leste, norte: u.norte, codigoSigef: `V${String(i + 1).padStart(2, '0')}`, tipo: 'M' as const };
    });
    const dxf = gerarDxf(vs, { zona, hemisferio, titulo: pc.info.titulo });
    const nome = (pc.info.titulo || 'parcela-sigef').replace(/[^\w.-]+/g, '_');
    saveAs(new Blob([dxf], { type: 'application/dxf' }), `${nome}.dxf`);
    aviso('DXF da parcela certificada baixado.');
  }

  // Baixa o polígono de uma parcela certificada como Shapefile (.zip com shp/shx/dbf/prj).
  async function baixarShapefileParcela(idx: number) {
    const pc = parcelasCert[idx];
    if (!pc || pc.anel.length < 3) { aviso('Parcela sem contorno para exportar.'); return; }
    const pts = pc.anel.map(([lat, lon]) => geoParaUtm(lat, lon, zona, hemisferio));
    const nome = (pc.info.titulo || 'parcela-sigef').replace(/[^\w.-]+/g, '_');
    const blob = await gerarShapefileZip(pts, { zona, hemisferio, nome });
    saveAs(blob, `${nome}-shapefile.zip`);
    aviso('Shapefile da parcela certificada baixado.');
  }

  async function importarDxfArquivo(file: File) {
    if (processando) return;
    setProcessando(true);
    try {
      const texto = await file.text();
      let anel = anelDeDxf(importarDxf(texto));
      if (!anel || anel.length < 3) { aviso('Não encontrei um perímetro no DXF (nem como polilinha, nem como linhas soltas conectadas pelas pontas).'); return; }
      // remove ponto de fechamento duplicado, se houver
      const f = anel[0], l = anel[anel.length - 1];
      if (Math.hypot(f.x - l.x, f.y - l.y) < 0.01) anel = anel.slice(0, -1);
      const tec = tecnico ?? carregarTecnico();
      // fuso automático por região (igual ao TXT), a partir do 1º ponto do DXF
      const z = detectarFusoPorRegiao(anel[0].x, anel[0].y, hemisferio, tec.fusosPermitidos ?? [18, 19, 20, 21, 22, 23, 24, 25]).zona;
      setZona(z);
      const cont = await lerContadores(tec.credenciamentoIncra, tec).catch(() => semente(tec.credenciamentoIncra, tec));
      let vs: Vertex[] = anel.map((p) => {
        const { lat, lon } = utmParaGeo(p.x, p.y, z, hemisferio);
        return { ...novoVertice({ lat, lon, leste: p.x, norte: p.y, elevacao: 0 }), metodo: tec.metodoPosicionamento, tipoLimite: tec.tipoLimite, representacao: 'linha-ideal' };
      });
      vs = atribuirProvisorio(iniciarDoNorteHorario(vs), cont);
      const { confrontantes: cs, confrontantePorLado: mapa } = montarConfrontantes(vs);
      const alvoId = glebaAtivaId;
      setGlebas((prev) => prev.map((g) => (g.id === alvoId ? { ...g, vertices: vs, confrontantes: cs, confrontantePorLado: mapa } : g)));
      setVertices(vs); setConfrontantes(cs); setConfrontantePorLado(mapa);
      setCentralizarSig((n) => n + 1); // enquadra o desenho importado do DXF

      if (!nomeProjeto) {
        const auto = gerarTituloAutomatico(imovel);
        setNomeProjeto(auto || file.name.replace(/\.[^.]+$/, ''));
        setNomeProjetoManual(false);
      }
      aviso(`${vs.length} vértices importados do DXF na ${glebaAtivaNome} (fuso ${z}${hemisferio}).`);
    } finally { setProcessando(false); }
  }

  // ---------- projetos ----------
  async function salvar() {
    if (processando) return;
    setProcessando(true);
    try {
      const id = projetoId ?? novoId();
      const tec = tecnico ?? carregarTecnico();
      // Registra os pontos de TODAS as glebas no banco (consome a numeração; nunca repete).
      // registrarPontos é ATÔMICO: se falhar, nada é consumido e os vértices ficam sem
      // registrado=true, então o próximo salvar tenta de novo sem duplicar.
      let gs = sincronizarGlebas();
      let registrou = true;
      try {
        const novas: Gleba[] = [];
        for (const g of gs) {
          const r = await registrarPontos(g.vertices, tec.credenciamentoIncra, id, zona, hemisferio, tec);
          novas.push({ ...g, vertices: r.vertices });
        }
        gs = novas;
        setGlebas(gs);
        const ativa = gs.find((g) => g.id === glebaAtivaId);
        if (ativa) {
          // FUSÃO por id: aplica código/registro aos vértices ATUAIS (preserva edições feitas
          // durante o await; não sobrescreve o estado de trabalho inteiro).
          const regById = new Map(ativa.vertices.map((v) => [v.id, v]));
          setVertices((cur) => cur.map((v) => {
            const r = regById.get(v.id);
            return r ? { ...v, codigoSigef: r.codigoSigef, registrado: r.registrado } : v;
          }));
        }
      } catch { registrou = false; }
      const p: Projeto = {
        id, nome: nomeProjeto || imovel.denominacao || 'Sem nome', criadoEm: Date.now(), atualizadoEm: Date.now(),
        imovel, glebas: gs, zonaUtm: zona, hemisferio, requerente, transmitente, tipoAto, partesAdicionais, plantaConfig, parcelasCert, verticesVizinho,
      };
      try {
        const destino = await salvarProjeto(p);
        setProjetoId(id);
        setSalvoOk(true); setSalvoNuvem(destino === 'nuvem'); // verde só se foi pro banco na nuvem
        ultimoSalvoSig.current = projSig; acabouDeSalvar.current = true; setSalvarLaranja(false);
        aviso(destino === 'nuvem'
          ? (registrou ? 'Projeto salvo na nuvem e pontos registrados.' : 'Projeto salvo na nuvem, mas falhou registrar os pontos — tente salvar de novo.')
          : 'Projeto salvo localmente (sem login/nuvem).');
        registrarProjetoSalvo(p.nome).catch(() => {}); // atualiza o perfil de uso (painel do titular)
      } catch (e) {
        setProjetoId(id);
        if (e instanceof NuvemSemPermissao) {
          // o projeto FOI salvo localmente (só a nuvem negou) — trabalho seguro, mas o botão fica
          // AMARELO (não verde) pra deixar claro que ainda não subiu pro banco
          setSalvoOk(true); setSalvoNuvem(false);
          ultimoSalvoSig.current = projSig; acabouDeSalvar.current = true; setSalvarLaranja(false);
          aviso('Salvo localmente. A nuvem negou: publique as regras do Firestore (firebase deploy --only firestore:rules).');
        } else {
          aviso('Não consegui salvar na nuvem: ' + ((e as Error).message || 'erro'));
        }
      }
      atualizarLista();
    } finally { setProcessando(false); }
  }
  async function salvarPropCadastro() {
    if (!imovel.proprietario) { aviso('Preencha o proprietário primeiro.'); return; }
    await cadProp.salvar({ id: '', nome: imovel.proprietario, cpf: imovel.cpfProprietario, tipoPessoa: imovel.tipoPessoa, projetoId: projetoId || undefined });
    cadProp.listar().then(setSugProp).catch(() => {});
    aviso('Proprietário salvo no cadastro.');
  }
  async function salvarConfCadastro(c: Confrontante) {
    if (!c.nome) { aviso('Preencha o nome do confrontante.'); return; }
    await cadConf.salvar({
      id: '', nome: c.nome, cpf: c.cpf, matricula: c.matricula, cns: c.cns, descricaoExtra: c.descricaoExtra,
      condicao: c.condicao, conjugeNome: c.conjugeNome, conjugeCpf: c.conjugeCpf,
      inventarianteNome: c.inventarianteNome, inventarianteCpf: c.inventarianteCpf,
      projetoId: projetoId || undefined
    });
    cadConf.listar().then(setSugConf).catch(() => {});
    aviso('Confrontante salvo no cadastro.');
  }

  // ---- "Consultar" (modal): trazer dados antigos para o projeto aberto, sem redigitar ----
  function inserirPropConsulta(p: ProprietarioCad) {
    setImovel((im) => ({ ...im, proprietario: p.nome, cpfProprietario: p.cpf, tipoPessoa: p.tipoPessoa ?? im.tipoPessoa }));
    aviso(`Proprietário "${p.nome}" inserido no imóvel.`);
  }
  function inserirConfConsulta(c: ConfrontanteCad) {
    const id = `c_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)}`;
    setConfrontantes((cs) => [...cs, {
      id, nome: c.nome, cpf: c.cpf, matricula: c.matricula, cns: c.cns, descricaoExtra: c.descricaoExtra,
      condicao: c.condicao, conjugeNome: c.conjugeNome, conjugeCpf: c.conjugeCpf,
      inventarianteNome: c.inventarianteNome, inventarianteCpf: c.inventarianteCpf,
    }]);
    aviso(`Confrontante "${c.nome}" adicionado.`);
  }
  function inserirImovelConsulta(i: ImovelCad) {
    setImovel((im) => ({ ...im, denominacao: i.denominacao, matricula: i.matricula, cns: i.cns, codigoImovelIncra: i.codigoImovelIncra, municipio: i.municipio }));
    if (i.municipio) aoMudarMunicipio(i.municipio); // ajusta o fuso pela âncora, se houver
    aviso(`Imóvel "${i.denominacao}" inserido.`);
  }
  function inserirCartorioConsulta(c: CartorioCad) {
    setImovel((im) => ({ ...im, cns: c.cns }));
    aviso(`Cartório "${c.nome}" (CNS ${c.cns}) inserido.`);
  }

  // ---- rascunho automático: não perder o trabalho ao recarregar (por usuário) ----
  function rascunhoKey() { return `metrica.rascunho:${user?.uid ?? 'local'}`; }
  function temConteudoTrabalho() {
    return vertices.length > 0 || glebas.some((g) => g.vertices.length > 0) || !!imovel.denominacao || !!imovel.proprietario || !!imovel.matricula;
  }
  function montarRascunho() {
    return { v: 1, projetoId, nome: nomeProjeto, nomeProjetoManual, imovel, glebas: sincronizarGlebas(), zona, hemisferio, requerente, transmitente, tipoAto, partesAdicionais, plantaConfig, glebaAtivaId, parcelasCert, verticesVizinho };
  }
  // Recria as referências tracejadas (desenho) a partir das parcelas certificadas gravadas —
  // usado ao reabrir/restaurar um projeto, para não precisar buscar de novo no INCRA.
  function referenciasDeParcelasCert(pc: Projeto['parcelasCert'], z: number, h: 'N' | 'S') {
    if (!pc?.length) return [];
    return parcelasParaReferencias(pc.map((p) => ({ anel: p.anel.map(([lat, lon]) => ({ lat, lon })) })), z, h);
  }
  function aplicarRascunho(d: ReturnType<typeof montarRascunho>): boolean {
    if (!d || !Array.isArray(d.glebas) || d.glebas.length === 0) return false;
    setProjetoId(d.projetoId ?? null);
    setNomeProjeto(d.nome ?? '');
    setNomeProjetoManual(!!d.nomeProjetoManual);
    if (d.imovel) setImovel(d.imovel);
    if (typeof d.zona === 'number') setZona(d.zona);
    if (d.hemisferio) setHemisferio(d.hemisferio);
    setRequerente(d.requerente);
    setTransmitente(d.transmitente);
    setTipoAto(d.tipoAto || 'venda');
    setPartesAdicionais(d.partesAdicionais || []);
    setPlantaConfig(d.plantaConfig ?? {});
    setGlebas(d.glebas);
    carregarGleba(d.glebas.find((g) => g.id === d.glebaAtivaId) ?? d.glebas[0]);
    setSituacaoUrl(d.plantaConfig?.situacaoDataUrl);
    if (d.plantaConfig?.situacaoDataUrl) {
      const gAtiva = d.glebas.find((g) => g.id === d.glebaAtivaId) ?? d.glebas[0];
      setSituacaoVersSnapshot(JSON.stringify(gAtiva.vertices));
    }
    const pc = d.parcelasCert ?? [];
    setParcelasCert(pc);
    setReferencias(referenciasDeParcelasCert(pc, d.zona, d.hemisferio));
    setVerticesVizinho(d.verticesVizinho ?? []);
    return true;
  }

  async function criarNovoProjeto() {
    // termo de aceite: pede na hora de CRIAR o projeto (não na 1ª abertura do app)
    if (!termosOk) { acaoAposTermos.current = () => { void criarNovoProjeto(); }; setTermosModalAberto(true); return; }
    if (temConteudoTrabalho()) {
      const ok = await confirmar({ titulo: 'Criar novo projeto', mensagem: 'Deseja SALVAR o projeto atual antes de criar um novo?', okLabel: 'Salvar e criar novo', cancelLabel: 'Descartar e criar novo' });
      if (ok) {
        await salvar();
      } else {
        const confirmarDescarte = await confirmar({ titulo: 'Descartar alterações', mensagem: 'Você escolheu não salvar. Deseja realmente DESCARTAR as alterações não salvas e iniciar um novo projeto?', okLabel: 'Descartar', perigo: true });
        if (!confirmarDescarte) return;
      }
    }
    // Limpa todos os estados para começar do zero
    setProjetoId(null);
    setNomeProjeto('');
    setNomeProjetoManual(false);
    // Projeto novo já nasce com os padrões de trabalho da empresa (Ajustes → Padrões & Backup).
    const pad = carregarPadroes();
    setImovel({
      denominacao: '',
      proprietario: '',
      cpfProprietario: '',
      tipoPessoa: 'Física',
      municipio: '',
      local: '',
      matricula: '',
      cns: '',
      codigoImovelIncra: '',
      naturezaServico: pad.naturezaServico || 'Georreferenciamento',
      situacao: 'Imóvel Registrado',
      naturezaArea: 'Particular',
      tipoImovel: pad.tipoImovel,
      tipoAzimute: pad.tipoAzimute,
    });
    setVertices([]);
    const novaGleba = novaGlebaVazia(1);
    setGlebas([novaGleba]);
    setGlebaAtivaId(novaGleba.id); // usa o ID real gerado, não o hardcoded '1'
    setConfrontantes([]);
    setConfrontantePorLado({});
    setReferencias([]);
    setParcelasCert([]);
    setVerticesVizinho([]);
    setSituacaoUrl(undefined);
    setObjetos([]);
    setPlantaConfig({});
    setObjetoSelId(null);
    setRequerente(undefined);
    setTransmitente(undefined);
    setTipoAto('venda');
    setPartesAdicionais([]);
    setSigefStatus('idle'); setBaixou({}); setSalvoOk(false);
    localStorage.removeItem(rascunhoKey());
    aviso('Novo projeto iniciado. Importe pontos para começar.');
    setTimeout(() => {
      fileRef.current?.click();
    }, 150);
  }

  // Carrega um projeto completo FICTÍCIO (demonstração). As peças saem marcadas como dados fictícios.
  async function carregarProjetoFicticio() {
    if (temConteudoTrabalho() && !(await confirmar({ titulo: 'Projeto de demonstração', mensagem: 'Carregar o projeto fictício de demonstração? O trabalho atual não salvo será descartado.', okLabel: 'Carregar demonstração' }))) return;
    const f = gerarProjetoFicticio();
    const gleba: Gleba = { ...novaGlebaVazia(1), denominacao: f.imovel.denominacao, vertices: f.vertices, confrontantes: f.confrontantes, confrontantePorLado: f.confrontantePorLado };
    setProjetoId(null);
    setNomeProjeto(f.nome); setNomeProjetoManual(true);
    setImovel(f.imovel);
    setZona(f.zona); setHemisferio(f.hemisferio);
    setRequerente(undefined); setTransmitente(undefined);
    setTipoAto('venda'); setPartesAdicionais([]);
    setParcelasCert([]); setReferencias([]); setVerticesVizinho([]); setSituacaoUrl(undefined);
    setPlantaConfig({});
    setSigefStatus('idle'); setBaixou({}); setSalvoOk(false);
    setGlebas([gleba]);
    carregarGleba(gleba);
    aviso('Projeto fictício carregado. Use para demonstração — todas as peças saem marcadas como DADOS FICTÍCIOS.');
  }

  async function converterPolilinhaEmPerimetro() {
    if (!objetoSelId) return;
    const o = objetos.find((x) => x.id === objetoSelId);
    if (!o || o.tipo !== 'polilinha' || o.pontos.length < 3) {
      await avisar({ titulo: 'Converter em perímetro', mensagem: 'Selecione uma polilinha com pelo menos 3 pontos para converter em perímetro.' });
      return;
    }
    if (await confirmar({ titulo: 'Substituir perímetro', mensagem: 'Deseja substituir o perímetro atual do imóvel por esta polilinha?', okLabel: 'Substituir' })) {
      snap();
      const novosVertices: Vertex[] = o.pontos.map((p, i) => {
        return {
          id: `v_${Date.now().toString(36)}_${i}`,
          lat: p.lat,
          lon: p.lon,
          leste: p.leste,
          norte: p.norte,
          tipo: 'P',
          // nome provisório no editor: P1, P2… (sem zeros à esquerda, sempre maiúsculo). O código
          // oficial do SIGEF é reatribuído por `recodificar` na hora de gerar a planilha/memorial.
          codigoSigef: `P${i + 1}`,
          isDivisa: false,
          ordem: i + 1,
          nome: `P${i + 1}`,
          codigoCampo: `P${i + 1}`,
          elevacao: 0,
        };
      });
      setVertices(novosVertices);
      setObjetos((os) => os.filter((x) => x.id !== objetoSelId));
      setObjetoSelId(null);
      aviso('Polilinha convertida em perímetro com sucesso!');
    }
  }

  // antes de importar um novo TXT, oferece salvar o trabalho atual (que será substituído)
  async function iniciarImportTxt() {
    if (!termosOk) { acaoAposTermos.current = () => { void iniciarImportTxt(); }; setTermosModalAberto(true); return; }
    if (temConteudoTrabalho()) {
      const ok = await confirmar({ titulo: 'Importar novo arquivo', mensagem: 'Há um trabalho em andamento. Deseja SALVÁ-LO como projeto antes de importar um novo arquivo?', okLabel: 'Salvar e importar', cancelLabel: 'Importar sem salvar' });
      if (ok) { await salvar(); }
    }
    fileRef.current?.click();
  }

  async function atualizarLista() { setProjetos(await listarProjetos()); totalPontosRegistrados().then(setTotalPontos).catch(() => {}); }
  async function abrir(id: string) {
    const p0 = await carregarProjeto(id);
    if (!p0) return;
    const p = migrarProjeto(p0); // projetos antigos (sem glebas) viram glebas[0]
    setProjetoId(p.id); setNomeProjeto(p.nome); setImovel(p.imovel);
    setNomeProjetoManual(true);
    setZona(p.zonaUtm); setHemisferio(p.hemisferio);
    setRequerente(p.requerente); setTransmitente(p.transmitente);
    setTipoAto((p as any).tipoAto || 'venda');
    setPartesAdicionais((p as any).partesAdicionais || []);
    setPlantaConfig(p.plantaConfig ?? {});
    setGlebas(p.glebas);
    carregarGleba(p.glebas[0]);
    // restaura a planta de situação salva (não precisa recapturar o satélite)
    setSituacaoUrl(p.plantaConfig?.situacaoDataUrl);
    if (p.plantaConfig?.situacaoDataUrl) setSituacaoVersSnapshot(JSON.stringify(p.glebas[0].vertices));
    const pc = p.parcelasCert ?? [];
    setParcelasCert(pc);
    setReferencias(referenciasDeParcelasCert(pc, p.zonaUtm, p.hemisferio));
    setVerticesVizinho(p.verticesVizinho ?? []);
    acabouDeSalvar.current = true; setSalvarLaranja(false); setSalvoOk(true); // recém-carregado = "salvo"
    aviso(`Projeto carregado (${p.glebas.length} gleba(s)).`);
  }
  async function remover(id: string) {
    if (!(await confirmarApagar('Excluir este projeto do banco de dados? Esta ação não pode ser desfeita.'))) return;
    await excluirProjeto(id); atualizarLista();
  }
  async function renomear(p: Projeto) {
    const novo = await perguntar({ titulo: 'Renomear projeto', mensagem: 'Novo nome do projeto:', valorInicial: p.nome });
    if (!novo || novo === p.nome) return;
    await salvarProjeto({ ...p, nome: novo });
    if (p.id === projetoId) setNomeProjeto(novo);
    atualizarLista();
  }

  function exportarProjetoAtualJson() {
    try {
      const proj: Projeto = {
        id: projetoId ?? novoId(),
        nome: nomeProjeto || imovel.denominacao || 'Projeto Sem Nome',
        criadoEm: Date.now(),
        atualizadoEm: Date.now(),
        imovel,
        glebas: sincronizarGlebas(),
        zonaUtm: zona,
        hemisferio,
        requerente,
        transmitente,
        plantaConfig
      };
      const data = JSON.stringify(proj, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      saveAs(blob, `Projeto - ${proj.nome}.json`);
      aviso('Backup do projeto exportado como arquivo JSON.');
    } catch {
      aviso('Erro ao exportar backup do projeto.');
    }
  }

  function importarProjetoJson(file: File) {
    setProcessando(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const rawProj = JSON.parse(text) as Projeto;
        if (!rawProj || (!Array.isArray(rawProj.glebas) && !Array.isArray(rawProj.vertices))) {
          throw new Error('Arquivo de projeto inválido ou corrompido.');
        }
        
        const proj = migrarProjeto(rawProj);
        
        setProjetoId(proj.id);
        setNomeProjeto(proj.nome);
        setNomeProjetoManual(true);
        if (proj.imovel) setImovel(proj.imovel);
        if (typeof proj.zonaUtm === 'number') setZona(proj.zonaUtm);
        if (proj.hemisferio) setHemisferio(proj.hemisferio);
        setRequerente(proj.requerente);
        setTransmitente(proj.transmitente);
        setPlantaConfig(proj.plantaConfig ?? {});
        setGlebas(proj.glebas);
        carregarGleba(proj.glebas[0]);
        setSituacaoUrl(proj.plantaConfig?.situacaoDataUrl);
        if (proj.plantaConfig?.situacaoDataUrl) setSituacaoVersSnapshot(JSON.stringify(proj.glebas[0].vertices));
        const pc = proj.parcelasCert ?? [];
        setParcelasCert(pc);
        setReferencias(referenciasDeParcelasCert(pc, proj.zonaUtm, proj.hemisferio));
        setVerticesVizinho(proj.verticesVizinho ?? []);
        acabouDeSalvar.current = true;
        setSalvarLaranja(false);
        setSalvoOk(true);
        
        const salvarBanco = await confirmar({ titulo: 'Salvar no banco', mensagem: `Deseja salvar o projeto importado "${proj.nome}" no seu banco de dados para acessá-lo facilmente no futuro?`, okLabel: 'Salvar no banco' });
        if (salvarBanco) {
          await salvarProjeto(proj);
          atualizarLista();
        }

        aviso(`Projeto "${proj.nome}" importado com sucesso!`);
      } catch (err) {
        await avisar({ titulo: 'Erro', mensagem: err instanceof Error ? err.message : 'Erro ao importar projeto.' });
      } finally {
        setProcessando(false);
      }
    };
    reader.onerror = () => {
      aviso('Erro ao ler o arquivo de projeto.');
      setProcessando(false);
    };
    reader.readAsText(file);
  }

  useEffect(() => { if (aba === 'projetos') atualizarLista(); }, [aba]);

  const lados = res?.lados ?? [];

  // progresso do trabalho (preenchimento + peças) para a barrinha à esquerda

  // Fluxo de trabalho (ordem do cabeçalho, esquerda→direita) para a linha fina sob os botões.
  // Estado de cada etapa: feito | falha (pulada: incompleta mas uma etapa posterior já foi feita) | pendente.
  // Estado de cada ETAPA do cabeçalho (a barrinha cola embaixo do botão correspondente).
  // Só conta AÇÃO do usuário; "andamento" (azul) = começou mas não terminou.
  const etapas = useMemo<Record<string, EtapaEstado>>(() => {
    const nLados = Object.keys(confrontantePorLado).length;
    const todosLados = vertices.length > 0 && nLados >= vertices.length;
    const todasDivisas = vertices.length > 0 && vertices.every((v) => v.representacao && v.representacao !== 'linha-ideal');
    const algumasDivisas = vertices.some((v) => v.representacao && v.representacao !== 'linha-ideal');
    return {
      txt: vertices.length >= 3 ? 'feito' : 'pendente',
      sigef: sigefStatus === 'enviado' ? 'feito' : sigefStatus === 'clicado' ? 'andamento' : 'pendente',
      dados: (imovel.denominacao && imovel.matricula && imovel.proprietario && imovel.municipio) ? 'feito' : 'pendente',
      confro: todosLados ? 'feito' : nLados > 0 ? 'andamento' : 'pendente',
      divisas: todasDivisas ? 'feito' : algumasDivisas ? 'andamento' : 'pendente',
      trt: imovel.numeroTrt?.trim() ? 'feito' : 'pendente',
      memorial: baixou.memorial ? 'feito' : 'pendente',
      ods: baixou.ods ? 'feito' : 'pendente',
      planta: baixou.planta ? 'feito' : 'pendente',
      req: baixou.req ? 'feito' : 'pendente',
      errata: baixou.errata ? 'feito' : 'pendente',
      salvo: salvoOk ? 'feito' : 'pendente',
    };
  }, [vertices, imovel, confrontantePorLado, sigefStatus, baixou, salvoOk]);

  // status resumido pra barra de dados: pronto (sem problema grave) x incompleto (falta algo)
  const projPronto = useMemo(() => {
    if (vertices.length < 3) return false;
    return conferirProntoParaExportar(imovel, vertices, confrontantes, tecnico, confrontantePorLado).ok;
  }, [imovel, vertices, confrontantes, tecnico, confrontantePorLado]);

  // rótulos de confrontante arrastáveis no mapa (posRotulo manual ou centróide dos lados)
  const rotulosConf: RotuloMapa[] = useMemo(() => {
    const out: RotuloMapa[] = [];
    for (const c of confrontantes) {
      if (!c.nome) continue;
      const linhas = linhasRotuloConfrontante(c);
      if (c.posRotulo) { out.push({ id: c.id, lat: c.posRotulo.lat, lon: c.posRotulo.lon, linhas, tam: c.tamRotulo }); continue; }
      const idxs = Object.entries(confrontantePorLado).filter(([, cid]) => cid === c.id).map(([i]) => Number(i));
      if (!idxs.length || vertices.length < 2) continue;
      const mid = idxs[Math.floor(idxs.length / 2)];
      const a = vertices[mid], b = vertices[(mid + 1) % vertices.length];
      if (!a || !b) continue;
      out.push({ id: c.id, lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2, linhas, tam: c.tamRotulo });
    }
    return out;
  }, [confrontantes, confrontantePorLado, vertices]);

  // dados-chave para mostrar no centro da gleba (mapa e planta): denominação, matrícula, prop., área
  const centroGlebaInfo = useMemo(() => {
    if (vertices.length < 3) return null;
    const ef = res ? valoresEfetivos(res, imovel) : null;
    const linhas = [
      glebas.length > 1 && glebaAtivaNome ? glebaAtivaNome : (imovel.denominacao || 'Imóvel'),
      imovel.matricula ? `Matrícula nº ${imovel.matricula}` : '',
      imovel.proprietario ? `Prop.: ${imovel.proprietario}` : '',
      ef ? `Área: ${numBR(ef.areaHa, 4)} ha` : '',
    ].filter(Boolean);
    const p = plantaConfig.centroInfoPos;
    return { linhas, lat: p?.lat, lon: p?.lon };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vertices.length, res, imovel, glebaAtivaNome, glebas.length, plantaConfig.centroInfoPos]);

  const objSel = objetos.find((o) => o.id === objetoSelId) ?? null;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Topo */}
      {/* Cabeçalho = FLUXO DO TRABALHO (esquerda → direita) + conta fixa à direita */}
      <header className="no-print flex items-stretch border-b">
        <div className="flex shrink-0 items-center gap-1.5 border-r pl-2 pr-2.5" title="Souza CAD">
          <Logo className="size-6" />
          <span className="hidden text-sm font-semibold tracking-tight sm:inline"><span className="text-primary">Souza</span> <span className="text-muted-foreground">CAD</span></span>
        </div>
        <div className="flex flex-1 items-start gap-1 overflow-x-auto px-2 py-1.5 [&_button]:h-8 [&_button]:px-2 [&_button]:text-[11px] [&_button_svg]:size-3.5">
        <input ref={fileRef} type="file" accept=".txt,.csv" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importarArquivo(f); e.currentTarget.value = ''; }} />
        <input ref={dxfRef} type="file" accept=".dxf" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importarDxfArquivo(f); e.currentTarget.value = ''; }} />
        <input ref={geojsonRef} type="file" accept=".geojson,.json" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importarReferenciaGeoJson(f); e.currentTarget.value = ''; }} />
        <input ref={shapefileRef} type="file" accept=".zip,.shp" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importarShapefileRef(f); e.currentTarget.value = ''; }} />
        <input ref={vizinhosRef} type="file" accept=".geojson,.json" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importarVizinhosCertificados(f); e.currentTarget.value = ''; }} />
        <input ref={verticesVizinhoRef} type="file" accept=".txt,.csv,text/plain" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importarVerticesVizinho(f); e.currentTarget.value = ''; }} />
        <input ref={jsonBackupRef} type="file" accept=".json" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importarProjetoJson(f); e.currentTarget.value = ''; }} />

        {/* 1) Importar e checar vizinhos */}
        {/* 1) Importar e checar vizinhos */}
        <Etapa st={etapas.txt}><Button size="sm" variant="outline" className={`shrink-0 ${PREM_BTN} ${COR_IMPORT}`} disabled={processando} title="Importar pontos de um arquivo TXT (oferece salvar o anterior)" onClick={iniciarImportTxt}><Upload /> TXT</Button></Etapa>
        <Etapa st={etapas.sigef}>{parcelasCert.length > 0 ? (
          <Button size="sm" variant="outline" className={`shrink-0 ${PREM_BTN} ${COR_VIZINHO}`} title="Vizinhos certificados já baixados — ver relatório de sobreposição SIGEF" onClick={() => setModalSobreposicaoAberto(true)}>{iconeCab('analise', <ShieldCheck className="size-4" />)} ANÁLISE</Button>
        ) : (
          <Button size="sm" variant="outline" className={`shrink-0 ${PREM_BTN} ${COR_IMPORT}`} disabled={processando} title="Vizinhos certificados: busca automática no INCRA (por região) os imóveis que encostam no seu e cria os confrontantes" onClick={importarVizinhosAuto}><Search /> SIGEF</Button>
        )}</Etapa>
        {completo && parcelasCert.length > 0 && (
          <Button size="sm" variant="outline" className={`shrink-0 gap-1 ${PREM_BTN} ${COR_VIZINHO}`} disabled={vertices.length < 3} title="Casar automaticamente seus vértices com os certificados do INCRA: nos pontos de divisa comum (até 0,5 m), adota a coordenada oficial exata" onClick={casarVerticesCertificados}><Magnet className="size-4" /> CASAR</Button>
        )}
        {completo && (
          <Button size="sm" variant="outline" className={`shrink-0 gap-1 ${PREM_BTN} ${COR_VIZINHO}`} disabled={vertices.length < 3} title="Importar um ARQUIVO de coordenadas de um imóvel vizinho já certificado (baixado do Acervo Fundiário do INCRA). Os vértices dele ficam GUARDADOS no projeto com coordenada, sigma e código — mesmo os que estão perto mas não encostam. Aparecem na planta e viram alvo de encaixe (a divisa gruda no ponto oficial), evitando vão e sobreposição. Nos pontos colados (até 2 m) o seu vértice adota o código oficial. As colunas do arquivo se ajustam em Configurações." onClick={() => verticesVizinhoRef.current?.click()}><UserCheck className="size-4" /> VIZINHOS</Button>
        )}
        <ChevronRight className="-mx-1.5 mt-1.5 size-3.5 shrink-0 self-start text-amber-500/60" aria-hidden />

        {/* 2) Dados do projeto atual */}
        <Etapa st={etapas.dados}>
          <Button size="sm" variant={painelAberto && aba === 'imovel' ? 'default' : 'outline'} className={`shrink-0 ${PREM_BTN} ${COR_DADOS}`} title="Preencher dados do imóvel, proprietário e responsável técnico" onClick={() => { setPainelAberto(true); setAba('imovel'); }}>
            <BookUser className="size-4" /> DADOS
          </Button>
        </Etapa>
        <Button size="sm" variant="outline" className={`shrink-0 px-2 ${PREM_BTN} ${COR_DADOS}`} title="Consultar cadastros antigos e inserir no projeto atual" onClick={() => setConsultarAberto(true)}><Search /></Button>
        <ChevronRight className="-mx-1.5 mt-1.5 size-3.5 shrink-0 self-start text-amber-500/60" aria-hidden />

        {/* 3) Pintar confrontantes e divisas (ativa o modo no mapa) */}
        <Etapa st={etapas.confro}><Button size="sm" variant={modo === 'confrontante' ? 'default' : 'outline'} className={`shrink-0 ${modo === 'confrontante' ? '' : `${PREM_BTN} ${COR_MARCAR}`}`} title="Pintar confrontante: clique os vértices do trecho" onClick={() => { setVista('mapa'); setModo(modo === 'confrontante' ? 'navegar' : 'confrontante'); }}><Users /> CONFRO</Button></Etapa>
        <Etapa st={etapas.divisas}><Button size="sm" variant={modo === 'divisa' ? 'default' : 'outline'} className={`shrink-0 ${modo === 'divisa' ? '' : `${PREM_BTN} ${COR_MARCAR}`}`} title="Pintar divisa: escolha o tipo e clique os vértices" onClick={() => { setVista('mapa'); setModo(modo === 'divisa' ? 'navegar' : 'divisa'); }}><Brush /> DIVISAS</Button></Etapa>
        <ChevronRight className="-mx-1.5 mt-1.5 size-3.5 shrink-0 self-start text-amber-500/60" aria-hidden />

        {/* 5) Peças */}
        <Etapa st={etapas.trt}><Button size="sm" variant="outline" className={`shrink-0 ${PREM_BTN} ${COR_PECA}`} title="Abrir os dados do TRT (cole o número emitido para concluir a etapa)" onClick={() => setTrtAberto(true)}>{iconeCab('trt', <FileText />)} TRT</Button></Etapa>
        <Etapa st={etapas.memorial}>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button size="sm" variant="outline" className={`${PREM_BTN} ${COR_PECA} rounded-r-none border-r-0`} title="Baixar o memorial descritivo (.docx)" onClick={() => exportarMemorial('normal')}><Download /> MEM</Button>
            <Button size="sm" variant="outline" className={`px-1.5 ${PREM_BTN} ${COR_PECA} rounded-l-none border-amber-500/20 hover:border-amber-500 text-amber-600 hover:text-amber-700 dark:text-amber-400`} title="Pré-visualizar o memorial descritivo" onClick={() => { setPrevMemorialModo('normal'); setPrevMemorialAberto(true); }}><Eye className="size-4" /></Button>
          </div>
        </Etapa>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button size="sm" variant="outline" className={`${PREM_BTN} ${COR_PECA} rounded-r-none border-r-0`} title="Baixar o memorial descritivo de SERVIDÃO / faixa de domínio (.docx) — descreve a faixa desenhada como área de servidão" onClick={() => exportarMemorial('servidao')}><Download /> SERV</Button>
          <Button size="sm" variant="outline" className={`px-1.5 ${PREM_BTN} ${COR_PECA} rounded-l-none border-amber-500/20 hover:border-amber-500 text-amber-600 hover:text-amber-700 dark:text-amber-400`} title="Pré-visualizar o memorial descritivo de servidão" onClick={() => { setPrevMemorialModo('servidao'); setPrevMemorialAberto(true); }}><Eye className="size-4" /></Button>
        </div>
        <Etapa st={etapas.ods}><Button size="sm" variant="outline" className={`shrink-0 ${PREM_BTN} ${COR_PECA}`} title="Conferir e baixar a planilha SIGEF (.ods)" onClick={() => setPlanilhaConfAberta(true)}><Download /> ODS</Button></Etapa>
        <Etapa st={etapas.planta}><Button size="sm" variant="outline" className={`shrink-0 ${PREM_BTN} ${COR_PECA}`} title="Baixar a planta em PDF (A3)" onClick={exportarPlanta}><Download /> PLANTA</Button></Etapa>
        <Etapa st={etapas.req}><Button size="sm" variant="outline" className={`shrink-0 ${PREM_BTN} ${COR_PECA}`} title="Baixar o requerimento ao cartório (.docx)" onClick={() => setReqAberto(true)}><Download /> REQ</Button></Etapa>
        {completo && (
          <Etapa st={etapas.errata}><Button size="sm" variant="outline" className={`shrink-0 ${PREM_BTN} ${COR_PECA}`} title="Gerar Errata perimetral (.docx)" onClick={() => setErrataAberto(true)}><FileWarning /> ERRATA</Button></Etapa>
        )}

        {completo && (
          <a href="https://sso.acesso.gov.br/login?client_id=sigef.incra.gov.br&authorization_id=19f151443c3" target="_blank" rel="noopener noreferrer" className="shrink-0">
            <Button size="sm" variant="outline" className={`shrink-0 ${PREM_BTN} ${COR_PECA}`} title="Acessar o SIGEF para certificação eletrônica do imóvel"><CheckCircle2 /> CERT</Button>
          </a>
        )}
        {completo && (
          <Button size="sm" variant="outline" className={`shrink-0 gap-1 ${PREM_BTN} border-green-600/40 bg-green-500/10 text-green-700 hover:bg-green-600 hover:text-white dark:text-green-400`} title="CAR — Cadastro Ambiental Rural: reserva legal, módulos fiscais e APP (modo CAR completo em construção)" onClick={() => setCarAberto(true)}><Leaf className="size-4" /> CAR</Button>
        )}
       </div>
       {/* (o botão "Dados do Projeto" foi para a barra flutuante, ao lado do DETALHES) */}
       {/* A CHAVE do app saiu do topo (atrapalhava a leitura dos botões) e virou uma barrinha
           FLUTUANTE na lateral direita — ver logo abaixo do <header>. */}
      </header>

      {/* No modo MAPA e PLANTA a chave Fácil/Completo agora fica integrada nas respectivas barras flutuantes. */}

      <div className="relative flex min-h-0 flex-1">
        {/* Faixa de status/controles — sobreposta (não empurra o mapa/planta); some sozinha */}
        {(!!msg || (vista === 'mapa' && (modo === 'divisa' || modo === 'confrontante'))) && (
          <div className="no-print pointer-events-none absolute left-1/2 top-2 z-[1200] flex max-w-[90%] -translate-x-1/2 justify-center">
            <div className="pointer-events-auto flex items-center gap-2 rounded-full border bg-background/95 px-3 py-1 text-xs shadow-lg backdrop-blur">
              {vista === 'mapa' && modo === 'divisa' && (
                <>
                  <span className="text-muted-foreground">Pintando divisa:</span>
                  <span className="relative inline-flex">
                    <button type="button" className="flex h-7 items-center gap-1 rounded border border-input bg-background px-1.5 hover:bg-muted" title="Ajustar as cores das divisas (fica salvo pra suas plantas)" onClick={() => setCorPickerAberto((v) => !v)}>
                      <span className="inline-block h-0 w-5 border-t-[3px]" style={{ borderColor: corDivisa(tipoDivisaPincel) || '#0f172a' }} />
                      <Palette className="size-3.5 text-muted-foreground" />
                    </button>
                    {corPickerAberto && (
                      <div className="absolute left-0 top-8 z-[1300] w-52 rounded-lg border bg-background p-2 shadow-xl" data-cor-bump={corBump}>
                        <div className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Cores das divisas</div>
                        {coresEfetivas().filter(({ tipo }) => tipo !== 'linha-ideal').map(({ tipo, cor }) => (
                          <label key={tipo} className="flex items-center justify-between gap-2 py-0.5 text-xs">
                            <span>{REPRES_LABEL[tipo] || tipo}</span>
                            <input type="color" value={cor || '#9ca3af'} className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                              onChange={(e) => { salvarCorDivisa(tipo, e.target.value); setCorBump((n) => n + 1); }} />
                          </label>
                        ))}
                        <button type="button" className="mt-1 w-full rounded border px-2 py-1 text-[11px] hover:bg-muted" onClick={() => setCorPickerAberto(false)}>Fechar</button>
                      </div>
                    )}
                  </span>
                  <select className="h-7 rounded border border-input bg-background px-1 text-xs" value={tipoDivisaPincel} onChange={(e) => setTipoDivisaPincel(e.target.value)} title="Tipo de divisa a pintar">
                    {REPRESENTACOES.map((r) => <option key={r} value={r} style={{ color: corDivisa(r) || undefined }}>{'━ '}{REPRES_LABEL[r] || r}</option>)}
                  </select>
                </>
              )}
              {vista === 'mapa' && modo === 'confrontante' && (
                <>
                  <span className="text-muted-foreground">Pintando confrontante:</span>
                  {confrontantePincelId && <span className="inline-block h-0 w-5 shrink-0 border-t-[3px] border-dashed" style={{ borderColor: corPorConfrontante(confrontantePincelId) }} title="Cor deste confrontante no mapa" />}
                  <select className="h-7 rounded border border-input bg-background px-1 text-xs" value={confrontantePincelId} onChange={(e) => setConfrontantePincelId(e.target.value)} title="Confrontante a pintar">
                    <option value="">— escolher —</option>
                    {confrontantes.map((c) => <option key={c.id} value={c.id} style={{ color: corPorConfrontante(c.id) }}>{'━ '}{c.nome || '(sem nome)'}</option>)}
                  </select>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={novoConfrontantePincel} title="Novo confrontante"><Plus className="size-3" /> Novo confront.</Button>
                </>
              )}
              {msg && <span className="text-primary">{msg}</span>}
            </div>
          </div>
        )}
        {/* Área principal: mapa ou planta */}
        {(() => {
          const rotulo = toolW >= 104;
          const L = (t: string) => (rotulo ? <span className="truncate text-xs">{t.toUpperCase()}</span> : null);
          return (
            <>
              <aside style={{ width: toolW }} className="no-print scroll-fino flex shrink-0 flex-col gap-1.5 overflow-y-auto border-r bg-background p-1.5 [&_button]:h-8 [&_button]:px-2 [&_button]:text-[11px] [&_button_svg]:size-3.5">
                {/* DADOS E AÇÕES DO PROJETO */}
                {rotulo ? (
                  <div className="flex flex-col gap-2 text-xs">
                    {/* CARD 1: GESTÃO DO PROJETO */}
                    <div className="flex flex-col gap-1.5 border rounded-lg p-1.5 bg-muted/10 shadow-sm">
                      <span className={`text-[9px] font-extrabold uppercase tracking-wider pb-0.5 border-b cursor-pointer hover:opacity-80 select-none flex items-center justify-between ${themeCabecalho.text} ${themeCabecalho.border}`} onClick={() => setMostrandoCoresHeader(v => !v)}>
                        <span>Gestão do Projeto</span>
                        <span className={`size-1.5 rounded-full ${themeCabecalho.bg}`} />
                      </span>
                      {mostrandoCoresHeader && (
                        <div className="flex flex-wrap gap-1 py-1 px-1 justify-between bg-muted/20 rounded border border-dashed mb-1 animate-in fade-in duration-200">
                          {CORES_CABECALHO.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              title={c.label}
                              className={`size-3.5 rounded-full hover:scale-110 transition-transform ${c.bg} ${corCabecalho === c.id ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                salvarCorCabecalho(c.id);
                              }}
                            />
                          ))}
                        </div>
                      )}
                      


                      {/* Botões de Gestão — grade de 3 colunas, ícone em cima e rótulo em MAIÚSCULA embaixo
                          (sem botão de largura total; menos rolagem). */}
                      <div className="grid grid-cols-3 gap-1 [&>button]:h-8 [&>button]:w-full [&>button]:justify-center [&>button]:px-1 [&>button]:gap-1 [&_svg]:size-3.5 [&>button]:min-w-0 [&_span]:text-[9px] [&_span]:font-bold [&_span]:uppercase [&_span]:leading-none">
                        <Button size="sm" variant={salvarLaranja ? 'default' : 'outline'} className={salvarLaranja ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''} onClick={salvar} disabled={processando} title="Salvar o projeto (Ctrl+S)">
                          <Save /> <span>Salvar</span>
                        </Button>
                        <Button size="sm" variant="outline" onClick={criarNovoProjeto} disabled={processando} title="Novo projeto">
                          <Plus className="text-amber-500" /> <span>Novo</span>
                        </Button>
                        <Button size="sm" variant={painelAberto ? 'default' : 'outline'} onClick={() => setPainelAberto((v) => !v)} title="Dados do projeto (proprietário, cartório, etc.)">
                          <Settings className="text-indigo-500" /> <span>Dados</span>
                        </Button>
                        <Button size="sm" variant={infoJaVista(projetoId) ? 'outline' : 'default'} className={infoJaVista(projetoId) ? '' : 'bg-amber-500 text-white hover:bg-amber-600'} onClick={() => setInfoAberto(true)} title="Detalhes do projeto e pendências">
                          <FileText className="text-cyan-500" /> <span>Detalhes</span>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => (vista === 'mapa' ? centralizar() : ajustarPlanta())} title="Centralizar/enquadrar desenho">
                          <Target className="text-rose-500" /> <span>Foco</span>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setPrecoSugAberto(true)} title="Preço sugerido: quanto cobrar por este imóvel">
                          <PencilRuler className="text-emerald-600" /> <span>Preço</span>
                        </Button>
                        {completo && (
                          <Button size="sm" variant="outline" onClick={() => setPontosAberto(true)} title="Banco de pontos">
                            <Database className="text-emerald-500" /> <span>Pontos</span>
                          </Button>
                        )}
                        {completo && (
                          <Button size="sm" variant="outline" onClick={() => setGestaoAberta(true)} title="Gestão financeira">
                            <Info className="text-sky-500" /> <span>Financ.</span>
                          </Button>
                        )}
                      </div>
                      {glebas.length > 1 && (
                        <div className="flex flex-wrap gap-1 items-center justify-between border-t pt-1.5 mt-0.5">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase">Gleba:</span>
                          <div className="flex gap-1">
                            {glebas.map((g, i) => (
                              <button key={g.id} type="button" onClick={() => { trocarGleba(g.id); setPainelAberto(true); }} title={g.denominacao}
                                className={`size-6 rounded flex items-center justify-center text-xs font-bold ${g.id === glebaAtivaId ? 'bg-primary text-primary-foreground' : 'border bg-background hover:bg-muted'}`}>{i + 1}</button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* CARD 2: VISUALIZAÇÃO & HISTÓRICO */}
                    <div className="flex flex-col gap-1.5 border rounded-lg p-1.5 bg-muted/10 shadow-sm">
                      <span className={`text-[9px] font-extrabold uppercase tracking-wider pb-0.5 border-b cursor-pointer hover:opacity-80 select-none flex items-center justify-between ${themeCabecalho.text} ${themeCabecalho.border}`} onClick={() => setMostrandoCoresHeader(v => !v)}>
                        <span>Visualização & Navegação</span>
                        <span className={`size-1.5 rounded-full ${themeCabecalho.bg}`} />
                      </span>
                      {mostrandoCoresHeader && (
                        <div className="flex flex-wrap gap-1 py-1 px-1 justify-between bg-muted/20 rounded border border-dashed mb-1 animate-in fade-in duration-200">
                          {CORES_CABECALHO.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              title={c.label}
                              className={`size-3.5 rounded-full hover:scale-110 transition-transform ${c.bg} ${corCabecalho === c.id ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                salvarCorCabecalho(c.id);
                              }}
                            />
                          ))}
                        </div>
                      )}
                      {vista === 'mapa' ? (
                        <>
                          <BotaoAcoes onUndo={desfazer} onRedo={refazer} />
                          {/* Mover + ímã + rótulos + travar numa grade de 3 colunas (sem botão de largura total) */}
                          <div className="grid grid-cols-3 gap-1 [&>button]:h-8 [&>button]:w-full [&>button]:justify-center [&>button]:px-1 [&>button]:gap-1 [&_svg]:size-3.5 [&>button]:min-w-0 [&_span]:text-[9px] [&_span]:font-bold [&_span]:uppercase [&_span]:leading-none">
                            <Button size="sm" variant={modo === 'navegar' ? 'default' : 'outline'} title="Mover/navegar: arrastar elementos (F2)" onClick={() => setModo('navegar')}>
                              <MousePointer2 className="text-cyan-500" /> <span>Mover</span>
                            </Button>
                            <Button size="sm" variant={snapAtivo ? 'default' : 'outline'} title={`Ímã (F3) — ${snapAtivo ? 'LIGADO' : 'desligado'}. Quando ligado, o ponto que você clicar ao desenhar GRUDA no vértice mais próximo do imóvel (2 m). Bom para cotar de vértice a vértice ou fechar polilinha bem no canto. Se você não desenha perto dos vértices, deixe desligado.`} onClick={() => setSnapAtivo((s) => !s)} className={snapAtivo ? 'bg-cyan-600 text-white hover:bg-cyan-700' : ''}>
                              <Magnet /> <span>Ímã</span>
                            </Button>
                            <Button size="sm" variant={mostrarRotulos ? 'default' : 'outline'} title={`${mostrarRotulos ? 'Esconder' : 'Mostrar'} nomes dos vértices (F4)`} onClick={() => setMostrarRotulos((m) => !m)} className={mostrarRotulos ? 'bg-sky-600 text-white hover:bg-sky-700' : ''}>
                              {mostrarRotulos ? <Eye /> : <EyeOff />} <span>Rótulos</span>
                            </Button>
                            <Button size="sm" variant={bloqueado ? 'outline' : 'default'} className={`col-span-3 ${bloqueado ? 'text-emerald-600 border-emerald-600/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/20' : 'bg-red-500 hover:bg-red-600 text-white'}`} title={bloqueado ? 'Vértices travados — F5 (clique para liberar)' : 'ATENÇÃO: vértices liberados (podem mover) — F5 para travar'} onClick={() => setBloqueado((b) => !b)}>
                              {bloqueado ? <Lock /> : <LockOpen />} <span>{bloqueado ? 'Vértices travados' : 'Vértices soltos'}</span>
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <BotaoAcoes onUndo={desfazer} onRedo={refazer} />
                          <Button size="sm" variant={modo === 'navegar' ? 'default' : 'outline'} className="h-8 justify-center gap-2" title="Mover/editar: arrastar textos, rótulos e a folha (F1). Duplo clique num confrontante edita o nome; botão direito ajusta o tamanho." onClick={() => setModo('navegar')}>
                            <MousePointer2 className="size-4 text-cyan-500" /> <span className="text-xs font-semibold uppercase">Mover / editar</span>
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* CARD 3: FERRAMENTAS DE DESENHO */}
                    {completo && (vista === 'mapa' || editarPlanta) && (
                      <div className="flex flex-col gap-1.5 border rounded-lg p-1.5 bg-muted/10 shadow-sm">
                        <span className={`text-[9px] font-extrabold uppercase tracking-wider pb-0.5 border-b cursor-pointer hover:opacity-80 select-none flex items-center justify-between ${themeCabecalho.text} ${themeCabecalho.border}`} onClick={() => setMostrandoCoresHeader(v => !v)}>
                          <span>Desenho e Geometria</span>
                          <span className={`size-1.5 rounded-full ${themeCabecalho.bg}`} />
                        </span>
                        {mostrandoCoresHeader && (
                          <div className="flex flex-wrap gap-1 py-1 px-1 justify-between bg-muted/20 rounded border border-dashed mb-1 animate-in fade-in duration-200">
                            {CORES_CABECALHO.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                title={c.label}
                                className={`size-3.5 rounded-full hover:scale-110 transition-transform ${c.bg} ${corCabecalho === c.id ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  salvarCorCabecalho(c.id);
                                }}
                              />
                            ))}
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-1 [&>button]:h-8 [&>button]:w-full [&>button]:justify-center [&>button]:px-1 [&>button]:gap-1 [&_svg]:size-3.5 [&>button]:min-w-0 [&_span]:text-[9px] [&_span]:font-bold">
                          <Button size="sm" variant={modo === 'linha' ? 'default' : 'outline'} onClick={() => { setModo('linha'); setDesenhoBuffer([]); }} title="Linha reta: clique 2 pontos (F6)">
                            <PenTool className="text-amber-500 shrink-0" /> <span className="truncate">Linha</span>
                          </Button>
                          <Button size="sm" variant={modo === 'polilinha' ? 'default' : 'outline'} onClick={() => { setModo('polilinha'); setDesenhoBuffer([]); }} title="Polilinha: clique vários pontos; fecha virando polígono (F7)">
                            <PenTool className="text-cyan-500 shrink-0" /> <span className="truncate">Polilinha</span>
                          </Button>
                          <Button size="sm" variant={modo === 'tracejado' ? 'default' : 'outline'} onClick={() => { setModo('tracejado'); setDesenhoBuffer([]); }} title="Tracejado: linha tracejada aberta (F8)">
                            <PenTool className="text-indigo-500 opacity-80 shrink-0" /> <span className="truncate">Tracejado</span>
                          </Button>
                          <Button size="sm" variant={modo === 'texto' ? 'default' : 'outline'} onClick={() => setModo('texto')} title="Texto: clique para inserir (F9)">
                            <FileText className="text-emerald-500 shrink-0" /> <span className="truncate">Texto</span>
                          </Button>
                          <Button size="sm" variant={modo === 'cota' ? 'default' : 'outline'} onClick={() => { setModo('cota'); setDesenhoBuffer([]); }} title="Cotar: clique dois pontos para medir (F10)">
                            <IconeCota className="text-rose-500 shrink-0" /> <span className="truncate">Cota</span>
                          </Button>
                          <Button size="sm" variant={modo === 'simbolo' ? 'default' : 'outline'} onClick={() => { setModo(modo === 'simbolo' ? 'navegar' : 'simbolo'); }} title="Símbolos: inserir poste, árvore...">
                            <div className="shrink-0 text-sky-500"><svg viewBox="-14 -14 28 28" className="size-3.5" dangerouslySetInnerHTML={{ __html: simboloSvgInterno('arvore') }} /></div>
                            <span className="truncate">Símbolos</span>
                          </Button>
                          {modo === 'simbolo' && (
                            <div className="col-span-3 grid grid-cols-5 gap-1 rounded border bg-muted/40 p-1">
                              {SIMBOLOS.map((s) => (
                                <button key={s.chave} type="button" title={s.rotulo}
                                  className={`flex flex-col items-center justify-center rounded p-1 hover:bg-background transition-all ${simboloSel === s.chave ? 'bg-background ring-1 ring-primary' : ''}`}
                                  onClick={() => setSimboloSel(s.chave)}>
                                  <svg viewBox="-14 -14 28 28" className="size-5" dangerouslySetInnerHTML={{ __html: simboloSvgInterno(s.chave) }} />
                                  <span className="text-[8px] font-semibold leading-none mt-0.5">{s.rotulo}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Vértices e geometria — mesmo cartão, separados por um traço fino (economiza espaço) */}
                        <div className="my-0.5 h-px bg-border/50" />
                        <div className="grid grid-cols-3 gap-1 [&>button]:h-8 [&>button]:w-full [&>button]:justify-center [&>button]:px-1 [&>button]:gap-1 [&_svg]:size-3.5 [&>button]:min-w-0 [&_span]:text-[9px] [&_span]:font-bold">
                          <Button size="sm" variant={modo === 'inserir' ? 'default' : 'outline'} onClick={() => { setVista('mapa'); setModo('inserir'); }} title="Inserir vértice: clique numa aresta">
                            <Plus className="text-emerald-500 shrink-0" /> <span className="truncate">Inserir</span>
                          </Button>
                          <Button size="sm" variant={modo === 'apagar' ? 'default' : 'outline'} onClick={() => { setVista('mapa'); setModo('apagar'); }} title="Apagar vértice">
                            <Trash2 className="text-rose-500 shrink-0" /> <span className="truncate">Apagar</span>
                          </Button>
                          <Button size="sm" variant={modo === 'ignorar' ? 'default' : 'outline'} onClick={() => { setVista('mapa'); setModo(modo === 'ignorar' ? 'navegar' : 'ignorar'); }} title="Ignorar vértice (F12)">
                            <EyeOff className="text-amber-500 shrink-0" /> <span className="truncate">Ignorar</span>
                          </Button>
                          <Button size="sm" variant={modo === 'considerar' ? 'default' : 'outline'} onClick={() => { setVista('mapa'); setModo('considerar'); }} title="Considerar vértice (F11)">
                            <Plus className="text-cyan-500 shrink-0" /> <span className="truncate">Considerar</span>
                          </Button>
                          <Button size="sm" variant={modo === 'medir' ? 'default' : 'outline'} onClick={() => { setModo('medir'); setDesenhoBuffer([]); }} title="Régua: medir distância e azimute no mapa">
                            <Ruler className="text-sky-500 shrink-0" /> <span className="truncate">Medir</span>
                          </Button>
                          <Button size="sm" variant={modo === 'multi' ? 'default' : 'outline'} onClick={() => { setVista('mapa'); setModo(modo === 'multi' ? 'navegar' : 'multi'); }} title="Selecionar vários vértices">
                            <div className="shrink-0 text-indigo-500">
                              <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden>
                                <circle cx="12" cy="5" r="2.4" fill="currentColor" />
                                <circle cx="5" cy="18" r="2.4" fill="currentColor" />
                                <circle cx="19" cy="18" r="2.4" fill="currentColor" />
                              </svg>
                            </div>
                            <span className="truncate text-[11px] font-semibold">Sel. Vários</span>
                          </Button>
                          {modo === 'multi' && (
                            <div className="col-span-2 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-600 dark:text-amber-400">
                              {selMulti.size > 0
                                ? <button className="w-full text-left font-semibold" onClick={apagarMultiSelecionados}>Apagar {selMulti.size} selecionado(s) — Delete</button>
                                : 'Clique nos vértices ou arraste uma caixa para selecioná-los.'}
                            </div>
                          )}
                          {modo === 'considerar' && verticesIgnorados.length === 0 && <span className="col-span-2 px-1 text-[10px] text-muted-foreground text-center">Nenhum vértice ignorado.</span>}
                          {objSel?.tipo === 'texto' && (
                            <div className="col-span-2 grid grid-cols-3 gap-1 mt-1">
                              <Button size="sm" variant="outline" onClick={() => editarObjetoSel({ tamanho: Math.max(6, (objSel.tamanho ?? 12) - 2) })} title="Diminuir texto"><span className="font-bold font-mono">A-</span></Button>
                              <Button size="sm" variant="outline" onClick={() => editarObjetoSel({ tamanho: (objSel.tamanho ?? 12) + 2 })} title="Aumentar texto"><span className="font-bold font-mono">A+</span></Button>
                              <Button size="sm" variant="outline" onClick={async () => { const t = await perguntar({ titulo: 'Editar texto', valorInicial: objSel.texto ?? '' }); if (t != null) editarObjetoSel({ texto: t }); }} title="Editar texto"><Pencil className="size-3.5 text-cyan-500" /></Button>
                            </div>
                          )}
                          {objSel?.tipo === 'simbolo' && (
                            <div className="col-span-2 grid grid-cols-2 gap-1 mt-1">
                              <Button size="sm" variant="outline" onClick={() => editarObjetoSel({ tamanho: Math.max(10, (objSel.tamanho ?? 30) - 5) })} title="Diminuir símbolo"><span className="font-bold font-mono">S-</span></Button>
                              <Button size="sm" variant="outline" onClick={() => editarObjetoSel({ tamanho: Math.min(150, (objSel.tamanho ?? 30) + 5) })} title="Aumentar símbolo"><span className="font-bold font-mono">S+</span></Button>
                            </div>
                          )}
                          {objSel?.tipo === 'polilinha' && (
                            <div className="col-span-2 flex flex-col gap-1 mt-1">
                              <Button size="sm" variant="secondary" className="gap-1.5 w-full justify-start text-[11px]" onClick={converterPolilinhaEmPerimetro} title="Usar como perímetro"><RotateCcw className="size-3.5 text-emerald-500" /> Usar como perímetro</Button>
                              <Button size="sm" variant={objSel.preenchido ? 'default' : 'ghost'} className="w-full justify-start gap-2 text-[11px]" onClick={() => editarObjetoSel({ preenchido: !objSel.preenchido })} title="Preencher"><Brush className="size-3.5" /> Preencher</Button>
                            </div>
                          )}
                          {objetoSelId && (
                            <Button size="sm" variant="ghost" className="col-span-3 w-full justify-start text-red-500 hover:text-red-600 text-[11px] gap-2" onClick={apagarObjetoSel} title="Apagar objeto selecionado">
                              <Trash2 className="size-3.5 text-destructive" /> Apagar objeto
                            </Button>
                          )}
                        </div>

                        {/* DXF e KML lado a lado */}
                        <div className="grid grid-cols-2 gap-1 mt-1.5">
                          <div className={`flex items-center justify-between rounded-md border px-1.5 py-0.5 ${COR_IMPORT}`}>
                            <span className="text-[9px] font-bold shrink-0">DXF</span>
                            <div className="flex gap-0.5">
                              <Button size="sm" variant="ghost" className="size-7 p-0" title="Exportar DXF" onClick={exportarDxf}><Download className="size-3.5" /></Button>
                              <Button size="sm" variant="ghost" className="size-7 p-0" disabled={processando} title="Importar DXF" onClick={() => dxfRef.current?.click()}><Upload className="size-3.5" /></Button>
                            </div>
                          </div>
                          <div className={`flex items-center justify-between rounded-md border px-2 py-0.5 ${COR_IMPORT}`}>
                            <span className="text-[9px] font-bold shrink-0">KML</span>
                            <Button size="sm" variant="ghost" className="size-7 p-0" title="Exportar KML" onClick={() => exportarKML(vertices, imovel)}><Download className="size-3.5" /></Button>
                          </div>
                        </div>

                        {/* A situação foi movida SÓ para a barra flutuante da planta (evita duplicar aqui). */}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Coluna única para barra colapsada */
                  <div className="flex flex-col gap-1 mb-1 [&>button]:size-9 [&>button]:p-0 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&_svg]:size-4">
                    <Button size="sm" variant={salvarLaranja ? 'default' : 'outline'} className={salvarLaranja ? 'bg-amber-500 hover:bg-amber-600 text-white font-bold' : ''} onClick={salvar} disabled={processando} title="Salvar o projeto"><Save className="size-4" /></Button>
                    <Button size="sm" variant="outline" onClick={criarNovoProjeto} disabled={processando} title="Novo projeto"><Plus className="size-4" /></Button>
                    <Button size="sm" variant={infoJaVista(projetoId) ? 'outline' : 'default'} className={infoJaVista(projetoId) ? '' : 'bg-amber-500 text-white hover:bg-amber-600'} onClick={() => setInfoAberto(true)} title="Detalhes do projeto"><FileText className="size-4" /></Button>
                    <Button size="sm" variant={painelAberto ? 'default' : 'outline'} onClick={() => setPainelAberto((v) => !v)} title="Dados do projeto"><Settings className="size-4" /></Button>
                    <Button size="sm" variant="outline" onClick={() => (vista === 'mapa' ? centralizar() : ajustarPlanta())} title="Foco"><Target className="size-4" /></Button>
                    {completo && (<>
                    <Button size="sm" variant="outline" onClick={() => setGestaoAberta(true)} title="Gestão financeira"><Info className="size-4" /></Button>
                    <Button size="sm" variant="outline" onClick={() => setPontosAberto(true)} title="Banco de pontos"><Database className="size-4" /></Button>
                    <div className="h-px bg-border my-1" />
                    <Button size="sm" variant={modo === 'linha' ? 'default' : 'ghost'} onClick={() => { setModo('linha'); setDesenhoBuffer([]); }} title="Linha reta (F6)"><PenTool /></Button>
                    <Button size="sm" variant={modo === 'polilinha' ? 'default' : 'ghost'} onClick={() => { setModo('polilinha'); setDesenhoBuffer([]); }} title="Polilinha (F7)"><PenTool /></Button>
                    <Button size="sm" variant={modo === 'tracejado' ? 'default' : 'ghost'} onClick={() => { setModo('tracejado'); setDesenhoBuffer([]); }} title="Tracejado (F8)"><PenTool className="opacity-70" /></Button>
                    <Button size="sm" variant={modo === 'texto' ? 'default' : 'ghost'} onClick={() => setModo('texto')} title="Texto (F9)"><FileText /></Button>
                    <Button size="sm" variant={modo === 'cota' ? 'default' : 'ghost'} onClick={() => { setModo('cota'); setDesenhoBuffer([]); }} title="Cotar (F10)"><IconeCota /></Button>
                    <Button size="sm" variant={modo === 'simbolo' ? 'default' : 'ghost'} onClick={() => setElementosAberto((v) => !v)} title="Elementos"><svg viewBox="-14 -14 28 28" className="size-4" dangerouslySetInnerHTML={{ __html: simboloSvgInterno('arvore') }} /></Button>
                    <Button size="sm" variant={modo === 'inserir' ? 'default' : 'ghost'} onClick={() => { setVista('mapa'); setModo('inserir'); }} title="Inserir vértice"><Plus /></Button>
                    <Button size="sm" variant={modo === 'ignorar' ? 'default' : 'ghost'} onClick={() => { setVista('mapa'); setModo('ignorar'); }} title="Ignorar (F12)"><EyeOff /></Button>
                    <Button size="sm" variant={modo === 'considerar' ? 'default' : 'ghost'} onClick={() => { setVista('mapa'); setModo('considerar'); }} title="Considerar (F11)"><Plus /></Button>
                    <Button size="sm" variant={modo === 'apagar' ? 'default' : 'ghost'} onClick={() => { setVista('mapa'); setModo('apagar'); }} title="Apagar vértice"><Trash2 /></Button>
                    <Button size="sm" variant={modo === 'medir' ? 'default' : 'ghost'} onClick={() => { setModo('medir'); setDesenhoBuffer([]); }} title="Medir / Régula"><Ruler /></Button>
                    <Button size="sm" variant={modo === 'multi' ? 'default' : 'ghost'} onClick={() => { setVista('mapa'); setModo('multi'); }} title="Selecionar vários">
                      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
                        <circle cx="12" cy="5" r="2.4" fill="currentColor" />
                        <circle cx="5" cy="18" r="2.4" fill="currentColor" />
                        <circle cx="19" cy="18" r="2.4" fill="currentColor" />
                      </svg>
                    </Button>
                    </>)}
                  </div>
                )}

                {/* RODAPÉ FIXO: ajuste de texto + sistema (calculadora, tema, config, sair) */}
                <div className="mt-auto flex flex-col gap-1 border-t pt-1.5">
                  {/* Tamanho dos textos: no mapa mexe nos nomes dos vértices; na planta, 4 escopos separados */}
                  {vista === 'mapa' ? (
                    <div className="grid grid-cols-2 gap-1 mt-1 pt-1 border-t" title="Tamanho dos nomes/rótulos dos vértices no mapa">
                      <span className="text-[10px] font-bold uppercase text-foreground col-span-2 px-1 mb-0.5">Ajuste de Tamanhos</span>
                      <div className="flex flex-col items-center rounded bg-muted/40 p-1" title="Tamanho dos nomes/códigos que aparecem nos vértices">
                        <span className="text-[10px] font-bold text-foreground truncate">Rótulos</span>
                        <div className="flex gap-0.5 mt-1">
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 font-bold" onClick={() => setTamNomes((n) => Math.max(7, n - 1))}><span className="text-[9px]">A-</span></Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 font-bold" onClick={() => setTamNomes((n) => Math.min(22, n + 1))}><span className="text-[9px]">A+</span></Button>
                        </div>
                      </div>
                      <div className="flex flex-col items-center rounded bg-muted/40 p-1" title="Tamanho das letras da interface (botões, instruções, lembretes) — ajuda quem enxerga menos">
                        <span className="text-[10px] font-bold text-foreground truncate">Interface</span>
                        <div className="flex gap-0.5 mt-1">
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 font-bold" onClick={() => setEscalaInterface((s) => Math.max(0.8, +((s - 0.05).toFixed(2))))}><span className="text-[9px]">A-</span></Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 font-bold" onClick={() => setEscalaInterface((s) => Math.min(1.6, +((s + 0.05).toFixed(2))))}><span className="text-[9px]">A+</span></Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-x-1 gap-y-1 mt-1 pt-1 border-t" title="Tamanho dos textos da planta, por escopo">
                      <span className="text-[10px] font-bold uppercase text-foreground col-span-3 px-1 mb-0.5">Ajuste de Tamanhos</span>
                      
                      {/* Interface */}
                      <div className="flex items-center justify-between text-[10px] font-bold text-foreground bg-muted/30 px-1.5 py-0.5 rounded">
                        <span className="truncate">Interface</span>
                        <div className="flex items-center gap-0.5">
                          <Button size="sm" variant="ghost" className="h-5 w-5 p-0 font-extrabold hover:bg-muted text-[10px]" onClick={() => setEscalaInterface((s) => Math.max(0.8, +((s - 0.05).toFixed(2))))}>-</Button>
                          <Button size="sm" variant="ghost" className="h-5 w-5 p-0 font-extrabold hover:bg-muted text-[10px]" onClick={() => setEscalaInterface((s) => Math.min(1.6, +((s + 0.05).toFixed(2))))}>+</Button>
                        </div>
                      </div>

                      {/* Tabelas (roteiro perimétrico, quadro de áreas, coordenadas) */}
                      {(() => {
                        const r = { rot: 'Tabelas', campo: 'escalaTabelas' as const, base: 1 };
                        const passo = 0.05, min = 0.4, max = 3;
                        const aj = (d: number) => setPlantaConfig((c) => { const atual = (c[r.campo] as number | undefined) ?? r.base; return { ...c, [r.campo]: Math.max(min, Math.min(max, +((atual + d).toFixed(2)))) }; });
                        return (
                          <div className="flex items-center justify-between text-[10px] font-bold text-foreground bg-muted/30 px-1.5 py-0.5 rounded" title="Tamanho só das tabelas: roteiro perimétrico, quadro de áreas e de coordenadas">
                            <span className="truncate">Tabelas</span>
                            <div className="flex items-center gap-0.5">
                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 font-extrabold hover:bg-muted text-[10px]" onClick={() => aj(-passo)}>-</Button>
                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 font-extrabold hover:bg-muted text-[10px]" onClick={() => aj(passo)}>+</Button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Rótulos */}
                      {(() => {
                        const r = { rot: 'Rótulos', campo: 'fonteRotulos' as const, base: 10 };
                        const passo = 0.5, min = 5, max = 20;
                        const aj = (d: number) => setPlantaConfig((c) => { const atual = (c[r.campo] as number | undefined) ?? r.base; return { ...c, [r.campo]: Math.max(min, Math.min(max, +((atual + d).toFixed(2)))) }; });
                        return (
                          <div className="flex items-center justify-between text-[10px] font-medium text-foreground bg-muted/30 px-1.5 py-0.5 rounded">
                            <span className="truncate">Rótulos</span>
                            <div className="flex items-center gap-0.5">
                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 font-extrabold hover:bg-muted text-[10px]" onClick={() => aj(-passo)}>-</Button>
                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 font-extrabold hover:bg-muted text-[10px]" onClick={() => aj(passo)}>+</Button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Símbolos */}
                      {(() => {
                        const r = { rot: 'Símbolos', campo: 'escalaVertices' as const, base: 1 };
                        const passo = 0.05, min = 0.4, max = 3;
                        const aj = (d: number) => setPlantaConfig((c) => { const atual = (c[r.campo] as number | undefined) ?? r.base; return { ...c, [r.campo]: Math.max(min, Math.min(max, +((atual + d).toFixed(2)))) }; });
                        return (
                          <div className="flex items-center justify-between text-[10px] font-medium text-foreground bg-muted/30 px-1.5 py-0.5 rounded">
                            <span className="truncate">Símbolos</span>
                            <div className="flex items-center gap-0.5">
                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 font-extrabold hover:bg-muted text-[10px]" onClick={() => aj(-passo)}>-</Button>
                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 font-extrabold hover:bg-muted text-[10px]" onClick={() => aj(passo)}>+</Button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Declarações */}
                      {(() => {
                        const r = { rot: 'Declarações', campo: 'escalaDeclaracoes' as const, base: 1 };
                        const passo = 0.05, min = 0.4, max = 3;
                        const aj = (d: number) => setPlantaConfig((c) => { const atual = (c[r.campo] as number | undefined) ?? r.base; return { ...c, [r.campo]: Math.max(min, Math.min(max, +((atual + d).toFixed(2)))) }; });
                        return (
                          <div className="flex items-center justify-between text-[10px] font-medium text-foreground bg-muted/30 px-1.5 py-0.5 rounded">
                            <span className="truncate">Declarações</span>
                            <div className="flex items-center gap-0.5">
                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 font-extrabold hover:bg-muted text-[10px]" onClick={() => aj(-passo)}>-</Button>
                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 font-extrabold hover:bg-muted text-[10px]" onClick={() => aj(passo)}>+</Button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Confrontantes */}
                      {(() => {
                        const r = { rot: 'Confront.', campo: 'escalaConfront' as const, base: 1 };
                        const passo = 0.05, min = 0.4, max = 3;
                        const aj = (d: number) => setPlantaConfig((c) => { const atual = (c[r.campo] as number | undefined) ?? r.base; return { ...c, [r.campo]: Math.max(min, Math.min(max, +((atual + d).toFixed(2)))) }; });
                        return (
                          <div className="flex items-center justify-between text-[10px] font-medium text-foreground bg-muted/30 px-1.5 py-0.5 rounded">
                            <span className="truncate">Confront.</span>
                            <div className="flex items-center gap-0.5">
                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 font-extrabold hover:bg-muted text-[10px]" onClick={() => aj(-passo)}>-</Button>
                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0 font-extrabold hover:bg-muted text-[10px]" onClick={() => aj(passo)}>+</Button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {/* ferramentas e sistema: duas linhas de botões rotulados (não mais ícones espremidos) */}
                  <div className="grid grid-cols-4 gap-1">
                    {([
                      // 5º item = cor do ícone por categoria (ferramentas=índigo, sistema=neutro, master=âmbar, sair=vermelho)
                      // Ferramentas extras (índigo): só aparecem no modo Completo — não fazem parte do caminho essencial.
                      ...(completo ? [['Calc.', 'Calculadora: converter coordenada, distância e azimute', <Ruler key="i" className="size-4" />, () => setCalcAberta(true), 'text-indigo-600 dark:text-indigo-400']] : []),
                      ...(completo ? [['Vért. V', 'Criar vértice virtual (V): canto que você não ocupou, por afastamento ou interseção de alinhamentos', <Waypoints key="i" className="size-4" />, () => { setVvBase(null); setVvAberto(true); }, 'text-indigo-600 dark:text-indigo-400']] : []),
                      ...(completo ? [['DXF', 'Editor de DXF (abrir e editar um DXF qualquer, ex.: projeto elétrico — isolado do projeto)', <PencilRuler key="i" className="size-4" />, () => setDxfEditorAberto(true), 'text-indigo-600 dark:text-indigo-400']] : []),
                      ...(completo ? [['% Área', 'Porcentagem entre dois polígonos (área de um em relação ao outro e ao total)', <Percent key="i" className="size-4" />, () => setPorcentagemAberta(true), 'text-indigo-600 dark:text-indigo-400']] : []),
                      ...(completo ? [['Estúdio', 'Estúdio: edição de imagem (mini-Canva, isolado do projeto)', <ImagePlus key="i" className="size-4" />, () => setEstudioAberto(true), 'text-indigo-600 dark:text-indigo-400']] : []),
                      ['Tema', 'Tema claro/escuro', tema === 'claro' ? <Moon key="i" className="size-4" /> : <Sun key="i" className="size-4" />, () => setTema((t) => (t === 'claro' ? 'escuro' : 'claro')), 'text-slate-500'],
                      ['Ajuda', 'Tutorial: como usar o Métrica, passo a passo', <HelpCircle key="i" className="size-4" />, () => setTutorialAberto(true), 'text-slate-500'],
                      ['RT', 'Dados do responsável técnico: nome, CFT, código do credenciado e contadores', <UserCheck key="i" className="size-4" />, () => { setConfigAba('pessoal'); setConfigAberta(true); }, 'text-slate-500'],
                      ['Config.', 'Configurações gerais', <Settings key="i" className="size-4" />, () => { setConfigAba(undefined); setConfigAberta(true); }, 'text-slate-500'],
                      ...(!ocultarCobranca || souMaster() ? [['Planos', souMaster() ? 'Cobrança do app: planos, preços e nível de cada cliente (admin)' : 'Planos e assinatura do Métrica', <CreditCard key="i" className="size-4" />, () => setAssinaturaAberta(true), 'text-emerald-600 dark:text-emerald-400']] : []),
                      ...(souMaster() ? [['Painel ADM', 'Painel administrativo: contas, uso e configuração de cobrança', <Crown key="i" className="size-4" />, () => setMasterAberto(true), 'text-amber-600 dark:text-amber-400']] : []),
                      ...(souMaster() ? [['Demo', 'Carregar um projeto fictício completo (Minas Gerais) para demonstração — peças saem marcadas como dados fictícios', <FlaskConical key="i" className="size-4" />, () => carregarProjetoFicticio(), 'text-amber-600 dark:text-amber-400']] : []),
                      ...(nuvemDisponivel && user ? [['Sair', `Sair (${user.email ?? ''})`, <LogOut key="i" className="size-4" />, () => { limparConfigLocalNaSaida(); sair(); }, 'text-red-600 dark:text-red-400']] : []),
                    ] as [string, string, React.ReactNode, () => void, string][]).map(([rotuloBtn, dica, icone, acao, cor]) => (
                      <Button key={rotuloBtn} size="sm" variant="outline" className={`h-11 min-w-0 flex-col gap-0.5 overflow-hidden p-0 px-0.5 [&_svg]:${cor}`} title={dica} onClick={acao}>
                        <span className={cor}>{icone}</span>
                        <span className="w-full truncate text-center text-[10px] leading-none">{rotuloBtn}</span>
                      </Button>
                    ))}
                  </div>
                  {/* Convite pro modo Completo: no Simples a pessoa vê que existe mais e vira a chave quando quiser. */}
                  {!completo && rotulo && (
                    <button type="button" onClick={() => trocarModoApp('completo')}
                      title="Toque para abrir o modo Completo, com todas as ferramentas."
                      className="mt-1 block !h-auto w-full rounded-lg border border-dashed border-primary/40 bg-primary/5 !p-2 text-left !text-[10px] leading-snug text-muted-foreground hover:bg-primary/10">
                      Você está no modo <b className="text-foreground">Fácil</b>, ideal para se familiarizar com o sistema. Quando se sentir seguro, alterne para o modo <b className="text-primary">Completo</b>.
                    </button>
                  )}
                </div>
              </aside>
              {vista === 'mapa' && (
                <div onPointerDown={toolDown} onPointerMove={toolMove} onPointerUp={toolUp}
                  onDoubleClick={() => setToolW(200)}
                  className="no-print w-1.5 shrink-0 cursor-col-resize touch-none bg-border/40 hover:bg-primary/50" title="Arraste para redimensionar a barra · duplo clique = largura ideal (rótulos visíveis)" />
              )}
            </>
          );
        })()}
        <main className="relative isolate min-w-0 flex-1">
          {/* Coluna de atalhos no canto superior esquerdo. A alternância MAPA/PLANTA (troca mais
              usada) fica no topo, com destaque; abaixo, no mesmo padrão quadrado, o modo
              Fácil/Completo e — só na planta — travar a folha e o tema da prancha. Ficam aqui pra
              liberar a barra flutuante de cima. */}
          <div className="absolute left-3 top-3 z-[1160] flex flex-col gap-2">
            <button type="button" onClick={() => setVista((v) => (v === 'mapa' ? 'planta' : 'mapa'))}
              title="Alternar entre mapa e planta (Esc)"
              className="flex size-14 flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-primary/50 bg-background/95 shadow-xl backdrop-blur hover:bg-muted">
              {vista === 'mapa' ? <Eye className="size-5 text-primary" /> : <MapIcon className="size-5 text-primary" />}
              <span className="text-[10px] font-bold leading-none">{vista === 'mapa' ? 'PLANTA' : 'MAPA'}</span>
              <span className="text-[8px] font-bold leading-none text-amber-500">Esc</span>
            </button>

            {/* Modo Fácil/Completo — vale no app inteiro; some durante a abertura e após as 5 h de Completo */}
            {chaveTopoVisivel && !introTocando && (
              <button type="button" onClick={() => trocarModoApp(completo ? 'simples' : 'completo')}
                title={completo
                  ? 'Modo Completo: todas as ferramentas à mostra. Clique para o Fácil.'
                  : 'Modo Fácil: só o caminho essencial. Clique para o Completo.'}
                className="flex size-14 flex-col items-center justify-center gap-0.5 rounded-xl border border-border bg-background/95 shadow-xl backdrop-blur hover:bg-muted">
                <GraduationCap className="size-5 text-primary" />
                <span className="text-[10px] font-bold leading-none">{completo ? 'COMPL.' : 'FÁCIL'}</span>
              </button>
            )}

            {/* Só na planta: travar a folha e alternar o tema da prancha */}
            {vista === 'planta' && (
              <>
                <button type="button"
                  onClick={() => { const nova = !folhaTravada; setFolhaTravada(nova); if (!nova) setModo('navegar'); }}
                  title={folhaTravada ? 'Moldura travada — clique para soltar e arrastar a prancha' : 'Moldura solta — clique para travar o layout da folha'}
                  className={`flex size-14 flex-col items-center justify-center gap-0.5 rounded-xl border shadow-xl backdrop-blur transition-colors ${folhaTravada ? 'border-border bg-background/95 hover:bg-muted' : 'border-amber-500 bg-amber-500 text-white hover:bg-amber-600'}`}>
                  {folhaTravada ? <Lock className="size-5" /> : <LockOpen className="size-5" />}
                  <span className="text-[10px] font-bold leading-none">{folhaTravada ? 'TRAVADA' : 'SOLTA'}</span>
                </button>
                <button type="button" onClick={() => setPlantaDark((v) => !v)}
                  title={plantaDark ? 'Prancha escura — clique para a clara' : 'Prancha clara — clique para a escura (noturna)'}
                  className="flex size-14 flex-col items-center justify-center gap-0.5 rounded-xl border border-border bg-background/95 shadow-xl backdrop-blur hover:bg-muted">
                  {plantaDark ? <Sun className="size-5 text-amber-400" /> : <Moon className="size-5" />}
                  <span className="text-[10px] font-bold leading-none">{plantaDark ? 'ESCURA' : 'CLARA'}</span>
                </button>
              </>
            )}
          </div>

          {/* Barra flutuante de ferramentas unificada (Mapa/Planta) — arrastável e persistente */}
          {(vista === 'mapa' || vista === 'planta') && (
            <div
              className="no-print absolute z-[1160] flex items-center gap-2 select-none"
              style={{ left: `${posBarra.x}px`, top: `${posBarra.y}px` }}
            >
              {/* Alça de Arrasto (Drag Handle) */}
              <div
                className="flex size-7 cursor-grab items-center justify-center rounded-full border border-border bg-background/95 shadow-xl backdrop-blur active:cursor-grabbing text-muted-foreground hover:bg-accent transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setArrastandoBarra({
                    startX: e.clientX,
                    startY: e.clientY,
                    startPosX: posBarra.x,
                    startPosY: posBarra.y,
                  });
                }}
                title="Clique e arraste para mover este painel de controles"
              >
                <GripVertical className="size-3.5" />
              </div>

              {/* Seletor de Glebas (se houver múltiplas glebas no projeto) */}
              {glebas.length > 1 && (
                <div className="flex items-center gap-1 rounded-full border border-border bg-background/95 px-2.5 py-1 shadow-xl backdrop-blur text-[11px] font-semibold text-foreground">
                  <Waypoints className="size-3.5 text-primary shrink-0 mr-1" />
                  <select
                    value={glebaAtivaId}
                    onChange={(e) => trocarGleba(e.target.value)}
                    className="bg-transparent border-0 outline-none text-xs font-bold font-sans cursor-pointer text-foreground pr-2 focus:ring-0 max-w-[120px] truncate"
                  >
                    {glebas.map((g, idx) => (
                      <option key={g.id} value={g.id} className="text-foreground bg-background">
                        {g.denominacao || `Gleba ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Se estiver no MAPA e tiver parcelas INCRA */}
              {vista === 'mapa' && parcelasCert.length > 0 && (
                <div className="flex items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-1.5 shadow-xl backdrop-blur">
                  <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-foreground">
                    <input type="checkbox" className="size-3.5 accent-cyan-600" checked={mostrarCert} onChange={(e) => setMostrarCert(e.target.checked)} />
                    INCRA ({parcelasCert.length})
                  </label>
                  <span className="text-[9px] uppercase text-muted-foreground">opacidade</span>
                  <input type="range" min={0} max={0.5} step={0.02} value={opacidadeCert} disabled={!mostrarCert} onChange={(e) => setOpacidadeCert(Number(e.target.value))} className="w-16 accent-cyan-600 disabled:opacity-40" title="Opacidade do preenchimento das parcelas" />
                </div>
              )}

              {/* Área e Perímetro (sempre visíveis, em ambos os modos!) */}
              {res && (
                <div className="flex items-center gap-3 rounded-full border border-border bg-background/95 px-3.5 py-1.5 shadow-xl backdrop-blur text-[11px] font-semibold text-foreground">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-[8px] uppercase font-extrabold tracking-wider animate-pulse-slow">Área SGL:</span>
                    <span>{numBR(res.areaHa, casasTela(4))} <span className="text-[9px] font-normal text-muted-foreground">ha</span></span>
                  </div>
                  <div className="h-3 w-px bg-border" />
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-[8px] uppercase font-extrabold tracking-wider">Perímetro:</span>
                    <span>{numBR(res.perimetro)} <span className="text-[9px] font-normal text-muted-foreground">m</span></span>
                  </div>
                </div>
              )}

              {/* Player de áudio de introdução e tutorial (some durante o vídeo).
                  O contêiner é transparente, então cada pill carrega a própria sombra. */}
              {!introTocando && (
                <div className="flex items-center gap-1">
                  <IntroAudioPill />
                  <TutorialAudioPill />
                </div>
              )}

              {/* Controles específicos do modo PLANTA (travar folha e tema foram pra coluna esquerda) */}
              {vista === 'planta' && (
                <>
                  {/* Situação da Planta */}
                  {(() => {
                    const stale = !!situacaoUrl && situacaoVersSnapshot !== JSON.stringify(vertices);
                    const pronto = !!situacaoUrl && !stale;
                    const cor = pronto
                      ? 'border-emerald-600/40 bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600/20 dark:text-emerald-400'
                      : 'border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400';
                    return (
                      <button type="button" onClick={gerarSituacaoPlanta}
                        title={!situacaoUrl ? 'Capturar a planta de situação (satélite)' : stale ? 'A situação está desatualizada — clique para atualizar' : 'Situação pronta'}
                        className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-[10px] font-bold shadow-xl bg-background/95 transition-colors ${cor}`}>
                        {pronto ? <Check className="size-3.5" /> : <Camera className="size-3.5" />}
                        {!situacaoUrl ? 'Situação' : stale ? 'Atualizar Situação' : 'Situação Pronta'}
                      </button>
                    );
                  })()}

                  {/* Escala da Planta */}
                  <div className="flex items-center rounded-full border border-border bg-background/95 overflow-hidden h-8 p-1 shadow-xl gap-0.5">
                    <button
                      type="button"
                      className="h-6 w-6 rounded-full hover:bg-accent text-foreground font-bold transition-colors text-sm flex items-center justify-center"
                      title="Zoom Out / Reduzir escala"
                      onClick={() => alterarEscala(250)}
                    >
                      -
                    </button>
                    <button
                      type="button"
                      className={`h-6 px-2.5 rounded-full hover:bg-accent font-bold transition-colors text-[9px] tracking-wider flex items-center justify-center ${!plantaConfig.escalaManual ? 'text-primary' : 'text-foreground/80'}`}
                      title="Escala da Planta (clique para alternar para Automática)"
                      onClick={() => setPlantaConfig((c) => ({ ...c, escalaManual: undefined }))}
                    >
                      ESCALA{!plantaConfig.escalaManual ? ' (AUTO)' : ''}
                    </button>
                    <button
                      type="button"
                      className="h-6 w-6 rounded-full hover:bg-accent text-foreground font-bold transition-colors text-sm flex items-center justify-center"
                      title="Zoom In / Aumentar escala"
                      onClick={() => alterarEscala(-250)}
                    >
                      +
                    </button>
                  </div>
                </>
              )}

              {/* Toast indicador de Escala efetiva */}
              {vista === 'planta' && mostrarEscalaToast && (
                <div className="flex items-center bg-black text-white h-8 px-3.5 rounded-full text-[10px] tracking-wider font-bold border border-black shadow-xl animate-in fade-in slide-in-from-left-2 duration-200">
                  1 : {obterEscalaEfetiva()}
                </div>
              )}
            </div>
          )}


          {vista === 'mapa' ? (
               <MapEditor vertices={vertices} selecionadoId={selecionadoId} modo={modo} mostrarRotulos={mostrarRotulos} bloqueado={bloqueado} centralizarSig={centralizarSig}
                confrontantes={confrontantes} confrontantePorLado={confrontantePorLado}
                zona={zona} hemisferio={hemisferio}
                referencias={referencias.map((anel) => anel.map((p) => [p.lat, p.lon] as [number, number]))}
                parcelasCert={parcelasCert} onAdotarVertice={adotarVerticeVizinho} verticesVizinho={verticesVizinho}
                mostrarCert={mostrarCert} opacidadeCert={opacidadeCert} parcelaCertSel={parcelaSel} onSelParcelaCert={setParcelaSel}
                selMulti={selMulti} onToggleMulti={alternarMulti} onBoxSelect={adicionarMulti}
                onDblClick={async (lat, lon) => { const t = await perguntar({ titulo: 'Inserir texto', mensagem: 'Texto a inserir:' }); if (t) setObjetos((os) => [...os, novoTexto(pontoLL(lat, lon), t)]); }}
                outrasGlebas={glebas.filter((g) => g.id !== glebaAtivaId).map((g) => g.vertices.filter((v) => Number.isFinite(v.lat)).map((v) => [v.lat, v.lon] as [number, number]))}
                objetos={objetos} desenhoAtual={desenhoBuffer.map((p) => [p.lat, p.lon] as [number, number])} rotulos={[]} centroGleba={centroGlebaInfo} onMoverCentro={(lat, lon) => setPlantaConfig((c) => ({ ...c, centroInfoPos: { lat, lon } }))} onAjustarDivisaConf={ajustarDivisaConf} estiloVertice={plantaConfig.estiloVertice} objetoSelId={objetoSelId}
        onMover={moverVertice} onSelecionar={setSelecionadoId} onApagar={apagarVertice} onInserir={inserirVertice}
                onCliqueDesenho={onCliqueDesenho} onSelecObjeto={setObjetoSelId} onContextMenuObjeto={(id, tipo, x, y) => { setObjetoSelId(id); setMenuContexto({ tipo: 'objeto', id, objetoTipo: tipo, x, y }); }} onMoverPontoObjeto={onMoverPontoObjeto} onMoverRotulo={onMoverRotulo} onPintarDivisa={pintarDivisa} onPintarConfrontante={pintarConfrontante} onMoverRotuloVertice={onMoverRotuloVertice} onEditarConfrontante={editarConfrontantePlanta}
                conflitos={conflitos} focoLatLng={focoLatLng} onCancelDesenho={() => setDesenhoBuffer([])} tamNomes={tamNomes}
                verticesIgnorados={verticesIgnorados} onIgnorarVertice={ignorarVertice} onConsiderarVertice={considerarVertice} realceId={realceId || pincelInicioId}
                onContextMenuVertice={(v, x, y) => setMenuContexto({ tipo: 'vertice', vertice: v, x, y })}
                onContextMenuDivisa={(v, idx, x, y) => setMenuContexto({ tipo: 'divisa', vertice: v, verticeIdx: idx, x, y })}
                onContextMenuMapa={(lat, lon, x, y) => setMenuContexto({ tipo: 'mapa', lat, lon, x, y })} />
          ) : null}

          {/* MULTI-SELEÇÃO: ação flutuante para apagar os vértices marcados */}
          {vista === 'mapa' && modo === 'multi' && selMulti.size > 0 && (
            <div className="absolute left-1/2 top-3 z-[1000] -translate-x-1/2">
              <button className="flex items-center gap-2 rounded-full border border-red-500/40 bg-background/95 px-4 py-1.5 text-sm font-semibold text-red-600 shadow-lg backdrop-blur hover:bg-red-500 hover:text-white" onClick={apagarMultiSelecionados}>
                <Trash2 className="size-4" /> Apagar {selMulti.size} vértice(s) selecionado(s)
              </button>
            </div>
          )}

          {/* (o liga/desliga e a transparência das parcelas INCRA agora vivem na barra flutuante) */}

          {/* PAINEL DE INFO da parcela selecionada (não tampa o mapa: canto superior direito, estreito) */}
          {vista === 'mapa' && parcelaSel != null && parcelasCert[parcelaSel] && (
            <div className="absolute right-3 top-16 z-[1000] w-72 rounded-lg border bg-background/95 p-3 text-xs shadow-xl backdrop-blur">
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <span className="font-bold text-cyan-700 dark:text-cyan-300">{parcelasCert[parcelaSel].info.titulo}</span>
                <button className="rounded p-0.5 hover:bg-muted" onClick={() => setParcelaSel(null)} title="Fechar"><X className="size-4" /></button>
              </div>
              <div className="space-y-1">
                {parcelasCert[parcelaSel].info.linhas.length
                  ? parcelasCert[parcelaSel].info.linhas.map((l, k) => <div key={k} className="border-b border-dashed border-border/50 pb-0.5">{l}</div>)
                  : <div className="text-muted-foreground">Sem metadados extras (o serviço público do INCRA não trouxe).</div>}
                <div className="pt-1 text-[10px] text-muted-foreground">{parcelasCert[parcelaSel].anel.length} vértices. Clique num ponto da divisa para adotá-lo no seu projeto.</div>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => baixarDxfParcela(parcelaSel)}><Download className="size-3.5" /> DXF</Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => baixarShapefileParcela(parcelaSel)}><Download className="size-3.5" /> Shapefile</Button>
                </div>
              </div>
            </div>
          )}

          {vista === 'planta' && (
            <div id="planta-print" className="relative h-full select-none overflow-hidden bg-neutral-200 dark:bg-neutral-800" onWheel={onPlantaWheel}>
              {/* folha DESTRAVADA: borda verde-clara pulsante avisando que dá pra arrastar (não vai no PDF) */}
              {!folhaTravada && <div className="pointer-events-none absolute inset-0 z-[5] animate-pulse rounded-sm ring-4 ring-inset ring-green-400/70" />}
              {/* controles da planta movidos para a coluna esquerda; aqui a folha fica limpa */}
              <div className={`absolute inset-0 overflow-hidden py-2 pr-2 pl-0 ${editarPlanta ? '' : 'cursor-grab touch-none active:cursor-grabbing'}`}
                onPointerDown={(e) => { if (e.button === 1) { e.preventDefault(); plantaPanDown(e); } else if (!editarPlanta) plantaPanDown(e); }}
                onPointerMove={(e) => { if (plantaPanRef.current) plantaPanMove(e); }}
                onPointerUp={(e) => { if (plantaPanRef.current) plantaPanUp(e); }}
                title={editarPlanta ? 'Modo edição: arraste itens; botão do meio do mouse dá pan; role para dar zoom' : 'Role para dar zoom; arraste para mover'}>
                {plantaDark && <style>{`#planta-print .a3-dark{filter:invert(1) hue-rotate(180deg)}#planta-print .a3-dark image{filter:invert(1) hue-rotate(180deg)}`}</style>}
                {res && tecnico && escritorio && (
                  // folha com tamanho FIXO 1587x1123 (A3): o zoom/pan cuida do enquadramento. Sem
                  // isso, quando a área era mais estreita que 1587 a folha já nascia menor e o Foco
                  // encolhia demais (não enchia a tela).
                  <div className={`bg-white shadow ${plantaDark ? 'a3-dark' : ''}`} style={{ width: 1587, height: 1123, transform: `translate(${plantaPan.x}px, ${plantaPan.y}px) scale(${plantaZoom})`, transformOrigin: 'left top' }}>
                    <ErrorBoundary onReset={() => setVista('mapa')}>
                    <Planta vertices={vertices} res={res} imovel={imovel} tecnico={tecnico} escritorio={escritorio}
                      confrontantes={confrontantes} confrontantePorLado={confrontantePorLado} zona={zona} hemisferio={hemisferio}
                      glebaNome={glebas.length > 1 ? glebaAtivaNome : undefined} dataExtenso={dataPorExtenso()} situacaoUrl={situacaoUrl} objetos={objetos} config={plantaConfig}
                      requerente={requerente} transmitente={transmitente}
                      outrasGlebas={glebas.filter((g) => g.id !== glebaAtivaId).map((g) => ({ nome: g.denominacao, pts: g.vertices.map((v) => ({ leste: v.leste, norte: v.norte })) }))}
                      resumoGlebas={resumoGlebas} verticesVizinho={verticesVizinho}
                      editavel={editarPlanta} modo={modo} objetoSelId={objetoSelId} desenhoAtual={desenhoBuffer}
                      onCliquePlanta={onCliqueDesenho} onSelecObjeto={setObjetoSelId} onMoverPontoObjeto={onMoverPontoObjeto}
                      onContextMenuObjeto={(id, tipo, x, y) => { setObjetoSelId(id); setMenuContexto({ tipo: 'objeto', id, objetoTipo: tipo, x, y }); }}
                      onExcluirObjeto={(id) => setObjetos((os) => os.filter((o) => o.id !== id))}
                      onMoverRotuloConf={onMoverRotulo} onMoverRotuloVertice={onMoverRotuloVertice}
                      onRemoverSituacao={() => { setSituacaoUrl(undefined); setPlantaConfig((c) => ({ ...c, situacaoDataUrl: undefined })); }}
                      onEditarConfrontante={editarConfrontantePlanta} onTamRotuloConf={ajustarTamRotuloConf} onAjustarDivisaConf={ajustarDivisaConf}
                      onTextoEditar={editarTextoPlanta} onTextoMenu={(id, atual, x, y) => setMenuContexto({ tipo: 'texto', id, atual, x, y })}
                      onMoverFolha={moverFolhaPlanta} onTextoMover={moverTextoPlanta} folhaTravada={folhaTravada} onTextoStartEdit={() => setModo('texto')} onTextoPatch={patchTextoPlanta}
                      onConfigPatch={(patch) => setPlantaConfig((c) => ({ ...c, ...patch }))} onAlternarTipoVertice={alternarTipo} onRenomearVertice={renomearVertice} onIgnorarVertice={ignorarVertice} onCiclarEstilo={ciclarEstiloPlanta} />
                    </ErrorBoundary>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Faixa sensível na borda DIREITA: encostar o mouse abre o painel de dados. Some quando o
            painel já está aberto (aí quem manda é o mouse-leave do próprio painel). */}
        {!painelAberto && !introTocando && (
          <div className="no-print absolute right-0 top-0 bottom-0 z-[1999] w-[18px] bg-green-900 dark:bg-emerald-950 cursor-pointer border-l border-emerald-950/20 shadow-md hover:bg-green-800 transition-all duration-200 flex items-center justify-center text-white/30 hover:text-white/60"
            onMouseEnter={() => setPainelAberto(true)}
            title="Dados do projeto (encoste para abrir)" aria-hidden>
            <div className="w-[2px] h-10 rounded-full bg-current" />
          </div>
        )}

        {/* Painel suspenso de dados do projeto — ocupa toda a altura disponível do fim da página ao cabeçalho */}
        <div ref={painelWrap}
          className={`no-print absolute right-0 top-0 bottom-0 z-[2000] flex w-[550px] h-full flex-col border-l bg-background shadow-2xl transition-all duration-300 ${
            painelAberto
              ? 'translate-x-0 opacity-100 visible'
              : 'translate-x-full opacity-0 invisible pointer-events-none'
          }`}
          onMouseEnter={() => { painelMouseDentro.current = true; }}
          onMouseLeave={() => { painelMouseDentro.current = false; if (!asideDrag.current && !painelWrap.current?.contains(document.activeElement)) setPainelAberto(false); }}
          onBlurCapture={() => { setTimeout(() => { if (!painelMouseDentro.current && !painelWrap.current?.contains(document.activeElement)) setPainelAberto(false); }, 50); }}>
          <aside className="relative z-20 flex flex-1 flex-col overflow-hidden bg-background">
            {/* (sem barra de fechar: o painel some sozinho quando o mouse sai dele) */}
            {/* glebas */}
            <div className="flex flex-wrap items-center gap-1.5 border-b p-1.5 bg-muted/20">
            {glebas.map((g) => (
              <button key={g.id} disabled={processando} onClick={() => trocarGleba(g.id)}
                className={`shrink-0 rounded px-2 py-1 text-xs disabled:opacity-50 ${g.id === glebaAtivaId ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                {g.denominacao}
              </button>
            ))}
            <Button size="sm" variant="ghost" disabled={processando} onClick={novaGleba} title="Nova gleba"><Plus /></Button>
            <Button size="sm" variant="ghost" onClick={async () => { const n = await perguntar({ titulo: 'Renomear gleba', mensagem: 'Nome da gleba:', valorInicial: glebaAtivaNome }); if (n) renomearGlebaAtiva(n); }} title="Renomear gleba"><Pencil /></Button>
            {glebas.length > 1 && <Button size="sm" variant="ghost" disabled={processando} onClick={() => removerGleba(glebaAtivaId)} title="Remover gleba"><Trash2 /></Button>}
          </div>
          {/* resumo movido para o painel flutuante (canto sup. esquerdo do mapa/planta) */}

          {/* abas — ícone em cima, título em MAIÚSCULAS embaixo; a ativa ganha cor e traço inferior */}
          <div className="flex border-b bg-muted/20">
            {([
              ['imovel', 'IMÓVEL', <BookUser key="i" className="size-4" />],
              ['vertices', 'VÉRTICES', <Waypoints key="i" className="size-4" />],
              ['confrontantes', 'CONFRONT.', <Users key="i" className="size-4" />],
              ['planta', 'PLANTA', <MapIcon key="i" className="size-4" />],
              ['conferencia', 'CONFERIR', <CheckCircle2 key="i" className="size-4" />],
              ['projetos', 'PROJETOS', <Database key="i" className="size-4" />],
            ] as [Aba, string, React.ReactNode][]).map(([a, rot, icone]) => (
              <button key={a} onClick={() => setAba(a)} title={rot}
                className={`flex flex-1 flex-col items-center gap-0.5 border-b-2 px-1 py-1.5 text-[9px] font-bold uppercase tracking-wide transition-colors ${aba === a ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground'}`}>
                {icone}
                <span className="leading-none">{rot}</span>
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-2.5 scroll-fino">
            <datalist id="lista-cns">{sugCns.map((c) => <option key={c} value={c} />)}</datalist>
            {aba === 'imovel' && <>
              <PainelImovel imovel={imovel} onChange={setImovel} onMunicipio={aoMudarMunicipio} onLocal={aoMudarLocalidade} nome={nomeProjeto} onNome={(v) => { setNomeProjeto(v); setNomeProjetoManual(true); }} zona={zona} hemisferio={hemisferio} onZona={trocarZona} onHemisferio={trocarHemisferio} sugProp={sugProp} onSalvarProp={salvarPropCadastro} sugCartorios={sugCartorios} onIa={() => { setIaArquivoInicial(null); setIaAberta(true); }} />
              <div className="mt-2"><DocumentosProjeto projetoId={projetoId} dono="imovel" titulo="Documentos do imóvel e do proprietário" onExtrair={extrairDocumento} /></div>
            </>}
            {aba === 'vertices' && (
              <div className="space-y-1">
                <SecaoTitulo>Divisão e remembramento</SecaoTitulo>
                {/* Painel de Desmembramento */}
                <div className="mb-3 rounded-md border border-dashed p-2 bg-muted/20 text-xs">
                  <div className="font-semibold text-foreground text-[11px] mb-1 flex items-center justify-between">
                    <span>Desmembramento (Divisão)</span>
                    {(vSplitInicioId || vSplitFimId) && (
                      <button className="text-[10px] text-muted-foreground hover:text-foreground" onClick={() => { setVSplitInicioId(null); setVSplitFimId(null); }}>limpar</button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-2">Selecione dois vértices (ou clique neles e use os botões abaixo) para dividir.</p>
                  
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <span className="text-[9px] block text-muted-foreground uppercase font-medium">De:</span>
                      <select 
                        value={vSplitInicioId ?? ''} 
                        onChange={(e) => setVSplitInicioId(e.target.value || null)}
                        className="h-7 w-full rounded border bg-background px-1 text-[11px]"
                      >
                        <option value="">(Selecione)</option>
                        {vertices.map(v => <option key={v.id} value={v.id}>{v.codigoSigef || v.codigoCampo || v.nome}</option>)}
                      </select>
                    </div>
                    <div>
                      <span className="text-[9px] block text-muted-foreground uppercase font-medium">Até:</span>
                      <select 
                        value={vSplitFimId ?? ''} 
                        onChange={(e) => setVSplitFimId(e.target.value || null)}
                        className="h-7 w-full rounded border bg-background px-1 text-[11px]"
                      >
                        <option value="">(Selecione)</option>
                        {vertices.map(v => <option key={v.id} value={v.id}>{v.codigoSigef || v.codigoCampo || v.nome}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="default"
                    className="w-full h-7 text-xs font-semibold"
                    disabled={!vSplitInicioId || !vSplitFimId || vSplitInicioId === vSplitFimId}
                    onClick={executarDivisaoGleba}
                  >
                    Dividir Gleba por esta Linha
                  </Button>

                  {/* Divisão por ÁREA ALVO: corte paralelo à reta De→Até */}
                  <div className="mt-2 border-t border-dashed pt-2">
                    <span className="text-[9px] block text-muted-foreground uppercase font-medium mb-1">Ou dividir por área alvo</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="text" inputMode="decimal" value={areaAlvoHa} onChange={(e) => setAreaAlvoHa(e.target.value)}
                        placeholder="ha (ex.: 0,4)" className="h-7 flex-1 rounded border bg-background px-1 text-[11px]" />
                      <Button size="sm" variant="secondary" className="h-7 px-2 text-[11px] font-semibold"
                        disabled={!vSplitInicioId || !vSplitFimId || vSplitInicioId === vSplitFimId || !areaAlvoHa}
                        onClick={executarDivisaoPorArea} title="A linha de corte fica paralela à reta De→Até e é posicionada para dar esta área de um lado">
                        Dividir
                      </Button>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-1">A linha de divisão sai paralela à reta De→Até e é posicionada para dar a área informada de um lado.</p>
                  </div>
                </div>

                {/* Painel de Fusão (Remembramento) - exibe apenas se houver outras glebas */}
                {glebas.length > 1 && (
                  <div className="mb-3 rounded-md border border-dashed p-2 bg-muted/20 text-xs">
                    <div className="font-semibold text-foreground text-[11px] mb-1">Fusão (Remembramento)</div>
                    <p className="text-[10px] text-muted-foreground mb-2">Una a gleba ativa com outra que compartilhe a mesma divisa.</p>
                    <div className="flex flex-wrap gap-1">
                      {glebas.filter(g => g.id !== glebaAtivaId).map(g => (
                        <Button 
                          key={g.id}
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] py-0 px-2"
                          onClick={() => executarFusaoGlebas(g.id)}
                        >
                          Unir com {g.denominacao}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <SecaoTitulo>Vértices do polígono</SecaoTitulo>
                <div className="mb-2 flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" onClick={desfazer} title="Desfazer última ação"><Undo2 /> Desfazer</Button>
                  <Button size="sm" variant="outline" onClick={ordenarNorteHorario} title="Começa no vértice mais ao norte e segue no sentido horário">Norte ↻</Button>
                  <Button size="sm" variant="outline" onClick={renumerar}>Renumerar</Button>
                  <Button size="sm" variant="outline" className="text-destructive" onClick={limparPoligono} title="Apagar todo o polígono para desenhar de novo à mão"><Trash2 /> Limpar</Button>
                  <Button size="sm" variant="default" onClick={abrirPlanilha} title="Editar todos os vértices em uma planilha" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"><Table className="size-4 mr-1" /> Editar em Tabela</Button>
                </div>
                <p className="mb-1 text-[10px] text-muted-foreground">Arraste um vértice para reordenar o polígono (renumera automático).</p>
                {vertices.map((v, i) => {
                  const l = lados[i];
                  const usarGeodesico = imovel.tipoAzimute !== 'plano';
                  const azEfetivo = l ? (() => {
                    if (!usarGeodesico) return l.azimute;
                    if (v.lat != null && v.lon != null) {
                      const cm = convergenciaMeridiana(v.lat, v.lon, zona);
                      return (l.azimute + cm + 360) % 360;
                    }
                    return l.azimute;
                  })() : 0;
                  return (
                    <div key={v.id}
                      draggable
                      onDragStart={() => setDragVtxIdx(i)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => { if (dragVtxIdx != null) reordenarVertice(dragVtxIdx, i); setDragVtxIdx(null); }}
                      className={`cursor-grab rounded border p-2 text-xs ${selecionadoId === v.id ? 'border-primary bg-accent' : ''} ${dragVtxIdx === i ? 'opacity-50' : ''}`}
                      onMouseEnter={() => setRealceId(v.id)} onMouseLeave={() => setRealceId((r) => (r === v.id ? null : r))}
                      onClick={() => setSelecionadoId(v.id)}>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-semibold">{v.codigoSigef || '(sem código)'}</span>
                        <span className="flex gap-1">
                          <button className="rounded bg-secondary px-2.5 py-1 text-sm font-bold" onClick={(e) => { e.stopPropagation(); alternarTipo(v.id); }} title="Alternar tipo do marco (M/P/V)">{v.tipo}</button>
                          <button className="rounded bg-destructive px-2 py-1 text-sm text-destructive-foreground" onClick={(e) => { e.stopPropagation(); apagarVertice(v.id); }} title="Apagar vértice">×</button>
                        </span>
                      </div>
                      <div className="mt-1 text-muted-foreground">{v.codigoCampo || v.nome}</div>
                      {l && <div className="text-muted-foreground">→ {azimuteDMS(azEfetivo)} · {numBR(l.distancia)} m · {v.tipoLimite || 'LA6'}</div>}
                      {selecionadoId === v.id && (
                        <div className="mt-2 grid grid-cols-2 gap-1 border-t pt-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col gap-0.5">
                            <MiniSelect label="Tipo" value={v.tipo} options={TIPOS_VERTICE as readonly string[]} onChange={(val) => editarVertice(v.id, { tipo: val as Vertex['tipo'], isDivisa: val === 'M' })} />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <MiniSelect label="Método" value={v.metodo || 'PG6'} options={METODOS_POSICIONAMENTO as readonly string[]} onChange={(val) => editarVertice(v.id, { metodo: val })} />
                            <button type="button" className="text-[8px] text-primary hover:underline text-left mt-0.5" onClick={() => editarVariosVertices({ metodo: v.metodo || 'PG6' })}>
                              {selMulti.size > 0 ? `Aplicar à sel. (${selMulti.size})` : 'Aplicar a todos'}
                            </button>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <MiniSelect label="Limite (saída)" value={v.tipoLimite || 'LA6'} options={TIPOS_LIMITE as readonly string[]} onChange={(val) => editarVertice(v.id, { tipoLimite: val })} />
                            <button type="button" className="text-[8px] text-primary hover:underline text-left mt-0.5" onClick={() => editarVariosVertices({ tipoLimite: v.tipoLimite || 'LA6' })}>
                              {selMulti.size > 0 ? `Aplicar à sel. (${selMulti.size})` : 'Aplicar a todos'}
                            </button>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <MiniSelect label="Repres." value={v.representacao || 'linha-ideal'} options={REPRESENTACOES as readonly string[]} onChange={(val) => editarVertice(v.id, { representacao: val })} />
                            <button type="button" className="text-[8px] text-primary hover:underline text-left mt-0.5" onClick={() => editarVariosVertices({ representacao: v.representacao || 'linha-ideal' })}>
                              {selMulti.size > 0 ? `Aplicar à sel. (${selMulti.size})` : 'Aplicar a todos'}
                            </button>
                          </div>
                          <div className="col-span-2 space-y-1">
                            <Label>Altitude (m)</Label>
                            <Input type="number" step="0.01" value={String(v.elevacao)} onChange={(e) => editarVertice(v.id, { elevacao: Number(e.target.value) })} />
                          </div>
                          <div className="col-span-2 grid grid-cols-2 gap-1 mt-1">
                            <button
                              type="button"
                              onClick={async () => { setVSplitInicioId(v.id); await avisar({ titulo: 'Início da divisão', mensagem: `Vértice ${v.codigoSigef || v.nome} definido como Início da divisão.` }); }}
                              className="rounded border border-input bg-background h-6 px-1 text-[9px] hover:bg-accent font-medium text-foreground transition-colors"
                            >
                              Definir como Início
                            </button>
                            <button
                              type="button"
                              onClick={async () => { setVSplitFimId(v.id); await avisar({ titulo: 'Fim da divisão', mensagem: `Vértice ${v.codigoSigef || v.nome} definido como Fim da divisão.` }); }}
                              className="rounded border border-input bg-background h-6 px-1 text-[9px] hover:bg-accent font-medium text-foreground transition-colors"
                            >
                              Definir como Fim
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {aba === 'confrontantes' && (
              <PainelConfrontantes confrontantes={confrontantes} onChange={setConfrontantes} mapa={confrontantePorLado} lados={lados} sugConf={sugConf} onSalvarCadastro={salvarConfCadastro} imovel={imovel} tecnico={tecnico} projetoId={projetoId} onExtrairConfrontante={extrairDocumentoConfrontante} />
            )}
            {aba === 'planta' && (
              <PainelPlanta config={plantaConfig} onChange={setPlantaConfig} temSituacao={!!situacaoUrl} temLogo={!!escritorio?.logoDataUrl} numGlebas={glebas.length}
                onVerPlanta={() => setVista('planta')} onSalvarPadrao={() => { salvarPlantaPadrao(plantaConfig); aviso('Ajustes da planta salvos como padrão para os próximos trabalhos.'); }} />
            )}
            {aba === 'conferencia' && (
              <PainelConferencia vertices={vertices} res={res} imovel={imovel} confrontantes={confrontantes} onChange={setImovel} conflitos={conflitos} onIrParaConflito={(lat, lon) => setFocoLatLng([lat, lon])} />
            )}
            {aba === 'projetos' && (
              <div className="space-y-2">
                <SecaoTitulo>Projeto atual</SecaoTitulo>
                <Button size="sm" className="w-full" disabled={processando} onClick={salvar}><Save /> Salvar projeto atual</Button>
                
                {/* Botões de backup local JSON */}
                <div className="grid grid-cols-2 gap-1 bg-muted/20 p-1 rounded border">
                  <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1 px-1" disabled={processando} onClick={exportarProjetoAtualJson} title="Exportar o projeto aberto em um arquivo JSON local para backup">
                    <Download className="size-3.5" /> Exportar JSON
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1 px-1" disabled={processando} onClick={() => jsonBackupRef.current?.click()} title="Importar um projeto salvo em arquivo JSON local">
                    <Upload className="size-3.5" /> Importar JSON
                  </Button>
                </div>

                <div className="flex items-center gap-2 rounded border bg-muted/40 p-2 text-[11px] text-muted-foreground">
                  <Database className="size-3.5" /> {totalPontos} ponto(s) no banco do credenciado (nunca reusados).
                </div>
                <SecaoTitulo>Projetos salvos</SecaoTitulo>
                {projetos.length === 0 && <p className="text-xs text-muted-foreground">Nenhum projeto salvo ainda.</p>}
                {projetos.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded border p-2 text-xs">
                    <div>
                      <div className="font-medium">{p.nome}</div>
                      <div className="text-muted-foreground">{contarVertices(p)} vértices{(p.glebas?.length ?? 0) > 1 ? ` · ${p.glebas!.length} glebas` : ''}</div>
                      {p.atualizadoEm ? <div className="text-[10px] text-muted-foreground">Salvo em {new Date(p.atualizadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</div> : null}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => abrir(p.id)} title="Abrir"><FolderOpen /></Button>
                      <Button size="sm" variant="ghost" onClick={() => renomear(p)} title="Renomear"><Pencil /></Button>
                      <Button size="sm" variant="ghost" onClick={() => remover(p.id)} title="Excluir"><Trash2 /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </aside>
        </div>
      </div>

      <RequerimentoModal
        open={reqAberto} onOpenChange={setReqAberto}
        imovel={imovel} onChangeImovel={setImovel}
        tecnico={tecnico} areaRealHa={res ? valoresEfetivos(res, imovel).areaHa : 0}
        requerente={requerente} transmitente={transmitente}
        tipoAto={tipoAto} partesAdicionais={partesAdicionais}
        onChangePessoas={(r, t, ta, pa) => {
          setRequerente(r);
          setTransmitente(t);
          setTipoAto(ta);
          setPartesAdicionais(pa);
        }}
        sugProp={sugProp}
        onBaixar={() => setBaixou((b) => ({ ...b, req: true }))}
      />
      <CalculadoraModal open={calcAberta} onOpenChange={setCalcAberta} zona={zona} hemisferio={hemisferio} />
      <VerticeVirtualModal
        open={vvAberto}
        onOpenChange={(o) => { setVvAberto(o); if (!o) setVvBase(null); }}
        zona={zona}
        hemisferio={hemisferio}
        vertices={vertices}
        metodoPadrao={tecnico?.metodoPosicionamento}
        basePadrao={vvBase}
        onCriar={criarVerticeVirtual}
      />
      <ErrorBoundary onReset={() => setDxfEditorAberto(false)}><DxfEditorModal open={dxfEditorAberto} onOpenChange={setDxfEditorAberto} /></ErrorBoundary>
      <PorcentagemModal open={porcentagemAberta} onOpenChange={setPorcentagemAberta} glebas={glebas.map((g) => ({ id: g.id, nome: g.denominacao, vertices: g.id === glebaAtivaId ? vertices : g.vertices }))} />
      <ErrorBoundary onReset={() => setEstudioAberto(false)}><EstudioModal open={estudioAberto} onOpenChange={setEstudioAberto} /></ErrorBoundary>
      <ExtrairIaModal open={iaAberta} onOpenChange={(o) => { setIaAberta(o); if (!o) { setIaArquivoInicial(null); setIaConfrontanteId(null); } }} arquivoInicial={iaArquivoInicial}
        confrontantes={confrontantes.map((c) => ({ id: c.id, nome: c.nome }))}
        destinoInicial={iaConfrontanteId ?? 'imovel'}
        onAplicar={(parcial, destino) => {
          // Mapeia os campos de "pessoa" do imóvel para os de um confrontante (reaproveitado nos dois casos).
          const p = parcial as Record<string, string>;
          const patchConf = (): Partial<Confrontante> => {
            const patch: Partial<Confrontante> = {};
            if (p.proprietario) patch.nome = p.proprietario;
            if (p.cpfProprietario) patch.cpf = p.cpfProprietario;
            if (p.conjugeProprietario) patch.conjugeNome = p.conjugeProprietario;
            if (p.cpfConjugeProprietario) patch.conjugeCpf = p.cpfConjugeProprietario;
            if (p.matricula) patch.matricula = p.matricula;
            if (p.cns) patch.cns = p.cns;
            return patch;
          };
          if (destino === 'imovel') {
            setImovel((im) => ({ ...im, ...parcial }));
            aviso('Dados da IA aplicados ao imóvel — confira antes de gerar as peças.');
          } else if (destino === 'novo') {
            const id = `c_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)}`;
            setConfrontantes((cs) => [...cs, { id, nome: '', cpf: '', matricula: '', cns: '', ...patchConf() }]);
            aviso('Confrontante criado a partir do documento — pinte as divisas dele no mapa.');
          } else {
            setConfrontantes((cs) => cs.map((c) => (c.id === destino ? { ...c, ...patchConf() } : c)));
            aviso('Dados da IA aplicados ao confrontante — confira antes de gerar as peças.');
          }
        }} />
      <PrecoSugeridoModal open={precoSugAberto} onOpenChange={setPrecoSugAberto} areaHa={res ? valoresEfetivos(res, imovel).areaHa : 0} />
      <CarModal open={carAberto} onOpenChange={setCarAberto} areaHa={res ? valoresEfetivos(res, imovel).areaHa : 0}
        areasCamadas={(() => { const a = { app: 0, reservaLegal: 0, vegetacao: 0, usoConsolidado: 0 }; for (const o of objetos) if (o.tipo === 'polilinha' && o.carTema && o.pontos.length >= 3) a[o.carTema] += areaPoligonoObjeto(o); return a; })()}
        onExportarShapefiles={exportarCarShapefiles} onImportarShapefile={() => shapefileRef.current?.click()} processando={processando} />
      <RelatorioSobreposicaoModal
        isOpen={modalSobreposicaoAberto}
        onClose={() => setModalSobreposicaoAberto(false)}
        vertices={vertices}
        outrasGlebas={[
          // outras glebas do próprio projeto
          ...glebas.filter((g) => g.id !== glebaAtivaId).map((g) => ({ nome: g.denominacao, pts: g.vertices.map((v) => ({ leste: v.leste, norte: v.norte })) })),
          // parcelas certificadas importadas do SIGEF/INCRA (o motivo real de existir a análise) —
          // convertidas de lat/lon para UTM do projeto pra comparar geometria com a nossa
          ...parcelasCert.map((p, i) => ({ nome: p.info?.titulo || `Parcela INCRA ${i + 1}`, pts: p.anel.map(([lat, lon]) => geoParaUtm(lat, lon, zona, hemisferio)) })),
        ]}
      />
      <ConfrontanteEditModal
        open={confEditId != null}
        confrontante={confrontantes.find((c) => c.id === confEditId) ?? null}
        onSalvar={(novo) => setConfrontantes((cs) => cs.map((c) => (c.id === novo.id ? novo : c)))}
        onOpenChange={(o) => { if (!o) setConfEditId(null); }}
      />
      <TrtModal open={trtAberto} onOpenChange={setTrtAberto} imovel={imovel} tecnico={tecnico} onChangeImovel={setImovel}
        areaHa={res ? valoresEfetivos(res, imovel).areaHa : 0} perimetro={res ? valoresEfetivos(res, imovel).perimetro : 0} />
      <ErrataModal open={errataAberto} onOpenChange={setErrataAberto} imovel={imovel} tecnico={tecnico} confrontantes={confrontantes} areaHa={res ? valoresEfetivos(res, imovel).areaHa : 0} onBaixar={() => setBaixou((b) => ({ ...b, errata: true }))} />
      <MemorialPreviewModal
        open={prevMemorialAberto}
        onOpenChange={setPrevMemorialAberto}
        vertices={vertices}
        confrontantes={confrontantes}
        confrontantePorLado={confrontantePorLado}
        imovel={imovel}
        tecnico={tecnico}
        zona={zona}
        hemisferio={hemisferio}
        modo={prevMemorialModo}
        dataExtenso={dataPorExtenso()}
        requerente={requerente}
        transmitente={transmitente}
        onBaixar={() => exportarMemorial(prevMemorialModo)}
      />
      <ConsultarModal open={consultarAberto} onOpenChange={setConsultarAberto}
        onInserirProprietario={inserirPropConsulta} onInserirConfrontante={inserirConfConsulta}
        onInserirImovel={inserirImovelConsulta} onInserirCartorio={inserirCartorioConsulta} />

      {/* menu de contexto multiuso (clique direito dependendo do elemento/situação) */}
      {/* aviso de projeto de demonstração: verde-claro pulsante na base da tela (não vai no PDF) */}
      {imovel.ficticio && (
        <div className="pointer-events-none fixed inset-x-0 bottom-2 z-[1500] flex justify-center">
          <span className="animate-pulse rounded-full border border-green-400/40 bg-green-500/10 px-4 py-1 text-sm font-bold text-green-400 shadow-lg backdrop-blur">DADOS FICTÍCIOS — projeto de demonstração</span>
        </div>
      )}

      {menuContexto && (
        <>
          <div className="fixed inset-0 z-[1190]" onClick={() => setMenuContexto(null)} onContextMenu={(e) => { e.preventDefault(); setMenuContexto(null); }} />
          <div className="fixed z-[1200] w-52 overflow-hidden rounded-md border bg-background p-1 text-sm shadow-lg"
            style={{ left: Math.min(menuContexto.x, (typeof window !== 'undefined' ? window.innerWidth : 9999) - 220), top: menuContexto.y }}>
            
            {menuContexto.tipo === 'texto' && (
              <div className="flex flex-col gap-0.5">
                <button className="block w-full px-2 py-1.5 text-left rounded hover:bg-accent" onClick={() => { const m = menuContexto; setMenuContexto(null); editarTextoPlanta(m.id!, m.atual!); }}>Editar texto…</button>
                <button className="block w-full px-2 py-1.5 text-left rounded hover:bg-accent" onClick={() => patchTextoPlanta(menuContexto.id!, { negrito: !(plantaConfig.textos?.[menuContexto.id!]?.negrito) })}>Negrito (liga/desliga)</button>
                <button className="block w-full px-2 py-1.5 text-left rounded hover:bg-accent" onClick={() => patchTextoPlanta(menuContexto.id!, { escala: Math.min(3, +(escTextoAtual(menuContexto.id!) + 0.1).toFixed(2)) })}>Aumentar este texto</button>
                <button className="block w-full px-2 py-1.5 text-left rounded hover:bg-accent" onClick={() => patchTextoPlanta(menuContexto.id!, { escala: Math.max(0.4, +(escTextoAtual(menuContexto.id!) - 0.1).toFixed(2)) })}>Diminuir este texto</button>
                <button className="block w-full border-t px-2 py-1.5 text-left rounded hover:bg-accent text-destructive" onClick={() => { patchTextoPlanta(menuContexto.id!, { dx: 0, dy: 0 }); setMenuContexto(null); }}>Resetar posição</button>
                <button className="block w-full border-t px-2 py-1.5 text-left rounded hover:bg-accent" onClick={() => { restaurarTextoPlanta(menuContexto.id!); setMenuContexto(null); }}>Restaurar padrão</button>
              </div>
            )}

            {menuContexto.tipo === 'vertice' && menuContexto.vertice && (
              <div className="flex flex-col gap-0.5">
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">Ações do Vértice</div>
                <button className="flex items-center gap-2 w-full px-2 py-1 text-left rounded hover:bg-accent" onClick={() => { snap(); setVertices((vs) => definirInicio(vs, menuContexto.vertice!.id)); setMenuContexto(null); }}><Flag className="size-3.5" /> Definir Início</button>
                <button className="flex items-center gap-2 w-full px-2 py-1 text-left rounded hover:bg-accent text-destructive" onClick={() => { apagarVertice(menuContexto.vertice!.id); setMenuContexto(null); }}><Trash2 className="size-3.5" /> Excluir Vértice</button>
                <button className="flex items-center gap-2 w-full px-2 py-1 text-left rounded hover:bg-accent" onClick={() => { ignorarVertice(menuContexto.vertice!.id); setMenuContexto(null); }}><EyeOff className="size-3.5" /> Ignorar Vértice</button>
                
                <div className="border-t my-1" />
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">Tipo de Vértice</div>
                <div className="flex gap-1 px-1 py-0.5">
                  {['M', 'P', 'V'].map((t) => (
                    <button
                      key={t}
                      className={`flex-1 text-center py-0.5 text-xs rounded border ${menuContexto.vertice!.tipo === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}
                      onClick={() => { editarVertice(menuContexto.vertice!.id, { tipo: t as Vertex['tipo'], isDivisa: t === 'M' }); setMenuContexto(null); }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {menuContexto.tipo === 'divisa' && menuContexto.vertice && (
              <div className="flex flex-col gap-0.5">
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">Tipo da Divisa</div>
                <select
                  className="mx-1 h-8 rounded border bg-background px-1 text-xs"
                  value={menuContexto.vertice.representacao || 'linha-ideal'}
                  onChange={(e) => { definirDivisaLado(menuContexto.vertice!.id, e.target.value); setMenuContexto(null); }}
                >
                  {REPRESENTACOES.map((r) => <option key={r} value={r}>{REPRES_LABEL[r] || r}</option>)}
                </select>

                <div className="border-t my-1" />
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">Confrontante</div>
                <select
                  className="mx-1 h-8 rounded border bg-background px-1 text-xs"
                  value={confrontantePorLado[menuContexto.verticeIdx ?? -1] || ''}
                  onChange={(e) => { definirConfrontanteLado(menuContexto.verticeIdx ?? -1, e.target.value); setMenuContexto(null); }}
                >
                  <option value="">— Sem confrontante —</option>
                  {confrontantes.map((c) => <option key={c.id} value={c.id}>{c.nome || '(sem nome)'}</option>)}
                </select>
              </div>
            )}

            {menuContexto.tipo === 'mapa' && (
              <div className="flex flex-col gap-0.5">
                <button
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-left rounded hover:bg-accent"
                  onClick={() => {
                    inserirVertice(menuContexto.lat!, menuContexto.lon!);
                    setMenuContexto(null);
                  }}
                >
                  <Plus className="size-3.5" /> Inserir Vértice Aqui
                </button>
                <button
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-left rounded hover:bg-accent"
                  onClick={() => {
                    const utm = geoParaUtm(menuContexto.lat!, menuContexto.lon!, zona, hemisferio);
                    setVvBase({ leste: utm.leste, norte: utm.norte });
                    setVvAberto(true);
                    setMenuContexto(null);
                  }}
                >
                  <Waypoints className="size-3.5" /> Criar Vértice Virtual (V)…
                </button>
                <button
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-left rounded hover:bg-accent"
                  onClick={async () => {
                    const txt = await perguntar({ titulo: 'Inserir texto', mensagem: 'Texto a inserir:' });
                    if (txt) {
                      snap();
                      const utm = geoParaUtm(menuContexto.lat!, menuContexto.lon!, zona, hemisferio);
                      const novoObj: ObjetoDesenho = {
                        id: `obj_${Date.now().toString(36)}`,
                        tipo: 'texto',
                        pontos: [{ lat: menuContexto.lat!, lon: menuContexto.lon!, leste: utm.leste, norte: utm.norte }],
                        texto: txt.trim(),
                        tamanho: 12,
                      };
                      setObjetos((obs) => [...obs, novoObj]);
                    }
                    setMenuContexto(null);
                  }}
                >
                  <FileText className="size-3.5" /> Inserir Texto Aqui
                </button>
                <button
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-left rounded hover:bg-accent"
                  onClick={() => {
                    centralizar();
                    setMenuContexto(null);
                  }}
                >
                  <Target className="size-3.5" /> Centralizar Desenho
                </button>
              </div>
            )}

            {menuContexto.tipo === 'objeto' && (
              <div className="flex flex-col gap-0.5">
                {/* ----- TEXTO ----- */}
                {menuContexto.objetoTipo === 'texto' && (() => {
                  const o = objetos.find((x) => x.id === menuContexto.id);
                  return (
                    <>
                      <button className="flex items-center gap-2 w-full px-2 py-1.5 text-left rounded hover:bg-accent" onClick={async () => { const t = await perguntar({ titulo: 'Editar texto', valorInicial: o?.texto ?? '' }); if (t != null) editarObjetoSel({ texto: t }); setMenuContexto(null); }}>
                        <Pencil className="size-3.5" /> Editar texto…
                      </button>
                      <button className="flex items-center gap-2 w-full px-2 py-1.5 text-left rounded hover:bg-accent" onClick={() => { editarObjetoSel({ tamanho: (o?.tamanho ?? 12) + 2 }); }}><span className="w-3.5 text-center font-bold">A+</span> Aumentar</button>
                      <button className="flex items-center gap-2 w-full px-2 py-1.5 text-left rounded hover:bg-accent" onClick={() => { editarObjetoSel({ tamanho: Math.max(6, (o?.tamanho ?? 12) - 2) }); }}><span className="w-3.5 text-center font-bold">A-</span> Diminuir</button>
                      <div className="px-2 pt-1">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Cor do texto</div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {PALETA_DESENHO.map((p) => (
                            <button key={p.hex} type="button" title={p.nome}
                              className={`size-4 rounded-full border border-black/10 transition-transform hover:scale-115 ${o?.cor === p.hex ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                              style={{ backgroundColor: p.hex }}
                              onClick={() => editarObjetoSel({ cor: p.hex })} />
                          ))}
                        </div>
                      </div>
                    </>
                  );
                })()}

                {/* ----- SÍMBOLO ----- */}
                {menuContexto.objetoTipo === 'simbolo' && (() => {
                  const o = objetos.find((x) => x.id === menuContexto.id);
                  return (
                    <>
                      <button className="flex items-center gap-2 w-full px-2 py-1.5 text-left rounded hover:bg-accent" onClick={() => { editarObjetoSel({ tamanho: Math.min(150, (o?.tamanho ?? 30) + 5) }); }}><span className="w-3.5 text-center font-bold">S+</span> Aumentar Símbolo</button>
                      <button className="flex items-center gap-2 w-full px-2 py-1.5 text-left rounded hover:bg-accent" onClick={() => { editarObjetoSel({ tamanho: Math.max(10, (o?.tamanho ?? 30) - 5) }); }}><span className="w-3.5 text-center font-bold">S-</span> Diminuir Símbolo</button>
                      <div className="px-2 pt-1">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Cor</div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {PALETA_DESENHO.map((p) => (
                            <button key={p.hex} type="button" title={p.nome}
                              className={`size-4 rounded-full border border-black/10 transition-transform hover:scale-115 ${o?.cor === p.hex ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                              style={{ backgroundColor: p.hex }}
                              onClick={() => editarObjetoSel({ cor: p.hex })} />
                          ))}
                        </div>
                      </div>
                    </>
                  );
                })()}

                {/* ----- COTA ----- */}
                {menuContexto.objetoTipo === 'cota' && (() => {
                  const o = objetos.find((x) => x.id === menuContexto.id);
                  return (
                    <div className="space-y-2 p-1 text-[11px]">
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Cor da cota</div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {PALETA_DESENHO.map((p) => (
                            <button key={p.hex} type="button" title={p.nome}
                              className={`size-4 rounded-full border border-black/10 transition-transform hover:scale-115 ${(o?.cor ?? '#b91c1c') === p.hex ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                              style={{ backgroundColor: p.hex }}
                              onClick={() => editarObjetoSel({ cor: p.hex })} />
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Espessura: {(o?.espessura ?? 1.2).toFixed(1)}</div>
                        <div className="flex gap-1.5">
                          <button type="button" className="px-2 py-0.5 rounded border font-bold hover:bg-muted" onClick={() => editarObjetoSel({ espessura: Math.max(0.5, (o?.espessura ?? 1.2) - 0.5) })}>−</button>
                          <button type="button" className="px-2 py-0.5 rounded border font-bold hover:bg-muted" onClick={() => editarObjetoSel({ espessura: Math.min(8, (o?.espessura ?? 1.2) + 0.5) })}>+</button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ----- POLILINHA ----- */}
                {menuContexto.objetoTipo === 'polilinha' && (() => {
                  const o = objetos.find((x) => x.id === menuContexto.id);
                  if (!o) return null;
                  return (
                    <div className="space-y-2 p-1 text-[11px] max-h-[350px] overflow-y-auto">
                      {/* Cor da linha */}
                      <div>
                        <div className="font-semibold text-muted-foreground mb-1 uppercase text-[9px] tracking-wider font-bold">Cor da Linha</div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {PALETA_DESENHO.map((p) => (
                            <button key={p.hex} type="button" title={p.nome}
                              className={`size-4 rounded-full border border-black/10 transition-transform hover:scale-115 ${o.cor === p.hex ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                              style={{ backgroundColor: p.hex }}
                              onClick={() => editarObjetoSel({ cor: p.hex })} />
                          ))}
                        </div>
                      </div>

                      {/* Estilo da linha */}
                      <div>
                        <div className="font-semibold text-muted-foreground mb-1 uppercase text-[9px] tracking-wider font-bold">Tipo de Linha</div>
                        <div className="flex gap-1.5">
                          {['solido', 'tracejado', 'pontilhado'].map((est) => (
                            <button key={est} type="button"
                              className={`px-1.5 py-0.5 rounded border text-[9px] font-bold capitalize ${o.estiloLinha === est || (!o.estiloLinha && est === 'solido') ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}
                              onClick={() => editarObjetoSel({ estiloLinha: est })}>
                              {est === 'solido' ? 'Sólida' : est === 'tracejado' ? 'Tracejada' : 'Pontilhada'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Espessura da linha */}
                      <div>
                        <div className="font-semibold text-muted-foreground mb-1 uppercase text-[9px] tracking-wider font-bold">Espessura: {(o.espessura ?? 1.5).toFixed(1)}</div>
                        <div className="flex gap-1.5">
                          <button type="button" className="px-2 py-0.5 rounded border font-bold hover:bg-muted" onClick={() => editarObjetoSel({ espessura: Math.max(0.5, (o.espessura ?? 1.5) - 0.5) })}>−</button>
                          <button type="button" className="px-2 py-0.5 rounded border font-bold hover:bg-muted" onClick={() => editarObjetoSel({ espessura: Math.min(10, (o.espessura ?? 1.5) + 0.5) })}>+</button>
                        </div>
                      </div>

                      <div className="border-t my-1" />

                      {/* Preenchimento e Achuras */}
                      <button className="flex items-center gap-1.5 w-full py-1 text-left font-bold" onClick={() => editarObjetoSel({ preenchido: !o.preenchido })}>
                        <Brush className="size-3.5 text-primary" /> {o.preenchido ? 'Preenchido (Ligado)' : 'Sem Preenchimento'}
                      </button>

                      {o.preenchido && (
                        <div className="space-y-2 pl-1.5 border-l border-primary/20 animate-in fade-in duration-200">
                          {/* Cor do preenchimento */}
                          <div>
                            <div className="font-semibold text-muted-foreground mb-1 uppercase text-[9px] tracking-wider font-bold">Cor de Preenchimento</div>
                            <div className="grid grid-cols-5 gap-1.5">
                              {PALETA_DESENHO.map((p) => (
                                <button key={p.hex} type="button" title={p.nome}
                                  className={`size-4 rounded-full border border-black/10 transition-transform hover:scale-115 ${o.corPreenchimento === p.hex ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                                  style={{ backgroundColor: p.hex }}
                                  onClick={() => editarObjetoSel({ corPreenchimento: p.hex })} />
                              ))}
                            </div>
                          </div>

                          {/* Tipo de achura */}
                          <div>
                            <div className="font-semibold text-muted-foreground mb-1 uppercase text-[9px] tracking-wider font-bold">Estilo de Achura</div>
                            <div className="grid grid-cols-2 gap-1.5">
                              {[
                                { chave: 'nenhuma', rotulo: 'Sólido' },
                                { chave: 'linhas', rotulo: 'Linhas 45°' },
                                { chave: 'cruzado', rotulo: 'Grade/X' },
                                { chave: 'pontos', rotulo: 'Pontos' },
                              ].map((ach) => (
                                <button key={ach.chave} type="button"
                                  className={`px-1 py-0.5 rounded border text-[9px] font-bold ${o.achura === ach.chave || (!o.achura && ach.chave === 'nenhuma') ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}
                                  onClick={() => editarObjetoSel({ achura: ach.chave })} >
                                  {ach.rotulo}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="border-t pt-1">
                        <div className="font-semibold text-muted-foreground mb-1 uppercase text-[9px] tracking-wider font-bold">Camada CAR</div>
                        {CAR_TEMAS.map((t) => (
                          <button key={t.chave} className="flex w-full items-center gap-2 px-2 py-1 text-left rounded hover:bg-accent" onClick={() => { editarObjetoSel({ carTema: t.chave, preenchido: true, cor: t.cor }); setMenuContexto(null); aviso(`Polígono marcado como ${t.rotulo} (entra no CAR).`); }}>
                            <span className="size-3 rounded-sm" style={{ background: t.cor }} /> {t.rotulo}
                          </button>
                        ))}
                        <button className="flex w-full items-center gap-2 px-2 py-1 text-left rounded hover:bg-accent text-muted-foreground" onClick={() => { editarObjetoSel({ carTema: undefined }); setMenuContexto(null); }}><X className="size-3.5" /> Não é camada CAR</button>
                      </div>
                    </div>
                  );
                })()}
                <button className="flex items-center gap-2 w-full border-t px-2 py-1.5 text-left rounded hover:bg-accent text-destructive" onClick={() => { apagarObjetoSel(); setMenuContexto(null); }}><Trash2 className="size-3.5" /> Apagar</button>
              </div>
            )}

          </div>
        </>
      )}
      {/* Container invisível de padrões SVG para preenchimento de achuras */}
      <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
        <defs>
          {objetos.map((o) => {
            if (o.tipo === 'polilinha' && o.preenchido && o.achura && o.achura !== 'nenhuma') {
              const patId = `pat-${o.id}`;
              const color = o.corPreenchimento || o.cor || '#2563eb';
              if (o.achura === 'linhas') {
                return (
                  <pattern key={patId} id={patId} width="12" height="12" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="0" y2="12" stroke={color} strokeWidth="1.5" />
                  </pattern>
                );
              }
              if (o.achura === 'cruzado') {
                return (
                  <pattern key={patId} id={patId} width="12" height="12" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="12" x2="12" y2="12" stroke={color} strokeWidth="1.2" />
                    <line x1="0" y1="0" x2="0" y2="12" stroke={color} strokeWidth="1.2" />
                  </pattern>
                );
              }
              if (o.achura === 'pontos') {
                return (
                  <pattern key={patId} id={patId} width="10" height="10" patternUnits="userSpaceOnUse">
                    <circle cx="5" cy="5" r="2" fill={color} />
                  </pattern>
                );
              }
            }
            return null;
          })}
        </defs>
      </svg>

      <ModalSpreadsheet
        isOpen={planilhaAberta}
        onClose={() => setPlanilhaAberta(false)}
        vertices={vertices}
        onSave={salvarAlteracoesPlanilha}
        contadorSugerido={contadorSugerido}
      />
      <ModalImport
        isOpen={importModalAberto}
        onClose={() => setImportModalAberto(false)}
        onConfirm={processarImportacao}
      />
      <ConfiguracoesModal
        open={configAberta}
        onOpenChange={(o) => { setConfigAberta(o); if (!o) { const p = carregarPreferencias(); setPrefs(p); setModoApp(p.modo); setTempoCompletoMs(p.tempoCompletoMs || 0); } }}
        abaInicial={configAba}
        onConfigChange={() => { setTecnico(carregarTecnico()); setEscritorio(carregarEscritorio()); empurrarConfigParaNuvem().catch(() => {}); const p = carregarPreferencias(); setPrefs(p); setModoApp(p.modo); setTempoCompletoMs(p.tempoCompletoMs || 0); }}
      />
      {tecnico && escritorio && (
        <GestaoProjetoModal
          open={gestaoAberta}
          onOpenChange={setGestaoAberta}
          imovel={imovel}
          financeiro={imovel.financeiro ?? {}}
          onChange={(f) => setImovel((im) => ({ ...im, financeiro: f }))}
          nomeProjeto={nomeProjeto}
          areaHa={res?.areaHa ?? 0}
          perimetro={res?.perimetro ?? 0}
          tecnico={tecnico}
          escritorio={escritorio}
          dataExtenso={dataPorExtenso()}
        />
      )}
      <Dialog open={avisoReconciliarAberto} onOpenChange={(open) => {
        if (!open) {
          if (avisoReconciliarResolve) {
            avisoReconciliarResolve('voltar');
            setAvisoReconciliarResolve(null);
          }
          setAvisoReconciliarAberto(false);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reconciliar com o SIGEF antes de exportar?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm text-muted-foreground leading-relaxed">
            <p>
              A área oficial (SGL) ou o perímetro oficial do SIGEF ainda não foram preenchidos na aba <strong>'Imóvel'</strong> (Reconciliação com o SIGEF).
            </p>
            <p>
              O recomendado é conciliar antes de gerar as peças oficiais para que elas correspondam perfeitamente aos valores oficiais.
            </p>
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              if (avisoReconciliarResolve) {
                avisoReconciliarResolve('voltar');
                setAvisoReconciliarResolve(null);
              }
              setAvisoReconciliarAberto(false);
            }}>
              Voltar
            </Button>
            <Button variant="outline" size="sm" className="border-emerald-600/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-600 hover:text-white dark:text-emerald-400"
              title="Entenda a reconciliação com o SIGEF, abra a aba 'Imóvel' e preencha os valores oficiais."
              onClick={() => {
                if (avisoReconciliarResolve) {
                  avisoReconciliarResolve('conciliar');
                  setAvisoReconciliarResolve(null);
                }
                setAvisoReconciliarAberto(false);
              }}>
              Conciliar agora
            </Button>
            <Button size="sm" onClick={() => {
              if (avisoReconciliarResolve) {
                avisoReconciliarResolve('exportar');
                setAvisoReconciliarResolve(null);
              }
              setAvisoReconciliarAberto(false);
            }}>
              Exportar mesmo assim
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={explicacaoReconciliarAberta} onOpenChange={setExplicacaoReconciliarAberta}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Como funciona a Reconciliação com o SIGEF?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1 text-xs text-muted-foreground leading-relaxed">
            <p>
              O SIGEF calcula a área no plano local (SGL) utilizando fórmulas geodésicas específicas e projeções que podem causar pequenas divergências (de alguns metros quadrados) em relação aos valores puramente calculados no sistema.
            </p>
            <p className="font-semibold text-foreground">
              Para que as peças finais batam 100% com o SIGEF:
            </p>
            <ol className="list-decimal pl-4 space-y-1.5">
              <li>
                Envie a planilha ou os dados para gerar o rascunho oficial no site do <strong>SIGEF</strong>.
              </li>
              <li>
                No rascunho gerado pelo SIGEF, copie os valores exatos de <strong>Área SGL oficial (ha)</strong> e <strong>Perímetro oficial (m)</strong>.
              </li>
              <li>
                No painel à direita deste aplicativo, abra a aba <strong>'Imóvel'</strong> e localize a seção <strong>'Reconciliação com o SIGEF'</strong>.
              </li>
              <li>
                Cole esses valores oficiais nos campos correspondentes e certifique-se de que a opção <strong>'Usar os valores do SIGEF nas peças finais'</strong> está marcada.
              </li>
            </ol>
            <p>
              As peças oficiais geradas (memorial descritivo, planta, etc.) passarão a usar estes valores, garantindo concordância jurídica total.
            </p>
          </div>
          <div className="mt-4 flex justify-end">
            <Button size="sm" onClick={() => setExplicacaoReconciliarAberta(false)}>
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <IntroVideo />

      <TutorialModal open={tutorialAberto} onOpenChange={fecharTutorial} />
      <AssinaturaModal open={assinaturaAberta} onOpenChange={setAssinaturaAberta} />
      <TermosModal open={termosModalAberto} onAceitar={() => { setTermosOk(true); setTermosModalAberto(false); const a = acaoAposTermos.current; acaoAposTermos.current = null; a?.(); }} />
      <PrimeiroAcessoModal open={!setupOk} onConcluir={() => { try { localStorage.setItem('metrica.setupFeito', '1'); } catch { /* ignore */ } setTecnico(carregarTecnico()); setEscritorio(carregarEscritorio()); setSetupOk(true); }} onVoltarLogin={() => { limparConfigLocalNaSaida(); sair(); }} />
      <MasterPainelModal
        open={masterAberto}
        onOpenChange={(o) => {
          setMasterAberto(o);
          if (!o) carregarConfigAssinatura().then((c) => setOcultarCobranca(!!c.ocultarCobranca)).catch(() => {});
        }}
      />
      <ProjetoInfoModal
        open={infoAberto}
        onOpenChange={setInfoAberto}
        projetoId={projetoId}
        nome={nomeProjeto}
        imovel={imovel}
        tecnico={tecnico}
        areaHa={res?.areaHa ?? 0}
        perimetro={res?.perimetro ?? 0}
        vertices={vertices}
        confrontantes={confrontantes}
        confrontantePorLado={confrontantePorLado}
        numGlebas={glebas.length}
      />
      <PontosBancoModal open={pontosAberto} onOpenChange={setPontosAberto} />
      <PlanilhaConferenciaModal
        open={planilhaConfAberta} onOpenChange={setPlanilhaConfAberta}
        imovel={imovel} res={res} confrontantes={confrontantes} confrontantePorLado={confrontantePorLado} tecnico={tecnico}
        onBaixar={() => { setPlanilhaConfAberta(false); exportarOds(); }}
      />
      <ImportPreviewModal
        open={!!previewData}
        onOpenChange={(open) => { if (!open) setPreviewData(null); }}
        pontos={(previewData?.vs || []).map((v: Vertex) => ({ nome: v.codigoSigef || v.nome || '', leste: v.leste, norte: v.norte }))}
        zona={previewData?.z ?? zona} hemisferio={hemisferio} fusosPermitidos={tecnico?.fusosPermitidos}
        onConfirm={concluirImportacao}
      />

    </div>
  );
}

// ---------------- subcomponentes ----------------

function MiniSelect({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <select className="h-7 w-full rounded border border-input bg-background px-1 text-xs" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// Título de uma seção do formulário de Dados — dá cara de cadastro profissional (maiúsculas + traço).
function SecaoTitulo({ children }: { children: ReactNode }) {
  return <div className="mt-1 border-b pb-1 text-[10px] font-bold uppercase tracking-wider text-primary/80">{children}</div>;
}

function Campo({ label, value, onChange, placeholder, list }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; list?: string }) {
  return (
    <div className="space-y-0.5">
      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Input list={list} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="h-8 text-sm" />
    </div>
  );
}

function PainelImovel({ imovel, onChange, onMunicipio, onLocal, nome, onNome, zona, hemisferio, onZona, onHemisferio, sugProp, onSalvarProp, sugCartorios, onIa }: {
  imovel: ImovelData; onChange: (i: ImovelData) => void; onMunicipio: (s: string) => void; onLocal: (s: string) => void;
  nome: string; onNome: (s: string) => void;
  zona: number; hemisferio: 'N' | 'S'; onZona: (z: number) => void; onHemisferio: (h: 'N' | 'S') => void;
  sugProp: ProprietarioCad[]; onSalvarProp: () => void; sugCartorios: CartorioCad[];
  onIa?: () => void;
}) {
  const set = (k: keyof ImovelData, v: string) => onChange({ ...imovel, [k]: v });
  function setProprietario(v: string) {
    const m = sugProp.find((p) => p.nome === v);
    onChange(m ? { ...imovel, proprietario: v, cpfProprietario: m.cpf, tipoPessoa: m.tipoPessoa } : { ...imovel, proprietario: v });
  }
  return (
    <div className="space-y-2">
      {/* Seletor Deslizante Rural / Urbano */}
      <div className="flex rounded-md bg-secondary p-0.5 text-xs font-medium">
        <button
          type="button"
          onClick={() => onChange({ ...imovel, tipoImovel: 'rural' })}
          className={`flex-1 rounded py-1 text-center transition-all ${imovel.tipoImovel !== 'urbano' ? 'bg-background shadow-sm text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Rural
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...imovel, tipoImovel: 'urbano' })}
          className={`flex-1 rounded py-1 text-center transition-all ${imovel.tipoImovel === 'urbano' ? 'bg-background shadow-sm text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Urbano
        </button>
      </div>

      {onIa && (
        <button
          type="button"
          onClick={onIa}
          className="w-full flex items-center justify-between p-3.5 rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/5 to-transparent hover:from-violet-500/15 hover:via-fuchsia-500/10 transition-all group shadow-sm text-left mt-1"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-600 rounded-lg text-white group-hover:scale-105 transition-transform shadow">
              <Sparkles className="size-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                Leitura Automática com IA
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                Envie PDF da Matrícula, Escritura ou Imagens e a IA preenche o cadastro.
              </div>
            </div>
          </div>
          <ChevronRight className="size-4 text-violet-500 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      <SecaoTitulo>Identificação do imóvel</SecaoTitulo>
      <Campo label="Nome do projeto" value={nome} onChange={onNome} />
      <Campo label="Denominação do imóvel" value={imovel.denominacao} onChange={(v) => set('denominacao', v)} placeholder={imovel.tipoImovel === 'urbano' ? "Lote / Residencial..." : "Fazenda..."} />
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Matrícula" value={imovel.matricula} onChange={(v) => set('matricula', v)} />
        <Campo label="Cartório (CNS)" value={imovel.cns} onChange={(v) => set('cns', v)} list="lista-cns" />
      </div>
      {sugCartorios.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {sugCartorios.map((c) => (
            <button key={c.id} onClick={() => set('cns', c.cns)} title={`${c.nome}${c.municipio ? ` — ${c.municipio}` : ''}`}
              className={`rounded border px-1.5 py-0.5 text-[10px] ${imovel.cns === c.cns ? 'border-primary bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'}`}>
              {c.nome ? c.nome.replace(/Cart[óo]rio.*?de\s*/i, '').slice(0, 22) : c.cns}
            </button>
          ))}
        </div>
      )}

      {imovel.tipoImovel === 'urbano' ? (
        <>
          <Campo label="Inscrição Municipal" value={imovel.inscricaoMunicipal ?? ''} onChange={(v) => set('inscricaoMunicipal', v)} placeholder="Inscrição municipal..." />
          <div className="grid grid-cols-2 gap-2">
            <Campo label="Frente (m)" value={imovel.frenteM != null ? String(imovel.frenteM) : ''} onChange={(v) => onChange({ ...imovel, frenteM: v === '' ? undefined : Number(v) })} placeholder="0.00" />
            <Campo label="Fundos (m)" value={imovel.fundosM != null ? String(imovel.fundosM) : ''} onChange={(v) => onChange({ ...imovel, fundosM: v === '' ? undefined : Number(v) })} placeholder="0.00" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Campo label="Dist. Esquina (m)" value={imovel.distanciaEsquinaM != null ? String(imovel.distanciaEsquinaM) : ''} onChange={(v) => onChange({ ...imovel, distanciaEsquinaM: v === '' ? undefined : Number(v) })} placeholder="0.00" />
            <Campo label="Rua da Esquina" value={imovel.esquinaRua ?? ''} onChange={(v) => set('esquinaRua', v)} placeholder="Rua..." />
          </div>
        </>
      ) : (
        <>
          <Campo label="Código do Imóvel (SNCR/INCRA)" value={imovel.codigoImovelIncra} onChange={(v) => set('codigoImovelIncra', v)} />
          {/* Padrão do memorial: só oferecido quando o imóvel é de Mato Grosso (INTERMAT). */}
          {ufDoMunicipio(imovel.municipio) === 'MT' && (
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Padrão do memorial</Label>
              <div className="flex rounded-md bg-secondary p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => onChange({ ...imovel, padraoMemorial: 'incra' })}
                  className={`flex-1 rounded py-1 text-center transition-all ${(imovel.padraoMemorial ?? 'incra') === 'incra' ? 'bg-background shadow-sm text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  INCRA / SIGEF
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...imovel, padraoMemorial: 'intermat' })}
                  className={`flex-1 rounded py-1 text-center transition-all ${imovel.padraoMemorial === 'intermat' ? 'bg-background shadow-sm text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  INTERMAT (MT)
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground leading-snug">
                INTERMAT adiciona ao memorial a referência ao Instituto de Terras de Mato Grosso e o parágrafo de finalidade da regularização estadual. O restante da peça é o mesmo padrão do Incra.
              </p>
            </div>
          )}
        </>
      )}
      <SecaoTitulo>Proprietário e partes</SecaoTitulo>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Proprietário</Label>
          <button className="text-[10px] text-primary hover:underline" onClick={onSalvarProp}>salvar no cadastro</button>
        </div>
        <Input list="lista-proprietarios" value={imovel.proprietario} onChange={(e) => setProprietario(e.target.value)} className="h-8 text-sm" />
        <datalist id="lista-proprietarios">
          {sugProp.map((p) => <option key={p.id} value={p.nome} />)}
        </datalist>
      </div>
      <Campo label="CPF/CNPJ do proprietário" value={imovel.cpfProprietario} onChange={(v) => set('cpfProprietario', v)} />
      
      {/* Comprador (para compra e venda / transferências) */}
      <div className="flex items-center justify-between">
        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Comprador (se houver)</Label>
        {imovel.comprador && (
          <button
            type="button"
            className="text-[10px] text-primary hover:underline font-bold"
            onClick={async () => {
              if (await confirmar({ titulo: 'Promover comprador', mensagem: `Deseja promover o comprador "${imovel.comprador}" a proprietário do imóvel? As informações atuais do proprietário serão substituídas.`, okLabel: 'Promover' })) {
                onChange({
                  ...imovel,
                  proprietario: imovel.comprador || '',
                  cpfProprietario: imovel.cpfComprador || '',
                  comprador: '',
                  cpfComprador: '',
                });
              }
            }}
          >
            Tornar Proprietário (Transmissão)
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Nome do comprador" value={imovel.comprador ?? ''} onChange={(v) => set('comprador', v)} placeholder="Se houver..." />
        <Campo label="CPF/CNPJ do comprador" value={imovel.cpfComprador ?? ''} onChange={(v) => set('cpfComprador', v)} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Campo label="Cônjuge do proprietário" value={imovel.conjugeProprietario ?? ''} onChange={(v) => set('conjugeProprietario', v)} />
        <Campo label="CPF do cônjuge" value={imovel.cpfConjugeProprietario ?? ''} onChange={(v) => set('cpfConjugeProprietario', v)} />
      </div>
      <SecaoTitulo>Localização e fuso</SecaoTitulo>
      <div className="space-y-1">
        <Campo label="Município" value={imovel.municipio} onChange={onMunicipio} placeholder="Espera Feliz-MG" />
        <div className="flex flex-wrap gap-1">
          {MUNICIPIOS_ATALHO.map((m) => (
            <button key={m} onClick={() => onMunicipio(m)} title={`Usar ${m} (ajusta o fuso)`}
              className={`rounded border px-1.5 py-0.5 text-[10px] ${imovel.municipio === m ? 'border-primary bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'}`}>
              {m.replace(/-[A-Z]{2}$/, '')}
            </button>
          ))}
        </div>
      </div>
      <Campo label="Local (memorial)" value={imovel.local} onChange={onLocal} placeholder="Córrego ..., Cidade-UF" />
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Fuso UTM</Label>
          <div className="flex rounded-md border border-input p-0.5">
            {(['S', 'N'] as const).map((h) => (
              <button key={h} type="button" onClick={() => onHemisferio(h)}
                className={`rounded px-2.5 py-0.5 text-[11px] font-semibold uppercase transition-colors ${hemisferio === h ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
                {h === 'S' ? 'Sul' : 'Norte'}
              </button>
            ))}
          </div>
        </div>
        {/* Todos os fusos do Brasil continental e ilhas (18 a 25): um toque escolhe qualquer um. */}
        <div className="grid grid-cols-8 gap-1">
          {[18, 19, 20, 21, 22, 23, 24, 25].map((z) => (
            <button key={z} type="button" onClick={() => onZona(z)} title={`Fuso ${z}${hemisferio}`}
              className={`rounded border py-1 text-xs font-bold transition-colors ${zona === z ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-input bg-secondary text-secondary-foreground hover:bg-accent'}`}>
              {z}
            </button>
          ))}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">O sistema já detecta o fuso ao importar o TXT. Se precisar corrigir, toque no fuso certo acima — todos os do Brasil estão disponíveis.</p>
      
      <div className="space-y-1 mt-1 border-t pt-2">
        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Cálculo de Azimute nas Peças</Label>
        <select
          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
          value={imovel.tipoAzimute ?? 'geodesico'}
          onChange={(e) => set('tipoAzimute', e.target.value)}
        >
          <option value="geodesico">Azimutes Geodésicos (Recomendado SIGEF)</option>
          <option value="plano">Azimutes Planos (Grid de Quadrícula UTM)</option>
        </select>
        <p className="text-[10px] text-muted-foreground leading-snug">
          {(imovel.tipoAzimute ?? 'geodesico') === 'geodesico' ? (
            <span>
              <strong>Geodésico (Verdadeiro):</strong> Corrige a distorção da projeção com a Convergência Meridiana (CM). Padrão exigido pelo SIGEF/INCRA.
            </span>
          ) : (
            <span>
              <strong>Plano (Quadrícula):</strong> Usa os ângulos puramente cartesianos calculados na grade plana UTM. Indicado para loteamentos e projetos simples de prefeitura.
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

function PainelConferencia({ vertices, res, imovel, confrontantes, onChange, conflitos, onIrParaConflito }: {
  vertices: Vertex[]; res: ReturnType<typeof calcular> | null; imovel: ImovelData; confrontantes: Confrontante[]; onChange: (i: ImovelData) => void;
  conflitos: ConflitoDivisa[];
  onIrParaConflito: (lat: number, lon: number) => void;
}) {
  const problemas: Problema[] = conferir(vertices, res, imovel, confrontantes);
  const Icone = ({ n }: { n: Problema['nivel'] }) =>
    n === 'erro' ? <XCircle className="text-destructive" /> : n === 'aviso' ? <AlertTriangle className="text-amber-500" /> : <CheckCircle2 className="text-primary" />;
  const ef = res ? valoresEfetivos(res, imovel) : null;
  const num = (v: number | undefined) => (v == null ? '' : String(v));
  return (
    <div className="space-y-3">
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardHeader className="pb-1.5 pt-2">
          <CardTitle className="text-[11px] text-blue-700 dark:text-blue-300 font-bold flex items-center gap-1.5">
            <Info className="size-4 text-blue-500" />
            Limites Legais de Precisão (INCRA)
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-2 text-[10px] text-muted-foreground space-y-1">
          <p>Para aprovação no SIGEF, os vértices devem atender aos limites de desvio padrão (sigma):</p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li><b>Limites Artificiais (LA):</b> 0.10 m (muros, cercas, marcos)</li>
            <li><b>Limites Naturais (LN):</b> 3.00 m (rios, córregos, serras)</li>
            <li><b>Limites Inacessíveis (LV):</b> 7.50 m (grotas, encostas)</li>
            <li><b>Vertical (Sigma Z):</b> máximo de 0.30 m recomendado para LA</li>
          </ul>
        </CardContent>
      </Card>

      {conflitos.length > 0 && (
        <Card className="border-pink-500/20 bg-pink-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-pink-700 dark:text-pink-300 font-bold flex items-center gap-1.5">
              <AlertTriangle className="size-4 text-pink-500" />
              Conflitos de Divisa (SIGEF)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground mb-1">
              Detectados desvios em relação aos confrontantes certificados importados. Clique para focar no mapa.
            </p>
            {conflitos.map((c, i) => {
              const label = c.tipo === 'sobreposicao' ? 'Sobreposição' : 'Vão';
              const corLabel = c.tipo === 'sobreposicao' ? 'text-pink-600 dark:text-pink-400 font-semibold' : 'text-cyan-600 dark:text-cyan-400 font-semibold';
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onIrParaConflito(c.pontoConflito.lat, c.pontoConflito.lon)}
                  className="w-full text-left flex items-center justify-between text-[11px] rounded border border-border bg-background p-1.5 hover:bg-accent transition-colors"
                >
                  <span>
                    Lado {c.ladoIdx + 1} ({vertices[c.ladoIdx]?.codigoSigef || c.ladoIdx + 1} → {vertices[(c.ladoIdx + 1) % vertices.length]?.codigoSigef || c.ladoIdx + 2}): <span className={corLabel}>{label}</span>
                  </span>
                  <span className="font-mono text-muted-foreground text-[10px]">
                    {numBR(c.distancia)} m
                  </span>
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="space-y-1">
        {problemas.map((p, i) => (
          <div key={i} className="flex items-start gap-2 rounded border p-2 text-xs">
            <span className="mt-0.5 [&_svg]:size-4"><Icone n={p.nivel} /></span>
            <span><b className="capitalize">{p.campo}:</b> {p.msg}</span>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle>Reconciliação com o SIGEF</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-[10px] text-muted-foreground">O SIGEF recalcula a área SGL e costuma diferir alguns m². Cole aqui os valores do rascunho oficial; as peças finais passam a usá-los.</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Área SGL oficial (ha)</Label>
              <Input type="number" step="0.0001" value={num(imovel.areaSigefHa)} onChange={(e) => onChange({ ...imovel, areaSigefHa: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div className="space-y-1">
              <Label>Perímetro oficial (m)</Label>
              <Input type="number" step="0.01" value={num(imovel.perimetroSigef)} onChange={(e) => onChange({ ...imovel, perimetroSigef: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={!!imovel.usarValoresSigef} onChange={(e) => onChange({ ...imovel, usarValoresSigef: e.target.checked })} />
            Usar os valores do SIGEF nas peças finais
          </label>
          {ef && <div className="text-[11px] text-muted-foreground">Nas peças: <b>{numBR(ef.areaHa, 4)} ha</b> · {numBR(ef.perimetro)} m <span className="uppercase">({ef.fonte})</span></div>}
        </CardContent>
      </Card>
    </div>
  );
}

function PainelConfrontantes({ confrontantes, onChange, mapa, lados, sugConf, onSalvarCadastro, imovel, tecnico, projetoId, onExtrairConfrontante }: {
  confrontantes: Confrontante[]; onChange: (c: Confrontante[]) => void;
  mapa: Record<number, string>; lados: Lado[];
  sugConf: ConfrontanteCad[]; onSalvarCadastro: (c: Confrontante) => void;
  imovel: ImovelData; tecnico: TecnicoData | null;
  projetoId: string | null; onExtrairConfrontante: (a: ArquivoProjeto, confrontanteId: string) => void;
}) {
  const set = (id: string, k: keyof Confrontante, v: string) =>
    onChange(confrontantes.map((c) => (c.id === id ? ({ ...c, [k]: v } as Confrontante) : c)));
  const setTam = (id: string, delta: number) =>
    onChange(confrontantes.map((c) => (c.id === id ? { ...c, tamRotulo: Math.max(6, Math.min(22, (c.tamRotulo ?? 10) + delta)) } : c)));
  const setNome = (id: string, v: string) => {
    const m = sugConf.find((s) => s.nome === v);
    onChange(confrontantes.map((c) => (c.id === id
      ? (m ? { ...c, nome: v, cpf: m.cpf, matricula: m.matricula, cns: m.cns, descricaoExtra: m.descricaoExtra,
              condicao: m.condicao, conjugeNome: m.conjugeNome, conjugeCpf: m.conjugeCpf,
              inventarianteNome: m.inventarianteNome, inventarianteCpf: m.inventarianteCpf } : { ...c, nome: v })
      : c)));
  };
  const ladosDe = (id: string) => Object.entries(mapa).filter(([, cid]) => cid === id).map(([i]) => Number(i));

  const exportarAnuenciaConfrontante = async (c: Confrontante) => {
    if (!tecnico) {
      await avisar({ titulo: 'Responsável técnico', mensagem: 'Configure o responsável técnico primeiro nas configurações.' });
      return;
    }
    try {
      const idxs = ladosDe(c.id);
      const compartilhados = idxs.map((i) => lados[i]).filter(Boolean);
      
      const doc = gerarAnuenciaDocumento({
        imovel,
        tecnico,
        confrontante: c,
        verticesCompartilhados: compartilhados
      });
      
      const blobBruto = await Packer.toBlob(doc);
      const blob = await compatibilizarWord2007(blobBruto);
      saveAs(blob, `Carta de Anuencia - ${c.nome || 'Confrontante'}.docx`);
    } catch (err) {
      await avisar({ titulo: 'Carta de Anuência', mensagem: 'Erro ao gerar a Carta de Anuência.' });
    }
  };

  return (
    <div className="space-y-3">
      {confrontantes.length === 0 && <p className="text-xs text-muted-foreground">Use “pintar confrontante” no mapa, ou importe os vizinhos certificados, para criar os confrontantes.</p>}
      <datalist id="lista-confrontantes">
        {sugConf.map((s) => <option key={s.id} value={s.nome} />)}
      </datalist>
      {confrontantes.map((c) => {
        const idxs = ladosDe(c.id);
        return (
          <Card key={c.id}>
            <CardContent className="space-y-2 p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="inline-block h-0 w-5 shrink-0 border-t-[3px] border-dashed" style={{ borderColor: corPorConfrontante(c.id) }} title="Cor deste confrontante no mapa" />
                  {idxs.length} lado(s){lados.length ? `: ${idxs.map((i) => lados[i]?.de.codigoSigef).filter(Boolean).join(', ')}` : ''}
                </span>
                <div className="flex gap-2">
                  <button className="text-[10px] text-primary hover:underline" onClick={() => exportarAnuenciaConfrontante(c)}>gerar carta (.docx)</button>
                  <button className="text-[10px] text-primary hover:underline" onClick={() => onSalvarCadastro(c)}>salvar no cadastro</button>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input list="lista-confrontantes" value={c.nome} onChange={(e) => setNome(c.id, e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Condição</Label>
                <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={c.condicao ?? 'proprietario'} onChange={(e) => {
                    const cond = e.target.value as Confrontante['condicao'];
                    // limpa campos incompatíveis ao trocar a condição (evita dados órfãos na peça)
                    const limpa = cond === 'espolio' ? { conjugeNome: '', conjugeCpf: '' } : { inventarianteNome: '', inventarianteCpf: '' };
                    onChange(confrontantes.map((x) => (x.id === c.id ? { ...x, condicao: cond, ...limpa } : x)));
                  }}>
                  <option value="proprietario">Proprietário</option>
                  <option value="posseiro">Posseiro (sem matrícula)</option>
                  <option value="espolio">Espólio (assina inventariante)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Campo label="CPF/CNPJ" value={c.cpf} onChange={(v) => set(c.id, 'cpf', v)} />
                {(c.condicao ?? 'proprietario') !== 'posseiro' && <Campo label="Matrícula" value={c.matricula} onChange={(v) => set(c.id, 'matricula', v)} />}
              </div>
              {(c.condicao ?? 'proprietario') === 'espolio' && (
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="Inventariante" value={c.inventarianteNome ?? ''} onChange={(v) => set(c.id, 'inventarianteNome', v)} />
                  <Campo label="CPF do inventariante" value={c.inventarianteCpf ?? ''} onChange={(v) => set(c.id, 'inventarianteCpf', v)} />
                </div>
              )}
              {(c.condicao ?? 'proprietario') !== 'espolio' && (
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="Cônjuge" value={c.conjugeNome ?? ''} onChange={(v) => set(c.id, 'conjugeNome', v)} />
                  <Campo label="CPF do cônjuge" value={c.conjugeCpf ?? ''} onChange={(v) => set(c.id, 'conjugeCpf', v)} />
                </div>
              )}
              <Campo label="Cartório (CNS)" value={c.cns} onChange={(v) => set(c.id, 'cns', v)} list="lista-cns" />
              <Campo label="Descrição extra (sobrepõe o texto automático)" value={c.descricaoExtra ?? ''} onChange={(v) => set(c.id, 'descricaoExtra', v)} />
              <div className="flex items-center gap-2">
                <Label className="text-[11px]">Tamanho do rótulo/assinatura</Label>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" title="Diminuir" onClick={() => setTam(c.id, -1)}>A-</Button>
                  <span className="w-6 text-center text-xs">{c.tamRotulo ?? 10}</span>
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" title="Aumentar" onClick={() => setTam(c.id, 1)}>A+</Button>
                </div>
              </div>
              <DocumentosProjeto projetoId={projetoId} dono="confrontante" confrontanteId={c.id} titulo="Documentos deste confrontante" onExtrair={(a) => onExtrairConfrontante(a, c.id)} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function PainelPlanta({ config, onChange, temSituacao, temLogo, numGlebas, onVerPlanta, onSalvarPadrao }: {
  config: PlantaConfig; onChange: (c: PlantaConfig) => void; temSituacao: boolean; temLogo: boolean; numGlebas: number; onVerPlanta: () => void; onSalvarPadrao: () => void;
}) {
  const multiplasGlebas = numGlebas > 1;
  const set = (patch: Partial<PlantaConfig>) => onChange({ ...config, ...patch });
  const [titulos, setTitulos] = useState<string[]>([]);
  useEffect(() => { setTitulos(carregarTitulos()); }, []);
  const tituloAtual = (config.titulo ?? '').trim();
  const podeSalvarTitulo = tituloAtual.length > 0 && !titulos.includes(tituloAtual);
  type BoolKey = 'mostrarGrade' | 'mostrarNortes' | 'mostrarConvencoes' | 'mostrarEscalaGrafica' | 'mostrarSituacao' | 'mostrarDivisaConf' | 'mostrarVerticesVizinho';
  const chk = (label: string, key: BoolKey) => (
    <label className="flex items-center gap-2 text-xs">
      <input type="checkbox" checked={config[key] !== false} onChange={(e) => set({ [key]: e.target.checked } as Partial<PlantaConfig>)} />
      {label}
    </label>
  );
  return (
    <div className="space-y-3">
      <Button size="sm" variant="outline" className="w-full" onClick={onVerPlanta}><Printer /> Ver / atualizar planta</Button>
      <p className="text-[10px] text-muted-foreground">Tudo aqui é opcional: em branco usa o padrão. O layout A3 e o carimbo continuam padronizados.</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label>Título da planta</Label>
          {podeSalvarTitulo && (
            <button type="button" className="text-[10px] text-primary hover:underline" onClick={() => setTitulos(adicionarTitulo(tituloAtual))}>salvar na lista</button>
          )}
        </div>
        <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          value={titulos.includes(tituloAtual) ? tituloAtual : ''}
          onChange={(e) => { if (e.target.value) set({ titulo: e.target.value }); }}>
          <option value="">— escolher um modelo de título —</option>
          {titulos.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <Input value={config.titulo ?? ''} onChange={(e) => set({ titulo: e.target.value })} placeholder="Levantamento Planimétrico Georreferenciado (ou escolha acima)" />
        <p className="text-[10px] text-muted-foreground">Escolha um modelo pronto ou digite o seu. Também dá pra editar direto na planta (dois cliques no título).</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Folha" value={config.folha ?? ''} onChange={(v) => set({ folha: v })} placeholder="Única" />
        <div className="space-y-1">
          <Label>Escala (1 : …)</Label>
          <Input type="number" placeholder="automática" value={config.escalaManual ? String(config.escalaManual) : ''}
            onChange={(e) => set({ escalaManual: e.target.value ? Number(e.target.value) : undefined })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>Fonte dos rótulos</Label>
          <Input type="number" step="0.5" placeholder="8.5" value={config.fonteRotulos ? String(config.fonteRotulos) : ''}
            onChange={(e) => set({ fonteRotulos: e.target.value ? Number(e.target.value) : undefined })} />
        </div>
        <div className="space-y-1">
          <Label>Escala de todos os textos</Label>
          <Input type="number" step="0.05" placeholder="1.0" value={config.escalaTextos ? String(config.escalaTextos) : ''}
            onChange={(e) => set({ escalaTextos: e.target.value ? Number(e.target.value) : undefined })} />
        </div>
      </div>
      <div className="space-y-1 rounded border p-2">
        <div className="text-[10px] uppercase text-muted-foreground">Mostrar na planta</div>
        {chk('Grade de coordenadas', 'mostrarGrade')}
        {chk('Nortes (rosa dos ventos)', 'mostrarNortes')}
        {chk('Convenções (legenda)', 'mostrarConvencoes')}
        {chk('Escala gráfica', 'mostrarEscalaGrafica')}
        {chk('Planta de situação', 'mostrarSituacao')}
        {chk('Tiques de troca de confrontante (marcos M)', 'mostrarDivisaConf')}
        {chk('Vértices de vizinhos certificados', 'mostrarVerticesVizinho')}
        {/* quadro de áreas e roteiro: padrão DESLIGADO (por isso não usam o chk, que assume ligado) */}
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={config.mostrarQuadroAreas === true} onChange={(e) => set({ mostrarQuadroAreas: e.target.checked })} />
          Quadro de áreas (resumo de todos os polígonos)
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={config.mostrarRoteiro === true} onChange={(e) => set({ mostrarRoteiro: e.target.checked })} />
          Roteiro perimétrico (tabela vértice → azimute → distância)
        </label>
        {config.mostrarRoteiro && (
          <label className="ml-5 flex items-center gap-2 text-xs">
            <input type="checkbox" checked={config.roteiroComConfrontante !== false} onChange={(e) => set({ roteiroComConfrontante: e.target.checked })} />
            incluir coluna de confrontante
          </label>
        )}
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={config.mostrarCoordenadas === true} onChange={(e) => set({ mostrarCoordenadas: e.target.checked })} />
          Quadro de coordenadas dos vértices (UTM E/N, Altitude, Limite/Método)
        </label>
      </div>
      <div className="space-y-1 rounded border p-2">
        <div className="text-[10px] uppercase text-muted-foreground">Nome dos vértices</div>
        <select className="h-8 w-full rounded border bg-background px-2 text-sm" value={config.estiloVertice ?? 'sigef'} onChange={(e) => set({ estiloVertice: e.target.value as 'sigef' | 'convencional' })}>
          <option value="sigef">Código SIGEF (ex.: COIN-M-0017)</option>
          <option value="convencional">Topografia convencional (P1, P2, P3…)</option>
        </select>
      </div>
      <div className="space-y-1 rounded border p-2">
        <div className="text-[10px] uppercase text-muted-foreground">Estilização das Linhas (Planta)</div>
        <div className="grid grid-cols-2 gap-2 mt-1">
          {multiplasGlebas ? (
            <div className="space-y-1">
              <Label className="text-[10px]">Cor do perímetro (gleba ativa)</Label>
              <Input type="text" placeholder="#7c2d12" value={config.corPoligono ?? ''} onChange={(e) => set({ corPoligono: e.target.value || undefined })} className="h-7 text-xs" />
            </div>
          ) : (
            <p className="col-span-2 text-[10px] text-muted-foreground">A cor do perímetro só é personalizável quando o projeto tem mais de uma gleba (serve para diferenciar uma da outra na planta).</p>
          )}
          <div className="space-y-1">
            <Label className="text-[10px]">Espessura perímetro</Label>
            <Input type="number" step="0.1" placeholder="1.8" value={config.larguraPoligono ? String(config.larguraPoligono) : ''} onChange={(e) => set({ larguraPoligono: e.target.value ? Number(e.target.value) : undefined })} className="h-7 text-xs" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="space-y-1">
            <Label className="text-[10px]">Cor de preenchimento</Label>
            <Input type="text" placeholder="#fde68a" value={config.fillPoligono ?? ''} onChange={(e) => set({ fillPoligono: e.target.value || undefined })} className="h-7 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Hachura (preenchimento)</Label>
            <select className="h-7 w-full rounded border bg-background px-1 text-xs" value={config.hachura ?? 'nenhuma'} onChange={(e) => set({ hachura: e.target.value as PlantaConfig['hachura'] })}>
              <option value="nenhuma">Cor sólida (sem hachura)</option>
              <option value="diagonal">Diagonal</option>
              <option value="cruzada">Cruzada</option>
              <option value="pontos">Pontos</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Espessura divisas apoio</Label>
            <Input type="number" step="0.1" placeholder="3.2" value={config.larguraDivisasApoio ? String(config.larguraDivisasApoio) : ''} onChange={(e) => set({ larguraDivisasApoio: e.target.value ? Number(e.target.value) : undefined })} className="h-7 text-xs" />
          </div>
        </div>
        {multiplasGlebas && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="space-y-1">
              <Label className="text-[10px]">Cor outras glebas</Label>
              <Input type="text" placeholder="#c2410c" value={config.corOutrasGlebas ?? ''} onChange={(e) => set({ corOutrasGlebas: e.target.value || undefined })} className="h-7 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Espessura outras glebas</Label>
              <Input type="number" step="0.1" placeholder="1.2" value={config.larguraOutrasGlebas ? String(config.larguraOutrasGlebas) : ''} onChange={(e) => set({ larguraOutrasGlebas: e.target.value ? Number(e.target.value) : undefined })} className="h-7 text-xs" />
            </div>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <Label>Laudo técnico (carimbo)</Label>
        <textarea className="min-h-[84px] w-full rounded border border-input bg-background p-2 text-xs" placeholder="(texto padrão)"
          value={config.textoLaudo ?? ''} onChange={(e) => set({ textoLaudo: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>Declaração dos confrontantes (carimbo)</Label>
        <textarea className="min-h-[84px] w-full rounded border border-input bg-background p-2 text-xs" placeholder="(texto padrão)"
          value={config.textoConfrontantes ?? ''} onChange={(e) => set({ textoConfrontantes: e.target.value })} />
      </div>
      <Button size="sm" variant="secondary" className="w-full" onClick={onSalvarPadrao} title="Guarda estes ajustes como padrão para os próximos trabalhos"><Save /> Salvar ajustes como padrão</Button>
      <div className="space-y-1 rounded border bg-muted/40 p-2 text-[11px] text-muted-foreground">
        <div>{temLogo ? 'Logotipo carregado (aparece no carimbo).' : 'Sem logotipo — suba a imagem em Config para preencher o carimbo.'}</div>
        <div>{temSituacao ? 'Planta de situação pronta.' : 'Situação não gerada — use "Gerar situação" na visão da planta.'}</div>
      </div>
    </div>
  );
}

// ---------------- helpers ----------------

function contarVertices(p: Projeto): number {
  if (p.glebas?.length) return p.glebas.reduce((s, g) => s + g.vertices.length, 0);
  return p.vertices?.length ?? 0;
}

function distPontoSegmento(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx, cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
function dataPorExtenso(d = new Date()): string {
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}
