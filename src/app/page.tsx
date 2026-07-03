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
  Settings, LogOut, Table, FileWarning, Target, Search, Check, X, Ruler, ChevronRight, Move, Camera, PencilRuler, Percent, ImagePlus, Info, UserCheck, HelpCircle, Palette, BarChart3, FlaskConical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ModalSpreadsheet from '@/components/ModalSpreadsheet';
import ModalImport from '@/components/ModalImport';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Planta from '@/components/Planta';
import RequerimentoModal from '@/components/RequerimentoModal';
import TrtModal from '@/components/TrtModal';
import ErrataModal from '@/components/ErrataModal';
import ConsultarModal from '@/components/ConsultarModal';
import ConfiguracoesModal from '@/components/ConfiguracoesModal';
import GestaoProjetoModal from '@/components/GestaoProjetoModal';
import TutorialModal from '@/components/TutorialModal';
import ImportPreviewModal, { type SelecaoImport as ImportSelecao } from '@/components/ImportPreviewModal';
import CalculadoraModal from '@/components/CalculadoraModal';
import ConfrontanteEditModal from '@/components/ConfrontanteEditModal';
import DxfEditorModal from '@/components/DxfEditorModal';
import PorcentagemModal from '@/components/PorcentagemModal';
import EstudioModal from '@/components/EstudioModal';
import ProjetoInfoModal, { infoJaVista } from '@/components/ProjetoInfoModal';
import PontosBancoModal from '@/components/PontosBancoModal';
import type { ModoEdicao } from '@/components/MapEditor';
import type { Vertex, ImovelData, Confrontante, TecnicoData, EscritorioData, Projeto, ProprietarioCad, ConfrontanteCad, ImovelCad, CartorioCad, Gleba, PessoaQualificada, ObjetoDesenho, PontoLL, PlantaConfig, Contadores } from '@/lib/topo/types';
import { novaPolilinha, novoTexto, novaCota } from '@/lib/topo/objetos';
import type { RotuloMapa } from '@/components/MapEditor';
import { parseTxt, pontosDePerimetro } from '@/lib/topo/parseTxt';
import { montarVertices, reordenar, definirInicio, novoVertice, reprojetar, iniciarDoNorteHorario, recodificar } from '@/lib/topo/vertices';
import { montarConfrontantes } from '@/lib/topo/confrontantes';
import { novaGlebaVazia, glebaDe, migrarProjeto, dividirGleba, unirGlebas, dividirPorAreaAlvo } from '@/lib/topo/glebas';
import { calcular } from '@/lib/topo/calcular';
import { detectarZona, escolherZonaPorAncora, geoParaUtm, utmParaGeo } from '@/lib/topo/coords';
import { exportarDxf as gerarDxf, importarDxf, anelDeDxf } from '@/lib/io/dxf';
import { gerarShapefileZip } from '@/lib/io/shapefile';
import { gerarSituacao } from '@/lib/io/situacao';
import { importarGeoJsonAneis } from '@/lib/io/geojson';
import { parseParcelasSigef, parcelasParaReferencias, parcelasVizinhas, confrontantesDeVizinhas } from '@/lib/io/sigefVizinhos';
import { parseVerticesVizinho } from '@/lib/io/verticesVizinho';
import { ufsNoBbox, temaIncra, TEMAS_CONFRONTANTE, INCRA_UFS } from '@/lib/io/incraTemas';
import { linhasRotuloConfrontante } from '@/lib/topo/rotuloConfrontante';
import { ancoraMunicipio, MUNICIPIOS, detectarFusoPorRegiao } from '@/lib/topo/municipios';
import { atribuirProvisorio, semente } from '@/lib/topo/registroCore';
import { snapUtm } from '@/lib/topo/snap';
import { conferir, valoresEfetivos, type Problema, detectarConflitosDivisas, type ConflitoDivisa } from '@/lib/topo/conferencia';
import { corPorConfrontante } from '@/lib/topo/coresConfrontante';
import { conferirProntoParaExportar } from '@/lib/topo/conferenciaExportacao';
import { TIPOS_VERTICE, TIPOS_LIMITE, METODOS_POSICIONAMENTO, REPRESENTACOES, REPRES_LABEL, corDivisa } from '@/lib/topo/sigefVocab';
import { numBR, azimuteDMS, azimute } from '@/lib/topo/geometry';
import { carregarTecnico, carregarEscritorio, carregarPlantaPadrao, salvarPlantaPadrao, salvarTemaUsuario, carregarTemaUsuario, carregarImportTxt, carregarModeloSigef, carregarImportVerticesVizinho, tutorialJaVisto, marcarTutorialVisto } from '@/lib/store/settings';
import { useAuth, sair } from '@/lib/firebase/auth';
import { salvarProjeto, listarProjetos, carregarProjeto, excluirProjeto, novoId, NuvemSemPermissao, sincronizarProjetosLocalParaNuvem } from '@/lib/store/projects';
import { lerContadores, registrarPontos, totalPontosRegistrados } from '@/lib/store/registro';
import { carregarTitulos, adicionarTitulo } from '@/lib/store/titulos';
import { gerarProjetoFicticio } from '@/lib/demo/projetoFicticio';
import { iniciarCoresDivisa, salvarCorDivisa, coresEfetivas } from '@/lib/store/coresDivisa';
import { termosAceitosLocal, termosAceitosNuvem, sincronizarPerfil, registrarProjetoSalvo } from '@/lib/store/perfilUso';
import { carregarPreferencias, salvarPreferencias, PREFERENCIAS_PADRAO, type PreferenciasApp } from '@/lib/store/preferencias';
import { souMaster } from '@/lib/store/suporte';
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

const COR_IMPORT = 'bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 border-sky-500/30';
const COR_PECA = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 border-emerald-500/30';

