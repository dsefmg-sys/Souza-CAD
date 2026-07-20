'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { saveAs } from 'file-saver';
import {
  Upload, FileText, Map as MapIcon, Plus, Trash2,
  RotateCcw, Flag, Save, FolderOpen,
  CheckCircle2, AlertTriangle, XCircle, Database, BookUser, Eye, EyeOff, Search,
  Moon, Sun, Pencil, PenTool, Lock, LockOpen, Brush, Paintbrush, Download, Undo2, Redo2, Users, ShieldCheck, Minus,
  Settings, LogOut, LogIn, Table, Target, Check, X, Ruler, ChevronRight, Camera, PencilRuler, Percent, Info, HelpCircle, GraduationCap, Palette, FlaskConical, Sparkles, Leaf, Waypoints, CreditCard, GripVertical, ChevronDown, Briefcase, PanelLeft, Phone,
  Scissors, Expand, GitCommit, Copy, Square, Circle, Spline, RefreshCw, ExternalLink, Youtube, Archive, BarChart3, ChevronUp, Scale, UserCheck, Monitor, Mountain, LayoutGrid,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { confirmar, avisar, perguntar, escolher } from '@/lib/ui/dialogos';
import { Z_INDEX, Z_CLASSES } from '@/lib/ui/zlayers';
import { Input } from '@/components/ui/input';
import ModalSpreadsheet from '@/components/ModalSpreadsheet';
import { Logo, FundoRedeMarca } from '@/components/Logo';
import DocumentosProjeto from '@/components/DocumentosProjeto';
import NotaLegal from '@/components/NotaLegal';
import { salvarArquivo, type ArquivoProjeto } from '@/lib/store/arquivosProjeto';
import ModalImport from '@/components/ModalImport';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Planta from '@/components/Planta';
import RequerimentoModal, { PESSOA_VAZIA } from '@/components/RequerimentoModal';
const ExtrairIaModal = dynamic(() => import('@/components/ExtrairIaModal'), { ssr: false });
const PainelMasterSaaS = dynamic(() => import('@/components/PainelMasterSaaS'), { ssr: false });
const CarModal = dynamic(() => import('@/components/CarModal'), { ssr: false });
import TrtModal from '@/components/TrtModal';
import ErrataModal from '@/components/ErrataModal';
import MemorialPreviewModal from '@/components/MemorialPreviewModal';
import ConsultarModal from '@/components/ConsultarModal';
import AltitudeModal from '@/components/AltitudeModal';
import { Packer } from 'docx';
import { gerarAnuenciaDocumento, gerarAnuenciaLoteDocumento } from '@/lib/export/anuencia';
import { gerarContratoPdf, gerarPropostaPdf } from '@/lib/export/financeiro';
import {
  gerarDeclaracaoPosseDocx,
  gerarDeclaracaoSobreposicaoDocx,
  gerarDeclaracaoIncapazDocx,
  gerarDeclaracaoEspolioDocx,
  gerarDeclaracaoRespeitoLimitesDocx
} from '@/lib/export/declaracoes';
import { confrontanteAssina } from '@/lib/export/confrontanteTexto';
import { gerarSigefOds, gerarSigefOdsSeparadas } from '@/lib/export/sigefOds';
import ConfiguracoesModal from '@/components/ConfiguracoesModal';
import ImportTxtConfigModal from '@/components/ImportTxtConfigModal';
import AnuenciaModal from '@/components/AnuenciaModal';
import GestaoProjetoModal from '@/components/GestaoProjetoModal';
import TutorialModal from '@/components/TutorialModal';
import MobileHome from '@/components/MobileHome';
import AssinaturaModal from '@/components/AssinaturaModal';
import { rotulosProfissional } from '@/lib/topo/profissional';
import IntroVideo from '@/components/IntroVideo';
import LandingPage from '@/components/LandingPage';
import { TutorialAudioPill } from '@/components/IntroAudio';
import ImportPreviewModal, { type SelecaoImport as ImportSelecao } from '@/components/ImportPreviewModal';
import CalculadoraModal from '@/components/CalculadoraModal';
import EditorPdfModal from '@/components/EditorPdfModal';
import VerticeVirtualModal, { type DadosVerticeVirtual } from '@/components/VerticeVirtualModal';
import PrecoSugeridoModal from '@/components/PrecoSugeridoModal';
import ConfrontanteEditModal from '@/components/ConfrontanteEditModal';
import DxfEditorModal from '@/components/DxfEditorModal';
import PorcentagemModal from '@/components/PorcentagemModal';
import EstudioModal from '@/components/EstudioModal';
import HistoriaModal from '@/components/HistoriaModal';
import Map3DViewer from '@/components/Map3DViewer';
import { ObjetoPersonalizarModal } from '@/components/ObjetoPersonalizarModal';
import { SigefMenuModal } from '@/components/SigefMenuModal';
import { PecasSheetModal } from '@/components/PecasSheetModal';

import PontosBancoModal from '@/components/PontosBancoModal';
import type { ModoEdicao } from '@/components/MapEditor';
import type { Vertex, ImovelData, Confrontante, TecnicoData, EscritorioData, Projeto, ProprietarioCad, ConfrontanteCad, ImovelCad, CartorioCad, ColegaCad, Gleba, PessoaQualificada, ObjetoDesenho, PontoLL, PlantaConfig, Contadores, Lado, VerticeVizinho, TipoVertice, CorrecaoErrata, ProprietarioParte, RawPoint } from '@/lib/topo/types';
import { novaPolilinha, novoTexto, novaCota, novoSimbolo, novaCurvaNivel, areaPoligonoObjeto, comprimentoPolilinha, distanciaCota, CAR_TEMAS, COR_CURVA_NIVEL, COR_CURVA_AUTO } from '@/lib/topo/objetos';
import { gerarCurvasDeNivel, intervaloSugerido, pontoNoPoligono, type Ponto3D } from '@/lib/topo/curvasNivel';
import { estimarAltitudes } from '@/lib/topo/altitudes';
import { calcularOndulacaoGeoidalMAPGEO, ortometricaParaElipsoidal } from '@/lib/topo/geoid';
import { SIMBOLOS, simboloSvgInterno } from '@/lib/topo/simbolos';
import type { RotuloMapa } from '@/components/MapEditor';
import { parseTxt, pontosDePerimetro } from '@/lib/topo/parseTxt';
import { useAutoSave } from '@/lib/hooks/useAutoSave';
import { useSuporteData } from '@/lib/hooks/useSuporteData';
import { useTelaEstreita } from '@/lib/hooks/useTelaEstreita';
import { montarVertices, reordenar, definirInicio, novoVertice, reprojetar, iniciarDoNorteHorario, recodificar } from '@/lib/topo/vertices';
import { montarConfrontantes } from '@/lib/topo/confrontantes';
import { novaGlebaVazia, glebaDe, migrarProjeto, dividirGleba, unirGlebas, dividirPorAreaAlvo } from '@/lib/topo/glebas';
import { areaPoligonoEN, areaSobreposicaoEstimada } from '@/lib/topo/confrontacaoCheck';
import { calcular } from '@/lib/topo/calcular';
import { escolherZonaPorAncora, geoParaUtm, utmParaGeo, convergenciaMeridiana } from '@/lib/topo/coords';
import { importarDxf, anelDeDxf } from '@/lib/io/dxf';
import { gerarShapefileZip, importarShapefileZip, lerShp } from '@/lib/io/shapefile';
import { gerarSituacao } from '@/lib/io/situacao';
import { importarGeoJsonAneis } from '@/lib/io/geojson';
import { parseParcelasSigef, parseGmlParcelas, parcelasParaReferencias, parcelasVizinhas, parseVerticesSigefGml, parsePropriedadeSigefGml } from '@/lib/io/sigefVizinhos';
import { parseVerticesVizinho } from '@/lib/io/verticesVizinho';
import { validarTamanhoArquivo } from '@/lib/io/validarArquivo';
import { ufsNoBbox, temaIncra, TEMAS_CONFRONTANTE, INCRA_UFS } from '@/lib/io/incraTemas';
import { linhasRotuloConfrontante } from '@/lib/topo/rotuloConfrontante';
import { ancoraMunicipio, MUNICIPIOS, detectarFusoPorRegiao, ufDoMunicipio } from '@/lib/topo/municipios';
import { atribuirProvisorio, semente } from '@/lib/topo/registroCore';
import { snapUtm, type SegmentoSnap } from '@/lib/topo/snap';
import { conferir, valoresEfetivos, type Problema, detectarConflitosDivisas, type ConflitoDivisa } from '@/lib/topo/conferencia';
import { corPorConfrontante, gerarCorNovaConfrontante } from '@/lib/topo/coresConfrontante';
import { conferirProntoParaExportar } from '@/lib/topo/conferenciaExportacao';
import { TIPOS_VERTICE, TIPOS_LIMITE, METODOS_POSICIONAMENTO, REPRESENTACOES, REPRES_LABEL, corDivisa } from '@/lib/topo/sigefVocab';
import { numBR, azimuteDMS, azimute } from '@/lib/topo/geometry';
import { cpfOuCnpjValido, formatarCpfCnpj } from '@/lib/topo/validation';
import { aplicarOrto, parseAzimute, type ModoOrto } from '@/lib/topo/orto';
import { dividirSegmentoUtm } from '@/lib/topo/editing';
import { porAfastamento } from '@/lib/topo/verticeVirtual';
import { carregarTecnico, carregarEscritorio, carregarPlantaPadrao, salvarPlantaPadrao, salvarTemaUsuario, carregarTemaUsuario, carregarImportTxt, carregarModeloSigef, carregarImportVerticesVizinho, tutorialJaVisto, marcarTutorialVisto, carregarPlantaTemplates, salvarPlantaTemplate } from '@/lib/store/settings';
import { useAuth, sair } from '@/lib/firebase/auth';
import { definirModoEntrada, useModoEntrada } from '@/lib/store/loginSkip';
import { puxarConfigDaNuvem, empurrarConfigParaNuvem, limparConfigLocalNaSaida } from '@/lib/store/configNuvem';
import { salvarProjeto, listarProjetos, carregarProjeto, excluirProjeto, novoId, NuvemSemPermissao, sincronizarProjetosLocalParaNuvem } from '@/lib/store/projects';
import { exportarProjetoZip } from '@/lib/store/backup';
import { lerContadores, registrarPontos, totalPontosRegistrados } from '@/lib/store/registro';
import { carregarTitulos, adicionarTitulo } from '@/lib/store/titulos';
import { gerarProjetoFicticio } from '@/lib/demo/projetoFicticio';
import { iniciarCoresDivisa, salvarCorDivisa, coresEfetivas } from '@/lib/store/coresDivisa';
import { carregarTiposDivisaCustom, salvarTipoDivisaCustom, type TipoDivisaCustom } from '@/lib/store/tiposDivisaCustom';
import { sincronizarPerfil, registrarProjetoSalvo, obterPerfilUsuario, aceitarConviteSePendente, obterContagemUsuarios, type PerfilUso } from '@/lib/store/perfilUso';
import { garantirEmpresaDoWorkspace, minhaEmpresa, type Empresa } from '@/lib/store/empresas';
import { carregarPreferencias, salvarPreferencias, salvarModo, proximoModo, registrarTempoCompleto, confirmarApagar, casasTela, PREFERENCIAS_PADRAO, ATALHOS_F_PADRAO, ATALHOS_COMANDO_PADRAO, type PreferenciasApp } from '@/lib/store/preferencias';
import { carregarPadroes } from '@/lib/store/padroes';
import { souMaster, carregarModo3dAtivado, carregarYoutubePlaylist, carregarVideosTutorial, carregarLandingPageTexts, LANDING_PADRAO, type VideoTutorial, type LandingPageTexts } from '@/lib/store/suporte';
import { carregarConfigAssinatura, verificarBloqueioFaturamento, type ConfigAssinatura } from '@/lib/store/assinatura';

import PrimeiroAcessoModal from '@/components/PrimeiroAcessoModal';
import PlanilhaConferenciaModal from '@/components/PlanilhaConferenciaModal';
import { proprietarios as cadProp, confrontantesCad as cadConf, cartoriosCad as cadCart, colegasCad, imoveisCad, sincronizarCadastrosLocalParaNuvem } from '@/lib/store/cadastros';
import { exportarKML } from '@/lib/export/kml';
import RelatorioSobreposicaoModal from '@/components/RelatorioSobreposicaoModal';
import ErrorBoundary from '@/components/ErrorBoundary';
import JSZip from 'jszip';
import { type TipoAtoRequerimento } from '@/lib/export/requerimento';
import { compatibilizarWord2007 } from '@/lib/export/compatWord2007';

const MapEditor = dynamic(() => import('@/components/MapEditor'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Carregando mapa…</div>,
});

function IconeCurvasNivel({ className = "size-4 text-indigo-500" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 19c4-2 7-2 11 0s5-1 5-3" />
      <path d="M3 14c3-2 8-1 12 1s5-2 6-4" />
      <path d="M5 9c4-3 9-1 12 1s4-2 4-3" />
      <path d="M7 4c3-1 6 0 10 1" />
    </svg>
  );
}

const IMOVEL_VAZIO: ImovelData = {
  denominacao: '', matricula: '', cns: '', codigoImovelIncra: '', proprietario: '',
  cpfProprietario: '', tipoPessoa: 'Física', comprador: '', cpfComprador: '', municipio: '', local: '',
  naturezaServico: 'Particular', situacao: 'Imóvel Registrado', naturezaArea: 'Particular',
  tipoImovel: 'rural', usarValoresSigef: true, inscricaoMunicipal: '', frenteM: undefined, fundosM: undefined, distanciaEsquinaM: undefined, esquinaRua: '',
};

const MOCK_PROJECT = {
  v: 1,
  projetoId: 'projeto_ficticio',
  nome: 'Fazenda Rio das Pedras - Gleba A',
  nomeProjetoManual: true,
  zona: 22,
  hemisferio: 'S' as const,
  imovel: {
    denominacao: 'Fazenda Rio das Pedras',
    proprietario: 'José Francisco da Silva',
    cpfProprietario: '123.456.789-00',
    tipoPessoa: 'Física',
    comprador: '',
    cpfComprador: '',
    matricula: '12.345',
    cns: '01.234-5',
    codigoImovelIncra: '950.123.456.789-0',
    municipio: 'São João d\'Aliança-GO',
    local: 'Zona Rural',
    naturezaServico: 'Particular',
    situacao: 'Imóvel Registrado',
    naturezaArea: 'Particular',
    tipoImovel: 'rural' as const,
    usarValoresSigef: true,
    inscricaoMunicipal: '',
    frenteM: undefined,
    fundosM: undefined,
    distanciaEsquinaM: undefined,
    esquinaRua: '',
    regimeTerra: 'propriedade' as const,
  },
  glebas: [
    {
      id: 'gleba_ficticia',
      denominacao: 'Gleba A',
      parcela: '001',
      vertices: [
        { id: 'v1', nome: 'M-0001', tipo: 'M' as const, norte: 8400000, leste: 300000, altitude: 850.5, sigefStatus: 'ok' as const, isDivisa: true, codigoSigef: 'COIN-M-0001', latitude: -14.462153, longitude: -46.855018 },
        { id: 'v2', nome: 'P-0002', tipo: 'P' as const, norte: 8400200, leste: 300150, altitude: 852.1, sigefStatus: 'ok' as const, isDivisa: false, codigoSigef: 'COIN-P-0002', latitude: -14.460341, longitude: -46.853632 },
        { id: 'v3', nome: 'V-0003', tipo: 'V' as const, norte: 8400100, leste: 300300, altitude: 854.8, sigefStatus: 'ok' as const, isDivisa: false, codigoSigef: 'COIN-V-0003', latitude: -14.461241, longitude: -46.852232 },
        { id: 'v4', nome: 'M-0004', tipo: 'M' as const, norte: 8399900, leste: 300100, altitude: 851.0, sigefStatus: 'ok' as const, isDivisa: true, codigoSigef: 'COIN-M-0004', latitude: -14.463053, longitude: -46.854098 },
      ],
      confrontantes: [
        { id: 'c1', nome: 'Fazenda Santa Maria', matricula: '9.876', cns: '01.234-5', tipoPessoa: 'Física', cpf: '000.000.000-00', glebaId: 'gleba_ficticia', lado: 'M-0001 a P-0002' },
        { id: 'c2', nome: 'Estrada Municipal', matricula: '', cns: '', tipoPessoa: 'Física', cpf: '', glebaId: 'gleba_ficticia', lado: 'P-0002 a V-0003' },
        { id: 'c3', nome: 'Córrego Fundo', matricula: '', cns: '', tipoPessoa: 'Física', cpf: '', glebaId: 'gleba_ficticia', lado: 'V-0003 a M-0004' },
        { id: 'c4', nome: 'Sítio Novo', matricula: '4.321', cns: '01.234-5', tipoPessoa: 'Física', cpf: '000.000.000-00', glebaId: 'gleba_ficticia', lado: 'M-0004 a M-0001' },
      ],
      confrontantePorLado: {
        0: 'c1',
        1: 'c2',
        2: 'c3',
        3: 'c4'
      },
      objetos: [
        { id: 'obj1', tipo: 'texto' as const, x: 300150, y: 8400050, texto: 'Área da Gleba A', escala: 1.2, cor: '#d97706', angulo: 0, bold: true },
      ],
    }
  ],
  glebaAtivaId: 'gleba_ficticia',
  requerente: { nome: 'José Francisco da Silva', cpf: '123.456.789-00', cns: '01.234-5', matricula: '12.345', tipoPessoa: 'Física' },
  transmitente: { nome: 'Maria de Lourdes Silva', cpf: '987.654.321-00', tipoPessoa: 'Física' },
  tipoAto: 'venda',
  partesAdicionais: [],
  correcoes: [],
  plantaConfig: {
    centroInfoPos: 'centro' as const,
  },
  parcelasCert: [],
  verticesVizinho: [],
  verticesIgnorados: [],
  gradeAltimetrica: [],
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

/** Remove acentos/cedilha de um nome de arquivo para evitar rejeição pelo SIGEF. */
function limparNomeArquivo(nome: string): string {
  if (!nome) return '';
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[çÇ]/g, (m) => (m === 'ç' ? 'c' : 'C'));
}

type Aba = 'imovel' | 'localizacao' | 'proprietario' | 'vertices' | 'confrontantes' | 'planta' | 'projetos';

// tons médios e suaves (funcionam no tema claro e escuro via opacidade)
// municípios mais atendidos (atalho na importação; cada um ancora o fuso 23/24)
const MUNICIPIOS_ATALHO = ['Espera Feliz-MG', 'Dores do Rio Preto-ES', 'Caiana-MG', 'Guaçuí-ES', 'Carangola-MG', 'Caparaó-MG'];

// Linguagem de cor por FUNÇÃO do botão (deixa o cabeçalho intuitivo: a cor diz o que o grupo faz).
// O ícone ainda muda de cor pelo progresso (verde=feito, azul=andamento) por cima disso.
// Coerência de cor: as ETAPAS de processo (importar, SIGEF, dados, marcar) ficam em tom suave,
// distintas pela cor mas calmas; só as PEÇAS de saída usam o verde forte da marca — a cor de ação
// principal, porque baixar as peças é o objetivo do trabalho. Assim o olho é guiado, não gritado.
const COR_IMPORT = 'bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-700 text-white border-transparent';       // entrada de dados
const COR_VIZINHO = 'bg-teal-600 hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-800 text-white border-transparent'; // vizinho certificado (SIGEF/INCRA)
const COR_DADOS = 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 text-white border-transparent'; // cadastro e IA
const COR_CONFRO = 'bg-blue-800 hover:bg-blue-900 text-white border-transparent';
const COR_DIVISA = 'bg-indigo-700 hover:bg-indigo-800 text-white border-transparent';
const COR_PECA = 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent'; // peças de saída — cor de ação principal (verde da marca)
const COR_PECA_OURO = 'bg-gradient-to-r from-amber-500 via-yellow-600 to-amber-600 hover:from-amber-600 hover:via-yellow-700 hover:to-amber-700 text-white border-transparent shadow font-extrabold hover:scale-[1.02] active:scale-95 transition-all duration-150';
const COR_ATIVO = 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent shadow-xs'; // botões ativos da lateral esquerda
const PREM_BTN = 'shadow-xs hover:shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 font-bold border rounded-lg';

type EtapaEstado = 'feito' | 'andamento' | 'pendente';
// Sinaliza o progresso da etapa por um SELO no canto do botão (não mais pela cor do ícone, que
// destoava do texto): check verde = feita; bolinha azul pulsando = em andamento; nada = pendente.
function Etapa({ st, explicacao, tituloEtapa, children }: { st: EtapaEstado; explicacao?: string; tituloEtapa?: string; children: ReactNode }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="relative flex shrink-0" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {children}
      {st === 'feito' && (
        <span className="pointer-events-none absolute -right-1 -top-1 z-10 flex size-3.5 items-center justify-center rounded-full bg-green-600 text-white ring-2 ring-background" aria-label="etapa concluída">
          <Check className="size-2.5" strokeWidth={3.5} />
        </span>
      )}
      {st === 'andamento' && (
        <span className="pointer-events-none absolute -right-1 -top-1 z-10 size-2.5 animate-pulse rounded-full bg-blue-500 ring-2 ring-background" aria-label="etapa em andamento" />
      )}
      {hovered && explicacao && (
        <div className="absolute top-full left-0 mt-2.5 z-[9999] w-72 p-3.5 rounded-xl bg-slate-950/95 text-slate-100 border border-emerald-500/40 shadow-2xl backdrop-blur-md pointer-events-none animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="size-3.5 shrink-0 text-emerald-400" /> {tituloEtapa || 'Como funciona este passo'}
          </div>
          <p className="text-[11px] font-medium leading-relaxed text-slate-300 whitespace-normal">
            {explicacao}
          </p>
        </div>
      )}
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

function Atalho({ k, className }: { k: string; className?: string }) {
  if (!k) return null;
  return (
    <span className={`pointer-events-none text-[8.5px] font-sans font-black tracking-wider uppercase px-1.5 py-[1px] leading-none rounded bg-black/15 dark:bg-white/20 text-current opacity-90 shrink-0 select-none ml-auto transition-all ${className ?? ''}`}>
      {k.toUpperCase()}
    </span>
  );
}

// Interruptor único do gerenciamento de camadas na interface. FALSO a pedido do dono: o controle de
// camadas (visibilidade/bloqueio/cor/espessura) só valia no mapa e confundia na planta. Esconde as
// DUAS portas — o botão flutuante CAMADAS e o cartão "Gerenciador de Camadas" do mapa. O código e o
// estado continuam intactos: no padrão, tudo fica visível e desbloqueado (o desenho aparece normal).
// Basta trocar para `true` pra trazer o gerenciador de volta, sem reescrever nada.
const GERENCIADOR_CAMADAS_VISIVEL = false;

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

export interface EstiloCamada {
  cor: string;
  espessura: number;
}

function montarSnapshotDesenho(glebasArr: { vertices: Vertex[]; objetos?: ObjetoDesenho[] }[]) {
  return JSON.stringify({
    glebas: glebasArr.map((g) => g.vertices.map((v) => ({ leste: v.leste, norte: v.norte }))),
    objetos: glebasArr.flatMap((g) => (g.objetos || []).filter((o) => o.tipo === 'polilinha' && o.preenchido).map((o) => o.pontos.map((p) => ({ leste: p.leste, norte: p.norte })))),
  });
}

// Converte a cor da marca (hex) para HSL numérico. Devolve null se o hex não for válido.
function hexParaHsl(hex: string): { h: number; s: number; l: number } | null {
  hex = (hex || '').trim().replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) return null;
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// Ajusta a cor da marca pra ficar LEGÍVEL como cor de acento na interface, respeitando o tema. O
// problema que isto resolve: a cor da empresa vira `--primary`, usada tanto como texto colorido
// quanto como fundo de botão. Sem ajuste, uma cor clara (branco, amarelo) some no tema claro, e uma
// cor escura (preto) some no tema escuro. Aqui a luminosidade é presa numa faixa que sempre lê: no
// tema claro fica média-escura; no escuro, média-clara. Preto/branco puros deixam de quebrar a
// leitura — viram um tom visível em vez de sumir. Devolve também o `foreground`, a cor do texto pra
// quando ESSA cor é fundo de botão (texto escuro sobre cor clara, branco sobre cor escura).
function corMarcaLegivel(hex: string, isDark: boolean): { valor: string; foreground: string } | null {
  const hsl = hexParaHsl(hex);
  if (!hsl) return null;
  const { h, s } = hsl;
  // faixa de luminosidade legível por tema (em %). No claro, escura o bastante pra ler no branco;
  // no escuro, clara o bastante pra ler no preto.
  const l = isDark ? Math.min(80, Math.max(55, hsl.l)) : Math.min(46, Math.max(22, hsl.l));
  const foreground = l >= 60 ? '0 0% 12%' : '0 0% 100%';
  return { valor: `${h} ${s}% ${l}%`, foreground };
}

export default function EditorPage() {
  const { user, carregando: authCarregando, disponivel: nuvemDisponivel } = useAuth();
  const modoEntrada = useModoEntrada();
  const entrouSemLogin = nuvemDisponivel && !user && modoEntrada === 'semLogin';
  const [perfilMenuAberto, setPerfilMenuAberto] = useState(false);
  const [avatarQuebrado, setAvatarQuebrado] = useState(false);
  useEffect(() => { setAvatarQuebrado(false); }, [user]);
  const [pecasMenuAberto, setPecasMenuAberto] = useState(false); // no celular, as peças ficam num menu só
  // O botão PEÇAS mora dentro da barra de ferramentas, que tem overflow-x-auto — e overflow numa
  // direção corta a outra também. Um menu absoluto abrindo pra baixo era cortado (parecia "não
  // funcionar"). Solução: abrir o menu com posição FIXA, ancorado na posição do botão, escapando do
  // corte. `pecasBtnRef` mede o botão; `pecasMenuPos` guarda onde ancorar.
  const pecasBtnRef = useRef<HTMLDivElement>(null);
  const [pecasMenuPos, setPecasMenuPos] = useState<{ top: number; right: number } | null>(null);
  function alternarMenuPecas(e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setPecasSheetAberto(true);
      return;
    }
    if (pecasBtnRef.current) {
      const r = pecasBtnRef.current.getBoundingClientRect();
      const winW = typeof window !== 'undefined' ? window.innerWidth : 1200;
      const rightPos = Math.max(8, winW - r.right);
      const topPos = Math.max(40, r.bottom + 4);
      setPecasMenuPos({ top: topPos, right: rightPos });
    } else {
      setPecasMenuPos({ top: 56, right: 16 });
    }
    setPecasMenuAberto((v) => !v);
  }
  const [pecasSheetAberto, setPecasSheetAberto] = useState(false); // janela de escolher peça no mobile (abre pela MobileHome)
  const [dadosMenuAberto, setDadosMenuAberto] = useState(false);
  const dadosBtnRef = useRef<HTMLDivElement>(null);
  const [dadosMenuPos, setDadosMenuPos] = useState<{ top: number; left: number } | null>(null);
  function alternarMenuDados() {
    setDadosMenuAberto((v) => {
      const abrindo = !v;
      if (abrindo && dadosBtnRef.current) {
        const r = dadosBtnRef.current.getBoundingClientRect();
        setDadosMenuPos({ top: r.bottom + 4, left: Math.max(4, r.left) });
      }
      return abrindo;
    });
  }
  const [explicacaoPassoAberto, setExplicacaoPassoAberto] = useState(false);
  const [perfil, setPerfil] = useState<PerfilUso | null>(null);
  // Cobrança é POR EMPRESA (Etapa 2b do SaaS multi-empresa) — quando existe, manda no bloqueio de
  // faturamento; sem ela ainda (empresa recém-criada, doc ainda propagando), cai pro `perfil`
  // individual como antes, pra nunca bloquear ninguém à toa durante a transição.
  const [empresaAtual, setEmpresaAtual] = useState<Empresa | null>(null);
  const [configAssinatura, setConfigAssinatura] = useState<ConfigAssinatura | null>(null);
  const [numUsuariosTotal, setNumUsuariosTotal] = useState(12);
  const [landingTexts, setLandingTexts] = useState<LandingPageTexts>(LANDING_PADRAO);
  const [avisoPagamentoAberto, setAvisoPagamentoAberto] = useState(false);
  const [pagamentoVerificando, setPagamentoVerificando] = useState(false);
  // zoom/pan da PRÉVIA da planta (não afeta o PDF exportado, que lê o SVG original)
  const [plantaZoom, setPlantaZoom] = useState(1);
  const [plantaPan, setPlantaPan] = useState({ x: 0, y: 0 });
  // espelho de zoom/pan pra calcular o zoom-no-cursor sem atualizador aninhado (que o React roda 2x em dev)
  const vistaPlantaRef = useRef({ z: 1, x: 0, y: 0 });
  const [editarPlanta] = useState(true); // planta abre já no modo edição
  const [folhaTravada, setFolhaTravadaState] = useState(false);
  const setFolhaTravada = (valOrFunc: boolean | ((v: boolean) => boolean)) => {
    setFolhaTravadaState((prev) => {
      const next = typeof valOrFunc === 'function' ? valOrFunc(prev) : valOrFunc;
      try { localStorage.setItem('metrica:planta_folha_travada', next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  };
  const [menuContexto, setMenuContexto] = useState<{
    tipo: 'texto' | 'vertice' | 'divisa' | 'mapa' | 'objeto' | 'confrontante' | 'parcelaCert';
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
  // Painel de AJUSTE RÁPIDO do elemento (duplo clique): mostra o que é útil daquele elemento e deixa
  // ajustar na hora — ponto: altitude/coordenadas; segmento: comprimento/azimute; objeto: cor/medidas.
  const [painelElem, setPainelElem] = useState<{
    tipo: 'vertice' | 'divisa' | 'objeto';
    x: number; y: number;
    vertice?: Vertex; verticeIdx?: number; id?: string; objetoTipo?: string;
  } | null>(null);
  const aviseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const plantaPanRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const [tecnico, setTecnico] = useState<TecnicoData | null>(null);
  const [escritorio, setEscritorio] = useState<EscritorioData | null>(null);
  // A aplicação das cores da marca fica MAIS ABAIXO (junto do efeito de tema), porque precisa saber
  // se o tema é claro ou escuro pra ajustar o brilho da cor e não sumir. Ver corMarcaLegivel.
  const [vertices, setVertices] = useState<Vertex[]>([]);
  const [verticesIgnorados, setVerticesIgnorados] = useState<Vertex[]>([]); // fora do anel (ferramenta ignorar/considerar)
  const [gradeAltimetrica, setGradeAltimetrica] = useState<{ lat: number; lon: number; leste: number; norte: number; elevacao: number }[]>([]);
  const [verticesOnlineElev, setVerticesOnlineElev] = useState<Record<string, number>>({});
  const [historiaAberta, setHistoriaAberta] = useState(false);
  const [imovel, setImovel] = useState<ImovelData>(IMOVEL_VAZIO);
  const [confrontantes, setConfrontantes] = useState<Confrontante[]>([]);
  const [confrontantePorLado, setConfrontantePorLado] = useState<Record<number, string>>({});

  // Auxiliar para manter a correspondência dos confrontantes ao reordenar, apagar ou rotacionar vértices
  function reindexarCplPara(novos: Vertex[]) {
    setConfrontantePorLado((prev) => {
      const proximo: Record<number, string> = {};
      novos.forEach((v, novoIdx) => {
        const origIdx = vertices.findIndex((x) => x.id === v.id);
        if (origIdx >= 0) {
          const cid = prev[origIdx];
          if (cid) proximo[novoIdx] = cid;
        }
      });
      return proximo;
    });
  }
  // Multi-gleba: `glebas` é a lista completa (a ativa pode estar desatualizada); o estado de
  // trabalho acima (vertices/confrontantes/confrontantePorLado) é a FONTE da gleba ativa.
  // `sincronizarGlebas()` devolve a lista com a ativa atualizada a partir do estado de trabalho.
  const [glebas, setGlebas] = useState<Gleba[]>([]);
  const [glebaAtivaId, setGlebaAtivaId] = useState<string>('');
  // bloqueia trocar/criar gleba e importar enquanto uma operação assíncrona (importar/salvar)
  // está em andamento — evita corrida que jogaria dados na gleba errada.
  const [processando, setProcessando] = useState(false);
  // Overlay visual de feedback ao executar atalho de teclado (OK = verde, erro = vermelho)
  const [feedbackAtalho, setFeedbackAtalho] = useState<{ texto: string; tipo: 'ok' | 'erro' } | null>(null);
  const feedbackAtalhoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Hash dos vértices no momento da última reconciliação com o SIGEF (para detectar mudanças)
  const [verticesHashConferencia, setVerticesHashConferencia] = useState<string | null>(null);
  const [zona, setZona] = useState(23);
  const [hemisferio, setHemisferio] = useState<'N' | 'S'>('S');
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [realceId, setRealceId] = useState<string | null>(null); // vértice destacado ao passar o mouse na lista
  const [modo, setModo] = useState<ModoEdicao>('navegar');
  // Clicar de novo na ferramenta que JÁ está ativa a desmarca (volta pro navegar) — antes não
  // havia como "largar" a ferramenta pelo próprio botão (pedido do dono, 05/07/2026).
  function alternarModo(m: ModoEdicao, limparBuffer = false) {
    setModo((atual) => (atual === m ? 'navegar' : m));
    if (limparBuffer) setDesenhoBuffer([]);
  }
  // ----- Desenho de precisão estilo CAD (modo Completo) -----
  const [orto, setOrto] = useState<ModoOrto>('off');           // trava de ângulo do desenho
  const [azDigitado, setAzDigitado] = useState('');            // rumo digitado (painel de precisão)
  const [distDigitada, setDistDigitada] = useState('');        // distância digitada (m)
  const ignorouRef = useRef(false);       // ignorou vértice desde que entrou no modo ignorar
  const modoAntesRef = useRef<ModoEdicao>('navegar');
  const refUltimaFerramenta = useRef<ModoEdicao>('navegar');
  useEffect(() => {
    if (modo !== 'navegar' && modo !== 'copiar_base' && modo !== 'copiar_destino') {
      refUltimaFerramenta.current = modo;
    }
  }, [modo]);
  const [selMulti, setSelMulti] = useState<Set<string>>(new Set()); // vértices marcados no modo "triângulo"
  const [objSelMulti, setObjSelMulti] = useState<Set<string>>(new Set()); // OBJETOS marcados na mesma caixa de seleção (linhas, textos, símbolos, cotas, retângulos, arcos)
  const [mostrarRotulos, setMostrarRotulos] = useState(true);
  // Nascem já com o valor salvo (lazy init), não com o padrão seguido de troca — senão a troca
  // pós-montagem disparava a notificação de tamanho sozinha ao abrir o app.
  const [tamNomes, setTamNomes] = useState(() => {
    if (typeof window === 'undefined') return 11;
    try { const n = Number(localStorage.getItem('metrica.tamNomes')); if (n >= 7 && n <= 22) return n; } catch { /* ignore */ }
    return 11;
  }); // tamanho da fonte dos nomes dos vértices no mapa
  const [tamCentro, setTamCentro] = useState(() => {
    if (typeof window === 'undefined') return 12;
    try { const n = Number(localStorage.getItem('metrica.tamCentro')); if (n >= 7 && n <= 22) return n; } catch { /* ignore */ }
    return 12;
  }); // tamanho da fonte do texto central da gleba (denominação/área/perímetro) no mapa
  const [simboloSel, setSimboloSel] = useState('arvore'); // elemento cartográfico ativo (modo 'simbolo')
  const [, setElementosAberto] = useState(false); // popover do seletor de elementos
  const [escalaInterface, setEscalaInterface] = useState(() => {
    if (typeof window === 'undefined') return 1;
    try { const s = carregarPreferencias().escalaFonte; if (s >= 0.8 && s <= 1.6) return s; } catch { /* ignore */ }
    return 1;
  }); // acessibilidade: escala das letras da interface
  const [notificacaoTamanho, setNotificacaoTamanho] = useState<{ texto: string; visible: boolean }>({ texto: '', visible: false });
  const [, setTamanhoTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const escalaMontadaRef = useRef(false);
  const tamNomesMontadoRef = useRef(false);
  const tamCentroMontadoRef = useRef(false);

  const mostrarNotificacaoTamanho = (texto: string) => {
    setNotificacaoTamanho({ texto, visible: true });
    setTamanhoTimer((prevTimer) => {
      if (prevTimer) clearTimeout(prevTimer);
      return setTimeout(() => {
        setNotificacaoTamanho((prev) => ({ ...prev, visible: false }));
      }, 1500);
    });
  };
  const [snapAtivo, setSnapAtivo] = useState(false);
  const [segmentoSelecionado, setSegmentoSelecionado] = useState<SegmentoSnap | null>(null);
  const [offsetDistancia, setOffsetDistancia] = useState<number>(5);
  const [copiarPontoBase, setCopiarPontoBase] = useState<PontoLL | null>(null);
  const [linhaLimite, setLinhaLimite] = useState<SegmentoSnap | null>(null);
  const [camadasVisiveis, setCamadasVisiveis] = useState<Record<string, boolean>>({
    divisas: true,
    ambientais: true,
    polilinhas: true,
    textos: true,
    cotas: true,
    simbolos: true,
    curvas: true
  });
  const [camadasBloqueadas, setCamadasBloqueadas] = useState<Record<string, boolean>>({
    divisas: false,
    ambientais: false,
    polilinhas: false,
    textos: false,
    cotas: false,
    simbolos: false,
    curvas: false
  });
  const [estilosCamadas, setEstilosCamadas] = useState<Record<string, EstiloCamada>>({
    divisas: { cor: '#facc15', espessura: 2 },
    ambientais: { cor: '#22c55e', espessura: 1.5 },
    polilinhas: { cor: '#2563eb', espessura: 1.5 },
    textos: { cor: '#000000', espessura: 1 },
    cotas: { cor: '#b91c1c', espessura: 1.2 },
    simbolos: { cor: '#06b6d4', espessura: 1 },
    curvas: { cor: '#854d0e', espessura: 1.0 }
  });
  useEffect(() => {
    setSegmentoSelecionado(null);
    setCopiarPontoBase(null);
    setLinhaLimite(null);
  }, [modo]);
  const [bloqueado, setBloqueado] = useState(true); // vértices travados por padrão (protege o georref)
  const [tipoDivisaPincel, setTipoDivisaPincel] = useState<string>('estrada'); // pincel do modo "pintar divisa"
  const [tiposDivisaCustom, setTiposDivisaCustom] = useState<TipoDivisaCustom[]>([]); // tipos de divisa cadastrados pelo projetista
  const [corPickerAberto, setCorPickerAberto] = useState(false); // painel de ajuste rápido das cores de divisa
  const [corBump, setCorBump] = useState(0); // força re-render após trocar uma cor (cores vivem em módulo)
  const [prefs, setPrefs] = useState<PreferenciasApp>(PREFERENCIAS_PADRAO); // preferências de interface
  const [avisoReconciliarAberto, setAvisoReconciliarAberto] = useState(false);
  const [avisoReconciliarResolve, setAvisoReconciliarResolve] = useState<((v: 'exportar' | 'voltar' | 'conciliar') => void) | null>(null);
  // Tipos de divisa pra escolher: os oficiais (REPRESENTACOES) + os que o projetista cadastrou.
  const opcoesDivisaTipo: string[] = [...REPRESENTACOES, ...tiposDivisaCustom.map((t) => t.chave)];
  const rotuloDivisaTipo = (tipo: string) => REPRES_LABEL[tipo] || tiposDivisaCustom.find((t) => t.chave === tipo)?.label || tipo;
  async function novoTipoDivisaPincel() {
    const label = await perguntar({ titulo: 'Novo tipo de divisa', mensagem: 'Nome do tipo de divisa (ex.: "Cerca de arame farpado"):' });
    if (!label || !label.trim()) return;
    const novo = salvarTipoDivisaCustom(label);
    setTiposDivisaCustom(carregarTiposDivisaCustom());
    setTipoDivisaPincel(novo.chave);
  }
  const [setupOk, setSetupOk] = useState(true); // primeiro acesso: cadastro de empresa/autônomo
  const [planilhaConfAberta, setPlanilhaConfAberta] = useState(false); // conferência da planilha SIGEF
  const [imoveisCadastrados, setImoveisCadastrados] = useState<ImovelCad[]>([]);
  useEffect(() => {
    if (planilhaConfAberta) {
      imoveisCad.listar().then(setImoveisCadastrados).catch(() => {});
    }
  }, [planilhaConfAberta]);

  const [confrontantePincelId, setConfrontantePincelId] = useState<string>(''); // pincel do modo "pintar confrontantes"
  const [pincelInicioId, setPincelInicioId] = useState<string | null>(null); // início do trecho selecionado para pintura de divisa/confrontante
  // Tela estreita (celular em pé): o app é pensado pra tela horizontal, então no mobile a gente
  // encolhe a barra de ferramentas pra só ícones, senão ela sozinha come quase toda a largura e
  // sobra um filete pro mapa. Deitar o aparelho (paisagem) volta ao layout normal.
  const telaEstreita = useTelaEstreita();
  // No celular, a tela inicial é a "home de escritório" (abrir/criar projeto, IA, dados) em vez do
  // mapa — mapa/planta continuam existindo, só ficam atrás de um "Ver mapa" discreto. Só é
  // consultado quando telaEstreita; no desktop não tem efeito nenhum.
  const [mobileTela, setMobileTela] = useState<'home' | 'mapa'>('home');
  // barra de ferramentas (esquerda, fixa, largura redimensionável e salva por usuário)
  const [toolW, setToolW] = useState(270); // largura confortável pra não espremer os rótulos dos botões
  const [asideDragging, setAsideDragging] = useState(false);
  // No celular a barra de ferramentas nasce OCULTA — no mobile ela quase não serve (não se desenha),
  // então o mapa ocupa a tela toda; o botão de expandir no cabeçalho revela ela quando precisar.
  // No celular a barra de ferramentas nasce oculta (largura 0). Como o mobile é só consulta/escritório
  // (não se desenha), não há mais botão pra revelá-la — o toggle saiu junto com o cabeçalho mobile.
  const [barraLateralOculta] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const toolWEfetivo = telaEstreita ? (barraLateralOculta ? 0 : 54) : toolW;
  // Barra flutuante dos áudios (Introdução/Tutorial), separada da principal: abre por padrão toda
  // vez que o app é aberto; o usuário pode fechar se não quiser ouvir.
  const [barraAudiosAberta, setBarraAudiosAberta] = useState(true);
  const [comandoInput, setComandoInput] = useState('');
  const comandoInputRef = useRef<HTMLInputElement>(null);
  const [menuFerramentasAberto, setMenuFerramentasAberto] = useState(false);
  const [simuladorResolucao, setSimuladorResolucao] = useState<'off' | 'comum' | 'fullhd' | 'ultrawide' | 'celular'>('off');

  // Onde o mapa ABRE num projeto vazio: a última localização em que o próprio cliente trabalhou
  // (guardada abaixo). Sem histórico, cai no centro do país — não em Espera Feliz, que é só a minha
  // região; só eu (master) começo por lá. Assim outras empresas abrem perto de onde trabalham.
  const [entradaMapa] = useState<{ centro: [number, number]; zoom: number }>(() => {
    if (typeof window === 'undefined') return { centro: [-15.78, -47.93], zoom: 4 };
    try {
      const s = localStorage.getItem('metrica:ultimoCentroMapa');
      if (s) { const p = JSON.parse(s); if (Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])) return { centro: [p[0], p[1]], zoom: 13 }; }
    } catch { /* ignore */ }
    return souMaster() ? { centro: [-20.6506, -41.9094], zoom: 13 } : { centro: [-15.78, -47.93], zoom: 4 };
  });
  // Sempre que houver vértices válidos, memoriza a região do cliente para a próxima abertura.
  useEffect(() => {
    const v = vertices.find((x) => Number.isFinite(x.lat) && Number.isFinite(x.lon) && (x.lat !== 0 || x.lon !== 0));
    if (v) { try { localStorage.setItem('metrica:ultimoCentroMapa', JSON.stringify([v.lat, v.lon])); } catch { /* ignore */ } }
  }, [vertices]);
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
  const [objPersonalizarId, setObjPersonalizarId] = useState<string | null>(null);
  const [copiaBuffer, setCopiaBuffer] = useState<ObjetoDesenho | null>(null);
  const [tutorialSimplificadoAberto, setTutorialSimplificadoAberto] = useState(false);
  const [vSplitInicioId, setVSplitInicioId] = useState<string | null>(null);
  const [vSplitFimId, setVSplitFimId] = useState<string | null>(null);
  const [areaAlvoHa, setAreaAlvoHa] = useState(''); // divisão por área alvo (ha)
  const [focoLatLng, setFocoLatLng] = useState<[number, number] | null>(null);
  const [dragVtxIdx, setDragVtxIdx] = useState<number | null>(null);
  const [situacaoUrl, setSituacaoUrl] = useState<string | undefined>(undefined);
  const [print3dUrl, setPrint3dUrl] = useState<string | undefined>(undefined);
  // referências (confrontantes certificados importados de GeoJSON) — desenho + alvos de snap
  const [referencias, setReferencias] = useState<{ lat: number; lon: number; leste: number; norte: number }[][]>([]);
  const [parcelasCert, setParcelasCert] = useState<{ anel: [number, number][]; info: { titulo: string; linhas: string[] }; codigoImovel?: string }[]>([]);
  const [listaColegas, setListaColegas] = useState<ColegaCad[]>([]);
  // vértices de imóveis vizinhos já certificados (importados do Distribuidor de Coordenadas): ficam
  // guardados no projeto para reaproveitar coordenada/sigma/nome na planta e servir de alvo de encaixe
  const [verticesVizinho, setVerticesVizinho] = useState<VerticeVizinho[]>([]);
  const [parcelaSel, setParcelaSel] = useState<number | null>(null); // parcela INCRA selecionada (painel)
  const [mostrarCert, setMostrarCert] = useState(true);              // liga/desliga a camada de parcelas
  const [opacidadeCert, setOpacidadeCert] = useState(0.06);          // opacidade do preenchimento
  const conflitos = useMemo(() => detectarConflitosDivisas(vertices, referencias), [vertices, referencias]);
  const colegasIdentificados = useMemo(() => {
    const codigos = new Set<string>();
    for (const vv of verticesVizinho) {
      if (vv.nome) codigos.add(vv.nome);
    }
    for (const v of vertices) {
      if (v.codigoSigef) codigos.add(v.codigoSigef);
    }
    const prefixos = new Set<string>();
    for (const cod of codigos) {
      const m = cod.trim().match(/^([A-Z]{3,4})[-_]/i);
      if (m) prefixos.add(m[1].toUpperCase());
    }
    if (prefixos.size === 0) return [];
    return listaColegas.filter((c) => prefixos.has(c.credenciamento.toUpperCase()));
  }, [verticesVizinho, vertices, listaColegas]);
  const [tema, setTema] = useState<'claro' | 'escuro'>('escuro');
  const [temaCarregadoDaNuvem, setTemaCarregadoDaNuvem] = useState(false);
  const [planilhaAberta, setPlanilhaAberta] = useState(false);
  const [contadorSugerido, setContadorSugerido] = useState<Contadores | null>(null);
  const [importModalAberto, setImportModalAberto] = useState(false);
  const [importPendingFile, setImportPendingFile] = useState<File | null>(null);
  const [vista, setVista] = useState<'mapa' | 'planta' | '3d'>('mapa');
  const { modo3dAtivado, videosUrl, videosTutorial } = useSuporteData();
  const [videosListaAberta, setVideosListaAberta] = useState(false);
  const [aba, setAba] = useState<Aba>('imovel');
  const [projetoId, setProjetoId] = useState<string | null>(null);
  const [nomeProjeto, setNomeProjeto] = useState('');
  const [nomeProjetoManual, setNomeProjetoManual] = useState(false);
  const [reqAberto, setReqAberto] = useState(false);
  const [anuenciaAberta, setAnuenciaAberta] = useState(false);
  const [modalSobreposicaoAberto, setModalSobreposicaoAberto] = useState(false);
  const [trtAberto, setTrtAberto] = useState(false);
  const [conferirAberto, setConferirAberto] = useState(false);
  const [calcAberta, setCalcAberta] = useState(false);
  const [editorPdfAberto, setEditorPdfAberto] = useState(false);
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
        } catch {}
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

  const [posAtalhos, setPosAtalhos] = useState(() => {
    if (typeof window !== 'undefined') {
      const salva = localStorage.getItem('metrica:pos_barra_atalhos');
      if (salva) {
        try {
          const p = JSON.parse(salva);
          if (typeof p.x === 'number' && typeof p.y === 'number') {
            return p;
          }
        } catch {}
      }
    }
    return { x: 100, y: 56 };
  });

  const [arrastandoAtalhos, setArrastandoAtalhos] = useState<{
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
  } | null>(null);

  useEffect(() => {
    if (!arrastandoAtalhos) return;
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - arrastandoAtalhos.startX;
      const dy = e.clientY - arrastandoAtalhos.startY;
      setPosAtalhos({
        x: Math.max(0, Math.min(window.innerWidth - 100, arrastandoAtalhos.startPosX + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 30, arrastandoAtalhos.startPosY + dy)),
      });
    };
    const handleMouseUp = () => {
      localStorage.setItem('metrica:pos_barra_atalhos', JSON.stringify(posAtalhos));
      setArrastandoAtalhos(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [arrastandoAtalhos, posAtalhos]);

  const [posArea, setPosArea] = useState(() => {
    if (typeof window !== 'undefined') {
      const salva = localStorage.getItem('metrica:pos_barra_medidas');
      if (salva) {
        try {
          const p = JSON.parse(salva);
          if (typeof p.x === 'number' && typeof p.y === 'number') {
            return p;
          }
        } catch {}
      }
    }
    return { x: 300, y: 16 };
  });

  const [arrastandoArea, setArrastandoArea] = useState<{
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
  } | null>(null);

  useEffect(() => {
    if (!arrastandoArea) return;
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - arrastandoArea.startX;
      const dy = e.clientY - arrastandoArea.startY;
      setPosArea({
        x: Math.max(toolWEfetivo + 12, Math.min(window.innerWidth - 180, arrastandoArea.startPosX + dx)),
        y: Math.max(5, Math.min(window.innerHeight - 40, arrastandoArea.startPosY + dy)),
      });
    };
    const handleMouseUp = () => {
      localStorage.setItem('metrica:pos_barra_medidas', JSON.stringify(posArea));
      setArrastandoArea(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [arrastandoArea, posArea, toolWEfetivo]);

  const [posAudioBarra, setPosAudioBarra] = useState(() => {
    if (typeof window !== 'undefined') {
      const salva = localStorage.getItem('metrica:pos_barra_audios');
      if (salva) {
        try {
          const p = JSON.parse(salva);
          if (typeof p.x === 'number' && typeof p.y === 'number') {
            return p;
          }
        } catch {}
      }
    }
    return { x: 350, y: 720 };
  });

  const [arrastandoAudioBarra, setArrastandoAudioBarra] = useState<{
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
  } | null>(null);

  useEffect(() => {
    if (!arrastandoAudioBarra) return;
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - arrastandoAudioBarra.startX;
      const dy = e.clientY - arrastandoAudioBarra.startY;
      setPosAudioBarra({
        x: Math.max(10, Math.min(window.innerWidth - 300, arrastandoAudioBarra.startPosX + dx)),
        y: Math.max(10, Math.min(window.innerHeight - 50, arrastandoAudioBarra.startPosY + dy)),
      });
    };
    const handleMouseUp = () => {
      localStorage.setItem('metrica:pos_barra_audios', JSON.stringify(posAudioBarra));
      setArrastandoAudioBarra(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [arrastandoAudioBarra, posAudioBarra]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const salvaAudios = localStorage.getItem('metrica:pos_barra_audios');
      let posAud = {
        x: Math.max(10, Math.floor(window.innerWidth / 2 - 200)),
        y: Math.max(10, window.innerHeight - 56),
      };
      if (salvaAudios) {
        try {
          const parsed = JSON.parse(salvaAudios);
          if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            posAud = {
              x: Math.max(10, Math.min(window.innerWidth - 300, parsed.x)),
              y: Math.max(10, Math.min(window.innerHeight - 50, parsed.y)),
            };
          }
        } catch {}
      }
      setPosAudioBarra(posAud);

      const salvaAtalhos = localStorage.getItem('metrica:pos_barra_atalhos');
      if (!salvaAtalhos) {
        setPosAtalhos({ x: window.innerWidth / 2 - 250, y: 64 });
      }

      const salvaArea = localStorage.getItem('metrica:pos_barra_medidas');
      let posAr = {
        x: Math.max(10, Math.floor(window.innerWidth / 2 - 120)),
        y: Math.max(10, window.innerHeight - 80),
      };
      if (salvaArea) {
        try {
          const parsed = JSON.parse(salvaArea);
          if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            posAr = {
              x: Math.max(10, Math.min(window.innerWidth - 300, parsed.x)),
              y: Math.max(10, Math.min(window.innerHeight - 50, parsed.y)),
            };
          }
        } catch {}
      }
      setPosArea(posAr);

      const salvaFolhaTravada = localStorage.getItem('metrica:planta_folha_travada');
      if (salvaFolhaTravada !== null) {
        setFolhaTravadaState(salvaFolhaTravada === '1');
      }
      const salvaPlantaDark = localStorage.getItem('metrica:planta_dark_mode');
      if (salvaPlantaDark !== null) {
        setPlantaDarkState(salvaPlantaDark === '1');
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setPosArea((curr: { x: number; y: number }) => {
        const maxX = Math.max(10, window.innerWidth - 300);
        const maxY = Math.max(10, window.innerHeight - 50);
        const newX = Math.max(10, Math.min(maxX, curr.x));
        const newY = Math.max(10, Math.min(maxY, curr.y));
        if (newX !== curr.x || newY !== curr.y) return { x: newX, y: newY };
        return curr;
      });
      setPosAudioBarra((curr: { x: number; y: number }) => {
        const maxX = Math.max(10, window.innerWidth - 300);
        const maxY = Math.max(10, window.innerHeight - 50);
        const newX = Math.max(10, Math.min(maxX, curr.x));
        const newY = Math.max(10, Math.min(maxY, curr.y));
        if (newX !== curr.x || newY !== curr.y) return { x: newX, y: newY };
        return curr;
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [plantaDark, setPlantaDarkState] = useState(true);
  const setPlantaDark = (valOrFunc: boolean | ((v: boolean) => boolean)) => {
    setPlantaDarkState((prev) => {
      const next = typeof valOrFunc === 'function' ? valOrFunc(prev) : valOrFunc;
      try { localStorage.setItem('metrica:planta_dark_mode', next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  };
  // progresso por etapa (ações do usuário que não se completam sozinhas)
  const [sigefStatus, setSigefStatus] = useState<'idle' | 'clicado' | 'enviado'>('idle');
  const [baixou, setBaixou] = useState<{ memorial?: boolean; ods?: boolean; planta?: boolean; req?: boolean; errata?: boolean }>({});
  const [errataAberto, setErrataAberto] = useState(false);
  const [sigefMenuAberto, setSigefMenuAberto] = useState(false);
  const [prevMemorialAberto, setPrevMemorialAberto] = useState(false);
  const [prevMemorialModo, setPrevMemorialModo] = useState<'normal' | 'servidao'>('normal');
  const [importTxtConfigAberto, setImportTxtConfigAberto] = useState(false);

  const projetoTemServidao = useMemo(() => {
    const q = 'servid';
    return (
      (imovel.denominacao || '').toLowerCase().includes(q) ||
      (nomeProjeto || '').toLowerCase().includes(q) ||
      glebas.some(g => (g.denominacao || '').toLowerCase().includes(q)) ||
      objetos.some(o => (o.texto || '').toLowerCase().includes(q)) ||
      vertices.some(v => (v.codigoCampo || '').toLowerCase().includes(q) || (v.codigoSigef || '').toLowerCase().includes(q))
    );
  }, [imovel.denominacao, nomeProjeto, glebas, objetos, vertices]);
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
  const [tutorialF1Aberto, setTutorialF1Aberto] = useState(false);
  const [corCert, setCorCert] = useState('#06b6d4');
  const [corBordaCert, setCorBordaCert] = useState('#0891b2');
  const [espessuraCert, setEspessuraCert] = useState(1.4);
  const [assinaturaAberta, setAssinaturaAberta] = useState(false);
  const [projetosModalAberto, setProjetosModalAberto] = useState(false);
  // A CHAVE do app: 'simples' (tela enxuta, ideal pra aprender) x 'completo' (tudo à mostra).
  // Novo usuário começa no simples. Fica salvo nas preferências e vale no app inteiro.
  const [modoApp, setModoApp] = useState<'simples' | 'medio' | 'completo'>('simples');
  const [, setTempoCompletoMs] = useState(0);
  const [landingPageAberta, setLandingPageAberta] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('landing') === 'true' || urlParams.has('landing')) {
        return true;
      }
      const fechadaNestaSessao = sessionStorage.getItem('metrica:landing_page_fechada');
      return !fechadaNestaSessao;
    } catch {
      return true;
    }
  });
  const [introTocando, setIntroTocando] = useState(() => {
    if (typeof window === 'undefined') return false;
    try { if (sessionStorage.getItem('metrica:intro_tocada_sessao')) return false; } catch { /* ignore */ }
    return carregarPreferencias().introVideoAtiva;
  }); // enquanto a abertura roda, escondemos a chave de modo
  useEffect(() => { try { const p = carregarPreferencias(); setModoApp(p.modo); setTempoCompletoMs(p.tempoCompletoMs || 0); } catch { /* ignore */ } }, []);
  useEffect(() => {
    if (!authCarregando) {
      if (!user && nuvemDisponivel) {
        setLandingPageAberta(true);
      } else if (user) {
        try {
          const urlParams = new URLSearchParams(window.location.search);
          if (!urlParams.get('landing') && !urlParams.has('landing')) {
            setLandingPageAberta(false);
          }
        } catch {
          setLandingPageAberta(false);
        }
      }
    }
  }, [user, authCarregando, nuvemDisponivel]);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('landing') === 'true' || urlParams.has('landing')) {
          setLandingPageAberta(true);
        }
      } catch { /* ignore */ }
    }
    const h = (e: Event) => setIntroTocando(!!(e as CustomEvent<boolean>).detail);
    window.addEventListener('souzacad:intro', h);
    const s = () => setLandingPageAberta(true);
    window.addEventListener('souzacad:ver-site', s);
    return () => {
      window.removeEventListener('souzacad:intro', h);
      window.removeEventListener('souzacad:ver-site', s);
    };
  }, []);
  function trocarModoApp(m: 'simples' | 'medio' | 'completo') { setModoApp(m); try { salvarModo(m); } catch { /* ignore */ } }
  const completo = modoApp === 'completo';
  const medio = modoApp === 'medio';
  // "Pelo menos Médio": vale pro Médio E pro Completo. É o que gate das ferramentas do dia a dia que
  // o Médio já entrega — usar `medio` sozinho as esconderia no Completo. `completo` fica reservado
  // só pro que é avançado de verdade.
  const medioOuMais = modoApp !== 'simples';
  // Enquanto está no Completo, acumula tempo de uso (resolução de 1 min). Passou de 5 h, a chave
  // do topo some pra deixar a tela limpa — voltar ao Simples fica só nas Configurações.
  useEffect(() => {
    if (modoApp !== 'completo') return;
    const t = setInterval(() => { try { setTempoCompletoMs(registrarTempoCompleto(60000)); } catch { /* ignore */ } }, 60000);
    return () => clearInterval(t);
  }, [modoApp]);
  // No Simples a chave sempre aparece (pra poder subir pro Completo). No Completo ela só some depois
  // de 5 h acumuladas — antes disso ainda dá pra voltar fácil pelo topo.
  const chaveTopoVisivel = true;
  // primeira vez neste navegador: abre o tutorial sozinho (independe de login/rascunho).
  useEffect(() => {
    if (!tutorialJaVisto()) {
      setTutorialAberto(true);
      try {
        const key = rascunhoKey();
        localStorage.setItem(key, JSON.stringify(MOCK_PROJECT));
        aplicarRascunho(MOCK_PROJECT as unknown as ReturnType<typeof montarRascunho>);
      } catch { /* ignore */ }
    }
  }, []);
  function fecharTutorial(o: boolean) { setTutorialAberto(o); if (!o) marcarTutorialVisto(); }
  const [pontosAberto, setPontosAberto] = useState(false);
  const [pontosDecisaoAberto, setPontosDecisaoAberto] = useState(false);

  function abrirGestaoPontos() {
    if (vertices.length > 0) {
      setPontosDecisaoAberto(true);
    } else {
      setPontosAberto(true);
    }
  }
  const [previewData, setPreviewData] = useState<{
    perim: unknown; vs: Vertex[]; numGlebas: number; municipio: string; fuso: unknown; z: number;
    novoImovel: ImovelData; contM: number; contP: number; prefixo: string; isGmlImport: boolean;
  } | null>(null);
  const [importacaoModoMesclar, setImportacaoModoMesclar] = useState(false);
  const [situacaoVersSnapshot, setSituacaoVersSnapshot] = useState<string>('');
  const snapshotDesenho = useMemo(() => {
    return montarSnapshotDesenho(sincronizarGlebas());
  }, [glebas, glebaAtivaId, vertices, objetos]);
  const rascunhoRestaurado = useRef(false); // garante restaurar o rascunho só uma vez
  const [requerente, setRequerente] = useState<PessoaQualificada | undefined>(undefined);
  const [transmitente, setTransmitente] = useState<PessoaQualificada | undefined>(undefined);
  const [tipoAto, setTipoAto] = useState<TipoAtoRequerimento>('venda');
  const [partesAdicionais, setPartesAdicionais] = useState<PessoaQualificada[]>([]);
  const [correcoes, setCorrecoes] = useState<CorrecaoErrata[]>([]);
  const [modoMaster, setModoMaster] = useState<'editar' | 'gerir'>('editar');
  const [avisoCriarContaFechado, setAvisoCriarContaFechado] = useState(false);
  const [ocultarCobranca, setOcultarCobranca] = useState(false);
  useEffect(() => {
    carregarConfigAssinatura().then((c) => setOcultarCobranca(!!c.ocultarCobranca)).catch(() => {});
  }, [user]);
  const [plantaConfig, setPlantaConfig] = useState<PlantaConfig>({});

  // Sempre que os vértices da gleba ativa forem alterados ou carregados, garante que o vértice de referência
  // da planta seja mantido sincronizado para o vértice mais ao Norte recém-calculado.
  useEffect(() => {
    if (!vertices || vertices.length < 3) return;
    const ordenados = iniciarDoNorteHorario(vertices);
    const norteId = ordenados[0]?.id;
    if (norteId && plantaConfig.verticeReferenciaId !== norteId) {
      setPlantaConfig((prev) => ({ ...prev, verticeReferenciaId: norteId }));
    }
  }, [vertices, plantaConfig.verticeReferenciaId]);

  // Assinatura do conteúdo do projeto, pra acender o disquete laranja quando há mudança não salva.
  // (Lógica extraída pra src/lib/hooks/useAutoSave.ts — inclui glebas INTEIRO, não só IDs,
  // pra detectar edições em glebas inativas também.)
  const autoSave = useAutoSave({
    vertices, imovel, confrontantes, confrontantePorLado, objetos, plantaConfig, glebas,
    verticesVizinho, verticesIgnorados, nomeProjeto, requerente, transmitente, tipoAto,
    partesAdicionais, gradeAltimetrica,
  });
  const salvoOk = autoSave.salvoOk;
  const setSalvoOk = autoSave.setSalvoOk;
  const salvarLaranja = autoSave.salvarLaranja;
  const setSalvarLaranja = autoSave.setSalvarLaranja;
  const salvoNuvem = autoSave.salvoNuvem;
  const setSalvoNuvem = autoSave.setSalvoNuvem;
  const naoEstaNaNuvem = salvarLaranja || !salvoNuvem;
  // Aliases curtos pros callsites existentes
  const ultimoSalvoSig = { current: '' }; // mantido só pra não quebrar os 6 callsites; valor é gerenciado pelo hook
  const acabouDeSalvar = { current: false };

  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [exportandoProjetoId, setExportandoProjetoId] = useState<string | null>(null);
  const [sugProp, setSugProp] = useState<ProprietarioCad[]>([]);
  const [sugConf, setSugConf] = useState<ConfrontanteCad[]>([]);
  const [sugCns, setSugCns] = useState<string[]>([]);
  const [sugCartorios, setSugCartorios] = useState<CartorioCad[]>([]);
  const [totalPontos, setTotalPontos] = useState(0);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);


  const dxfRef = useRef<HTMLInputElement>(null);
  const kmlRef = useRef<HTMLInputElement>(null);
  const geojsonRef = useRef<HTMLInputElement>(null);
  const shapefileRef = useRef<HTMLInputElement>(null);
  const vizinhosRef = useRef<HTMLInputElement>(null);
  const verticesVizinhoRef = useRef<HTMLInputElement>(null);
  const jsonBackupRef = useRef<HTMLInputElement>(null);
  const corrigirLatLonRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    setTecnico(carregarTecnico());
    setEscritorio(carregarEscritorio());
    cadProp.listar().then((res) => { if (active) setSugProp(res); }).catch(() => {});
    cadConf.listar().then((res) => { if (active) setSugConf(res); }).catch(() => {});
    cadCart.listar().then((cs) => { if (active) { setSugCns(cs.map((c) => c.cns).filter(Boolean)); setSugCartorios(cs); } }).catch(() => {});
    totalPontosRegistrados().then((t) => { if (active) setTotalPontos(t); }).catch(() => {});
    const t = (localStorage.getItem('metrica.tema') as 'claro' | 'escuro') || 'escuro';
    if (active) setTema(t);
    setPlantaConfig(carregarPlantaPadrao()); // ajustes-padrão da planta (trabalhos futuros)
    iniciarCoresDivisa(); // aplica as cores de divisa personalizadas do projetista
    setTiposDivisaCustom(carregarTiposDivisaCustom());
    obterContagemUsuarios().then((n) => { if (active) setNumUsuariosTotal(n); }).catch(() => {});
    carregarLandingPageTexts().then((txts) => { if (active) setLandingTexts(txts); }).catch(() => {});
    setPrefs(carregarPreferencias()); // preferências de interface (ícones do cabeçalho etc.)
    // condições de uso: o aceite é registrado discretamente no primeiro acesso (PrimeiroAcessoModal);
    // o texto mora em Ajustes → Sobre o sistema — sem tela bloqueando (decisão do dono, 05/07/2026)
    // primeiro acesso: só pede cadastro pra quem não é o titular e ainda não configurou
    try { if (active) setSetupOk(souMaster() || localStorage.getItem('metrica.setupFeito') === '1'); } catch { if (active) setSetupOk(true); }
    // registra/atualiza o perfil de uso (o titular acompanha empresa, RT, projetos)
    const esc = carregarEscritorio(); const tec = carregarTecnico();
    const muniUsar = esc.cidade || imovel?.municipio || '';
    const ufUsar = esc.uf || ufDoMunicipio(imovel?.municipio) || '';
    sincronizarPerfil({
      ultimoAcessoEm: Date.now(),
      empresaNome: esc.nome,
      empresaCnpj: esc.cnpj,
      rtNome: tec.nome,
      rtCft: tec.cft,
      municipio: muniUsar,
      uf: ufUsar,
    }).catch(() => {});
    try { const w = Number(localStorage.getItem('metrica.toolW')); if (w >= 52 && w <= 480 && active) setToolW(w); } catch { /* ignore */ }
    // tamNomes e escalaInterface já nascem com o valor salvo (lazy init do useState, acima).
    try { const w = Number(localStorage.getItem('metrica.asideW')); if (w >= 300 && w <= 680 && active) setAsideW(w); } catch { /* ignore */ }
    // começa com uma gleba
    const g = glebaDe(1, [], [], {}, 'Parcela 1');
    if (active) {
      setGlebas([g]);
      setGlebaAtivaId(g.id);
    }
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!authCarregando) {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const landingExplicit = urlParams.get('landing') === 'true' || urlParams.has('landing');
        if (user) {
          // Usuário LOGADO: entra direto no aplicativo sem exibir a landing page (a menos que solicitada na URL)
          if (!landingExplicit) {
            setLandingPageAberta(false);
          }
        } else {
          // Usuário NÃO LOGADO: exibe a landing page por padrão
          if (!sessionStorage.getItem('metrica:landing_page_fechada') || landingExplicit) {
            setLandingPageAberta(true);
          }
        }
      } catch { /* ignore */ }
    }

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

      // Carrega informações de assinatura/faturamento
      obterPerfilUsuario().then((p) => {
        setPerfil(p);
        if (p?.statusPagamento === 'atrasado' && !souMaster()) {
          // Mostrar o aviso popup ao abrir o app (caso ainda não esteja bloqueado)
          const agora = Date.now();
          const atrasadoDesde = p.atrasadoDesde || agora;
          const diffMs = agora - atrasadoDesde;
          const diasDecorridos = Math.floor(diffMs / (24 * 60 * 60 * 1000));
          const diasRestantes = Math.max(0, 15 - diasDecorridos);
          if (diasRestantes > 0) {
            setAvisoPagamentoAberto(true);
          }
        }
      }).catch(() => {});

      carregarConfigAssinatura().then(setConfigAssinatura).catch(() => {});

      // Verifica se retornou do Mercado Pago com pagamento aprovado
      const urlParams = new URLSearchParams(window.location.search);
      const paymentId = urlParams.get('payment_id');
      const collectionStatus = urlParams.get('collection_status');
      if (paymentId && collectionStatus === 'approved') {
        setPagamentoVerificando(true);
        user.getIdToken().then((token) => {
          fetch(`/api/mp/verify?payment_id=${paymentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          .then((res) => res.json())
          .then(async (data) => {
            if (data.success) {
              // Atualiza o perfil na nuvem e localmente
              await sincronizarPerfil({ statusPagamento: 'pago', atrasadoDesde: null });
              const atualizado = await obterPerfilUsuario();
              setPerfil(atualizado);
              // Limpa a URL para não ficar re-verificando
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          })
          .catch((err) => console.error("Erro ao verificar pagamento:", err))
          .finally(() => setPagamentoVerificando(false));
        }).catch(() => setPagamentoVerificando(false));
      }

      // Antes de decidir se precisa do primeiro acesso: se alguém convidou este e-mail pra
      // empresa dele (Configurações → Ajudantes/Equipe), aceita automaticamente e já pula direto
      // pro workspace dessa empresa — sem isso, um convidado cairia na tela de "criar empresa
      // nova" achando que precisa se cadastrar do zero.
      aceitarConviteSePendente().then((empresaConvite) => {
        if (empresaConvite) aviso(`Você foi vinculado automaticamente à empresa "${empresaConvite}".`);
        puxarConfigDaNuvem(!!empresaConvite).then((configurado) => {
          setTecnico(carregarTecnico());
          setEscritorio(carregarEscritorio());
          setSetupOk(souMaster() || configurado);
        }).catch(() => {});
        garantirEmpresaDoWorkspace().then(() => minhaEmpresa()).then(setEmpresaAtual).catch(() => {});
      }).catch(() => {});

      sincronizarProjetosLocalParaNuvem().then(() => {
        atualizarLista();
      }).catch(() => {});
      sincronizarCadastrosLocalParaNuvem().then(() => {
        cadProp.listar().then(setSugProp).catch(() => {});
        cadConf.listar().then(setSugConf).catch(() => {});
        cadCart.listar().then((cs) => { setSugCns(cs.map((c) => c.cns).filter(Boolean)); setSugCartorios(cs); }).catch(() => {});
      }).catch(() => {});
    } else if (!authCarregando) {
      limparConfigLocalNaSaida();
      setTecnico(carregarTecnico());
      setEscritorio(carregarEscritorio());
      setTemaCarregadoDaNuvem(true);
      setPerfil(null);
      setConfigAssinatura(null);
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

  // Aplica as cores da marca (empresa) na interface, SEMPRE ajustando o brilho pro tema atual, pra
  // cor nenhuma sumir (cor clara no tema claro, escura no escuro, preto/branco puros). Depende de
  // `tema` também: ao trocar claro/escuro, recalcula o brilho legível. Não toca em documentos/planta
  // — as peças exportadas não usam a cor da marca, então não há risco de branco em papel branco.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    const isDark = tema === 'escuro';
    const prim = escritorio?.corPrimaria ? corMarcaLegivel(escritorio.corPrimaria, isDark) : null;
    if (prim) {
      root.style.setProperty('--primary', prim.valor);
      root.style.setProperty('--ring', prim.valor);
      root.style.setProperty('--primary-foreground', prim.foreground);
    } else {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--primary-foreground');
    }
    const sec = escritorio?.corSecundaria ? corMarcaLegivel(escritorio.corSecundaria, isDark) : null;
    if (sec) {
      root.style.setProperty('--secondary', sec.valor);
      root.style.setProperty('--secondary-foreground', sec.foreground);
    } else {
      root.style.removeProperty('--secondary');
      root.style.removeProperty('--secondary-foreground');
    }
  }, [escritorio?.corPrimaria, escritorio?.corSecundaria, tema]);

  // restaura o rascunho UMA vez, quando a autenticação já resolveu (para usar a chave do usuário certo)
  useEffect(() => {
    if (rascunhoRestaurado.current || !temaCarregadoDaNuvem) return;
    rascunhoRestaurado.current = true;
    try {
      // Veio da tela "Projetos" (link ?projetoId=X, botão Abrir) — abre ESSE projeto específico em
      // vez do rascunho automático. Limpa o parâmetro depois, pra um F5 não tentar abrir de novo.
      const idDaUrl = new URLSearchParams(window.location.search).get('projetoId');
      if (idDaUrl) {
        abrir(idDaUrl).finally(() => {
          const url = new URL(window.location.href);
          url.searchParams.delete('projetoId');
          window.history.replaceState({}, '', url.toString());
        });
        return;
      }
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
  useEffect(() => {
    if (!asideDragging) return;
    const onMove = (e: MouseEvent) => {
      setToolW(Math.max(54, Math.min(480, e.clientX)));
    };
    const onUp = () => setAsideDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [asideDragging]);
  useEffect(() => {
    try {
      localStorage.setItem('metrica.tamNomes', String(tamNomes));
    } catch { /* ignore */ }
    if (!tamNomesMontadoRef.current) {
      tamNomesMontadoRef.current = true;
      return;
    }
    // Arredonda pra múltiplo de 10 na notificação — o passo real é de 1px (não bate exato em 10 em
    // 10%), mas mostrar sempre um número redondo (80%, 90%, 100%...) fica mais profissional que
    // um número quebrado tipo 109%.
    const pct = Math.round(Math.round((tamNomes / 11) * 100) / 10) * 10;
    mostrarNotificacaoTamanho(`Tamanho dos Rótulos: ${pct}% ${pct === 100 ? '(Padrão)' : ''}`);
  }, [tamNomes]);

  // tamanho do texto central da gleba (denominação/área/perímetro), independente do dos rótulos
  useEffect(() => {
    try {
      localStorage.setItem('metrica.tamCentro', String(tamCentro));
    } catch { /* ignore */ }
    if (!tamCentroMontadoRef.current) {
      tamCentroMontadoRef.current = true;
      return;
    }
    const pct = Math.round(Math.round((tamCentro / 12) * 100) / 10) * 10;
    mostrarNotificacaoTamanho(`Tamanho do Texto Central: ${pct}% ${pct === 100 ? '(Padrão)' : ''}`);
  }, [tamCentro]);

  // acessibilidade: escala das letras da interface (afeta o app inteiro; textos em rem crescem)
  useEffect(() => {
    document.documentElement.style.fontSize = `${(16 * escalaInterface).toFixed(1)}px`;
    try {
      const p = carregarPreferencias();
      if (p.escalaFonte !== escalaInterface) {
        salvarPreferencias({ ...p, escalaFonte: escalaInterface });
      }
    } catch { /* ignore */ }
    if (!escalaMontadaRef.current) {
      escalaMontadaRef.current = true;
      return;
    }
    // Passo real já é de 10% (0.1); arredonda por segurança contra imprecisão de ponto flutuante.
    const pct = Math.round(escalaInterface * 100 / 10) * 10;
    mostrarNotificacaoTamanho(`Tamanho da Interface: ${pct}% ${pct === 100 ? '(Padrão)' : ''}`);
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

  // Gera e atualiza automaticamente a planta de situação (recorte de satélite)
  useEffect(() => {
    if (vista !== 'planta' || processando) return;
    
    const gs = sincronizarGlebas();
    const temPoligono = gs.some((g) => g.vertices.length >= 3);
    if (!temPoligono) return;

    const stale = !situacaoUrl || situacaoVersSnapshot !== snapshotDesenho;
    if (!stale) return;

    // Debounce de 1.5s para evitar chamadas de rede repetidas durante edições rápidas
    const timer = setTimeout(() => {
      gerarSituacaoPlanta();
    }, 1500);
    return () => clearTimeout(timer);
  }, [vista, situacaoUrl, situacaoVersSnapshot, snapshotDesenho, processando, glebas, vertices]);

  // Atualiza automaticamente o nome do projeto se não foi modificado manualmente
  useEffect(() => {
    if (!nomeProjetoManual && imovel) {
      const auto = gerarTituloAutomatico(imovel);
      if (auto) {
        setNomeProjeto(auto);
      }
    }
  }, [imovel, nomeProjetoManual]);

  function executarAcao(acao: string) {
    switch (acao) {
      case 'tutorial':
        setTutorialAberto(true);
        break;
      case 'pontos':
        iniciarImportTxt();
        break;
      case 'sigef':
        setSigefMenuAberto(true);
        break;
      case 'dados':
        setPainelAberto(true);
        setAba('imovel');
        break;
      case 'confro':
        setVista('mapa');
        setModo((m) => (m === 'confrontante' ? 'navegar' : 'confrontante'));
        break;
      case 'divisas':
        setVista('mapa');
        setModo((m) => (m === 'divisa' ? 'navegar' : 'divisa'));
        break;
      case 'trt':
        setTrtAberto(true);
        break;
      case 'ods':
        setPlanilhaConfAberta(true);
        break;
      case 'conferir':
        setConferirAberto(true);
        break;
      case 'pecas':
        alternarMenuPecas();
        break;
      case 'cert':
        window.open("https://sso.acesso.gov.br/login?client_id=sigef.incra.gov.br&authorization_id=19f151443c3", "_blank", "noopener,noreferrer");
        break;
      case 'emitir_profissional':
        const urlEmitir = tecnico?.conselho === 'CREA' ? 'https://www.confea.org.br/' : 'https://sincet.haia.com.br/app/';
        window.open(urlEmitir, "_blank", "noopener,noreferrer");
        break;
      case 'car':
        setCarAberto(true);
        break;
      case 'altitude':
        setAltitudeModalAberta(true);
        break;
      case 'navegar':
        setModo('navegar');
        break;
      case 'linha':
        setVista('mapa');
        setModo('linha');
        setDesenhoBuffer([]);
        break;
      case 'polilinha':
        setVista('mapa');
        setModo('polilinha');
        setDesenhoBuffer([]);
        break;
      case 'tracejado':
        setVista('mapa');
        setModo('tracejado');
        setDesenhoBuffer([]);
        break;
      case 'texto':
        setModo('texto');
        break;
      case 'cota':
        setVista('mapa');
        setModo('cota');
        setDesenhoBuffer([]);
        break;
      case 'simbolo':
        setModo('simbolo');
        break;
      case 'retangulo':
        setVista('mapa');
        setModo('retangulo');
        setDesenhoBuffer([]);
        break;
      case 'circulo':
        setVista('mapa');
        setModo('circulo');
        setDesenhoBuffer([]);
        break;
      case 'arco':
        setVista('mapa');
        setModo('arco');
        setDesenhoBuffer([]);
        break;
      case 'selecao_varios':
        setModo('multi');
        break;
      case 'medir':
        setModo('medir');
        break;
      case 'paralela':
        setModo('paralela');
        break;
      case 'dividir':
        setModo('dividir');
        break;
      case 'aparar':
        setModo('trim');
        break;
      case 'prolongar':
        setModo('extend');
        break;
      case 'salvar':
        if (!processando) void salvar();
        break;
      case 'novo':
        criarNovoProjeto();
        break;
      case 'preco':
      case 'precificacao':
        setPrecoSugAberto(true);
        break;
      case 'pontos_banco':
        abrirGestaoPontos();
        break;
      case 'rotulos':
        setMostrarRotulos((m) => !m);
        break;
      case 'gestao':
        setGestaoAberta(true);
        break;
      case 'desfazer':
        desfazer();
        break;
      case 'refazer':
        refazer();
        break;
      case 'curvas_nivel':
        setCurvaConfigAberta((v) => !v);
        break;
      case 'folha_travada':
      case 'trava_folha':
        setFolhaTravada((f) => {
          const n = !f;
          if (!n) setModo('navegar');
          return n;
        });
        break;
      default:
        break;
    }
  }

  function executarComando(cmdText: string) {
    const cmd = cmdText.trim().toLowerCase();
    setComandoInput('');
    if (comandoInputRef.current) {
      comandoInputRef.current.blur();
    }
    if (!cmd) return;

    // Dicionário estendido com aliases de 2 letras baseados nas consoantes e comuns do CAD
    const aliasesExtra: Record<string, string> = {
      // Desenho e Geometria
      lh: 'linha',
      ln: 'linha',
      pl: 'polilinha',
      tr: 'tracejado',
      tx: 'texto',
      tt: 'texto',
      ct: 'cota',
      co: 'cota',
      sm: 'simbolo',
      sb: 'simbolo',
      rt: 'retangulo',
      cc: 'circulo',
      cr: 'circulo',
      rc: 'arco',
      ac: 'arco',
      sl: 'selecao_varios', // sl = selecionar vários
      md: 'medir',
      me: 'medir',
      pr: 'paralela',
      dv: 'dividir',
      tm: 'aparar',
      ap: 'aparar',
      ex: 'prolongar',
      pg: 'prolongar',

      // Barra Lateral Esquerda e Outros Comandos
      gt: 'gestao',
      nv: 'novo',
      sv: 'salvar', // sv = salvar
      pc: 'precificacao',
      pt: 'pontos_banco',
      bp: 'pontos_banco',
      rl: 'rotulos',
      ro: 'rotulos',
      ft: 'folha_travada',
      tv: 'folha_travada',
      tf: 'folha_travada',
      dz: 'desfazer',
      ry: 'refazer',
      cn: 'curvas_nivel',
      al: 'altitude',
      sg: 'cert',
      em: 'emitir_profissional',
    };

    const acao = aliasesExtra[cmd] || prefs.atalhosComando?.[cmd] || ATALHOS_COMANDO_PADRAO[cmd];
    if (!acao) {
      dispararFeedbackAtalho(`"${cmdText}" não reconhecido`, 'erro');
      return;
    }
    executarAcao(acao);
    // Feedback visual: mostra o nome da ação ativada no centro da tela
    const nomes: Record<string, string> = {
      linha: 'Linha', polilinha: 'Polilinha', tracejado: 'Tracejado', texto: 'Texto',
      cota: 'Cota', simbolo: 'Símbolo', retangulo: 'Retângulo', circulo: 'Círculo',
      arco: 'Arco', selecao_varios: 'Selecionar', medir: 'Medir', paralela: 'Paralela',
      dividir: 'Dividir', aparar: 'Aparar', prolongar: 'Prolongar', navegar: 'Navegar',
      gestao: 'Gestão', novo: 'Novo Projeto', salvar: 'Salvar', precificacao: 'Precificação',
      pontos_banco: 'Banco de Pontos', desfazer: 'Desfazer', refazer: 'Refazer',
      rotulos: 'Rótulos', folha_travada: 'Travar Folha', curvas_nivel: 'Curvas de Nível',
      tutorial: 'Tutorial', pontos: 'Pontos', sigef: 'SIGEF', dados: 'Dados', confro: 'CONFRO',
      divisas: 'Divisas', trt: 'ART/TRT', ods: 'ODS', conferir: 'Conferir', pecas: 'Peças',
      cert: 'CERT', car: 'CAR',
    };
    dispararFeedbackAtalho(nomes[acao] || acao, 'ok');
  }

  // Exibe o overlay de feedback de atalho no centro da tela por ~1.2s
  function dispararFeedbackAtalho(texto: string, tipo: 'ok' | 'erro') {
    if (feedbackAtalhoTimerRef.current) clearTimeout(feedbackAtalhoTimerRef.current);
    setFeedbackAtalho({ texto, tipo });
    feedbackAtalhoTimerRef.current = setTimeout(() => setFeedbackAtalho(null), tipo === 'ok' ? 1200 : 900);
  }

  // atalhos remapeados em ordem crescente
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Se qualquer modal/diálogo estiver aberto (ex.: banco de pontos, ajustes, etc.), ignora os atalhos.
      if (typeof document !== 'undefined' && document.querySelector('[role="dialog"], [role="alertdialog"], .radix-portal')) {
        return;
      }
      // Ctrl+S / Cmd+S: salva o projeto e impede o "salvar página" do navegador. Vale até com o
      // foco num campo de texto — por isso vem ANTES do filtro de campos abaixo.
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!processando) void salvar();
        return;
      }
      const t = e.target as HTMLElement | null;
      const isInput = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      
      // Se não estiver focado em nenhum input e digitar caractere comum
      if (!isInput && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (comandoInputRef.current) {
          e.preventDefault();
          comandoInputRef.current.focus();
          setComandoInput((prev) => prev + e.key);
          return;
        }
      }

      if (isInput) return;
      const k = e.key;

      if (k.match(/^F(1[0-2]|[1-9])$/)) {
        const acao = prefs.atalhosF?.[k] ?? ATALHOS_F_PADRAO[k];
        if (acao && acao !== 'nenhum') {
          e.preventDefault();
          executarAcao(acao);
          return;
        }
      }
      else if ((e.ctrlKey || e.metaKey) && e.altKey && (k === '+' || k === '=')) {
        e.preventDefault();
        setEscalaInterface((prev) => Math.min(1.25, Number((prev + 0.05).toFixed(2))));
      }
      else if ((e.ctrlKey || e.metaKey) && e.altKey && k === '-') {
        e.preventDefault();
        setEscalaInterface((prev) => Math.max(0.9, Number((prev - 0.05).toFixed(2))));
      }
      else if ((e.ctrlKey || e.metaKey) && e.altKey && k.toLowerCase() === '0') {
        e.preventDefault();
        setEscalaInterface(1);
      }
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
      else if ((k === 'Enter' || k === ' ') && modo === 'navegar') {
        if (refUltimaFerramenta.current !== 'navegar') {
          e.preventDefault();
          setModo(refUltimaFerramenta.current);
          if (['linha', 'polilinha', 'tracejado', 'cota', 'retangulo', 'arco'].includes(refUltimaFerramenta.current)) {
            setDesenhoBuffer([]);
          }
        }
      }
      else if (k === 'Enter') {
        if ((modo === 'polilinha' || modo === 'tracejado') && desenhoBuffer.length >= 2) {
          e.preventDefault();
          snap();
          const buf = desenhoBuffer;
          setDesenhoBuffer([]);
          setObjetos((os) => [...os, novaPolilinha(buf, modo === 'tracejado' ? { tracejado: true } : {})]);
          aviso(modo === 'tracejado' ? 'Tracejado adicionado.' : 'Polilinha adicionada.');
        }
      }
      else if (k === 'Escape') {
        // menu de contexto aberto: Esc só fecha o menu (não troca de tela)
        if (menuContexto) { e.preventDefault(); setMenuContexto(null); }
        else if (modo === 'multi' && (selMulti.size > 0 || objSelMulti.size > 0)) { e.preventDefault(); limparSelMulti(); }
        else if (modo === 'linha' || modo === 'polilinha' || modo === 'tracejado' || modo === 'cota' || modo === 'texto' || modo === 'medir' || modo === 'retangulo' || modo === 'arco') {
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
  }, [modo, desenhoBuffer, selMulti, objSelMulti, vertices, confrontantePorLado, desfazer, refazer, menuContexto, salvar, processando, prefs]);

  // ao sair do modo "triângulo", esvazia a seleção múltipla
  useEffect(() => { if (modo !== 'multi') setSelMulti((s) => (s.size ? new Set() : s)); }, [modo]);
  // ao sair do modo "medir", sempre limpa o buffer — medições nunca devem gerar linhas persistentes
  const modoAnteriorRef = useRef<string>(modo);
  useEffect(() => {
    if (modoAnteriorRef.current === 'medir' && modo !== 'medir') {
      setDesenhoBuffer([]);
    }
    modoAnteriorRef.current = modo;
  }, [modo]);

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





  useEffect(() => {
    if (sigefMenuAberto) {
      colegasCad.listar().then(setListaColegas).catch(() => {});
    }
  }, [sigefMenuAberto]);

  function aviso(t: string) {
    setMsg(t);
    if (aviseTimerRef.current) clearTimeout(aviseTimerRef.current);
    aviseTimerRef.current = setTimeout(() => setMsg(''), 4000);
  }

  // ---------- desfazer / refazer (histórico de vértices + confrontantes + DESENHOS) ----------
  // Os desenhos (cota/linha/texto/símbolo) e cadastros de confrontantes entram no histórico.
  type FotoHist = { v: Vertex[]; conf: Confrontante[]; cpl: Record<number, string>; obj: ObjetoDesenho[]; ig: Vertex[]; pc: PlantaConfig; desc?: string };
  const histRef = useRef<FotoHist[]>([]);
  const redoRef = useRef<FotoHist[]>([]);
  const [histCount, setHistCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);

  function obterDescricaoDiferenca(s1: FotoHist, s2: FotoHist): string {
    if (!s1 || !s2) return 'Ação no projeto';
    
    // 1. Diferença de vértices
    if (s1.v.length !== s2.v.length) {
      const diff = Math.abs(s1.v.length - s2.v.length);
      return s1.v.length > s2.v.length ? `${diff} vértice(s) removido(s)` : `${diff} vértice(s) adicionado(s)`;
    }
    
    // 2. Movimentação de vértices
    let coordsMudaram = false;
    for (let i = 0; i < Math.min(s1.v.length, s2.v.length); i++) {
      if (s1.v[i].lat !== s2.v[i].lat || s1.v[i].lon !== s2.v[i].lon) {
        coordsMudaram = true;
        break;
      }
    }
    if (coordsMudaram) return 'Movimentação de vértice';

    // 3. Modificação de altitudes de vértices
    let altMudou = false;
    for (let i = 0; i < Math.min(s1.v.length, s2.v.length); i++) {
      if (s1.v[i].elevacao !== s2.v[i].elevacao) {
        altMudou = true;
        break;
      }
    }
    if (altMudou) return 'Altitude de vértice alterada';

    // 4. Diferença de objetos de desenho (linhas, cotas, textos, etc)
    if (s1.obj.length !== s2.obj.length) {
      const diff = Math.abs(s1.obj.length - s2.obj.length);
      const maior = s1.obj.length > s2.obj.length ? s1.obj : s2.obj;
      const menor = s1.obj.length > s2.obj.length ? s2.obj : s1.obj;
      const diferente = maior.find(o => !menor.some(m => m.id === o.id));
      const tipoLabel = diferente 
        ? (diferente.tipo === 'polilinha' ? (diferente.tracejado ? 'Linha tracejada' : 'Polilinha')
          : diferente.tipo === 'cota' ? 'Cota'
          : diferente.tipo === 'texto' ? 'Texto'
          : diferente.tipo === 'simbolo' ? 'Símbolo'
          : diferente.tipo === 'retangulo' ? 'Retângulo'
          : diferente.tipo === 'arco' ? 'Arco'
          : diferente.tipo)
        : 'Desenho';

      return s1.obj.length > s2.obj.length ? `${tipoLabel} removido` : `${tipoLabel} adicionado`;
    }

    // 5. Modificações em propriedades de objetos existentes
    if (JSON.stringify(s1.obj) !== JSON.stringify(s2.obj)) {
      return 'Propriedades do desenho alteradas';
    }

    // 6. Confrontantes ou divisas
    if (JSON.stringify(s1.conf) !== JSON.stringify(s2.conf) || JSON.stringify(s1.cpl) !== JSON.stringify(s2.cpl)) {
      return 'Confrontantes / Divisas alteradas';
    }

    // 7. Configuração da prancha
    if (JSON.stringify(s1.pc) !== JSON.stringify(s2.pc)) {
      return 'Layout da prancha alterado';
    }

    // 8. Vértices ignorados
    if (s1.ig.length !== s2.ig.length) {
      return 'Vértices desconsiderados alterados';
    }

    return 'Alterações';
  }

  function snap(desc?: string) {
    const ult = histRef.current[histRef.current.length - 1];
    if (ult && ult.v === vertices && ult.conf === confrontantes && ult.cpl === confrontantePorLado && ult.obj === objetos && ult.ig === verticesIgnorados && ult.pc === plantaConfig) return;
    histRef.current.push({ v: vertices, conf: confrontantes, cpl: confrontantePorLado, obj: objetos, ig: verticesIgnorados, pc: plantaConfig, desc });
    if (histRef.current.length > 60) histRef.current.shift();
    redoRef.current = [];
    setHistCount(histRef.current.length);
    setRedoCount(0);
  }

  function aplicarFoto(s: FotoHist) {
    setVertices(s.v);
    if (s.conf) setConfrontantes(s.conf);
    setConfrontantePorLado(s.cpl);
    setObjetos(s.obj);
    setVerticesIgnorados(s.ig);
    setPlantaConfig(s.pc);
  }

  function desfazer() {
    const s = histRef.current.pop();
    if (!s) { aviso('Nada para desfazer.'); return; }
    
    const estadoAtual: FotoHist = { v: vertices, conf: confrontantes, cpl: confrontantePorLado, obj: objetos, ig: verticesIgnorados, pc: plantaConfig };
    const acaoDesc = s.desc || obterDescricaoDiferenca(estadoAtual, s);
    
    redoRef.current.push({ ...estadoAtual, desc: acaoDesc });
    aplicarFoto(s);
    setHistCount(histRef.current.length);
    setRedoCount(redoRef.current.length);
    aviso(`Desfeito: ${acaoDesc}`);
  }

  function refazer() {
    const s = redoRef.current.pop();
    if (!s) { aviso('Nada para refazer.'); return; }
    
    const estadoAtual: FotoHist = { v: vertices, conf: confrontantes, cpl: confrontantePorLado, obj: objetos, ig: verticesIgnorados, pc: plantaConfig };
    const acaoDesc = s.desc || obterDescricaoDiferenca(estadoAtual, s);
    
    histRef.current.push({ ...estadoAtual, desc: acaoDesc });
    aplicarFoto(s);
    setHistCount(histRef.current.length);
    setRedoCount(redoRef.current.length);
    aviso(`Refeito: ${acaoDesc}`);
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
    if (!(e.target instanceof Node) || !e.currentTarget.contains(e.target)) return;
    e.preventDefault();
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
    // Mede num quadro seguinte: se a Planta acabou de abrir (ou um painel fechou), a área de
    // visualização ainda pode estar com o tamanho antigo. Esperar o layout assentar evita enquadrar
    // pela medida errada — que dava a impressão de o Foco não fazer nada.
    requestAnimationFrame(() => {
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
    });
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

  // ---- wrapper para setPlantaConfig que carrega templates automaticamente por título ----
  function atualizarPlantaConfig(patchOuFuncao: PlantaConfig | ((prev: PlantaConfig) => PlantaConfig)) {
    setPlantaConfig((atual) => {
      const proximo = typeof patchOuFuncao === 'function' ? patchOuFuncao(atual) : patchOuFuncao;
      const titNovo = (proximo.textos?.['carimbo.titulo']?.texto ?? proximo.titulo ?? '').trim();
      const titAntigo = (atual.textos?.['carimbo.titulo']?.texto ?? atual.titulo ?? '').trim();
      
      if (titNovo !== titAntigo && titNovo.length > 0) {
        const templates = carregarPlantaTemplates();
        const template = templates[titNovo];
        if (template) {
          aviso(`Modelo de planta "${titNovo}" aplicado.`);
          return {
            ...proximo,
            ...template,
            titulo: proximo.titulo || template.titulo || titNovo,
            textos: {
              ...(proximo.textos ?? {}),
              ...(template.textos ?? {}),
              'carimbo.titulo': { ...(proximo.textos?.['carimbo.titulo'] ?? {}), texto: proximo.titulo || template.titulo || titNovo }
            },
            situacaoDataUrl: proximo.situacaoDataUrl || atual.situacaoDataUrl,
            print3dDataUrl: proximo.print3dDataUrl || atual.print3dDataUrl,
            offsetX: proximo.offsetX !== undefined ? proximo.offsetX : atual.offsetX,
            offsetY: proximo.offsetY !== undefined ? proximo.offsetY : atual.offsetY,
            centroInfoPos: proximo.centroInfoPos || atual.centroInfoPos,
          };
        }
      }
      return proximo;
    });
  }

  // ---- edição de textos da planta (conteúdo/escala/negrito por id) ----
  function patchTextoPlanta(id: string, patch: { texto?: string; escala?: number; negrito?: boolean; dx?: number; dy?: number; larguraChars?: number }) {
    snap();
    atualizarPlantaConfig((c) => ({ ...c, textos: { ...(c.textos ?? {}), [id]: { ...(c.textos?.[id] ?? {}), ...patch } } }));
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
    snap();
    setPlantaConfig((c) => { const m = { ...(c.textos ?? {}) }; delete m[id]; return { ...c, textos: m }; });
  }
  // Botão direito na rosa dos ventos / barra de escala / diagrama: cicla o estilo e já grava como
  // PADRÃO dos próximos projetos do usuário (planta padrão).
  function ciclarEstiloPlanta(campo: 'estiloRosa' | 'estiloEscala' | 'estiloDiagrama', total: number) {
    snap();
    const prox = (((plantaConfig[campo] as number | undefined) ?? 0) + 1) % total;
    setPlantaConfig((c) => ({ ...c, [campo]: prox }));
    try { salvarPlantaPadrao({ ...carregarPlantaPadrao(), [campo]: prox }); } catch { /* ignore */ }
    aviso('Estilo trocado e salvo como padrão dos próximos projetos.');
  }
  const escTextoAtual = (id: string) => plantaConfig.textos?.[id]?.escala ?? 1;

  // redimensionar o painel da direita

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

  // Recebe o array de vértices já com a precisão corrigida (vem do PlanilhaConferenciaModal
  // após o usuário confirmar o preview) e propaga essa mudança pra gleba ativa + estado de
  // trabalho. Tira foto do estado anterior pro usuário poder desfazer; marca o projeto como
  // dirty pra o auto-save subir a versão corrigida.
  function aplicarCorrecoesPrecisaoLocal(verticesCorrigidos: Vertex[]) {
    snap();
    setVertices(verticesCorrigidos);
    setGlebas((gs) => gs.map((g) => (g.id === glebaAtivaId ? { ...g, vertices: verticesCorrigidos } : g)));
    setSalvarLaranja(true);
  }
  function carregarGleba(g: Gleba) {
    // o histórico NÃO atravessa glebas: um desfazer depois da troca restauraria os vértices da
    // OUTRA gleba dentro desta (corrupção silenciosa) — melhor recomeçar o histórico
    histRef.current = []; redoRef.current = [];
    const vsOrdenados = g.vertices.length >= 3 ? iniciarDoNorteHorario(g.vertices) : g.vertices;
    const cplReindexado: Record<number, string> = {};
    if (g.confrontantePorLado) {
      vsOrdenados.forEach((v, novoIdx) => {
        const origIdx = g.vertices.findIndex((x) => x.id === v.id);
        if (origIdx >= 0) {
          const cid = g.confrontantePorLado[origIdx];
          if (cid) cplReindexado[novoIdx] = cid;
        }
      });
    }
    setVertices(vsOrdenados);
    setConfrontantes(g.confrontantes);
    setConfrontantePorLado(cplReindexado);
    setObjetos(g.objetos ?? []);
    setDesenhoBuffer([]);
    setObjetoSelId(null);
    // NÃO zera os vértices ignorados: eles são do PROJETO (pontos soltos), não da gleba —
    // zerar aqui fazia os pontos sumirem ao trocar de gleba ou criar uma nova (bug 05/07/2026)
    setGlebaAtivaId(g.id);
    setSelecionadoId(null);
    if (vsOrdenados[0]?.id) {
      setPlantaConfig((prev) => ({ ...prev, verticeReferenciaId: vsOrdenados[0].id }));
    }
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
    if (sincronizarGlebas().length > 1 && !(await confirmarApagar('Deseja realmente apagar esta gleba?'))) return;
    const gs = sincronizarGlebas().filter((g) => g.id !== id);
    if (gs.length === 0) { aviso('O imóvel precisa de ao menos uma gleba.'); return; }
    setGlebas(gs);
    if (id === glebaAtivaId) carregarGleba(gs[0]);
  }
  function renomearGlebaAtiva(denominacao: string) {
    setGlebas(sincronizarGlebas().map((g) => (g.id === glebaAtivaId ? { ...g, denominacao } : g)));
  }
  const glebaAtivaNome = glebas.find((g) => g.id === glebaAtivaId)?.denominacao ?? 'Parcela 1';

  function parseKml(xmlText: string): { lat: number; lon: number; alt: number }[] {
    const points: { lat: number; lon: number; alt: number }[] = [];
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      const coordsNodes = xmlDoc.getElementsByTagName("coordinates");
      
      for (let i = 0; i < coordsNodes.length; i++) {
        const text = coordsNodes[i].textContent || "";
        const lines = text.trim().split(/[\s\r\n]+/);
        for (const line of lines) {
          if (!line.trim()) continue;
          const parts = line.split(",");
          if (parts.length >= 2) {
            const lon = parseFloat(parts[0]);
            const lat = parseFloat(parts[1]);
            const alt = parts[2] ? parseFloat(parts[2]) : 0;
            if (Number.isFinite(lat) && Number.isFinite(lon)) {
              points.push({ lat, lon, alt });
            }
          }
        }
      }
    } catch (err) {
      console.error("Erro ao processar XML KML:", err);
    }
    return points;
  }

  async function importarArquivo(file: File) {
    if (processando) return;
    // Valida o tamanho ANTES de qualquer trabalho pesado: ler o arquivo, fazer parse, mexer no
    // estado. Um DXF de 500MB iria travar a aba por minutos; melhor cortar logo.
    const v = validarTamanhoArquivo(file);
    if (!v.ok) { aviso(v.erro); return; }
    setImportPendingFile(file);

    if (file.name.toLowerCase().endsWith('.txt') || file.name.toLowerCase().endsWith('.csv')) {
      try {
        const buf = await file.arrayBuffer();
        const texto = new TextDecoder('windows-1252').decode(buf);
        const pontos = parseTxt(texto, carregarImportTxt());
        
        const validos = pontos.filter((p) => Number.isFinite(p.norte) && Number.isFinite(p.leste) && p.norte !== 0 && p.leste !== 0);
        const ehValido = pontos.length >= 3 && (validos.length / pontos.length) >= 0.5;

        if (!ehValido) {
          setImportTxtConfigAberto(true);
          await avisar({
            titulo: 'Configuração do arquivo necessária',
            mensagem: 'O formato deste arquivo TXT/CSV não condiz com a configuração de importação atual. A tela de configurações foi aberta e detectou os campos automaticamente. Por favor, confira os papéis das colunas e clique em Salvar para concluir a importação.'
          });
          return;
        }
      } catch (err) {
        console.error('Erro ao pré-validar TXT:', err);
      }
    }

    setImportModalAberto(true);
  }

  async function processarImportacao(data: { numGlebas: number; municipio: string; fuso: number }) {
    if (!importPendingFile || processando) return;
    const { numGlebas, municipio, fuso } = data;
    setProcessando(true);
    try {
      const buf = await importPendingFile.arrayBuffer();
      // Formato heterogêneo: GML/KML só populam leste/norte + alguns metadados opcionais; o ramo TXT
      // usa RawPoint completo (que também satisfaz este tipo, já que só exige leste/norte).
      let perim: { leste: number; norte: number; altitude?: number; id?: string; nome?: string; tipo?: 'M' | 'P' | 'V'; metodo?: string; limite?: string; sigmaH?: number; sigmaV?: number; codigoSigef?: string }[] = [];
      let z = fuso;
      let vs: Vertex[] = [];
      let isGmlImport = false;
      let propsGml: ReturnType<typeof parsePropriedadeSigefGml> = {};

      const tec = tecnico ?? carregarTecnico();
      const nameLower = importPendingFile.name.toLowerCase();

      if (nameLower.endsWith('.gml') || nameLower.endsWith('.xml')) {
        const xmlText = new TextDecoder('utf-8').decode(buf);
        const ptsGml = parseVerticesSigefGml(xmlText);
        propsGml = parsePropriedadeSigefGml(xmlText);
        const totalNosGml = (ptsGml as unknown as { totalNos?: number }).totalNos ?? ptsGml.length;
        if (totalNosGml > ptsGml.length) {
          aviso(`Atenção: ${totalNosGml - ptsGml.length} de ${totalNosGml} vértice(s) do arquivo não puderam ser lidos (formato de coordenada não reconhecido) e ficaram de fora do polígono importado.`);
        }

        if (ptsGml.length >= 3) {
          isGmlImport = true;
          if (!z) {
            z = Math.floor((ptsGml[0].lon + 180) / 6) + 1;
          }
          const perimGml = ptsGml.map((p) => {
            const utm = geoParaUtm(p.lat, p.lon, z, hemisferio);
            return {
              leste: utm.leste,
              norte: utm.norte,
              altitude: p.altitude,
              id: p.id,
              nome: p.nome,
              tipo: p.tipo,
              metodo: p.metodo,
              limite: p.limite,
              sigmaH: p.sigmaH,
              sigmaV: p.sigmaV,
              codigoSigef: p.codigoSigef,
              origLat: p.lat,
              origLon: p.lon,
            };
          });
          perim = perimGml;

          vs = perimGml.map((p, idx) => {
            // Usa lat/lon ORIGINAIS do GML — converter de volta via UTM perde precisão e gera
            // diferença de milésimos de segundo nas coordenadas da planilha SIGEF.
            return {
              id: `v_${Date.now().toString(36)}_${idx}`,
              ordem: idx,
              nome: p.nome,
              codigoCampo: p.nome,
              norte: p.norte,
              leste: p.leste,
              elevacao: p.altitude,
              lat: p.origLat,
              lon: p.origLon,
              tipo: p.tipo,
              metodo: p.metodo || tec.metodoPosicionamento || 'PG1',
              tipoLimite: p.limite || tec.tipoLimite || 'ideal',
              representacao: 'linha-ideal',
              codigoSigef: p.codigoSigef || p.nome,
              isDivisa: p.tipo === 'M',
              ...(p.sigmaH != null ? { sigmaX: p.sigmaH, sigmaY: p.sigmaH } : {}),
              ...(p.sigmaV != null ? { sigmaZ: p.sigmaV } : {})
            };
          });
          
          vs = iniciarDoNorteHorario(vs).map((v, idx) => ({ ...v, ordem: idx }));
        } else {
          // Fallback para GML/XML sem vértices estruturados detalhados (ex.: apenas anel de coordenadas)
          const parcelas = parseParcelasSigef(xmlText).length ? parseParcelasSigef(xmlText) : parseGmlParcelas(xmlText);
          if (parcelas.length > 0 && parcelas[0].anel.length >= 3) {
            const geoPoints = parcelas[0].anel;
            if (!z) {
              z = Math.floor((geoPoints[0].lon + 180) / 6) + 1;
            }
            perim = geoPoints.map((gp, idx) => {
              const utm = geoParaUtm(gp.lat, gp.lon, z, hemisferio);
              return {
                leste: utm.leste,
                norte: utm.norte,
                altitude: 0,
                id: `P${idx + 1}`,
                nome: `P${idx + 1}`
              };
            });
          } else {
            aviso('Nenhum vértice ou polígono válido encontrado no arquivo GML/XML.');
            setProcessando(false);
            return;
          }
        }
      } else if (nameLower.endsWith('.kml')) {
        const xmlText = new TextDecoder('utf-8').decode(buf);
        const geoPoints = parseKml(xmlText);
        if (geoPoints.length < 3) {
          aviso('O arquivo KML não tem pontos suficientes.');
          setProcessando(false);
          return;
        }
        if (geoPoints.length > 2) {
          const pFirst = geoPoints[0];
          const pLast = geoPoints[geoPoints.length - 1];
          if (pFirst.lat === pLast.lat && pFirst.lon === pLast.lon) {
            geoPoints.pop();
          }
        }
        
        if (!z) {
          const firstPt = geoPoints[0];
          z = Math.floor((firstPt.lon + 180) / 6) + 1;
        }

        perim = geoPoints.map((gp, idx) => {
          const utm = geoParaUtm(gp.lat, gp.lon, z, hemisferio);
          return {
            leste: utm.leste,
            norte: utm.norte,
            altitude: gp.alt,
            id: `P${idx + 1}`,
            nome: `P${idx + 1}`
          };
        });
      } else {
        const texto = new TextDecoder('windows-1252').decode(buf);
        const pontos = parseTxt(texto, carregarImportTxt());
        perim = pontosDePerimetro(pontos);
        if (perim.length < 3) {
          aviso('O arquivo não tem pontos de perímetro suficientes.');
          setProcessando(false);
          return;
        }

        const fusos = tec.fusosPermitidos ?? [18, 19, 20, 21, 22, 23, 24, 25];
        z = detectarFusoPorRegiao(perim[0].leste, perim[0].norte, hemisferio, fusos).zona;
        const anc = ancoraMunicipio(municipio);
        if (anc) z = escolherZonaPorAncora(perim[0].leste, perim[0].norte, hemisferio, anc, fusos);
      }

      // Define o município e metadados no imóvel
      const novoImovel = {
        ...imovel,
        municipio: propsGml.municipio || municipio,
        local: propsGml.municipio || municipio,
        denominacao: propsGml.denominacao || imovel.denominacao || importPendingFile.name.replace(/\.[^.]+$/, ''),
        proprietario: propsGml.detentor || imovel.proprietario,
        codigoImovelIncra: propsGml.codigoImovel || imovel.codigoImovelIncra,
        matricula: propsGml.matricula || imovel.matricula,
        areaSigefHa: undefined,
        perimetroSigef: undefined,
      };

      let contM = 1, contP = 1;
      if (!isGmlImport) {
        const cont = await lerContadores(tec.credenciamentoIncra, tec).catch(() => semente(tec.credenciamentoIncra, tec));
        contM = cont.M;
        contP = cont.P;
        const vs0 = montarVertices(perim as unknown as RawPoint[], z, hemisferio, { credenciamentoIncra: tec.credenciamentoIncra, contadorMarco: cont.M, contadorPonto: cont.P });
        vs = recodificar(iniciarDoNorteHorario(vs0), tec.credenciamentoIncra, cont.M, cont.P);
      }

      // defesa: não importar coordenadas que viraram inválidas (NaN/fora de faixa) — protege a peça
      if (vs.some((v) => !Number.isFinite(v.lat) || !Number.isFinite(v.lon) || Math.abs(v.lat) > 90 || Math.abs(v.lon) > 180)) {
        aviso('Coordenadas inválidas após a conversão — confira o fuso/hemisfério e o arquivo.');
        setProcessando(false);
        return;
      }

      setPreviewData({
        perim,
        vs,
        numGlebas,
        municipio,
        fuso,
        z,
        novoImovel,
        contM,
        contP,
        prefixo: tec.credenciamentoIncra,
        isGmlImport
      });

    } catch (e) {
      aviso('Erro na importação: ' + (e as Error).message);
    } finally {
      setProcessando(false);
    }
  }

  // Procura, entre os projetos JÁ SALVOS do usuário, algum cujo polígono coincida (quase) com o
  // polígono recém-importado — sinal de que esse mesmo imóvel já foi cadastrado antes. Usa a mesma
  // técnica de área por amostragem em grade do relatório de sobreposição (confrontacaoCheck), em vez
  // de comparar vértice a vértice, pelo mesmo motivo: dois levantamentos do mesmo imóvel raramente
  // têm as coordenadas idênticas. Exige alta sobreposição nos DOIS sentidos (não só um imóvel grande
  // "engolindo" um pedaço pequeno de outro) pra evitar alarme falso.
  async function encontrarProjetoParecido(vsNovo: Vertex[], projetoAtualId: string | null): Promise<{ projeto: Projeto; gleba: Gleba } | null> {
    if (vsNovo.length < 3) return null;
    const areaNovo = areaPoligonoEN(vsNovo);
    if (areaNovo <= 0) return null;
    const LIMIAR_PCT = 80;
    let todos: Projeto[] = [];
    try { todos = await listarProjetos(); } catch { return null; }
    for (const p of todos) {
      if (projetoAtualId && p.id === projetoAtualId) continue;
      for (const g of p.glebas ?? []) {
        const vsExistente = (g.vertices ?? []).filter((v) => Number.isFinite(v.leste) && Number.isFinite(v.norte));
        if (vsExistente.length < 3) continue;
        const areaExistente = areaPoligonoEN(vsExistente);
        if (areaExistente <= 0) continue;
        const sobreposta = areaSobreposicaoEstimada(vsNovo, vsExistente);
        const pctDoNovo = (sobreposta / areaNovo) * 100;
        const pctDoExistente = (sobreposta / areaExistente) * 100;
        if (pctDoNovo >= LIMIAR_PCT && pctDoExistente >= LIMIAR_PCT) {
          return { projeto: p, gleba: g };
        }
      }
    }
    return null;
  }

  async function concluirImportacao(gerarPoligono: boolean, zonaEscolhida: number | undefined, selecao?: ImportSelecao) {
    if (!previewData) return;
    const { vs: vs0, numGlebas, municipio, z: z0, novoImovel, contM, contP, prefixo } = previewData;

    let destino: 'atual' | 'novo' = 'novo';
    if (importacaoModoMesclar) {
      destino = 'atual';
    } else if (vertices.length > 0 || projetoId !== null) {
      const escolha = await escolher({
        titulo: 'Destino da Importação',
        mensagem: 'Deseja importar estes pontos para o projeto atual (preservando dados de cadastro e substituindo a geometria) ou criar um Novo Projeto do zero?',
        opcoes: [
          { chave: 'atual', label: 'Importar no projeto atual', variant: 'default' },
          { chave: 'novo', label: 'Criar novo projeto', variant: 'outline' }
        ],
        cancelLabel: 'Cancelar'
      });
      if (!escolha) return;
      destino = escolha as 'atual' | 'novo';
    }

    // se o usuário corrigiu o fuso na prévia, reprojeta os vértices (E/N iguais, lat/lon novos)
    const z = (zonaEscolhida && zonaEscolhida !== z0) ? zonaEscolhida : z0;
    const vsRepro: Vertex[] = z !== z0 ? reprojetar(vs0, z, hemisferio) : vs0;

    // aplica a seleção da prévia: ordem (arrastar), importar (traz?), noPoligono (perímetro passa?)
    // e nomes (editados já na prévia — sobrescreve o nome bruto do arquivo antes de recodificar)
    const ordem = selecao?.ordem ?? vsRepro.map((_, i) => i);
    const importar = selecao?.importar ?? vsRepro.map(() => true);
    const noPoligono = selecao?.noPoligono ?? vsRepro.map(() => true);
    const nomes = selecao?.nomes;
    const importados = ordem.filter((i) => importar[i]).map((i) => {
      // grava nos dois campos: "nome" (referência interna) e "codigoCampo" (o que a lista de
      // vértices mostra como legenda embaixo do código SIGEF oficial — senão o nome editado na
      // prévia nunca aparece em lugar nenhum depois de importado).
      const nomeEditado = nomes?.[i]?.trim();
      const v = nomeEditado ? { ...vsRepro[i], nome: nomeEditado, codigoCampo: nomeEditado } : vsRepro[i];
      return { v, poligono: noPoligono[i] !== false };
    });
    // "Só vértices" (gerarPoligono=false): NENHUM ponto forma o perímetro — todos entram como
    // pontos soltos (verticesIgnorados) e o anel fica vazio, então nenhum polígono é desenhado.
    // "Gerar polígono": anel = importados marcados "no polígono"; ignorados = os fora do polígono.
    const anel = gerarPoligono ? importados.filter((p) => p.poligono).map((p) => p.v) : [];
    const ignorados = gerarPoligono ? importados.filter((p) => !p.poligono).map((p) => p.v) : importados.map((p) => p.v);
    // renumera o anel na ordem final (M/P sequenciais a partir do contador do banco)
    let vs = previewData.isGmlImport ? anel : recodificar(anel, prefixo || 'VER', contM, contP);
    let finalIgnorados = ignorados;

    if (gerarPoligono && vs.length >= 3) {
      const achado = await encontrarProjetoParecido(vs, projetoId);
      if (achado) {
        const escolha = await escolher({
          titulo: 'Este imóvel já parece estar cadastrado',
          mensagem: `Já existe um projeto chamado "${achado.projeto.nome}" com vértices praticamente iguais aos deste arquivo.`,
          opcoes: [
            { chave: 'abrir', label: 'Abrir o projeto existente', variant: 'default' },
            { chave: 'continuar', label: 'Continuar com esta importação mesmo assim', variant: 'outline' },
          ],
          cancelLabel: 'Cancelar',
        });
        if (!escolha) return; // cancelou: mantém a prévia aberta, não aplica nada
        if (escolha === 'abrir') {
          setPreviewData(null);
          setImportPendingFile(null);
          await abrir(achado.projeto.id);
          return;
        }
        // 'continuar': segue o fluxo normal de importação abaixo
      }
    }

    // Identifica e estima altitudes ausentes/zeradas por interpolação (IDW/baricêntrica)
    const semAlt = [...vs, ...finalIgnorados].filter((v) => !v.elevacao || v.elevacao === 0);
    const comAlt = [...vs, ...finalIgnorados].filter((v) => v.elevacao && v.elevacao !== 0);
    if (semAlt.length > 0) {
      if (comAlt.length > 0) {
        const querEstimar = await confirmar({
          titulo: 'Altitudes Ausentes',
          mensagem: `Identificamos ${semAlt.length} pontos sem altitude (ou com cota zero). Deseja que o sistema estime a altitude desses pontos com base nos ${comAlt.length} pontos conhecidos por interpolação espacial?`,
          okLabel: 'Sim, interpolar',
          cancelLabel: 'Não, manter zero',
        });
        if (querEstimar) {
          const conhecidos = comAlt.map((v) => ({ x: v.leste, y: v.norte, z: v.elevacao || 0 }));
          const alvos = semAlt.map((v) => ({ x: v.leste, y: v.norte }));
          const estimadas = estimarAltitudes(conhecidos, alvos);
          const estimadasMap = new Map(semAlt.map((v, idx) => [v.id, estimadas[idx]]));
          const aplicarEstimativas = (v: Vertex) => {
            const est = estimadasMap.get(v.id);
            return est !== undefined && est !== null ? { ...v, elevacao: Number(est.toFixed(3)) } : v;
          };
          vs = vs.map(aplicarEstimativas);
          finalIgnorados = finalIgnorados.map(aplicarEstimativas);
        }
      } else {
        await avisar({
          titulo: 'Altitudes Ausentes',
          mensagem: `Identificamos ${semAlt.length} pontos sem altitude. Nenhum ponto do arquivo possui cota de altitude válida para servir de base para a estimativa.`
        });
      }
    }

    if (destino === 'novo') {
      // Limpa os estados do projeto anterior para evitar vazamento de dados
      setProjetoId(null);
      setNomeProjeto('');
      setNomeProjetoManual(false);
      setRequerente(undefined);
      setTransmitente(undefined);
      setTipoAto('venda');
      setPartesAdicionais([]);
      setConfrontantes([]);
      setConfrontantePorLado({});
      setReferencias([]);
      setParcelasCert([]);
      setVerticesVizinho([]);
      setSituacaoUrl(undefined);
      setPrint3dUrl(undefined);
      setObjetos([]);
      setPlantaConfig({});
      setObjetoSelId(null);
      histRef.current = [];
      redoRef.current = [];
      localStorage.removeItem(rascunhoKey());

      const pad = carregarPadroes();
      const imovelLimpo: ImovelData = {
        denominacao: novoImovel.denominacao || '',
        proprietario: novoImovel.proprietario || '',
        cpfProprietario: '',
        tipoPessoa: 'Física',
        municipio: novoImovel.municipio || '',
        local: novoImovel.local || '',
        matricula: novoImovel.matricula || '',
        cns: '',
        codigoImovelIncra: novoImovel.codigoImovelIncra || '',
        naturezaServico: pad.naturezaServico || 'Georreferenciamento',
        situacao: 'Imóvel Registrado',
        naturezaArea: 'Particular',
        tipoImovel: pad.tipoImovel,
        tipoAzimute: pad.tipoAzimute,
        areaSigefHa: undefined,
        perimetroSigef: undefined,
      };
      setImovel(imovelLimpo);
      
      const auto = gerarTituloAutomatico(imovelLimpo);
      setNomeProjeto(auto || importPendingFile?.name.replace(/\.[^.]+$/, '') || '');
    } else {
      // Importar no projeto atual: preserva todos os cadastros
      setImovel({
        ...imovel,
        municipio: novoImovel.municipio || imovel.municipio,
        local: novoImovel.local || imovel.local,
        denominacao: novoImovel.denominacao || imovel.denominacao,
        proprietario: novoImovel.proprietario || imovel.proprietario,
        codigoImovelIncra: novoImovel.codigoImovelIncra || imovel.codigoImovelIncra,
        matricula: novoImovel.matricula || imovel.matricula,
      });
    }

    setZona(z);

    const gs: Gleba[] = [];
    const { confrontantes: cs, confrontantePorLado: mapa } = gerarPoligono && vs.length >= 3
      ? montarConfrontantes(vs)
      : { confrontantes: [], confrontantePorLado: {} };

    if (destino === 'novo') {
      for (let i = 1; i <= numGlebas; i++) {
        gs.push(i === 1 ? glebaDe(1, vs, cs, mapa, 'Parcela 1') : novaGlebaVazia(i));
      }
      setGlebas(gs);
      carregarGleba(gs[0]);
      setVerticesIgnorados(finalIgnorados);
    } else {
      if (importacaoModoMesclar) {
        const baseIndex = vertices.length;
        const vsMerge = vs.map((v, idx) => ({ ...v, ordem: baseIndex + idx }));
        const vsFinal = [...vertices, ...vsMerge];

        const csFinal = [...confrontantes];
        for (const c of cs) {
          if (!csFinal.some((x) => x.nome === c.nome)) {
            csFinal.push(c);
          }
        }

        const mapaFinal = { ...confrontantePorLado };
        for (const [keyStr, val] of Object.entries(mapa)) {
          const key = Number(keyStr);
          mapaFinal[baseIndex + key] = val;
        }

        const novasGlebas = glebas.map((g) => {
          if (g.id === glebaAtivaId) {
            return {
              ...g,
              vertices: vsFinal,
              confrontantes: csFinal,
              confrontantePorLado: mapaFinal
            };
          }
          return g;
        });

        setGlebas(novasGlebas);
        setVertices(vsFinal);
        setConfrontantes(csFinal);
        setConfrontantePorLado(mapaFinal);
        setVerticesIgnorados([...verticesIgnorados, ...finalIgnorados]);
      } else {
        // Importando no atual: atualiza os vértices e confrontantes da gleba ativa
        const novasGlebas = glebas.map((g) => {
          if (g.id === glebaAtivaId) {
            return {
              ...g,
              vertices: vs,
              confrontantes: cs,
              confrontantePorLado: mapa
            };
          }
          return g;
        });
        setGlebas(novasGlebas);
        setVertices(vs);
        setConfrontantes(cs);
        setConfrontantePorLado(mapa);
        setVerticesIgnorados(finalIgnorados);
      }
    }
    if (importacaoModoMesclar) {
      aviso(`${vs.length} vértice(s) adicional(is) importado(s) e mesclado(s) com sucesso ao projeto.`);
    } else if (gerarPoligono) {
      const extra = finalIgnorados.length ? ` (${finalIgnorados.length} fora do polígono)` : '';
      aviso(`${vs.length} vértices importados e perímetro gerado na Parcela 1${extra} — fuso ${z}${hemisferio} (${municipio}).`);
    } else {
      aviso(`${finalIgnorados.length} vértices importados como pontos soltos, SEM perímetro — fuso ${z}${hemisferio} (${municipio}). Use a ferramenta "Considerar" para formar o polígono quando quiser.`);
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

  function segmentosSnap(): SegmentoSnap[] {
    const segs: SegmentoSnap[] = [];
    const activePts = vertices.filter(v => Number.isFinite(v.lat) && Number.isFinite(v.lon));
    if (activePts.length >= 2) {
      for (let i = 0; i < activePts.length; i++) {
        const a = activePts[i];
        const b = activePts[(i + 1) % activePts.length];
        segs.push({
          a: { leste: a.leste, norte: a.norte },
          b: { leste: b.leste, norte: b.norte }
        });
      }
    }
    for (const g of glebas) {
      if (g.id !== glebaAtivaId) {
        const pts = g.vertices.filter(v => Number.isFinite(v.lat) && Number.isFinite(v.lon));
        if (pts.length >= 2) {
          for (let i = 0; i < pts.length; i++) {
            const a = pts[i];
            const b = pts[(i + 1) % pts.length];
            segs.push({
              a: { leste: a.leste, norte: a.norte },
              b: { leste: b.leste, norte: b.norte }
            });
          }
        }
      }
    }
    for (const anel of referencias) {
      if (anel.length >= 2) {
        for (let i = 0; i < anel.length; i++) {
          const a = anel[i];
          const b = anel[(i + 1) % anel.length];
          segs.push({
            a: { leste: a.leste, norte: a.norte },
            b: { leste: b.leste, norte: b.norte }
          });
        }
      }
    }
    for (const o of objetos) {
      if (o.tipo === 'polilinha' && o.pontos.length >= 2) {
        const count = o.preenchido ? o.pontos.length : o.pontos.length - 1;
        for (let i = 0; i < count; i++) {
          const a = o.pontos[i];
          const b = o.pontos[(i + 1) % o.pontos.length];
          segs.push({
            a: { leste: a.leste, norte: a.norte },
            b: { leste: b.leste, norte: b.norte }
          });
        }
      } else if (o.tipo === 'cota' && o.pontos.length >= 2) {
        segs.push({
          a: { leste: o.pontos[0].leste, norte: o.pontos[0].norte },
          b: { leste: o.pontos[1].leste, norte: o.pontos[1].norte }
        });
      }
    }
    return segs;
  }

  function moverVertice(id: string, lat: number, lon: number) {
    snap();
    let { leste, norte } = geoParaUtm(lat, lon, zona, hemisferio);
    if (snapAtivo) {
      const s = snapUtm(leste, norte, alvosSnap(id), {
        tolVerticeM: 2,
        segmentos: segmentosSnap()
      });
      if (s.tipo) { leste = s.leste; norte = s.norte; const g = utmParaGeo(leste, norte, zona, hemisferio); lat = g.lat; lon = g.lon; }
    }
    if (selMulti.has(id)) {
      const original = vertices.find((v) => v.id === id);
      if (original) {
        const dLeste = leste - original.leste;
        const dNorte = norte - original.norte;
        setVertices((vs) =>
          vs.map((v) => {
            if (selMulti.has(v.id)) {
              const nLeste = v.leste + dLeste;
              const nNorte = v.norte + dNorte;
              const g = utmParaGeo(nLeste, nNorte, zona, hemisferio);
              return { ...v, lat: g.lat, lon: g.lon, leste: nLeste, norte: nNorte };
            }
            return v;
          })
        );
      }
    } else {
      setVertices((vs) => vs.map((v) => (v.id === id ? { ...v, lat, lon, leste, norte } : v)));
    }
  }

  async function apagarVertice(id: string) {
    const v = vertices.find((x) => x.id === id);
    const label = v ? `o vértice ${v.codigoSigef || v.id}` : 'este vértice';
    if (!(await confirmarApagar(`Deseja realmente apagar ${label}?`))) return;
    snap();
    const novos = reordenar(vertices.filter((v) => v.id !== id));
    reindexarCplPara(novos);
    setVertices(novos);
    if (selecionadoId === id) setSelecionadoId(null);
  }

  // --- multi-seleção de vértices (modo "triângulo") ---
  function alternarMulti(id: string) {
    setSelMulti((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function alternarMultiObj(id: string) {
    setObjSelMulti((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function adicionarMulti(ids: string[]) {
    setSelMulti((s) => { const n = new Set(s); ids.forEach((i) => n.add(i)); return n; });
  }
  function adicionarMultiObj(ids: string[]) {
    setObjSelMulti((s) => { const n = new Set(s); ids.forEach((i) => n.add(i)); return n; });
  }
  function limparSelMulti() { setSelMulti(new Set()); setObjSelMulti(new Set()); }
  async function apagarMultiSelecionados() {
    const nVert = selMulti.size, nObj = objSelMulti.size;
    if (nVert === 0 && nObj === 0) return;
    let msg = 'Deseja realmente apagar os elementos selecionados?';
    if (nVert > 0 && nObj === 0) {
      msg = `Deseja realmente apagar estes ${nVert} vértices?`;
    } else if (nVert === 0 && nObj > 0) {
      msg = `Deseja realmente apagar estes ${nObj} elementos?`;
    } else if (nVert > 0 && nObj > 0) {
      msg = `Deseja realmente apagar estes ${nVert} vértices e ${nObj} elementos?`;
    }
    if (!(await confirmarApagar(msg))) return;
    snap();
    if (nVert) {
      const novos = reordenar(vertices.filter((v) => !selMulti.has(v.id)));
      reindexarCplPara(novos);
      setVertices(novos);
      setVerticesIgnorados((vs) => vs.filter((v) => !selMulti.has(v.id)));
    }
    if (nObj) setObjetos((os) => os.filter((o) => !objSelMulti.has(o.id)));
    limparSelMulti();
  }

  // Apaga TODO o polígono (vértices + ignorados + trechos), para redesenhar à mão depois.
  async function limparPoligono() {
    if (vertices.length === 0 && verticesIgnorados.length === 0) return;
    if (!(await confirmarApagar(`Deseja realmente apagar todo o polígono (${vertices.length} vértices)?`))) return;
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
    snap();
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
    snap();
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
  async function inserirVertice(
    lat: number,
    lon: number,
    codigoOficial?: string,
    opts?: { tipo?: TipoVertice; metodo?: string; elevacao?: number; sigmaX?: number; sigmaY?: number; sigmaZ?: number; semSnap?: boolean },
  ) {
    let { leste, norte } = geoParaUtm(lat, lon, zona, hemisferio);
    // Vértice virtual (V) vem de coordenada CALCULADA (afastamento/interseção): não gruda no ímã,
    // senão a conta feita à mão seria descartada. Por isso `semSnap`.
    if (snapAtivo && !opts?.semSnap) {
      const s = snapUtm(leste, norte, alvosSnap(), { tolVerticeM: 2 });
      if (s.tipo) { leste = s.leste; norte = s.norte; const g = utmParaGeo(leste, norte, zona, hemisferio); lat = g.lat; lon = g.lon; }
    }
    // Clique praticamente em cima de um ponto que já existe: avisa e confirma antes de criar um
    // segundo sobreposto (feedback de usuário 05/07/2026 — clique repetido criava ponto duplicado
    // em silêncio). O aviso vem ANTES do snap() de histórico: cancelar não deixa rastro no desfazer.
    const dup = vertices.find((v) => Math.hypot(v.leste - leste, v.norte - norte) < 1);
    if (dup) {
      const dist = Math.hypot(dup.leste - leste, dup.norte - norte);
      const ok = await confirmar({
        titulo: 'Ponto já existe aqui',
        mensagem: `Já existe o ponto ${dup.codigoSigef || dup.nome || 'sem nome'} praticamente neste lugar (a ${dist.toFixed(2).replace('.', ',')} m). Inserir mesmo assim um segundo ponto sobreposto?`,
        okLabel: 'Inserir mesmo assim',
      });
      if (!ok) return;
    }
    snap();
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
    const TOL = 0.5; // tolerância de 50cm para proximidade
    let codigoSugerido = '';
    let dadosOrigem: VerticeVizinho | null = null;
    
    const utmCli = geoParaUtm(lat, lon, zona, hemisferio);
    let minDist = TOL;
    for (const vv of verticesVizinho) {
      const d = Math.hypot(vv.leste - utmCli.leste, vv.norte - utmCli.norte);
      if (d < minDist) {
        minDist = d;
        codigoSugerido = vv.nome;
        dadosOrigem = vv;
      }
    }

    const mensagem = codigoSugerido
      ? `Encontramos o vértice oficial "${codigoSugerido}" nessa posição (do arquivo de confrontação "${dadosOrigem?.origem || ''}").\n\nConfirme ou ajuste o código para adotá-lo no seu projeto:`
      : 'Se você já sabe o código oficial que o agrimensor vizinho usou para este vértice (ex.: CODI-P-0007), digite aqui — ele será reaproveitado em vez de gerar um novo.\n\nDeixe em branco se não souber (o sistema gera um código provisório seu).';

    const digitado = await perguntar({
      titulo: 'Vértice de vizinho',
      mensagem,
      valorInicial: codigoSugerido,
    });
    
    if (digitado == null) return; // cancelou
    const codigo = digitado.trim().toUpperCase() || undefined;

    if (dadosOrigem) {
      // Adota a coordenada exata, altitude, sigmas e métodos do vizinho original
      const parts = dadosOrigem.nome.split(/[-_]/);
      const tipoDet = parts.includes('M') ? 'M' : (parts.includes('V') ? 'V' : 'P');
      
      inserirVertice(dadosOrigem.lat, dadosOrigem.lon, codigo, {
        tipo: tipoDet,
        metodo: dadosOrigem.metodo,
        elevacao: dadosOrigem.elevacao,
        sigmaX: dadosOrigem.sigmaX,
        sigmaY: dadosOrigem.sigmaY,
        sigmaZ: dadosOrigem.sigmaZ
      });
    } else {
      inserirVertice(lat, lon, codigo);
    }
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
    if (vertices.length < 3) { aviso('É necessário ao menos 3 vértices para enumerar.'); return; }
    const ok = await confirmar({
      titulo: 'Enumerar e Reordenar Vértices',
      mensagem: 'Esta ação vai:\n\n• Reordenar os vértices começando pelo mais ao NORTE, em sentido HORÁRIO\n• Renumerar todos os códigos (M-0001, M-0002… ou conforme seu padrão)\n\nDeseja continuar?',
      okLabel: 'Sim, enumerar', cancelLabel: 'Cancelar',
    });
    if (!ok) return;
    snap();
    const ordenados = iniciarDoNorteHorario(vertices);
    reindexarCplPara(ordenados);
    await aplicarCodigos(ordenados);
    aviso('Vértices reordenados (norte → horário) e renumerados.');
  }

  // Reordena o anel arrastando na lista e renumera (muda o polígono e os nomes).
  async function reordenarVertice(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= vertices.length || to >= vertices.length) return;
    snap();
    const out = [...vertices];
    const [m] = out.splice(from, 1);
    out.splice(to, 0, m);
    const novos = reordenar(out);
    reindexarCplPara(novos);
    await aplicarCodigos(novos);
  }

  // ---------- desenho livre (CAD leve) ----------
  function pontoLL(lat: number, lon: number, comSnap = true): PontoLL {
    let { leste, norte } = geoParaUtm(lat, lon, zona, hemisferio);
    if (comSnap && snapAtivo) {
      const s = snapUtm(leste, norte, alvosSnap(), {
        tolVerticeM: 2,
        segmentos: segmentosSnap(),
        pontoOrigem: desenhoBuffer.length > 0 ? { leste: desenhoBuffer[desenhoBuffer.length - 1].leste, norte: desenhoBuffer[desenhoBuffer.length - 1].norte } : null
      });
      if (s.tipo) { leste = s.leste; norte = s.norte; const g = utmParaGeo(leste, norte, zona, hemisferio); lat = g.lat; lon = g.lon; }
    }
    return { lat, lon, leste, norte };
  }
  // ponta de linha/polilinha/cota: SEMPRE encaixa no vértice mais próximo (mesmo com o imã
  // desligado) e com tolerância maior, para a extremidade poder ficar exatamente sobre um vértice.
  // Tolerância era 10/12 m e foi reduzida pra 3/4 m (relato do dono, 10/07/2026): num levantamento
  // com pontos importados PRÓXIMOS entre si (poucos metros), clicar num ponto às vezes "roubava" o
  // clique pro vizinho — a tolerância antiga era generosa demais e o snap sempre pega o vértice mais
  // perto do clique reconvertido, não necessariamente o que o dedo/mouse mirou. 3/4 m ainda cobre um
  // clique impreciso, mas reduz bastante a chance de pular pro ponto errado quando há vizinhos perto.
  function pontoDesenho(lat: number, lon: number): PontoLL {
    let { leste, norte } = geoParaUtm(lat, lon, zona, hemisferio);
    const s = snapUtm(leste, norte, alvosSnap(), {
      tolVerticeM: snapAtivo ? 4 : 3,
      segmentos: snapAtivo ? segmentosSnap() : [],
      pontoOrigem: (snapAtivo && desenhoBuffer.length > 0) ? { leste: desenhoBuffer[desenhoBuffer.length - 1].leste, norte: desenhoBuffer[desenhoBuffer.length - 1].norte } : null
    });
    if (s.tipo) { leste = s.leste; norte = s.norte; const g = utmParaGeo(leste, norte, zona, hemisferio); lat = g.lat; lon = g.lon; }
    else if (orto !== 'off' && desenhoBuffer.length > 0) {
      // ORTO/POLAR: sem imã no caminho, o trecho gruda no ângulo travado (90° ou 15°) a partir
      // do último ponto do desenho. O imã tem prioridade (encaixe em vértice vale mais que ângulo).
      const base = desenhoBuffer[desenhoBuffer.length - 1];
      const a = aplicarOrto({ leste: base.leste, norte: base.norte }, { leste, norte }, orto === '90' ? 90 : 15);
      leste = a.leste; norte = a.norte;
      const g = utmParaGeo(leste, norte, zona, hemisferio); lat = g.lat; lon = g.lon;
    }
    return { lat, lon, leste, norte };
  }
  async function onCliqueDesenho(lat: number, lon: number) {
    await processarPontoDesenho(pontoDesenho(lat, lon));
  }
  // Recebe um ponto JÁ resolvido (clique com imã/orto aplicados, ou ponto DIGITADO por rumo e
  // distância) e alimenta a ferramenta ativa — caminho único pros dois jeitos de desenhar.
  async function processarPontoDesenho(p: PontoLL) {
    if (modo === 'simbolo') {
      snap();
      setObjetos((os) => [...os, novoSimbolo(p, simboloSel)]);
      return;
    } else if (modo === 'texto') {
      const t = await perguntar({ titulo: 'Inserir texto', mensagem: 'Texto a inserir:', multiline: true }); if (!t) return;
      snap();
      setObjetos((os) => [...os, novoTexto(p, t)]);
    } else if (modo === 'cota') {
      setDesenhoBuffer((buf) => {
        const nb = [...buf, p];
        if (nb.length >= 2) {
          snap();
          let cotaOpts = {};
          try {
            const defCor = localStorage.getItem('default_cota_cor');
            const defEsp = localStorage.getItem('default_cota_espessura');
            const defTam = localStorage.getItem('default_cota_tamanho');
            const defPos = localStorage.getItem('default_cota_posicaoTexto');
            cotaOpts = {
              cor: defCor || undefined,
              espessura: defEsp ? Number(defEsp) : undefined,
              tamanho: defTam ? Number(defTam) : undefined,
              tamanhoFonte: defTam ? Number(defTam) : undefined,
              corFonte: defCor || undefined,
              posicaoTexto: defPos || undefined
            };
          } catch {}
          setObjetos((os) => [...os, novaCota(nb[0], nb[1], cotaOpts)]);
          return [];
        }
        return nb;
      });
    } else if (modo === 'linha') {
      // linha = traço reto de 2 pontos (fecha sozinho no 2º clique)
      setDesenhoBuffer((buf) => {
        const nb = [...buf, p];
        if (nb.length >= 2) { snap(); setObjetos((os) => [...os, novaPolilinha(nb)]); return []; }
        return nb;
      });
    } else if (modo === 'polilinha' || modo === 'tracejado') {
      // polilinha ou tracejado = vários pontos.
      // No caso da polilinha (que vira polígono se fechar): ao CLICAR PERTO DO 1º ponto, fecha.
      if (modo === 'polilinha' && desenhoBuffer.length >= 3) {
        const first = desenhoBuffer[0];
        const lats = desenhoBuffer.map((q) => q.lat), lons = desenhoBuffer.map((q) => q.lon);
        const ext = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lons) - Math.min(...lons)) || 0.0005;
        if (Math.hypot(p.lat - first.lat, p.lon - first.lon) < ext * 0.05) {
          const buf = desenhoBuffer;
          setDesenhoBuffer([]);
          // pergunta o que é o polígono: uma GLEBA (entra na área/peças) ou um item do mapa (casa etc.)
          const ehGleba = await confirmar({ titulo: 'Polígono fechado', mensagem: 'O que este polígono representa?', okLabel: 'Gleba do imóvel', cancelLabel: 'Item do mapa' });
          if (ehGleba) {
            const brutos: Vertex[] = buf.map((q, i) => ({ id: `v_${Date.now().toString(36)}_${i}`, lat: q.lat, lon: q.lon, leste: q.leste, norte: q.norte, tipo: 'P' as const, codigoSigef: `P${i + 1}`, isDivisa: false, ordem: i + 1, nome: `P${i + 1}`, codigoCampo: `P${i + 1}`, elevacao: 0 }));
            // praxe do georreferenciamento (igual ao import de TXT): começa no vértice mais ao
            // NORTE e percorre em sentido HORÁRIO — desenho manual ganhava nomes na ordem do clique
            const novos = iniciarDoNorteHorario(brutos).map((v, i) => ({ ...v, ordem: i + 1, nome: `P${i + 1}`, codigoSigef: `P${i + 1}`, codigoCampo: `P${i + 1}` }));
            snap();
            if (vertices.length < 3) {
              // Pontos soltos que já estavam no mapa NÃO podem sumir (feedback 05/07/2026): o que
              // não virou canto do anel (o desenho gruda nos existentes pelo imã) vira vértice
              // IGNORADO — continua visível e recuperável pela ferramenta "considerar".
              const sobras = vertices.filter((v) => !novos.some((n) => Math.hypot(n.leste - v.leste, n.norte - v.norte) < 1));
              if (sobras.length > 0) setVerticesIgnorados((ig) => [...ig, ...sobras]);
              setVertices(novos);
              aviso(sobras.length > 0
                ? `Polígono definido como perímetro da gleba. ${sobras.length} ponto(s) que não viraram canto foram mantidos como ignorados (ferramenta "considerar" traz de volta).`
                : 'Polígono definido como perímetro da gleba.');
            }
            else { const gs = sincronizarGlebas(); const nova = { ...novaGlebaVazia(gs.length + 1), vertices: novos }; setGlebas([...gs, nova]); carregarGleba(nova); aviso('Nova gleba criada a partir do polígono.'); }
          } else {
            snap();
            setObjetos((os) => [...os, novaPolilinha(buf, { preenchido: true })]);
            aviso('Polígono adicionado como item do mapa.');
          }
          return;
        }
      }
      setDesenhoBuffer((buf) => [...buf, p]);
    } else if (modo === 'medir') {
      // medir = só mostra distância/azimute ao vivo na tela; nunca cria objeto
      setDesenhoBuffer((buf) => [...buf, p]);
    } else if (modo === 'retangulo') {
      // retângulo = 2 cliques nos cantos OPOSTOS; fecha sozinho no 2º clique (reto no plano UTM)
      setDesenhoBuffer((buf) => {
        const nb = [...buf, p];
        if (nb.length >= 2) {
          const a = nb[0], c = nb[1];
          const cantosUtm = [
            { leste: a.leste, norte: a.norte },
            { leste: c.leste, norte: a.norte },
            { leste: c.leste, norte: c.norte },
            { leste: a.leste, norte: c.norte },
          ];
          const cantos: PontoLL[] = cantosUtm.map((q) => { const g = utmParaGeo(q.leste, q.norte, zona, hemisferio); return { lat: g.lat, lon: g.lon, leste: q.leste, norte: q.norte }; });
          cantos.push({ ...cantos[0] }); // fecha o retângulo
          snap();
          setObjetos((os) => [...os, novaPolilinha(cantos)]);
          return [];
        }
        return nb;
      });
    } else if (modo === 'circulo') {
      // círculo = 2 cliques: 1º clique é o centro, 2º clique define o raio
      setDesenhoBuffer((buf) => {
        const nb = [...buf, p];
        if (nb.length >= 2) {
          snap();
          setObjetos((os) => [...os, novaPolilinha(circuloCentroRaio(nb[0], nb[1]))]);
          return [];
        }
        return nb;
      });
    } else if (modo === 'arco') {
      // arco = 3 cliques: início, um ponto POR ONDE o arco passa, e fim; fecha sozinho no 3º clique
      setDesenhoBuffer((buf) => {
        const nb = [...buf, p];
        if (nb.length >= 3) {
          snap();
          setObjetos((os) => [...os, novaPolilinha(arcoTresPontos(nb[0], nb[1], nb[2]))]);
          return [];
        }
        return nb;
      });
    }
  }

  function circuloCentroRaio(centro: PontoLL, borda: PontoLL): PontoLL[] {
    const cx = centro.leste, cy = centro.norte;
    const dx = borda.leste - cx, dy = borda.norte - cy;
    const r = Math.hypot(dx, dy);
    if (r < 1e-4) return [centro];
    const pts: PontoLL[] = [];
    const numSegs = 48;
    for (let i = 0; i <= numSegs; i++) {
      const ang = (i / numSegs) * 2 * Math.PI;
      const qx = cx + r * Math.cos(ang);
      const qy = cy + r * Math.sin(ang);
      const g = utmParaGeo(qx, qy, zona, hemisferio);
      pts.push({ lat: g.lat, lon: g.lon, leste: qx, norte: qy });
    }
    return pts;
  }
  // Arco que passa por 3 pontos (início, meio, fim): acha o círculo pelos 3 e varre no sentido que
  // contém o ponto do meio, devolvendo uma polilinha densa (curva de verdade). Colinear → traço reto.
  function arcoTresPontos(a: PontoLL, b: PontoLL, c: PontoLL): PontoLL[] {
    const ax = a.leste, ay = a.norte, bx = b.leste, by = b.norte, cx = c.leste, cy = c.norte;
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(d) < 1e-6) return [a, b, c];
    const a2 = ax * ax + ay * ay, b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
    const ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d;
    const uy = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d;
    const r = Math.hypot(ax - ux, ay - uy);
    const angA = Math.atan2(ay - uy, ax - ux);
    const angB = Math.atan2(by - uy, bx - ux);
    const angC = Math.atan2(cy - uy, cx - ux);
    const TAU = Math.PI * 2;
    const norm = (x: number) => ((x % TAU) + TAU) % TAU;
    let sweep = norm(angC - angA);      // varredura CCW de A a C
    if (norm(angB - angA) > sweep) sweep -= TAU; // B fora do arco CCW → vai no sentido horário
    const segs = Math.min(96, Math.max(8, Math.round(Math.abs(sweep) / (Math.PI / 48))));
    const out: PontoLL[] = [];
    for (let i = 0; i <= segs; i++) {
      const ang = angA + (sweep * i) / segs;
      const leste = ux + r * Math.cos(ang), norte = uy + r * Math.sin(ang);
      const g = utmParaGeo(leste, norte, zona, hemisferio);
      out.push({ lat: g.lat, lon: g.lon, leste, norte });
    }
    return out;
  }
  // Adiciona o PRÓXIMO ponto do desenho por rumo e distância digitados (painel de precisão do
  // modo Completo) — jeito clássico de transcrever memorial antigo pro mapa sem caçar com o mouse.
  async function adicionarPontoDigitado() {
    const az = parseAzimute(azDigitado);
    const d = parseFloat((distDigitada || '').replace(',', '.'));
    if (az == null) { aviso('Azimute inválido. Use graus decimais (ex.: 45,5) ou grau minuto segundo (ex.: 45 30 00).'); return; }
    if (!Number.isFinite(d) || d <= 0) { aviso('Distância inválida — informe metros (ex.: 25,40).'); return; }
    const base = desenhoBuffer[desenhoBuffer.length - 1];
    if (!base) { aviso('Clique o PRIMEIRO ponto no mapa; os próximos podem ser digitados por rumo e distância.'); return; }
    const en = porAfastamento({ leste: base.leste, norte: base.norte }, az, d);
    const g = utmParaGeo(en.leste, en.norte, zona, hemisferio);
    await processarPontoDesenho({ lat: g.lat, lon: g.lon, leste: en.leste, norte: en.norte });
    setDistDigitada(''); // azimute costuma ser reaproveitado; distância muda a cada lance
  }

  function confirmarParalela(pontos: [PontoLL, PontoLL]) {
    snap();
    const nova = novaPolilinha(pontos, { cor: '#2563eb', espessura: 1.5 });
    setObjetos((os) => [...os, nova]);
    setSegmentoSelecionado(null);
    setModo('navegar');
    aviso('Linha paralela criada com sucesso.');
  }
  function confirmarCopiaBase(pt: PontoLL) {
    setCopiarPontoBase(pt);
    setModo('copiar_destino');
    aviso('Ponto base definido. Clique no local de destino para colar.');
  }
  function confirmarCopiaDestino(pt: PontoLL) {
    if (!copiarPontoBase) return;
    snap();
    const targetPts = vertices.filter((v) => selMulti.has(v.id) && Number.isFinite(v.lat));
    if (targetPts.length === 0) {
      aviso('Nenhum vértice selecionado para copiar.');
      setModo('navegar');
      return;
    }
    const dL = pt.leste - copiarPontoBase.leste;
    const dN = pt.norte - copiarPontoBase.norte;
    const novosPontos: PontoLL[] = targetPts.map((v) => {
      const l = v.leste + dL;
      const n = v.norte + dN;
      const g = utmParaGeo(l, n, zona, hemisferio);
      return { lat: g.lat, lon: g.lon, leste: l, norte: n };
    });
    const nova = novaPolilinha(novosPontos, { cor: '#2563eb', espessura: 1.5 });
    setObjetos((os) => [...os, nova]);
    setSelMulti(new Set());
    setCopiarPontoBase(null);
    setModo('navegar');
    aviso('Cópia realizada com sucesso como objeto do mapa.');
  }
  async function dividirSegmento(idA: string, idB: string) {
    const input = await perguntar({ titulo: 'Dividir em partes iguais', mensagem: 'Número de partes (mínimo 2):' });
    if (!input) return;
    const n = parseInt(input);
    if (!Number.isFinite(n) || n < 2) {
      aviso('Número de divisões inválido. Informe um valor inteiro maior ou igual a 2.');
      return;
    }
    let idxA = vertices.findIndex((v) => v.id === idA);
    let idxB = vertices.findIndex((v) => v.id === idB);
    if (idxA === -1 || idxB === -1) return;
    const total = vertices.length;
    let insertIdx = -1;
    if ((idxA + 1) % total === idxB) {
      insertIdx = idxA + 1;
    } else if ((idxB + 1) % total === idxA) {
      insertIdx = idxB + 1;
      const tmp = idxA;
      idxA = idxB;
      idxB = tmp;
    } else {
      aviso('Os vértices selecionados não formam um segmento de divisa contíguo.');
      return;
    }
    snap();
    const vA = vertices[idxA];
    const vB = vertices[idxB];
    const ptsUtm = dividirSegmentoUtm(
      { leste: vA.leste, norte: vA.norte },
      { leste: vB.leste, norte: vB.norte },
      n
    );
    const novosVertices: Vertex[] = ptsUtm.map((pt, i) => {
      const g = utmParaGeo(pt.leste, pt.norte, zona, hemisferio);
      const elev = vA.elevacao + ((i + 1) / n) * (vB.elevacao - vA.elevacao);
      return {
        id: `v_${Date.now().toString(36)}_${i}`,
        lat: g.lat,
        lon: g.lon,
        leste: pt.leste,
        norte: pt.norte,
        tipo: vA.tipo,
        codigoSigef: '',
        isDivisa: true,
        ordem: 0,
        nome: '',
        codigoCampo: '',
        elevacao: +elev.toFixed(2)
      };
    });
    const novaLista = [...vertices];
    if (insertIdx === 0 || insertIdx === total) {
      novaLista.push(...novosVertices);
    } else {
      novaLista.splice(insertIdx, 0, ...novosVertices);
    }
    const ordenado = reordenar(novaLista);
    setVertices(ordenado);
    await aplicarCodigos(ordenado);
    setModo('navegar');
    aviso(`Segmento dividido em ${n} partes iguais com sucesso.`);
  }
  function confirmarTrim(objetoId: string, novosPontos: PontoLL[]) {
    snap();
    setObjetos((os) =>
      os.map((o) => (o.id === objetoId ? { ...o, pontos: novosPontos } : o))
    );
    setLinhaLimite(null);
    setModo('navegar');
    aviso('Elemento aparado (Trim) com sucesso.');
  }
  function confirmarExtend(objetoId: string, novosPontos: PontoLL[]) {
    snap();
    setObjetos((os) =>
      os.map((o) => (o.id === objetoId ? { ...o, pontos: novosPontos } : o))
    );
    setLinhaLimite(null);
    setModo('navegar');
    aviso('Elemento prolongado (Extend) com sucesso.');
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
  function onMoverObjeto(id: string, dlat: number, dlon: number) {
    setObjetos((os) => os.map((o) => o.id !== id ? o : {
      ...o,
      pontos: o.pontos.map((q) => pontoLL(q.lat + dlat, q.lon + dlon)),
    }));
  }
  async function excluirObjetoPorId(id: string) {
    const obj = objetos.find((o) => o.id === id);
    let msg = 'Deseja realmente apagar este elemento?';
    if (obj) {
      if (obj.tipo === 'polilinha') {
        if (obj.tracejado) msg = 'Deseja realmente apagar este tracejado?';
        else if (obj.preenchido) msg = 'Deseja realmente apagar este polígono?';
        else if (obj.pontos.length === 2) msg = 'Deseja realmente apagar esta linha?';
        else msg = 'Deseja realmente apagar esta polilinha?';
      } else if (obj.tipo === 'texto') {
        msg = 'Deseja realmente apagar este texto?';
      } else if (obj.tipo === 'simbolo') {
        msg = 'Deseja realmente apagar este símbolo?';
      } else if (obj.tipo === 'cota') {
        msg = 'Deseja realmente apagar esta cota?';
      }
    }
    if (!(await confirmarApagar(msg))) return;
    snap();
    setObjetos((os) => os.filter((o) => o.id !== id));
    if (objetoSelId === id) setObjetoSelId(null);
  }
  function apagarObjetoSel() {
    if (!objetoSelId) return;
    excluirObjetoPorId(objetoSelId);
  }
  function editarObjetoSel(patch: Partial<ObjetoDesenho>) {
    if (!objetoSelId) return;
    snap();
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
      aviso('Vértice inicial selecionado. Clique no próximo vértice (no sentido horário) para pintar o trecho.');
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
      aviso('Vértice inicial selecionado. Clique no próximo vértice (no sentido horário) para pintar o trecho.');
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
    snap();
    const id = `c_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)}`;
    const randomCor = gerarCorNovaConfrontante(confrontantes);
    const novoConf: Confrontante = { id, nome: '', cpf: '', matricula: '', cns: '', condicao: 'proprietario', cor: randomCor };
    setConfrontantes((cs) => [...cs, novoConf]);
    setConfrontantePincelId(id);
    setConfEditId(id);
    setModo('confrontante');
  }

  // Apaga um confrontante criado por engano. Se ele já estava pintado em algum trecho da divisa,
  // avisa quantos lados ficam sem confrontante (não apaga o vértice/divisa, só desfaz a pintura).
  async function excluirConfrontante(id: string) {
    const alvo = confrontantes.find((c) => c.id === id);
    const nome = alvo?.nome?.trim() || 'este confrontante';
    const ladosAfetados = Object.values(confrontantePorLado).filter((cid) => cid === id).length;
    const aviso2 = ladosAfetados > 0
      ? ` Ele está pintado em ${ladosAfetados} lado(s) da divisa — essas divisas voltam a ficar sem confrontante definido.`
      : '';
    if (!(await confirmarApagar(`Excluir "${nome}" deste projeto?${aviso2}`))) return;
    snap();
    setConfrontantes((cs) => cs.filter((c) => c.id !== id));
    setConfrontantePorLado((m) => {
      const novo = { ...m };
      for (const k of Object.keys(novo)) { if (novo[Number(k)] === id) delete novo[Number(k)]; }
      return novo;
    });
    if (confrontantePincelId === id) setConfrontantePincelId('');
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
          setConferirAberto(true);
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

    // Se houver problemas graves de geometria, bloqueia de verdade
    if (graves.length > 0) {
      await avisar({
        titulo: 'Erro Geométrico Grave',
        mensagem: `${graves[0]}\n\nPor favor, corrija a geometria da poligonal antes de exportar.`
      });
      return false;
    }

    // Se houver apenas avisos de dados incompletos/ausentes, exibe confirmação
    const primeiro = problemas[0] || 'Dados incompletos no projeto';
    const prosseguir = await confirmar({
      titulo: 'Cadastro Incompleto (Aviso)',
      mensagem: `${primeiro}\n\nDeseja gerar o arquivo/planilha com dados ausentes/incompletos mesmo assim?`,
      okLabel: 'Baixar assim mesmo',
      cancelLabel: 'Corrigir dados'
    });

    if (prosseguir) {
      return true;
    }

    if (primeiro.includes('técnico') || primeiro.includes('Técnico') || primeiro.includes('CFT') || primeiro.includes('profissional') || primeiro.includes('RT')) {
      setConfigAba('pessoal');
      setConfigAberta(true);
      return false;
    }

    setConferirAberto(true);
    return false;
  }

  async function getAuthHeaders() {
    const token = user ? await user.getIdToken() : '';
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  async function exportarMemorial(modo: 'normal' | 'servidao' = 'normal') {
    if (!tecnico || vertices.length < 3) { aviso('Importe pontos primeiro.'); return; }
    if (!(await verificarConciliacaoSigef())) return;
    if (!(await verificarProntoParaExportar())) return;
    try {
      const vs = await comCodigos();
      const r = calcular(vs, confrontantePorLado);
      const headers = await getAuthHeaders();
      const response = await fetch('/api/export/memorial', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          res: r,
          imovel,
          tecnico,
          confrontantes,
          confrontantePorLado,
          dataExtenso: dataPorExtenso(),
          requerente,
          transmitente,
          partesAdicionais,
          zonaUtm: zona,
          modo
        })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.erro || 'Falha ao gerar memorial no servidor.');
      }
      const blobBruto = await response.blob();
      const blob = await compatibilizarWord2007(blobBruto);
      const sufixo = glebas.length > 1 ? ` - ${glebaAtivaNome}` : '';
      const prefixo = modo === 'servidao' ? 'Memorial de servidao' : 'Memorial';
      saveAs(blob, limparNomeArquivo(`${prefixo} - ${imovel.denominacao || nomeProjeto || 'imovel'}${sufixo}.docx`));
      setBaixou((b) => ({ ...b, memorial: true }));
    } catch (e: unknown) { aviso((e as Error).message || 'Erro ao gerar o memorial.'); }
  }

  async function exportarOds() {
    if (!tecnico || vertices.length < 3) { aviso('Importe pontos primeiro.'); return; }
    if (!(await verificarProntoParaExportar())) return;
    const tec = tecnico;
    try {
      setProcessando(true);
      const modeloProprio = await carregarModeloSigef();

      const obterTemplateBytes = async (): Promise<Uint8Array> => {
        if (modeloProprio) return new Uint8Array(modeloProprio);
        const resTpl = await fetch('/templates/sigef.ods');
        if (!resTpl.ok) throw new Error('Template sigef.ods não encontrado.');
        return new Uint8Array(await resTpl.arrayBuffer());
      };

      if (glebas.length > 1) {
        const id = projetoId ?? novoId();
        const gs = sincronizarGlebas();
        const registradas: Gleba[] = [];
        try {
          for (const g of gs) {
            if (g.vertices.length < 3) { registradas.push(g); continue; }
            const r = await registrarPontos(g.vertices, tec.credenciamentoIncra, id, zona, hemisferio, tec);
            registradas.push({ ...g, vertices: r.vertices });
          }
        } catch (e) {
          const parcial = [...registradas, ...gs.slice(registradas.length)];
          setGlebas(parcial);
          const ativaParcial = parcial.find((g) => g.id === glebaAtivaId);
          if (ativaParcial) setVertices(ativaParcial.vertices);
          throw e;
        }
        setGlebas(registradas);
        const ativa = registradas.find((g) => g.id === glebaAtivaId);
        if (ativa) setVertices(ativa.vertices);
        const glebasSigef = registradas.filter((g) => g.vertices.length >= 3).map((g) => ({
          res: calcular(g.vertices, g.confrontantePorLado),
          confrontantes: g.confrontantes, confrontantePorLado: g.confrontantePorLado,
          denominacao: g.denominacao, parcela: g.parcela,
          imoveisCadastrados,
        }));
        const nome = limparNomeArquivo(imovel.denominacao || nomeProjeto || 'imovel');
        const unica = await confirmar({
          titulo: 'Planilha SIGEF',
          mensagem: `Planilha SIGEF com ${glebasSigef.length} glebas: gerar uma planilha única (uma aba por gleba) ou planilhas separadas num .zip?`,
          okLabel: 'Planilha única', cancelLabel: 'Separadas (.zip)',
        });

        let blob: Blob;
        try {
          const headers = await getAuthHeaders();
          const response = await fetch('/api/export/ods', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              tipo: unica ? 'unica' : 'separadas',
              imovel,
              tecnico: tec,
              glebas: glebasSigef,
              imoveisCadastrados
            })
          });
          if (response.ok) {
            blob = await response.blob();
          } else {
            throw new Error('API indisponível');
          }
        } catch {
          // Fallback cliente 100% offline/local sem 401/403
          const templateBytes = await obterTemplateBytes();
          if (unica) {
            blob = await gerarSigefOds({ templateBytes, imovel, tecnico: tec, glebas: glebasSigef, imoveisCadastrados });
          } else {
            blob = await gerarSigefOdsSeparadas(templateBytes, imovel, tec, glebasSigef);
          }
        }

        if (unica) {
          saveAs(blob, `SIGEF - ${nome} (${glebasSigef.length} glebas).ods`);
        } else {
          saveAs(blob, `SIGEF - ${nome} (${glebasSigef.length} planilhas).zip`);
        }
      } else {
        const vs = await comCodigos();
        const r = calcular(vs, confrontantePorLado);
        const ativa = glebas.find((g) => g.id === glebaAtivaId);
        const glebasList = ativa ? [{
          res: r,
          confrontantes,
          confrontantePorLado,
          denominacao: ativa.denominacao || 'Parcela 1',
          parcela: ativa.parcela || '001'
        }] : undefined;

        let blob: Blob;
        try {
          const headers = await getAuthHeaders();
          const response = await fetch('/api/export/ods', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              tipo: 'unica',
              res: r,
              imovel,
              tecnico: tec,
              confrontantes,
              confrontantePorLado,
              glebas: glebasList,
              imoveisCadastrados
            })
          });
          if (response.ok) {
            blob = await response.blob();
          } else {
            throw new Error('API indisponível');
          }
        } catch {
          // Fallback cliente 100% offline/local sem 401/403
          const templateBytes = await obterTemplateBytes();
          blob = await gerarSigefOds({
            templateBytes,
            res: r,
            imovel,
            tecnico: tec,
            confrontantes,
            confrontantePorLado,
            glebas: glebasList,
            imoveisCadastrados
          });
        }

        saveAs(blob, `SIGEF - ${limparNomeArquivo(imovel.denominacao || nomeProjeto || 'imovel')}.ods`);
      }
      setBaixou((b) => ({ ...b, ods: true }));
    } catch (e: unknown) { aviso((e as Error).message || 'Erro ao gerar a planilha.'); }
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
        
        const pngBase64 = canvas.toDataURL('image/png');
        getAuthHeaders().then((headers) => {
          fetch('/api/export/pdf', {
            method: 'POST',
            headers,
            body: JSON.stringify({ pngBase64 })
          })
          .then((res) => {
            if (!res.ok) throw new Error();
            return res.blob();
          })
          .then((blob) => {
            const sufixo = glebas.length > 1 ? ` - ${glebaAtivaNome}` : '';
            saveAs(blob, limparNomeArquivo(`Planta - ${imovel.denominacao || nomeProjeto || 'imovel'}${sufixo}.pdf`));
            setBaixou((b) => ({ ...b, planta: true }));
            aviso('PDF da planta gerado.');
          })
          .catch(() => aviso('Erro ao compilar o PDF da planta no servidor.'));
        });
      };
      img.onerror = () => { URL.revokeObjectURL(url); aviso('Não consegui rasterizar a planta.'); };
      img.src = url;
    }, 450);
  }

  async function baixarRequerimentoDireto() {
    if (!requerente || !requerente.nome) {
      const resp = await confirmar({
        titulo: 'Requerimento com dados incompletos',
        mensagem: 'Os dados do requerente ainda não foram preenchidos. Deseja abrir o formulário para completá-los agora antes de baixar o documento?',
        okLabel: 'Abrir Formulário',
        cancelLabel: 'Baixar assim mesmo'
      });
      if (resp) {
        setReqAberto(true);
        return;
      }
    }
    setProcessando(true);
    try {
      const headers = await getAuthHeaders();
      const resReq = await fetch('/api/export/requerimento', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          imovel, tecnico, requerente, transmitente, tipoAto, partesAdicionais, correcoes,
          areaRealHa: res ? valoresEfetivos(res, imovel).areaHa : 0,
        })
      });
      if (!resReq.ok) throw new Error('Falha ao gerar requerimento.');
      const reqBlob = await resReq.blob();
      const requerimento = await compatibilizarWord2007(reqBlob);
      const nome = (imovel.denominacao || 'imovel').replace(/[^\w.-]+/g, '_');
      saveAs(requerimento, `Requerimento - ${nome}.docx`);
      setBaixou((b) => ({ ...b, req: true }));
    } catch (e) {
      aviso((e as Error).message);
    } finally {
      setProcessando(false);
    }
  }

  async function baixarTodasAnuenciasDireto() {
    if (!tecnico) { aviso('Configure o responsável técnico primeiro nas configurações.'); return; }
    const confrontantesAssinam = confrontantes.filter(confrontanteAssina);
    if (!confrontantesAssinam.length) {
      aviso('Não há confrontantes que precisem assinar neste projeto (bem público não conta).');
      return;
    }
    setProcessando(true);
    try {
      const { gerarAnuenciaLoteDocumento } = await import('@/lib/export/anuencia');
      const ladosDe = (id: string) => Object.entries(confrontantePorLado).filter(([, cid]) => cid === id).map(([i]) => Number(i));
      const compartilhadosDe = (c: Confrontante) => ladosDe(c.id).map((i) => lados[i]).filter(Boolean);
      const inputDe = (c: Confrontante) => ({
        imovel, tecnico: tecnico as TecnicoData, confrontante: c, verticesCompartilhados: compartilhadosDe(c),
        incluirVerticesLista: false,
      });
      const doc = gerarAnuenciaLoteDocumento(confrontantesAssinam.map(inputDe));
      const blob = await compatibilizarWord2007(await Packer.toBlob(doc));
      const nome = (imovel.denominacao || 'imovel').replace(/[^\w.-]+/g, '_');
      saveAs(blob, limparNomeArquivo(`Cartas de Anuencia - ${nome}.docx`));
    } catch (e) {
      aviso('Erro ao gerar cartas de anuência: ' + (e as Error).message);
    } finally {
      setProcessando(false);
    }
  }

  function dataExtensoHoje(): string {
    const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const d = new Date();
    return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
  }

  async function baixarErrataDireta() {
    if (!tecnico) { aviso('Configure o responsável técnico primeiro nas configurações.'); return; }
    const validas = correcoes.filter((c) => c.onde.trim() && c.passa.trim());
    if (!validas.length) {
      setErrataAberto(true);
      return;
    }
    setProcessando(true);
    try {
      const padroes = carregarPadroes();
      const comarca = padroes.comarcaPadrao || imovel.municipio || '—';
      const headers = await getAuthHeaders();
      const response = await fetch('/api/export/errata', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          imovel,
          tecnico,
          correcoes: validas,
          areaHa: res ? valoresEfetivos(res, imovel).areaHa : 0,
          acrescimoRT: '',
          dataExtenso: dataExtensoHoje(),
          comarca
        })
      });
      if (!response.ok) throw new Error('Falha ao gerar errata.');
      const blobBruto = await response.blob();
      const blob = await compatibilizarWord2007(blobBruto);
      const nome = (imovel.denominacao || 'imovel').replace(/[^\w.-]+/g, '_');
      saveAs(blob, limparNomeArquivo(`Errata - ${nome}.docx`));
    } catch (e) {
      aviso((e as Error).message);
    } finally {
      setProcessando(false);
    }
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
          
          const pngBase64 = canvas.toDataURL('image/png');
          fetch('/api/export/pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pngBase64 })
          })
          .then((res) => {
            if (!res.ok) throw new Error();
            return res.blob();
          })
          .then((blob) => resolve(blob))
          .catch(() => resolve(null));
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
    if (!requerente || !requerente.nome) {
      const resp = await confirmar({
        titulo: 'Requerimento com dados incompletos',
        mensagem: 'Os dados do requerente no Requerimento ainda não foram preenchidos. Deseja abrir o formulário para completá-los antes de baixar o pacote de entrega?',
        okLabel: 'Abrir Formulário',
        cancelLabel: 'Baixar assim mesmo'
      });
      if (resp) {
        setReqAberto(true);
        return;
      }
    }
    setProcessando(true);
    aviso('Montando o pacote de entrega (memorial, planilha, requerimento e planta)…');
    try {
      const vs = await comCodigos();
      const r = calcular(vs, confrontantePorLado);
      const ef = valoresEfetivos(r, imovel);
      const nome = imovel.denominacao || nomeProjeto || 'imovel';
      const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
      };

      const headers = await getAuthHeaders();
      const resMemorial = await fetch('/api/export/memorial', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          res: r,
          imovel,
          tecnico,
          confrontantes,
          confrontantePorLado,
          dataExtenso: dataPorExtenso(),
          requerente,
          transmitente,
          partesAdicionais
        })
      });
      if (!resMemorial.ok) throw new Error('Falha ao gerar memorial no servidor.');
      const memorialBlob = await resMemorial.blob();
      const memorial = await compatibilizarWord2007(memorialBlob);

      const modeloProprio = await carregarModeloSigef();
      const modeloProprioBase64 = modeloProprio ? arrayBufferToBase64(modeloProprio) : undefined;
      const ativa = glebas.find((g) => g.id === glebaAtivaId);
      
      const resOds = await fetch('/api/export/ods', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tipo: 'unica',
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
          }] : undefined,
          modeloProprioBase64
        })
      });
      if (!resOds.ok) throw new Error('Falha ao gerar planilha no servidor.');
      const ods = await resOds.blob();

      const propComoParte: PessoaQualificada = { ...PESSOA_VAZIA, nome: imovel.proprietario || '—', cpf: imovel.cpfProprietario || '', cidadeUf: imovel.municipio || '' };
      const padroes = carregarPadroes();
      const comarca = padroes.comarcaPadrao || imovel.municipio || '—';
      
      const resReq = await fetch('/api/export/requerimento', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          imovel,
          tecnico,
          requerente: requerente ?? propComoParte,
          transmitente: transmitente ?? propComoParte,
          areaRealHa: ef.areaHa,
          dataExtenso: dataPorExtenso(),
          tipoAto,
          partesAdicionais,
          comarca
        })
      });
      if (!resReq.ok) throw new Error('Falha ao gerar requerimento no servidor.');
      const reqBlob = await resReq.blob();
      const requerimento = await compatibilizarWord2007(reqBlob);
      const planta = await gerarPlantaPdfBlob();
      const zip = new JSZip();
      zip.file(`Memorial - ${nome}.docx`, memorial);
      zip.file(`SIGEF - ${nome}.ods`, ods);
      zip.file(`Requerimento - ${nome}.docx`, requerimento);
      if (planta) zip.file(`Planta - ${nome}.pdf`, planta);
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, limparNomeArquivo(`Pacote de entrega - ${nome}.zip`));
      setBaixou((b) => ({ ...b, memorial: true, ods: true, req: true, planta: planta ? true : b.planta }));
      aviso(planta ? 'Pacote de entrega gerado com todas as peças.' : 'Pacote gerado (a planta falhou ao rasterizar — gere-a à parte).');
    } catch (e) { aviso((e as Error).message || 'Erro ao montar o pacote.'); }
    finally { setProcessando(false); }
  }

  async function importarReferenciaGeoJson(file: File) {
    const v = validarTamanhoArquivo(file);
    if (!v.ok) { aviso(v.erro); return; }
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
    const v = validarTamanhoArquivo(file);
    if (!v.ok) { aviso(v.erro); return; }
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
  // Só CSV/TXT — o GML foi removido daqui (o parser regex de GML por nó travava a aba em arquivos
  // grandes; a importação da PROPRIEDADE do usuário via GML continua existindo em processarImportacao,
  // agora com o parser reescrito de forma segura). CSV é o método mais fácil mesmo, então simplificar
  // pra só ele reduz a instrução na tela sem perder nada que valesse a pena manter.
  async function importarVerticesVizinho(file: File) {
    const v = validarTamanhoArquivo(file);
    if (!v.ok) { aviso(v.erro); return; }
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
            ...(l.sigmaZ != null ? { sigmaZ: l.sigmaZ } : {}),
            ...(l.metodo ? { metodo: l.metodo } : {}),
            origem,
          };
        });
      if (!lidos.length) { aviso('Nenhum vértice com nome/código reconhecido neste arquivo CSV. Confira o mapeamento de colunas em Configurações → Importação e Modelos.'); return; }

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
        return {
          ...v,
          codigoSigef: melhor.nome,
          nome: melhor.nome,
          codigoCampo: melhor.nome,
          lat: melhor.lat,
          lon: melhor.lon,
          leste: melhor.leste,
          norte: melhor.norte,
          elevacao: melhor.elevacao ?? v.elevacao,
          sigmaX: melhor.sigmaX ?? v.sigmaX,
          sigmaY: melhor.sigmaY ?? v.sigmaY,
          sigmaZ: melhor.sigmaZ ?? v.sigmaZ,
          metodo: melhor.metodo || v.metodo,
          tipo: (melhor.nome.split(/[-_]/).includes('M') ? 'M' : (melhor.nome.split(/[-_]/).includes('V') ? 'V' : 'P')) as TipoVertice,
          isDivisa: melhor.nome.split(/[-_]/).includes('M'),
          registrado: true
        };
      });
      if (adotados) { snap(); setVertices(novos); }
      setSnapAtivo(true); // deixa o encaixe ligado: arrastar um vértice meu gruda no ponto do vizinho

      const partes = [];
      if (guardados) partes.push(`${guardados} vértice(s) do vizinho guardado(s) para a planta`);
      if (adotados) partes.push(`${adotados} do seu perímetro adotaram o código oficial`);
      const resumo = partes.length ? `${partes.join('; ')}.` : 'Esses vértices do vizinho já estavam guardados.';
      aviso(resumo);
    } catch { aviso('Não consegui ler o arquivo CSV de vértices do vizinho.'); }
  }

  // As funções de "corrigir lat/lon do CSV" e "corrigir precisão reimportando TXT" foram
  // consolidadas em src/lib/topo/correcaoPrecisao.ts (com preview + melhor tolerância). Os
  // botões do menu SIGEF agora abrem o PlanilhaConferenciaModal / ModalSpreadsheet que
  // disponibilizam a feature via UI única.

  /**
   * Corrige lat/lon dos vértices do polígono principal usando o CSV dos Vértices do SIGEF,
   * cruzando pelo codigoSigef. Preserva confrontantePorLado, glebas e todos os demais dados.
   * Diferente de "Corrigir precisão do TXT" (que casa por proximidade UTM): aqui a chave
   * é o código SIGEF — o usuário já tem o CSV oficial com a coordenada geográfica correta
   * do vértice certificado e quer injetar lat/lon direto, sem mexer em E/N.
   */
  async function corrigirLatLonDoCSV(file: File) {
    try {
      const buf = await file.arrayBuffer();
      const texto = new TextDecoder('windows-1252').decode(buf);
      const cfg = carregarImportVerticesVizinho();
      const lidos = parseVerticesVizinho(texto, cfg, zona, hemisferio).filter((l) => l.nome);
      if (!lidos.length) { aviso('Nenhum vértice reconhecido no CSV. Confira o mapeamento em Configurações → Importação.'); return; }

      // Índice por codigoSigef para busca O(1)
      const mapaCSV = new Map(lidos.map((l) => [l.nome.toUpperCase(), l]));

      let corrigidos = 0;
      const novos = vertices.map((v) => {
        const chave = (v.codigoSigef || v.nome || '').toUpperCase();
        const csv = mapaCSV.get(chave);
        if (!csv) return v;
        // Verifica que a coordenada realmente mudou antes de contar
        if (Math.abs(csv.lat - v.lat) < 1e-12 && Math.abs(csv.lon - v.lon) < 1e-12) return v;
        corrigidos++;
        return { ...v, lat: csv.lat, lon: csv.lon };
      });

      if (!corrigidos) {
        aviso('Nenhum vértice do projeto foi encontrado no CSV (verifique se os códigos SIGEF batem com os do arquivo).');
        return;
      }
      snap();
      setVertices(novos);
      aviso(`lat/lon corrigidos em ${corrigidos} vértice(s) com base no CSV dos Vértices. Confrontantes preservados.`);
    } catch { aviso('Nao foi possivel ler o CSV dos Vertices.'); }
  }

  async function importarVizinhosCertificados(file: File) {
    const v = validarTamanhoArquivo(file);
    if (!v.ok) { aviso(v.erro); return; }
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
      if (vizinhas.length) {
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
          codigoImovel: p.codigoImovel,
        }))]);
      }
      setSigefStatus('enviado');
      aviso(`${parcelas.length} parcela(s) de vizinho(s) importada(s) como referência visual.`);
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
      let falhas = 0;
      const totalConsultas = ufsAlvo.length * TEMAS_CONFRONTANTE.length;
      for (const uf of ufsAlvo) {
        for (const base of TEMAS_CONFRONTANTE) {
          const t = temaIncra(base, uf);
          try {
            const r = await fetch(`/api/vizinhos-sigef?tema=${t}&bbox=${encodeURIComponent(bbox)}`);
            const j = await r.json();
            if (Array.isArray(j.parcelas)) todas.push(...j.parcelas);
            else { falhas++; console.error(`[SIGEF] resposta sem parcelas para tema=${t}:`, j); }
          } catch (e) { falhas++; console.error(`[SIGEF] falha ao consultar tema=${t}:`, e); }
        }
      }
      if (!todas.length) {
        // Diferencia "consultamos tudo e não há nada" de "as consultas falharam" — sem isso a
        // mesma frase genérica cobria os dois casos e escondia problema de rede/INCRA fora do ar.
        aviso(falhas > 0
          ? `${falhas} de ${totalConsultas} consultas ao INCRA falharam, e as demais não trouxeram parcelas. Tente de novo em instantes, ou use o import manual.`
          : `Nenhuma parcela certificada encontrada nesta região (a busca automática hoje cobre MG, ES e RJ). Tente o import manual.`);
        return;
      }
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
        codigoImovel: p.codigoImovel,
      }))]);
      setSigefStatus('enviado');
      aviso(`${vizinhas.length} vizinho(s) certificado(s) encontrado(s) e importado(s) como referência visual.`);
    } catch (e) {
      console.error('[SIGEF] falha inesperada em importarVizinhosAuto:', e);
      aviso('Não consegui consultar o INCRA agora. Use o import manual (arquivo GeoJSON).');
    } finally { setProcessando(false); }
  }

  const [intervaloCurva, setIntervaloCurva] = useState(5);
  const [curvaCorAuto, setCurvaCorAuto] = useState(true); // cor automática: branca no mapa, cinza na planta
  const [curvaCorFina, setCurvaCorFina] = useState(COR_CURVA_NIVEL);
  const [curvaCorMestra, setCurvaCorMestra] = useState(COR_CURVA_NIVEL);
  const [curvaMestraCada, setCurvaMestraCada] = useState(3); // linha mais forte a cada N curvas
  const [curvaEspessura, setCurvaEspessura] = useState<'fina' | 'media' | 'grossa'>('media');
  const [curvaEstiloMestra, setCurvaEstiloMestra] = useState<'solido' | 'tracejado' | 'pontilhado'>('solido');
  const [curvaEstiloNormal, setCurvaEstiloNormal] = useState<'solido' | 'tracejado' | 'pontilhado'>('solido');
  const [curvaConfigAberta, setCurvaConfigAberta] = useState(false);
  const [abaCurva, setAbaCurva] = useState<'geracao' | 'estilo'>('geracao');
  const [ajusteAltCm, setAjusteAltCm] = useState('');
  const [desconsiderarVerticesLevantados, setDesconsiderarVerticesLevantados] = useState(false);
  const [incluirDivisaNasCurvas, setIncluirDivisaNasCurvas] = useState(true);
  const [gradeDensidadeMetros, setGradeDensidadeMetros] = useState(30); // 30m = Nativo Satélite (Copernicus DEM 30m)
  const [altitudeModalAberta, setAltitudeModalAberta] = useState(false);
  const [modeloElevacao, setModeloElevacao] = useState<'copernicus_dem_30' | 'alos_dem_30' | 'srtm_gld3'>('copernicus_dem_30');
  const [glebaCurvaAlvo, setGlebaCurvaAlvo] = useState<string>('todas');
  const [curvaUsarTriangulacao, setCurvaUsarTriangulacao] = useState<boolean>(false); // padrão: dados online (não triangulação local)

  useEffect(() => {
    if (curvaConfigAberta && vertices.length > 0) {
      const latsLons = vertices.map((v) => ({ lat: v.lat, lon: v.lon }));
      obterAltitudesLote(latsLons).catch(() => {});
    }
  }, [curvaConfigAberta, vertices]);

  function ajustarAltitudesGlobais(cm: number) {
    if (!cm || isNaN(cm)) return;
    snap();
    const deltaMeters = cm / 100;
    setVertices((vs) =>
      vs.map((v) => ({
        ...v,
        elevacao: +((v.elevacao ?? 0) + deltaMeters).toFixed(4),
      }))
    );
    setVerticesIgnorados((vs) =>
      vs.map((v) => ({
        ...v,
        elevacao: +((v.elevacao ?? 0) + deltaMeters).toFixed(4),
      }))
    );
    aviso(`Ajuste de ${cm > 0 ? '+' : ''}${cm}cm applied to all points.`);
  }

  // Espessura (mm de tela) da curva normal e da mestra, por nível de nitidez escolhido.
  const ESP_CURVA = { fina: { normal: 0.5, mestra: 1.1 }, media: { normal: 0.7, mestra: 1.5 }, grossa: { normal: 1.0, mestra: 2.1 } } as const;

  // Obtém uma função de calibração altimétrica IDW espacial entre RTK medido em campo e o DEM online.
  // Evita vales e distorções quando o terreno possui inclinação e variação de datum vertical entre a base e o RTK.
  function obterFuncaoOffsetEspacial(
    activeVertices = vertices,
    activeGrade = gradeAltimetrica,
    activeIgnorados = verticesIgnorados
  ): (x: number, y: number) => number {
    if (desconsiderarVerticesLevantados) return () => 0;

    const diffs: { x: number; y: number; diff: number }[] = [];

    const vtxsComElev = [...activeVertices, ...activeIgnorados].filter(
      (v) => v.elevacao && Math.abs(v.elevacao) > 0.001 && v.tipo !== 'V' && !v.elevacaoInterpolada
    );

    for (const v of vtxsComElev) {
      const latLonKey = `${v.lat.toFixed(6)},${v.lon.toFixed(6)}`;
      const onlineZ = verticesOnlineElev[`${modeloElevacao}:${v.id}`] ??
                      verticesOnlineElev[v.id] ??
                      verticesOnlineElev[`${modeloElevacao}:${latLonKey}`] ??
                      verticesOnlineElev[latLonKey];
      
      let targetZ: number | null = (onlineZ && Math.abs(onlineZ) > 0.001) ? onlineZ : null;

      if (targetZ === null && activeGrade.length > 0) {
        let minD2 = Infinity;
        for (const g of activeGrade) {
          const dx = v.leste - g.leste;
          const dy = v.norte - g.norte;
          const d2 = dx * dx + dy * dy;
          if (d2 < minD2 && d2 < 10000) { // dentro de 100m
            minD2 = d2;
            targetZ = g.elevacao;
          }
        }
      }

      if (targetZ !== null && Math.abs(targetZ) > 0.001) {
        diffs.push({ x: v.leste, y: v.norte, diff: v.elevacao! - targetZ });
      }
    }

    if (diffs.length === 0) return () => 0;
    if (diffs.length === 1) return () => diffs[0].diff;

    return (leste: number, norte: number) => {
      let sumW = 0, sumZ = 0;
      let minD2 = Infinity;
      let closestDiff = diffs[0].diff;

      for (const d of diffs) {
        const dist2 = (leste - d.x) ** 2 + (norte - d.y) ** 2;
        if (dist2 < minD2) {
          minD2 = dist2;
          closestDiff = d.diff;
        }
        if (dist2 < 1) return d.diff;
        // Ponderação espacial por distância inversa (p=2) com epsilon 0.1
        const w = 1 / (dist2 + 0.1);
        sumW += w;
        sumZ += d.diff * w;
      }
      return sumW > 0 ? sumZ / sumW : closestDiff;
    };
  }

  // Função auxiliar para calcular o offset médio (mantida para retrocompatibilidade)
  function calcularOffsetMedioRTKDEM(
    activeVertices = vertices,
    activeGrade = gradeAltimetrica,
    activeIgnorados = verticesIgnorados
  ): number {
    const getOffset = obterFuncaoOffsetEspacial(activeVertices, activeGrade, activeIgnorados);
    if (activeGrade.length > 0) {
      let sum = 0;
      for (const g of activeGrade) sum += getOffset(g.leste, g.norte);
      return sum / activeGrade.length;
    }
    const v = activeVertices.find((v) => v.leste && v.norte);
    return v ? getOffset(v.leste, v.norte) : 0;
  }

  // Junta os pontos com altitude (perímetro + ignorados/internos + grade digital online) no plano UTM — base pra sugerir e gerar.
  function pontos3dCurvas(
    gradeOverride?: typeof gradeAltimetrica,
    verticesOverride?: typeof vertices,
    ignoradosOverride?: typeof verticesIgnorados
  ): Ponto3D[] {
    const activeGrade = gradeOverride || gradeAltimetrica;
    const activeVertices = verticesOverride || vertices;
    const activeIgnorados = ignoradosOverride || verticesIgnorados;

    const getOffsetEspacial = obterFuncaoOffsetEspacial(activeVertices, activeGrade, activeIgnorados);

    const ptsGrade = activeGrade.map((g) => ({
      x: g.leste,
      y: g.norte,
      z: g.elevacao + getOffsetEspacial(g.leste, g.norte)
    }));

    const pts = [...(incluirDivisaNasCurvas ? activeVertices : []), ...activeIgnorados]
          .map((v) => {
            const hasRTK = v.elevacao && Math.abs(v.elevacao) > 0.001;
            let z = v.elevacao;
            if (desconsiderarVerticesLevantados || !hasRTK) {
              const latLonKey = `${v.lat.toFixed(6)},${v.lon.toFixed(6)}`;
              const onlineZ = verticesOnlineElev[`${modeloElevacao}:${v.id}`] ??
                              verticesOnlineElev[v.id] ??
                              verticesOnlineElev[`${modeloElevacao}:${latLonKey}`] ??
                              verticesOnlineElev[latLonKey];
              const offsetLocal = getOffsetEspacial(v.leste, v.norte);
              z = (onlineZ && Math.abs(onlineZ) > 0.001) ? (onlineZ + offsetLocal) : (v.elevacao ? v.elevacao : 0);
            }
            return { x: v.leste, y: v.norte, z };
          })
          .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z) && p.z !== 0);
    const total = [...pts, ...ptsGrade];
    const vistos = new Set<string>();
    return total.filter((p) => {
      const k = `${p.x.toFixed(3)},${p.y.toFixed(3)}`;
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    });
  }
  // Preenche o intervalo com a sugestão pelo desnível (evita o emaranhado do padrão fixo).
  function sugerirIntervaloCurva() {
    const pts = pontos3dCurvas();
    if (pts.length >= 2) setIntervaloCurva(intervaloSugerido(pts));
  }

  // Gera curvas de nível AUTOMATICAMENTE: calcula o espaçamento da grade e o intervalo ótimos
  // para ESTE imóvel (baseado na diagonal/área do polígono) e depois dispara a geração completa.
  // Chamado pelo botão "Gerar Curvas de Nível" no viewer 3D.
  // Implementado de forma auto-contida para contornar a closure dos estados React.
  async function gerarCurvasNivelAuto() {
    if (vertices.length < 3) {
      aviso('Importe os pontos do levantamento antes de gerar curvas de nível.');
      return;
    }
    // Calcula parâmetros ótimos para este imóvel
    const spacingIdeal = calcularEspacamentoGradeAuto(vertices);
    setGradeDensidadeMetros(spacingIdeal);
    setCurvaUsarTriangulacao(false);
    // Gera nova grade de altitude, ignorando cache antigo
    setGradeAltimetrica([]);
    setProcessando(true);
    aviso('Calculando grade de altitudes ideal para este imóvel (dados online)...');
    try {
      const candidatos = gerarGradePontosUTM(vertices, spacingIdeal);
      const queryPoints = [...candidatos];
      vertices.forEach(v => { queryPoints.push({ lat: v.lat, lon: v.lon, leste: v.leste, norte: v.norte }); });
      verticesIgnorados.forEach(v => { queryPoints.push({ lat: v.lat, lon: v.lon, leste: v.leste, norte: v.norte }); });
      const resAltitudes = await obterAltitudesLote(queryPoints);
      const pontosObtidos: typeof gradeAltimetrica = [];
      for (const cand of candidatos) {
        const key = `${cand.lat.toFixed(6)},${cand.lon.toFixed(6)}`;
        const elev = resAltitudes[key];
        if (elev !== undefined) {
          pontosObtidos.push({ lat: cand.lat, lon: cand.lon, leste: cand.leste, norte: cand.norte, elevacao: elev });
        }
      }
      if (pontosObtidos.length === 0) {
        aviso('Não foi possível obter dados de altitude online. Verifique a conexão com a internet.');
        return;
      }
      const pontosSuavizados = suavizarGradeAltimetrica(pontosObtidos, spacingIdeal);
      setGradeAltimetrica(pontosSuavizados);
      aviso(`Grade de ${pontosSuavizados.length} pontos obtida. Gerando curvas de nível...`);
      // Monta os pontos 3D usando a grade recém-obtida e ajustada pela calibração espacial IDW RTK-DEM (bypass de closure)
      const getOffsetEspacialAuto = obterFuncaoOffsetEspacial(vertices, pontosSuavizados, verticesIgnorados);
      const ptsGrade = pontosSuavizados.map((g) => ({ x: g.leste, y: g.norte, z: g.elevacao + getOffsetEspacialAuto(g.leste, g.norte) }));
      const ptsVertices = [...vertices, ...verticesIgnorados]
        .map((v) => ({ x: v.leste, y: v.norte, z: v.elevacao }))
        .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z) && p.z !== 0);
      const pts3d = [...ptsVertices, ...ptsGrade];
      if (pts3d.length < 4) {
        aviso('Pontos insuficientes com altitude para gerar curvas. Tente um espaçamento menor.');
        return;
      }
      const zs = pts3d.map(p => p.z); void zs; // usado apenas para debug se necessário
      const intervaloAuto = intervaloSugerido(pts3d);
      setIntervaloCurva(intervaloAuto);
      const poligono = vertices.length >= 3 ? vertices.map(v => ({ x: v.leste, y: v.norte })) : undefined;
      const poligonos = undefined;
      const { gerarCurvasDeNivel } = await import('@/lib/topo/curvasNivel');
      const curvas = gerarCurvasDeNivel(pts3d, {
        intervalo: intervaloAuto,
        poligono,
        poligonos,
        usarTriangulacao: false,
        passosSuavizacao: 2,
      });
      if (!curvas.length) {
        aviso('Não consegui traçar curvas com esses pontos. Tente um intervalo menor nas configurações de Curvas de Nível.');
        return;
      }
      const niveis = [...new Set(curvas.map((c) => c.nivel))];
      const cadaN = Math.max(1, Math.round(curvaMestraCada));
      const passoMestra = intervaloAuto * cadaN;
      const esp = ESP_CURVA[curvaEspessura];
      const objs = curvas.map((c) => {
        const mestra = Math.abs(c.nivel / passoMestra - Math.round(c.nivel / passoMestra)) < 1e-6;
        const pontos = c.linha.map((p) => { const g = utmParaGeo(p.x, p.y, zona, hemisferio); return { lat: g.lat, lon: g.lon, leste: p.x, norte: p.y }; });
        return novaCurvaNivel(pontos, c.nivel, mestra, {
          cor: curvaCorAuto ? COR_CURVA_AUTO : (mestra ? curvaCorMestra : curvaCorFina),
          espessura: mestra ? esp.mestra : esp.normal,
          estiloLinha: mestra ? curvaEstiloMestra : curvaEstiloNormal,
          tracejado: (mestra ? curvaEstiloMestra : curvaEstiloNormal) === 'tracejado'
        });
      });
      setObjetos((os) => [...os.filter((o) => o.curvaNivel == null), ...objs]);
      aviso(`${objs.length} curvas de nível geradas em ${niveis.length} níveis (intervalo ${intervaloAuto}m). Voltando ao mapa.`);
      setVista('mapa');
    } catch (e) {
      console.error('[gerarCurvasNivelAuto] Erro:', e);
      aviso('Erro ao gerar curvas de nível automaticamente. Verifique o console para detalhes.');
    } finally {
      setProcessando(false);
    }
  }

  // Suavização espacial Gaussiana para eliminar degraus de pixel (pixel step artifact) em dados DEM de 30m
  function suavizarGradeAltimetrica(
    pts: { lat: number; lon: number; leste: number; norte: number; elevacao: number }[],
    spacing: number
  ): { lat: number; lon: number; leste: number; norte: number; elevacao: number }[] {
    if (pts.length < 4) return pts;
    const sigma = Math.max(15, spacing * 0.9);
    const twoSigma2 = 2 * sigma * sigma;

    return pts.map((p) => {
      let weightSum = 0;
      let elevSum = 0;
      for (let j = 0; j < pts.length; j++) {
        const q = pts[j];
        const dx = p.leste - q.leste;
        const dy = p.norte - q.norte;
        const dist2 = dx * dx + dy * dy;
        if (dist2 > (spacing * 3.5) ** 2) continue; // busca vizinhos em até 3.5 espaçamentos
        const w = Math.exp(-dist2 / twoSigma2);
        weightSum += w;
        elevSum += q.elevacao * w;
      }
      const smoothedElev = weightSum > 0 ? elevSum / weightSum : p.elevacao;
      return { ...p, elevacao: +smoothedElev.toFixed(2) };
    });
  }

  function calcularEspacamentoGradeAuto(vs: typeof vertices): number {
    if (vs.length < 3) return 25;
    const nestes = vs.map((v) => v.leste);
    const nortes = vs.map((v) => v.norte);
    const minLeste = Math.min(...nestes), maxLeste = Math.max(...nestes);
    const minNorte = Math.min(...nortes), maxNorte = Math.max(...nortes);
    const dx = maxLeste - minLeste;
    const dy = maxNorte - minNorte;
    const diagonal = Math.hypot(dx, dy); // diagonal do imóvel em metros
    if (diagonal < 200) return 20;
    if (diagonal < 500) return 25;
    if (diagonal < 1200) return 35;
    return Math.max(40, Math.round(diagonal / 50));
  }

  function gerarGradePontosUTM(vs: typeof vertices, spacing: number): { lat: number; lon: number; leste: number; norte: number }[] {
    if (vs.length < 3) return [];
    // Impõe limite mínimo razoável de 15m para dados DEM de 30m (evita duplicar pixels e criar escadas)
    const effectiveSpacing = Math.max(15, spacing || 20);
    const nestes = vs.map((v) => v.leste);
    const nortes = vs.map((v) => v.norte);
    const minLeste = Math.min(...nestes), maxLeste = Math.max(...nestes);
    const minNorte = Math.min(...nortes), maxNorte = Math.max(...nortes);

    let currentSpacing = effectiveSpacing;
    let numX = Math.ceil((maxLeste - minLeste) / currentSpacing);
    let numY = Math.ceil((maxNorte - minNorte) / currentSpacing);
    while (numX * numY > 800) {
      currentSpacing += 2;
      numX = Math.ceil((maxLeste - minLeste) / currentSpacing);
      numY = Math.ceil((maxNorte - minNorte) / currentSpacing);
      if (currentSpacing > 10000) break;
    }

    const candidatos: { lat: number; lon: number; leste: number; norte: number }[] = [];
    const poly = vs.map(v => ({ x: v.leste, y: v.norte }));
    const jitterMax = currentSpacing * 0.12;

    for (let x = minLeste; x <= maxLeste; x += currentSpacing) {
      for (let y = minNorte; y <= maxNorte; y += currentSpacing) {
        // PseudoJitter determinístico derivado das coordenadas para garantir 100% de cache na API
        const hash1 = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const hash2 = Math.cos(x * 4.1414 + y * 93.111) * 23421.1234;
        const r1 = hash1 - Math.floor(hash1) - 0.5;
        const r2 = hash2 - Math.floor(hash2) - 0.5;
        const px = x + r1 * jitterMax;
        const py = y + r2 * jitterMax;

        if (pontoNoPoligono(px, py, poly)) {
          const geo = utmParaGeo(px, py, zona, hemisferio);
          candidatos.push({ lat: geo.lat, lon: geo.lon, leste: px, norte: py });
        }
      }
    }

    return candidatos;
  }

  async function obterAltitudesLote(pontos: { lat: number; lon: number }[]): Promise<Record<string, number>> {
    const localCache: Record<string, number> = {};
    const aBuscar: { lat: number; lon: number; key: string; cacheKey: string }[] = [];

    for (const p of pontos) {
      const key = `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;
      const cacheKey = `${modeloElevacao}:${key}`;
      if (verticesOnlineElev[cacheKey] !== undefined) {
        localCache[key] = verticesOnlineElev[cacheKey];
      } else {
        if (!aBuscar.some(x => x.key === key)) {
          aBuscar.push({ lat: p.lat, lon: p.lon, key, cacheKey });
        }
      }
    }

    if (aBuscar.length > 0) {
      const BATCH_SIZE = 100; // reduzido de 150 para evitar URLs muito longas
      const globalUpdates: Record<string, number> = {};
      for (let i = 0; i < aBuscar.length; i += BATCH_SIZE) {
        const batch = aBuscar.slice(i, i + BATCH_SIZE);
        const latsStr = batch.map(c => c.lat.toFixed(6)).join(',');
        const lonsStr = batch.map(c => c.lon.toFixed(6)).join(',');
        try {
          const resApi = await fetch(
            `https://api.open-meteo.com/v1/elevation?latitude=${latsStr}&longitude=${lonsStr}`,
            { signal: AbortSignal.timeout(15000) }
          );
          if (!resApi.ok) {
            console.warn(`[Altitude] HTTP ${resApi.status} no batch ${i / BATCH_SIZE + 1}`);
            continue;
          }
          const data = await resApi.json() as { elevation?: number[]; error?: boolean; reason?: string };
          if (data.error) {
            console.warn('[Altitude] Erro da API:', data.reason);
            continue;
          }
          if (!data || !Array.isArray(data.elevation)) {
            console.warn('[Altitude] Formato de resposta inesperado:', data);
            continue;
          }
          batch.forEach((c, idx) => {
            const elevOrtometrica = data.elevation![idx];
            if (Number.isFinite(elevOrtometrica)) {
              // Open-Meteo retorna Altitude Ortométrica H (DEM). Para manter compatibilidade com
              // o receptor GNSS/RTK (SIRGAS 2000), convertemos H -> h (Altitude Elipsoidal) via MAPGEO: h = H + N.
              const nMapgeo = calcularOndulacaoGeoidalMAPGEO(c.lat, c.lon);
              const elevElipsoidal = ortometricaParaElipsoidal(elevOrtometrica, nMapgeo);
              localCache[c.key] = elevElipsoidal;
              globalUpdates[c.cacheKey] = elevElipsoidal;
            }
          });
        } catch (err) {
          console.error(`[Altitude] Erro ao buscar batch ${i / BATCH_SIZE + 1}:`, err);
          // continua com os próximos batches mesmo se um falhar
        }
      }
      // Atualiza o cache global
      if (Object.keys(globalUpdates).length > 0) {
        setVerticesOnlineElev(prev => ({ ...prev, ...globalUpdates }));
      }
    }

    return localCache;
  }

  // Gera as CURVAS DE NÍVEL: triangula os pontos medidos, extrai as isolinhas no intervalo escolhido,
  // recorta ao polígono do imóvel e aplica os ajustes da engrenagem (cor, espessura, mestra a cada N).
  async function gerarCurvasNivel() {
    let activeGrade = gradeAltimetrica;
    let activeVertices = vertices;
    let activeIgnorados = verticesIgnorados;
    if (gradeAltimetrica.length === 0 && vertices.length >= 3) {
      setProcessando(true);
      aviso('Buscando grade de altitudes oficiais do terreno (Copernicus DEM)...');
      try {
        const spacing = gradeDensidadeMetros > 0 ? gradeDensidadeMetros : calcularEspacamentoGradeAuto(vertices);
        const candidatos = gerarGradePontosUTM(vertices, spacing);

        const queryPoints = [...candidatos];
        vertices.forEach(v => {
          if (desconsiderarVerticesLevantados || !v.elevacao) {
            queryPoints.push({ lat: v.lat, lon: v.lon, leste: v.leste, norte: v.norte });
          }
        });
        verticesIgnorados.forEach(v => {
          if (desconsiderarVerticesLevantados || !v.elevacao) {
            queryPoints.push({ lat: v.lat, lon: v.lon, leste: v.leste, norte: v.norte });
          }
        });

        // Executa a busca em lote com cache integrado
        const resAltitudes = await obterAltitudesLote(queryPoints);

        const pontosObtidos: typeof gradeAltimetrica = [];
        for (const cand of candidatos) {
          const key = `${cand.lat.toFixed(6)},${cand.lon.toFixed(6)}`;
          const elev = resAltitudes[key];
          if (elev !== undefined) {
            pontosObtidos.push({
              lat: cand.lat,
              lon: cand.lon,
              leste: cand.leste,
              norte: cand.norte,
              elevacao: elev
            });
          }
        }

        if (pontosObtidos.length > 0) {
          const pontosSuavizados = suavizarGradeAltimetrica(pontosObtidos, spacing);
          setGradeAltimetrica(pontosSuavizados);
          activeGrade = pontosSuavizados;
          aviso(`Grade de relevo ativada com ${pontosSuavizados.length} pontos de altitude online. Clique em [Gerar] para traçar as curvas.`);
        } else {
          aviso('Não foi possível obter dados de altitude online. Verifique a conexão com a internet ou tente novamente em instantes.');
        }

        // Atualiza os vértices sem altitude (ou todos se desconsiderar for true)
        let mudouVertice = false;
        const novosVertices = vertices.map(v => {
          if (desconsiderarVerticesLevantados || !v.elevacao) {
            const key = `${v.lat.toFixed(6)},${v.lon.toFixed(6)}`;
            const elev = resAltitudes[key];
            if (elev !== undefined) {
              mudouVertice = true;
              return { ...v, elevacao: +elev.toFixed(4) };
            }
          }
          return v;
        });

        // Atualiza os ignorados
        let mudouIgnorados = false;
        const novosIgnorados = verticesIgnorados.map(v => {
          if (desconsiderarVerticesLevantados || !v.elevacao) {
            const key = `${v.lat.toFixed(6)},${v.lon.toFixed(6)}`;
            const elev = resAltitudes[key];
            if (elev !== undefined) {
              mudouIgnorados = true;
              return { ...v, elevacao: +elev.toFixed(4) };
            }
          }
          return v;
        });

        // Também popula os IDs dos vértices no verticesOnlineElev para manter compatibilidade com
        // desconsiderarVerticesLevantados que consome diretamente verticesOnlineElev[v.id]
        const mapOnline: Record<string, number> = {};
        novosVertices.forEach(v => {
          const key = `${v.lat.toFixed(6)},${v.lon.toFixed(6)}`;
          const elev = resAltitudes[key];
          if (elev !== undefined) {
            mapOnline[v.id] = +elev.toFixed(4);
            mapOnline[`${modeloElevacao}:${v.id}`] = +elev.toFixed(4);
          }
        });
        novosIgnorados.forEach(v => {
          const key = `${v.lat.toFixed(6)},${v.lon.toFixed(6)}`;
          const elev = resAltitudes[key];
          if (elev !== undefined) {
            mapOnline[v.id] = +elev.toFixed(4);
            mapOnline[`${modeloElevacao}:${v.id}`] = +elev.toFixed(4);
          }
        });
        setVerticesOnlineElev(prev => ({ ...prev, ...mapOnline }));

        const totalMudados = (mudouVertice ? novosVertices.filter((v, idx) => v.elevacao !== vertices[idx].elevacao).length : 0) +
                             (mudouIgnorados ? novosIgnorados.filter((v, idx) => v.elevacao !== verticesIgnorados[idx].elevacao).length : 0);

        if (totalMudados > 0) {
          const aceitou = await confirmar({
            titulo: 'Atualizar altitudes dos vértices',
            mensagem: `Encontramos altitudes oficiais online para ${totalMudados} vértice(s) da divisa que estavam sem altitude. Deseja salvar essas altitudes nos vértices do seu projeto?`,
            okLabel: 'Sim, salvar nos vértices',
            cancelLabel: 'Não, usar apenas para as curvas'
          });
          if (aceitou) {
            if (mudouVertice) setVertices(novosVertices);
            if (mudouIgnorados) setVerticesIgnorados(novosIgnorados);
            aviso(`Altitudes de ${totalMudados} vértice(s) atualizadas e salvas com sucesso.`);
          } else {
            aviso('Altitudes não foram salvas nos vértices, mas serão usadas temporariamente para traçar as curvas.');
          }
          activeVertices = mudouVertice ? novosVertices : vertices;
          activeIgnorados = mudouIgnorados ? novosIgnorados : verticesIgnorados;
        }
      } catch (e) {
        console.error('Erro ao adensar relevo automaticamente:', e);
      } finally {
        setProcessando(false);
      }
    }

    const pts3d = pontos3dCurvas(activeGrade, activeVertices, activeIgnorados);
    if (pts3d.length < 4) {
      await avisar({
        titulo: 'Curvas de nível',
        mensagem: 'Preciso de pelo menos 4 pontos com altitude a mais de 1 mm de distância. Importe também os pontos internos do levantamento (não só o perímetro).'
      });
      return;
    }

    // Verifica se todos os pontos estão alinhados em linha reta (colineares)
    let colinear = true;
    const p1 = pts3d[0], p2 = pts3d[1];
    for (let i = 2; i < pts3d.length; i++) {
      const p = pts3d[i];
      const area = Math.abs(p1.x * (p2.y - p.y) + p2.x * (p.y - p1.y) + p.x * (p1.y - p2.y));
      if (area > 1e-4) {
        colinear = false;
        break;
      }
    }
    if (colinear) {
      await avisar({
        titulo: 'Curvas de nível',
        mensagem: 'Os pontos informados estão alinhados em linha reta. São necessários pontos distribuídos em área para traçar curvas de nível.'
      });
      return;
    }

    const zs = pts3d.map((p) => p.z);
    if (Math.max(...zs) - Math.min(...zs) < 0.01) { await avisar({ titulo: 'Curvas de nível', mensagem: 'Os pontos não têm variação de altitude — não há relevo para desenhar curvas.' }); return; }
    if (!(intervaloCurva > 0)) { await avisar({ titulo: 'Curvas de nível', mensagem: 'Escolha um intervalo maior que zero (ex.: 1 m ou 5 m).' }); return; }

    let poligono: { x: number; y: number }[] | undefined = undefined;
    let poligonos: { x: number; y: number }[][] | undefined = undefined;

    if (glebaCurvaAlvo === 'ativa') {
      poligono = vertices.length >= 3 ? vertices.map((v) => ({ x: v.leste, y: v.norte })) : undefined;
    } else if (glebaCurvaAlvo === 'todas') {
      const listaG = glebas.length ? glebas : [{ id: glebaAtivaId, vertices }];
      poligonos = listaG
        .map((g) => (g.id === glebaAtivaId ? vertices : g.vertices))
        .filter((vs) => vs && vs.length >= 3)
        .map((vs) => vs.map((v) => ({ x: v.leste, y: v.norte })));
    }

    const curvas = gerarCurvasDeNivel(pts3d, {
      intervalo: intervaloCurva,
      poligono,
      poligonos,
      usarTriangulacao: curvaUsarTriangulacao,
      passosSuavizacao: 4, // suavização extra para curvas mais fluidas e realistas
    });
    if (!curvas.length) { await avisar({ titulo: 'Curvas de nível', mensagem: 'Não consegui traçar curvas com esses pontos e intervalo. Tente um intervalo menor ou traga mais pontos internos.' }); return; }

    const cadaN = Math.max(1, Math.round(curvaMestraCada));
    const passoMestra = intervaloCurva * cadaN;
    const esp = ESP_CURVA[curvaEspessura];
    const objs = curvas.map((c) => {
      const mestra = Math.abs(c.nivel / passoMestra - Math.round(c.nivel / passoMestra)) < 1e-6;
      const pontos = c.linha.map((p) => { const g = utmParaGeo(p.x, p.y, zona, hemisferio); return { lat: g.lat, lon: g.lon, leste: p.x, norte: p.y }; });
      return novaCurvaNivel(pontos, c.nivel, mestra, {
        cor: curvaCorAuto ? COR_CURVA_AUTO : (mestra ? curvaCorMestra : curvaCorFina),
        espessura: mestra ? esp.mestra : esp.normal,
        estiloLinha: mestra ? curvaEstiloMestra : curvaEstiloNormal,
        tracejado: (mestra ? curvaEstiloMestra : curvaEstiloNormal) === 'tracejado'
      });
    });
    // remove curvas antigas e coloca as novas (mantém o resto do desenho)
    setObjetos((os) => [...os.filter((o) => o.curvaNivel == null), ...objs]);
    const niveis = [...new Set(curvas.map((c) => c.nivel))];
    await avisar({ titulo: 'Curvas de nível', mensagem: `${objs.length} curva(s) traçada(s) em ${niveis.length} nível(is), de ${Math.min(...niveis)} a ${Math.max(...niveis)} m, intervalo de ${intervaloCurva} m.` });
  }

  function limparCurvasNivel() {
    setObjetos((os) => os.filter((o) => o.curvaNivel == null));
  }

  async function buscarGradeAltitudesOnline() {
    if (vertices.length < 3) { aviso('Defina o perímetro do imóvel primeiro para gerar a grade.'); return; }
    setProcessando(true);
    aviso('Buscando grade de altitudes oficiais do terreno (Copernicus DEM)...');
    try {
      const spacing = gradeDensidadeMetros > 0 ? gradeDensidadeMetros : calcularEspacamentoGradeAuto(vertices);
      const candidatos = gerarGradePontosUTM(vertices, spacing);

      const queryPoints = [...candidatos];
      vertices.forEach(v => {
        if (desconsiderarVerticesLevantados || !v.elevacao) {
          queryPoints.push({ lat: v.lat, lon: v.lon, leste: v.leste, norte: v.norte });
        }
      });
      verticesIgnorados.forEach(v => {
        if (desconsiderarVerticesLevantados || !v.elevacao) {
          queryPoints.push({ lat: v.lat, lon: v.lon, leste: v.leste, norte: v.norte });
        }
      });

      // Executa a busca em lote com cache integrado
      const resAltitudes = await obterAltitudesLote(queryPoints);

      const pontosObtidos: typeof gradeAltimetrica = [];
      for (const cand of candidatos) {
        const key = `${cand.lat.toFixed(6)},${cand.lon.toFixed(6)}`;
        const elev = resAltitudes[key];
        if (elev !== undefined) {
          pontosObtidos.push({
            lat: cand.lat,
            lon: cand.lon,
            leste: cand.leste,
            norte: cand.norte,
            elevacao: elev
          });
        }
      }

      if (!pontosObtidos.length) {
        aviso('Não foi possível obter altitudes válidas para a região.');
      } else {
        setGradeAltimetrica(pontosObtidos);

        // Atualiza os vértices sem altitude (ou todos se desconsiderar for true)
        let mudouVertice = false;
        const novosVertices = vertices.map(v => {
          if (desconsiderarVerticesLevantados || !v.elevacao) {
            const key = `${v.lat.toFixed(6)},${v.lon.toFixed(6)}`;
            const elev = resAltitudes[key];
            if (elev !== undefined) {
              mudouVertice = true;
              return { ...v, elevacao: +elev.toFixed(4) };
            }
          }
          return v;
        });

        // Atualiza os ignorados
        let mudouIgnorados = false;
        const novosIgnorados = verticesIgnorados.map(v => {
          if (desconsiderarVerticesLevantados || !v.elevacao) {
            const key = `${v.lat.toFixed(6)},${v.lon.toFixed(6)}`;
            const elev = resAltitudes[key];
            if (elev !== undefined) {
              mudouIgnorados = true;
              return { ...v, elevacao: +elev.toFixed(4) };
            }
          }
          return v;
        });

        // Também popula os IDs dos vértices no verticesOnlineElev para manter compatibilidade
        const mapOnline: Record<string, number> = {};
        novosVertices.forEach(v => {
          const key = `${v.lat.toFixed(6)},${v.lon.toFixed(6)}`;
          const elev = resAltitudes[key];
          if (elev !== undefined) {
            mapOnline[v.id] = +elev.toFixed(4);
            mapOnline[`${modeloElevacao}:${v.id}`] = +elev.toFixed(4);
          }
        });
        novosIgnorados.forEach(v => {
          const key = `${v.lat.toFixed(6)},${v.lon.toFixed(6)}`;
          const elev = resAltitudes[key];
          if (elev !== undefined) {
            mapOnline[v.id] = +elev.toFixed(4);
            mapOnline[`${modeloElevacao}:${v.id}`] = +elev.toFixed(4);
          }
        });
        setVerticesOnlineElev(prev => ({ ...prev, ...mapOnline }));

        const totalMudados = (mudouVertice ? novosVertices.filter((v, idx) => v.elevacao !== vertices[idx].elevacao).length : 0) +
                             (mudouIgnorados ? novosIgnorados.filter((v, idx) => v.elevacao !== verticesIgnorados[idx].elevacao).length : 0);

        if (totalMudados > 0) {
          const aceitou = await confirmar({
            titulo: 'Atualizar altitudes dos vértices',
            mensagem: `Encontramos altitudes oficiais online para ${totalMudados} vértice(s) da divisa que estavam sem altitude. Deseja salvar essas altitudes nos vértices do seu projeto?`,
            okLabel: 'Sim, salvar nos vértices',
            cancelLabel: 'Não, manter os vértices zerados'
          });
          if (aceitou) {
            if (mudouVertice) setVertices(novosVertices);
            if (mudouIgnorados) setVerticesIgnorados(novosIgnorados);
            aviso(`Altitudes de ${totalMudados} vértice(s) salvas com sucesso.`);
          } else {
            aviso('Vértices mantidos com altitude zerada. A grade de relevo foi ativada com os pontos do adensamento.');
          }
        }

        aviso(`Grade de relevo ativada com ${pontosObtidos.length} pontos de altitude online. Clique em [Gerar] para traçar as curvas.`);
      }
    } catch (e) {
      aviso('Erro ao buscar altitudes: ' + ((e as Error).message || 'serviço indisponível'));
    } finally {
      setProcessando(false);
    }
  }

  // Completa a altitude (cota Z) dos vértices que estão SEM cota, calculando a partir dos pontos que
  // TÊM altitude (vértices medidos, ignorados e a grade de relevo). Nunca sobrepõe cota medida: a base
  // exclui as próprias interpoladas; o alvo é só quem está com cota 0; e o resultado entra marcado como
  // calculado (`elevacaoInterpolada`) e passa pelo histórico (`snap`), então dá pra desfazer.
  async function completarAltitudes() {
    const semCota = vertices.filter((v) => !v.elevacao && Number.isFinite(v.leste) && Number.isFinite(v.norte));
    if (semCota.length === 0) { await avisar({ titulo: 'Completar altitudes', mensagem: 'Todos os vértices já têm altitude.' }); return; }

    const avgOffset = calcularOffsetMedioRTKDEM(vertices, gradeAltimetrica, verticesIgnorados);
    const base: Ponto3D[] = [
      ...[...vertices, ...verticesIgnorados]
        .filter((v) => v.elevacao && !v.elevacaoInterpolada && Number.isFinite(v.leste) && Number.isFinite(v.norte))
        .map((v) => ({ x: v.leste, y: v.norte, z: v.elevacao })),
      ...gradeAltimetrica.map((g) => ({ x: g.leste, y: g.norte, z: g.elevacao + avgOffset })),
    ];
    if (base.length === 0) { await avisar({ titulo: 'Completar altitudes', mensagem: 'Não há nenhum ponto com altitude pra servir de base. Traga pontos com cota (levantamento) ou use a grade de relevo online.' }); return; }

    const estimados = estimarAltitudes(base, semCota.map((v) => ({ x: v.leste, y: v.norte })));
    const validos = estimados.filter((z) => z != null).length;
    if (validos === 0) { await avisar({ titulo: 'Completar altitudes', mensagem: 'Não consegui estimar a altitude desses vértices com os pontos disponíveis.' }); return; }

    // Lista os vértices afetados por nome/código: o teste de "sem cota" (elevação 0) não distingue um
    // vértice que nunca teve altitude medida de um que foi medido com cota LOCAL/ARBITRÁRIA igual a
    // zero (comum quando o RN de referência é definido como 0 por convenção). Mostrar a lista deixa o
    // dono checar visualmente se reconhece algum desses códigos como um ponto de referência de propósito
    // antes de a ferramenta sobrescrever a cota dele com uma estimativa.
    const LIMITE_LISTA = 12;
    const nomesSemCota = semCota.map((v) => v.codigoSigef || v.nome || `V${v.ordem}`);
    const listaTexto = nomesSemCota.length > LIMITE_LISTA
      ? `${nomesSemCota.slice(0, LIMITE_LISTA).join(', ')} e mais ${nomesSemCota.length - LIMITE_LISTA}`
      : nomesSemCota.join(', ');

    const ok = await confirmar({
      titulo: 'Completar altitudes',
      mensagem: `${semCota.length} vértice(s) estão sem altitude: ${listaTexto}.\n\nCalcular a cota deles a partir dos ${base.length} ponto(s) que têm altitude? A cota fica marcada como CALCULADA (não medida) e você pode desfazer.\n\nAtenção: se algum destes já tem cota LOCAL/ARBITRÁRIA de propósito igual a 0,00 (ex.: seu RN de referência), ele será tratado como "sem altitude" e terá o valor SOBRESCRITO — cancele e ajuste manualmente se for o caso.`,
      okLabel: 'Calcular', cancelLabel: 'Cancelar',
    });
    if (!ok) return;

    snap();
    const novaZ = new Map<string, number>();
    semCota.forEach((v, i) => { const z = estimados[i]; if (z != null) novaZ.set(v.id, +z.toFixed(2)); });
    setVertices((vs) => vs.map((v) => (novaZ.has(v.id) ? { ...v, elevacao: novaZ.get(v.id)!, elevacaoInterpolada: true } : v)));
    await avisar({ titulo: 'Completar altitudes', mensagem: `${novaZ.size} vértice(s) receberam altitude calculada. Ela aparece marcada com "~" no 3D; edite manualmente se tiver o valor medido.` });
  }

  const temCurvas = objetos.some((o) => o.curvaNivel != null);

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
    const gs = sincronizarGlebas();
    const temPoligono = gs.some((g) => g.vertices.length >= 3);
    if (!temPoligono) return;

    aviso('Buscando satélite da situação…');
    // todas as glebas (com 3+ vertices), para a situação mostrar os polígonos; e também os
    // polígonos DESENHADOS (polilinha fechada/preenchida) — assim um polígono novo aparece na situação.
    const aneis = [
      ...gs.filter((g) => g.vertices.length >= 3).map((g) => g.vertices.map((v) => ({ lat: v.lat, lon: v.lon }))),
      ...objetos.filter((o) => o.tipo === 'polilinha' && o.preenchido && o.pontos.length >= 3).map((o) => o.pontos.map((p) => ({ lat: p.lat, lon: p.lon }))),
    ];
    // gerarSituacao já garante que a imagem cabe no documento da nuvem (reduz a qualidade sozinha
    // até caber, ou desiste) — antes essa checagem de tamanho era feita SÓ aqui, e uma imagem grande
    // demais era gerada, mostrada na tela e depois descartada em silêncio ao salvar: a situação
    // parecia boa na hora, mas sumia (virava "Situação Indisponível") ao reabrir o projeto.
    const url = await gerarSituacao(aneis);
    if (url) {
      setSituacaoUrl(url);
      setSituacaoVersSnapshot(snapshotDesenho);
      setPlantaConfig((c) => ({ ...c, situacaoDataUrl: url }));
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
    try {
      const vs = await comCodigos();
      const headers = await getAuthHeaders();
      const response = await fetch('/api/export/dxf', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          vertices: vs.map((v) => ({ leste: v.leste, norte: v.norte, codigoSigef: v.codigoSigef, tipo: v.tipo })),
          opts: { zona, hemisferio, titulo: imovel.denominacao || nomeProjeto }
        })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.erro || 'Falha ao gerar DXF no servidor.');
      }
      const blob = await response.blob();
      const sufixo = glebas.length > 1 ? ` - ${glebaAtivaNome}` : '';
      saveAs(blob, limparNomeArquivo(`${imovel.denominacao || nomeProjeto || 'desenho'}${sufixo}.dxf`));
    } catch (e: unknown) { aviso((e as Error).message || 'Erro ao exportar DXF.'); }
  }

  // Baixa o polígono de uma parcela certificada (importada do SIGEF) como DXF.
  async function baixarDxfParcela(idx: number) {
    const pc = parcelasCert[idx];
    if (!pc || pc.anel.length < 3) { aviso('Parcela sem contorno para exportar.'); return; }
    try {
      const vs = pc.anel.map(([lat, lon], i) => {
        const u = geoParaUtm(lat, lon, zona, hemisferio);
        return { leste: u.leste, norte: u.norte, codigoSigef: `V${String(i + 1).padStart(2, '0')}`, tipo: 'M' as const };
      });
      const headers = await getAuthHeaders();
      const response = await fetch('/api/export/dxf', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          vertices: vs,
          opts: { zona, hemisferio, titulo: pc.info.titulo }
        })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.erro || 'Falha ao gerar DXF no servidor.');
      }
      const blob = await response.blob();
      const nome = (pc.info.titulo || 'parcela-sigef').replace(/[^\w.-]+/g, '_');
      saveAs(blob, `${nome}.dxf`);
      aviso('DXF da parcela certificada baixado.');
    } catch (e: unknown) { aviso((e as Error).message || 'Erro ao exportar DXF da parcela.'); }
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
    // Valida o tamanho ANTES de mexer no estado de processamento — DXFs grandes travam o navegador
    const v = validarTamanhoArquivo(file);
    if (!v.ok) { aviso(v.erro); return; }
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
    if (readonlyPorFaturamento) {
      await avisar({
        titulo: 'Modo Leitura e Exportação',
        mensagem: 'O faturamento deste workspace está suspenso. Você está em modo de apenas leitura e exportação. Não é possível salvar alterações.'
      });
      return;
    }
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
      const novas: Gleba[] = [];
      try {
        for (const g of gs) {
          const r = await registrarPontos(g.vertices, tec.credenciamentoIncra, id, zona, hemisferio, tec);
          novas.push({ ...g, vertices: r.vertices });
        }
      } catch { registrou = false; }
      // Mesmo se falhou NO MEIO da lista, preserva as glebas que JÁ registraram: a numeração
      // delas foi consumida no banco, então os códigos precisam ficar gravados no projeto —
      // descartar tudo faria o próximo salvar registrar de novo e DUPLICAR a numeração.
      gs = [...novas, ...gs.slice(novas.length)];
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
      const p: Projeto = {
        id, nome: nomeProjeto || imovel.denominacao || 'Sem nome', criadoEm: Date.now(), atualizadoEm: Date.now(),
        imovel, glebas: gs, zonaUtm: zona, hemisferio, requerente, transmitente, tipoAto, partesAdicionais, correcoes, plantaConfig, parcelasCert, verticesVizinho, verticesIgnorados, gradeAltimetrica, verticesOnlineElev,
      };
      try {
        const destino = await salvarProjeto(p);
        setProjetoId(id);
        setSalvoOk(true); setSalvoNuvem(destino === 'nuvem'); // verde só se foi pro banco na nuvem
        autoSave.marcarComoSalvo();
        setSalvarLaranja(false);
        aviso(destino === 'nuvem'
          ? (registrou ? 'Projeto salvo na nuvem e pontos registrados.' : 'Projeto salvo na nuvem, mas falhou registrar os pontos — tente salvar de novo.')
          : (user?.uid ? 'Projeto salvo localmente (offline/nuvem indisponível).' : 'Projeto salvo localmente (sem login/nuvem).'));
        registrarProjetoSalvo(p.nome).catch(() => {}); // atualiza o perfil de uso (painel do titular)
      } catch (e) {
        setProjetoId(id);
        if (e instanceof NuvemSemPermissao) {
          // o projeto FOI salvo localmente (só a nuvem negou) — trabalho seguro, mas o botão fica
          // AMARELO (não verde) pra deixar claro que ainda não subiu pro banco
          setSalvoOk(true); setSalvoNuvem(false);
          autoSave.marcarComoSalvo();
          setSalvarLaranja(false);
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
      nuProprietarioNome: c.nuProprietarioNome, nuProprietarioCpf: c.nuProprietarioCpf,
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
      nuProprietarioNome: c.nuProprietarioNome, nuProprietarioCpf: c.nuProprietarioCpf,
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
    return { v: 1, projetoId, nome: nomeProjeto, nomeProjetoManual, imovel, glebas: sincronizarGlebas(), zona, hemisferio, requerente, transmitente, tipoAto, partesAdicionais, correcoes, plantaConfig, glebaAtivaId, parcelasCert, verticesVizinho, verticesIgnorados, gradeAltimetrica, verticesOnlineElev };
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
    setCorrecoes(d.correcoes || []);
    setPlantaConfig(d.plantaConfig ?? {});
    setGlebas(d.glebas);
    carregarGleba(d.glebas.find((g) => g.id === d.glebaAtivaId) ?? d.glebas[0]);
    setSituacaoUrl(d.plantaConfig?.situacaoDataUrl);
    if (d.plantaConfig?.situacaoDataUrl) {
      setSituacaoVersSnapshot(montarSnapshotDesenho(d.glebas));
    }
    setPrint3dUrl(d.plantaConfig?.print3dDataUrl);
    const pc = d.parcelasCert ?? [];
    setParcelasCert(pc);
    setReferencias(referenciasDeParcelasCert(pc, d.zona, d.hemisferio));
    setVerticesVizinho(d.verticesVizinho ?? []);
    setVerticesIgnorados(d.verticesIgnorados ?? []);
    setGradeAltimetrica(d.gradeAltimetrica ?? (d as unknown as { ga?: typeof d.gradeAltimetrica }).ga ?? []);
    setVerticesOnlineElev(d.verticesOnlineElev ?? {});
    return true;
  }

  function resetarEstadosNovoProjeto() {
    setProjetoId(null);
    setNomeProjeto('');
    setNomeProjetoManual(false);
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
      areaSigefHa: undefined,
      perimetroSigef: undefined,
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
    setPrint3dUrl(undefined);
    setObjetos([]);
    setPlantaConfig({});
    setObjetoSelId(null);
    setVerticesIgnorados([]);
    histRef.current = []; redoRef.current = []; // projeto novo começa sem histórico do anterior
    setRequerente(undefined);
    setTransmitente(undefined);
    setTipoAto('venda');
    setPartesAdicionais([]);
    setSigefStatus('idle'); setBaixou({}); setSalvoOk(false);
    localStorage.removeItem(rascunhoKey());
    setMobileTela('home');
  }

  async function criarNovoProjeto() {
    if (temConteudoTrabalho()) {
      const ok = await confirmar({ titulo: 'Criar novo projeto', mensagem: 'Deseja SALVAR o projeto atual antes de criar um novo?', okLabel: 'Salvar e criar novo', cancelLabel: 'Descartar e criar novo' });
      if (ok) {
        await salvar();
      } else {
        const confirmarDescarte = await confirmar({ titulo: 'Descartar alterações', mensagem: 'Você escolheu não salvar. Deseja realmente DESCARTAR as alterações não salvas e iniciar um novo projeto?', okLabel: 'Descartar', perigo: true });
        if (!confirmarDescarte) return;
      }
    }
    resetarEstadosNovoProjeto();
    aviso('Novo projeto iniciado. Importe pontos para começar.');
    setTimeout(() => {
      fileRef.current?.click();
    }, 150);
  }

  // Carrega um projeto completo FICTÍCIO (demonstração). As peças saem marcadas como dados fictícios.
  async function carregarProjetoFicticio(opts?: { grande?: boolean; multiplicador?: number }) {
    if (temConteudoTrabalho() && !(await confirmar({ titulo: 'Projeto de demonstração', mensagem: 'Carregar o projeto fictício de demonstração? O trabalho atual não salvo será descartado.', okLabel: 'Carregar demonstração' }))) return;
    const f = gerarProjetoFicticio(opts);
    const gleba: Gleba = { ...novaGlebaVazia(1), denominacao: f.imovel.denominacao, vertices: f.vertices, confrontantes: f.confrontantes, confrontantePorLado: f.confrontantePorLado };
    setProjetoId(null);
    setNomeProjeto(f.nome); setNomeProjetoManual(true);
    setImovel(f.imovel);
    setZona(f.zona); setHemisferio(f.hemisferio);
    setRequerente(undefined); setTransmitente(undefined);
    setTipoAto('venda'); setPartesAdicionais([]);
    setParcelasCert([]); setReferencias([]); setVerticesVizinho([]); setSituacaoUrl(undefined); setPrint3dUrl(undefined);
    setPlantaConfig({});
    setVerticesIgnorados([]);
    setSigefStatus('idle'); setBaixou({}); setSalvoOk(false);
    setGlebas([gleba]);
    carregarGleba(gleba);
    aviso(`Projeto fictício${opts?.grande ? ' GRANDE (' + f.vertices.length + ' vértices)' : ''} carregado. Use para demonstração — todas as peças saem marcadas como DADOS FICTÍCIOS.`);
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
      // mesma praxe do desenho fechado: mais ao norte primeiro, sentido horário, nomes na ordem nova
      const ordenados = iniciarDoNorteHorario(novosVertices).map((v, i) => ({ ...v, ordem: i + 1, nome: `P${i + 1}`, codigoSigef: `P${i + 1}`, codigoCampo: `P${i + 1}` }));
      setVertices(ordenados);
      setObjetos((os) => os.filter((x) => x.id !== objetoSelId));
      setObjetoSelId(null);
      aviso('Polilinha convertida em perímetro com sucesso!');
    }
  }

  // antes de importar um novo TXT, oferece salvar o trabalho atual (que será substituído)
  async function iniciarImportTxt() {
    if (temConteudoTrabalho()) {
      const escolha = await escolher({
        titulo: 'Importar novos pontos',
        mensagem: 'Há um trabalho ou projeto ativo. O que você deseja fazer com a importação de novos pontos?',
        opcoes: [
          { chave: 'mesclar', label: 'Importar mais pontos para este projeto', variant: 'default' },
          { chave: 'salvar_novo', label: 'Salvar atual e começar outro projeto', variant: 'outline' },
          { chave: 'descartar_novo', label: 'Fechar sem salvar e começar outro projeto', variant: 'destructive' },
        ],
        cancelLabel: 'Cancelar'
      });
      if (!escolha) return; // cancelou

      if (escolha === 'mesclar') {
        setImportacaoModoMesclar(true);
      } else if (escolha === 'salvar_novo') {
        setImportacaoModoMesclar(false);
        await salvar();
        resetarEstadosNovoProjeto();
      } else if (escolha === 'descartar_novo') {
        setImportacaoModoMesclar(false);
        resetarEstadosNovoProjeto();
      }
    } else {
      setImportacaoModoMesclar(false);
    }
    fileRef.current?.click();
  }

  async function carregarProjetoComConfirmacao(id: string) {
    if (salvarLaranja) {
      const resp = await escolher({
        titulo: 'Salvar alterações pendentes?',
        mensagem: 'Você possui alterações não salvas no projeto atual. Deseja salvá-las antes de abrir outro projeto?',
        opcoes: [
          { chave: 'salvar', label: 'Salvar e Abrir', variant: 'default' },
          { chave: 'descartar', label: 'Descartar e Abrir', variant: 'destructive' },
        ],
        cancelLabel: 'Cancelar'
      });
      if (resp === 'salvar') {
        await salvar();
      } else if (resp === 'descartar') {
        // continua
      } else {
        // Cancelado ou fechar -> aborta
        return;
      }
    }
    await abrir(id);
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
    setTipoAto(p.tipoAto || 'venda');
    setPartesAdicionais(p.partesAdicionais || []);
    setPlantaConfig(p.plantaConfig ?? {});
    setGlebas(p.glebas);
    carregarGleba(p.glebas[0]);
    // restaura a planta de situação salva (não precisa recapturar o satélite)
    setSituacaoUrl(p.plantaConfig?.situacaoDataUrl);
    if (p.plantaConfig?.situacaoDataUrl) setSituacaoVersSnapshot(montarSnapshotDesenho(p.glebas));
    setPrint3dUrl(p.plantaConfig?.print3dDataUrl);
    const pc = p.parcelasCert ?? [];
    setParcelasCert(pc);
    setReferencias(referenciasDeParcelasCert(pc, p.zonaUtm, p.hemisferio));
    setVerticesVizinho(p.verticesVizinho ?? []);
    setVerticesIgnorados(p.verticesIgnorados ?? []);
    setGradeAltimetrica(p.gradeAltimetrica ?? (p as unknown as { ga?: typeof p.gradeAltimetrica }).ga ?? []);
    setVerticesOnlineElev(p.verticesOnlineElev ?? {});
    autoSave.resetBaseline(); // recém-carregado = baseline = estado atual, sem disquete
    setSalvarLaranja(false);
    setSalvoOk(true);
    // Fecha o painel e sai da aba "Projetos salvos" pra o mapa do projeto recém-aberto ficar visível
    // na hora — sem isso, o clique parecia não fazer nada (o painel continuava mostrando a mesma
    // lista, só um aviso discreto passava na tela).
    setAba('vertices');
    setPainelAberto(false);
    setMobileTela('home'); // no celular, abrir projeto volta pra home de escritório, não pro mapa
    aviso(`Projeto carregado (${p.glebas.length} gleba(s)).`);
  }
  async function remover(id: string) {
    if (readonlyPorFaturamento) {
      await avisar({
        titulo: 'Acesso Restrito',
        mensagem: 'O faturamento deste workspace está suspenso. Não é possível remover projetos.'
      });
      return;
    }
    if (!(await confirmarApagar('Deseja realmente apagar este imóvel? Esta ação não pode ser desfeita.'))) return;
    await excluirProjeto(id); atualizarLista();
  }
  async function renomear(p: Projeto) {
    if (readonlyPorFaturamento) {
      await avisar({
        titulo: 'Acesso Restrito',
        mensagem: 'O faturamento deste workspace está suspenso. Não é possível renomear projetos.'
      });
      return;
    }
    const novo = await perguntar({ titulo: 'Renomear projeto', mensagem: 'Novo nome do projeto:', valorInicial: p.nome });
    if (!novo || novo === p.nome) return;
    await salvarProjeto({ ...p, nome: novo });
    if (p.id === projetoId) setNomeProjeto(novo);
    atualizarLista();
  }
  async function exportarProjetoDaLista(p: Projeto) {
    setExportandoProjetoId(p.id);
    try { await exportarProjetoZip(migrarProjeto(p)); }
    catch (e) { await avisar({ titulo: 'Exportar projeto', mensagem: 'Não consegui exportar este projeto: ' + ((e as Error).message || 'erro') }); }
    finally { setExportandoProjetoId(null); }
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
        plantaConfig,
        verticesIgnorados
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
        if (proj.plantaConfig?.situacaoDataUrl) setSituacaoVersSnapshot(montarSnapshotDesenho(proj.glebas));
        setPrint3dUrl(proj.plantaConfig?.print3dDataUrl);
        const pc = proj.parcelasCert ?? [];
        setParcelasCert(pc);
        setReferencias(referenciasDeParcelasCert(pc, proj.zonaUtm, proj.hemisferio));
        setVerticesVizinho(proj.verticesVizinho ?? []);
        setGradeAltimetrica(proj.gradeAltimetrica ?? (proj as unknown as { ga?: typeof proj.gradeAltimetrica }).ga ?? []);
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

  useEffect(() => { if (aba === 'projetos' || projetosModalAberto) atualizarLista(); }, [aba, projetosModalAberto]);

  const lados = res?.lados ?? [];

  // progresso do trabalho (preenchimento + peças) para a barrinha à esquerda

  // Fluxo de trabalho (ordem do cabeçalho, esquerda→direita) para a linha fina sob os botões.
  // Estado de cada etapa: feito | falha (pulada: incompleta mas uma etapa posterior já foi feita) | pendente.
  // Estado de cada ETAPA do cabeçalho (a barrinha cola embaixo do botão correspondente).
  // Só conta AÇÃO do usuário; "andamento" (azul) = começou mas não terminou.
  const etapas = useMemo<Record<string, EtapaEstado>>(() => {
    const nLados = Object.keys(confrontantePorLado).length;
    const todosLados = vertices.length > 0 && nLados >= vertices.length;
    const todasDivisas = vertices.length > 0 && vertices.every((v) => !!v.representacao) && todosLados;
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

  // Guia de próximos passos dinâmicos com base no estado do fluxo
  const dicaFluxo = useMemo(() => {
    const nLados = Object.keys(confrontantePorLado).length;
    const todosLados = vertices.length > 0 && nLados >= vertices.length;
    const todasDivisas = vertices.length > 0 && vertices.every((v) => !!v.representacao) && todosLados;
    
    const txtFeito = vertices.length >= 3;
    const dadosFeitos = !!(imovel.denominacao && imovel.matricula && imovel.proprietario && imovel.municipio);
    const confroFeito = todosLados;
    const divisasFeitas = todasDivisas;
    const trtFeita = !!imovel.numeroTrt?.trim();
    const odsFeito = !!baixou.ods;
    
    if (!txtFeito) {
      return {
        passo: 1,
        resumo: "Próximo passo: Importar os pontos do levantamento (.txt)",
        detalhe: "Envie o arquivo contendo as coordenadas dos vértices (latitude/longitude ou UTM) obtidos no receptor GNSS. Clique no botão \"PONTOS\" no cabeçalho ou pressione F2 para carregar o arquivo TXT/CSV."
      };
    }
    
    if (sigefStatus === 'idle') {
      return {
        passo: 2,
        resumo: "Próximo passo: Consultar os vizinhos certificados no SIGEF",
        detalhe: "Consulte se existem imóveis vizinhos já certificados no SIGEF/INCRA para evitar sobreposições e obter os dados corretos de confrontação. Clique no botão \"SIGEF\" no cabeçalho ou pressione F3."
      };
    }
    
    if (!dadosFeitos) {
      return {
        passo: 3,
        resumo: "Próximo passo: Preencher os dados do projeto (Imóvel, Proprietário, RT)",
        detalhe: "Insira as informações básicas do imóvel (Denominação, Matrícula), Proprietário e Responsável Técnico. Clique no botão \"DADOS\" no cabeçalho ou pressione F4. Estes dados preencherão o carimbo e os documentos."
      };
    }
    
    if (!confroFeito) {
      return {
        passo: 4,
        resumo: "Próximo passo: Definir confrontantes de cada trecho (CONFRO)",
        detalhe: "Indique os vizinhos confrontantes de cada lado do imóvel. Clique em \"CONFRO\" (F5) no cabeçalho, selecione o confrontante e depois clique nos vértices correspondentes no mapa (no sentido horário) para associá-los."
      };
    }
    
    if (!divisasFeitas) {
      return {
        passo: 5,
        resumo: "Próximo passo: Caracterizar limites e divisas (DIVISAS)",
        detalhe: "Defina o tipo de divisa física de cada trecho do perímetro. Clique em \"DIVISAS\" (F6) no cabeçalho, selecione o tipo (Muro, Cerca, Córrego, etc.) e clique no trecho correspondente no mapa (no sentido horário)."
      };
    }
    
    if (!trtFeita) {
      return {
        passo: 6,
        resumo: "Próximo passo: Inserir o número da ART/TRT",
        detalhe: "Informe o número da ART (CREA) ou TRT (CFT) correspondente ao georreferenciamento do imóvel. Clique no botão \"ART/TRT\" no cabeçalho ou pressione F7 para salvar."
      };
    }
    
    if (!odsFeito) {
      return {
        passo: 7,
        resumo: "Próximo passo: Baixar a planilha ODS para certificação SIGEF",
        detalhe: "Gere a planilha no formato ODS exigida pelo SIGEF/INCRA para o credenciamento do imóvel. Clique em \"ODS\" no cabeçalho (F8) para conferir e exportar o arquivo."
      };
    }
    
    if (!projPronto) {
      return {
        passo: 8,
        resumo: "Próximo passo: Executar a checagem final (CONFERIR)",
        detalhe: "Execute a checagem final do projeto. O app verificará tolerâncias de precisão de vértices, fechamento linear e angular, além de confrontações. Clique no botão \"CONFERIR\" (F9) para validar."
      };
    }
    
    return {
      passo: 9,
      resumo: "Passo Final: Baixar o pacote de peças técnicas (PEÇAS)",
      detalhe: "Seu projeto está concluído e pronto para entrega! Clique no botão \"PEÇAS\" no cabeçalho (F10) ou use o menu dropdown para baixar individualmente ou o Pacote ZIP com Memorial Descritivo (.docx), Planta (.svg), Requerimento e Declarações."
    };
  }, [vertices, imovel, confrontantePorLado, sigefStatus, baixou, projPronto]);

  // Retorna o atalho curto configurado para a ferramenta
  const obterAtalhoLateral = (acao: string, fallbackFKey: string) => {
    const atalhos = prefs.atalhosComando || ATALHOS_COMANDO_PADRAO;
    const correspondente = Object.entries(atalhos).find(([, val]) => val === acao);
    if (correspondente) {
      return correspondente[0];
    }
    return fallbackFKey;
  };

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
      ef ? `Perímetro: ${numBR(ef.perimetro)} m` : '',
    ].filter(Boolean);
    const p = plantaConfig.centroInfoPos;
    return { linhas, lat: p?.lat, lon: p?.lon };
     
  }, [vertices.length, res, imovel, glebaAtivaNome, glebas.length, plantaConfig.centroInfoPos]);

  const objSel = objetos.find((o) => o.id === objetoSelId) ?? null;

  const { bloqueadoPorFaturamento, diasAtrasoRestantes, motivoBloqueio } = useMemo(() => {
    const status = empresaAtual?.statusPagamento ?? perfil?.statusPagamento;
    const atrasadoDesdeBase = empresaAtual?.atrasadoDesde ?? perfil?.atrasadoDesde;
    return verificarBloqueioFaturamento({
      statusPagamento: status,
      atrasadoDesde: atrasadoDesdeBase,
      souMaster: souMaster(),
      ocultarCobranca: !!configAssinatura?.ocultarCobranca,
      ativa: empresaAtual?.ativa ?? true,
    });
  }, [perfil, empresaAtual, configAssinatura]);

  const readonlyPorFaturamento = useMemo(() => {
    if (!bloqueadoPorFaturamento) return false;
    const isOwner = !perfil?.workspaceUid || perfil.workspaceUid === user?.uid;
    return !isOwner;
  }, [bloqueadoPorFaturamento, perfil, user]);

  async function iniciarPagamentoMercadoPago() {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const valor = perfil?.mensalidade || 129;
      const res = await fetch('/api/mp/preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: valor })
      });
      const data = await res.json();
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        await avisar({ titulo: 'Pagamento', mensagem: data.error || 'Não foi possível gerar a cobrança no momento.' });
      }
    } catch (e) {
      console.error(e);
      await avisar({ titulo: 'Pagamento', mensagem: 'Erro de conexão ao processar pagamento.' });
    }
  }

  if (pagamentoVerificando) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/90 z-[9999] space-y-4">
        <RefreshCw className="h-10 w-10 animate-spin text-emerald-500" />
        <span className="text-sm font-medium tracking-wide text-white/80">Confirmando seu pagamento com o Mercado Pago...</span>
        <span className="text-xs text-white/40">Por favor, não feche esta página.</span>
      </div>
    );
  }

  if (bloqueadoPorFaturamento && !readonlyPorFaturamento) {
    return (
      <div className="relative flex h-screen items-center justify-center p-4 bg-[#020804]">
        <FundoRedeMarca />
        <div className="relative z-10 w-full max-w-md space-y-6 rounded-xl border border-red-500/20 bg-[#05140b]/95 p-8 shadow-2xl text-center backdrop-blur-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
            <AlertTriangle className="h-8 w-8 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-white">Acesso Suspenso</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Detectamos uma pendência financeira em sua conta. Seu prazo de tolerância de 7 dias expirou e o acesso ao Souza CAD está temporariamente suspenso.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/10 text-left space-y-1">
            <div className="text-xs text-zinc-400">Valor pendente:</div>
            <div className="text-2xl font-bold text-red-400 font-mono">
              R$ {(perfil?.mensalidade || 129).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-zinc-500">Assinatura mensal recorrente</div>
          </div>

          <div className="space-y-3 pt-2">
            <Button 
              className="w-full h-11 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/10" 
              onClick={iniciarPagamentoMercadoPago}
            >
              Pagar com Mercado Pago
            </Button>
            <Button 
              variant="outline" 
              className="w-full h-11 text-sm bg-transparent hover:bg-white/5 text-white border-white/10" 
              onClick={() => sair()}
            >
              Sair da conta
            </Button>
          </div>
          <p className="text-[11px] text-zinc-500">
            O acesso será restabelecido automaticamente assim que o pagamento for confirmado pelo Mercado Pago.
          </p>
        </div>
      </div>
    );
  }

  interface PecasItem {
    id: string;
    rotulo: string;
    onVisualizar: () => void;
    onBaixar?: () => void;
    tipo: 'principais' | 'adicionais';
  }

  const itensPecas: PecasItem[] = [
    {
      id: 'memorial_normal',
      tipo: 'principais',
      rotulo: 'Memorial descritivo (.docx)',
      onVisualizar: () => { setPrevMemorialModo('normal'); setPrevMemorialAberto(true); },
      onBaixar: () => exportarMemorial('normal')
    },
    ...(projetoTemServidao ? [{
      id: 'memorial_servidao',
      tipo: 'principais',
      rotulo: 'Memorial de servidão (.docx)',
      onVisualizar: () => { setPrevMemorialModo('servidao'); setPrevMemorialAberto(true); },
      onBaixar: () => exportarMemorial('servidao')
    } as PecasItem] : []),
    {
      id: 'planta',
      tipo: 'principais',
      rotulo: 'Planta (PDF)',
      onVisualizar: () => setVista('planta'),
      onBaixar: () => exportarPlanta()
    },
    {
      id: 'requerimento',
      tipo: 'principais',
      rotulo: 'Requerimento ao cartório (.docx)',
      onVisualizar: () => setReqAberto(true),
      onBaixar: () => baixarRequerimentoDireto()
    },
    {
      id: 'anuencia',
      tipo: 'principais',
      rotulo: 'Cartas de anuência (.docx)',
      onVisualizar: () => setAnuenciaAberta(true),
      onBaixar: () => baixarTodasAnuenciasDireto()
    },
    ...(medioOuMais ? [{
      id: 'errata',
      tipo: 'principais',
      rotulo: 'Errata perimetral (.docx)',
      onVisualizar: () => setErrataAberto(true),
      onBaixar: () => baixarErrataDireta()
    } as PecasItem] : []),
    {
      id: 'contrato',
      tipo: 'adicionais',
      rotulo: 'Contrato de prestação de serviços (PDF)',
      onVisualizar: () => setGestaoAberta(true),
      onBaixar: () => {
        if (!tecnico || !escritorio) { aviso('Configure os dados do técnico e escritório antes de emitir o contrato.'); return; }
        const fin = imovel.financeiro ?? {};
        gerarContratoPdf({
          imovel,
          tecnico,
          escritorio,
          areaHa: res?.areaHa ?? 0,
          perimetro: res?.perimetro ?? 0,
          valor: fin.valorCobrado ?? 0,
          dataExtenso: dataPorExtenso(),
        });
      }
    },
    {
      id: 'proposta',
      tipo: 'adicionais',
      rotulo: 'Proposta comercial (PDF)',
      onVisualizar: () => setGestaoAberta(true),
      onBaixar: () => {
        if (!tecnico || !escritorio) { aviso('Configure os dados do técnico e escritório antes de emitir a proposta.'); return; }
        const fin = imovel.financeiro ?? {};
        gerarPropostaPdf({
          imovel,
          tecnico,
          escritorio,
          areaHa: res?.areaHa ?? 0,
          perimetro: res?.perimetro ?? 0,
          valor: fin.valorCobrado ?? 0,
          dataExtenso: dataPorExtenso(),
        });
      }
    },
    {
      id: 'decl_posse',
      tipo: 'adicionais',
      rotulo: 'Declaração de posse (.docx)',
      onVisualizar: () => setGestaoAberta(true),
      onBaixar: async () => {
        if (!tecnico) { aviso('Configure os dados do técnico antes de gerar a declaração.'); return; }
        saveAs(
          await gerarDeclaracaoPosseDocx({ imovel, tecnico, dataExtenso: dataPorExtenso() }),
          `Declaracao de posse - ${imovel.denominacao || 'imovel'}.docx`
        );
      }
    },
    {
      id: 'decl_sobreposicao',
      tipo: 'adicionais',
      rotulo: 'Declaração de inexistência de sobreposição (.docx)',
      onVisualizar: () => setGestaoAberta(true),
      onBaixar: async () => {
        if (!tecnico) { aviso('Configure os dados do técnico antes de gerar a declaração.'); return; }
        saveAs(
          await gerarDeclaracaoSobreposicaoDocx({ imovel, tecnico, dataExtenso: dataPorExtenso() }),
          `Declaracao de inexistencia de sobreposicao - ${imovel.denominacao || 'imovel'}.docx`
        );
      }
    },
    {
      id: 'decl_incapaz',
      tipo: 'adicionais',
      rotulo: 'Representação de incapaz (menores/interditos) (.docx)',
      onVisualizar: () => setGestaoAberta(true),
      onBaixar: async () => {
        if (!tecnico) { aviso('Configure os dados do técnico antes de gerar a declaração.'); return; }
        const representado = await perguntar({
          titulo: 'Qualificação do Incapaz',
          mensagem: 'Nome completo do menor ou incapaz representado:'
        });
        if (representado === null) return; // cancelou
        saveAs(
          await gerarDeclaracaoIncapazDocx({ imovel, tecnico, representado, dataExtenso: dataPorExtenso() }),
          `Representacao de incapaz - ${imovel.denominacao || 'imovel'}.docx`
        );
      }
    },
    {
      id: 'decl_espolio',
      tipo: 'adicionais',
      rotulo: 'Representação de espólio (inventariante) (.docx)',
      onVisualizar: () => setGestaoAberta(true),
      onBaixar: async () => {
        if (!tecnico) { aviso('Configure os dados do técnico antes de gerar a declaração.'); return; }
        const falecido = await perguntar({
          titulo: 'Qualificação do Falecido',
          mensagem: 'Nome completo do proprietário falecido (autor da herança):'
        });
        if (falecido === null) return; // cancelou
        saveAs(
          await gerarDeclaracaoEspolioDocx({ imovel, tecnico, falecido, dataExtenso: dataPorExtenso() }),
          `Representacao de espolio - ${imovel.denominacao || 'imovel'}.docx`
        );
      }
    },
    {
      id: 'decl_respeito_limites',
      tipo: 'adicionais',
      rotulo: 'Declaração de respeito de limites (.docx)',
      onVisualizar: () => setGestaoAberta(true),
      onBaixar: async () => {
        if (!tecnico) { aviso('Configure os dados do técnico antes de gerar a declaração.'); return; }
        saveAs(
          await gerarDeclaracaoRespeitoLimitesDocx({ imovel, tecnico, dataExtenso: dataPorExtenso() }),
          `Declaracao de respeito de limites - ${imovel.denominacao || 'imovel'}.docx`
        );
      }
    },
  ];

  return (
    <div className={`flex h-screen flex-col overflow-hidden transition-all duration-300 ${
      simuladorResolucao === 'fullhd' ? 'max-w-[1920px] mx-auto border-x border-border shadow-2xl' :
      simuladorResolucao === 'ultrawide' ? 'max-w-[2560px] mx-auto border-x border-border shadow-2xl' :
      simuladorResolucao === 'comum' ? 'max-w-[1366px] mx-auto border-x border-border shadow-2xl' :
      simuladorResolucao === 'celular' ? 'max-w-[420px] h-[860px] my-auto mx-auto border-[10px] border-zinc-800 rounded-3xl shadow-2xl overflow-hidden' : ''
    }`}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes gold-pulse {
          0%, 100% {
            box-shadow: 0 0 3px #d97706, 0 0 8px #d97706;
            border-color: #f59e0b !important;
          }
          50% {
            box-shadow: 0 0 8px #fbbf24, 0 0 18px #fbbf24;
            border-color: #fbbf24 !important;
          }
        }
        .neon-gold-pulse {
          animation: gold-pulse 2s infinite ease-in-out;
          border-width: 2px !important;
        }
      `}} />
      {readonlyPorFaturamento && (
        <div className="bg-red-950/90 border-b border-red-500/20 px-4 py-2.5 text-center text-xs text-red-200 flex items-center justify-center gap-2 backdrop-blur-sm z-[9999]">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 animate-pulse" />
          <span>O faturamento deste workspace está suspenso. Seu acesso está em **modo de apenas leitura e exportação**. Alterações não serão salvas.</span>
        </div>
      )}
      {perfil?.statusPagamento === 'atrasado' && !bloqueadoPorFaturamento && (
        <div className="bg-amber-950/90 border-b border-amber-500/20 px-4 py-2.5 text-center text-xs text-amber-200 flex items-center justify-center gap-2 backdrop-blur-sm z-[9999]">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 animate-pulse" />
          <span>Atenção: Constatamos uma pendência financeira em sua conta. Restam **{diasAtrasoRestantes} {diasAtrasoRestantes === 1 ? 'dia' : 'dias'}** de tolerância antes do bloqueio de alterações.</span>
          <button onClick={iniciarPagamentoMercadoPago} className="underline font-bold text-amber-300 hover:text-amber-100 ml-2">Pagar Agora</button>
        </div>
      )}
      {/* Inputs de arquivo ocultos: SEMPRE montados (fora do cabeçalho), senão sumiriam junto com o
          header no celular e quebrariam "Novo projeto"/importação, que disparam fileRef.click(). */}
      <div className="hidden">
        <input ref={fileRef} type="file" accept=".txt,.csv,.gml,.xml"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importarArquivo(f); e.currentTarget.value = ''; }} />
        <input ref={dxfRef} type="file" accept=".dxf"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importarDxfArquivo(f); e.currentTarget.value = ''; }} />
        <input ref={kmlRef} type="file" accept=".kml"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importarArquivo(f); e.currentTarget.value = ''; }} />
        <input ref={geojsonRef} type="file" accept=".geojson,.json"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importarReferenciaGeoJson(f); e.currentTarget.value = ''; }} />
        <input ref={shapefileRef} type="file" accept=".zip,.shp"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importarShapefileRef(f); e.currentTarget.value = ''; }} />
        <input ref={vizinhosRef} type="file" accept=".geojson,.json"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importarVizinhosCertificados(f); e.currentTarget.value = ''; }} />
        <input ref={verticesVizinhoRef} type="file" accept=".txt,.csv,text/plain"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importarVerticesVizinho(f); e.currentTarget.value = ''; }} />
        <input ref={corrigirLatLonRef} type="file" accept=".txt,.csv,text/plain"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) corrigirLatLonDoCSV(f); e.currentTarget.value = ''; }} />
        <input ref={jsonBackupRef} type="file" accept=".json"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importarProjetoJson(f); e.currentTarget.value = ''; }} />
      </div>
      {/* Topo */}
      {/* Cabeçalho = FLUXO DO TRABALHO (desktop). No celular ele NÃO existe na tela inicial (a
          MobileHome, centralizada, já basta) — no mapa aparece só a barrinha fina logo abaixo. */}
      {!telaEstreita && (
      <header className="no-print relative z-40 flex items-stretch border-b">
        <div className="flex shrink-0 items-center gap-1.5 border-r pl-2 pr-2.5 cursor-pointer hover:bg-muted/30 select-none transition-colors"
          onClick={() => setHistoriaAberta(true)}
          title="Conheça a história do Souza CAD e compartilhe">
          <Logo className={`size-6 transition-all duration-300 ${souMaster() ? 'brightness-110 sepia-[0.3] saturate-[3] hue-rotate-[10deg] drop-shadow-[0_0_4px_#f59e0b]' : ''}`} />
          <span className="hidden flex-col text-[9px] font-black uppercase tracking-wider leading-none sm:flex">
            <span className={souMaster() ? 'text-amber-500 dark:text-amber-400' : 'text-primary'}>Souza</span>
            <span className={souMaster() ? 'text-amber-600 dark:text-amber-500' : 'text-muted-foreground'}>CAD</span>

          </span>
        </div>
        <div className="flex flex-1 items-center gap-0.5 overflow-x-auto scrollbar-none px-1 py-1 [&_button]:h-6.5 [&_button]:px-1.5 [&_button]:text-[9px] [&_button_svg]:size-2.5 [&_button]:gap-0.5">

        {/* 1) Importar e checar vizinhos — TXT e SIGEF são tarefas de escritório, escondidas no celular. */}
        {/* 1) Importar e checar vizinhos — TXT e SIGEF são tarefas de escritório, escondidas no celular. */}
        {!telaEstreita && (
          <>
            <Button size="sm" className={`relative shrink-0 ${PREM_BTN} bg-slate-900 hover:bg-slate-800 text-emerald-400 font-extrabold border-emerald-500/40 gap-0.5`} title="Início — Guia do fluxo de trabalho passo a passo (F1)" onClick={() => setTutorialF1Aberto(true)}>
              <GraduationCap className="size-3 shrink-0 animate-pulse text-emerald-400" /> INÍCIO
              <Atalho k="F1" />
            </Button>
            <ChevronRight className="-mx-0.5 size-2.5 shrink-0 self-center text-amber-500/70" aria-hidden />
            <Etapa st={etapas.txt} tituloEtapa="1. Importação de Pontos" explicacao="Carregue as coordenadas obtidas no campo (TXT/CSV). O sistema lê altitudes, códigos SIGEF e plota o perímetro no mapa de satélite automaticamente.">
              <Button size="sm" className={`relative shrink-0 ${PREM_BTN} ${COR_IMPORT} gap-0.5`} disabled={processando} title="Enviar os pontos do seu levantamento (arquivo TXT/CSV do GNSS) para o desenho — oferece salvar o anterior" onClick={iniciarImportTxt}>
                <Upload /> PONTOS
                <Atalho k="F2" />
              </Button>
            </Etapa>
            <ChevronRight className="-mx-0.5 size-2.5 shrink-0 self-center text-amber-500/70" aria-hidden />
            <Etapa st={etapas.sigef} tituloEtapa="2. Integração SIGEF / Vizinhos" explicacao="Consulte e importe os imóveis certificados confrontantes direto da malha oficial do INCRA, efetuando o casamento perfeito dos vértices vizinhos.">
              <Button size="sm" className={`relative shrink-0 ${PREM_BTN} ${COR_VIZINHO} gap-0.5`} title="Integração SIGEF: buscar vizinhos, importar arquivos de confrontação e casar vértices" onClick={() => setSigefMenuAberto(true)}>
                <Search /> SIGEF
                <Atalho k="F3" />
              </Button>
            </Etapa>
            <ChevronRight className="-mx-0.5 size-2.5 shrink-0 self-center text-amber-500/70" aria-hidden />
          </>
        )}

        {/* 2) Dados do projeto atual */}
        {!telaEstreita && (
          <>
            <Etapa st={etapas.dados} tituloEtapa="3. Cadastro do Imóvel & RT" explicacao="Preencha as informações do imóvel, proprietário, número da matrícula, serventia registral e os dados do Responsável Técnico habilitado.">
              <div ref={dadosBtnRef} className="relative shrink-0">
                <Button
                  size="sm"
                  className={`relative shrink-0 ${PREM_BTN} ${COR_DADOS} ${painelAberto && aba === 'imovel' ? 'ring-2 ring-foreground/50' : ''} gap-0.5`}
                  title="Dados do imóvel, proprietário e responsável técnico (F4)"
                  onClick={() => { setPainelAberto(true); setAba('imovel'); }}
                >
                  <Database /> DADOS
                  <span
                    onClick={(e) => { e.stopPropagation(); alternarMenuDados(); }}
                    className="ml-0.5 p-0.5 hover:bg-white/20 rounded transition-colors"
                    title="Opções de tabelas na prancha"
                  >
                    <ChevronDown className="size-3" />
                  </span>
                  <Atalho k="F4" />
                </Button>
                {dadosMenuAberto && dadosMenuPos && (
                  <>
                    <div className={`fixed inset-0 ${Z_CLASSES.BACKDROP_DROPDOWN}`} onClick={() => setDadosMenuAberto(false)} />
                    <div
                      style={{ position: 'fixed', top: dadosMenuPos.top, left: dadosMenuPos.left }}
                      className={`${Z_CLASSES.DROPDOWN_MENU} w-64 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-1.5 shadow-2xl backdrop-blur-xl space-y-1`}
                    >
                      <button
                        type="button"
                        onClick={() => { setDadosMenuAberto(false); setPainelAberto(true); setAba('imovel'); }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors text-left"
                      >
                        <BookUser className="size-4 text-indigo-500 shrink-0" />
                        <div>
                          <div className="font-extrabold">Dados do Imóvel &amp; RT</div>
                          <div className="text-[10px] text-muted-foreground font-normal">Matrícula, proprietário e responsável (F4)</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDadosMenuAberto(false);
                          setPlantaConfig((c) => ({ ...c, mostrarQuadroAreas: true }));
                          setVista('planta');
                          aviso('Quadro de Áreas inserido na prancha.');
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg transition-colors text-left"
                      >
                        <LayoutGrid className="size-4 text-emerald-500 shrink-0" />
                        <div>
                          <div className="font-extrabold">Adicionar Quadro de Áreas</div>
                          <div className="text-[10px] text-muted-foreground font-normal">Exibir resumo de áreas na planta</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDadosMenuAberto(false);
                          setPlantaConfig((c) => ({ ...c, mostrarRoteiro: true }));
                          setVista('planta');
                          aviso('Roteiro Perimétrico inserido na prancha.');
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg transition-colors text-left"
                      >
                        <FileText className="size-4 text-amber-500 shrink-0" />
                        <div>
                          <div className="font-extrabold">Adicionar Roteiro Perimétrico</div>
                          <div className="text-[10px] text-muted-foreground font-normal">Exibir tabela de azimutes e distâncias</div>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </Etapa>
            <ChevronRight className="-mx-0.5 size-2.5 shrink-0 self-center text-amber-500/70" aria-hidden />
          </>
        )}

        {/* 3) Pintar confrontantes e divisas */}
        {!telaEstreita && (
          <>
            <Etapa st={etapas.confro} tituloEtapa="4. Pintura de Confrontantes" explicacao="Marque os trechos do perímetro associando cada limite ao seu respectivo proprietário confrontante para gerar as cartas de anuência.">
              <Button size="sm" className={`relative shrink-0 ${PREM_BTN} ${COR_CONFRO} ${modo === 'confrontante' ? 'ring-2 ring-foreground/50' : ''} gap-0.5`} title="Pintar confrontante: clique os vértices do trecho (no sentido horário)" onClick={() => { setVista('mapa'); setModo(modo === 'confrontante' ? 'navegar' : 'confrontante'); }}>
                <Paintbrush className="size-3 shrink-0" /> CONFRO
                <Atalho k="F5" />
              </Button>
            </Etapa>
            <ChevronRight className="-mx-0.5 size-2.5 shrink-0 self-center text-amber-500/70" aria-hidden />
            <Etapa st={etapas.divisas} tituloEtapa="5. Tipo de Divisas" explicacao="Defina o tipo físico de cada limite (muro, cerca de arame, córrego, etc.). O padrão é applied na planta e descrito na narrativa do memorial.">
              <Button size="sm" className={`relative shrink-0 ${PREM_BTN} ${COR_DIVISA} ${modo === 'divisa' ? 'ring-2 ring-foreground/50' : ''} gap-0.5`} title="Pintar divisa: escolha o tipo e clique os vértices (no sentido horário)" onClick={() => { setVista('mapa'); setModo(modo === 'divisa' ? 'navegar' : 'divisa'); }}>
                <Paintbrush className="size-3 shrink-0" /> DIVISAS
                <Atalho k="F6" />
              </Button>
            </Etapa>
            <ChevronRight className="-mx-0.5 size-2.5 shrink-0 self-center text-amber-500/70" aria-hidden />
          </>
        )}

        {/* 5) Peças */}
        {(
          <>
            <Etapa st={etapas.trt} tituloEtapa="6. ART / TRT Oficial" explicacao="Registre o número da Anotação de Responsabilidade Técnica (CREA) ou Termo (CFT/CFTA) para vinculação direta nos carimbos e pranchas.">
              <Button size="sm" className={`relative shrink-0 ${PREM_BTN} ${COR_PECA} gap-0.5`} title={`Abrir os dados da ${tecnico?.conselho === 'CREA' ? 'ART' : 'TRT'} (cole o número emitido para concluir a etapa)`} onClick={() => setTrtAberto(true)}>
                <Copy /> {tecnico?.conselho === 'CREA' ? 'ART' : 'TRT'}
                <Atalho k="F7" />
              </Button>
            </Etapa>
            <ChevronRight className="-mx-0.5 size-2.5 shrink-0 self-center text-amber-500/70" aria-hidden />
            <Etapa st={etapas.ods} tituloEtapa="7. Geração de Planilha ODS" explicacao="Exporte a planilha oficial de credenciamento do SIGEF (.ods) com validações automáticas de altitude, método de posicionamento e código dos vértices.">
              <Button size="sm" className={`relative shrink-0 ${PREM_BTN} ${COR_PECA_OURO} gap-0.5`} title="Conferir e baixar a planilha SIGEF (.ods)" onClick={() => setPlanilhaConfAberta(true)}>
                <ShieldCheck /> ODS
                <Atalho k="F8" />
              </Button>
            </Etapa>
            <ChevronRight className="-mx-0.5 size-2.5 shrink-0 self-center text-amber-500/70" aria-hidden />
            <Button size="sm" className={`relative shrink-0 ${PREM_BTN} ${COR_PECA} gap-0.5`} title="Conferir o projeto: limites legais de precisão, conflitos de divisa e conciliar área/perímetro com o SIGEF antes de baixar as peças" onClick={() => setConferirAberto(true)}>
              <CheckCircle2 /> CONFERIR
              <Atalho k="F9" />
            </Button>
            <ChevronRight className="-mx-0.5 size-2.5 shrink-0 self-center text-amber-500/70" aria-hidden />
            {/* PEÇAS: botão final sem seta após ele */}
            <div ref={pecasBtnRef} className="relative shrink-0">
              <Button size="sm" className={`relative shrink-0 ${PREM_BTN} ${COR_PECA_OURO} gap-0.5`} title="Peças técnicas: memorial, planta, requerimento, anuência e errata" onClick={alternarMenuPecas}>
                <Download /> PEÇAS <ChevronDown className="size-3" />
                <Atalho k="F10" />
              </Button>
              {pecasMenuAberto && (
                <>
                  <div className={`fixed inset-0 ${Z_CLASSES.BACKDROP_DROPDOWN}`} onClick={() => setPecasMenuAberto(false)} />
                  <div style={{ position: 'fixed', top: pecasMenuPos?.top ?? 56, right: pecasMenuPos?.right ?? 16 }} className={`${Z_CLASSES.DROPDOWN_MENU} w-64 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-1.5 shadow-2xl backdrop-blur-xl space-y-1`}>
                    {/* Botão Baixar Tudo no topo do dropdown desktop (Destaque Principal) */}
                    <button type="button" disabled={processando} onClick={() => { baixarPacoteEntrega(); }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 border border-amber-500/35 shadow-md transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                      {processando ? (
                        <>
                          <RefreshCw className="size-4 shrink-0 animate-spin text-amber-600 dark:text-amber-400" />
                          <span className="text-xs font-black">Baixando...</span>
                        </>
                      ) : (
                        <>
                          <Archive className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                          <span className="text-xs font-black">BAIXAR TUDO (ZIP)</span>
                        </>
                      )}
                    </button>
                    <div className="my-1 border-b border-zinc-200 dark:border-zinc-800" />

                    {/* Lista de Peças */}
                    {itensPecas
                      .filter((item) => ['memorial_normal', 'memorial_servidao', 'planta', 'requerimento', 'anuencia', 'errata'].includes(item.id))
                      .map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setPecasMenuAberto(false);
                            if (item.onBaixar) item.onBaixar();
                            else item.onVisualizar();
                          }}
                          className="flex items-center justify-between gap-1.5 rounded-lg px-2 py-1.5 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer group"
                        >
                          <span className="text-xs font-semibold text-zinc-950 dark:text-zinc-50 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate pl-1" title={item.rotulo}>
                            {item.rotulo.replace(' (.docx)', '').replace(' (PDF)', '')}
                          </span>
                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                              title="Visualizar ou editar no navegador"
                              onClick={(e) => { e.stopPropagation(); setPecasMenuAberto(false); item.onVisualizar(); }}
                            >
                              <Eye className="size-3.5" />
                            </Button>
                            {item.onBaixar && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400 dark:hover:text-emerald-300"
                                title="Baixar arquivo"
                                onClick={(e) => { e.stopPropagation(); setPecasMenuAberto(false); item.onBaixar?.(); }}
                              >
                                <Download className="size-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>



          </>
        )}
       </div>



        {/* Bolinha do perfil, à direita do cabeçalho: só a foto, sem o nome. Abre ao clicar. */}
        <div className="relative flex shrink-0 items-center border-l px-2 self-stretch">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPerfilMenuAberto((v) => !v);
            }}
            title="Sua conta"
            className="rounded-full transition-transform hover:scale-105 cursor-pointer"
          >
            {user?.photoURL && !avatarQuebrado ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt="Perfil" className="size-7 rounded-full border border-border object-cover" onError={() => setAvatarQuebrado(true)} />
            ) : (
              <span className="flex size-7 items-center justify-center rounded-full border border-border bg-primary/15 text-[11px] font-bold text-primary">
                {(user?.displayName || user?.email || 'V').slice(0, 1).toUpperCase()}
              </span>
            )}
          </button>
          {perfilMenuAberto && (
            <>
              <div className={`fixed inset-0 ${Z_CLASSES.BACKDROP_DROPDOWN}`} onClick={() => setPerfilMenuAberto(false)} />
              <div className={`absolute right-0 top-full pt-2 ${Z_CLASSES.DROPDOWN_MENU}`}>
              <div className="w-80 max-w-[95vw] overflow-hidden rounded-2xl border border-white/20 dark:border-white/10 bg-white/80 dark:bg-zinc-950/80 p-2.5 shadow-2xl backdrop-blur-2xl space-y-1">
                {user && (
                  <div className="flex items-center gap-3 px-3 py-2 bg-slate-500/5 dark:bg-white/5 border border-white/5 rounded-xl mb-1.5 select-none">
                    {user?.photoURL && !avatarQuebrado ? (
                      <img src={user.photoURL} alt="Perfil" className="size-9 rounded-full object-cover border border-white/25" onError={() => setAvatarQuebrado(true)} />
                    ) : (
                      <span className="flex size-9 items-center justify-center rounded-full border border-white/15 bg-primary/20 text-xs font-black text-primary">
                        {(user?.displayName || user?.email || 'V').slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <div className="flex flex-col min-w-0 text-left">
                      <span className="text-[11px] font-black text-foreground truncate">{user?.displayName || 'Profissional'}</span>
                      <span className="text-[9.5px] text-muted-foreground truncate">{user?.email}</span>
                    </div>
                  </div>
                )}
                {nuvemDisponivel && !user && (
                  <button type="button" onClick={() => { setPerfilMenuAberto(false); definirModoEntrada('login'); }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 active:scale-98 transition-all whitespace-nowrap">
                    <LogIn className="size-4 shrink-0" /> <span className="whitespace-nowrap">Fazer login</span>
                  </button>
                )}
                <button type="button" onClick={() => { setPerfilMenuAberto(false); setConfigAba(undefined); setConfigAberta(true); }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-500/10 active:scale-98 transition-all whitespace-nowrap">
                  <Settings className="size-4 text-slate-500 dark:text-slate-400 shrink-0" /> <span className="whitespace-nowrap">Ajustes Gerais do Projeto</span>
                </button>
                <button type="button" onClick={() => { setPerfilMenuAberto(false); setTrtAberto(true); }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 active:scale-98 transition-all whitespace-nowrap">
                  <UserCheck className="size-4 text-emerald-500 shrink-0" /> <span className="whitespace-nowrap">Responsável Técnico ({rotulosProfissional(tecnico).conselho})</span>
                </button>
                <button type="button" onClick={() => { setPerfilMenuAberto(false); window.open('/?landing=true', '_blank'); }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-500/10 active:scale-98 transition-all whitespace-nowrap">
                  <ExternalLink className="size-4 text-slate-500 dark:text-slate-400 shrink-0" /> <span className="whitespace-nowrap">Ir para o Site (Landing Page)</span>
                </button>

                {/* IMPORTAÇÃO & EXPORTAÇÃO CAD (DXF / KML) */}
                <div className="grid grid-cols-2 gap-1.5 p-1.5 my-1 bg-slate-500/5 dark:bg-white/5 border border-white/5 rounded-xl select-none">
                  <div className="flex h-8 items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 shadow-2xs">
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 tracking-wider flex items-center gap-1">
                      DXF <Atalho k="DX" />
                    </span>
                    <div className="flex items-center gap-0.5">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20" title="Exportar arquivo CAD (.dxf)" onClick={() => { setPerfilMenuAberto(false); exportarDxf(); }}>
                        <Download className="size-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20" disabled={processando} title="Importar arquivo CAD (.dxf)" onClick={() => { setPerfilMenuAberto(false); dxfRef.current?.click(); }}>
                        <Upload className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex h-8 items-center justify-between rounded-lg border border-teal-500/30 bg-teal-500/10 px-2 shadow-2xs">
                    <span className="text-[10px] font-black text-teal-600 dark:text-teal-400 tracking-wider flex items-center gap-1">
                      KML <Atalho k="KM" />
                    </span>
                    <div className="flex items-center gap-0.5">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-md text-teal-600 dark:text-teal-400 hover:bg-teal-500/20" title="Exportar Google Earth (.kml)" onClick={() => { setPerfilMenuAberto(false); exportarKML(vertices, imovel); }}>
                        <Download className="size-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-md text-teal-600 dark:text-teal-400 hover:bg-teal-500/20" disabled={processando} title="Importar Google Earth (.kml)" onClick={() => { setPerfilMenuAberto(false); kmlRef.current?.click(); }}>
                        <Upload className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                {souMaster() && (
                  <div className="flex flex-col gap-1.5 border-t border-b border-slate-100 dark:border-zinc-800 py-2.5 px-3 my-1 bg-amber-500/5 rounded-xl">
                    <span className="text-[9.5px] uppercase font-black text-amber-600 dark:text-amber-400 flex items-center gap-1.5 tracking-wider">
                      <Monitor className="size-3.5 text-amber-500" /> Resolução / Display
                    </span>
                    <select
                      value={simuladorResolucao}
                      onChange={(e) => setSimuladorResolucao(e.target.value as any)}
                      className="w-full h-8 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-zinc-800 bg-background px-2 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="off">Nativa (Tela Cheia)</option>
                      <option value="fullhd">Full HD (1920px)</option>
                      <option value="ultrawide">Ultrawide (2560px)</option>
                      <option value="comum">Desktop Comum (1366px)</option>
                      <option value="celular">Simular Celular (420px)</option>
                    </select>
                  </div>
                )}
 
                {/* PAINEL DE AJUSTES DE ESCALA (+ / -) */}
                <div className="border-t border-b border-slate-100 dark:border-zinc-800 py-2.5 px-3 my-1 space-y-2 bg-slate-500/5 dark:bg-white/5 rounded-xl">
                  <span className="text-[9.5px] uppercase font-black text-slate-500 dark:text-slate-400 tracking-wider block border-b border-slate-100 dark:border-zinc-800 pb-1">
                    Ajustes de Escala da Planta & Texto
                  </span>
 
                  {/* Texto da Interface */}
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-200 font-bold">
                    <span className="whitespace-nowrap">Interface Geral:</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); setEscalaInterface((prev) => Math.max(0.85, Number((prev - 0.05).toFixed(2)))); }}
                        className="flex size-6 items-center justify-center rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 text-xs font-black hover:bg-slate-300 dark:hover:bg-zinc-700 active:scale-90 transition-all shadow-2xs" title="Diminuir">-</button>
                      <span className="w-8 text-center text-[10.5px] font-mono font-bold text-foreground">{Math.round(escalaInterface * 100)}%</span>
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); setEscalaInterface((prev) => Math.min(1.3, Number((prev + 0.05).toFixed(2)))); }}
                        className="flex size-6 items-center justify-center rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 text-xs font-black hover:bg-slate-300 dark:hover:bg-zinc-700 active:scale-90 transition-all shadow-2xs" title="Aumentar">+</button>
                    </div>
                  </div>
 
                  {/* Rótulos da Planta */}
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-200 font-bold">
                    <span className="whitespace-nowrap">Rótulos e Nomes:</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setPlantaConfig((c) => ({ ...c, escalaTextos: Math.max(0.5, Number(((c.escalaTextos ?? 1) - 0.1).toFixed(1))) })); }} className="flex size-6 items-center justify-center rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 text-xs font-black hover:bg-slate-300 dark:hover:bg-zinc-700 active:scale-90 transition-all shadow-2xs">-</button>
                      <span className="w-8 text-center text-[10.5px] font-mono font-bold text-foreground">{Math.round((plantaConfig.escalaTextos ?? 1) * 100)}%</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setPlantaConfig((c) => ({ ...c, escalaTextos: Math.min(2.5, Number(((c.escalaTextos ?? 1) + 0.1).toFixed(1))) })); }} className="flex size-6 items-center justify-center rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 text-xs font-black hover:bg-slate-300 dark:hover:bg-zinc-700 active:scale-90 transition-all shadow-2xs">+</button>
                    </div>
                  </div>
 
                  {/* Símbolos e Vértices */}
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-200 font-bold">
                    <span className="whitespace-nowrap">Símbolos e Vértices:</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setPlantaConfig((c) => ({ ...c, escalaVertices: Math.max(0.5, Number(((c.escalaVertices ?? 1) - 0.1).toFixed(1))) })); }} className="flex size-6 items-center justify-center rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 text-xs font-black hover:bg-slate-300 dark:hover:bg-zinc-700 active:scale-90 transition-all shadow-2xs">-</button>
                      <span className="w-8 text-center text-[10.5px] font-mono font-bold text-foreground">{Math.round((plantaConfig.escalaVertices ?? 1) * 100)}%</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setPlantaConfig((c) => ({ ...c, escalaVertices: Math.min(2.5, Number(((c.escalaVertices ?? 1) + 0.1).toFixed(1))) })); }} className="flex size-6 items-center justify-center rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 text-xs font-black hover:bg-slate-300 dark:hover:bg-zinc-700 active:scale-90 transition-all shadow-2xs">+</button>
                    </div>
                  </div>
 
                  {/* Tabelas e Quadros */}
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-200 font-bold">
                    <span className="whitespace-nowrap">Tabelas e Quadros:</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setPlantaConfig((c) => ({ ...c, escalaTabelas: Math.max(0.5, Number(((c.escalaTabelas ?? 1) - 0.1).toFixed(1))) })); }} className="flex size-6 items-center justify-center rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 text-xs font-black hover:bg-slate-300 dark:hover:bg-zinc-700 active:scale-90 transition-all shadow-2xs">-</button>
                      <span className="w-8 text-center text-[10.5px] font-mono font-bold text-foreground">{Math.round((plantaConfig.escalaTabelas ?? 1) * 100)}%</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setPlantaConfig((c) => ({ ...c, escalaTabelas: Math.min(2.5, Number(((c.escalaTabelas ?? 1) + 0.1).toFixed(1))) })); }} className="flex size-6 items-center justify-center rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 text-xs font-black hover:bg-slate-300 dark:hover:bg-zinc-700 active:scale-90 transition-all shadow-2xs">+</button>
                    </div>
                  </div>
 
                  {/* Confrontantes */}
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-200 font-bold">
                    <span className="whitespace-nowrap">Confrontantes:</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setPlantaConfig((c) => ({ ...c, escalaConfront: Math.max(0.5, Number(((c.escalaConfront ?? 1) - 0.1).toFixed(1))) })); }} className="flex size-6 items-center justify-center rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 text-xs font-black hover:bg-slate-300 dark:hover:bg-zinc-700 active:scale-90 transition-all shadow-2xs">-</button>
                      <span className="w-8 text-center text-[10.5px] font-mono font-bold text-foreground">{Math.round((plantaConfig.escalaConfront ?? 1) * 100)}%</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setPlantaConfig((c) => ({ ...c, escalaConfront: Math.min(2.5, Number(((c.escalaConfront ?? 1) + 0.1).toFixed(1))) })); }} className="flex size-6 items-center justify-center rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 text-xs font-black hover:bg-slate-300 dark:hover:bg-zinc-700 active:scale-90 transition-all shadow-2xs">+</button>
                    </div>
                  </div>
                </div>
 
                {souMaster() && user && !entrouSemLogin && (
                  <button type="button" onClick={() => { setPerfilMenuAberto(false); setModoMaster('gerir'); }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-amber-600 dark:text-amber-500 hover:bg-amber-500/10 active:scale-98 transition-all whitespace-nowrap">
                    <ShieldCheck className="size-4 text-amber-500 shrink-0" /> <span className="truncate whitespace-nowrap">Gerir SaaS</span>
                  </button>
                )}
                {nuvemDisponivel && (
                  <button type="button" onClick={() => { setPerfilMenuAberto(false); limparConfigLocalNaSaida(); sair(); setLandingPageAberta(true); definirModoEntrada('login'); }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-red-650 hover:bg-red-500/10 dark:text-red-400 active:scale-98 transition-all whitespace-nowrap">
                    <LogOut className="size-4 shrink-0" /> <span className="truncate whitespace-nowrap">{user ? 'Sair da Conta' : 'Voltar ao Início'}</span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}
        </div>

       {/* (o botão "Dados do Projeto" foi para a barra flutuante, ao lado do DETALHES) */}
       {/* A CHAVE do app saiu do topo (atrapalhava a leitura dos botões) e virou uma barrinha
           FLUTUANTE na lateral direita — ver logo abaixo do <header>. */}
      </header>
      )}

      {/* Barrinha fina do celular: só aparece quando se está espiando o mapa/planta. Volta pra tela
          inicial (Início) e alterna Mapa/Planta. A tela inicial nunca tem cabeçalho. */}
      {telaEstreita && mobileTela === 'mapa' && (
        <header className="no-print flex items-stretch border-b">
          <button type="button" onClick={() => setMobileTela('home')}
            title="Voltar pra tela inicial"
            className="flex shrink-0 items-center gap-1 border-r px-3 py-1.5 text-[11px] font-bold text-muted-foreground hover:bg-muted/40">
            <PanelLeft className="size-4" /> INÍCIO
          </button>
          <button type="button" onClick={() => setVista((v) => (v === 'mapa' ? 'planta' : 'mapa'))}
            title="Alternar entre mapa e planta"
            className="flex shrink-0 items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-yellow-500 hover:text-yellow-600 dark:text-yellow-400 hover:bg-muted/40">
            {vista === 'mapa' ? <Eye className="size-4" /> : <MapIcon className="size-4" />}
            {vista === 'mapa' ? 'PLANTA' : 'MAPA'}
          </button>
        </header>
      )}

      {/* No modo MAPA e PLANTA a chave Fácil/Completo agora fica integrada nas respectivas barras flutuantes. */}

      <div className="relative flex min-h-0 flex-1">
        {/* Faixa de status/controles — sobreposta (não empurra o mapa/planta); some sozinha */}
        {/* O painel de Pintar Divisas/Confrontantes foi para a BARRA FLUTUANTE ÚNICA, ao lado do
            botão Mapa/Planta (ver mais abaixo) — não é mais uma barra separada no topo. */}
        {/* Área principal: mapa ou planta */}
        {(() => {
          const rotulo = toolWEfetivo >= 104;
          return (
            <>
              <aside style={{ width: toolWEfetivo }} className={`sidebar-lateral no-print scrollbar-none relative z-20 flex shrink-0 flex-col gap-0.5 overflow-y-auto border-r bg-card p-0.5 sm:p-1 [&_button]:h-6.5 sm:[&_button]:h-7 [&_button]:min-h-[22px] [&_button]:py-0 [&_button]:px-1 [&_button]:text-[9.5px] sm:[&_button]:text-[10px] [&_button_svg]:size-3 ${toolWEfetivo === 0 ? '!p-0 !border-0 overflow-hidden' : ''}`}>
                {vista === '3d' ? (
                  <div id="sidebar-3d-portal-target" className="flex-1 flex flex-col gap-3 py-1 text-xs" />
                ) : (
                  <>
                    {/* DADOS E AÇÕES DO PROJETO */}
                    {rotulo ? (
                  <div className="flex flex-col gap-2 text-xs">

                     {/* CARD 1: GESTÃO DO PROJETO */}
                    <div className="flex flex-col gap-1.5 border rounded-lg p-1.5 bg-muted/10 shadow-sm">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider pb-0.5 border-b text-muted-foreground select-none flex items-center">
                        <span>Gestão do Projeto</span>
                      </span>
                      


                      {/* Botões de Gestão — grade de 2 colunas, ícone em cima e rótulo em MAIÚSCULA embaixo */}
                      <div className="grid grid-cols-2 gap-1 [&>button]:h-8 [&>button]:w-full [&>button]:justify-center [&>button]:px-1 [&>button]:gap-1 [&_svg]:size-3.5 [&>button]:min-w-0 [&_span]:text-[9px] [&_span]:font-bold [&_span]:uppercase [&_span]:leading-none">
                        <Button size="sm" variant="secondary" className="relative bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => setGestaoAberta(true)} title={`Gestão financeira (${obterAtalhoLateral('gestao', 'gt')})`}>
                          <BarChart3 className="text-white" /> <span>Gestão</span>
                          <Atalho k={obterAtalhoLateral('gestao', 'gt')} />
                        </Button>
                        {completo ? (
                          <Button size="sm" variant="secondary" className="relative" onClick={abrirGestaoPontos} title={`Banco de pontos (${obterAtalhoLateral('pontos_banco', 'pt')})`}>
                            <Database className="text-emerald-500" /> <span>Pontos</span>
                            <Atalho k={obterAtalhoLateral('pontos_banco', 'pt')} />
                          </Button>
                        ) : (
                          <Button size="sm" variant="secondary" className="relative" onClick={criarNovoProjeto} disabled={processando} title={`Novo projeto (${obterAtalhoLateral('novo', 'nv')})`}>
                            <Plus className="text-amber-500" /> <span>Novo</span>
                            <Atalho k={obterAtalhoLateral('novo', 'nv')} />
                          </Button>
                        )}
                        {completo && (
                          <Button size="sm" variant="secondary" className="relative" onClick={criarNovoProjeto} disabled={processando} title={`Novo projeto (${obterAtalhoLateral('novo', 'nv')})`}>
                            <Plus className="text-amber-500" /> <span>Novo</span>
                            <Atalho k={obterAtalhoLateral('novo', 'nv')} />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={salvar}
                          disabled={processando}
                          title={salvarLaranja ? `Salvar projeto atual (${obterAtalhoLateral('salvar', 'sv')}) - Modificações pendentes de salvamento!` : `Projeto salvo e sincronizado (${obterAtalhoLateral('salvar', 'sv')})`}
                          className={`relative transition-all duration-300 ${salvarLaranja ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold border-transparent shadow-md shadow-emerald-500/20' : ''}`}
                        >
                          <Save className={salvarLaranja ? 'text-white animate-pulse' : 'text-emerald-500'} /> <span>SALVAR</span>
                          <Atalho k={obterAtalhoLateral('salvar', 'sv')} />
                        </Button>
                        <Button size="sm" variant="secondary" className="relative" onClick={() => setPrecoSugAberto(true)} title={`Precificar: quanto cobrar por este imóvel (${obterAtalhoLateral('precificacao', 'pc')})`}>
                          <PencilRuler className="text-amber-400" /> <span>Precificar</span>
                          <Atalho k={obterAtalhoLateral('precificacao', 'pc')} />
                        </Button>
                        <Button size="sm" variant="secondary" className="relative" onClick={() => setIaAberta(true)} title="Extração Inteligente (IA): extrair dados cadastrais e vértices/coordenadas de documentos e memoriais">
                          <Sparkles className="text-violet-500 shrink-0 size-3.5" /> <span>USAR IA</span>
                          <Atalho k="IA" />
                        </Button>
                        <a href="https://sso.acesso.gov.br/login?client_id=sigef.incra.gov.br&authorization_id=19f151443c3" target="_blank" rel="noopener noreferrer" className="w-full">
                          <Button size="sm" variant="secondary" className="relative w-full text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 gap-1" title="Acessar o SIGEF (INCRA) para certificação eletrônica do imóvel">
                            <ExternalLink className="size-3.5 text-emerald-500" /> <span>SIGEF</span>
                            <Atalho k="SG" />
                          </Button>
                        </a>
                        <a href={tecnico?.conselho === 'CREA' ? 'https://www.confea.org.br/' : 'https://sincet.haia.com.br/app/'} target="_blank" rel="noopener noreferrer" className="w-full">
                          <Button size="sm" variant="secondary" className="relative w-full text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 gap-1" title={`Emitir ${rotulosProfissional(tecnico).termo} oficial (${rotulosProfissional(tecnico).conselho})`}>
                            <ExternalLink className="size-3.5 text-blue-500" /> <span>{rotulosProfissional(tecnico).termo === 'ART' ? 'Emitir ART' : 'Emitir TRT'}</span>
                            <Atalho k="EM" />
                          </Button>
                        </a>
                        <Button size="sm" variant={curvaConfigAberta ? 'default' : 'secondary'} className={`relative ${curvaConfigAberta ? COR_ATIVO : ''}`} onClick={() => setCurvaConfigAberta((v) => !v)} title={`Curvas de Nível (${obterAtalhoLateral('curvas_nivel', 'cn')}): traçar curvas de nível e relevo planialtimétrico.`}>
                          <IconeCurvasNivel className={curvaConfigAberta ? 'text-white shrink-0' : 'text-indigo-500 shrink-0'} /> <span className="truncate">Curvas</span>
                          <Atalho k={obterAtalhoLateral('curvas_nivel', 'cn')} />
                        </Button>
                        <Button size="sm" variant="secondary" className="relative text-lime-600 dark:text-lime-400 hover:bg-lime-500/20" title="CAR — Cadastro Ambiental Rural: reserva legal, módulos fiscais e APP (CR)" onClick={() => setCarAberto(true)}>
                          <Leaf className="size-3.5 text-lime-500 shrink-0" /> <span className="truncate">CAR</span>
                          <Atalho k="CR" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={histCount === 0}
                          className={`relative w-full px-1 justify-center transition-opacity ${histCount === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                          onClick={desfazer}
                          title={histCount > 0 ? `Desfazer (${obterAtalhoLateral('desfazer', 'dz')} / Ctrl+Z) — ${histCount} ação(ões) no histórico` : 'Nada para desfazer'}
                        >
                          <Undo2 className="size-3.5" /> <span>Desfazer</span>
                          <Atalho k={obterAtalhoLateral('desfazer', 'dz')} />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={redoCount === 0}
                          className={`relative w-full px-1 justify-center transition-opacity ${redoCount === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                          onClick={refazer}
                          title={redoCount > 0 ? `Refazer (${obterAtalhoLateral('refazer', 'ry')} / Ctrl+Y) — ${redoCount} ação(ões) disponível(is)` : 'Nada para refazer'}
                        >
                          <Redo2 className="size-3.5" /> <span>Refazer</span>
                          <Atalho k={obterAtalhoLateral('refazer', 'ry')} />
                        </Button>
                      </div>
                      {glebas.length > 1 && (
                        <div className="flex flex-wrap gap-1 items-center justify-between border-t pt-1.5 mt-0.5">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase">Gleba:</span>
                          <div className="flex gap-1">
                            {glebas.map((g, i) => (
                              <button key={g.id} type="button" onClick={() => { trocarGleba(g.id); setPainelAberto(true); }} title={g.denominacao}
                                className={`size-6 rounded-sm flex items-center justify-center text-xs font-bold ${g.id === glebaAtivaId ? 'bg-primary text-primary-foreground' : 'border bg-background hover:bg-muted'}`}>{i + 1}</button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* CARD 3: FERRAMENTAS DE DESENHO */}
                    {medioOuMais && (vista === 'mapa' || editarPlanta) && (
                      <div className="flex flex-col gap-1 border rounded-lg p-1 bg-muted/10 shadow-2xs">
                        <span className="text-[9px] font-extrabold uppercase tracking-wider pb-0.5 border-b text-muted-foreground select-none flex items-center">
                          <span>Desenho e Geometria</span>
                        </span>
                        <div className="grid grid-cols-2 gap-1 [&>button]:h-7.5 [&>button]:w-full [&>button]:justify-center [&>button]:px-1 [&>button]:gap-0.5 [&_svg]:size-3.5 [&>button]:min-w-0 [&_span]:text-[9px] [&_span]:font-bold [&_span]:uppercase [&_span]:truncate [&_span]:text-center">
                          <Button size="sm" variant={modo === 'linha' ? 'default' : 'secondary'} className={`relative ${modo === 'linha' ? COR_ATIVO : ''}`} onClick={() => alternarModo('linha', true)} title={`Linha Reta (${obterAtalhoLateral('linha', 'F6')}): clique 2 pontos para criar uma linha simples. Botão direito cancela.`}>
                            <PenTool className={modo === 'linha' ? 'text-white shrink-0' : 'text-sky-400 shrink-0'} /> <span className="truncate">Linha</span>
                            <Atalho k={obterAtalhoLateral('linha', 'F6')} />
                          </Button>
                          <Button size="sm" variant={modo === 'polilinha' ? 'default' : 'secondary'} className={`relative ${modo === 'polilinha' ? COR_ATIVO : ''}`} onClick={() => alternarModo('polilinha', true)} title={`Polilinha (${obterAtalhoLateral('polilinha', 'F7')}): clique vários pontos. Clique com botão direito conclui e insere a polilinha.`}>
                            <PenTool className={modo === 'polilinha' ? 'text-white shrink-0' : 'text-sky-400 shrink-0'} /> <span className="truncate">Polilinha</span>
                            <Atalho k={obterAtalhoLateral('polilinha', 'F7')} />
                          </Button>
                          <Button size="sm" variant={modo === 'tracejado' ? 'default' : 'secondary'} className={`relative ${modo === 'tracejado' ? COR_ATIVO : ''}`} onClick={() => alternarModo('tracejado', true)} title={`Tracejado / Servidão (${obterAtalhoLateral('tracejado', 'F8')}): clique vários pontos. Botão direito conclui o desenho.`}>
                            <PenTool className={modo === 'tracejado' ? 'text-white shrink-0' : 'text-sky-400 opacity-90 shrink-0'} /> <span className="truncate">Tracejado</span>
                            <Atalho k={obterAtalhoLateral('tracejado', 'F8')} />
                          </Button>

                          <Button size="sm" variant={modo === 'texto' ? 'default' : 'secondary'} className={`relative ${modo === 'texto' ? COR_ATIVO : ''}`} title={`Inserir Texto (${obterAtalhoLateral('texto', 'F9')}): clique em qualquer posição para adicionar anotação ou rótulo.`} onClick={() => alternarModo('texto')}>
                            <FileText className={modo === 'texto' ? 'text-white shrink-0' : 'text-amber-400 shrink-0'} /> <span className="truncate">Texto</span>
                            <Atalho k={obterAtalhoLateral('texto', 'F9')} />
                          </Button>
                          <Button size="sm" variant={modo === 'cota' ? 'default' : 'secondary'} className={`relative ${modo === 'cota' ? COR_ATIVO : ''}`} onClick={() => alternarModo('cota', true)} title={`Cota de Dimensão (${obterAtalhoLateral('cota', 'F10')}): clique dois pontos para medir e exibir a cota.`}>
                            <IconeCota className={modo === 'cota' ? 'text-white shrink-0' : 'text-amber-400 shrink-0'} /> <span className="truncate">Cota</span>
                            <Atalho k={obterAtalhoLateral('cota', 'F10')} />
                          </Button>
                          <Button size="sm" variant={modo === 'simbolo' ? 'default' : 'secondary'} className={`relative ${modo === 'simbolo' ? COR_ATIVO : ''}`} onClick={() => { setModo(modo === 'simbolo' ? 'navegar' : 'simbolo'); }} title={`Símbolos Topográficos (${obterAtalhoLateral('simbolo', 'sb')}): selecione e clique no mapa para posicionar poste, árvore, casa...`}>
                            <div className={modo === 'simbolo' ? 'text-white shrink-0' : 'text-amber-400 shrink-0'}><svg viewBox="-14 -14 28 28" className="size-3.5" dangerouslySetInnerHTML={{ __html: simboloSvgInterno('arvore') }} /></div>
                            <span className="truncate">Símbolos</span>
                            <Atalho k={obterAtalhoLateral('simbolo', 'sb')} />
                          </Button>
                          <Button size="sm" variant={modo === 'retangulo' ? 'default' : 'secondary'} className={`relative ${modo === 'retangulo' ? COR_ATIVO : ''}`} onClick={() => alternarModo('retangulo', true)} title={`Retângulo (${obterAtalhoLateral('retangulo', 'rt')}): clique em dois cantos opostos no mapa para desenhar a caixa.`}>
                            <Square className={modo === 'retangulo' ? 'text-white shrink-0' : 'text-sky-400 shrink-0'} /> <span className="truncate">Retângulo</span>
                            <Atalho k={obterAtalhoLateral('retangulo', 'rt')} />
                          </Button>
                          <Button size="sm" variant={modo === 'circulo' ? 'default' : 'secondary'} className={`relative ${modo === 'circulo' ? COR_ATIVO : ''}`} onClick={() => alternarModo('circulo', true)} title={`Círculo (${obterAtalhoLateral('circulo', 'cc')}): clique no centro e depois na borda para desenhar o círculo.`}>
                            <Circle className={modo === 'circulo' ? 'text-white shrink-0' : 'text-sky-400 shrink-0'} /> <span className="truncate">Círculo</span>
                            <Atalho k={obterAtalhoLateral('circulo', 'cc')} />
                          </Button>
                          <Button size="sm" variant={modo === 'arco' ? 'default' : 'secondary'} className={`relative ${modo === 'arco' ? COR_ATIVO : ''}`} onClick={() => alternarModo('arco', true)} title={`Arco Curvo (${obterAtalhoLateral('arco', 'ac')}): clique 3 pontos (início, meio e fim) para traçar o arco.`}>
                            <Spline className={modo === 'arco' ? 'text-white shrink-0' : 'text-sky-400 shrink-0'} /> <span className="truncate">Arco</span>
                            <Atalho k={obterAtalhoLateral('arco', 'ac')} />
                          </Button>
                          <Button size="sm" variant={modo === 'multi' ? 'default' : 'secondary'} className={`relative ${modo === 'multi' ? COR_ATIVO : ''}`} onClick={() => { alternarModo('multi'); }} title={`Seleção Múltipla (${obterAtalhoLateral('selecao_varios', 'sl')}): clique em elementos ou abra uma caixa de seleção para selecionar vários vértices/objetos de uma vez.`}>
                            <span className="truncate text-[9px] font-bold text-fuchsia-400">Sel. Vários</span>
                            <Atalho k={obterAtalhoLateral('selecao_varios', 'sl')} />
                          </Button>
                          <Button size="sm" variant={modo === 'medir' ? 'default' : 'secondary'} className={`relative ${modo === 'medir' ? COR_ATIVO : ''}`} onClick={() => alternarModo('medir', true)} title={`Régua de Medição (${obterAtalhoLateral('medir', 'md')}): meça distâncias e azimutes entre pontos no mapa com alta precisão.`}>
                            <Ruler className={modo === 'medir' ? 'text-white shrink-0' : 'text-amber-400 shrink-0'} /> <span className="truncate">Medir</span>
                            <Atalho k={obterAtalhoLateral('medir', 'md')} />
                          </Button>
                          <Button size="sm" variant="secondary" className="relative" onClick={() => setAltitudeModalAberta(true)} title="Gestão de altitudes dos vértices e ajuste global (+/- cm)">
                            <Mountain className="text-amber-400 shrink-0" /> <span className="truncate">Altitude</span>
                            <Atalho k="AL" />
                          </Button>
                          {/* Geometria avançada de CAD — só no Completo (o Médio fica com o desenho do dia a dia) */}
                          {completo && (<>
                          <Button size="sm" variant={modo === 'paralela' ? 'default' : 'secondary'} className={`relative ${modo === 'paralela' ? COR_ATIVO : ''}`} onClick={() => alternarModo('paralela', true)} title={`Linha Paralela / Offset (${obterAtalhoLateral('paralela', 'pr')}): clique numa linha e informe a distância de afastamento.`}>
                            <Waypoints className={modo === 'paralela' ? 'text-white shrink-0' : 'text-fuchsia-400 shrink-0'} /> <span className="truncate">Paralela</span>
                            <Atalho k={obterAtalhoLateral('paralela', 'pr')} />
                          </Button>
                          <Button size="sm" variant={modo === 'dividir' ? 'default' : 'secondary'} className={`relative ${modo === 'dividir' ? COR_ATIVO : ''}`} onClick={() => alternarModo('dividir')} title={`Dividir Divisa (${obterAtalhoLateral('dividir', 'dv')}): clique num segmento de divisa para dividi-lo em partes iguais.`}>
                            <GitCommit className={modo === 'dividir' ? 'text-white shrink-0' : 'text-fuchsia-400 shrink-0'} /> <span className="truncate">Dividir</span>
                            <Atalho k={obterAtalhoLateral('dividir', 'dv')} />
                          </Button>
                          <Button size="sm" variant={modo === 'trim' ? 'default' : 'secondary'} className={`relative ${modo === 'trim' ? COR_ATIVO : ''}`} onClick={() => alternarModo('trim')} title={`Aparar / Trim (${obterAtalhoLateral('aparar', 'ap')}): corte pontas de polilinhas no limite de interseção.`}>
                            <Scissors className={modo === 'trim' ? 'text-white shrink-0' : 'text-fuchsia-400 shrink-0'} /> <span className="truncate">Aparar</span>
                            <Atalho k={obterAtalhoLateral('aparar', 'ap')} />
                          </Button>
                          <Button size="sm" variant={modo === 'extend' ? 'default' : 'secondary'} className={`relative ${modo === 'extend' ? COR_ATIVO : ''}`} onClick={() => alternarModo('extend')} title={`Prolongar / Extend (${obterAtalhoLateral('prolongar', 'pg')}): estenda uma polilinha até atingir o limite selecionado.`}>
                            <Expand className={modo === 'extend' ? 'text-white shrink-0' : 'text-fuchsia-400 shrink-0'} /> <span className="truncate">Prolongar</span>
                            <Atalho k={obterAtalhoLateral('prolongar', 'pg')} />
                          </Button>
                          </>)}
                          {modo === 'simbolo' && (
                            <div className="col-span-2 grid grid-cols-5 gap-1 rounded-sm border bg-muted/40 p-1">
                              {SIMBOLOS.map((s) => (
                                <button key={s.chave} type="button" title={s.rotulo}
                                  className={`flex flex-col items-center justify-center rounded-sm p-1 hover:bg-background transition-all ${simboloSel === s.chave ? 'bg-background ring-1 ring-primary' : ''}`}
                                  onClick={() => setSimboloSel(s.chave)}>
                                  <svg viewBox="-14 -14 28 28" className="size-5" dangerouslySetInnerHTML={{ __html: simboloSvgInterno(s.chave) }} />
                                  <span className="text-[8px] font-semibold leading-none mt-0.5">{s.rotulo}</span>
                                </button>
                              ))}
                            </div>
                          )}
                          {modo === 'paralela' && (
                            <div className="col-span-2 flex items-center justify-between gap-2 rounded-sm border bg-muted/40 p-1.5 animate-in fade-in duration-200">
                              <span className="text-[9px] font-semibold text-muted-foreground">{segmentoSelecionado ? '2) Clique no lado da paralela:' : '1) Clique em uma linha/aresta'}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-bold text-muted-foreground">Afast (m):</span>
                                <input
                                  type="text"
                                  className="w-12 rounded-sm border bg-background px-1 py-0.5 text-xs font-bold text-center text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                  value={offsetDistancia}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(',', '.');
                                    setOffsetDistancia(parseFloat(val) || 0);
                                  }}
                                />
                              </div>
                            </div>
                          )}
                          {modo === 'dividir' && (
                            <div className="col-span-2 rounded-sm border border-cyan-500/40 bg-cyan-500/10 px-2 py-1.5 text-[9px] text-cyan-600 dark:text-cyan-400 font-semibold animate-in fade-in duration-200">
                              Clique sobre um segmento (divisa) do perímetro ativo para dividi-lo.
                            </div>
                          )}
                          {modo === 'trim' && (
                            <div className="col-span-2 rounded-sm border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-[9px] text-red-600 dark:text-red-400 font-semibold animate-in fade-in duration-200">
                              {linhaLimite
                                ? '2) Clique no segmento de polilinha que deseja aparar (Trim).'
                                : '1) Clique em qualquer linha para usar como limite de corte.'}
                            </div>
                          )}
                          {modo === 'extend' && (
                            <div className="col-span-2 rounded-sm border border-blue-500/40 bg-blue-500/10 px-2 py-1.5 text-[9px] text-blue-600 dark:text-blue-400 font-semibold animate-in fade-in duration-200">
                              {linhaLimite
                                ? '2) Clique perto da ponta de uma polilinha para prolongá-la até o limite.'
                                : '1) Clique em qualquer linha para usar como limite de extensão.'}
                            </div>
                          )}
                          {modo === 'multi' && (
                            <div className="col-span-2 flex flex-col gap-1 rounded-sm border bg-muted/40 p-1.5 animate-in fade-in duration-200">
                              {selMulti.size > 0 || objSelMulti.size > 0 ? (
                                <div className="grid grid-cols-2 gap-1">
                                  <Button size="sm" variant="destructive" className={selMulti.size > 0 ? "h-7 text-[10px] font-bold gap-1" : "col-span-2 h-7 text-[10px] font-bold gap-1"} onClick={apagarMultiSelecionados}>
                                    <Trash2 className="size-3" /> Apagar ({selMulti.size + objSelMulti.size})
                                  </Button>
                                  {selMulti.size > 0 && (
                                    <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold gap-1 text-violet-600 hover:text-violet-700 dark:text-violet-400" onClick={() => alternarModo('copiar_base')}>
                                      <Copy className="size-3" /> Copiar
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[9px] text-muted-foreground text-center py-1 font-semibold">Clique nos itens ou arraste uma caixa para selecioná-los.</span>
                              )}
                              <div className="mt-1 flex flex-col gap-1 border-t pt-1.5">
                                <div className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider text-left">Selecionar por Tipo:</div>
                                <div className="grid grid-cols-2 gap-1 text-foreground">
                                  <button type="button" className="h-6 rounded bg-background hover:bg-muted border text-[9px] font-bold transition-all" onClick={() => {
                                    setObjSelMulti(new Set());
                                    setSelMulti(new Set(vertices.map((v) => v.id)));
                                  }}>Vértices ({vertices.length})</button>
                                  <button type="button" className="h-6 rounded bg-background hover:bg-muted border text-[9px] font-bold transition-all" onClick={() => {
                                    setSelMulti(new Set());
                                    setObjSelMulti(new Set(objetos.filter((o) => o.tipo === 'polilinha').map((o) => o.id)));
                                  }}>Linhas ({objetos.filter((o) => o.tipo === 'polilinha').length})</button>
                                  <button type="button" className="h-6 rounded bg-background hover:bg-muted border text-[9px] font-bold transition-all" onClick={() => {
                                    setSelMulti(new Set());
                                    setObjSelMulti(new Set(objetos.filter((o) => o.tipo === 'texto').map((o) => o.id)));
                                  }}>Textos ({objetos.filter((o) => o.tipo === 'texto').length})</button>
                                  <button type="button" className="h-6 rounded bg-background hover:bg-muted border text-[9px] font-bold transition-all" onClick={() => {
                                    setSelMulti(new Set());
                                    setObjSelMulti(new Set(objetos.filter((o) => o.tipo === 'cota').map((o) => o.id)));
                                  }}>Cotas ({objetos.filter((o) => o.tipo === 'cota').length})</button>
                                  <button type="button" className="h-6 rounded bg-background hover:bg-muted border text-[9px] font-bold transition-all" onClick={() => {
                                    setSelMulti(new Set());
                                    setObjSelMulti(new Set(objetos.filter((o) => o.tipo === 'simbolo').map((o) => o.id)));
                                  }}>Símbolos ({objetos.filter((o) => o.tipo === 'simbolo').length})</button>
                                  <button type="button" className="h-6 rounded bg-background hover:bg-muted border text-[9px] font-bold text-rose-500 hover:text-rose-600 transition-all" onClick={() => {
                                    setSelMulti(new Set());
                                    setObjSelMulti(new Set());
                                  }}>Limpar</button>
                                </div>
                              </div>
                            </div>
                          )}
                          {modo === 'copiar_base' && (
                            <div className="col-span-2 rounded-sm border border-violet-500/40 bg-violet-500/10 px-2 py-1.5 text-[9px] text-violet-600 dark:text-violet-400 font-semibold animate-in fade-in duration-200">
                              1) Clique em um vértice (ou ponto do mapa) para servir como referência base.
                            </div>
                          )}
                          {modo === 'copiar_destino' && (
                            <div className="col-span-2 rounded-sm border border-violet-500/40 bg-violet-500/10 px-2 py-1.5 text-[9px] text-violet-600 dark:text-violet-400 font-semibold animate-in fade-in duration-200">
                              2) Mova o cursor e clique no mapa para colar a cópia transladada.
                            </div>
                          )}
                          {objSel?.tipo === 'texto' && (
                            <div className="col-span-2 grid grid-cols-2 gap-1 mt-1">
                              <Button size="sm" variant="outline" onClick={() => editarObjetoSel({ tamanho: Math.max(6, (objSel.tamanho ?? 12) - 2) })} title="Diminuir texto"><span className="font-bold font-mono">A-</span></Button>
                              <Button size="sm" variant="outline" onClick={() => editarObjetoSel({ tamanho: (objSel.tamanho ?? 12) + 2 })} title="Aumentar texto"><span className="font-bold font-mono">A+</span></Button>
                              <Button size="sm" variant="outline" onClick={async () => { const t = await perguntar({ titulo: 'Editar texto', valorInicial: objSel.texto ?? '', multiline: true }); if (t != null) editarObjetoSel({ texto: t }); }} title="Editar texto"><Pencil className="size-3.5 text-cyan-500" /></Button>
                            </div>
                          )}
                          {objSel?.tipo === 'simbolo' && (
                            <div className="col-span-3 grid grid-cols-2 gap-1 mt-1">
                              <Button size="sm" variant="outline" onClick={() => editarObjetoSel({ tamanho: Math.max(10, (objSel.tamanho ?? 30) - 5) })} title="Diminuir símbolo"><span className="font-bold font-mono">S-</span></Button>
                              <Button size="sm" variant="outline" onClick={() => editarObjetoSel({ tamanho: Math.min(150, (objSel.tamanho ?? 30) + 5) })} title="Aumentar símbolo"><span className="font-bold font-mono">S+</span></Button>
                            </div>
                          )}
                          {objSel?.tipo === 'polilinha' && (
                            <div className="col-span-3 flex flex-col gap-2 mt-1 rounded border border-border/40 bg-muted/5 p-2 animate-in fade-in duration-200">
                              <div className="flex gap-1">
                                <Button size="sm" variant="secondary" className="gap-1.5 w-full justify-start text-[11px] h-7" onClick={converterPolilinhaEmPerimetro} title="Usar como perímetro">
                                  <RotateCcw className="size-3.5 text-emerald-500" /> Usar como perímetro
                                </Button>
                                <Button size="sm" variant={objSel.preenchido ? 'default' : 'outline'} className="w-full justify-start gap-1.5 text-[11px] h-7" onClick={() => editarObjetoSel({ preenchido: !objSel.preenchido })} title="Preencher">
                                  <Brush className="size-3.5 text-cyan-500" /> Preencher
                                </Button>
                              </div>

                              {/* Seleção de Cores */}
                              <div className="space-y-1">
                                <div className="text-[10px] font-bold text-muted-foreground">Cor do item:</div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {[
                                    { hex: '#2563eb', label: 'Azul' },
                                    { hex: '#dc2626', label: 'Vermelho' },
                                    { hex: '#16a34a', label: 'Verde' },
                                    { hex: '#ea580c', label: 'Laranja' },
                                    { hex: '#9333ea', label: 'Roxo' },
                                    { hex: '#eab308', label: 'Amarelo' },
                                    { hex: '#78350f', label: 'Marrom' },
                                    { hex: '#0f172a', label: 'Preto' },
                                  ].map((c) => (
                                    <button
                                      key={c.hex}
                                      type="button"
                                      title={c.label}
                                      className={`size-4 rounded-full border border-black/15 transition-all hover:scale-115 ${
                                        (objSel.cor ?? '#2563eb') === c.hex
                                          ? 'ring-2 ring-primary ring-offset-1 scale-110'
                                          : 'opacity-85 hover:opacity-100'
                                      }`}
                                      style={{ backgroundColor: c.hex }}
                                      onClick={() => editarObjetoSel({ cor: c.hex })}
                                    />
                                  ))}
                                  <label title="Cor personalizada" className="relative cursor-pointer size-4 rounded-full border border-black/15 bg-gradient-to-tr from-rose-500 via-emerald-500 to-sky-500 hover:scale-115 transition-all flex items-center justify-center overflow-hidden">
                                    <input
                                      type="color"
                                      className="sr-only"
                                      value={objSel.cor ?? '#2563eb'}
                                      onChange={(e) => editarObjetoSel({ cor: e.target.value })}
                                    />
                                  </label>
                                </div>
                              </div>

                              {/* Ajuste de Espessura */}
                              <div className="space-y-1">
                                <div className="text-[10px] font-bold text-muted-foreground">Espessura da linha:</div>
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    size="sm"
                                    type="button"
                                    variant="outline"
                                    className="h-7 w-7 p-0 flex items-center justify-center"
                                    onClick={() => editarObjetoSel({ espessura: Math.max(0.2, Number(((objSel.espessura ?? 1.2) - 0.2).toFixed(1))) })}
                                    title="Diminuir espessura"
                                  >
                                    <Minus className="size-3" />
                                  </Button>
                                  <div className="flex h-7 items-center justify-center rounded border bg-background/50 px-2.5 text-[10px] font-mono font-bold min-w-[55px]">
                                    {(objSel.espessura ?? 1.2).toFixed(1)} px
                                  </div>
                                  <Button
                                    size="sm"
                                    type="button"
                                    variant="outline"
                                    className="h-7 w-7 p-0 flex items-center justify-center"
                                    onClick={() => editarObjetoSel({ espessura: Math.min(12, Number(((objSel.espessura ?? 1.2) + 0.2).toFixed(1))) })}
                                    title="Aumentar espessura"
                                  >
                                    <Plus className="size-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                          {objetoSelId && (
                            <Button size="sm" variant="ghost" className="col-span-3 w-full justify-start text-red-500 hover:text-red-650 text-[11px] gap-2" onClick={apagarObjetoSel} title="Apagar objeto selecionado">
                              <Trash2 className="size-3.5 text-destructive" /> Apagar objeto
                            </Button>
                          )}
                        </div>

                        {/* MÉTRICAS DO LEVANTAMENTO: Layout Compacto iOS */}
                        {(res || chaveTopoVisivel || vista === 'planta') && (
                          <div className="mt-1 flex flex-col gap-1 border rounded-lg p-1 bg-muted/10 shadow-2xs">
                            <span className="text-[9px] font-extrabold uppercase tracking-wider pb-0.5 border-b text-muted-foreground select-none flex items-center">
                              <span>Métricas do Imóvel</span>
                            </span>
                            <div className="p-0.5">
                              {res && (
                                <div className="grid grid-cols-2 gap-1.5">
                                  {/* COLUNA ÁREA */}
                                  <div className="rounded-lg bg-white/60 dark:bg-slate-950/30 border border-slate-200/85 dark:border-slate-850/60 p-1.5">
                                    <div className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">
                                      Área (ha)
                                    </div>
                                    <div className="space-y-0.5 text-[10px] font-bold">
                                      <div className="flex justify-between items-baseline gap-1">
                                        <span className="text-slate-400 dark:text-slate-500 font-semibold text-[9px]">Sist:</span>
                                        <span className="font-mono text-slate-800 dark:text-white font-extrabold text-[9.5px]">
                                          {numBR(res.areaHa, casasTela(4))}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-baseline gap-1">
                                        <span className="text-emerald-650 dark:text-emerald-505 font-bold text-[9px]">SIGEF:</span>
                                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold text-[9.5px]">
                                          {numBR(valoresEfetivos(res, imovel).areaHa, casasTela(4))}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* COLUNA PERÍMETRO */}
                                  <div className="rounded-lg bg-white/60 dark:bg-slate-950/30 border border-slate-200/85 dark:border-slate-850/60 p-1.5">
                                    <div className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">
                                      Perímetro (m)
                                    </div>
                                    <div className="space-y-0.5 text-[10px] font-bold">
                                      <div className="flex justify-between items-baseline gap-1">
                                        <span className="text-slate-400 dark:text-slate-500 font-semibold text-[9px]">Sist:</span>
                                        <span className="font-mono text-slate-800 dark:text-white font-extrabold text-[9.5px]">
                                          {numBR(res.perimetro, 2)}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-baseline gap-1">
                                        <span className="text-emerald-650 dark:text-emerald-505 font-bold text-[9px]">SIGEF:</span>
                                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold text-[9.5px]">
                                          {numBR(valoresEfetivos(res, imovel).perimetro, 2)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}





                      </div>
                    )}

                    {/* CARD 4: GERENCIADOR DE CAMADAS — escondido pelo interruptor GERENCIADOR_CAMADAS_VISIVEL */}
                    {GERENCIADOR_CAMADAS_VISIVEL && medioOuMais && vista === 'mapa' && (
                      <div className="flex flex-col gap-1.5 border rounded-lg p-1.5 bg-muted/10 shadow-xs mt-1.5">
                        <span className="text-[9px] font-extrabold uppercase tracking-wider pb-0.5 border-b select-none flex items-center text-muted-foreground">
                          <span>Gerenciador de Camadas</span>
                        </span>
                        
                        <div className="flex flex-col gap-1 text-[10px] text-foreground mt-1">
                          {Object.keys(camadasVisiveis).map((key) => {
                            const label =
                              key === 'divisas' ? 'Divisas / Perímetro' :
                              key === 'ambientais' ? 'Áreas Ambientais (CAR)' :
                              key === 'polilinhas' ? 'Polilinhas / Linhas' :
                              key === 'textos' ? 'Textos' :
                              key === 'cotas' ? 'Cotas / Medidas' :
                              key === 'curvas' ? 'Curvas de Nível / Altimetria' : 'Símbolos';
                            
                            const estilo = estilosCamadas[key];
                            const visivel = camadasVisiveis[key];
                            const bloqueada = camadasBloqueadas[key];

                            return (
                              <div key={key} className="flex items-center justify-between gap-1 border-b border-border/40 pb-1 last:border-0 last:pb-0">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {/* Color picker dot */}
                                  <input
                                    type="color"
                                    value={estilo.cor}
                                    onChange={(e) => {
                                      const novaCor = e.target.value;
                                      setEstilosCamadas((prev) => ({
                                        ...prev,
                                        [key]: { ...prev[key], cor: novaCor }
                                      }));
                                    }}
                                    className="size-4 rounded-full cursor-pointer border-0 p-0 overflow-hidden shrink-0 bg-transparent"
                                    title="Alterar cor da camada"
                                  />
                                  <span className="truncate font-medium text-[9px]">{label}</span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {/* Espessura input */}
                                  {key !== 'textos' && key !== 'simbolos' && (
                                    <div className="flex items-center gap-0.5 mr-1 text-[8px] text-muted-foreground font-bold">
                                      <span>L:</span>
                                      <input
                                        type="number"
                                        min="0.5"
                                        max="10"
                                        step="0.5"
                                        value={estilo.espessura}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value) || 1;
                                          setEstilosCamadas((prev) => ({
                                            ...prev,
                                            [key]: { ...prev[key], espessura: val }
                                          }));
                                        }}
                                        className="w-8 h-4 rounded-sm border bg-background text-center text-[9px] font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                                        title="Espessura da linha"
                                      />
                                    </div>
                                  )}

                                  {/* Visibilidade toggle */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCamadasVisiveis((prev) => ({
                                        ...prev,
                                        [key]: !prev[key]
                                      }))
                                    }
                                    className={`p-0.5 rounded-sm hover:bg-muted ${visivel ? 'text-primary' : 'text-muted-foreground/40'}`}
                                    title={visivel ? 'Ocultar camada' : 'Exibir camada'}
                                  >
                                    {visivel ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                                  </button>

                                  {/* Cadeado toggle */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCamadasBloqueadas((prev) => ({
                                        ...prev,
                                        [key]: !prev[key]
                                      }))
                                    }
                                    className={`p-0.5 rounded-sm hover:bg-muted ${bloqueada ? 'text-red-500' : 'text-muted-foreground/40'}`}
                                    title={bloqueada ? 'Desbloquear camada' : 'Bloquear camada'}
                                  >
                                    {bloqueada ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Coluna única para barra colapsada */
                  <div className="flex flex-col gap-1 mb-1 [&>button]:relative [&>button]:size-9 [&>button]:p-0 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&_svg]:size-4">
                    <Button size="sm" variant="outline" onClick={criarNovoProjeto} disabled={processando} title="Novo projeto"><Plus className="size-4" /></Button>
                    <Button size="sm" variant="outline" onClick={() => setConferirAberto(true)} title="Conferir projeto"><CheckCircle2 className="size-4 text-emerald-500" /></Button>
                    <Button size="sm" variant={painelAberto ? 'default' : 'outline'} onClick={() => setPainelAberto((v) => !v)} title="Dados do projeto"><Settings className="size-4" /></Button>
                    <Button size="sm" variant="outline" onClick={() => (vista === 'mapa' ? centralizar() : ajustarPlanta())} title="Foco"><Target className="size-4" /></Button>
                    <Button size="sm" variant="outline" onClick={() => { setIaArquivoInicial(null); setIaAberta(true); }} title="IA Extrair: dados de PDFs, imagens e documentos"><Sparkles className="size-4 text-indigo-500" /></Button>
                    {completo && (<>
                    <Button size="sm" variant="outline" onClick={() => setGestaoAberta(true)} title="Gestão financeira"><Info className="size-4" /></Button>
                    <Button size="sm" variant="outline" onClick={abrirGestaoPontos} title="Banco de pontos"><Database className="size-4" /></Button>
                    </>)}
                    {medioOuMais && (<>
                    <div className="h-px bg-border my-1" />
                    <Button size="sm" variant={modo === 'linha' ? 'default' : 'ghost'} onClick={() => alternarModo('linha', true)} title="Linha reta (F6)"><PenTool /><Atalho k="F6" /></Button>
                    <Button size="sm" variant={modo === 'polilinha' ? 'default' : 'ghost'} onClick={() => alternarModo('polilinha', true)} title="Polilinha (F7)"><PenTool /><Atalho k="F7" /></Button>
                    <Button size="sm" variant={modo === 'tracejado' ? 'default' : 'ghost'} onClick={() => alternarModo('tracejado', true)} title="Tracejado (F8)"><PenTool className="opacity-70" /><Atalho k="F8" /></Button>
                    <Button size="sm" variant={modo === 'texto' ? 'default' : 'ghost'} onClick={() => alternarModo('texto')} title="Texto (F9)"><FileText /><Atalho k="F9" /></Button>
                    <Button size="sm" variant={modo === 'cota' ? 'default' : 'ghost'} onClick={() => alternarModo('cota', true)} title="Cotar (F10)"><IconeCota /><Atalho k="F10" /></Button>
                    <Button size="sm" variant={modo === 'retangulo' ? 'default' : 'ghost'} onClick={() => alternarModo('retangulo', true)} title="Retângulo (2 cantos)"><Square /></Button>
                    <Button size="sm" variant={modo === 'arco' ? 'default' : 'ghost'} onClick={() => alternarModo('arco', true)} title="Arco (3 pontos)"><Spline /></Button>
                    {completo && (
                    <Button size="sm" variant={modo === 'paralela' ? 'default' : 'ghost'} onClick={() => alternarModo('paralela', true)} title="Paralela"><Waypoints /></Button>
                    )}
                    <Button size="sm" variant={modo === 'simbolo' ? 'default' : 'ghost'} onClick={() => setElementosAberto((v) => !v)} title="Elementos"><svg viewBox="-14 -14 28 28" className="size-4" dangerouslySetInnerHTML={{ __html: simboloSvgInterno('arvore') }} /></Button>
                    <Button size="sm" variant={modo === 'inserir' ? 'default' : 'ghost'} onClick={() => alternarModo('inserir')} title="Inserir vértice"><Plus /></Button>
                    <Button size="sm" variant={modo === 'considerar' ? 'default' : 'ghost'} onClick={() => alternarModo('considerar')} title="Considerar"><Plus /></Button>
                    <Button size="sm" variant={modo === 'ignorar' ? 'default' : 'ghost'} onClick={() => alternarModo('ignorar')} title="Ignorar"><EyeOff /></Button>
                    <Button size="sm" variant={modo === 'apagar' ? 'default' : 'ghost'} onClick={() => alternarModo('apagar')} title="Apagar vértice"><Trash2 /></Button>
                    <Button size="sm" variant={modo === 'medir' ? 'default' : 'ghost'} onClick={() => alternarModo('medir', true)} title="Medir / Régua"><Ruler /></Button>
                    <Button size="sm" variant={modo === 'multi' ? 'default' : 'ghost'} onClick={() => alternarModo('multi')} title="Selecionar vários">
                      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
                        <circle cx="12" cy="5" r="2.4" fill="currentColor" />
                        <circle cx="5" cy="18" r="2.4" fill="currentColor" />
                        <circle cx="19" cy="18" r="2.4" fill="currentColor" />
                      </svg>
                    </Button>
                    </>)}
                  </div>
                )}

                {/* RODAPÉ INTEGRADO: Calc, Tema, Planos e Demo */}
                <div className="mt-1.5 border-t pt-1.5 px-1">
                  <div className={`grid gap-1 ${telaEstreita ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {([
                      ['Calc.', 'Calculadora: converter coordenada, distância e azimute', <Ruler key="i" className="size-3.5" />, () => setCalcAberta(true), 'text-indigo-600 dark:text-indigo-400', 'CC'],
                      ['Editor PDF', 'Comprimir, unir e extrair páginas de PDF (matrículas e peças)', <FileText key="i" className="size-3.5" />, () => setEditorPdfAberto(true), 'text-rose-600 dark:text-rose-400', 'PDF'],
                      ['Tema', 'Tema claro/escuro', tema === 'claro' ? <Moon key="i" className="size-3.5" /> : <Sun key="i" className="size-3.5" />, () => setTema((t) => (t === 'claro' ? 'escuro' : 'claro')), 'text-slate-500', 'TM'],
                      ['Planos', 'Planos e assinatura do Métrica', <CreditCard key="i" className="size-3.5" />, () => setAssinaturaAberta(true), 'text-emerald-600 dark:text-emerald-400', 'PL'],
                    ] as [string, string, React.ReactNode, () => void, string, string][]).map(([rotuloBtn, dica, icone, acao, cor, atalhoKey]) => (
                      <Button key={rotuloBtn} size="sm" variant="outline"
                        className={`!h-8.5 min-w-0 flex-row gap-1.5 overflow-hidden px-2 rounded-lg border border-border/80 bg-background/50 hover:bg-accent hover:text-accent-foreground hover:border-primary/30 transition-all duration-200 active:scale-95 shadow-2xs [&_svg]:${cor} [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:scale-110`}
                        title={dica} onClick={acao}>
                        <span className={cor}>{icone}</span>
                        <div className={`flex items-center gap-0.5 min-w-0 truncate ${telaEstreita ? 'hidden' : ''}`}>
                          <span className={`truncate text-center text-[10px] font-bold leading-none`}>{rotuloBtn}</span>
                          <Atalho k={atalhoKey} />
                        </div>
                      </Button>
                    ))}
                    {/* Demo: clique normal = projeto padrão, segurar = projeto GRANDE com complexidade configurável */}
                    <Button size="sm" variant="outline"
                      className={`!h-8.5 min-w-0 flex-row gap-1.5 overflow-hidden px-2 rounded-lg border border-border/80 bg-background/50 hover:bg-accent hover:text-accent-foreground hover:border-primary/30 transition-all duration-200 active:scale-95 shadow-2xs [&_svg]:text-amber-600 dark:[&_svg]:text-amber-400 [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:scale-110`}
                      title="Clique = demo normal · Segure = demo GRANDE (pergunta multiplicador de complexidade p/ teste de performance)"
                      onPointerDown={(e) => {
                        const timer = window.setTimeout(async () => {
                          (e.target as HTMLElement).dataset.longPress = '1';
                          const resp = await perguntar({
                            titulo: 'Demonstração de Alta Performance',
                            mensagem: 'Informe o fator multiplicador de complexidade do imóvel (ex: 1 = ~80 vértices, 5 = ~400 vértices, 10 = ~800 vértices, 50 = ~4.000 vértices, 100 = ~8.000 vértices):',
                            valorInicial: '10',
                          });
                          const mult = resp && !isNaN(Number(resp)) ? Math.max(1, Math.min(100, Number(resp))) : 1;
                          carregarProjetoFicticio({ grande: true, multiplicador: mult });
                        }, 800);
                        (e.target as HTMLElement).dataset.longTimer = String(timer);
                      }}
                      onPointerUp={(e) => {
                        const el = e.target as HTMLElement;
                        const timer = Number(el.dataset.longTimer || '0');
                        if (timer) window.clearTimeout(timer);
                        if (el.dataset.longPress === '1') {
                          el.dataset.longPress = '';
                          return;
                        }
                        el.dataset.longPress = '';
                        carregarProjetoFicticio();
                      }}
                      onPointerLeave={(e) => {
                        const el = e.target as HTMLElement;
                        const timer = Number(el.dataset.longTimer || '0');
                        if (timer) window.clearTimeout(timer);
                        el.dataset.longPress = '';
                      }}
                    >
                      <span className="text-amber-600 dark:text-amber-400"><FlaskConical className="size-4" /></span>
                      <div className={`flex items-center gap-0.5 min-w-0 truncate ${telaEstreita ? 'hidden' : ''}`}>
                        <span className="truncate text-center text-[10.5px] font-semibold leading-none">Demo</span>
                        <Atalho k="DM" />
                      </div>
                    </Button>
                  </div>
                </div>
                  </>
                )}
                {!telaEstreita && toolWEfetivo > 0 && (
                  <div
                    onMouseDown={(e) => { e.preventDefault(); setAsideDragging(true); }}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 z-50 transition-colors"
                  />
                )}
              </aside>
              {vista === 'mapa' && !telaEstreita && (
                <div onPointerDown={toolDown} onPointerMove={toolMove} onPointerUp={toolUp}
                  onDoubleClick={() => setToolW(200)}
                  className="no-print w-1.5 shrink-0 cursor-col-resize touch-none bg-border/40 hover:bg-primary/50" title="Arraste para redimensionar a barra · duplo clique = largura ideal (rótulos visíveis)" />
              )}
            </>
          );
        })()}
        <main className="relative isolate min-w-0 flex-1">
          {modoMaster === 'gerir' && souMaster() && user && !entrouSemLogin ? (
            <PainelMasterSaaS onVoltarDesenhar={() => setModoMaster('editar')} />
          ) : telaEstreita && mobileTela === 'home' ? (
            <MobileHome
              nomeProjeto={nomeProjeto}
              tema={tema}
              onAbrirProjetos={() => { setPainelAberto(true); setAba('projetos'); }}
              onNovoProjeto={criarNovoProjeto}
              onImportarIa={() => { setIaArquivoInicial(null); setIaAberta(true); }}
              onCompletarDados={() => { setPainelAberto(true); setAba('imovel'); }}
              onBaixarPecas={() => setPecasSheetAberto(true)}
              onAlternarTema={() => setTema((t) => (t === 'claro' ? 'escuro' : 'claro'))}
              onSair={async () => {
                if (!nuvemDisponivel) return;
                const ok = await confirmar({ titulo: 'Sair da conta', mensagem: user ? 'Deseja sair da sua conta?' : 'Voltar à tela inicial?', okLabel: user ? 'Sair' : 'Voltar' });
                if (!ok) return;
                limparConfigLocalNaSaida(); sair(); setLandingPageAberta(true); definirModoEntrada('login');
              }}
              podeSair={nuvemDisponivel}
              onVerMapa={() => setMobileTela('mapa')}
            />
          ) : (
            <>
              {/* BARRA FLUTUANTE ÚNICA (só desktop) — alternar Mapa/Planta, chave de modo, área e
              perímetro, glebas, controles da planta e áudios. NO CELULAR ela é extinta: o alternar
              Mapa/Planta vai pro cabeçalho, área/glebas ficam no painel de Dados, e os áudios saem. */}
          {vista === '3d' ? (
            <ErrorBoundary onReset={() => setVista('mapa')}>
              <Map3DViewer
                vertices={vertices}
                objetos={objetos}
                pontos3D={pontos3dCurvas()}
                verticesSemCota={vertices.filter((v) => !v.elevacao).length}
                onCompletarAltitudes={completarAltitudes}
                zona={zona}
                hemisferio={hemisferio}
                imovel={imovel}
                onVoltar2D={() => setVista('mapa')}
                gradeAltimetrica={gradeAltimetrica}
                onGerarCurvas={gerarCurvasNivelAuto}
                onCapture={(dataUrl, meta) => {
                  atualizarPlantaConfig((c) => ({
                    ...c,
                    print3dDataUrl: dataUrl,
                    mostrarPrint3D: true,
                    print3dVolumeCorte: meta?.volCorte,
                    print3dVolumeAterro: meta?.volAterro,
                    print3dZRef: meta?.zRef,
                    print3dMostrarTerraplanagem: meta != null,
                  }));
                  setPrint3dUrl(dataUrl);
                  aviso('Print do modelo 3D inserido na planta.');
                  setVista('planta');
                }}
              />
            </ErrorBoundary>
          ) : vista === 'mapa' ? (
            <ErrorBoundary onReset={() => setVista('planta')}>
              <MapEditor vertices={vertices} selecionadoId={selecionadoId} modo={modo} mostrarRotulos={mostrarRotulos} bloqueado={bloqueado} centralizarSig={centralizarSig}
                 gradeAltimetrica={gradeAltimetrica}
                 onDblClickObjeto={(id) => { setObjetoSelId(id); setObjPersonalizarId(id); }}
                 centroPadrao={entradaMapa.centro} zoomPadrao={entradaMapa.zoom}
                 onAtivar3D={modo3dAtivado ? () => setVista('3d') : undefined}
                confrontantes={confrontantes} confrontantePorLado={confrontantePorLado}
                zona={zona} hemisferio={hemisferio} orto={orto} snapAtivo={snapAtivo} segmentoSelecionado={segmentoSelecionado} onSegmentoSelecionado={setSegmentoSelecionado} offsetDistancia={offsetDistancia} onConfirmarParalela={confirmarParalela} copiarPontoBase={copiarPontoBase} onConfirmarCopiaBase={confirmarCopiaBase} onConfirmarCopiaDestino={confirmarCopiaDestino} onDividirSegmento={dividirSegmento} linhaLimite={linhaLimite} onLinhaLimite={setLinhaLimite} onConfirmarTrim={confirmarTrim} onConfirmarExtend={confirmarExtend} camadasVisiveis={camadasVisiveis} camadasBloqueadas={camadasBloqueadas} estilosCamadas={estilosCamadas}
                referencias={referencias}
                parcelasCert={parcelasCert} onAdotarVertice={adotarVerticeVizinho} verticesVizinho={verticesVizinho}
                mostrarCert={mostrarCert} opacidadeCert={opacidadeCert} parcelaCertSel={parcelaSel} onSelParcelaCert={setParcelaSel}
                corCert={corCert} corBordaCert={corBordaCert} espessuraCert={espessuraCert}
                onContextMenuCert={(idx, x, y) => setMenuContexto({ tipo: 'parcelaCert', verticeIdx: idx, x, y })}
                selMulti={selMulti} objSelMulti={objSelMulti} onToggleMulti={alternarMulti} onToggleMultiObj={alternarMultiObj} onBoxSelect={adicionarMulti} onBoxSelectObj={adicionarMultiObj}
                onDblClick={async (lat, lon) => {
                  if (modo === 'polilinha' || modo === 'tracejado') {
                    if (desenhoBuffer.length >= 2) {
                      snap();
                      const buf = desenhoBuffer;
                      setDesenhoBuffer([]);
                      setObjetos((os) => [...os, novaPolilinha(buf, modo === 'tracejado' ? { tracejado: true } : {})]);
                      aviso(modo === 'tracejado' ? 'Tracejado adicionado.' : 'Polilinha adicionada.');
                    }
                  }
                }}
                outrasGlebas={glebas.filter((g) => g.id !== glebaAtivaId).map((g) => g.vertices.filter((v) => Number.isFinite(v.lat)).map((v) => [v.lat, v.lon] as [number, number]))}
                objetos={objetos} desenhoAtual={desenhoBuffer.map((p) => [p.lat, p.lon] as [number, number])} rotulos={[]} centroGleba={centroGlebaInfo} onMoverCentro={(lat, lon) => setPlantaConfig((c) => ({ ...c, centroInfoPos: { lat, lon } }))} onAjustarDivisaConf={ajustarDivisaConf} estiloVertice={plantaConfig.estiloVertice} objetoSelId={objetoSelId}
        onMover={moverVertice} onSelecionar={setSelecionadoId} onApagar={apagarVertice} onInserir={inserirVertice}
                onCliqueDesenho={onCliqueDesenho} onSelecObjeto={(id) => { setObjetoSelId(id); setObjPersonalizarId(id); }} onContextMenuObjeto={(id, tipo, x, y) => { setObjetoSelId(id); setMenuContexto({ tipo: 'objeto', id, objetoTipo: tipo, x, y }); }} onMoverPontoObjeto={onMoverPontoObjeto} onMoverRotulo={onMoverRotulo} onPintarDivisa={pintarDivisa} onPintarConfrontante={pintarConfrontante} onMoverRotuloVertice={onMoverRotuloVertice} onEditarConfrontante={editarConfrontantePlanta}
                conflitos={conflitos} focoLatLng={focoLatLng} onCancelDesenho={() => setDesenhoBuffer([])} tamNomes={telaEstreita ? Math.min(tamNomes, 8) : tamNomes} tamCentro={telaEstreita ? Math.min(tamCentro, 9) : tamCentro}
                verticesIgnorados={verticesIgnorados} onIgnorarVertice={ignorarVertice} onConsiderarVertice={considerarVertice} realceId={realceId || pincelInicioId}
                onContextMenuVertice={(v, x, y) => setMenuContexto({ tipo: 'vertice', vertice: v, x, y })}
                onDblClickVertice={(v, x, y) => setPainelElem({ tipo: 'vertice', vertice: v, x, y })}
                onDblClickDivisa={(v, idx, x, y) => setPainelElem({ tipo: 'divisa', vertice: v, verticeIdx: idx, x, y })}
                onContextMenuDivisa={(v, idx, x, y) => setMenuContexto({ tipo: 'divisa', vertice: v, verticeIdx: idx, x, y })}
                onContextMenuMapa={(lat, lon, x, y) => {
                  if (modo !== 'navegar') {
                    if (desenhoBuffer.length >= 2) {
                      snap();
                      const buf = desenhoBuffer;
                      setDesenhoBuffer([]);
                      setObjetos((os) => [...os, novaPolilinha(buf, modo === 'tracejado' ? { tracejado: true } : {})]);
                      aviso(modo === 'tracejado' ? 'Tracejado concluído.' : 'Polilinha concluída.');
                    } else {
                      setDesenhoBuffer([]);
                    }
                    setModo('navegar');
                    return;
                  }
                  setVista('planta');
                }} />
            </ErrorBoundary>
          ) : null}

          {/* MULTI-SELEÇÃO: ação flutuante para apagar os vértices marcados */}
          {vista === 'mapa' && modo === 'multi' && (selMulti.size > 0 || objSelMulti.size > 0) && (
            <div className={`absolute left-1/2 top-3 ${Z_CLASSES.MAP_CONTROLS} -translate-x-1/2`}>
              <button className="flex items-center gap-2 rounded-full border border-red-500/40 bg-background/95 px-4 py-1.5 text-sm font-semibold text-red-600 shadow-lg backdrop-blur hover:bg-red-500 hover:text-white" onClick={apagarMultiSelecionados}>
                <Trash2 className="size-4" /> Apagar {[selMulti.size ? `${selMulti.size} vértice(s)` : '', objSelMulti.size ? `${objSelMulti.size} elemento(s)` : ''].filter(Boolean).join(' + ')}
              </button>
            </div>
          )}

          {/* DICA DE PINTURA (DIVISAS E CONFRONTANTES) */}
          {vista === 'mapa' && (modo === 'divisa' || modo === 'confrontante') && (
            <div className={`absolute left-1/2 top-3 ${Z_CLASSES.MAP_HINTS} -translate-x-1/2 rounded-full border px-4 py-1.5 shadow-lg backdrop-blur-md transition-all duration-300 ${
              modo === 'divisa'
                ? 'border-slate-500/50 bg-slate-900/90 text-white dark:border-slate-800'
                : 'border-blue-500/50 bg-blue-900/90 text-white dark:border-blue-800'
            }`}>
              <div className="flex gap-2 items-center text-[11px] font-bold">
                <Paintbrush className={`size-3.5 shrink-0 animate-pulse ${modo === 'divisa' ? 'text-slate-300' : 'text-blue-300'}`} />
                <span>
                  {modo === 'divisa' ? (
                    !pincelInicioId
                      ? 'Clique no vértice onde o trecho de divisa começa.'
                      : 'Clique no vértice final para colorir (siga o sentido horário do perímetro).'
                  ) : (
                    !confrontantePincelId
                      ? 'Escolha ou crie um confrontante na barra inferior antes de pintar.'
                      : !pincelInicioId
                        ? 'Clique no vértice onde o confrontante começa.'
                        : 'Clique no vértice final para colorir (siga o sentido horário do perímetro).'
                  )}
                </span>
              </div>
            </div>
          )}

          {/* PAINEL FLUTUANTE DE PROPRIEDADES DO ELEMENTO SELECIONADO (Canto Superior Direito) */}
          {objSel && (
            <div className={`absolute right-3 top-16 ${Z_CLASSES.PANEL_OBJECT_PROPERTIES} w-80 rounded-xl border border-indigo-500/20 bg-background/98 p-4 text-xs shadow-2xl backdrop-blur`}>
              <div className="mb-3 flex items-center justify-between border-b pb-2">
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider text-[10px]">Editar Elemento Selecionado</span>
                <button className="rounded-full p-1 hover:bg-muted text-muted-foreground transition-colors" onClick={() => setObjetoSelId(null)} title="Fechar"><X className="size-4" /></button>
              </div>

              <div className="space-y-3.5">
                <div className="flex items-center justify-between text-[10px] font-black uppercase text-muted-foreground bg-muted/40 px-2 py-1 rounded">
                  <span>Tipo: {objSel.tipo}</span>
                  <span className="font-mono text-zinc-400">ID: {objSel.id.substring(4)}</span>
                </div>

                {objSel.tipo === 'texto' && (
                  <div className="space-y-2">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-muted-foreground">Conteúdo do Texto</span>
                      <textarea
                        className="w-full border rounded-lg p-2 text-sm bg-background text-foreground"
                        rows={2}
                        value={objSel.texto ?? ''}
                        onChange={(e) => editarObjetoSel({ texto: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-muted-foreground">Tamanho Fonte</span>
                        <input
                          type="number"
                          className="w-full h-9 border rounded-lg px-2 bg-background text-foreground font-mono"
                          value={objSel.tamanho ?? 12}
                          onChange={(e) => editarObjetoSel({ tamanho: Number(e.target.value) })}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-muted-foreground">Cor do Texto</span>
                        <input
                          type="color"
                          className="w-full h-9 border rounded-lg p-1 bg-background text-foreground cursor-pointer"
                          value={objSel.cor || '#000000'}
                          onChange={(e) => editarObjetoSel({ cor: e.target.value })}
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 font-bold text-muted-foreground cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        className="accent-primary size-4"
                        checked={!!objSel.negrito}
                        onChange={(e) => editarObjetoSel({ negrito: e.target.checked })}
                      />
                      Negrito
                    </label>
                  </div>
                )}

                {objSel.tipo === 'cota' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-muted-foreground">Tamanho Fonte</span>
                        <input
                          type="number"
                          className="w-full h-9 border rounded-lg px-2 bg-background text-foreground font-mono"
                          value={objSel.tamanhoFonte ?? objSel.tamanho ?? 10}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            editarObjetoSel({ tamanhoFonte: val, tamanho: val });
                            try { localStorage.setItem('default_cota_tamanho', String(val)); } catch {}
                          }}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-muted-foreground">Cor</span>
                        <input
                          type="color"
                          className="w-full h-9 border rounded-lg p-1 bg-background text-foreground cursor-pointer"
                          value={objSel.cor || '#b91c1c'}
                          onChange={(e) => {
                            const val = e.target.value;
                            editarObjetoSel({ cor: val, corFonte: val });
                            try { localStorage.setItem('default_cota_cor', val); } catch {}
                          }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-muted-foreground">Espessura (px)</span>
                        <input
                          type="number"
                          step="0.1"
                          className="w-full h-9 border rounded-lg px-2 bg-background text-foreground font-mono"
                          value={objSel.espessura ?? 1.0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            editarObjetoSel({ espessura: val });
                            try { localStorage.setItem('default_cota_espessura', String(val)); } catch {}
                          }}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-muted-foreground">Posição Texto</span>
                        <select
                          className="w-full h-9 border rounded-lg px-2 bg-background text-foreground"
                          value={objSel.posicaoTexto || 'acima'}
                          onChange={(e) => {
                            const val = e.target.value;
                            editarObjetoSel({ posicaoTexto: val });
                            try { localStorage.setItem('default_cota_posicaoTexto', val); } catch {}
                          }}
                        >
                          <option value="acima">Acima da Linha</option>
                          <option value="centro">No Centro</option>
                          <option value="abaixo">Abaixo da Linha</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {objSel.tipo === 'polilinha' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-muted-foreground">Cor da Linha</span>
                        <input
                          type="color"
                          className="w-full h-9 border rounded-lg p-1 bg-background text-foreground cursor-pointer"
                          value={objSel.cor || '#2563eb'}
                          onChange={(e) => editarObjetoSel({ cor: e.target.value })}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-muted-foreground">Espessura (px)</span>
                        <input
                          type="number"
                          step="0.1"
                          className="w-full h-9 border rounded-lg px-2 bg-background text-foreground font-mono"
                          value={objSel.espessura ?? 1.2}
                          onChange={(e) => editarObjetoSel({ espessura: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-muted-foreground">Estilo da Linha</span>
                      <select
                        className="w-full h-9 border rounded-lg px-2 bg-background text-foreground"
                        value={objSel.estiloLinha || (objSel.tracejado ? 'tracejado' : 'solido')}
                        onChange={(e) => {
                          const val = e.target.value;
                          editarObjetoSel({ estiloLinha: val, tracejado: val === 'tracejado' });
                        }}
                      >
                        <option value="solido">Sólida</option>
                        <option value="tracejado">Tracejada</option>
                        <option value="pontilhado">Pontilhada</option>
                      </select>
                    </div>
                  </div>
                )}

                {objSel.tipo === 'simbolo' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-muted-foreground">Símbolo</span>
                        <select
                          className="w-full h-9 border rounded-lg px-2 bg-background text-foreground"
                          value={objSel.simbolo || 'norte'}
                          onChange={(e) => editarObjetoSel({ simbolo: e.target.value })}
                        >
                          <option value="norte">Rosa dos Ventos</option>
                          <option value="marco">Marco Geodésico</option>
                          <option value="arvore">Árvore</option>
                          <option value="casa">Construção</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-muted-foreground">Tamanho</span>
                        <input
                          type="number"
                          className="w-full h-9 border rounded-lg px-2 bg-background text-foreground font-mono"
                          value={objSel.tamanho ?? 30}
                          onChange={(e) => editarObjetoSel({ tamanho: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Ações */}
                <div className="pt-2 border-t flex gap-2">
                  <Button size="sm" variant="destructive" className="flex-1 font-bold h-9 bg-red-600 hover:bg-red-700 text-white gap-1.5" onClick={apagarObjetoSel}>
                    <Trash2 className="size-4" /> Apagar Elemento
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* PAINEL DE PRECISÃO (modo Completo + ferramenta de desenho ativa): trava de ângulo
              ORTO/POLAR e próximo ponto por RUMO E DISTÂNCIA digitados — praxe de CAD pra
              transcrever memorial/escritura sem caçar o ponto com o mouse. */}
          {vista === 'mapa' && medioOuMais && ['linha', 'polilinha', 'tracejado', 'cota', 'medir'].includes(modo) && (
            <div className="absolute bottom-16 left-1/2 z-[1000] -translate-x-1/2 rounded-lg border bg-background/95 px-2.5 py-1.5 shadow-xl backdrop-blur">
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  className={`rounded-sm border px-2 py-1 font-bold ${orto === 'off' ? 'text-muted-foreground' : 'border-primary bg-primary/10 text-primary'}`}
                  onClick={() => setOrto((o) => (o === 'off' ? '90' : o === '90' ? '15' : 'off'))}
                  title="Trava de ângulo do desenho: ORTO 90° prende em ângulos retos; POLAR 15° prende de 15 em 15 graus. O imã tem prioridade sobre a trava.">
                  {orto === 'off' ? 'ORTO off' : orto === '90' ? 'ORTO 90°' : 'POLAR 15°'}
                </button>
                <span className="text-muted-foreground">Azimute</span>
                <input className="h-7 w-24 rounded-sm border bg-background px-1.5 font-mono" placeholder="45 30 00" value={azDigitado}
                  onChange={(e) => setAzDigitado(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') adicionarPontoDigitado(); }} />
                <span className="text-muted-foreground">Dist. (m)</span>
                <input className="h-7 w-20 rounded-sm border bg-background px-1.5 font-mono" placeholder="25,40" value={distDigitada}
                  onChange={(e) => setDistDigitada(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') adicionarPontoDigitado(); }} />
                <Button size="sm" className="h-7" disabled={desenhoBuffer.length === 0} onClick={adicionarPontoDigitado}
                  title={desenhoBuffer.length === 0 ? 'Clique o primeiro ponto no mapa; os próximos podem ser digitados' : 'Adicionar o próximo ponto por rumo e distância (Enter)'}>
                  + Ponto
                </Button>
              </div>
            </div>
          )}

          {/* (o liga/desliga e a transparência das parcelas INCRA agora vivem na barra flutuante) */}

          {/* PAINEL DE INFO da parcela selecionada (não tampa o mapa: canto superior direito, estreito) */}
          {vista === 'mapa' && parcelaSel != null && parcelasCert[parcelaSel] && (
            <div className="absolute right-3 top-16 z-[1000] w-72 rounded-lg border bg-background/95 p-3 text-xs shadow-xl backdrop-blur">
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <span className="font-bold text-cyan-700 dark:text-cyan-300">{parcelasCert[parcelaSel].info.titulo}</span>
                <button className="rounded-sm p-0.5 hover:bg-muted" onClick={() => setParcelaSel(null)} title="Fechar"><X className="size-4" /></button>
              </div>
              <div className="space-y-1">
                {parcelasCert[parcelaSel].info.linhas.length
                  ? parcelasCert[parcelaSel].info.linhas.map((l, k) => <div key={k} className="border-b border-dashed border-border/50 pb-0.5">{l}</div>)
                  : <div className="text-muted-foreground">Sem metadados extras (o serviço público do INCRA não trouxe).</div>}
                <div className="pt-1 text-[10px] text-muted-foreground">{parcelasCert[parcelaSel].anel.length} vértices. Clique num ponto da divisa para adotá-lo no seu projeto.</div>
                
                
                <div className="my-2.5 rounded border border-cyan-500/20 bg-cyan-500/5 p-2.5 text-[10px] text-muted-foreground leading-relaxed">
                  <div className="font-semibold text-cyan-800 dark:text-cyan-400 mb-1.5 flex items-center gap-1">
                    <Info className="size-3.5 text-cyan-600" /> Como obter dados de confrontante no SIGEF:
                  </div>
                  <ol className="list-decimal pl-3 space-y-1">
                    <li>Clique em <strong>Copiar Código</strong> abaixo;</li>
                    <li>Clique em <strong>SIGEF</strong> para abrir a pesquisa;</li>
                    <li>No site, cole no campo <strong>Código do Imóvel</strong> e clique em Pesquisar;</li>
                    <li>Clique no ícone da <strong>nuvenzinha azul</strong> no final da linha e selecione obrigatoriamente <strong>CSV → Vértices</strong> (evite baixar o GML/Shapefile do contorno, pois eles possuem precisão reduzida de metros/decímetros no portal do INCRA);</li>
                    <li>Volte ao app e clique no botão violeta abaixo para importar o arquivo CSV para ter os vértices oficiais com precisão milimétrica.</li>
                  </ol>
                </div>

                <div className="mt-2.5 flex flex-col gap-1.5">
                  {parcelasCert[parcelaSel].codigoImovel && (
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => {
                        if (parcelasCert[parcelaSel].codigoImovel) {
                          navigator.clipboard.writeText(parcelasCert[parcelaSel].codigoImovel!);
                          aviso('Código do imóvel copiado!');
                        }
                      }}>
                        <Copy className="size-3.5" /> Copiar Código
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => {
                        window.open('https://sigef.incra.gov.br/consultar/parcelas/', '_blank');
                      }}>
                        <ExternalLink className="size-3.5" /> SIGEF
                      </Button>
                    </div>
                  )}
                  <Button size="sm" className="w-full gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium" onClick={() => verticesVizinhoRef.current?.click()}>
                    <Upload className="size-3.5" /> Importar CSV do Confrontante
                  </Button>
                  {/* Logo abaixo de importar, pra agilizar: depois de trazer as coordenadas do
                      confrontante, casar os vértices é o próximo passo natural — sem precisar abrir
                      o menu SIGEF pra achar esse botão. */}
                  <Button size="sm" variant="outline" className="w-full gap-1.5 font-bold border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                    disabled={vertices.length < 3} onClick={() => void casarVerticesCertificados()}
                    title="Adota a coordenada oficial do INCRA nos pontos de divisa em comum">
                    <Check className="size-3.5" /> Casar Vértices
                  </Button>

                  <div className="mt-2 flex flex-col gap-1 rounded bg-muted/30 p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Transparência:</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{Math.round(opacidadeCert * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={0.5}
                      step={0.02}
                      value={opacidadeCert}
                      onChange={(e) => setOpacidadeCert(Number(e.target.value))}
                      className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-cyan-600"
                    />
                  </div>
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
                  <div className={`relative bg-white shadow ${plantaDark ? 'a3-dark' : ''}`} style={{ width: 1587, height: 1123, transform: `translate(${plantaPan.x}px, ${plantaPan.y}px) scale(${plantaZoom})`, transformOrigin: 'left top' }}>
                    <ErrorBoundary onReset={() => setVista('mapa')}>
                    <Planta vertices={vertices} res={res} imovel={imovel} tecnico={tecnico} escritorio={escritorio}
                      confrontantes={confrontantes} confrontantePorLado={confrontantePorLado} zona={zona} hemisferio={hemisferio}
                      glebaNome={glebas.length > 1 ? glebaAtivaNome : undefined} dataExtenso={dataPorExtenso()} situacaoUrl={situacaoUrl} objetos={objetos} config={plantaConfig}
                      requerente={requerente} transmitente={transmitente}
                      outrasGlebas={glebas.filter((g) => g.id !== glebaAtivaId).map((g) => ({ nome: g.denominacao, pts: g.vertices.map((v) => ({ leste: v.leste, norte: v.norte })) }))}
                      resumoGlebas={resumoGlebas} verticesVizinho={verticesVizinho} parcelasCert={parcelasCert}
                      editavel={editarPlanta && !telaEstreita} modo={modo} objetoSelId={objetoSelId} desenhoAtual={desenhoBuffer}
                      mostrarRotulos={mostrarRotulos}
                      selMulti={selMulti} objSelMulti={objSelMulti} onBoxSelect={adicionarMulti} onBoxSelectObj={adicionarMultiObj} onToggleMulti={alternarMulti}
                      onCliquePlanta={onCliqueDesenho} onSelecObjeto={(id) => { setObjetoSelId(id); if (!id?.startsWith('planta:poligono_sigef')) setObjPersonalizarId(id); }} onMoverPontoObjeto={onMoverPontoObjeto} onMoverObjeto={onMoverObjeto} onDblClickVertice={(v, x, y) => setPainelElem({ tipo: 'vertice', vertice: v, x, y })} onDblClickDivisa={(v, idx, x, y) => setPainelElem({ tipo: 'divisa', vertice: v, verticeIdx: idx, x, y })} onAntesEditar={snap}
                      onDblClickObjeto={(id) => { setObjetoSelId(id); setObjPersonalizarId(id); }}
                      onMoverFolha={moverFolhaPlanta} onTextoMover={moverTextoPlanta} folhaTravada={folhaTravada} onToggleTravaFolha={() => { const nova = !folhaTravada; setFolhaTravada(nova); if (!nova) setModo('navegar'); }} onTextoStartEdit={() => setModo('texto')} onTextoPatch={patchTextoPlanta}
                      onContextMenuVazio={() => {
                        if (modo !== 'navegar') {
                          if (desenhoBuffer.length >= 2) {
                            snap();
                            const buf = desenhoBuffer;
                            setDesenhoBuffer([]);
                            setObjetos((os) => [...os, novaPolilinha(buf, modo === 'tracejado' ? { tracejado: true } : {})]);
                            aviso(modo === 'tracejado' ? 'Tracejado adicionado.' : 'Polilinha adicionada.');
                          } else {
                            setDesenhoBuffer([]);
                          }
                          setModo('navegar');
                          return;
                        }
                        setVista((v) => (v === 'planta' ? 'mapa' : 'planta'));
                      }}
                      onConfigPatch={(patch) => setPlantaConfig((c) => ({ ...c, ...patch }))} onAlternarTipoVertice={alternarTipo} onRenomearVertice={renomearVertice} onIgnorarVertice={ignorarVertice} onCiclarEstilo={ciclarEstiloPlanta} onCentralizarPlanta={ajustarPlanta}
                      onTextoEditar={editarTextoPlanta} onTextoMenu={(id, atual, x, y) => setMenuContexto({ tipo: 'texto', id, atual, x, y })}
                      onDblClickMalha={() => setAba('planta')}
                      situacaoStale={!!situacaoUrl && situacaoVersSnapshot !== snapshotDesenho}
                      print3dUrl={print3dUrl}
                      onRemoverPrint3D={() => { setPrint3dUrl(undefined); setPlantaConfig((c) => ({ ...c, print3dDataUrl: undefined })); }}
                      onAtualizarSituacao={gerarSituacaoPlanta}
                      onEditarConfrontante={editarConfrontantePlanta} onMoverRotuloConf={onMoverRotulo} onTamRotuloConf={ajustarTamRotuloConf} onAjustarDivisaConf={ajustarDivisaConf} />
                    </ErrorBoundary>
                  </div>
                )}
              </div>
            </div>
          )}
          {(vista === 'mapa' || vista === 'planta') && !telaEstreita && (
            <div
              style={{
                position: 'fixed',
                left: `${Math.max(toolWEfetivo + 12, Math.min(typeof window !== 'undefined' ? window.innerWidth - 200 : 800, Number.isFinite(posArea?.x) ? posArea.x : toolWEfetivo + 12))}px`,
                top: `${Math.max(12, Math.min(typeof window !== 'undefined' ? window.innerHeight - 80 : 600, Number.isFinite(posArea?.y) ? posArea.y : 12))}px`,
                maxWidth: `calc(100vw - ${toolWEfetivo + 24}px)`,
                zIndex: 1160
              }}
              className={`fixed no-print pointer-events-auto ${Z_CLASSES.FLOATING_TOOLBAR} flex flex-wrap items-center gap-1 overflow-visible border border-border/80 bg-background/95 backdrop-blur-sm p-1 shadow-xl select-none rounded-2xl`}
            >
              {/* Alça de arrasto */}
              {!telaEstreita && (
                <div
                  className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-muted-foreground mr-0.5"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setArrastandoArea({ startX: e.clientX, startY: e.clientY, startPosX: posArea.x, startPosY: posArea.y });
                  }}
                  title="Arraste para mover a barra"
                >
                  <GripVertical className="size-3.5" />
                </div>
              )}

              {/* Alternar Mapa/Planta */}
              <button type="button" onClick={() => setVista((v) => (v === 'mapa' ? 'planta' : 'mapa'))}
                title="Alternar entre mapa e planta (Esc)"
                className="flex h-7 items-center gap-1 rounded-full border border-yellow-500/20 bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 px-2 text-[10px] font-bold text-white shadow-sm transition hover:brightness-110 shrink-0">
                {vista === 'mapa' ? <Eye className="size-3.5" /> : <MapIcon className="size-3.5" />}
                <span>{vista === 'mapa' ? 'PLANTA' : 'MAPA'}</span>
                <span className="rounded-sm bg-black/20 px-1 font-mono text-[8px] font-semibold text-yellow-300">ESC</span>
              </button>

              {/* Trava/Destrava movimentação da folha / prancha */}
              <button type="button"
                onClick={() => {
                  const nova = !folhaTravada;
                  setFolhaTravada(nova);
                  if (!nova) setModo('navegar');
                }}
                title={folhaTravada ? "Folha Travada: clique para destravar a movimentação do carimbo, rosa dos ventos e tabelas" : "Folha Destravada: clique para travar e proteger as posições"}
                className={`flex h-7 items-center gap-1 rounded-full border px-2 text-[10px] font-bold shadow-xs transition-all shrink-0 ${
                  folhaTravada
                    ? 'border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700 dark:bg-slate-900 dark:text-slate-200'
                    : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 ring-1 ring-emerald-500/30'
                }`}>
                {folhaTravada ? <Lock className="size-3.5 text-slate-300" /> : <LockOpen className="size-3.5 text-emerald-500" />}
                <span>{folhaTravada ? 'TRAVADA' : 'DESTRAVADA'}</span>
              </button>

              {/* Pintar Divisas/Confrontantes */}
              {vista === 'mapa' && (modo === 'divisa' || modo === 'confrontante') && (
                <>
                  <div className="h-4 w-px bg-border shrink-0" />
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shrink-0 ${
                    modo === 'divisa' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                  }`}>
                    {modo === 'divisa' ? 'Divisas' : 'Confro.'}
                  </span>

                  {modo === 'divisa' && (
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition-all duration-700 shrink-0 ${
                      pincelInicioId
                        ? 'ring-1 ring-amber-500/50 bg-amber-500/10'
                        : 'ring-1.5 ring-amber-500/70 shadow-[0_0_12px_rgba(245,158,11,0.35)] animate-pulse-lento bg-amber-500/10'
                    }`}>
                      <span className="relative inline-flex shrink-0">
                        <button type="button"
                          className="flex h-7 items-center gap-1 rounded-full border border-border bg-background/95 px-1.5 hover:bg-muted transition-colors"
                          title="Ajustar as cores das divisas"
                          onClick={() => setCorPickerAberto((v) => !v)}>
                          <span className="inline-block h-1 w-3 rounded-full" style={{ backgroundColor: corDivisa(tipoDivisaPincel) || '#64748b' }} />
                          <Palette className="size-3 text-muted-foreground" />
                        </button>
                        {corPickerAberto && (
                          <div className={`absolute left-0 top-9 ${Z_CLASSES.DROPDOWN_MENU} w-56 rounded-xl border bg-background/98 backdrop-blur-xl p-3 shadow-2xl text-left`} data-cor-bump={corBump}>
                            <div className="mb-2 text-[9px] font-black uppercase text-muted-foreground tracking-wider">Cores das Divisas</div>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scroll-fino">
                              {coresEfetivas().filter(({ tipo }) => tipo !== 'linha-ideal').map(({ tipo, cor }) => (
                                <label key={tipo} className="flex items-center gap-2 text-[11px] text-foreground">
                                  <input type="color" value={cor || '#9ca3af'}
                                    className="h-6 w-8 shrink-0 cursor-pointer rounded border bg-transparent p-0"
                                    onChange={(e) => { salvarCorDivisa(tipo, e.target.value); setCorBump((n) => n + 1); }} />
                                  <span className="truncate">{rotuloDivisaTipo(tipo)}</span>
                                </label>
                              ))}
                            </div>
                            <Button type="button" size="sm" variant="outline" className="mt-3 w-full h-8 text-[10px]" onClick={() => setCorPickerAberto(false)}>
                              Fechar
                            </Button>
                          </div>
                        )}
                      </span>
                      <select className="h-7 max-w-[140px] rounded-full border border-amber-500/40 bg-background/95 px-1.5 text-[10px] font-bold outline-none ring-1 ring-amber-400/30 shrink-0"
                        value={tipoDivisaPincel} onChange={(e) => setTipoDivisaPincel(e.target.value)} title="Tipo de divisa a pintar">
                        {opcoesDivisaTipo.map((r) => (
                          <option key={r} value={r} className="bg-background text-foreground text-[10px]">{rotuloDivisaTipo(r)}</option>
                        ))}
                      </select>
                      <button type="button" className="shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        onClick={novoTipoDivisaPincel} title="Cadastrar novo tipo de divisa">
                        <Plus className="size-3" />
                      </button>
                    </div>
                  )}

                  {modo === 'confrontante' && (
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition-all duration-700 shrink-0 ${
                      pincelInicioId
                        ? 'ring-1 ring-emerald-500/50 bg-emerald-500/10'
                        : 'ring-1.5 ring-emerald-500/70 shadow-[0_0_12px_rgba(16,185,129,0.35)] animate-pulse-lento bg-emerald-500/10'
                    }`}>
                      {confrontantePincelId && (() => {
                        const pincelConf = confrontantes.find((x) => x.id === confrontantePincelId);
                        const corConf = corPorConfrontante(confrontantePincelId, pincelConf);
                        return (
                          <label className="relative cursor-pointer inline-block h-3 w-3 shrink-0 rounded-full border border-border hover:scale-110 transition-transform"
                            style={{ backgroundColor: corConf }} title="Mudar a cor deste confrontante">
                            <input
                              type="color"
                              className="sr-only"
                              value={corConf}
                              onChange={(e) => {
                                const novaCor = e.target.value;
                                setConfrontantes((cs) => cs.map((x) => (x.id === confrontantePincelId ? { ...x, cor: novaCor } : x)));
                              }}
                            />
                          </label>
                        );
                      })()}
                      <select className={`h-7 max-w-[140px] rounded-full border bg-background/95 px-1.5 text-[10px] font-bold outline-none transition-all shrink-0 ${
                        !confrontantePincelId ? 'border-emerald-500/60 ring-1.5 ring-emerald-400/40 text-emerald-700 dark:text-emerald-300' : 'border-border'
                      }`}
                        value={confrontantePincelId} onChange={(e) => setConfrontantePincelId(e.target.value)} title="Confrontante a pintar">
                        <option value="" className="bg-background text-muted-foreground text-[10px]">— Escolha ou Crie —</option>
                        {confrontantes.map((c) => (
                          <option key={c.id} value={c.id} className="bg-background text-[10px]" style={{ color: corPorConfrontante(c.id, c) }}>{c.nome || '(sem nome)'}</option>
                        ))}
                      </select>
                      {confrontantePincelId && (
                        <button type="button" className="shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => excluirConfrontante(confrontantePincelId)} title="Excluir este confrontante">
                          <Trash2 className="size-3" />
                        </button>
                      )}
                      <Button size="sm" className={`h-6 shrink-0 gap-1 rounded-full bg-emerald-600 px-2 text-[9px] font-black uppercase text-white hover:bg-emerald-700 transition-all ${
                        !confrontantePincelId ? 'ring-1.5 ring-emerald-300 shadow-sm animate-pulse-lento' : ''
                      }`}
                        onClick={novoConfrontantePincel} title="Novo confrontante">
                        <Plus className="size-3" /> Novo
                      </Button>
                    </div>
                  )}

                  <button type="button" className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
                    onClick={() => setModo('navegar')} title="Sair do modo de pintura">
                    <X className="size-3" />
                  </button>
                </>
              )}
              {glebas.length > 1 && (
                <>
                  <div className="h-4 w-px bg-border shrink-0" />
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-foreground shrink-0">
                    <Waypoints className="size-3.5 text-primary shrink-0" />
                    <select
                      value={glebaAtivaId}
                      onChange={(e) => trocarGleba(e.target.value)}
                      className="bg-transparent border-0 outline-none text-[10px] font-bold font-sans cursor-pointer text-foreground pr-1 focus:ring-0 max-w-[100px] truncate"
                    >
                      {glebas.map((g, idx) => (
                        <option key={g.id} value={g.id} className="text-foreground bg-background">
                          {g.denominacao || `Gleba ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Controles específicos do modo PLANTA */}
              {vista === 'planta' && (
                <>
                  <div className="h-4 w-px bg-border shrink-0" />
                  {!situacaoUrl && (
                    <button type="button" onClick={gerarSituacaoPlanta}
                      title="Capturar a planta de situação (satélite)"
                      className="flex h-7 items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400 px-2 text-[10px] font-bold transition-colors shrink-0">
                      <Camera className="size-3.5" />
                      Situação
                    </button>
                  )}

                  {/* Escala da Planta na Barra Flutuante */}
                  <div className="flex items-center gap-1 rounded-full border border-border bg-background/95 h-7 px-1 text-[10px] font-extrabold shrink-0 shadow-2xs">
                    <button type="button" className="size-5 rounded-full hover:bg-muted font-bold flex items-center justify-center text-xs text-foreground transition-colors" title="Reduzir escala" onClick={() => alterarEscala(250)}>-</button>
                    <button type="button" className="px-1 text-[9.5px] uppercase font-bold text-sky-600 dark:text-sky-400 hover:underline" title="Escala da Planta (clique para Automática)" onClick={() => setPlantaConfig((c) => ({ ...c, escalaManual: undefined }))}>
                      ESCALA{!plantaConfig.escalaManual ? ' (AUTO)' : ` 1:${obterEscalaEfetiva()}`}
                    </button>
                    <button type="button" className="size-5 rounded-full hover:bg-muted font-bold flex items-center justify-center text-xs text-foreground transition-colors" title="Aumentar escala" onClick={() => alterarEscala(-250)}>+</button>
                  </div>

                  {/* Tema da prancha */}
                  <button type="button" onClick={() => setPlantaDark((v) => !v)}
                    title={plantaDark ? 'Prancha escura — clique para a clara' : 'Prancha clara — clique para a escura (noturna)'}
                    className="flex h-7 items-center gap-1 rounded-full border border-border bg-background/95 px-2 text-[10px] font-bold text-foreground hover:bg-muted transition-colors shrink-0">
                    {plantaDark ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
                    <span>{plantaDark ? 'ESCURA' : 'CLARA'}</span>
                  </button>
                </>
              )}

              {/* Controles de tutoriais e áudios de ajuda (Ocultos no modo de pintura de divisas/confrontantes para despoluir a barra) */}
              {!introTocando && modo !== 'confrontante' && modo !== 'divisa' && (
                <>
                  <div className="h-4 w-px bg-border shrink-0" />
                  <div className="flex items-center gap-1 shrink-0">
                    <TutorialAudioPill modo={modoApp} />
                    {(videosUrl || videosTutorial.length > 0) && (
                      <button type="button" onClick={() => setVideosListaAberta(true)}
                        className="flex h-6 items-center gap-1 rounded-full border bg-background/95 px-2 text-[10px] font-bold uppercase tracking-wide text-red-600 dark:text-red-400 hover:bg-muted transition-colors"
                        title="Vídeos tutoriais por tema">
                        <Youtube className="size-3 shrink-0" /> Vídeos
                      </button>
                    )}
                    <button type="button" onClick={() => setMostrarRotulos((m) => !m)}
                      title={`${mostrarRotulos ? 'Esconder' : 'Mostrar'} nomes dos vértices (RO)`}
                      className={`flex h-6 items-center gap-1 rounded-full border px-2 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                        mostrarRotulos 
                          ? 'bg-primary text-primary-foreground border-primary/50' 
                          : 'bg-background text-muted-foreground hover:bg-muted'
                      }`}>
                      {mostrarRotulos ? <Eye className="size-3 shrink-0" /> : <EyeOff className="size-3 shrink-0" />}
                      <span>Rótulos</span>
                    </button>
                    <button type="button" onClick={() => trocarModoApp(proximoModo(modoApp))}
                      title={completo
                        ? 'Modo Completo. Clique para o Fácil.'
                        : medio
                          ? 'Modo Médio. Clique para o Completo.'
                          : 'Modo Fácil. Clique para o Médio.'}
                      className="flex h-6 items-center gap-1 rounded-full border bg-background/95 px-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                      {completo ? <Briefcase className="size-3 text-sky-500 shrink-0" /> : medio ? <PencilRuler className="size-3 text-emerald-500 shrink-0" /> : <GraduationCap className="size-3 text-amber-500 shrink-0" />}
                      <span>Modo {completo ? 'Completo' : medio ? 'Médio' : 'Fácil'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}



            </>
          )}
        </main>


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
        correcoes={correcoes}
        onBaixar={() => setBaixou((b) => ({ ...b, req: true }))}
      />
      <ErrorBoundary onReset={() => setCalcAberta(false)}>
        <CalculadoraModal open={calcAberta} onOpenChange={setCalcAberta} zona={zona} hemisferio={hemisferio} />
      </ErrorBoundary>
      <ErrorBoundary onReset={() => setEditorPdfAberto(false)}>
        <EditorPdfModal aberto={editorPdfAberto} onFechar={() => setEditorPdfAberto(false)} onExtrairComIA={() => { setIaArquivoInicial(null); setIaAberta(true); }} />
      </ErrorBoundary>
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
        onAplicar={(parcial, destino, arquivo, verticesExtraidos) => {
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
          // Anexa o arquivo que a IA acabou de ler ao projeto — antes ele só existia na memória do
          // navegador durante a extração e sumia depois; agora fica salvo junto, no dono certo.
          const anexar = (dono: 'imovel' | 'confrontante', confrontanteId?: string) => {
            if (arquivo && projetoId) {
              salvarArquivo(projetoId, arquivo, { dono, confrontanteId, tipoDoc: 'ia-extracao' }).catch(() => {});
            }
          };
          if (verticesExtraidos && verticesExtraidos.length >= 3) {
            const { latLonDeUtm } = require('@/lib/topo/coords');
            const novosV: Vertex[] = verticesExtraidos.map((v, i) => {
              const geo = latLonDeUtm(v.leste, v.norte, zona, hemisferio);
              const cod = v.nome || `P-${i + 1}`;
              return {
                id: `v_${Date.now()}_${i}`,
                ordem: i + 1,
                nome: cod,
                codigoCampo: cod,
                norte: v.norte,
                leste: v.leste,
                elevacao: v.elevacao ?? 0,
                lat: geo.lat,
                lon: geo.lon,
                tipo: 'M',
                codigoSigef: cod,
                isDivisa: true,
              };
            });
            setVertices(novosV);
            aviso(`IA extraiu ${novosV.length} vértices e gerou o polígono do imóvel.`);
          }
          if (destino === 'imovel') {
            setImovel((im) => ({ ...im, ...parcial }));
            anexar('imovel');
            aviso('Dados da IA aplicados ao imóvel — confira antes de gerar as peças.');
          } else if (destino === 'novo') {
            const id = `c_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)}`;
            setConfrontantes((cs) => [...cs, { id, nome: '', cpf: '', matricula: '', cns: '', ...patchConf() }]);
            anexar('confrontante', id);
            aviso('Confrontante criado a partir do documento — pinte as divisas dele no mapa.');
          } else {
            setConfrontantes((cs) => cs.map((c) => (c.id === destino ? { ...c, ...patchConf() } : c)));
            anexar('confrontante', destino);
            aviso('Dados da IA aplicados ao confrontante — confira antes de gerar as peças.');
          }
        }} />
      <ErrorBoundary onReset={() => setPrecoSugAberto(false)}>
        <PrecoSugeridoModal open={precoSugAberto} onOpenChange={setPrecoSugAberto} areaHa={res ? valoresEfetivos(res, imovel).areaHa : 0} />
      </ErrorBoundary>
      <SigefMenuModal
        open={sigefMenuAberto}
        onOpenChange={setSigefMenuAberto}
        colegasIdentificados={colegasIdentificados}
        parcelasCert={parcelasCert}
        mostrarCert={mostrarCert}
        setMostrarCert={setMostrarCert}
        opacidadeCert={opacidadeCert}
        setOpacidadeCert={setOpacidadeCert}
        importarVizinhosAuto={importarVizinhosAuto}
        onImportarCsvVizinhos={() => verticesVizinhoRef.current?.click()}
        onGerarVirtual={() => {
          setVvBase(null);
          setVvAberto(true);
        }}
        onCorrigirLatLon={() => corrigirLatLonRef.current?.click()}
        onAbrirPlanilhaConf={() => setPlanilhaConfAberta(true)}
        onAbrirConferir={() => setConferirAberto(true)}
      />
      <ErrorBoundary onReset={() => setCarAberto(false)}>
        <CarModal open={carAberto} onOpenChange={setCarAberto} areaHa={res ? valoresEfetivos(res, imovel).areaHa : 0}
          areasCamadas={(() => { const a = { app: 0, reservaLegal: 0, vegetacao: 0, usoConsolidado: 0 }; for (const o of objetos) if (o.tipo === 'polilinha' && o.carTema && o.pontos.length >= 3) a[o.carTema] += areaPoligonoObjeto(o); return a; })()}
          onExportarShapefiles={exportarCarShapefiles} onImportarShapefile={() => shapefileRef.current?.click()} processando={processando} />
      </ErrorBoundary>
      <ErrataModal open={errataAberto} onOpenChange={setErrataAberto} imovel={imovel} tecnico={tecnico} confrontantes={confrontantes} areaHa={res ? valoresEfetivos(res, imovel).areaHa : 0} correcoes={correcoes} onChangeCorrecoes={setCorrecoes} onBaixar={() => setBaixou((b) => ({ ...b, errata: true }))} />
      <AnuenciaModal open={anuenciaAberta} onOpenChange={setAnuenciaAberta} confrontantes={confrontantes} lados={lados} mapa={confrontantePorLado} imovel={imovel} tecnico={tecnico} />
      <HistoriaModal open={historiaAberta} onOpenChange={setHistoriaAberta} />

      {/* JANELA MODAL CENTRALIZADA DADOS DO IMÓVEL */}
      <Dialog open={painelAberto} onOpenChange={setPainelAberto}>
        <DialogContent className="max-w-4xl h-[84vh] max-h-[780px] min-h-[580px] flex flex-col bg-card p-4 rounded-xl border shadow-2xl overflow-hidden">
          <DialogHeader className="pb-2 border-b flex flex-row items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide">
              <Upload className="size-4 text-indigo-500" />
              Dados do Imóvel &amp; Responsável Técnico
            </DialogTitle>
          </DialogHeader>

          {/* Seletor de Abas Horizontais */}
          <div className="flex flex-wrap gap-1 border-b bg-muted/20 p-1 my-2 rounded-lg">
            {([
              ['imovel', 'IMÓVEL', <BookUser key="i" className="size-3.5" />],
              ['localizacao', 'LOCALIZAÇÃO', <MapIcon key="i" className="size-3.5" />],
              ['proprietario', 'PROPRIETÁRIO', <Users key="i" className="size-3.5" />],
              ['vertices', 'VÉRTICES', <Waypoints key="i" className="size-3.5" />],
              ['confrontantes', 'CONFRONTANTES', <Users key="i" className="size-3.5" />],
              ['planta', 'PLANTA', <MapIcon key="i" className="size-3.5" />],
              ['projetos', 'PROJETOS', <Database key="i" className="size-3.5" />],
            ] as [Aba, string, React.ReactNode][]).map(([a, rot, icone]) => (
              <button
                key={a}
                type="button"
                onClick={() => setAba(a)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] font-extrabold uppercase tracking-wider transition-colors ${aba === a ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-secondary text-secondary-foreground hover:bg-muted'}`}
              >
                {icone}
                <span className="truncate">{rot}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto py-1 pr-1">
            {['imovel', 'localizacao', 'proprietario'].includes(aba) && (
              <PainelImovel
                aba={aba}
                imovel={imovel}
                onChange={setImovel}
                onMunicipio={aoMudarMunicipio}
                onLocal={aoMudarLocalidade}
                nome={nomeProjeto}
                onNome={(v) => { setNomeProjeto(v); setNomeProjetoManual(true); }}
                zona={zona}
                hemisferio={hemisferio}
                onZona={trocarZona}
                onHemisferio={trocarHemisferio}
                sugProp={sugProp}
                onSalvarProp={salvarPropCadastro}
                sugCartorios={sugCartorios}
                onIa={() => { setIaArquivoInicial(null); setIaAberta(true); }}
                projetoId={projetoId}
                extrairDocumento={extrairDocumento}
              />
            )}

            {aba === 'confrontantes' && (
              <PainelConfrontantes
                confrontantes={confrontantes}
                onChange={setConfrontantes}
                onExcluir={excluirConfrontante}
                onEditar={setConfEditId}
                mapa={confrontantePorLado}
                lados={lados}
                sugConf={sugConf}
                onSalvarCadastro={salvarConfCadastro}
                imovel={imovel}
                tecnico={tecnico}
                projetoId={projetoId}
                onExtrairConfrontante={extrairDocumentoConfrontante}
                sugCartorios={sugCartorios}
              />
            )}

            {aba === 'vertices' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <SecaoTitulo>Lista de Vértices ({vertices.length})</SecaoTitulo>
                  <div className="text-xs text-muted-foreground font-mono">
                    Perímetro: {res ? res.perimetro.toFixed(2) : '0.00'} m | Área: {res ? res.areaHa.toFixed(4) : '0.0000'} ha
                  </div>
                </div>
                {vertices.length === 0 ? (
                  <div className="text-center py-12 border border-dashed rounded-xl text-muted-foreground text-xs">
                    Nenhum vértice cadastrado no projeto atual. Importe um TXT, DXF ou clique no mapa para adicionar.
                  </div>
                ) : (
                  <div className="border rounded-xl overflow-hidden shadow-xs bg-background max-h-[440px] overflow-y-auto scroll-fino">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-muted/50 border-b text-[10px] uppercase font-bold text-muted-foreground sticky top-0 bg-muted z-10">
                        <tr>
                          <th className="p-2 text-center w-10">#</th>
                          <th className="p-2">Vértice</th>
                          <th className="p-2">Leste (E)</th>
                          <th className="p-2">Norte (N)</th>
                          <th className="p-2">Altitude (Z)</th>
                          <th className="p-2">Tipo</th>
                          <th className="p-2">Método</th>
                          <th className="p-2">Limite</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-[11px]">
                        {vertices.map((v, i) => (
                          <tr key={v.id || i} className="hover:bg-muted/30 transition-colors">
                            <td className="p-2 text-center font-bold text-muted-foreground">{i + 1}</td>
                            <td className="p-2 font-black text-emerald-600 dark:text-emerald-400">{v.nome}</td>
                            <td className="p-2">{v.leste.toFixed(3)}</td>
                            <td className="p-2">{v.norte.toFixed(3)}</td>
                            <td className="p-2">{Number.isFinite(v.elevacao) ? v.elevacao.toFixed(2) : '0.00'}</td>
                            <td className="p-2"><span className="px-1.5 py-0.5 rounded bg-muted font-bold text-[9px]">{v.tipo || 'P'}</span></td>
                            <td className="p-2 text-muted-foreground text-[10px]">{v.metodo || '—'}</td>
                            <td className="p-2 text-muted-foreground text-[10px]">{v.tipoLimite || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {aba === 'planta' && (
              <PainelPlanta
                config={plantaConfig}
                onChange={atualizarPlantaConfig}
                temSituacao={!!situacaoUrl}
                temLogo={!!escritorio?.logoDataUrl}
                numGlebas={glebas.length}
                onVerPlanta={() => { setPainelAberto(false); setVista('planta'); }}
                onSalvarPadrao={() => {
                  const tit = (plantaConfig.titulo || 'Padrão').trim();
                  salvarPlantaTemplate(tit, plantaConfig);
                  salvarPlantaPadrao(plantaConfig);
                  aviso(`Modelo de planta salvo para o tipo de trabalho: "${tit}".`);
                }}
              />
            )}

            {aba === 'projetos' && (
              <div className="space-y-2">
                <SecaoTitulo>Projetos salvos</SecaoTitulo>
                {projetos.length === 0 && <p className="text-xs text-muted-foreground">Nenhum projeto salvo ainda.</p>}
                {projetos.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border p-2 bg-muted/10">
                    <div className="min-w-0">
                      <div className="w-full truncate text-xs font-bold">{p.nome}</div>
                      <div className="text-[10px] text-muted-foreground">{contarVertices(p)} vértices</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => { carregarProjetoComConfirmacao(p.id); setPainelAberto(false); }}>
                        <FolderOpen className="size-3" /> Abrir
                      </Button>
                      <Button size="sm" variant="ghost" className="size-7 p-0 text-destructive" onClick={() => remover(p.id)}>
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Abertura de Projetos Rápidos (Status Bar) */}
      <Dialog open={projetosModalAberto} onOpenChange={setProjetosModalAberto}>
        <DialogContent className="max-w-lg bg-card p-6 rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="flex items-center gap-2 text-base font-extrabold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
              <FolderOpen className="size-5 text-indigo-500" />
              Selecione um Projeto para Abrir
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 flex-1 overflow-y-auto space-y-2">
            {projetos.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm font-semibold text-muted-foreground">Nenhum projeto salvo no Souza-CAD.</p>
                <Button size="sm" className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold" onClick={() => { setProjetosModalAberto(false); criarNovoProjeto(); }}>
                  <Plus className="size-3.5" /> Criar Novo Projeto
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {projetos.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => { carregarProjetoComConfirmacao(p.id); setProjetosModalAberto(false); }}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-border/70 hover:border-indigo-500/50 hover:bg-indigo-500/5 bg-muted/10 cursor-pointer transition-all duration-200 group"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-black text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase truncate">
                        {p.nome || 'Imóvel sem Nome'}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground font-mono">
                        <span className="bg-slate-250 dark:bg-slate-800 px-1.5 py-0.5 rounded text-foreground font-bold font-sans">
                          {p.imovel?.municipio || 'Sem Município'}
                        </span>
                        <span>•</span>
                        <span>{contarVertices(p)} vértices</span>
                        {calcularAreaHaProjeto(p) > 0 && (
                          <>
                            <span>•</span>
                            <span>{calcularAreaHaProjeto(p).toFixed(4)} ha</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-[10px] font-bold gap-1 bg-background hover:bg-indigo-600 hover:text-white transition-all shadow-xs border-border/80"
                        onClick={(e) => { e.stopPropagation(); carregarProjetoComConfirmacao(p.id); setProjetosModalAberto(false); }}
                      >
                        <FolderOpen className="size-3" /> Abrir
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="size-8 p-0 text-destructive hover:bg-destructive/10"
                        onClick={(e) => { e.stopPropagation(); remover(p.id); }}
                        title="Excluir projeto"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Configuração e Geração de Curvas de Nível */}
      {/* Modal de Configuração e Geração de Curvas de Nível */}
      <Dialog open={curvaConfigAberta} onOpenChange={setCurvaConfigAberta}>
        <DialogContent className="sm:max-w-md bg-card p-4 rounded-xl border shadow-2xl fixed top-4 right-4 translate-x-0 translate-y-0 left-auto bottom-auto max-h-[90vh] overflow-y-auto z-[1300]">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide">
              <IconeCurvasNivel className="size-4 text-indigo-500" />
              Configuração e Geração de Curvas
            </DialogTitle>
          </DialogHeader>

          {/* Abas */}
          <div className="flex border-b text-xs font-bold my-2 select-none">
            <button
              type="button"
              onClick={() => setAbaCurva('geracao')}
              className={`flex-1 py-1.5 text-center border-b-2 transition-all ${
                abaCurva === 'geracao'
                  ? 'border-indigo-500 text-indigo-500 font-extrabold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Parâmetros de Geração
            </button>
            <button
              type="button"
              onClick={() => setAbaCurva('estilo')}
              className={`flex-1 py-1.5 text-center border-b-2 transition-all ${
                abaCurva === 'estilo'
                  ? 'border-indigo-500 text-indigo-500 font-extrabold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Estilo Visual & Grade
            </button>
          </div>

          <div className="py-2 space-y-3 min-h-[220px]">
            {abaCurva === 'geracao' ? (
              <>
                {/* Intervalo (m) + Botão Sugerir */}
                <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/20 p-2 border">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground">Intervalo entre Curvas:</span>
                    <button type="button"
                      onClick={() => setIntervaloCurva((c) => Math.max(0.1, +(c - 1).toFixed(2)))}
                      className="size-6 rounded bg-background border hover:bg-muted text-xs font-bold flex items-center justify-center">-</button>
                    <input type="number" min={0.1} step={1} value={intervaloCurva}
                      onChange={(e) => setIntervaloCurva(Math.max(0.1, Number(e.target.value) || 1))}
                      className="h-6 w-12 rounded border border-input bg-background px-1 text-center text-xs font-bold"
                      title="Intervalo entre as curvas de nível (metros)" />
                    <button type="button"
                      onClick={() => setIntervaloCurva((c) => +(c + 1).toFixed(2))}
                      className="size-6 rounded bg-background border hover:bg-muted text-xs font-bold flex items-center justify-center">+</button>
                    <span className="text-xs text-muted-foreground font-mono">m</span>
                  </div>
                  <Button type="button" size="sm" onClick={sugerirIntervaloCurva}
                    title="Sugerir intervalo pelo desnível"
                    className="h-6 bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 text-[10px] font-bold">
                    Sugerir
                  </Button>
                </div>

                {/* Linha Mestra a cada */}
                <div className="flex items-center justify-between gap-2 bg-muted/20 p-2 rounded-lg border">
                  <span className="text-xs font-semibold text-muted-foreground">Curva Mestra a cada:</span>
                  <div className="flex items-center gap-1.5">
                    <button type="button"
                      onClick={() => setCurvaMestraCada((c) => Math.max(1, c - 1))}
                      className="size-6 rounded bg-background border hover:bg-muted text-xs font-bold flex items-center justify-center">-</button>
                    <input type="number" min={1} step={1} value={curvaMestraCada}
                      onChange={(e) => setCurvaMestraCada(Math.max(1, Math.round(Number(e.target.value) || 3)))}
                      className="h-6 w-12 rounded border border-input bg-background text-center text-xs font-bold" />
                    <button type="button"
                      onClick={() => setCurvaMestraCada((c) => c + 1)}
                      className="size-6 rounded bg-background border hover:bg-muted text-xs font-bold flex items-center justify-center">+</button>
                    <span className="text-xs text-muted-foreground font-medium">curvas</span>
                  </div>
                </div>

                {/* Fonte DEM (Altitude) */}
                <div className="flex items-center justify-between gap-2 bg-muted/20 p-2 rounded-lg border">
                  <span className="text-xs font-semibold text-muted-foreground">Modelo de Elevação (DEM):</span>
                  <select
                    value={modeloElevacao}
                    onChange={(e) => {
                      setModeloElevacao(e.target.value as any);
                      setGradeAltimetrica([]);
                    }}
                    className="h-7 rounded border bg-background px-2 text-xs font-bold focus:ring-1 focus:ring-primary focus:outline-none w-44"
                  >
                    <option value="copernicus_dem_30">Copernicus 30m</option>
                    <option value="alos_dem_30">ALOS 3D 30m</option>
                    <option value="srtm_gld3">SRTM 30m</option>
                  </select>
                </div>
              </>
            ) : (
              <>
                {/* Resolução da Grade */}
                <div className="flex items-center justify-between gap-2 bg-muted/20 p-2 rounded-lg border">
                  <span className="text-xs font-semibold text-muted-foreground">Grade de Amostragem:</span>
                  <select
                    value={gradeDensidadeMetros}
                    onChange={(e) => {
                      setGradeDensidadeMetros(Number(e.target.value));
                      setGradeAltimetrica([]);
                    }}
                    className="h-7 rounded border bg-background px-2 text-xs font-bold focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value={30}>Nativo Satélite (30m)</option>
                    <option value={20}>Denso (20m)</option>
                    <option value={50}>Médio (50m)</option>
                    <option value={100}>Esparso (100m)</option>
                  </select>
                </div>

                {/* Espessura das Curvas */}
                <div className="flex items-center justify-between gap-2 bg-muted/20 p-2.5 rounded-lg border">
                  <span className="text-xs font-semibold text-muted-foreground">Espessura:</span>
                  <div className="flex items-center gap-2">
                    {(['fina', 'media', 'grossa'] as const).map((e) => (
                      <button key={e} type="button" onClick={() => setCurvaEspessura(e)}
                        className={`flex flex-col items-center justify-center px-2 py-1 min-w-[48px] rounded transition-all ${curvaEspessura === e ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 shadow-sm font-bold' : 'bg-background hover:bg-muted text-foreground border font-medium'}`}>
                        <span className="text-[9px] leading-none mb-1">{e === 'fina' ? 'Fina' : e === 'media' ? 'Média' : 'Grossa'}</span>
                        <span className={`w-full rounded-full ${e === 'fina' ? 'h-[1px] bg-current opacity-70' : e === 'media' ? 'h-[2.5px] bg-current opacity-90' : 'h-[4px] bg-current'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Estilo das Linhas (Mestra e Normal) */}
                <div className="grid grid-cols-2 gap-2 bg-muted/20 p-2 rounded-lg border">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Linha Normal</span>
                    <select
                      value={curvaEstiloNormal}
                      onChange={(e) => setCurvaEstiloNormal(e.target.value as any)}
                      className="h-7 rounded border bg-background px-1.5 text-xs font-bold focus:ring-1 focus:ring-primary focus:outline-none w-full"
                    >
                      <option value="solido">Sólido</option>
                      <option value="tracejado">Tracejado</option>
                      <option value="pontilhado">Pontilhado</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Linha Mestra</span>
                    <select
                      value={curvaEstiloMestra}
                      onChange={(e) => setCurvaEstiloMestra(e.target.value as any)}
                      className="h-7 rounded border bg-background px-1.5 text-xs font-bold focus:ring-1 focus:ring-primary focus:outline-none w-full"
                    >
                      <option value="solido">Sólido</option>
                      <option value="tracejado">Tracejado</option>
                      <option value="pontilhado">Pontilhado</option>
                    </select>
                  </div>
                </div>

                {/* Cores das Curvas */}
                <div className="bg-muted/20 p-2 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Colorização Automática:</span>
                    <button
                      type="button"
                      onClick={() => setCurvaCorAuto(!curvaCorAuto)}
                      className={`h-6 px-3 text-[10px] font-bold rounded transition-all ${
                        curvaCorAuto
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-background hover:bg-muted text-foreground border'
                      }`}
                    >
                      {curvaCorAuto ? 'ATIVADO' : 'PERSONALIZAR'}
                    </button>
                  </div>

                  {!curvaCorAuto && (
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/20">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Cor Curva Normal</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={curvaCorFina}
                            onChange={(e) => setCurvaCorFina(e.target.value)}
                            className="size-6 rounded border cursor-pointer bg-background"
                          />
                          <input
                            type="text"
                            value={curvaCorFina}
                            onChange={(e) => setCurvaCorFina(e.target.value)}
                            className="h-6 w-16 text-[10px] font-mono font-bold text-center border rounded bg-background uppercase"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Cor Curva Mestra</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={curvaCorMestra}
                            onChange={(e) => setCurvaCorMestra(e.target.value)}
                            className="size-6 rounded border cursor-pointer bg-background"
                          />
                          <input
                            type="text"
                            value={curvaCorMestra}
                            onChange={(e) => setCurvaCorMestra(e.target.value)}
                            className="h-6 w-16 text-[10px] font-mono font-bold text-center border rounded bg-background uppercase"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" size="sm" onClick={() => setCurvaConfigAberta(false)}>
              Fechar
            </Button>
            {temCurvas && (
              <Button type="button" variant="destructive" size="sm" onClick={() => { limparCurvasNivel(); setCurvaConfigAberta(false); }}>
                <Trash2 className="size-3.5 mr-1" /> Apagar Curvas
              </Button>
            )}
            <Button type="button" size="sm" onClick={() => { gerarCurvasNivel(); setCurvaConfigAberta(false); }} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              <IconeCurvasNivel className="size-3.5 mr-1" /> Gerar Curvas de Nível
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PecasSheetModal
        open={pecasSheetAberto}
        onOpenChange={setPecasSheetAberto}
        processando={processando}
        baixarPacoteEntrega={baixarPacoteEntrega}
        itensPecas={itensPecas}
        medioOuMais={medioOuMais}
      />
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
        onSalvar={(novo) => {
          if (!novo.nome.trim()) {
            aviso('Preencha o nome do confrontante.');
            return;
          }
          setConfrontantes((cs) => cs.map((c) => (c.id === novo.id ? novo : c)));
          salvarConfCadastro(novo);
        }}
        onOpenChange={(o) => {
          if (!o) {
            const atual = confrontantes.find((c) => c.id === confEditId);
            if (atual && !atual.nome.trim()) {
              setConfrontantes((cs) => cs.filter((c) => c.id !== confEditId));
              if (confrontantePincelId === confEditId) {
                setConfrontantePincelId('');
              }
            }
            setConfEditId(null);
          }
        }}
        sugCartorios={sugCartorios}
      />
      <ErrorBoundary onReset={() => setTrtAberto(false)}>
        <TrtModal open={trtAberto} onOpenChange={setTrtAberto} imovel={imovel} tecnico={tecnico} onChangeImovel={setImovel}
          areaHa={res ? valoresEfetivos(res, imovel).areaHa : 0} perimetro={res ? valoresEfetivos(res, imovel).perimetro : 0} />
      </ErrorBoundary>
      <AltitudeModal
        open={altitudeModalAberta}
        onOpenChange={setAltitudeModalAberta}
        vertices={vertices}
        onAtualizarVertice={(id, novaAlt) => {
          setVertices((vs) => vs.map((v) => (v.id === id ? { ...v, altitude: novaAlt, elevacao: novaAlt } : v)));
        }}
        onAplicarAjusteGlobal={ajustarAltitudesGlobais}
        onBuscarAltitudesOnline={gerarCurvasNivel}
        processando={processando}
      />
      <Dialog open={conferirAberto} onOpenChange={setConferirAberto}>
        <DialogContent className="max-w-6xl max-h-[88vh] flex flex-col p-4 sm:p-5 rounded-xl bg-background shadow-2xl overflow-hidden">
          <DialogHeader className="shrink-0 pb-2.5 border-b border-border/60">
            <DialogTitle className="text-sm font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2.5">
              <CheckCircle2 className="size-5" /> Conferir Projeto e Dados Gerais
            </DialogTitle>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto min-h-0 pr-1 pt-2.5 pb-1">
            <PainelConferencia
              vertices={vertices}
              res={res}
              imovel={imovel}
              confrontantes={confrontantes}
              confrontantePorLado={confrontantePorLado}
              onChange={setImovel}
              conflitos={conflitos}
              tecnico={tecnico}
              nomeProjeto={nomeProjeto}
              numGlebas={glebas.length}
              glebas={glebas}
              projetoId={projetoId}
              onIrParaConflito={(lat, lon) => { setConferirAberto(false); setVista('mapa'); setFocoLatLng([lat, lon]); }}
              onReconciliar={() => setVerticesHashConferencia(
                vertices.map(v => `${v.leste.toFixed(3)},${v.norte.toFixed(3)}`).join('|')
              )}
              verticesHashConferencia={verticesHashConferencia}
            />
          </div>
        </DialogContent>
      </Dialog>
      <ErrorBoundary onReset={() => setPrevMemorialAberto(false)}>
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
      </ErrorBoundary>
      <ConsultarModal open={consultarAberto} onOpenChange={setConsultarAberto}
        onInserirProprietario={inserirPropConsulta} onInserirConfrontante={inserirConfConsulta}
        onInserirImovel={inserirImovelConsulta} onInserirCartorio={inserirCartorioConsulta} />

      {/* menu de contexto multiuso (clique direito dependendo do elemento/situação) */}
      {/* Entrou sem login: aviso pra criar a conta e salvar configurações/projetos. Fica um pouco
          acima do banner de dados fictícios para não sobrepor. */}
      {nuvemDisponivel && !user && !avisoCriarContaFechado && (
        <div className={`no-print fixed inset-x-0 z-[1500] flex justify-center px-2 ${(msg || imovel.ficticio) ? 'bottom-9' : 'bottom-2'}`}>
          {/* Aviso enxuto: um pill fino de uma linha, sem card grosso nem pílulas de marketing. */}
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-amber-400/30 bg-background/95 py-1 pl-2.5 pr-1.5 shadow-lg backdrop-blur-md max-w-full">
            <LogIn className="size-3.5 shrink-0 text-amber-500" />
            <span className="truncate text-[11px] font-medium text-foreground">
              Sem login <span className="text-muted-foreground">— nada é salvo na nuvem</span>
            </span>
            <button type="button"
              onClick={() => { setAvisoCriarContaFechado(false); definirModoEntrada('login'); }}
              className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground hover:opacity-90 transition-opacity">
              Entrar
            </button>
            <button type="button"
              onClick={() => setAvisoCriarContaFechado(true)}
              className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted transition-colors"
              title="Fechar aviso">
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* PAINEL DE AJUSTE RÁPIDO (duplo clique num elemento) */}
      {painelElem && painelElem.tipo === 'vertice' && painelElem.vertice && (() => {
        const vAtual = vertices.find((x) => x.id === painelElem.vertice!.id) ?? painelElem.vertice!;
        return (
          <>
            <div className="fixed inset-0 z-[1190]" onClick={() => setPainelElem(null)} onContextMenu={(e) => { e.preventDefault(); setPainelElem(null); }} />
            <div className="fixed z-[1200] w-56 rounded-md border bg-background p-2 text-sm shadow-xl"
              style={{ left: Math.min(painelElem.x, (typeof window !== 'undefined' ? window.innerWidth : 9999) - 240), top: Math.min(painelElem.y, (typeof window !== 'undefined' ? window.innerHeight : 9999) - 200) }}>
              <div className="mb-1.5 flex items-center justify-between border-b pb-1">
                <span className="text-[11px] font-bold">Ponto {vAtual.nome || vAtual.codigoSigef}</span>
                <button className="flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted" onClick={() => setPainelElem(null)}><X className="size-3.5" /></button>
              </div>
              <label className="mb-1.5 flex items-center justify-between gap-2 text-[11px]">
                <span className="font-semibold text-muted-foreground">Altitude (m)</span>
                <input key={vAtual.id} type="number" step={0.1} defaultValue={vAtual.elevacao ?? 0} autoFocus
                  className="h-7 w-24 rounded-sm border bg-background px-1.5 text-right text-[12px] font-bold"
                  onBlur={(e) => { snap(); editarVertice(vAtual.id, { elevacao: Number(e.target.value) || 0 }); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
              </label>

              <div className="rounded-sm bg-muted/40 px-2 py-1 font-mono text-[10px] text-muted-foreground">
                <div>E {vAtual.leste.toFixed(3)}</div>
                <div>N {vAtual.norte.toFixed(3)}</div>
              </div>
            </div>
          </>
        );
      })()}

      {/* PAINEL DE AJUSTE RÁPIDO (duplo clique numa divisa/segmento) */}
      {painelElem && painelElem.tipo === 'divisa' && painelElem.vertice && painelElem.verticeIdx != null && (() => {
        const idx = painelElem.verticeIdx;
        const vAtual = vertices.find((x) => x.id === painelElem.vertice!.id) ?? painelElem.vertice!;
        const lado = lados[idx];
        return (
          <>
            <div className="fixed inset-0 z-[1190]" onClick={() => setPainelElem(null)} onContextMenu={(e) => { e.preventDefault(); setPainelElem(null); }} />
            <div className="fixed z-[1200] w-60 rounded-md border bg-background p-2 text-sm shadow-xl"
              style={{ left: Math.min(painelElem.x, (typeof window !== 'undefined' ? window.innerWidth : 9999) - 250), top: Math.min(painelElem.y, (typeof window !== 'undefined' ? window.innerHeight : 9999) - 240) }}>
              <div className="mb-1.5 flex items-center justify-between border-b pb-1">
                <span className="text-[11px] font-bold">Divisa {vAtual.nome || vAtual.codigoSigef}</span>
                <button className="flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted" onClick={() => setPainelElem(null)}><X className="size-3.5" /></button>
              </div>
              {lado && (
                <div className="mb-1.5 rounded-sm bg-muted/40 px-2 py-1 font-mono text-[10px] text-muted-foreground">
                  <div>Comprimento: {lado.distancia.toFixed(2)} m</div>
                  <div>Azimute: {lado.azimute.toFixed(2)}°</div>
                </div>
              )}
              <label className="mb-1.5 flex items-center justify-between gap-2 text-[11px]">
                <span className="font-semibold text-muted-foreground">Tipo</span>
                <select className="h-7 w-32 rounded-sm border bg-background px-1 text-[11px]"
                  value={vAtual.representacao || 'linha-ideal'}
                  onChange={(e) => definirDivisaLado(vAtual.id, e.target.value)}>
                  {opcoesDivisaTipo.map((r) => <option key={r} value={r}>{rotuloDivisaTipo(r)}</option>)}
                </select>
              </label>
              <label className="flex items-center justify-between gap-2 text-[11px]">
                <span className="font-semibold text-muted-foreground">Confrontante</span>
                <select className="h-7 w-32 rounded-sm border bg-background px-1 text-[11px]"
                  value={confrontantePorLado[idx] || ''}
                  onChange={(e) => definirConfrontanteLado(idx, e.target.value)}>
                  <option value="">—</option>
                  {confrontantes.map((c) => <option key={c.id} value={c.id}>{c.nome || '(sem nome)'}</option>)}
                </select>
              </label>
            </div>
          </>
        );
      })()}

      {menuContexto && (
        <>
          <div className="fixed inset-0 z-[1190]" onClick={() => setMenuContexto(null)} onContextMenu={(e) => { e.preventDefault(); setMenuContexto(null); }} />
          <div className="fixed z-[1200] w-52 overflow-hidden rounded-md border bg-background p-1 text-sm shadow-lg"
            style={{ left: Math.min(menuContexto.x, (typeof window !== 'undefined' ? window.innerWidth : 9999) - 220), top: menuContexto.y }}>
            
            {menuContexto.tipo === 'texto' && (
              <div className="flex flex-col gap-0.5">
                <button className="block w-full px-2 py-1.5 text-left rounded-sm hover:bg-accent" onClick={async () => { const m = menuContexto; setMenuContexto(null); const t = await perguntar({ titulo: 'Editar texto', valorInicial: m.atual!, multiline: true }); if (t != null) editarTextoPlanta(m.id!, t); }}>Editar texto…</button>
                <button className="block w-full px-2 py-1.5 text-left rounded-sm hover:bg-accent" onClick={() => patchTextoPlanta(menuContexto.id!, { negrito: !(plantaConfig.textos?.[menuContexto.id!]?.negrito) })}>Negrito (liga/desliga)</button>
                <div className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm">
                  <span className="text-xs font-semibold text-muted-foreground">Tamanho</span>
                  <div className="flex items-center gap-1">
                    <button className="h-6 w-8 rounded border bg-background hover:bg-muted text-xs font-bold flex items-center justify-center transition-colors" title="Diminuir"
                      onClick={(e) => {
                        e.stopPropagation();
                        const esc = escTextoAtual(menuContexto.id!);
                        patchTextoPlanta(menuContexto.id!, { escala: Math.max(0.4, +(esc - 0.05).toFixed(2)) });
                      }}>-</button>
                    <button className="h-6 w-8 rounded border bg-background hover:bg-muted text-xs font-bold flex items-center justify-center transition-colors" title="Aumentar"
                      onClick={(e) => {
                        e.stopPropagation();
                        const esc = escTextoAtual(menuContexto.id!);
                        patchTextoPlanta(menuContexto.id!, { escala: Math.min(3, +(esc + 0.05).toFixed(2)) });
                      }}>+</button>
                  </div>
                </div>
                <button className="block w-full border-t px-2 py-1.5 text-left rounded-sm hover:bg-accent text-destructive" onClick={() => { patchTextoPlanta(menuContexto.id!, { dx: 0, dy: 0 }); setMenuContexto(null); }}>Resetar posição</button>
                <button className="block w-full border-t px-2 py-1.5 text-left rounded-sm hover:bg-accent" onClick={() => { restaurarTextoPlanta(menuContexto.id!); setMenuContexto(null); }}>Restaurar padrão</button>
              </div>
            )}

            {menuContexto.tipo === 'confrontante' && (
              <div className="flex flex-col gap-0.5">
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase truncate">Confrontante: {menuContexto.atual}</div>
                <div className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm">
                  <span className="text-xs font-semibold text-muted-foreground">Tamanho</span>
                  <div className="flex items-center gap-1">
                    <button className="h-6 w-8 rounded border bg-background hover:bg-muted text-xs font-bold flex items-center justify-center transition-colors" title="Diminuir"
                      onClick={(e) => {
                        e.stopPropagation();
                        ajustarTamRotuloConf(menuContexto.id!, -1);
                      }}>-</button>
                    <button className="h-6 w-8 rounded border bg-background hover:bg-muted text-xs font-bold flex items-center justify-center transition-colors" title="Aumentar"
                      onClick={(e) => {
                        e.stopPropagation();
                        ajustarTamRotuloConf(menuContexto.id!, 1);
                      }}>+</button>
                  </div>
                </div>
                <button className="block w-full border-t px-2 py-1.5 text-left rounded-sm hover:bg-accent" onClick={() => { editarConfrontantePlanta(menuContexto.id!); setMenuContexto(null); }}>Editar dados...</button>
                {(() => {
                  const c = confrontantes.find((conf) => conf.id === menuContexto.id);
                  if (!c || !c.conjugeNome) return null;
                  return (
                    <button className="block w-full border-t px-2 py-1.5 text-left rounded-sm hover:bg-accent" onClick={() => {
                      snap();
                      const novoLayout = c.layoutAssinatura === 'horizontal' ? 'vertical' : 'horizontal';
                      setConfrontantes((cs) => cs.map((conf) => conf.id === c.id ? { ...conf, layoutAssinatura: novoLayout } : conf));
                      aviso(`Assinatura cônjuge: ${novoLayout === 'horizontal' ? 'lado a lado' : 'uma abaixo da outra'}`);
                      setMenuContexto(null);
                    }}>
                      Layout Assinatura: {c.layoutAssinatura === 'horizontal' ? 'Lado a lado ↔' : 'Abaixo ↕'}
                    </button>
                  );
                })()}
              </div>
            )}

            {menuContexto.tipo === 'vertice' && menuContexto.vertice && (
              <div className="flex flex-col gap-0.5">
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">Ações do Vértice</div>
                <button className="flex items-center gap-2 w-full px-2 py-1 text-left rounded-sm hover:bg-accent" onClick={() => {
                  snap();
                  const novos = definirInicio(vertices, menuContexto.vertice!.id);
                  reindexarCplPara(novos);
                  setVertices(novos);
                  setMenuContexto(null);
                }}><Flag className="size-3.5" /> Definir Início</button>
                <button className="flex items-center gap-2 w-full px-2 py-1 text-left rounded-sm hover:bg-accent text-destructive" onClick={() => { apagarVertice(menuContexto.vertice!.id); setMenuContexto(null); }}><Trash2 className="size-3.5" /> Excluir Vértice</button>
                <button className="flex items-center gap-2 w-full px-2 py-1 text-left rounded-sm hover:bg-accent" onClick={() => { ignorarVertice(menuContexto.vertice!.id); setMenuContexto(null); }}><EyeOff className="size-3.5" /> Ignorar Vértice</button>
                

              </div>
            )}

            {menuContexto.tipo === 'divisa' && menuContexto.vertice && (
              <div className="flex flex-col gap-0.5">
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">Tipo da Divisa</div>
                <select
                  className="mx-1 h-8 rounded-sm border bg-background px-1 text-xs"
                  value={menuContexto.vertice.representacao || 'linha-ideal'}
                  onChange={(e) => { definirDivisaLado(menuContexto.vertice!.id, e.target.value); setMenuContexto(null); }}
                >
                  {opcoesDivisaTipo.map((r) => <option key={r} value={r}>{rotuloDivisaTipo(r)}</option>)}
                </select>

                <div className="border-t my-1" />
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">Confrontante</div>
                <select
                  className="mx-1 h-8 rounded-sm border bg-background px-1 text-xs"
                  value={confrontantePorLado[menuContexto.verticeIdx ?? -1] || ''}
                  onChange={(e) => { definirConfrontanteLado(menuContexto.verticeIdx ?? -1, e.target.value); setMenuContexto(null); }}
                >
                  <option value="">— Sem confrontante —</option>
                  {confrontantes.map((c) => <option key={c.id} value={c.id}>{c.nome || '(sem nome)'}</option>)}
                </select>

                {confrontantePorLado[menuContexto.verticeIdx ?? -1] && (
                  <>
                    <div className="border-t my-1" />
                    <button
                      className="flex items-center gap-2 w-full px-2 py-1.5 text-left rounded-sm hover:bg-accent text-destructive"
                      onClick={() => { definirConfrontanteLado(menuContexto.verticeIdx ?? -1, ''); setMenuContexto(null); }}
                    >
                      <Trash2 className="size-3.5" /> Apagar confrontante deste lado
                    </button>
                  </>
                )}
              </div>
            )}

            {menuContexto.tipo === 'mapa' && (
              <div className="flex flex-col gap-0.5">
                <button
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-left rounded-sm hover:bg-accent"
                  onClick={() => {
                    inserirVertice(menuContexto.lat!, menuContexto.lon!);
                    setMenuContexto(null);
                  }}
                >
                  <Plus className="size-3.5" /> Inserir Vértice Aqui
                </button>
                <button
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-left rounded-sm hover:bg-accent"
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
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-left rounded-sm hover:bg-accent"
                  onClick={async () => {
                    const txt = await perguntar({ titulo: 'Inserir texto', mensagem: 'Texto a inserir:', multiline: true });
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
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-left rounded-sm hover:bg-accent"
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
                      <button className="flex items-center gap-2 w-full px-2 py-1.5 text-left rounded-sm hover:bg-accent" onClick={async () => { const t = await perguntar({ titulo: 'Editar texto', valorInicial: o?.texto ?? '', multiline: true }); if (t != null) editarObjetoSel({ texto: t }); setMenuContexto(null); }}>
                        <Pencil className="size-3.5" /> Editar texto…
                      </button>
                      <div className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm">
                        <span className="text-xs font-semibold text-muted-foreground">Tamanho</span>
                        <div className="flex items-center gap-1">
                          <button className="h-6 w-8 rounded border bg-background hover:bg-muted text-xs font-bold flex items-center justify-center transition-colors" title="Diminuir"
                            onClick={(e) => {
                              e.stopPropagation();
                              editarObjetoSel({ tamanho: Math.max(6, (o?.tamanho ?? 12) - 1) });
                            }}>-</button>
                          <button className="h-6 w-8 rounded border bg-background hover:bg-muted text-xs font-bold flex items-center justify-center transition-colors" title="Aumentar"
                            onClick={(e) => {
                              e.stopPropagation();
                              editarObjetoSel({ tamanho: (o?.tamanho ?? 12) + 1 });
                            }}>+</button>
                        </div>
                      </div>
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
                      <div className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm">
                        <span className="text-xs font-semibold text-muted-foreground">Tamanho</span>
                        <div className="flex items-center gap-1">
                          <button className="h-6 w-8 rounded border bg-background hover:bg-muted text-xs font-bold flex items-center justify-center transition-colors" title="Diminuir"
                            onClick={(e) => {
                              e.stopPropagation();
                              editarObjetoSel({ tamanho: Math.max(10, (o?.tamanho ?? 30) - 2) });
                            }}>-</button>
                          <button className="h-6 w-8 rounded border bg-background hover:bg-muted text-xs font-bold flex items-center justify-center transition-colors" title="Aumentar"
                            onClick={(e) => {
                              e.stopPropagation();
                              editarObjetoSel({ tamanho: Math.min(150, (o?.tamanho ?? 30) + 2) });
                            }}>+</button>
                        </div>
                      </div>
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
                      {o && (
                        <div className="rounded-sm bg-muted/40 px-2 py-1 font-mono text-[10px] text-muted-foreground">
                          Comprimento: {distanciaCota(o).toFixed(2)} m
                        </div>
                      )}
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
                          <button type="button" className="px-2 py-0.5 rounded-sm border font-bold hover:bg-muted" onClick={() => editarObjetoSel({ espessura: Math.max(0.5, (o?.espessura ?? 1.2) - 0.5) })}>−</button>
                          <button type="button" className="px-2 py-0.5 rounded-sm border font-bold hover:bg-muted" onClick={() => editarObjetoSel({ espessura: Math.min(8, (o?.espessura ?? 1.2) + 0.5) })}>+</button>
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
                      <div className="rounded-sm bg-muted/40 px-2 py-1 font-mono text-[10px] text-muted-foreground">
                        <div>Comprimento: {comprimentoPolilinha(o).toFixed(2)} m</div>
                        {o.preenchido && o.pontos.length >= 3 && <div>Área: {areaPoligonoObjeto(o).toFixed(4)} ha</div>}
                      </div>
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
                              className={`px-1.5 py-0.5 rounded-sm border text-[9px] font-bold capitalize ${o.estiloLinha === est || (!o.estiloLinha && est === 'solido') ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}
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
                          <button type="button" className="px-2 py-0.5 rounded-sm border font-bold hover:bg-muted" onClick={() => editarObjetoSel({ espessura: Math.max(0.5, (o.espessura ?? 1.5) - 0.5) })}>−</button>
                          <button type="button" className="px-2 py-0.5 rounded-sm border font-bold hover:bg-muted" onClick={() => editarObjetoSel({ espessura: Math.min(10, (o.espessura ?? 1.5) + 0.5) })}>+</button>
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
                                  className={`px-1 py-0.5 rounded-sm border text-[9px] font-bold ${o.achura === ach.chave || (!o.achura && ach.chave === 'nenhuma') ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}
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
                          <button key={t.chave} className="flex w-full items-center gap-2 px-2 py-1 text-left rounded-sm hover:bg-accent" onClick={() => { editarObjetoSel({ carTema: t.chave, preenchido: true, cor: t.cor }); setMenuContexto(null); aviso(`Polígono marcado como ${t.rotulo} (entra no CAR).`); }}>
                            <span className="size-3 rounded-sm" style={{ background: t.cor }} /> {t.rotulo}
                          </button>
                        ))}
                        <button className="flex w-full items-center gap-2 px-2 py-1 text-left rounded-sm hover:bg-accent text-muted-foreground" onClick={() => { editarObjetoSel({ carTema: undefined }); setMenuContexto(null); }}><X className="size-3.5" /> Não é camada CAR</button>
                      </div>
                    </div>
                  );
                })()}
                <button className="flex items-center gap-2 w-full border-t px-2 py-1.5 text-left rounded-sm hover:bg-accent text-destructive" onClick={() => { apagarObjetoSel(); setMenuContexto(null); }}><Trash2 className="size-3.5" /> Apagar</button>
              </div>
            )}

            {menuContexto.tipo === 'parcelaCert' && (
              <div className="flex flex-col gap-1 p-2 text-[11px] space-y-1">
                <div className="font-bold text-xs border-b pb-1 mb-1 text-primary">Estilo SIGEF / Vizinhos</div>
                
                {/* Cor do Preenchimento */}
                <div>
                  <div className="font-semibold text-muted-foreground mb-1 uppercase text-[9px] tracking-wider font-bold">Cor de Preenchimento</div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {PALETA_DESENHO.map((pal) => (
                      <button key={pal.hex} type="button" title={pal.nome}
                        className={`size-4 rounded-full border border-black/10 transition-transform hover:scale-115 ${corCert === pal.hex ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                        style={{ backgroundColor: pal.hex }}
                        onClick={() => setCorCert(pal.hex)} />
                    ))}
                  </div>
                </div>

                {/* Cor da Borda */}
                <div>
                  <div className="font-semibold text-muted-foreground mb-1 uppercase text-[9px] tracking-wider font-bold">Cor da Borda</div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {PALETA_DESENHO.map((pal) => (
                      <button key={pal.hex} type="button" title={pal.nome}
                        className={`size-4 rounded-full border border-black/10 transition-transform hover:scale-115 ${corBordaCert === pal.hex ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                        style={{ backgroundColor: pal.hex }}
                        onClick={() => setCorBordaCert(pal.hex)} />
                    ))}
                  </div>
                </div>

                {/* Espessura da linha */}
                <div>
                  <div className="font-semibold text-muted-foreground mb-1 uppercase text-[9px] tracking-wider font-bold">Espessura da Borda: {espessuraCert.toFixed(1)} px</div>
                  <div className="flex gap-1.5">
                    <button type="button" className="px-2 py-0.5 rounded-sm border font-bold hover:bg-muted" onClick={() => setEspessuraCert((e) => Math.max(0.5, e - 0.5))}>−</button>
                    <button type="button" className="px-2 py-0.5 rounded-sm border font-bold hover:bg-muted" onClick={() => setEspessuraCert((e) => Math.min(8, e + 0.5))}>+</button>
                  </div>
                </div>

                {/* Opacidade do Preenchimento */}
                <div>
                  <div className="font-semibold text-muted-foreground mb-1 uppercase text-[9px] tracking-wider font-bold">Opacidade: {(opacidadeCert * 100).toFixed(0)}%</div>
                  <div className="flex gap-1.5">
                    <button type="button" className="px-2 py-0.5 rounded-sm border font-bold hover:bg-muted" onClick={() => setOpacidadeCert((o) => Math.max(0.0, +(o - 0.02).toFixed(2)))}>−</button>
                    <button type="button" className="px-2 py-0.5 rounded-sm border font-bold hover:bg-muted" onClick={() => setOpacidadeCert((o) => Math.min(0.8, +(o + 0.02).toFixed(2)))}>+</button>
                  </div>
                </div>

                <button className="flex items-center justify-center gap-2 w-full border-t pt-1.5 text-center rounded-sm hover:bg-accent font-semibold" onClick={() => setMenuContexto(null)}>Concluir</button>
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

      {/* ── OVERLAY DE FEEDBACK DE ATALHO (centro da tela, semi-transparente, grande) ── */}
      {feedbackAtalho && (
        <div
          className={`pointer-events-none fixed inset-0 z-[9998] flex items-center justify-center`}
          aria-hidden
        >
          <div
            className={`
              animate-in fade-in zoom-in-95 duration-150
              px-10 py-6 rounded-2xl shadow-2xl backdrop-blur-sm
              flex flex-col items-center gap-2
              ${
                feedbackAtalho.tipo === 'ok'
                  ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
                  : 'bg-red-950/80 border border-red-500/40 text-red-300'
              }
            `}
          >
            <span className="text-5xl font-black tracking-tight leading-none">
              {feedbackAtalho.texto}
            </span>
            <span className="text-xs font-semibold opacity-60 uppercase tracking-widest">
              {feedbackAtalho.tipo === 'ok' ? 'Ativado' : 'Atalho inválido'}
            </span>
          </div>
        </div>
      )}

      {/* ── PAINEL DE PROPRIEDADES FLUTUANTE (CANTO SUPERIOR DIREITO) ──────────────── */}
      <ObjetoPersonalizarModal
        objPersonalizarId={objPersonalizarId}
        setObjPersonalizarId={setObjPersonalizarId}
        setObjetoSelId={setObjetoSelId}
        objetos={objetos}
        setObjetos={setObjetos}
        editarObjetoSel={editarObjetoSel}
        apagarObjetoSel={apagarObjetoSel}
        plantaConfig={plantaConfig}
        setPlantaConfig={setPlantaConfig}
        patchTextoPlanta={patchTextoPlanta}
        nomeProjeto={nomeProjeto}
        escritorio={escritorio}
        gerarSituacaoPlanta={gerarSituacaoPlanta}
        aviso={aviso}
        copiaBuffer={copiaBuffer}
        setCopiaBuffer={setCopiaBuffer}
        imovel={imovel}
        setImovel={setImovel}
        onRemoverPrint3D={() => { setPrint3dUrl(undefined); setPlantaConfig((c) => ({ ...c, print3dDataUrl: undefined, print3dVolumeCorte: undefined, print3dVolumeAterro: undefined, print3dZRef: undefined, print3dMostrarTerraplanagem: undefined })); }}
      />

      <ErrorBoundary onReset={() => setPlanilhaAberta(false)}>
        <ModalSpreadsheet
          isOpen={planilhaAberta}
          onClose={() => setPlanilhaAberta(false)}
          vertices={vertices}
          onSave={salvarAlteracoesPlanilha}
          contadorSugerido={contadorSugerido}
          zona={zona}
          hemisferio={hemisferio}
        />
      </ErrorBoundary>
      <ModalImport
        isOpen={importModalAberto}
        onClose={() => setImportModalAberto(false)}
        onConfirm={processarImportacao}
      />
      <ImportTxtConfigModal
        open={importTxtConfigAberto}
        onOpenChange={(open) => {
          setImportTxtConfigAberto(open);
          if (!open) {
            setTimeout(() => {
              setImportPendingFile(null);
            }, 100);
          }
        }}
        autoLoadFile={importPendingFile}
        onSaveSuccess={() => {
          setImportTxtConfigAberto(false);
          setImportModalAberto(true);
        }}
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
          onAbrirAjustes={(aba) => { setGestaoAberta(false); setConfigAba(aba); setConfigAberta(true); }}
          onAbrirConferir={() => { setGestaoAberta(false); setConferirAberto(true); }}
          onAbrirProjeto={(id) => { setGestaoAberta(false); abrir(id); }}
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
              A área oficial (SGL) ou o perímetro oficial do SIGEF ainda não foram preenchidos no botão <strong>&quot;CONFERIR&quot;</strong> do cabeçalho (Reconciliação com o SIGEF).
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
              title="Abre a janela Conferir para preencher os valores oficiais do SIGEF."
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

      <IntroVideo />

      {landingPageAberta && (
        <div className="fixed inset-0 z-[99999] bg-slate-950 overflow-y-auto scroll-smooth landing-snap-container">
          <LandingPage
            numUsuarios={numUsuariosTotal}
            texts={landingTexts}
            onPioneiro={() => {
              try {
                sessionStorage.setItem('metrica:landing_page_fechada', 'true');
                localStorage.setItem('metrica:landing_page_vista', 'true');
              } catch { /* ignore */ }
              setLandingPageAberta(false);
              // Dispara evento para o player de vídeo começar a tocar imediatamente
              window.dispatchEvent(new CustomEvent('souzacad:ver-intro'));
            }}
          />
        </div>
      )}

      {notificacaoTamanho.visible && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-[9999] bg-[#0a1f14]/90 text-emerald-400 font-bold border border-emerald-800/40 px-4 py-2 rounded-full text-xs shadow-lg flex items-center gap-1.5 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
          {notificacaoTamanho.texto}
        </div>
      )}

      <TutorialModal open={tutorialAberto} onOpenChange={fecharTutorial} />

      <Dialog open={tutorialF1Aberto} onOpenChange={setTutorialF1Aberto}>
        <DialogContent className="max-w-5xl lg:max-w-6xl max-h-[88vh] flex flex-col p-5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl overflow-y-auto">
          <DialogHeader className="shrink-0 pb-3 border-b border-slate-800 flex items-center justify-between">
            <DialogTitle className="text-base font-black uppercase tracking-wider text-sky-400 flex items-center gap-2">
              <GraduationCap className="size-5" />
              Início — Fluxo de Trabalho do Georreferenciamento
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-3">
            {/* Banner principal + Banner destacado para o botão de Guias em grid de 2 colunas no desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Banner principal: fluxo esquerda → direita */}
              <div className="bg-gradient-to-r from-sky-600/20 to-emerald-600/20 border border-sky-500/40 rounded-xl p-3.5 flex flex-col justify-center">
                <h4 className="font-bold text-xs flex items-center gap-2 mb-1 text-sky-300">
                  <Info className="size-3.5 shrink-0" />
                  Siga os botões da esquerda para a direita!
                </h4>
                <p className="text-[10.5px] leading-relaxed text-slate-200">
                  O cabeçalho do aplicativo foi projetado como uma <strong className="text-sky-300">linha do tempo visual</strong>.
                  Cada botão representa uma etapa do georreferenciamento, ordenada
                  {' '}<strong className="text-amber-300">da esquerda para a direita</strong>{' '} na ordem exata.
                  Basta avançar botão a botão — o app valida e preenche as peças automaticamente.
                </p>
                <div className="mt-2 flex items-center gap-1 text-[9.5px] font-bold text-slate-400 flex-wrap">
                  {['INÍCIO','PONTOS','SIGEF','DADOS','CONFRO','DIVISAS','ART/TRT','ODS','CONFERIR','PEÇAS'].map((s, i, arr) => (
                    <span key={s} className="flex items-center gap-1">
                      <span className="bg-slate-800 text-sky-300 px-1 py-0.5 rounded text-[8px] font-mono">{s}</span>
                      {i < arr.length - 1 && <span className="text-amber-500">›</span>}
                    </span>
                  ))}
                </div>
              </div>

              {/* Banner destacado para o botão de Guias */}
              <div className="bg-gradient-to-r from-indigo-950 to-indigo-900 border-2 border-indigo-500/80 rounded-xl p-3.5 flex flex-col justify-between gap-3 shadow-xl select-none">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-full shrink-0 border border-indigo-500/20">
                    <HelpCircle className="size-4.5 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-indigo-200 uppercase tracking-wider">
                      Manual de Habilitação & Guias do Usuário
                    </h4>
                    <p className="text-[10.5px] text-slate-300 mt-0.5 leading-relaxed">
                      Consulte o manual interativo completo e os guias passo a passo para dominar o fluxo de certificação do SIGEF.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => { setTutorialF1Aberto(false); setTutorialAberto(true); }}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs px-4 py-2 rounded-lg border-0 shadow-lg shrink-0 uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all h-8"
                >
                  <HelpCircle className="size-3.5" /> Abrir Guias e Manuais
                </Button>
              </div>
            </div>

            {/* Grid 3 colunas no desktop para os 9 passos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Passo 1 */}
              <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 flex gap-2.5">
                <div className="size-6.5 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">1</div>
                <div>
                  <h5 className="font-bold text-[11px] text-slate-200 uppercase tracking-wide">PONTOS (F2)</h5>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                    Importe o arquivo TXT ou CSV gerado pelo receptor GNSS. É a base do desenho que carregará todas as coordenadas.
                  </p>
                </div>
              </div>

              {/* Passo 2 */}
              <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 flex gap-2.5">
                <div className="size-6.5 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">2</div>
                <div>
                  <h5 className="font-bold text-[11px] text-slate-200 uppercase tracking-wide">SIGEF (F3)</h5>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                    Consulte confrontantes oficiais no SIGEF. Baixe limites certificados vizinhos para evitar sobreposições.
                  </p>
                </div>
              </div>

              {/* Passo 3 */}
              <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 flex gap-2.5">
                <div className="size-6.5 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">3</div>
                <div>
                  <h5 className="font-bold text-[11px] text-slate-200 uppercase tracking-wide">DADOS (F4)</h5>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                    Preencha as informações gerais do imóvel, proprietário e RT para preenchimento automático das peças e carimbo.
                  </p>
                </div>
              </div>

              {/* Passo 4 */}
              <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 flex gap-2.5">
                <div className="size-6.5 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">4</div>
                <div>
                  <h5 className="font-bold text-[11px] text-slate-200 uppercase tracking-wide">CONFRO (F5)</h5>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                    Associe os confrontantes proprietários a cada trecho da divisa. Pinte no mapa no sentido horário.
                  </p>
                </div>
              </div>

              {/* Passo 5 */}
              <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 flex gap-2.5">
                <div className="size-6.5 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">5</div>
                <div>
                  <h5 className="font-bold text-[11px] text-slate-200 uppercase tracking-wide">DIVISAS (F6)</h5>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                    Selecione a representação física de cada limite (muro, cerca, córrego, etc.) e pinte no mapa.
                  </p>
                </div>
              </div>

              {/* Passo 6 */}
              <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 flex gap-2.5">
                <div className="size-6.5 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">6</div>
                <div>
                  <h5 className="font-bold text-[11px] text-slate-200 uppercase tracking-wide">ART/TRT (F7)</h5>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                    Insira o número de registro da sua anotação ou termo de responsabilidade técnica para emissão dos documentos.
                  </p>
                </div>
              </div>

              {/* Passo 7 */}
              <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 flex gap-2.5">
                <div className="size-6.5 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">7</div>
                <div>
                  <h5 className="font-bold text-[11px] text-slate-200 uppercase tracking-wide">ODS (F8)</h5>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                    Exporte a planilha ODS estruturada no padrão SIGEF/INCRA para iniciar o credenciamento nacional.
                  </p>
                </div>
              </div>

              {/* Passo 8 */}
              <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 flex gap-2.5">
                <div className="size-6.5 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">8</div>
                <div>
                  <h5 className="font-bold text-[11px] text-slate-200 uppercase tracking-wide">CONFERIR (F9)</h5>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                    Realize a checagem eletrônica das tolerâncias, precisões e discrepâncias geodésicas pré-exportação.
                  </p>
                </div>
              </div>

              {/* Passo 9 */}
              <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 flex gap-2.5">
                <div className="size-6.5 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">9</div>
                <div>
                  <h5 className="font-bold text-[11px] text-amber-400 uppercase tracking-wide">PEÇAS TÉCNICAS (F10)</h5>
                  <p className="text-[10px] text-slate-300 mt-1 leading-normal">
                    Baixe as peças em lote (Pacote ZIP) ou individualmente: Memorial, Planta SVG, Requerimento e Declarações.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-3 border-t border-slate-800">
            <Button
              type="button"
              onClick={() => setTutorialF1Aberto(false)}
              className="bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs px-4 py-1.5 rounded-lg border-0"
            >
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {videosListaAberta && (
        <>
          <div className="fixed inset-0 z-[1290] bg-black/40" onClick={() => setVideosListaAberta(false)} />
          <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4" onClick={() => setVideosListaAberta(false)}>
            <div className="w-full max-w-sm rounded-lg border bg-background p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-2 flex items-center justify-between border-b pb-2">
                <span className="flex items-center gap-1.5 text-sm font-bold"><Youtube className="size-4 text-red-500" /> Vídeos tutoriais</span>
                <button className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted" onClick={() => setVideosListaAberta(false)}><X className="size-4" /></button>
              </div>
              <div className="max-h-[60vh] space-y-1.5 overflow-y-auto">
                {videosUrl && (
                  <button type="button" onClick={() => window.open(videosUrl, '_blank', 'noopener,noreferrer')}
                    className="flex w-full items-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-left text-sm font-bold text-primary hover:bg-primary/10 transition-colors">
                    <Youtube className="size-4 shrink-0" /> Curso completo (playlist)
                  </button>
                )}
                {videosTutorial.map((v, i) => (
                  <button key={i} type="button" onClick={() => window.open(v.url, '_blank', 'noopener,noreferrer')}
                    className="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm font-semibold hover:bg-muted transition-colors">
                    <Youtube className="size-4 shrink-0 text-red-500" /> {v.titulo}
                  </button>
                ))}
                {!videosUrl && videosTutorial.length === 0 && (
                  <p className="p-2 text-center text-xs text-muted-foreground">Nenhum vídeo cadastrado ainda.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      <AssinaturaModal open={assinaturaAberta} onOpenChange={setAssinaturaAberta} />
      <PrimeiroAcessoModal open={!setupOk && !entrouSemLogin} onConcluir={() => { try { localStorage.setItem('metrica.setupFeito', '1'); } catch { /* ignore */ } const tec = carregarTecnico(); const esc = carregarEscritorio(); setTecnico(tec); setEscritorio(esc); setSetupOk(true); empurrarConfigParaNuvem().catch(() => {}); sincronizarPerfil({ empresaNome: esc.nome, empresaCnpj: esc.cnpj, rtNome: tec.nome, rtCft: tec.cft }).catch(() => {}); }} onVoltarLogin={() => { limparConfigLocalNaSaida(); sair(); }} />


      <PontosBancoModal open={pontosAberto} onOpenChange={setPontosAberto} />
      <ErrorBoundary onReset={() => setPlanilhaConfAberta(false)}>
        <PlanilhaConferenciaModal
          open={planilhaConfAberta} onOpenChange={setPlanilhaConfAberta}
          imovel={imovel} res={res} confrontantes={confrontantes} confrontantePorLado={confrontantePorLado} tecnico={tecnico}
          onBaixar={() => { setPlanilhaConfAberta(false); exportarOds(); }}
          imoveisCadastrados={imoveisCadastrados}
          onAplicarCorrecoes={aplicarCorrecoesPrecisaoLocal}
        />
      </ErrorBoundary>
      <ImportPreviewModal
        open={!!previewData}
        onOpenChange={(open) => { if (!open) setPreviewData(null); }}
        pontos={(previewData?.vs || []).map((v: Vertex) => ({ nome: v.codigoSigef || v.nome || '', leste: v.leste, norte: v.norte }))}
        zona={previewData?.z ?? zona} hemisferio={hemisferio} fusosPermitidos={tecnico?.fusosPermitidos}
        onConfirm={concluirImportacao}
      />

      {avisoPagamentoAberto && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[9999] p-4">
          <div className="w-full max-w-md bg-[#05140b] border border-amber-500/20 rounded-xl p-6 shadow-2xl space-y-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <AlertTriangle className="h-6 w-6 animate-bounce" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">Aviso de Pagamento Pendente</h3>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Identificamos um atraso na sua mensalidade. Seu acesso será encerrado em{' '}
                <span className="font-extrabold text-amber-500 text-base">{diasAtrasoRestantes} {diasAtrasoRestantes === 1 ? 'dia' : 'dias'}</span>.
              </p>
            </div>
            
            <div className="p-3.5 rounded-lg bg-amber-500/5 border border-amber-500/10 text-left flex justify-between items-center">
              <div>
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Valor da Mensalidade</div>
                <div className="text-lg font-bold text-amber-500">
                  R$ {(perfil?.mensalidade || 129).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <Button 
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                onClick={iniciarPagamentoMercadoPago}
              >
                Pagar Agora
              </Button>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 bg-transparent hover:bg-white/5 text-white border-white/10" 
                onClick={() => setAvisoPagamentoAberto(false)}
              >
                Continuar no App
              </Button>
            </div>
            <p className="text-[10px] text-zinc-400">
              Evite interrupções regularizando sua assinatura antes do prazo final.
            </p>
          </div>
        </div>
      )}

      {/* Barra de Status e Notificações Inteligente (oculta se o vídeo de intro ou a landing page estiverem ativos) */}
      {!introTocando && !landingPageAberta && (
        <>
          <div
            className="no-print fixed bottom-0 right-0 z-[2000] flex h-8 min-h-[32px] items-center justify-between bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-[10px] font-medium border-t border-slate-200 dark:border-slate-800 shadow-lg px-3 select-none overflow-hidden whitespace-nowrap"
            style={{ left: toolWEfetivo }}
          >
            {/* Lado Esquerdo: Mensagem de Status Ativa / Alerta ou Modo Atual */}
            <div className="flex items-center gap-2 min-w-0 overflow-hidden whitespace-nowrap">
              {msg ? (
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold animate-pulse truncate">
                  <span className="inline-block size-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="truncate">{msg}</span>
                </div>
              ) : imovel.ficticio ? (
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>DADOS FICTÍCIOS — Sem validade legal</span>
                </div>
              ) : null}

              {/* Caixa de Entrada de Comandos CAD */}
              <div className="flex items-center gap-1 border-l border-slate-300 dark:border-slate-850 pl-2.5 shrink-0 select-text">
                <span className="text-slate-500 font-mono text-[9px] font-bold">&gt;</span>
                <input
                  ref={comandoInputRef}
                  type="text"
                  value={comandoInput}
                  onChange={(e) => setComandoInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      executarComando(comandoInput);
                    } else if (e.key === 'Escape') {
                      setComandoInput('');
                      if (comandoInputRef.current) comandoInputRef.current.blur();
                    }
                  }}
                  placeholder="Comando (ex: cc, rt, pl)"
                  className="bg-slate-200/70 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 focus:border-sky-500 focus:bg-slate-100 dark:focus:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-500 px-1.5 py-0.5 rounded text-[9px] w-36 font-mono outline-none transition-all select-text"
                />
              </div>

              {/* Fuso UTM do Projeto com texto legível ao lado direito do campo de comandos */}
              <div className="flex items-center gap-1 border-l border-slate-300 dark:border-slate-800 pl-2 shrink-0">
                <span className="text-slate-900 dark:text-white font-mono font-extrabold text-[10px] bg-slate-200 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/80 px-2 py-0.5 rounded uppercase tracking-wider whitespace-nowrap" title={`Projeção Cartográfica: Fuso ${zona}${hemisferio} (UTM/SIRGAS 2000)`}>
                  Fuso {zona}{hemisferio}
                </span>
              </div>

              {/* Próximo Passo Sugerido ou Mensagem de Desfazer / Ação (Substituição Temporária) — Posicionado perto do Fuso */}
              <div
                onClick={() => setExplicacaoPassoAberto(true)}
                className="flex items-center gap-1.5 border-l border-slate-300 dark:border-slate-800 pl-2.5 shrink-0 cursor-pointer select-none group"
                title="Clique para abrir a explicação completa deste passo"
              >
                <span className={`inline-block size-1.5 rounded-full shrink-0 ${msg ? 'bg-amber-500 animate-ping' : 'bg-sky-500 animate-pulse'}`} />
                <span className={`font-black text-[9.5px] transition-all max-w-[280px] sm:max-w-[420px] truncate ${msg ? 'text-amber-600 dark:text-amber-400 font-extrabold' : 'text-sky-700 dark:text-sky-300 group-hover:underline'}`}>
                  {msg ? msg : `Próximo Passo Sugerido: ${dicaFluxo.resumo.replace(/^Próximo passo:\s*/i, '')}`}
                </span>
                {!msg && <Info className="size-3 text-sky-500 opacity-80 group-hover:opacity-100 shrink-0" />}
              </div>
            </div>

            {/* Lado Direito: Estatísticas em tempo real & Status de Salvamento */}
            <div className="flex items-center gap-4 shrink-0 divide-x divide-slate-800 text-slate-400 text-[9px] font-mono">
              {/* Seleção Atual */}
              {objetoSelId && (
                <div className="pl-4 text-amber-300 font-semibold">
                  Selecionado: {
                    objetoSelId.startsWith('planta:situacao') ? 'Desenho de Situação' :
                    objetoSelId.startsWith('planta:rosa') ? 'Rosa dos Ventos' :
                    objetoSelId.startsWith('planta:escala') ? 'Barra de Escala' :
                    objetoSelId.startsWith('planta:poligono_sigef') ? 'Polígono SIGEF' :
                    objetoSelId.startsWith('planta:laudo') ? 'Laudo Técnico' :
                    objetoSelId.startsWith('planta:declaracoes') ? 'Declarações' :
                    objetoSelId.startsWith('planta:convençoes') ? 'Convenções' :
                    objetoSelId.startsWith('planta:coordenadas') ? 'Tabela de Coordenadas' :
                    objetoSelId.startsWith('planta:carimbo') ? 'Carimbo da Prancha' :
                    'Elemento Vetorial'
                  }
                </div>
              )}
              {selecionadoId && (
                <div className="pl-4 text-sky-400 font-semibold">
                  Vértice: {vertices.find(v => v.id === selecionadoId)?.nome || 'Selecionado'}
                </div>
              )}

              {/* Status do Banco de Dados */}
              <div className="pl-4 flex items-center gap-1.5">
                {salvarLaranja ? (
                  <span className="text-amber-600 dark:text-amber-500 font-extrabold flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-amber-500 animate-ping" />
                    Modificações locais pendentes
                  </span>
                ) : (
                  <span className="text-emerald-700 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    Sincronizado na Nuvem
                  </span>
                )}
              </div>

              {/* Botão de Ajustes e Configurações no fim da Barra de Status */}
              <div className="pl-3 border-l border-slate-300 dark:border-slate-800 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setProjetosModalAberto(true)}
                  className="px-2.5 py-1 rounded-lg text-slate-800 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer outline-none border border-slate-400/50 dark:border-slate-700/60 bg-slate-200/90 dark:bg-slate-900/60 text-[9.5px] font-black uppercase tracking-wider shadow-2xs"
                  title="Abrir Lista de Projetos Salvos"
                >
                  <FolderOpen className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>PROJETOS</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfigAberta(true)}
                  className="p-1 rounded text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer outline-none"
                  title="Ajustes e Configurações Gerais do App"
                >
                  <Settings className="size-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Modal Dialog de Explicação Detalhada do Passo Atual */}
          <Dialog open={explicacaoPassoAberto} onOpenChange={setExplicacaoPassoAberto}>
            <DialogContent className="max-w-md bg-slate-900 border border-slate-800 text-slate-100 p-5 rounded-2xl shadow-2xl">
              <DialogHeader className="pb-3 border-b border-slate-800">
                <DialogTitle className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-sky-400">
                  <GraduationCap className="size-5 text-sky-400" />
                  Como Proceder — Passo {dicaFluxo.passo} de 9
                </DialogTitle>
              </DialogHeader>
              <div className="py-3 space-y-2">
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Info className="size-4 text-amber-400 shrink-0" />
                  {dicaFluxo.resumo}
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-sans bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  {dicaFluxo.detalhe}
                </p>
              </div>
              <div className="flex justify-end pt-2 border-t border-slate-800">
                <Button
                  type="button"
                  onClick={() => setExplicacaoPassoAberto(false)}
                  className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-5 py-2 rounded-lg border-0 shadow-md"
                >
                  Entendido
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

// ---------------- subcomponentes ----------------

function MiniSelect({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <select className="h-7 w-full rounded-sm border border-input bg-background px-1 text-xs" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function AjusteTamanho({ label, valor, titulo, negrito = true, onDec, onInc }: { label: string; valor?: string; titulo?: string; negrito?: boolean; onDec: () => void; onInc: () => void }) {
  return (
    <div className={`flex flex-col justify-between gap-1 rounded-lg bg-muted/40 border border-border/80 p-1.5 text-[10px] text-foreground shadow-2xs ${negrito ? 'font-bold' : 'font-medium'}`} title={titulo}>
      <div className="flex items-center justify-between gap-1 px-0.5">
        <span className="truncate text-[9.5px] font-bold text-foreground/90">{label}</span>
        {valor && <span className="text-[9px] font-mono font-black text-primary shrink-0">{valor}</span>}
      </div>
      <div className="flex h-7 items-stretch overflow-hidden rounded border border-border/90 bg-background shadow-2xs">
        <button
          type="button"
          aria-label={`Diminuir ${label}`}
          className="flex flex-1 items-center justify-center min-w-0 text-foreground bg-secondary/80 hover:bg-primary hover:text-white active:scale-95 transition-all"
          onClick={onDec}
        >
          <Minus className="size-3 shrink-0" />
        </button>
        <div className="w-px bg-border/80" />
        <button
          type="button"
          aria-label={`Aumentar ${label}`}
          className="flex flex-1 items-center justify-center min-w-0 text-foreground bg-secondary/80 hover:bg-primary hover:text-white active:scale-95 transition-all"
          onClick={onInc}
        >
          <Plus className="size-3 shrink-0" />
        </button>
      </div>
    </div>
  );
}

// Título de uma seção do formulário de Dados — dá cara de cadastro profissional (maiúsculas + traço).
function SecaoTitulo({ children }: { children: ReactNode }) {
  return <div className="mt-1 border-b pb-1 text-[10px] font-bold uppercase tracking-wider text-primary/80">{children}</div>;
}

// Aviso (sem travar — padrão do app pra CPF suspeito) quando o documento digitado não fecha os
// dígitos verificadores. Mesmo texto do ConfrontanteEditModal.
function avisoDoc(v?: string): string | undefined {
  return v?.trim() && !cpfOuCnpjValido(v) ? 'CPF/CNPJ inválido (dígitos verificadores incorretos).' : undefined;
}

function Campo({ label, value, onChange, placeholder, list, aviso, importante }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; list?: string; aviso?: string; importante?: boolean }) {
  const formatado = /cpf|cnpj/i.test(label) ? formatarCpfCnpj(value) : value;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (/cpf|cnpj/i.test(label)) {
      onChange(formatarCpfCnpj(rawVal));
    } else {
      onChange(rawVal);
    }
  };

  const handleBlur = async () => {
    if (/cpf|cnpj/i.test(label) && value) {
      const clean = value.replace(/\D/g, '');
      if (clean.length > 0 && !cpfOuCnpjValido(clean)) {
        await avisar({
          titulo: 'Documento Inválido',
          mensagem: `O ${label} informado ("${value}") é inválido. Por favor, digite um CPF ou CNPJ correto.`
        });
        onChange('');
      }
    }
  };

  return (
    <div className="space-y-0.5">
      <Label className={`text-[10px] uppercase tracking-wide ${importante ? 'text-amber-600 dark:text-amber-400 font-extrabold' : 'text-muted-foreground'}`}>
        {label}{importante && ' *'}
      </Label>
      <Input list={list} value={formatado} placeholder={placeholder} onChange={handleChange} onBlur={handleBlur} className={`h-8 text-sm${aviso ? ' border-amber-500' : ''}`} />
      {aviso && <p className="text-[10px] leading-tight text-amber-600">{aviso}</p>}
    </div>
  );
}
function PainelImovel({ aba, imovel, onChange, onMunicipio, onLocal, nome, onNome, zona, hemisferio, onZona, onHemisferio, sugProp, onSalvarProp, sugCartorios, onIa, projetoId, extrairDocumento }: {
  aba?: Aba;
  imovel: ImovelData; onChange: (i: ImovelData) => void; onMunicipio: (s: string) => void; onLocal: (s: string) => void;
  nome: string; onNome: (v: string) => void;
  zona: number; hemisferio: 'N' | 'S'; onZona: (z: number) => void; onHemisferio: (h: 'N' | 'S') => void;
  sugProp: ProprietarioCad[]; onSalvarProp: () => void; sugCartorios: CartorioCad[];
  onIa?: () => void;
  projetoId?: string | null;
  extrairDocumento?: (arquivo: ArquivoProjeto) => void;
}) {
  const set = (k: keyof ImovelData, v: string) => onChange({ ...imovel, [k]: v });
  function setProprietario(v: string) {
    const m = sugProp.find((p) => p.nome === v);
    onChange(m ? { ...imovel, proprietario: v, cpfProprietario: m.cpf, tipoPessoa: m.tipoPessoa } : { ...imovel, proprietario: v });
  }
  const titulares = imovel.proprietariosAdicionais ?? [];
  const setTitulares = (lista: ProprietarioParte[]) => onChange({ ...imovel, proprietariosAdicionais: lista });
  const addTitular = () => setTitulares([...titulares, { nome: '', cpf: '', papel: 'condomino' }]);
  const setTitular = (i: number, patch: Partial<ProprietarioParte>) => setTitulares(titulares.map((p, k) => (k === i ? { ...p, ...patch } : p)));
  const rmTitular = (i: number) => setTitulares(titulares.filter((_, k) => k !== i));

  if (aba === 'localizacao') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
        {/* CARD LOCALIZAÇÃO */}
        <div className="space-y-2 border rounded-xl p-3 bg-muted/10">
          <SecaoTitulo>Localização do Imóvel</SecaoTitulo>
          <div className="space-y-2">
            <div className="space-y-1">
              <Campo label="Município" value={imovel.municipio} onChange={onMunicipio} placeholder="Espera Feliz-MG" importante />
              <div className="flex flex-wrap gap-1 pt-1">
                {MUNICIPIOS_ATALHO.map((m) => (
                  <button key={m} type="button" onClick={() => onMunicipio(m)} title={`Usar ${m}`}
                    className={`rounded-md border px-2 py-0.5 text-[10px] transition-colors ${imovel.municipio === m ? 'border-primary bg-primary/10 text-primary font-bold' : 'bg-secondary text-secondary-foreground hover:bg-muted'}`}>
                    {m.replace(/-[A-Z]{2}$/, '')}
                  </button>
                ))}
              </div>
            </div>
            <Campo label="Local (memorial / córrego / bairro)" value={imovel.local} onChange={onLocal} placeholder={imovel.municipio || 'Córrego...'} importante />
            <Campo
              label="Comarca do Cartório"
              value={imovel.comarca ?? ''}
              onChange={(v) => set('comarca', v)}
              placeholder={sugCartorios.find((x) => x.cns === imovel.cns)?.municipio || imovel.municipio || "Comarca (ex.: Manhumirim-MG)"}
              aviso="Deixe em branco para usar a comarca automática do cartório (CNS) ou do município"
            />
          </div>
        </div>

        {/* CARD FUSO UTM & PARÂMETROS */}
        <div className="space-y-2 border rounded-xl p-3 bg-muted/10">
          <SecaoTitulo>Fuso UTM &amp; Geodesia</SecaoTitulo>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Hemisfério</Label>
              <div className="flex rounded-md border border-input p-0.5">
                {(['S', 'N'] as const).map((h) => (
                  <button key={h} type="button" onClick={() => onHemisferio(h)}
                    className={`rounded-sm px-3 py-0.5 text-[10px] font-bold uppercase transition-colors ${hemisferio === h ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
                    {h === 'S' ? 'Sul (S)' : 'Norte (N)'}
                  </button>
                ))}
              </div>
            </div>
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold block pt-1">Fuso UTM (Zona 18 a 25)</Label>
            <div className="grid grid-cols-8 gap-1">
              {[18, 19, 20, 21, 22, 23, 24, 25].map((z) => (
                <button key={z} type="button" onClick={() => onZona(z)} title={`Fuso ${z}${hemisferio}`}
                  className={`rounded-md border py-1 text-[11px] font-extrabold transition-colors ${zona === z ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-input bg-secondary text-secondary-foreground hover:bg-accent'}`}>
                  {z}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1 pt-2 border-t">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Cálculo de Azimute no Memorial</Label>
            <select
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-semibold"
              value={imovel.tipoAzimute ?? 'geodesico'}
              onChange={(e) => set('tipoAzimute', e.target.value)}
            >
              <option value="geodesico">Azimutes Geodésicos (Padrão Oficial SIGEF/INCRA)</option>
              <option value="plano">Azimutes Planos (Grid UTM)</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  if (aba === 'proprietario') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
        {/* CARD PROPRIETÁRIO PRINCIPAL */}
        <div className="space-y-2 border rounded-xl p-3 bg-muted/10">
          <SecaoTitulo>Proprietário Principal</SecaoTitulo>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400 font-extrabold">Proprietário *</Label>
                <button type="button" className="text-[10px] text-primary hover:underline font-semibold" onClick={onSalvarProp}>Salvar no cadastro</button>
              </div>
              <Input list="lista-proprietarios" value={imovel.proprietario} onChange={(e) => setProprietario(e.target.value)} className="h-8 text-xs font-semibold border-amber-600/30" />
              <datalist id="lista-proprietarios">
                {sugProp.map((p) => <option key={p.id} value={p.nome} />)}
              </datalist>
            </div>
            <Campo label="CPF/CNPJ do proprietário" value={imovel.cpfProprietario} onChange={(v) => set('cpfProprietario', v)} aviso={avisoDoc(imovel.cpfProprietario)} importante />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Tipo de Proprietário</Label>
              <select
                value={imovel.tipoPessoa || 'Física'}
                onChange={(e) => set('tipoPessoa', e.target.value)}
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="Física">Pessoa Física</option>
                <option value="Jurídica">Pessoa Jurídica</option>
                <option value="Espólio">Espólio (Sucessão)</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Papel do proprietário</Label>
              <select className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                value={imovel.papelProprietario ?? 'proprietario'} onChange={(e) => set('papelProprietario', e.target.value)}>
                <option value="proprietario">Proprietário pleno</option>
                <option value="condomino">Condômino / coproprietário</option>
                <option value="usufrutuario">Usufrutuário</option>
                <option value="nu-proprietario">Nu-proprietário</option>
                <option value="inventariante">Inventariante (espólio)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Campo label="Cônjuge do proprietário" value={imovel.conjugeProprietario ?? ''} onChange={(v) => set('conjugeProprietario', v)} />
            <Campo label="CPF do cônjuge" value={imovel.cpfConjugeProprietario ?? ''} onChange={(v) => set('cpfConjugeProprietario', v)} aviso={avisoDoc(imovel.cpfConjugeProprietario)} />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-dashed">
            <Campo label="Contratante do serviço (se difere do dono)" value={imovel.contratante ?? ''} onChange={(v) => set('contratante', v)} placeholder="Ex.: herdeiro, posseiro, promitente..." />
            <Campo label="CPF/CNPJ do contratante" value={imovel.cpfContratante ?? ''} onChange={(v) => set('cpfContratante', v)} aviso={avisoDoc(imovel.cpfContratante)} />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-dashed">
            <Campo label="Nome do comprador (se houver)" value={imovel.comprador ?? ''} onChange={(v) => set('comprador', v)} placeholder="Se houver..." />
            <Campo label="CPF/CNPJ do comprador" value={imovel.cpfComprador ?? ''} onChange={(v) => set('cpfComprador', v)} aviso={avisoDoc(imovel.cpfComprador)} />
          </div>
        </div>

        {/* CARD OUTROS TITULARES & DOCUMENTOS */}
        <div className="space-y-2 border rounded-xl p-3 bg-muted/10">
          <SecaoTitulo>Outros Titulares &amp; Documentos</SecaoTitulo>
          <div className="space-y-1.5 rounded-lg border p-2 bg-background shadow-sm">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Outros titulares{titulares.length ? ` (${titulares.length})` : ''}</Label>
              <Button size="sm" variant="outline" className="h-6 gap-1 text-[10px] px-2" onClick={addTitular}><Plus className="size-3" /> Adicionar</Button>
            </div>
            {titulares.length === 0 && <p className="text-[10px] text-muted-foreground leading-snug">Coproprietários, nu-proprietários, inventariantes adicionais.</p>}
            {titulares.map((tt, i) => (
              <div key={i} className="space-y-1 rounded border bg-muted/20 p-1.5 text-xs">
                <div className="flex items-center gap-1.5">
                  <select className="h-7 flex-1 rounded-md border border-input bg-background px-2 text-[11px]"
                    value={tt.papel} onChange={(e) => setTitular(i, { papel: e.target.value as ProprietarioParte['papel'] })}>
                    <option value="condomino">Condômino / coproprietário</option>
                    <option value="usufrutuario">Usufrutuário</option>
                    <option value="nu-proprietario">Nu-proprietário</option>
                    <option value="inventariante">Inventariante (espólio)</option>
                  </select>
                  <Button size="sm" variant="ghost" className="size-6 shrink-0 p-0 text-destructive" title="Remover titular" onClick={() => rmTitular(i)}><Trash2 className="size-3" /></Button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Input placeholder="Nome" value={tt.nome} onChange={(e) => setTitular(i, { nome: e.target.value })} className="h-7 text-xs" />
                  <Input placeholder="CPF/CNPJ" value={tt.cpf} onChange={(e) => setTitular(i, { cpf: e.target.value })} className="h-7 text-xs" />
                </div>
              </div>
            ))}
          </div>

          {projetoId && extrairDocumento && (
            <div className="pt-1 border-t">
              <DocumentosProjeto projetoId={projetoId} dono="imovel" titulo="Documentos do Imóvel &amp; Proprietário" onExtrair={extrairDocumento} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Padrão: aba === 'imovel' (Imóvel & Registro)
  return (
    <div className="space-y-3">
      {/* Seletor Deslizante Rural / Urbano & Leitura com IA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="flex rounded-md bg-zinc-100 dark:bg-zinc-800 p-0.5 text-xs font-semibold border border-zinc-200 dark:border-zinc-700 h-10 items-center">
          <button
            type="button"
            onClick={() => onChange({ ...imovel, tipoImovel: 'rural' })}
            className={`flex-1 rounded-md py-1 text-center transition-all ${imovel.tipoImovel !== 'urbano' ? 'bg-white dark:bg-zinc-950 text-indigo-600 dark:text-indigo-400 shadow-sm border border-zinc-200/50 dark:border-zinc-800 font-bold' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
          >
            Rural
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...imovel, tipoImovel: 'urbano' })}
            className={`flex-1 rounded-md py-1 text-center transition-all ${imovel.tipoImovel === 'urbano' ? 'bg-white dark:bg-zinc-950 text-indigo-600 dark:text-indigo-400 shadow-sm border border-zinc-200/50 dark:border-zinc-800 font-bold' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
          >
            Urbano
          </button>
        </div>

        {onIa && (
          <button
            type="button"
            onClick={onIa}
            className="flex items-center justify-between px-3 py-1.5 rounded-lg border border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/5 to-transparent hover:from-violet-500/15 hover:via-fuchsia-500/10 transition-all group shadow-sm text-left h-10"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-violet-600 rounded-md text-white group-hover:scale-105 transition-transform shadow">
                <Sparkles className="size-3.5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                  Leitura Automática da Matrícula com IA
                </div>
              </div>
            </div>
            <ChevronRight className="size-4 text-violet-500 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
        {/* COLUNA ESQUERDA: Identificação do imóvel */}
        <div className="space-y-2 border rounded-xl p-3 bg-muted/10">
          <SecaoTitulo>Identificação do imóvel</SecaoTitulo>
          <div className="grid grid-cols-2 gap-2">
            <Campo label="Nome do projeto" value={nome} onChange={onNome} importante />
            <Campo label="Denominação do imóvel" value={imovel.denominacao} onChange={(v) => set('denominacao', v)} placeholder={imovel.tipoImovel === 'urbano' ? "Lote / Residencial..." : "Fazenda..."} importante />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Campo label="Matrícula" value={imovel.matricula} onChange={(v) => set('matricula', v)} importante={imovel.cns !== 'não informar'} />
            <div>
              <Campo label="Cartório (CNS)" value={imovel.cns} onChange={(v) => set('cns', v)} list="lista-cns" importante={imovel.cns !== 'não informar'} />
              {(() => {
                const cart = sugCartorios.find(x => x.cns === imovel.cns);
                return cart ? (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 leading-tight">
                    {cart.municipio ? `${cart.municipio} - ` : ''}{cart.nome}
                  </p>
                ) : imovel.cns === 'não informar' ? (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 leading-tight font-semibold">
                    Imóvel sem registro em cartório
                  </p>
                ) : null;
              })()}
              <label className="flex items-center gap-1.5 cursor-pointer mt-1 select-none">
                <input
                  type="checkbox"
                  checked={imovel.cns === 'não informar'}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange({ ...imovel, cns: 'não informar', matricula: '' });
                    } else {
                      onChange({ ...imovel, cns: '' });
                    }
                  }}
                  className="rounded border-zinc-300 dark:border-zinc-700 text-primary focus:ring-primary size-3.5"
                />
                <span className="text-[9px] font-bold text-muted-foreground uppercase">Sem registro (Não informar)</span>
              </label>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: Registro & Regime */}
        <div className="space-y-2 border rounded-xl p-3 bg-muted/10">
          <SecaoTitulo>Regime &amp; Códigos Oficiais</SecaoTitulo>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Regime de terra</Label>
              <div className="flex rounded-md bg-zinc-100 dark:bg-zinc-800 p-0.5 text-xs font-semibold border border-zinc-200 dark:border-zinc-700">
                <button
                  type="button"
                  onClick={() => onChange({ ...imovel, regimeTerra: 'propriedade' })}
                  className={`flex-1 rounded-md py-1 text-center transition-all ${(imovel.regimeTerra ?? 'propriedade') === 'propriedade' ? 'bg-white dark:bg-zinc-950 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold' : 'text-zinc-500 dark:text-zinc-400'}`}
                >
                  Propriedade
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...imovel, regimeTerra: 'posse' })}
                  className={`flex-1 rounded-md py-1 text-center transition-all ${imovel.regimeTerra === 'posse' ? 'bg-white dark:bg-zinc-950 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold' : 'text-zinc-500 dark:text-zinc-400'}`}
                >
                  Posse
                </button>
              </div>
            </div>

            {imovel.tipoImovel === 'rural' ? (
              <Campo label="Código INCRA / SNCR" value={imovel.codigoImovelIncra} onChange={(v) => set('codigoImovelIncra', v)} importante />
            ) : (
              <Campo label="Inscrição Municipal" value={imovel.inscricaoMunicipal ?? ''} onChange={(v) => set('inscricaoMunicipal', v)} placeholder="Inscrição..." />
            )}
          </div>

          {imovel.tipoImovel === 'rural' && (
            <div className="grid grid-cols-2 gap-2">
              <Campo label="Área anterior na matrícula (ha)" value={imovel.areaAnterior != null ? String(imovel.areaAnterior) : ''} onChange={(v) => onChange({ ...imovel, areaAnterior: v === '' ? undefined : Number(v) })} placeholder="0.0000" importante />
              {ufDoMunicipio(imovel.municipio) === 'MT' && (
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Padrão do memorial</Label>
                  <div className="flex rounded-md bg-zinc-100 dark:bg-zinc-800 p-0.5 text-xs font-semibold border border-zinc-200 dark:border-zinc-700">
                    <button
                      type="button"
                      onClick={() => onChange({ ...imovel, padraoMemorial: 'incra' })}
                      className={`flex-1 rounded-md py-1 text-center transition-all ${(imovel.padraoMemorial ?? 'incra') === 'incra' ? 'bg-white dark:bg-zinc-950 text-indigo-600' : 'text-zinc-500'}`}
                    >
                      INCRA / SIGEF
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange({ ...imovel, padraoMemorial: 'intermat' })}
                      className={`flex-1 rounded-md py-1 text-center transition-all ${imovel.padraoMemorial === 'intermat' ? 'bg-white dark:bg-zinc-950 text-indigo-600' : 'text-zinc-500'}`}
                    >
                      INTERMAT
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PainelConferencia({
  vertices, res, imovel, confrontantes, confrontantePorLado, onChange, conflitos, onIrParaConflito, tecnico,
  nomeProjeto, numGlebas, glebas, projetoId, onReconciliar, verticesHashConferencia
}: {
  vertices: Vertex[]; res: ReturnType<typeof calcular> | null; imovel: ImovelData; confrontantes: Confrontante[]; confrontantePorLado: Record<number, string>; onChange: (i: ImovelData) => void;
  conflitos: ConflitoDivisa[];
  onIrParaConflito: (lat: number, lon: number) => void;
  onReconciliar?: () => void;
  verticesHashConferencia: string | null;
  tecnico: TecnicoData | null;
  nomeProjeto: string;
  numGlebas: number;
  glebas?: Gleba[];
  projetoId: string | null;
}) {
  const problemas: Problema[] = conferir(vertices, res, imovel, confrontantes, confrontantePorLado, tecnico);
  const Icone = ({ n }: { n: Problema['nivel'] }) =>
    n === 'erro' ? <XCircle className="text-destructive size-4" /> : n === 'aviso' ? <AlertTriangle className="text-amber-500 size-4" /> : <CheckCircle2 className="text-primary size-4" />;
  const ef = res ? valoresEfetivos(res, imovel) : null;

  useEffect(() => {
    if (projetoId && typeof window !== 'undefined') {
      try { localStorage.setItem(`metrica.infoVista:${projetoId}`, '1'); } catch { /* ignore */ }
    }
  }, [projetoId]);

  const areaHa = res?.areaHa ?? 0;
  const perimetro = res?.perimetro ?? 0;

  const vRefGlebas: [string, string][] = useMemo(() => {
    if (glebas && glebas.length > 1) {
      return glebas.map((g, idx) => {
        const vs = g.vertices ?? [];
        const vRefG = vs.length >= 3 ? iniciarDoNorteHorario(vs)[0] : vs[0];
        const rotulo = `Vértice Ref. (${g.denominacao || g.parcela || `Gleba ${idx + 1}`})`;
        const val = vRefG ? (vRefG.codigoSigef || vRefG.nome || '—') : '—';
        return [rotulo, val];
      });
    }
    const vRefMain = vertices.length >= 3 ? iniciarDoNorteHorario(vertices)[0] : vertices[0];
    const val = vRefMain ? (vRefMain.codigoSigef || vRefMain.nome || '—') : '—';
    return [['Vértice Ref. (Norte)', val]];
  }, [glebas, vertices]);

  const det: [string, string][] = [
    ['Projeto', nomeProjeto || '—'],
    [imovel.tipoImovel === 'urbano' ? 'Lote/Imóvel' : 'Imóvel', imovel.denominacao || '—'],
    ['Proprietário', imovel.proprietario || '—'],
    ['CPF/CNPJ', imovel.cpfProprietario || '—'],
    ['Matrícula', imovel.matricula || '—'],
    ['Cartório (CNS)', imovel.cns || '—'],
    ['Código INCRA', imovel.codigoImovelIncra || '—'],
    ['Município', imovel.municipio || '—'],
    [rotulosProfissional(tecnico).termo, imovel.numeroTrt || tecnico?.art || '—'],
    ['Responsável técnico', tecnico?.nome || '—'],
    ['Área SGL', `${numBR(areaHa, 4)} ha`],
    ['Perímetro', `${numBR(perimetro)} m`],
    ...vRefGlebas,
    ['Vértices', String(vertices.length)],
    ['Confrontantes', String(confrontantes.length)],
    ['Glebas', String(numGlebas)],
  ];

  return (
    <div className="space-y-3">
      {/* Box de Reconciliação com o SIGEF */}
      {(() => {
        const reconciliado = !!imovel.usarValoresSigef &&
          imovel.areaSigefHa != null && imovel.perimetroSigef != null &&
          verticesHashConferencia !== null &&
          verticesHashConferencia === vertices.map(v => `${v.leste.toFixed(3)},${v.norte.toFixed(3)}`).join('|');
        return (
          <div className={`border p-2.5 px-3 rounded-lg shadow-sm text-left transition-colors duration-500 ${
            reconciliado
              ? 'bg-emerald-500/8 dark:bg-emerald-500/12 border-emerald-500/30'
              : 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                reconciliado ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
              }`}>
                <CheckCircle2 className={`size-4 transition-colors ${
                  reconciliado ? 'text-emerald-500' : 'text-amber-500'
                }`} />
                Reconciliação de Área/Perímetro com o SIGEF
                {reconciliado && <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">Conciliado</span>}
              </h3>
              <p className="text-[10px] text-muted-foreground hidden sm:block">
                Valores recalculados pelo SIGEF pós-ODS (utilizados nas peças se ativado).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-foreground">Área Oficial (ha):</span>
                <input
                  type="number"
                  step="0.0001"
                  placeholder="ex.: 12.3456"
                  value={imovel.areaSigefHa == null ? '' : imovel.areaSigefHa}
                  onChange={(e) => onChange({ ...imovel, areaSigefHa: e.target.value ? Number(e.target.value) : undefined })}
                  className="h-7 w-28 px-2 text-xs font-semibold border border-border/80 bg-background rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-foreground">Perímetro Oficial (m):</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="ex.: 1240.50"
                  value={imovel.perimetroSigef == null ? '' : imovel.perimetroSigef}
                  onChange={(e) => onChange({ ...imovel, perimetroSigef: e.target.value ? Number(e.target.value) : undefined })}
                  className="h-7 w-28 px-2 text-xs font-semibold border border-border/80 bg-background rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                />
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer select-none bg-background dark:bg-zinc-900 border border-border/80 px-2.5 h-7 rounded-md text-xs font-bold" title="Usar valores do SIGEF nas peças finais">
                <input
                  type="checkbox"
                  checked={!!imovel.usarValoresSigef}
                  onChange={(e) => {
                    onChange({ ...imovel, usarValoresSigef: e.target.checked });
                    if (e.target.checked && imovel.areaSigefHa != null && imovel.perimetroSigef != null) {
                      onReconciliar?.();
                    }
                  }}
                  className="rounded border-zinc-300 dark:border-zinc-700 text-amber-600 focus:ring-amber-500 size-3.5"
                />
                <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase">Usar Valores do SIGEF</span>
              </label>
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Coluna Esquerda: Dados Gerais do Projeto (5 cols -> Grid Adensado em 2 colunas) */}
        <div className="lg:col-span-5 space-y-2 text-left">
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="py-2 px-3 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-xs font-black uppercase text-foreground tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Info className="size-3.5 text-primary" /> Dados Gerais do Projeto
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground bg-background px-2 py-0.5 rounded border border-border/60">
                  {vertices.length} vértices · {confrontantes.length} confrontantes
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2.5">
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                {det.map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-1 border-b border-border/30 pb-0.5 text-[11px] min-w-0">
                    <span className="text-muted-foreground font-medium shrink-0 truncate max-w-[85px]">{k}</span>
                    <span className="truncate text-right font-bold text-foreground max-w-[115px]" title={v}>{v}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <div className="p-2 px-2.5 bg-muted/30 rounded-lg border border-border/40 text-[10px] leading-tight text-muted-foreground flex items-center gap-2">
            <Info className="size-3.5 text-muted-foreground shrink-0" />
            <span>Matrículas e anexos dos confrontantes podem ser gerenciados na aba <strong>AJUSTES / DADOS</strong>.</span>
          </div>
        </div>

        {/* Coluna Direita: Análise de Limites, Conflitos e Pendências (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Limites Legais e Conflitos de Divisa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardHeader className="p-2.5 pb-1">
                <CardTitle className="text-[10px] text-blue-700 dark:text-blue-300 font-bold flex items-center gap-1.5 uppercase tracking-wide">
                  <Info className="size-3.5 text-blue-500" />
                  Limites de Precisão SIGEF
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2.5 pt-1 text-[10px] text-muted-foreground">
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 font-medium">
                  <div><b>Artificiais (LA):</b> 0.10m</div>
                  <div><b>Naturais (LN):</b> 3.00m</div>
                  <div><b>Inacessíveis (LV):</b> 7.50m</div>
                  <div><b>Vertical (Sigma Z):</b> 0.30m</div>
                </div>
              </CardContent>
            </Card>

            {conflitos.length > 0 ? (
              <Card className="border-pink-500/20 bg-pink-500/5">
                <CardHeader className="p-2.5 pb-1">
                  <CardTitle className="text-[10px] text-pink-700 dark:text-pink-300 font-bold flex items-center gap-1.5 uppercase tracking-wide">
                    <AlertTriangle className="size-3.5 text-pink-500" />
                    Conflitos ({conflitos.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2.5 pt-1 space-y-1">
                  {conflitos.map((c, i) => {
                    const label = c.tipo === 'sobreposicao' ? 'Sobreposição' : 'Vão';
                    const corLabel = c.tipo === 'sobreposicao' ? 'text-pink-600 dark:text-pink-400 font-bold' : 'text-cyan-600 dark:text-cyan-400 font-bold';
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => onIrParaConflito(c.pontoConflito.lat, c.pontoConflito.lon)}
                        className="w-full text-left flex items-center justify-between text-[10px] rounded border border-border bg-background px-2 py-1 hover:bg-accent transition-colors"
                      >
                        <span>Lado {c.ladoIdx + 1}: <span className={corLabel}>{label}</span></span>
                        <span className="font-mono text-muted-foreground">{numBR(c.distancia)} m</span>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardHeader className="p-2.5 pb-1">
                  <CardTitle className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1.5 uppercase tracking-wide">
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                    Conflitos de Divisa
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2.5 pt-1 text-[10px] text-muted-foreground font-medium">
                  Sem sobreposição ou vão geométrico com vizinhos.
                </CardContent>
              </Card>
            )}
          </div>

          {/* Pendências / Checklist */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-black uppercase text-muted-foreground tracking-wider text-left flex items-center justify-between">
              <span>Checklist de Conformidade</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                problemas.filter(p => p.nivel === 'erro').length > 0 ? 'bg-destructive/15 text-destructive' :
                problemas.filter(p => p.nivel === 'aviso').length > 0 ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' :
                'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              }`}>
                {problemas.length === 0 ? '100% Ok' : `${problemas.length} item(ns)`}
              </span>
            </div>
            {problemas.length > 0 ? (
              <div className="grid grid-cols-1 gap-1.5 max-h-[190px] overflow-y-auto pr-1 scroll-fino">
                {problemas.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg border bg-background p-2 text-xs text-left shadow-sm">
                    <span className="mt-0.5 shrink-0"><Icone n={p.nivel} /></span>
                    <div className="space-y-0.5">
                      <span className="font-bold uppercase text-[9px] text-foreground tracking-wide">{p.campo}</span>
                      <p className="text-muted-foreground text-[10px] leading-tight font-medium">{p.msg}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2.5 border border-dashed rounded-lg bg-emerald-500/5 border-emerald-500/25 flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-5 shrink-0" />
                <div className="text-left">
                  <span className="text-xs font-bold uppercase tracking-wide block">Projeto 100% Regularizado</span>
                  <p className="text-[10px] text-muted-foreground">Nenhuma pendência encontrada. Atende todos os requisitos do SIGEF/INCRA.</p>
                </div>
              </div>
            )}
          </div>

          {/* Nota Legal */}
          <NotaLegal chave="validadePeca" />
        </div>
      </div>
    </div>
  );
}

function PainelConfrontantes({ confrontantes, onChange, mapa, lados, sugConf, onSalvarCadastro, imovel, tecnico, projetoId, onExtrairConfrontante, onExcluir, onEditar, sugCartorios = [] }: {
  confrontantes: Confrontante[]; onChange: (c: Confrontante[]) => void;
  onExcluir: (id: string) => void;
  onEditar?: (id: string) => void;
  mapa: Record<number, string>; lados: Lado[];
  sugConf: ConfrontanteCad[]; onSalvarCadastro: (c: Confrontante) => void;
  imovel: ImovelData; tecnico: TecnicoData | null;
  projetoId: string | null; onExtrairConfrontante: (a: ArquivoProjeto, confrontanteId: string) => void;
  sugCartorios?: CartorioCad[];
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
              inventarianteNome: m.inventarianteNome, inventarianteCpf: m.inventarianteCpf,
              nuProprietarioNome: m.nuProprietarioNome, nuProprietarioCpf: m.nuProprietarioCpf } : { ...c, nome: v })
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
      saveAs(blob, limparNomeArquivo(`Carta de Anuencia - ${c.nome || 'Confrontante'}.docx`));
    } catch {
      await avisar({ titulo: 'Carta de Anuência', mensagem: 'Erro ao gerar a Carta de Anuência.' });
    }
  };

  const addConfrontante = () => {
    const id = `c_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)}`;
    const randomCor = gerarCorNovaConfrontante(confrontantes);
    onChange([...confrontantes, { id, nome: '', cpf: '', matricula: '', cns: '', condicao: 'proprietario', cor: randomCor }]);
    onEditar?.(id);
  };

  // Atalho pra bem público (estrada, rio...): já nasce com condicao='publico' (nunca assina) e um
  // nome padrão que o usuário pode ajustar (ex.: trocar "Rio" por "Rio das Pedras").
  const addConfrontanteEspecial = (nomePadrao: string) => {
    const id = `c_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)}`;
    const randomCor = gerarCorNovaConfrontante(confrontantes);
    onChange([...confrontantes, { id, nome: nomePadrao, cpf: '', matricula: '', cns: '', condicao: 'publico', cor: randomCor }]);
    onEditar?.(id);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Confrontantes{confrontantes.length ? ` (${confrontantes.length})` : ''}
        </span>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" title="Estrada, rua, avenida... bem público, não assina" onClick={() => addConfrontanteEspecial('Estrada Municipal')}>
            <Plus className="size-3.5" /> Estrada
          </Button>
          <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" title="Rio, córrego, ribeirão... bem público, não assina" onClick={() => addConfrontanteEspecial('Rio')}>
            <Plus className="size-3.5" /> Rio
          </Button>
          <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={addConfrontante}>
            <Plus className="size-3.5" /> Adicionar
          </Button>
        </div>
      </div>
      {confrontantes.length === 0 && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          Crie um confrontante em <b>Adicionar</b>, ou pinte o trecho dele no mapa, ou importe os vizinhos certificados. Depois de criado, dá pra pintar no mapa quais lados são dele.
        </p>
      )}
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
                  <span className="inline-block h-0 w-5 shrink-0 border-t-[3px] border-dashed" style={{ borderColor: corPorConfrontante(c.id, c) }} title="Cor deste confrontante no mapa" />
                  {idxs.length} lado(s){lados.length ? `: ${idxs.map((i) => lados[i]?.de.codigoSigef).filter(Boolean).join(', ')}` : ''}
                </span>
                <div className="flex items-center gap-2">
                  {c.condicao !== 'publico' && (
                    <button className="text-[10px] text-primary hover:underline" onClick={() => exportarAnuenciaConfrontante(c)}>gerar carta (.docx)</button>
                  )}
                  <button className="text-[10px] text-primary hover:underline" onClick={() => onSalvarCadastro(c)}>salvar no cadastro</button>
                  <button className="text-muted-foreground/70 transition-colors hover:text-destructive" title="Excluir este confrontante do projeto" onClick={() => onExcluir(c.id)}>
                    <Trash2 className="size-3.5" />
                  </button>
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
                    const limpa: Partial<Confrontante> = {
                      ...(cond === 'espolio' ? { conjugeNome: '', conjugeCpf: '' } : {}),
                      ...(cond !== 'espolio' ? { inventarianteNome: '', inventarianteCpf: '' } : {}),
                      ...(cond !== 'usufrutuario' ? { nuProprietarioNome: '', nuProprietarioCpf: '' } : {}),
                    };
                    onChange(confrontantes.map((x) => (x.id === c.id ? { ...x, condicao: cond, ...limpa } : x)));
                  }}>
                  <option value="proprietario">Proprietário</option>
                  <option value="condomino">Condômino / coproprietário</option>
                  <option value="usufrutuario">Usufrutuário (assina com nu-proprietário)</option>
                  <option value="posseiro">Posseiro (sem matrícula)</option>
                  <option value="espolio">Espólio (assina inventariante)</option>
                  <option value="publico">Bem público (estrada, rio... não assina)</option>
                </select>
                {(c.condicao ?? 'proprietario') !== 'proprietario' && (
                  <NotaLegal chave={
                    c.condicao === 'condomino' ? 'condomino'
                    : c.condicao === 'usufrutuario' ? 'usufruto'
                    : c.condicao === 'espolio' ? 'espolio'
                    : c.condicao === 'posseiro' ? 'posseiro'
                    : 'papelProprietario'} />
                )}
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
              {(c.condicao ?? 'proprietario') === 'usufrutuario' && (
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="Nu-proprietário (assina junto)" value={c.nuProprietarioNome ?? ''} onChange={(v) => set(c.id, 'nuProprietarioNome', v)} />
                  <Campo label="CPF do nu-proprietário" value={c.nuProprietarioCpf ?? ''} onChange={(v) => set(c.id, 'nuProprietarioCpf', v)} />
                </div>
              )}
              {(c.condicao ?? 'proprietario') !== 'espolio' && (
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="Cônjuge" value={c.conjugeNome ?? ''} onChange={(v) => set(c.id, 'conjugeNome', v)} />
                  <Campo label="CPF do cônjuge" value={c.conjugeCpf ?? ''} onChange={(v) => set(c.id, 'conjugeCpf', v)} />
                </div>
              )}
              <div>
                <Campo label="Cartório (CNS)" value={c.cns} onChange={(v) => set(c.id, 'cns', v)} list="lista-cns" />
                {(() => {
                  const cart = sugCartorios.find(x => x.cns === c.cns);
                  return cart ? (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 leading-tight">
                      {cart.municipio ? `${cart.municipio} - ` : ''}{cart.nome}
                    </p>
                  ) : null;
                })()}
              </div>
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
  type BoolKey = 'mostrarGrade' | 'mostrarNortes' | 'mostrarConvencoes' | 'mostrarEscalaGrafica' | 'mostrarSituacao' | 'mostrarDivisaConf' | 'mostrarVerticesVizinho' | 'mostrarPrint3D';
  const chk = (label: string, key: BoolKey) => (
    <label className="flex items-center gap-2 text-xs">
      <input type="checkbox" checked={config[key] !== false} onChange={(e) => set({ [key]: e.target.checked } as Partial<PlantaConfig>)} />
      {label}
    </label>
  );
  return (
    <div className="space-y-3">
      <Button size="sm" variant="outline" className="w-full" onClick={onVerPlanta}><Eye /> Ver / atualizar planta</Button>
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
      <div className="grid grid-cols-2 gap-2 border rounded-sm p-2 bg-muted/5">
        <div className="col-span-2 text-[10px] uppercase font-bold text-muted-foreground">Ajuste de Tamanhos e Escalas</div>
        <div className="space-y-1">
          <Label className="text-[11px]">Fonte dos rótulos</Label>
          <Input type="number" step="0.5" placeholder="8.5" value={config.fonteRotulos ? String(config.fonteRotulos) : ''}
            onChange={(e) => set({ fonteRotulos: e.target.value ? Number(e.target.value) : undefined })} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Escala de todos os textos</Label>
          <Input type="number" step="0.05" placeholder="1.0" value={config.escalaTextos ? String(config.escalaTextos) : ''}
            onChange={(e) => set({ escalaTextos: e.target.value ? Number(e.target.value) : undefined })} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Escala das tabelas</Label>
          <Input type="number" step="0.05" placeholder="1.0" value={config.escalaTabelas ? String(config.escalaTabelas) : ''}
            onChange={(e) => set({ escalaTabelas: e.target.value ? Number(e.target.value) : undefined })} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Escala dos símbolos (M/P/V)</Label>
          <Input type="number" step="0.05" placeholder="1.0" value={config.escalaVertices ? String(config.escalaVertices) : ''}
            onChange={(e) => set({ escalaVertices: e.target.value ? Number(e.target.value) : undefined })} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Escala das declarações</Label>
          <Input type="number" step="0.05" placeholder="1.0" value={config.escalaDeclaracoes ? String(config.escalaDeclaracoes) : ''}
            onChange={(e) => set({ escalaDeclaracoes: e.target.value ? Number(e.target.value) : undefined })} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Escala dos confrontantes</Label>
          <Input type="number" step="0.05" placeholder="1.0" value={config.escalaConfront ? String(config.escalaConfront) : ''}
            onChange={(e) => set({ escalaConfront: e.target.value ? Number(e.target.value) : undefined })} className="h-8 text-xs" />
        </div>
      </div>
      <div className="space-y-1 rounded-sm border p-2">
        <div className="text-[10px] uppercase text-muted-foreground">Mostrar na planta</div>
        {chk('Grade de coordenadas', 'mostrarGrade')}
        {chk('Nortes (rosa dos ventos)', 'mostrarNortes')}
        {chk('Convenções (legenda)', 'mostrarConvencoes')}
        {chk('Escala gráfica', 'mostrarEscalaGrafica')}
        {chk('Planta de situação', 'mostrarSituacao')}
        {chk('Print do Modelo 3D', 'mostrarPrint3D')}
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
      <div className="space-y-1 rounded-sm border p-2">
        <div className="text-[10px] uppercase text-muted-foreground">Nome dos vértices</div>
        <select className="h-8 w-full rounded-sm border bg-background px-2 text-sm" value={config.estiloVertice ?? 'sigef'} onChange={(e) => set({ estiloVertice: e.target.value as 'sigef' | 'convencional' })}>
          <option value="sigef">Código SIGEF (ex.: COIN-M-0017)</option>
          <option value="convencional">Topografia convencional (P1, P2, P3…)</option>
        </select>
      </div>
      <div className="space-y-1 rounded-sm border p-2">
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
            <select className="h-7 w-full rounded-sm border bg-background px-1 text-xs" value={config.hachura ?? 'nenhuma'} onChange={(e) => set({ hachura: e.target.value as PlantaConfig['hachura'] })}>
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
        <textarea className="min-h-[84px] w-full rounded-sm border border-input bg-background p-2 text-xs" placeholder="(texto padrão)"
          value={config.textoLaudo ?? ''} onChange={(e) => set({ textoLaudo: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>Declaração dos confrontantes (carimbo)</Label>
        <textarea className="min-h-[84px] w-full rounded-sm border border-input bg-background p-2 text-xs" placeholder="(texto padrão)"
          value={config.textoConfrontantes ?? ''} onChange={(e) => set({ textoConfrontantes: e.target.value })} />
      </div>
      <Button size="sm" variant="secondary" className="w-full" onClick={onSalvarPadrao} title="Guarda estes ajustes como padrão para os próximos trabalhos"><Save /> Salvar ajustes como padrão</Button>
      <div className="space-y-1 rounded-sm border bg-muted/40 p-2 text-[11px] text-muted-foreground">
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

function calcularAreaHaProjeto(p: Projeto): number {
  const g = p.glebas?.[0];
  if (!g || !g.vertices || g.vertices.length < 3) return 0;
  let sum = 0;
  const pts = g.vertices;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    sum += pts[i].leste * pts[next].norte - pts[next].leste * pts[i].norte;
  }
  return Math.abs(sum) / 20000; // M2 para Ha: dividir por 2 * 10000
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
function dataPorExtenso(d = new Date()): string {
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}