type EtapaEstado = 'feito' | 'andamento' | 'pendente';
// Acende o ÍCONE do botão do fluxo: verde = etapa feita, azul = em andamento, neutro = pendente.
// (Sem mais barrinha embaixo; o próprio ícone sinaliza o progresso.)
function Etapa({ st, children }: { st: EtapaEstado; children: ReactNode }) {
  const cls = st === 'feito'
    ? '[&_svg]:text-green-600 [&_svg]:dark:text-green-400'
    : st === 'andamento'
    ? '[&_svg]:text-blue-600 [&_svg]:dark:text-blue-400'
    : '';
  return <div className={`flex shrink-0 ${cls}`}>{children}</div>;
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
    tipo: 'texto' | 'vertice' | 'divisa' | 'mapa';
    x: number;
    y: number;
    id?: string;
    atual?: string;
    vertice?: Vertex;
    verticeIdx?: number;
    lat?: number;
    lon?: number;
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
  const [selMulti, setSelMulti] = useState<Set<string>>(new Set()); // vértices marcados no modo "triângulo"
  const [mostrarRotulos, setMostrarRotulos] = useState(true);
  const [tamNomes, setTamNomes] = useState(11); // tamanho da fonte dos nomes dos vértices no mapa
  const [snapAtivo, setSnapAtivo] = useState(false);
  const [bloqueado, setBloqueado] = useState(true); // vértices travados por padrão (protege o georref)
  const [tipoDivisaPincel, setTipoDivisaPincel] = useState<string>('estrada'); // pincel do modo "pintar divisa"
  const [corPickerAberto, setCorPickerAberto] = useState(false); // painel de ajuste rápido das cores de divisa
  const [corBump, setCorBump] = useState(0); // força re-render após trocar uma cor (cores vivem em módulo)
  const [prefs, setPrefs] = useState<PreferenciasApp>(PREFERENCIAS_PADRAO); // preferências de interface
  const iconeCab = (chave: string, icone: React.ReactNode) => (prefs.iconesCabecalhoOcultos.includes(chave) ? null : icone);
  const [termosOk, setTermosOk] = useState(true); // aceite dos termos de uso (bloqueia até aceitar)
  const [setupOk, setSetupOk] = useState(true); // primeiro acesso: cadastro de empresa/autônomo
  const [planilhaConfAberta, setPlanilhaConfAberta] = useState(false); // conferência da planilha SIGEF
  const [masterAberto, setMasterAberto] = useState(false); // painel do titular (só master)
  const [confrontantePincelId, setConfrontantePincelId] = useState<string>(''); // pincel do modo "pintar confrontantes"
  const [pincelInicioId, setPincelInicioId] = useState<string | null>(null); // início do trecho selecionado para pintura de divisa/confrontante
  // barra de ferramentas (esquerda, fixa, largura redimensionável e salva por usuário)
  const [toolW, setToolW] = useState(200); // largura confortável pra não espremer os rótulos dos botões
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
  const [dxfEditorAberto, setDxfEditorAberto] = useState(false);
  const [porcentagemAberta, setPorcentagemAberta] = useState(false);
  const [estudioAberto, setEstudioAberto] = useState(false);
  const [confEditId, setConfEditId] = useState<string | null>(null);
  const [dadosPos, setDadosPos] = useState<{ x: number; y: number } | null>(null); // barra flutuante (null = canto inf. esq.)
  const dadosDrag = useRef<{ ox: number; oy: number } | null>(null);
  const [plantaDark, setPlantaDark] = useState(false); // modo escuro só da folha A3 (conforto noturno)
  // progresso por etapa (ações do usuário que não se completam sozinhas)
  const [sigefStatus, setSigefStatus] = useState<'idle' | 'clicado' | 'enviado'>('idle');
  const [baixou, setBaixou] = useState<{ memorial?: boolean; ods?: boolean; planta?: boolean; req?: boolean }>({});
  const [salvoOk, setSalvoOk] = useState(false);
  const [salvarLaranja, setSalvarLaranja] = useState(false); // disquete laranja: há mudança não salva há >1s
  const ultimoSalvoSig = useRef<string>('');
  const acabouDeSalvar = useRef(false);
  const [errataAberto, setErrataAberto] = useState(false);
  const [consultarAberto, setConsultarAberto] = useState(false);
  const [configAberta, setConfigAberta] = useState(false);
  const [configAba, setConfigAba] = useState<'pessoal' | 'escritorio' | 'numeracao' | 'modelos' | undefined>(undefined);
  const [gestaoAberta, setGestaoAberta] = useState(false);
  const [tutorialAberto, setTutorialAberto] = useState(false);
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
  const [plantaConfig, setPlantaConfig] = useState<PlantaConfig>({});
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [sugProp, setSugProp] = useState<ProprietarioCad[]>([]);
  const [sugConf, setSugConf] = useState<ConfrontanteCad[]>([]);
  const [sugCns, setSugCns] = useState<string[]>([]);
  const [sugCartorios, setSugCartorios] = useState<CartorioCad[]>([]);
  const [totalPontos, setTotalPontos] = useState(0);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const dxfRef = useRef<HTMLInputElement>(null);
  const geojsonRef = useRef<HTMLInputElement>(null);
  const vizinhosRef = useRef<HTMLInputElement>(null);
  const verticesVizinhoRef = useRef<HTMLInputElement>(null);

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
    try { const w = Number(localStorage.getItem('metrica.toolW')); if (w >= 52 && w <= 320) setToolW(w); } catch { /* ignore */ }
    try { const n = Number(localStorage.getItem('metrica.tamNomes')); if (n >= 7 && n <= 22) setTamNomes(n); } catch { /* ignore */ }
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
  useEffect(() => { try { localStorage.setItem('metrica.asideW', String(asideW)); } catch { /* ignore */ } }, [asideW]);

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
      if (k === 'F1') { e.preventDefault(); setVista((v) => (v === 'mapa' ? 'planta' : 'mapa')); }
      else if (k === 'F2') { e.preventDefault(); setModo('navegar'); }
      else if (k === 'F3') { e.preventDefault(); setSnapAtivo((s) => !s); }
      else if (k === 'F4') { e.preventDefault(); setMostrarRotulos((m) => !m); }
      else if (k === 'F5') { e.preventDefault(); setBloqueado((b) => !b); }
      else if (k === 'F6') { e.preventDefault(); setModo('linha'); setDesenhoBuffer([]); }
      else if (k === 'F7') { e.preventDefault(); setModo('polilinha'); setDesenhoBuffer([]); }
      else if (k === 'F8') { e.preventDefault(); setModo('texto'); }
      else if (k === 'F9') { e.preventDefault(); setModo('cota'); setDesenhoBuffer([]); }
      else if (k === 'F10') { e.preventDefault(); setModo((m) => (m === 'ignorar' ? 'navegar' : 'ignorar')); }
      else if (k === 'F11') { e.preventDefault(); setModo((m) => (m === 'considerar' ? 'navegar' : 'considerar')); }
      else if (k === 'F12') { e.preventDefault(); setModo('inserir'); }
      else if ((k === 'Delete' || k === 'Backspace') && modo === 'multi') {
        e.preventDefault();
        apagarMultiSelecionados();
      }
      else if (k === 'Escape') {
        if (modo === 'multi' && selMulti.size > 0) { e.preventDefault(); setSelMulti(new Set()); }
        else if (modo === 'linha' || modo === 'polilinha' || modo === 'tracejado' || modo === 'cota' || modo === 'texto') {
          e.preventDefault();
          cancelarDesenho();
          setModo('navegar');
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, desenhoBuffer, selMulti, vertices, confrontantePorLado]);

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
    () => JSON.stringify({ v: vertices, i: imovel, c: confrontantes, cpl: confrontantePorLado, o: objetos, pc: plantaConfig, g: glebas.map((g) => g.id) }),
    [vertices, imovel, confrontantes, confrontantePorLado, objetos, plantaConfig, glebas],
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
  function toolMove(e: ReactPointerEvent) { if (toolDrag.current) setToolW(Math.min(320, Math.max(52, e.clientX))); }
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
  function removerGleba(id: string) {
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
    const vs = recodificar(anel, prefixo || 'COIN', contM, contP);

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
  }

  function trocarHemisferio(h: 'N' | 'S') {
    setHemisferio(h);
    setVertices((vs) => reprojetar(vs, zona, h));
    setGlebas((prev) => prev.map((g) => ({
      ...g,
      vertices: reprojetar(g.vertices, zona, h)
    })));
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
  function alvosSnap(excluirId?: string) {
    const a = vertices.filter((v) => v.id !== excluirId).map((v) => ({ leste: v.leste, norte: v.norte }));
    for (const g of glebas) if (g.id !== glebaAtivaId) for (const v of g.vertices) a.push({ leste: v.leste, norte: v.norte });
    for (const anel of referencias) for (const p of anel) a.push({ leste: p.leste, norte: p.norte });
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
  function apagarMultiSelecionados() {
    if (selMulti.size === 0) return;
    if (!window.confirm(`Apagar ${selMulti.size} vértice(s) selecionado(s)?`)) return;
    snap();
    setVertices((vs) => reordenar(vs.filter((v) => !selMulti.has(v.id))));
    setSelMulti(new Set());
  }

  // Apaga TODO o polígono (vértices + ignorados + trechos), para redesenhar à mão depois.
  function limparPoligono() {
    if (vertices.length === 0 && verticesIgnorados.length === 0) return;
    if (!window.confirm(`Apagar todo o polígono (${vertices.length} vértices)? Você poderá desenhar de novo com a ferramenta "Inserir vértice".`)) return;
    snap();
    setVertices([]);
    setVerticesIgnorados([]);
    setConfrontantePorLado({});
    setSelecionadoId(null);
    setModo('inserir');
    aviso('Polígono apagado. Clique no mapa com "Inserir vértice" para desenhar o novo.');
  }

  // Ignorar vértice: tira-o do desenho do polígono (vai para a lista de ignorados, pode voltar).
  function ignorarVertice(id: string) {
    const v = vertices.find((x) => x.id === id);
    if (!v) return;
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

  function executarDivisaoGleba() {
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

      const nomeA = window.prompt("Nome da Parcela A:", `${gAtiva.denominacao} - Parte A`) || `${gAtiva.denominacao} - Parte A`;
      const nomeB = window.prompt("Nome da Parcela B:", `${gAtiva.denominacao} - Parte B`) || `${gAtiva.denominacao} - Parte B`;

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

      alert("Gleba desmembrada com sucesso!");
    } catch (e) {
      alert((e as Error).message);
    }
  }

  // Divide a gleba ativa por ÁREA ALVO: a linha de corte fica paralela à reta De→Até.
  function executarDivisaoPorArea() {
    const alvoHa = Number(String(areaAlvoHa).replace(',', '.'));
    if (!(alvoHa > 0)) { alert('Informe a área alvo em hectares (ex.: 0,4).'); return; }
    if (!vSplitInicioId || !vSplitFimId) { alert('Selecione dois vértices (De e Até): a linha de divisão sai paralela a eles.'); return; }
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
    } catch (e) { alert((e as Error).message); }
  }

  function executarFusaoGlebas(gAlvoId: string) {
    const gAtiva = glebas.find(g => g.id === glebaAtivaId);
    const gAlvo = glebas.find(g => g.id === gAlvoId);
    if (!gAtiva || !gAlvo) return;

    if (confirm(`Deseja unir a gleba ativa "${gAtiva.denominacao}" com a gleba "${gAlvo.denominacao}"?`)) {
      try {
        const { vertices: vFuso, confrontantePorLado: cFuso } = unirGlebas(
          vertices,
          gAlvo.vertices,
          confrontantePorLado,
          gAlvo.confrontantePorLado
        );

        const novoNome = window.prompt("Nome da Gleba Unificada:", `${gAtiva.denominacao} + ${gAlvo.denominacao}`) || `${gAtiva.denominacao} + ${gAlvo.denominacao}`;

        const gUnida = glebaDe(glebas.length + 1, vFuso, confrontantes, cFuso, novoNome);
        const novasGlebas = glebas.filter(g => g.id !== glebaAtivaId && g.id !== gAlvoId).concat(gUnida);
        
        setGlebas(novasGlebas);
        setGlebaAtivaId(gUnida.id);

        setVertices(vFuso);
        setConfrontantePorLado(cFuso);
        setSelecionadoId(null);

        alert("Glebas unificadas com sucesso!");
      } catch (e) {
        alert((e as Error).message);
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
  function inserirVertice(lat: number, lon: number, codigoOficial?: string) {
    snap();
    let { leste, norte } = geoParaUtm(lat, lon, zona, hemisferio);
    if (snapAtivo) {
      const s = snapUtm(leste, norte, alvosSnap(), { tolVerticeM: 2 });
      if (s.tipo) { leste = s.leste; norte = s.norte; const g = utmParaGeo(leste, norte, zona, hemisferio); lat = g.lat; lon = g.lon; }
    }
    const base = novoVertice({ lat, lon, leste, norte, elevacao: 0 });
    const novo = codigoOficial
      ? { ...base, codigoSigef: codigoOficial, nome: codigoOficial, codigoCampo: codigoOficial, registrado: true }
      : base;
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
  function adotarVerticeVizinho(lat: number, lon: number) {
    const digitado = window.prompt(
      'Se você já sabe o código oficial que o agrimensor vizinho usou para este vértice (ex.: CODI-P-0007), digite aqui — ele será reaproveitado em vez de gerar um novo.\n\nDeixe em branco se não souber (o sistema gera um código provisório seu).'
    );
    const codigo = digitado?.trim();
    inserirVertice(lat, lon, codigo ? codigo.toUpperCase() : undefined);
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
  function onCliqueDesenho(lat: number, lon: number) {
    const p = pontoDesenho(lat, lon);
    if (modo === 'texto') {
      const t = window.prompt('Texto a inserir:'); if (!t) return;
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
          setObjetos((os) => [...os, novaPolilinha(desenhoBuffer, { preenchido: true })]);
          setDesenhoBuffer([]);
          aviso('Polilinha fechada — virou polígono.');
          return;
        }
      }
      setDesenhoBuffer((buf) => [...buf, p]);
    } else if (modo === 'tracejado') {
      // tracejado = polilinha tracejada aberta (ex.: estrada); finaliza no botão
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
  // arrasto da barra flutuante de dados (default no canto inf. esquerdo; vira top/left ao arrastar)
  function dadosDown(e: ReactPointerEvent) {
    const card = (e.currentTarget as HTMLElement).parentElement;
    const main = card?.offsetParent as HTMLElement | null;
    if (card && main) {
      const r = card.getBoundingClientRect(), mr = main.getBoundingClientRect();
      const x = r.left - mr.left, y = r.top - mr.top;
      dadosDrag.current = { ox: e.clientX - x, oy: e.clientY - y };
      setDadosPos({ x, y });
    }
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
  }
  function dadosMove(e: ReactPointerEvent) {
    if (!dadosDrag.current) return;
    setDadosPos({ x: Math.max(0, e.clientX - dadosDrag.current.ox), y: Math.max(0, e.clientY - dadosDrag.current.oy) });
  }
  function dadosUp() { dadosDrag.current = null; }
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
  function novoConfrontantePincel() {
    const nome = window.prompt('Nome do confrontante (pode completar depois):') ?? '';
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

  function verificarConciliacaoSigef(): boolean {
    if (!imovel.areaSigefHa || !imovel.perimetroSigef) {
      return window.confirm(
        "Atenção: A área oficial (SGL) ou o perímetro oficial do SIGEF não foram preenchidos na aba 'Imóvel' (Reconciliação com o SIGEF).\n\nRecomenda-se realizar a reconciliação antes de exportar as peças oficiais.\n\nDeseja exportar mesmo assim utilizando os valores calculados?"
      );
    }
    return true;
  }

  /**
   * Verifica se o projeto está pronto para gerar uma peça oficial. Problema GRAVE (geometria
   * incompleta ou código de vértice repetido) TRAVA de verdade, sem opção de ignorar — o SIGEF
   * rejeitaria mesmo. Problema leve (campo de cadastro faltando, CPF com cara de inválido) só
   * avisa, com opção de prosseguir.
   */
  function verificarProntoParaExportar(): boolean {
    const { ok, problemas, graves } = conferirProntoParaExportar(imovel, vertices, confrontantes, tecnico, confrontantePorLado);
    if (ok) return true;
    if (graves.length > 0) {
      window.alert(`Não é possível exportar — há um problema grave que o SIGEF rejeitaria:\n\n- ${graves.join('\n- ')}\n\nCorrija antes de tentar de novo.`);
      return false;
    }
    return window.confirm(`Atenção, faltam dados antes de exportar:\n\n- ${problemas.join('\n- ')}\n\nDeseja exportar mesmo assim?`);
  }

  async function exportarMemorial() {
    if (!tecnico || vertices.length < 3) { aviso('Importe pontos primeiro.'); return; }
    if (!verificarConciliacaoSigef()) return;
    if (!verificarProntoParaExportar()) return;
    try {
      const vs = await comCodigos();
      const r = calcular(vs, confrontantePorLado);
      const blob = await gerarMemorialDocx({ res: r, imovel, tecnico, confrontantes, confrontantePorLado, dataExtenso: dataPorExtenso(), requerente, transmitente });
      const sufixo = glebas.length > 1 ? ` - ${glebaAtivaNome}` : '';
      saveAs(blob, `Memorial - ${imovel.denominacao || nomeProjeto || 'imovel'}${sufixo}.docx`);
      setBaixou((b) => ({ ...b, memorial: true }));
    } catch (e) { aviso((e as Error).message || 'Erro ao gerar o memorial.'); }
  }

  async function exportarOds() {
    if (!tecnico || vertices.length < 3) { aviso('Importe pontos primeiro.'); return; }
    if (!verificarProntoParaExportar()) return;
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
        const unica = window.confirm(
          `Planilha SIGEF com ${glebasSigef.length} glebas:\n\nOK = uma planilha única (uma aba por gleba).\nCancelar = planilhas separadas (uma por gleba), num arquivo .zip.`
        );
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
        const blob = await gerarSigefOds({ templateBytes: tpl, res: r, imovel, tecnico: tec, confrontantes, confrontantePorLado });
        saveAs(blob, `SIGEF - ${imovel.denominacao || nomeProjeto || 'imovel'}.ods`);
      }
      setBaixou((b) => ({ ...b, ods: true }));
    } catch (e) { aviso((e as Error).message || 'Erro ao gerar a planilha.'); }
    finally { setProcessando(false); }
  }

  async function exportarPlanta() {
    if (vertices.length < 3) { aviso('Importe pontos primeiro.'); return; }
    if (!verificarConciliacaoSigef()) return;
    if (!verificarProntoParaExportar()) return;
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
      const lidos = parseVerticesVizinho(texto, cfg, zona, hemisferio)
        .filter((l) => l.nome)
        .map((l) => ({ ...l, ...geoParaUtm(l.lat, l.lon, zona, hemisferio) }));
      if (!lidos.length) { aviso('Nenhum vértice com nome/código reconhecido neste arquivo. Confira o mapeamento de colunas em Configurações → Importação e Modelos.'); return; }
      let adotados = 0;
      const novos = vertices.map((v) => {
        let melhor: (typeof lidos)[number] | null = null, melhorD = TOL_M;
        for (const l of lidos) {
          const d = Math.hypot(l.leste - v.leste, l.norte - v.norte);
          if (d < melhorD) { melhorD = d; melhor = l; }
        }
        if (!melhor) return v;
        adotados++;
        return { ...v, codigoSigef: melhor.nome, nome: melhor.nome, codigoCampo: melhor.nome, registrado: true };
      });
      if (!adotados) { aviso(`Nenhum vértice do seu perímetro bateu (dentro de ${TOL_M} m) com o arquivo do vizinho.`); return; }
      snap();
      setVertices(novos);
      aviso(`${adotados} vértice(s) do seu perímetro bateram com o arquivo do vizinho e adotaram o código oficial dele.`);
    } catch { aviso('Não consegui ler o arquivo de vértices do vizinho.'); }
  }

  async function importarVizinhosCertificados(file: File) {
    try {
      const texto = await file.text();
      const parcelas = parseParcelasSigef(texto);
      if (!parcelas.length) { aviso('Nenhuma parcela certificada encontrada no arquivo.'); return; }
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

  async function gerarSituacaoPlanta() {
    if (vertices.length < 3) { aviso('Importe pontos primeiro.'); return; }
    aviso('Buscando satélite da situação…');
    // todas as glebas (a ativa primeiro), para a situação mostrar mais de um polígono
    const aneis = [
      vertices.map((v) => ({ lat: v.lat, lon: v.lon })),
      ...glebas.filter((g) => g.id !== glebaAtivaId).map((g) => g.vertices.map((v) => ({ lat: v.lat, lon: v.lon }))),
    ];
    const url = await gerarSituacao(aneis);
    setSituacaoUrl(url ?? undefined);
    if (url) {
      setSituacaoVersSnapshot(JSON.stringify(vertices));
      // guarda no projeto pra não precisar recapturar ao reabrir (limite: cabe no doc da nuvem)
      setPlantaConfig((c) => ({ ...c, situacaoDataUrl: url.length < 700_000 ? url : undefined }));
      aviso('Planta de situação gerada.');
    } else {
      aviso('Não consegui carregar o satélite (rede/CORS).');
    }
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
        imovel, glebas: gs, zonaUtm: zona, hemisferio, requerente, transmitente, plantaConfig, parcelasCert,
      };
      try {
        await salvarProjeto(p);
        setProjetoId(id);
        setSalvoOk(true);
        ultimoSalvoSig.current = projSig; acabouDeSalvar.current = true; setSalvarLaranja(false);
        aviso(registrou ? 'Projeto salvo e pontos registrados.' : 'Projeto salvo, mas falhou registrar os pontos — tente salvar de novo.');
        registrarProjetoSalvo(p.nome).catch(() => {}); // atualiza o perfil de uso (painel do titular)
      } catch (e) {
        setProjetoId(id);
        if (e instanceof NuvemSemPermissao) {
          // o projeto FOI salvo localmente (só a nuvem negou) — então o trabalho está seguro e o
          // botão deve ficar verde igual a um salvamento normal, senão parece que não salvou nada
          setSalvoOk(true);
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
    return { v: 1, projetoId, nome: nomeProjeto, nomeProjetoManual, imovel, glebas: sincronizarGlebas(), zona, hemisferio, requerente, transmitente, plantaConfig, glebaAtivaId, parcelasCert };
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
    return true;
  }

  async function criarNovoProjeto() {
    if (temConteudoTrabalho()) {
      const ok = window.confirm('Deseja SALVAR o projeto atual antes de criar um novo?\n\n[OK] = Sim, salvar projeto e criar novo\n[Cancelar] = Não, descartar e criar novo');
      if (ok) {
        await salvar();
      } else {
        const confirmarDescarte = window.confirm('Atenção: Você escolheu não salvar. Deseja realmente DESCARTAR as alterações não salvas e iniciar um novo projeto?');
        if (!confirmarDescarte) return;
      }
    }
    // Limpa todos os estados para começar do zero
    setProjetoId(null);
    setNomeProjeto('');
    setNomeProjetoManual(false);
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
      naturezaServico: 'Georreferenciamento',
      situacao: 'Imóvel Registrado',
      naturezaArea: 'Particular',
    });
    setVertices([]);
    const novaGleba = novaGlebaVazia(1);
    setGlebas([novaGleba]);
    setGlebaAtivaId(novaGleba.id); // usa o ID real gerado, não o hardcoded '1'
    setConfrontantes([]);
    setConfrontantePorLado({});
    setReferencias([]);
    setParcelasCert([]);
    setSituacaoUrl(undefined);
    setObjetos([]);
    setPlantaConfig({});
    setObjetoSelId(null);
    setSigefStatus('idle'); setBaixou({}); setSalvoOk(false);
    localStorage.removeItem(rascunhoKey());
    aviso('Novo projeto iniciado. Importe pontos para começar.');
    setTimeout(() => {
      fileRef.current?.click();
    }, 150);
  }

  // Carrega um projeto completo FICTÍCIO (demonstração). As peças saem marcadas como dados fictícios.
  function carregarProjetoFicticio() {
    if (temConteudoTrabalho() && !window.confirm('Carregar o projeto fictício de demonstração? O trabalho atual não salvo será descartado.')) return;
    const f = gerarProjetoFicticio();
    const gleba: Gleba = { ...novaGlebaVazia(1), denominacao: f.imovel.denominacao, vertices: f.vertices, confrontantes: f.confrontantes, confrontantePorLado: f.confrontantePorLado };
    setProjetoId(null);
    setNomeProjeto(f.nome); setNomeProjetoManual(true);
    setImovel(f.imovel);
    setZona(f.zona); setHemisferio(f.hemisferio);
    setRequerente(undefined); setTransmitente(undefined);
    setParcelasCert([]); setReferencias([]); setSituacaoUrl(undefined);
    setPlantaConfig({});
    setSigefStatus('idle'); setBaixou({}); setSalvoOk(false);
    setGlebas([gleba]);
    carregarGleba(gleba);
    aviso('Projeto fictício carregado. Use para demonstração — todas as peças saem marcadas como DADOS FICTÍCIOS.');
  }

  function converterPolilinhaEmPerimetro() {
    if (!objetoSelId) return;
    const o = objetos.find((x) => x.id === objetoSelId);
    if (!o || o.tipo !== 'polilinha' || o.pontos.length < 3) {
      alert('Selecione uma polilinha com pelo menos 3 pontos para converter em perímetro.');
      return;
    }
    if (window.confirm('Deseja substituir o perímetro atual do imóvel por esta polilinha?')) {
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
    if (temConteudoTrabalho()) {
      const ok = window.confirm('Há um trabalho em andamento. Deseja SALVÁ-LO como projeto antes de importar um novo arquivo?\n\nOK = salvar e importar  ·  Cancelar = importar sem salvar');
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
    setPlantaConfig(p.plantaConfig ?? {});
    setGlebas(p.glebas);
    carregarGleba(p.glebas[0]);
    // restaura a planta de situação salva (não precisa recapturar o satélite)
    setSituacaoUrl(p.plantaConfig?.situacaoDataUrl);
    if (p.plantaConfig?.situacaoDataUrl) setSituacaoVersSnapshot(JSON.stringify(p.glebas[0].vertices));
    const pc = p.parcelasCert ?? [];
    setParcelasCert(pc);
    setReferencias(referenciasDeParcelasCert(pc, p.zonaUtm, p.hemisferio));
    acabouDeSalvar.current = true; setSalvarLaranja(false); setSalvoOk(true); // recém-carregado = "salvo"
    aviso(`Projeto carregado (${p.glebas.length} gleba(s)).`);
  }
  async function remover(id: string) { await excluirProjeto(id); atualizarLista(); }
  async function renomear(p: Projeto) {
    const novo = window.prompt('Novo nome do projeto:', p.nome);
    if (!novo || novo === p.nome) return;
    await salvarProjeto({ ...p, nome: novo });
    if (p.id === projetoId) setNomeProjeto(novo);
    atualizarLista();
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
    <div className="flex h-screen flex-col">
      {/* Topo */}
      {/* Cabeçalho = FLUXO DO TRABALHO (esquerda → direita) + conta fixa à direita */}
      <header className="no-print flex items-stretch border-b">
       <div className="flex flex-1 items-start gap-1.5 overflow-x-auto px-3 py-2">
        <input ref={fileRef} type="file" accept=".txt,.csv" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importarArquivo(f); e.currentTarget.value = ''; }} />
        <input ref={dxfRef} type="file" accept=".dxf" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importarDxfArquivo(f); e.currentTarget.value = ''; }} />
        <input ref={geojsonRef} type="file" accept=".geojson,.json" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importarReferenciaGeoJson(f); e.currentTarget.value = ''; }} />
        <input ref={vizinhosRef} type="file" accept=".geojson,.json" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importarVizinhosCertificados(f); e.currentTarget.value = ''; }} />
        <input ref={verticesVizinhoRef} type="file" accept=".txt,.csv,text/plain" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importarVerticesVizinho(f); e.currentTarget.value = ''; }} />

        {/* 1) Importar e checar vizinhos */}
        <Etapa st={etapas.txt}><Button size="sm" variant="outline" className={`shrink-0 ${COR_IMPORT}`} disabled={processando} title="Importar pontos de um arquivo TXT (oferece salvar o anterior)" onClick={iniciarImportTxt}><Upload /> TXT</Button></Etapa>
        <Etapa st={etapas.sigef}>{parcelasCert.length > 0 ? (
          <Button size="sm" variant="outline" className="shrink-0" title="Vizinhos certificados já baixados — ver relatório de sobreposição SIGEF" onClick={() => setModalSobreposicaoAberto(true)}>{iconeCab('analise', <ShieldCheck className="size-4 text-indigo-400" />)} ANÁLISE</Button>
        ) : (
          <Button size="sm" variant="outline" className={`shrink-0 ${COR_IMPORT}`} disabled={processando} title="Vizinhos certificados: busca automática no INCRA (por região) os imóveis que encostam no seu e cria os confrontantes" onClick={importarVizinhosAuto}><Search /> SIGEF</Button>
        )}</Etapa>
        {parcelasCert.length > 0 && (
          <Button size="sm" variant="outline" className="shrink-0 gap-1 px-2 text-cyan-600 border-cyan-500/40 hover:bg-cyan-600 hover:text-white" disabled={vertices.length < 3} title="Casar automaticamente seus vértices com os certificados do INCRA: nos pontos de divisa comum (até 0,5 m), adota a coordenada oficial exata" onClick={casarVerticesCertificados}><Magnet className="size-4" /> CASAR</Button>
        )}
        <Button size="sm" variant="outline" className="shrink-0 px-2" disabled={vertices.length < 3} title="Adotar códigos de vértice de um imóvel vizinho já certificado (arquivo baixado do Distribuidor de Coordenadas do Acervo Fundiário — mapeamento de colunas em Configurações)" onClick={() => verticesVizinhoRef.current?.click()}><UserCheck className="size-4" /></Button>
        <ChevronRight className="-mx-1.5 mt-1.5 size-3.5 shrink-0 self-start text-amber-500/60" aria-hidden />

        {/* 2) Dados do projeto atual */}
        <Etapa st={etapas.dados}><Link className="shrink-0" href={projetoId ? `/cadastros?projetoId=${projetoId}` : '/cadastros'}><Button size="sm" variant="outline" title="Cadastrar/gerenciar dados: proprietário, confrontantes, imóvel, cartório">{iconeCab('dados', <BookUser />)} DADOS</Button></Link></Etapa>
        <Button size="sm" variant="outline" className="shrink-0 px-2" title="Consultar cadastros antigos e inserir no projeto atual" onClick={() => setConsultarAberto(true)}><Search /></Button>
        <ChevronRight className="-mx-1.5 mt-1.5 size-3.5 shrink-0 self-start text-amber-500/60" aria-hidden />

        {/* 3) Pintar confrontantes e divisas (ativa o modo no mapa) */}
        <Etapa st={etapas.confro}><Button size="sm" variant={modo === 'confrontante' ? 'default' : 'outline'} className="shrink-0" title="Pintar confrontante: clique os vértices do trecho" onClick={() => { setVista('mapa'); setModo(modo === 'confrontante' ? 'navegar' : 'confrontante'); }}><Users /> CONFRO</Button></Etapa>
        <Etapa st={etapas.divisas}><Button size="sm" variant={modo === 'divisa' ? 'default' : 'outline'} className="shrink-0" title="Pintar divisa: escolha o tipo e clique os vértices" onClick={() => { setVista('mapa'); setModo(modo === 'divisa' ? 'navegar' : 'divisa'); }}><Brush /> DIVISAS</Button></Etapa>
        <ChevronRight className="-mx-1.5 mt-1.5 size-3.5 shrink-0 self-start text-amber-500/60" aria-hidden />

        {/* 5) Peças */}
        <Etapa st={etapas.trt}><Button size="sm" variant="outline" className={`shrink-0 ${COR_PECA}`} title="Abrir os dados do TRT (cole o número emitido para concluir a etapa)" onClick={() => setTrtAberto(true)}>{iconeCab('trt', <FileText />)} TRT</Button></Etapa>
        <Etapa st={etapas.memorial}><Button size="sm" variant="outline" className={`shrink-0 ${COR_PECA}`} title="Baixar o memorial descritivo (.docx)" onClick={exportarMemorial}><Download /> MEM</Button></Etapa>
        <Etapa st={etapas.ods}><Button size="sm" variant="outline" className={`shrink-0 ${COR_PECA}`} title="Conferir e baixar a planilha SIGEF (.ods)" onClick={() => setPlanilhaConfAberta(true)}><Download /> ODS</Button></Etapa>
        <Etapa st={etapas.planta}><Button size="sm" variant="outline" className={`shrink-0 ${COR_PECA}`} title="Baixar a planta em PDF (A3)" onClick={exportarPlanta}><Download /> PLANTA</Button></Etapa>
        <Etapa st={etapas.req}><Button size="sm" variant="outline" className={`shrink-0 ${COR_PECA}`} title="Baixar o requerimento ao cartório (.docx)" onClick={() => setReqAberto(true)}><Download /> REQ</Button></Etapa>
        <a href="https://sso.acesso.gov.br/login?client_id=sigef.incra.gov.br&authorization_id=19f151443c3" target="_blank" rel="noopener noreferrer" className="shrink-0">
          <Button size="sm" variant="outline" className={`shrink-0 ${COR_PECA}`} title="Acessar o SIGEF para certificação eletrônica do imóvel"><CheckCircle2 /> CERT</Button>
        </a>
       </div>
       {/* Botão de Dados do Projeto que abre o dropdown superior */}
       <div className="no-print mr-2 flex items-center shrink-0">
         <Button
           variant={painelAberto ? 'default' : 'outline'}
           size="sm"
           className="flex items-center gap-1.5 font-bold shadow-sm transition-all"
           title="Dados do projeto (passe o mouse para abrir)"
           onMouseEnter={() => { painelMouseDentro.current = true; setPainelAberto(true); }}
           onMouseLeave={() => {
             painelMouseDentro.current = false;
             setTimeout(() => {
               if (!painelMouseDentro.current && !painelWrap.current?.contains(document.activeElement)) {
                 setPainelAberto(false);
               }
             }, 120); // 120ms grace period to transition to the dropdown body
           }}
         >
           <Settings className="size-4" />
           DADOS DO PROJETO
         </Button>
       </div>
      </header>

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
              <aside style={{ width: toolW }} className="no-print scroll-fino flex shrink-0 flex-col gap-1 overflow-y-auto border-r bg-background p-1.5">
                {/* SALVAR e NOVO foram para a barra flutuante inferior */}

                {/* SISTEMA (topo): ações úteis com nome + ícones de alternância */}
                {vista === 'mapa' && (
                  <>
                    <div className="flex flex-col gap-0.5 [&>button]:h-9 [&>button]:w-full [&>button]:justify-start [&>button]:gap-2">
                      <BotaoAcoes onUndo={desfazer} onRedo={refazer} />
                      <Button size="sm" variant="ghost" title="Abrir a prévia da planta (F1)" onClick={() => setVista('planta')}><Eye /> <span className="truncate text-xs font-semibold">PLANTA</span><span className="ml-auto text-[9px] font-bold text-amber-400">F1</span></Button>
                      <Button size="sm" variant={modo === 'navegar' ? 'default' : 'ghost'} title="Mover/navegar: arrastar elementos (F2)" onClick={() => setModo('navegar')}><MousePointer2 /> <span className="truncate text-xs font-semibold">MOVER</span><span className="ml-auto text-[9px] font-bold text-amber-400">F2</span></Button>
                    </div>
                    <div className="flex flex-wrap gap-1 [&_button]:h-9 [&_button]:justify-center [&_button]:gap-0.5 [&_button]:px-1.5">
                      <Button size="sm" variant={snapAtivo ? 'default' : 'ghost'} title="Imã: encaixar em vértices (F3)" onClick={() => setSnapAtivo((s) => !s)}><Magnet /><span className="text-[9px] font-bold text-amber-400">F3</span></Button>
                      <Button size="sm" variant="ghost" title={`${mostrarRotulos ? 'Esconder' : 'Mostrar'} nomes (F4)`} onClick={() => setMostrarRotulos((m) => !m)}>{mostrarRotulos ? <EyeOff /> : <Eye />}<span className="text-[9px] font-bold text-amber-400">F4</span></Button>
                      <Button size="sm" variant="ghost" className={bloqueado ? '' : 'bg-amber-500 text-white hover:bg-amber-600'} title={bloqueado ? 'Vértices travados — F5 (clique para liberar)' : 'ATENÇÃO: vértices liberados (podem mover) — F5 para travar'} onClick={() => setBloqueado((b) => !b)}>{bloqueado ? <Lock /> : <LockOpen />}<span className={`text-[9px] font-bold ${bloqueado ? 'text-amber-400' : 'text-white'}`}>F5</span></Button>
                    </div>
                  </>
                )}

                {/* CONTROLES DA PLANTA (na visão da planta) — deixa a folha limpa */}
                {vista === 'planta' && (
                  <div className="flex flex-col gap-1 [&>button]:h-9 [&>button]:w-full [&>button]:justify-start [&>button]:gap-2">
                    <Button size="sm" variant="ghost" title="Voltar ao mapa (F1)" onClick={() => setVista('mapa')}><MapIcon /> <span className="truncate text-xs font-semibold">VER MAPA</span><span className="ml-auto text-[9px] font-bold text-amber-400">F1</span></Button>
                    <Button size="sm" variant={modo === 'navegar' ? 'default' : 'outline'} className="h-9 w-full justify-start gap-2" title="Mover: arrastar textos, rótulos e a folha. Duplo clique num confrontante edita o nome; botão direito ajusta o tamanho." onClick={() => setModo('navegar')}><MousePointer2 /> <span className="truncate text-xs font-semibold">MOVER / EDITAR</span></Button>
                    <BotaoAcoes onUndo={desfazer} onRedo={refazer} />
                  </div>
                )}

                {/* FERRAMENTAS DE EDIÇÃO (mapa, ou planta no modo Editar) */}
                {(vista === 'mapa' || editarPlanta) && (
                  <>
                    <div className="my-0.5 h-px w-full bg-border" />
                    <div className="flex flex-col gap-0.5 [&>button]:h-9 [&>button]:w-full [&>button]:justify-start [&>button]:gap-2">
                      <Button size="sm" variant={modo === 'linha' ? 'default' : 'ghost'} onClick={() => { setModo('linha'); setDesenhoBuffer([]); }} title="Linha reta: clique 2 pontos (F6)"><PenTool /> {L('Linha')}<span className="ml-auto text-[9px] font-bold text-amber-400">F6</span></Button>
                      <Button size="sm" variant={modo === 'polilinha' ? 'default' : 'ghost'} onClick={() => { setModo('polilinha'); setDesenhoBuffer([]); }} title="Polilinha: clique vários pontos; ao fechar (clicar no 1º ponto) vira polígono (F7; botão direito cancela)"><PenTool /> {L('Polilinha')}<span className="ml-auto text-[9px] font-bold text-amber-400">F7</span></Button>
                      <Button size="sm" variant={modo === 'tracejado' ? 'default' : 'ghost'} onClick={() => { setModo('tracejado'); setDesenhoBuffer([]); }} title="Tracejado: linha tracejada aberta (ex.: estrada); clique vários pontos e depois Finalizar"><PenTool className="opacity-70" /> {L('Tracejado')}</Button>
                      <Button size="sm" variant={modo === 'texto' ? 'default' : 'ghost'} onClick={() => setModo('texto')} title="Texto: clique para inserir (F8)"><FileText /> {L('Texto')}<span className="ml-auto text-[9px] font-bold text-amber-400">F8</span></Button>
                      <Button size="sm" variant={modo === 'cota' ? 'default' : 'ghost'} onClick={() => { setModo('cota'); setDesenhoBuffer([]); }} title="Cotar: clique dois pontos (F9)"><RotateCcw className="rotate-90" /> {L('Cota')}<span className="ml-auto text-[9px] font-bold text-amber-400">F9</span></Button>
                      <Button size="sm" variant={modo === 'ignorar' ? 'default' : 'ghost'} onClick={() => setModo(modo === 'ignorar' ? 'navegar' : 'ignorar')} title="Ignorar vértice (F10): clique um vértice e o desenho passa direto por ele"><EyeOff /> {L('Ignorar')}<span className="ml-auto text-[9px] font-bold text-amber-400">F10</span></Button>
                      <Button size="sm" variant={modo === 'considerar' ? 'default' : 'ghost'} onClick={() => setModo(modo === 'considerar' ? 'navegar' : 'considerar')} title="Considerar vértice: clique um ponto ignorado (cinza) para reincluí-lo (F11)"><Plus /> {L('Considerar')}<span className="ml-auto text-[9px] font-bold text-amber-400">F11</span></Button>
                      <Button size="sm" variant={modo === 'inserir' ? 'default' : 'ghost'} onClick={() => setModo('inserir')} title="Inserir vértice (F12)"><Plus /> {L('Inserir vértice')}<span className="ml-auto text-[9px] font-bold text-amber-400">F12</span></Button>
                      <Button size="sm" variant={modo === 'apagar' ? 'default' : 'ghost'} onClick={() => setModo('apagar')} title="Apagar vértice"><Trash2 /> {L('Apagar vértice')}</Button>
                      <Button size="sm" variant={modo === 'multi' ? 'default' : 'ghost'} onClick={() => setModo(modo === 'multi' ? 'navegar' : 'multi')} title="Selecionar vários vértices: clique um a um ou arraste uma caixa; Delete apaga os marcados">
                        <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
                          <circle cx="12" cy="5" r="2.4" fill="currentColor" />
                          <circle cx="5" cy="18" r="2.4" fill="currentColor" />
                          <circle cx="19" cy="18" r="2.4" fill="currentColor" />
                        </svg>
                        {L('Selecionar vários')}
                      </Button>
                      {modo === 'multi' && (
                        <div className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-600 dark:text-amber-400">
                          {selMulti.size > 0
                            ? <button className="w-full text-left font-semibold" onClick={apagarMultiSelecionados}>Apagar {selMulti.size} selecionado(s) — Delete</button>
                            : 'Clique vértices ou arraste uma caixa para selecioná-los.'}
                        </div>
                      )}

                      {modo === 'considerar' && verticesIgnorados.length === 0 && <span className="px-1 text-[10px] text-muted-foreground">Nenhum vértice ignorado.</span>}
                      {(modo === 'polilinha' || modo === 'tracejado') && desenhoBuffer.length >= 2 && <Button size="sm" variant="secondary" onClick={finalizarLinha}><CheckCircle2 /> {L('Finalizar')}</Button>}
                      {objSel?.tipo === 'texto' && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => editarObjetoSel({ tamanho: Math.max(6, (objSel.tamanho ?? 12) - 2) })} title="Diminuir texto"><span className="font-bold">A-</span> {L('Diminuir')}</Button>
                          <Button size="sm" variant="ghost" onClick={() => editarObjetoSel({ tamanho: (objSel.tamanho ?? 12) + 2 })} title="Aumentar texto"><span className="font-bold">A+</span> {L('Aumentar')}</Button>
                          <Button size="sm" variant="ghost" onClick={() => { const t = window.prompt('Texto:', objSel.texto ?? ''); if (t != null) editarObjetoSel({ texto: t }); }} title="Editar texto"><Pencil /> {L('Editar texto')}</Button>
                        </>
                      )}
                      {objSel?.tipo === 'polilinha' && (
                        <>
                          <Button size="sm" variant="secondary" className="gap-1.5 w-full justify-start" onClick={converterPolilinhaEmPerimetro} title="Usar esta polilinha como o perímetro principal do imóvel"><RotateCcw className="size-4 text-emerald-500" /> {L('Usar como perímetro')}</Button>
                          <Button size="sm" variant={objSel.preenchido ? 'default' : 'ghost'} className="w-full justify-start gap-2" onClick={() => editarObjetoSel({ preenchido: !objSel.preenchido })} title="Preencher (ex.: lago)"><Brush /> {L('Preencher')}</Button>
                        </>
                      )}
                      {objetoSelId && <Button size="sm" variant="ghost" onClick={apagarObjetoSel} title="Apagar objeto selecionado"><Trash2 className="text-destructive" /> {L('Apagar objeto')}</Button>}
                      <div className="my-0.5 h-px w-full bg-border" />
                      {/* DXF: baixar e enviar */}
                      <div className={`flex items-center gap-0.5 rounded-md border px-1.5 ${COR_IMPORT}`}>
                        <span className="text-[10px] font-bold mr-1 shrink-0">ARQUIVO DXF</span>
                        <Button size="sm" variant="ghost" className="size-7 p-0" title="Baixar o desenho em DXF" onClick={exportarDxf}><Download className="size-4" /></Button>
                        <Button size="sm" variant="ghost" className="size-7 p-0" disabled={processando} title="Enviar/importar um DXF" onClick={() => dxfRef.current?.click()}><Upload className="size-4" /></Button>
                      </div>
                      {/* KML: baixar (Google Earth/GPS) — mesmo padrão do DXF */}
                      <div className={`flex items-center gap-0.5 rounded-md border px-1.5 ${COR_IMPORT}`}>
                        <span className="text-[10px] font-bold mr-1 shrink-0">ARQUIVO KML</span>
                        <Button size="sm" variant="ghost" className="size-7 p-0" title="Baixar o KML (Google Earth / GPS)" onClick={() => exportarKML(vertices, imovel)}><Download className="size-4" /></Button>
                      </div>
                      {/* Planta de situação (recorte de satélite): capturar/atualizar — veio da barra inferior */}
                      {(() => {
                        const stale = !!situacaoUrl && situacaoVersSnapshot !== JSON.stringify(vertices);
                        const cor = !situacaoUrl || stale ? 'text-amber-600 border-amber-500/40 hover:bg-amber-500 hover:text-white' : 'text-emerald-600 border-emerald-600/40 hover:bg-emerald-600 hover:text-white';
                        return (
                          <Button size="sm" variant="outline" className={`w-full justify-start gap-2 ${cor}`} title={!situacaoUrl ? 'Capturar a planta de situação (recorte de satélite)' : stale ? 'Situação desatualizada — clique para refazer' : 'Situação pronta — clique para refazer'} onClick={gerarSituacaoPlanta}>
                            <Camera className="size-4" /> {L(!situacaoUrl ? 'Capturar situação' : stale ? 'Atualizar situação' : 'Situação pronta')}
                          </Button>
                        );
                      })()}
                    </div>
                  </>
                )}

                {/* RODAPÉ FIXO: ajuste de texto + sistema (calculadora, tema, config, sair) */}
                <div className="mt-auto flex flex-col gap-1 border-t pt-1.5">
                  {/* Errata: botão próprio de largura cheia (mesmo padrão do "capturar situação"), logo abaixo dele */}
                  <Button size="sm" variant="outline" className="w-full justify-start gap-2 text-amber-500 border-amber-500/40 hover:bg-amber-500 hover:text-black dark:text-amber-400 dark:hover:bg-amber-400 dark:hover:text-black" title="Errata: gerar correção formal ao cartório (uso raro)" onClick={() => setErrataAberto(true)}><FileWarning className="size-4" /> {L('Errata')}</Button>
                  {/* A- / A+ contextual (mapa = nomes dos vértices; planta = escala dos textos) — em linha própria */}
                  <div className="flex items-center justify-end gap-0.5 rounded bg-muted/40 px-1" title={vista === 'mapa' ? 'Tamanho dos nomes dos vértices no mapa' : 'Escala dos textos na planta'}>
                    <span className="mr-auto pl-1 text-[10px] font-medium text-muted-foreground">{vista === 'mapa' ? 'Nomes' : 'Textos'}</span>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { if (vista === 'mapa') setTamNomes((n) => Math.max(7, n - 1)); else setPlantaConfig((c) => ({ ...c, escalaTextos: Math.max(0.6, +(((c.escalaTextos ?? 1.5) - 0.05).toFixed(2))) })); }}><span className="text-[10px] font-bold">A-</span></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { if (vista === 'mapa') setTamNomes((n) => Math.min(22, n + 1)); else setPlantaConfig((c) => ({ ...c, escalaTextos: Math.min(2.5, +(((c.escalaTextos ?? 1.5) + 0.05).toFixed(2))) })); }}><span className="text-[10px] font-bold">A+</span></Button>
                  </div>
                  {/* ferramentas e sistema: duas linhas de botões rotulados (não mais ícones espremidos) */}
                  <div className="grid grid-cols-4 gap-1">
                    {([
                      ['Calc.', 'Calculadora: converter coordenada, distância e azimute', <Ruler key="i" className="size-4" />, () => setCalcAberta(true)],
                      ['DXF', 'Editor de DXF (abrir e editar um DXF qualquer, ex.: projeto elétrico — isolado do projeto)', <PencilRuler key="i" className="size-4" />, () => setDxfEditorAberto(true)],
                      ['% Área', 'Porcentagem entre dois polígonos (área de um em relação ao outro e ao total)', <Percent key="i" className="size-4" />, () => setPorcentagemAberta(true)],
                      ['Estúdio', 'Estúdio: edição de imagem (mini-Canva, isolado do projeto)', <ImagePlus key="i" className="size-4" />, () => setEstudioAberto(true)],
                      ['Tema', 'Tema claro/escuro', tema === 'claro' ? <Moon key="i" className="size-4" /> : <Sun key="i" className="size-4" />, () => setTema((t) => (t === 'claro' ? 'escuro' : 'claro'))],
                      ['Ajuda', 'Tutorial: como usar o Métrica, passo a passo', <HelpCircle key="i" className="size-4" />, () => setTutorialAberto(true)],
                      ['RT', 'Dados do responsável técnico: nome, CFT, código do credenciado e contadores', <UserCheck key="i" className="size-4" />, () => { setConfigAba('pessoal'); setConfigAberta(true); }],
                      ['Config.', 'Configurações gerais', <Settings key="i" className="size-4" />, () => { setConfigAba(undefined); setConfigAberta(true); }],
                      ...(souMaster() ? [['Uso', 'Painel do titular: contas e uso do sistema (só você vê)', <BarChart3 key="i" className="size-4" />, () => setMasterAberto(true)]] : []),
                      ...(souMaster() ? [['Demo', 'Carregar um projeto fictício completo (Minas Gerais) para demonstração — peças saem marcadas como dados fictícios', <FlaskConical key="i" className="size-4" />, () => carregarProjetoFicticio()]] : []),
                      ...(nuvemDisponivel && user ? [['Sair', `Sair (${user.email ?? ''})`, <LogOut key="i" className="size-4" />, () => sair()]] : []),
                    ] as [string, string, React.ReactNode, () => void][]).map(([rotuloBtn, dica, icone, acao]) => (
                      <Button key={rotuloBtn} size="sm" variant="outline" className="h-11 flex-col gap-0.5 p-0" title={dica} onClick={acao}>
                        {icone}
                        <span className="text-[11px] leading-none">{rotuloBtn}</span>
                      </Button>
                    ))}
                  </div>
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
          {/* Alternância MAPA/PLANTA: botão quadrado dedicado no canto superior esquerdo. É a troca
              mais usada do app, por isso ganha lugar fixo e exclusivo. Mostra pra onde vai + o atalho F1. */}
          <button type="button" onClick={() => setVista((v) => (v === 'mapa' ? 'planta' : 'mapa'))}
            title="Alternar entre mapa e planta (F1)"
            className="absolute left-3 top-3 z-[1160] flex size-14 flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-primary/50 bg-background/95 shadow-xl backdrop-blur hover:bg-muted">
            {vista === 'mapa' ? <Eye className="size-5 text-primary" /> : <MapIcon className="size-5 text-primary" />}
            <span className="text-[10px] font-bold leading-none">{vista === 'mapa' ? 'PLANTA' : 'MAPA'}</span>
            <span className="text-[8px] font-bold leading-none text-amber-500">F1</span>
          </button>
          {/* BARRA FLUTUANTE (arrastável): dados do projeto + ações úteis, numa linha só.
              Nasce no topo, baixinha, pra não tampar o desenho. Traz também o DETALHES.
              Começa depois do botão de alternância pra não colidir com ele. */}
          <div className={`absolute z-[1150] flex select-none items-stretch gap-1.5 rounded-xl border bg-background/95 p-1.5 shadow-xl backdrop-blur [&_button.act]:flex [&_button.act]:size-10 [&_button.act]:items-center [&_button.act]:justify-center [&_button.act]:rounded-lg ${dadosPos ? '' : 'top-3 right-14'}`} style={dadosPos ? { left: dadosPos.x, top: dadosPos.y } : undefined}>
            {/* alça de arraste */}
            <div className="flex cursor-move items-center rounded-lg bg-muted/60 px-1.5 text-muted-foreground hover:bg-muted" onPointerDown={dadosDown} onPointerMove={dadosMove} onPointerUp={dadosUp} title="Arraste para mover esta barra"><Move className="size-4" /></div>
            {/* dados em linha */}
            <div className="flex items-center gap-3 px-2 text-center leading-tight">
              <div><div className="text-[9px] font-medium uppercase text-muted-foreground">Área SGL</div><div className="text-base font-bold">{res ? `${numBR(res.areaHa, 4)}` : '—'}<span className="ml-0.5 text-[10px] font-normal text-muted-foreground">ha</span></div></div>
              <div><div className="text-[9px] font-medium uppercase text-muted-foreground">Perímetro</div><div className="text-base font-bold">{res ? `${numBR(res.perimetro)}` : '—'}<span className="ml-0.5 text-[10px] font-normal text-muted-foreground">m</span></div></div>
              {/* parcelas INCRA importadas: liga/desliga + transparência, aqui na barra, antes dos vértices */}
              {vista === 'mapa' && parcelasCert.length > 0 && (
                <div title="Parcelas INCRA importadas: marque para mostrar, arraste para a transparência">
                  <label className="flex cursor-pointer items-center gap-1 text-[9px] font-medium uppercase text-muted-foreground">
                    <input type="checkbox" className="size-3 accent-cyan-600" checked={mostrarCert} onChange={(e) => setMostrarCert(e.target.checked)} />
                    INCRA ({parcelasCert.length})
                  </label>
                  <input type="range" min={0} max={0.5} step={0.02} value={opacidadeCert} disabled={!mostrarCert} onChange={(e) => setOpacidadeCert(Number(e.target.value))} className="w-16 accent-cyan-600 align-middle disabled:opacity-40" />
                </div>
              )}
              <div><div className="text-[9px] font-medium uppercase text-muted-foreground">Vértices</div><div className="text-base font-bold">{vertices.length}</div></div>
              <div title="Fuso UTM do projeto — errar o fuso é um erro clássico e caro"><div className="text-[9px] font-medium uppercase text-muted-foreground">Fuso</div><div className="text-base font-bold">{zona}{hemisferio}</div></div>
              <div title={projPronto ? 'Sem problema grave — pode gerar as peças' : 'Falta algo (abra DETALHES para ver o quê)'}><div className="text-[9px] font-medium uppercase text-muted-foreground">Status</div><div className={`text-sm font-bold ${projPronto ? 'text-emerald-600' : 'text-amber-500'}`}>{projPronto ? 'Pronto' : 'Incompleto'}</div></div>
            </div>
            <div className="w-px bg-border" />
            <button type="button" className={`act flex-col gap-0.5 ${infoJaVista(projetoId) ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-amber-500 text-white hover:bg-amber-600'}`} title="Detalhes do projeto, arquivos anexados e pendências (o que ainda falta pra exportar)" onClick={() => setInfoAberto(true)}><FileText className="size-4" /><span className="text-[8px] font-bold leading-none">DETALHES</span></button>
            <button type="button" className="act flex-col gap-0.5 border bg-background hover:bg-muted" title="Focalizar/enquadrar o desenho" onClick={() => (vista === 'mapa' ? centralizar() : ajustarPlanta())}><Target className="size-4" /><span className="text-[8px] font-bold leading-none">FOCO</span></button>
            <button type="button" className="act flex-col gap-0.5 border bg-background hover:bg-muted" title="Informações e gestão financeira do projeto (valor cobrado, gastos, recebimentos, recibo e contrato)" onClick={() => setGestaoAberta(true)}><Info className="size-4" /><span className="text-[8px] font-bold leading-none">GESTÃO</span></button>
            <button type="button" className="act flex-col gap-0.5 border bg-background hover:bg-muted" title="Banco de pontos do credenciado (consultar códigos já usados)" onClick={() => setPontosAberto(true)}><Database className="size-4" /><span className="text-[8px] font-bold leading-none">PONTOS</span></button>
            {vista === 'planta' && (
              <>
                <button type="button" onClick={() => { const nova = !folhaTravada; setFolhaTravada(nova); if (!nova) setModo('navegar'); }} title={folhaTravada ? 'Folha FIXA — clique para liberar e arrastá-la (já ativa a ferramenta Mover)' : 'Folha LIVRE (cuidado) — clique para fixar'}
                  className={`act flex-col gap-0.5 ${folhaTravada ? 'border bg-background text-foreground hover:bg-muted' : 'bg-amber-500 text-white hover:bg-amber-600'}`}>{folhaTravada ? <Lock className="size-4" /> : <LockOpen className="size-4" />}<span className="text-[8px] font-bold leading-none">FOLHA</span></button>
                <button type="button" onClick={() => setPlantaDark((v) => !v)} title={plantaDark ? 'Folha clara' : 'Folha escura (conforto noturno; não afeta o PDF)'}
                  className={`act flex-col gap-0.5 ${plantaDark ? 'bg-slate-800 text-amber-300 hover:bg-slate-700' : 'border bg-background text-foreground hover:bg-muted'}`}>{plantaDark ? <Sun className="size-4" /> : <Moon className="size-4" />}<span className="text-[8px] font-bold leading-none">TEMA</span></button>
                {/* escala: [-] 1/X [+] */}
                <div className="flex items-center gap-1 rounded-lg border bg-background px-1" title="Escala da planta (− aumenta o desenho, + diminui)">
                  <button type="button" className="flex size-7 items-center justify-center rounded hover:bg-muted" onClick={() => setPlantaConfig((c) => ({ ...c, escalaManual: Math.max(250, (c.escalaManual ?? 1000) - 250) }))}><span className="text-base font-bold">−</span></button>
                  <select
                    className="bg-transparent text-center text-xs font-bold outline-none cursor-pointer py-1 px-0.5"
                    value={plantaConfig.escalaManual || ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPlantaConfig((c) => ({ ...c, escalaManual: v ? parseInt(v, 10) : undefined }));
                    }}
                  >
                    <option value="">Auto</option>
                    {[250, 500, 750, 1000, 1250, 1500, 2000, 2500, 3000, 4000, 5000, 7500, 10000].map((d) => (
                      <option key={d} value={d}>1/{d}</option>
                    ))}
                  </select>
                  <button type="button" className="flex size-7 items-center justify-center rounded hover:bg-muted" onClick={() => setPlantaConfig((c) => ({ ...c, escalaManual: (c.escalaManual ?? 1000) + 250 }))}><span className="text-base font-bold">+</span></button>
                </div>
              </>
            )}
            <div className="w-px bg-border" />
            <button type="button" onClick={salvar} disabled={processando} title={salvarLaranja ? 'Há mudanças não salvas — clique para salvar' : 'Salvar o projeto'} className={`act flex-col gap-0.5 disabled:opacity-50 ${salvarLaranja ? 'bg-amber-500 text-white hover:bg-amber-600' : 'border bg-background hover:bg-muted'}`}><Save className={`size-4 ${!salvarLaranja && salvoOk ? 'text-emerald-600' : ''}`} /><span className="text-[8px] font-bold leading-none">SALVAR</span></button>
            <button type="button" onClick={criarNovoProjeto} disabled={processando} title="Novo projeto" className="act flex-col gap-0.5 border bg-background hover:bg-muted disabled:opacity-50"><Plus className="size-4" /><span className="text-[8px] font-bold leading-none">NOVO</span></button>
            {glebas.length > 1 && (
              <>
                <div className="w-px bg-border" />
                <div className="flex items-center gap-1" title="Parcelas — clique para abrir os ajustes na lateral">
                  {glebas.map((g, i) => (
                    <button key={g.id} type="button" onClick={() => { trocarGleba(g.id); setPainelAberto(true); }} title={g.denominacao}
                      className={`act text-sm font-bold ${g.id === glebaAtivaId ? 'bg-primary text-primary-foreground' : 'border bg-background hover:bg-muted'}`}>{i + 1}</button>
                  ))}
                </div>
              </>
            )}
          </div>

          {vista === 'mapa' ? (
              <MapEditor vertices={vertices} selecionadoId={selecionadoId} modo={modo} mostrarRotulos={mostrarRotulos} bloqueado={bloqueado} centralizarSig={centralizarSig}
                confrontantes={confrontantes} confrontantePorLado={confrontantePorLado}
                referencias={referencias.map((anel) => anel.map((p) => [p.lat, p.lon] as [number, number]))}
                parcelasCert={parcelasCert} onAdotarVertice={adotarVerticeVizinho}
                mostrarCert={mostrarCert} opacidadeCert={opacidadeCert} parcelaCertSel={parcelaSel} onSelParcelaCert={setParcelaSel}
                selMulti={selMulti} onToggleMulti={alternarMulti} onBoxSelect={adicionarMulti}
                onDblClick={(lat, lon) => { const t = window.prompt('Texto a inserir:'); if (t) setObjetos((os) => [...os, novoTexto(pontoLL(lat, lon), t)]); }}
                outrasGlebas={glebas.filter((g) => g.id !== glebaAtivaId).map((g) => g.vertices.filter((v) => Number.isFinite(v.lat)).map((v) => [v.lat, v.lon] as [number, number]))}
                objetos={objetos} desenhoAtual={desenhoBuffer.map((p) => [p.lat, p.lon] as [number, number])} rotulos={rotulosConf} centroGleba={centroGlebaInfo} onMoverCentro={(lat, lon) => setPlantaConfig((c) => ({ ...c, centroInfoPos: { lat, lon } }))} onAjustarDivisaConf={ajustarDivisaConf} estiloVertice={plantaConfig.estiloVertice} objetoSelId={objetoSelId}
        onMover={moverVertice} onSelecionar={setSelecionadoId} onApagar={apagarVertice} onInserir={inserirVertice}
                onCliqueDesenho={onCliqueDesenho} onSelecObjeto={setObjetoSelId} onMoverPontoObjeto={onMoverPontoObjeto} onMoverRotulo={onMoverRotulo} onPintarDivisa={pintarDivisa} onPintarConfrontante={pintarConfrontante} onMoverRotuloVertice={onMoverRotuloVertice} onEditarConfrontante={editarConfrontantePlanta}
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
                      resumoGlebas={resumoGlebas}
                      editavel={editarPlanta} modo={modo} objetoSelId={objetoSelId} desenhoAtual={desenhoBuffer}
                      onCliquePlanta={onCliqueDesenho} onSelecObjeto={setObjetoSelId} onMoverPontoObjeto={onMoverPontoObjeto}
                      onExcluirObjeto={(id) => setObjetos((os) => os.filter((o) => o.id !== id))}
                      onMoverRotuloConf={onMoverRotulo} onMoverRotuloVertice={onMoverRotuloVertice}
                      onRemoverSituacao={() => { setSituacaoUrl(undefined); setPlantaConfig((c) => ({ ...c, situacaoDataUrl: undefined })); }}
                      onEditarConfrontante={editarConfrontantePlanta} onTamRotuloConf={ajustarTamRotuloConf} onAjustarDivisaConf={ajustarDivisaConf}
                      onTextoEditar={editarTextoPlanta} onTextoMenu={(id, atual, x, y) => setMenuContexto({ tipo: 'texto', id, atual, x, y })}
                      onMoverFolha={moverFolhaPlanta} onTextoMover={moverTextoPlanta} folhaTravada={folhaTravada} onTextoStartEdit={() => setModo('texto')} onTextoPatch={patchTextoPlanta}
                      onConfigPatch={(patch) => setPlantaConfig((c) => ({ ...c, ...patch }))} onAlternarTipoVertice={alternarTipo} />
                    </ErrorBoundary>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Painel suspenso de dados do projeto — abre de cima pra baixo a partir do cabeçalho */}
        <div ref={painelWrap}
          className={`no-print absolute right-4 top-2 z-[2000] flex w-[550px] max-h-[85vh] flex-col rounded-b-xl border bg-background shadow-2xl transition-all duration-300 ${
            painelAberto
              ? 'translate-y-0 opacity-100 scale-100 visible'
              : '-translate-y-4 opacity-0 scale-95 invisible pointer-events-none'
          }`}
          onMouseEnter={() => { painelMouseDentro.current = true; }}
          onMouseLeave={() => { painelMouseDentro.current = false; if (!asideDrag.current && !painelWrap.current?.contains(document.activeElement)) setPainelAberto(false); }}
          onBlurCapture={() => { setTimeout(() => { if (!painelMouseDentro.current && !painelWrap.current?.contains(document.activeElement)) setPainelAberto(false); }, 50); }}>
          <aside className="relative z-20 flex flex-1 flex-col overflow-hidden bg-background rounded-b-xl">
            {/* Header do dropdown */}
            <div className="flex items-center justify-between bg-[#475569] px-3 py-2 text-white shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-white">
                <Settings className="size-3.5" />
                Dados do Projeto
              </span>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white hover:bg-white/20 hover:text-white" onClick={() => setPainelAberto(false)} title="Fechar painel">
                <X className="size-4" />
              </Button>
            </div>
            {/* glebas */}
            <div className="flex items-center gap-1 overflow-x-auto border-b p-1">
            {glebas.map((g) => (
              <button key={g.id} disabled={processando} onClick={() => trocarGleba(g.id)}
                className={`shrink-0 rounded px-2 py-1 text-xs disabled:opacity-50 ${g.id === glebaAtivaId ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                {g.denominacao}
              </button>
            ))}
            <Button size="sm" variant="ghost" disabled={processando} onClick={novaGleba} title="Nova gleba"><Plus /></Button>
            <Button size="sm" variant="ghost" onClick={() => { const n = window.prompt('Nome da gleba:', glebaAtivaNome); if (n) renomearGlebaAtiva(n); }} title="Renomear gleba"><Pencil /></Button>
            {glebas.length > 1 && <Button size="sm" variant="ghost" disabled={processando} onClick={() => removerGleba(glebaAtivaId)} title="Remover gleba"><Trash2 /></Button>}
          </div>
          {/* resumo movido para o painel flutuante (canto sup. esquerdo do mapa/planta) */}

          {/* abas */}
          <div className="flex border-b text-xs">
            {(['imovel', 'vertices', 'confrontantes', 'planta', 'conferencia', 'projetos'] as Aba[]).map((a) => (
              <button key={a} onClick={() => setAba(a)}
                className={`flex-1 px-1 py-2 ${aba === a ? 'border-b-2 border-primary font-medium text-primary' : 'text-muted-foreground'}`}>
                {a === 'imovel' ? 'Imóvel' : a === 'vertices' ? 'Vértices' : a === 'confrontantes' ? 'Confront.' : a === 'planta' ? 'Planta' : a === 'conferencia' ? 'Conferir' : 'Projetos'}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-2.5 scroll-fino">
            <datalist id="lista-cns">{sugCns.map((c) => <option key={c} value={c} />)}</datalist>
            {aba === 'imovel' && <PainelImovel imovel={imovel} onChange={setImovel} onMunicipio={aoMudarMunicipio} onLocal={aoMudarLocalidade} nome={nomeProjeto} onNome={(v) => { setNomeProjeto(v); setNomeProjetoManual(true); }} zona={zona} hemisferio={hemisferio} onZona={trocarZona} onHemisferio={trocarHemisferio} sugProp={sugProp} onSalvarProp={salvarPropCadastro} sugCartorios={sugCartorios} />}
            {aba === 'vertices' && (
              <div className="space-y-1">
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
                      {l && <div className="text-muted-foreground">→ {azimuteDMS(l.azimute)} · {numBR(l.distancia)} m · {v.tipoLimite || 'LA6'}</div>}
                      {selecionadoId === v.id && (
                        <div className="mt-2 grid grid-cols-2 gap-1 border-t pt-2" onClick={(e) => e.stopPropagation()}>
                          <MiniSelect label="Tipo" value={v.tipo} options={TIPOS_VERTICE as readonly string[]} onChange={(val) => editarVertice(v.id, { tipo: val as Vertex['tipo'], isDivisa: val === 'M' })} />
                          <MiniSelect label="Método" value={v.metodo || 'PG6'} options={METODOS_POSICIONAMENTO as readonly string[]} onChange={(val) => editarVertice(v.id, { metodo: val })} />
                          <MiniSelect label="Limite (saída)" value={v.tipoLimite || 'LA6'} options={TIPOS_LIMITE as readonly string[]} onChange={(val) => editarVertice(v.id, { tipoLimite: val })} />
                          <MiniSelect label="Repres." value={v.representacao || 'linha-ideal'} options={REPRESENTACOES as readonly string[]} onChange={(val) => editarVertice(v.id, { representacao: val })} />
                          <div className="col-span-2 space-y-1">
                            <Label>Altitude (m)</Label>
                            <Input type="number" step="0.01" value={String(v.elevacao)} onChange={(e) => editarVertice(v.id, { elevacao: Number(e.target.value) })} />
                          </div>
                          <div className="col-span-2 grid grid-cols-2 gap-1 mt-1">
                            <button
                              type="button"
                              onClick={() => { setVSplitInicioId(v.id); alert(`Vértice ${v.codigoSigef || v.nome} definido como Início da divisão.`); }}
                              className="rounded border border-input bg-background h-6 px-1 text-[9px] hover:bg-accent font-medium text-foreground transition-colors"
                            >
                              Definir como Início
                            </button>
                            <button
                              type="button"
                              onClick={() => { setVSplitFimId(v.id); alert(`Vértice ${v.codigoSigef || v.nome} definido como Fim da divisão.`); }}
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
              <PainelConfrontantes confrontantes={confrontantes} onChange={setConfrontantes} mapa={confrontantePorLado} lados={lados} sugConf={sugConf} onSalvarCadastro={salvarConfCadastro} />
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
                <Button size="sm" className="w-full" disabled={processando} onClick={salvar}><Save /> Salvar projeto atual</Button>
                <div className="flex items-center gap-2 rounded border bg-muted/40 p-2 text-[11px] text-muted-foreground">
                  <Database className="size-3.5" /> {totalPontos} ponto(s) no banco do credenciado (nunca reusados).
                </div>
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
        onChangePessoas={(r, t) => { setRequerente(r); setTransmitente(t); }}
        sugProp={sugProp}
        onBaixar={() => setBaixou((b) => ({ ...b, req: true }))}
      />
      <CalculadoraModal open={calcAberta} onOpenChange={setCalcAberta} zona={zona} hemisferio={hemisferio} />
      <ErrorBoundary onReset={() => setDxfEditorAberto(false)}><DxfEditorModal open={dxfEditorAberto} onOpenChange={setDxfEditorAberto} /></ErrorBoundary>
      <PorcentagemModal open={porcentagemAberta} onOpenChange={setPorcentagemAberta} glebas={glebas.map((g) => ({ id: g.id, nome: g.denominacao, vertices: g.id === glebaAtivaId ? vertices : g.vertices }))} />
      <ErrorBoundary onReset={() => setEstudioAberto(false)}><EstudioModal open={estudioAberto} onOpenChange={setEstudioAberto} /></ErrorBoundary>
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
      <ErrataModal open={errataAberto} onOpenChange={setErrataAberto} imovel={imovel} tecnico={tecnico} confrontantes={confrontantes} areaHa={res ? valoresEfetivos(res, imovel).areaHa : 0} />
      <ConsultarModal open={consultarAberto} onOpenChange={setConsultarAberto}
        onInserirProprietario={inserirPropConsulta} onInserirConfrontante={inserirConfConsulta}
        onInserirImovel={inserirImovelConsulta} onInserirCartorio={inserirCartorioConsulta} />

      {/* menu de contexto multiuso (clique direito dependendo do elemento/situação) */}
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
                    const txt = window.prompt('Texto a inserir:');
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

          </div>
        </>
      )}
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
        onOpenChange={(o) => { setConfigAberta(o); if (!o) setPrefs(carregarPreferencias()); }}
        abaInicial={configAba}
        onConfigChange={() => { setTecnico(carregarTecnico()); setPrefs(carregarPreferencias()); }}
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
      <TutorialModal open={tutorialAberto} onOpenChange={fecharTutorial} />
      <TermosModal open={!termosOk} onAceitar={() => setTermosOk(true)} />
      <PrimeiroAcessoModal open={termosOk && !setupOk} onConcluir={() => { try { localStorage.setItem('metrica.setupFeito', '1'); } catch { /* ignore */ } setTecnico(carregarTecnico()); setEscritorio(carregarEscritorio()); setSetupOk(true); }} />
      <MasterPainelModal open={masterAberto} onOpenChange={setMasterAberto} />
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

function Campo({ label, value, onChange, placeholder, list }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; list?: string }) {
  return (
    <div className="space-y-0.5">
      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Input list={list} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="h-8 text-sm" />
    </div>
  );
}

function PainelImovel({ imovel, onChange, onMunicipio, onLocal, nome, onNome, zona, hemisferio, onZona, onHemisferio, sugProp, onSalvarProp, sugCartorios }: {
  imovel: ImovelData; onChange: (i: ImovelData) => void; onMunicipio: (s: string) => void; onLocal: (s: string) => void;
  nome: string; onNome: (s: string) => void;
  zona: number; hemisferio: 'N' | 'S'; onZona: (z: number) => void; onHemisferio: (h: 'N' | 'S') => void;
  sugProp: ProprietarioCad[]; onSalvarProp: () => void; sugCartorios: CartorioCad[];
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
        <Campo label="Código do Imóvel (SNCR/INCRA)" value={imovel.codigoImovelIncra} onChange={(v) => set('codigoImovelIncra', v)} />
      )}
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
            onClick={() => {
              if (window.confirm(`Deseja promover o comprador "${imovel.comprador}" a proprietário do imóvel? As informações atuais do proprietário serão substituídas.`)) {
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
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-0.5">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Fuso UTM</Label>
          <Input type="number" value={zona} onChange={(e) => onZona(Number(e.target.value))} className="h-8 text-sm" />
        </div>
        <div className="space-y-0.5">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Hemisfério</Label>
          <select className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm" value={hemisferio} onChange={(e) => onHemisferio(e.target.value as 'N' | 'S')}>
            <option value="S">Sul</option>
            <option value="N">Norte</option>
          </select>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">O fuso não é detectável só pelo TXT. Informe o município que o sistema acerta o fuso (23/24) e confirma no mapa.</p>
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

function PainelConfrontantes({ confrontantes, onChange, mapa, lados, sugConf, onSalvarCadastro }: {
  confrontantes: Confrontante[]; onChange: (c: Confrontante[]) => void;
  mapa: Record<number, string>; lados: { de: Vertex; para: Vertex }[];
  sugConf: ConfrontanteCad[]; onSalvarCadastro: (c: Confrontante) => void;
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
                <button className="text-[10px] text-primary hover:underline" onClick={() => onSalvarCadastro(c)}>salvar no cadastro</button>
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
  type BoolKey = 'mostrarGrade' | 'mostrarNortes' | 'mostrarConvencoes' | 'mostrarEscalaGrafica' | 'mostrarSituacao' | 'mostrarDivisaConf';
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
