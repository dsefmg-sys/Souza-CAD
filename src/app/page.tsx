'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import {
  Upload, FileText, Map as MapIcon, Printer, Settings, Plus, Trash2,
  RotateCcw, Flag, Save, FolderOpen, MousePointer2, Crosshair,
  CheckCircle2, AlertTriangle, XCircle, Database, BookUser, Eye, EyeOff,
  Moon, Sun, Pencil, FileSignature, PenTool, Magnet, Lock, LockOpen, Brush, Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Planta from '@/components/Planta';
import RequerimentoModal from '@/components/RequerimentoModal';
import TrtModal from '@/components/TrtModal';
import AuthBar from '@/components/AuthBar';
import type { ModoEdicao } from '@/components/MapEditor';
import type { Vertex, ImovelData, Confrontante, TecnicoData, EscritorioData, Projeto, ProprietarioCad, ConfrontanteCad, Gleba, PessoaQualificada, ObjetoDesenho, PontoLL, PlantaConfig } from '@/lib/topo/types';
import { novaPolilinha, novoTexto, novaCota } from '@/lib/topo/objetos';
import type { RotuloMapa } from '@/components/MapEditor';
import { parseTxt, pontosDePerimetro } from '@/lib/topo/parseTxt';
import { montarVertices, reordenar, inverterSentido, definirInicio, novoVertice, reprojetar } from '@/lib/topo/vertices';
import { montarConfrontantes } from '@/lib/topo/confrontantes';
import { novaGlebaVazia, glebaDe, migrarProjeto } from '@/lib/topo/glebas';
import { calcular } from '@/lib/topo/calcular';
import { detectarZona, escolherZonaPorAncora, geoParaUtm, utmParaGeo } from '@/lib/topo/coords';
import { exportarDxf as gerarDxf, importarDxf, anelDeDxf } from '@/lib/io/dxf';
import { gerarSituacao } from '@/lib/io/situacao';
import { importarGeoJsonAneis } from '@/lib/io/geojson';
import { ancoraMunicipio } from '@/lib/topo/municipios';
import { atribuirProvisorio, semente } from '@/lib/topo/registroCore';
import { snapUtm } from '@/lib/topo/snap';
import { conferir, valoresEfetivos, type Problema } from '@/lib/topo/conferencia';
import { TIPOS_VERTICE, TIPOS_LIMITE, METODOS_POSICIONAMENTO, REPRESENTACOES, REPRES_LABEL } from '@/lib/topo/sigefVocab';
import { numBR, azimuteDMS } from '@/lib/topo/geometry';
import { carregarTecnico, carregarEscritorio } from '@/lib/store/settings';
import { salvarProjeto, listarProjetos, carregarProjeto, excluirProjeto, novoId } from '@/lib/store/projects';
import { lerContadores, registrarPontos, totalPontosRegistrados } from '@/lib/store/registro';
import { proprietarios as cadProp, confrontantesCad as cadConf, cartoriosCad as cadCart } from '@/lib/store/cadastros';
import { gerarMemorialDocx } from '@/lib/export/memorial';
import { gerarSigefOds, gerarSigefOdsSeparadas } from '@/lib/export/sigefOds';

const MapEditor = dynamic(() => import('@/components/MapEditor'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Carregando mapa…</div>,
});

const IMOVEL_VAZIO: ImovelData = {
  denominacao: '', matricula: '', cns: '', codigoImovelIncra: '', proprietario: '',
  cpfProprietario: '', tipoPessoa: 'Física', municipio: '', local: '',
  naturezaServico: 'Particular', situacao: 'Imóvel Registrado', naturezaArea: 'Particular',
};

type Aba = 'imovel' | 'vertices' | 'confrontantes' | 'planta' | 'conferencia' | 'projetos';

// tons médios e suaves (funcionam no tema claro e escuro via opacidade)
const COR_IMPORT = 'bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 border-sky-500/30';
const COR_PECA = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 border-emerald-500/30';
const COR_PLANTA = 'bg-violet-500/10 text-violet-700 dark:text-violet-300 hover:bg-violet-500/20 border-violet-500/30';

export default function EditorPage() {
  const [tecnico, setTecnico] = useState<TecnicoData | null>(null);
  const [escritorio, setEscritorio] = useState<EscritorioData | null>(null);
  const [vertices, setVertices] = useState<Vertex[]>([]);
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
  const [modo, setModo] = useState<ModoEdicao>('navegar');
  const [mostrarRotulos, setMostrarRotulos] = useState(true);
  const [snapAtivo, setSnapAtivo] = useState(false);
  const [bloqueado, setBloqueado] = useState(true); // vértices travados por padrão (protege o georref)
  const [tipoDivisaPincel, setTipoDivisaPincel] = useState<string>('estrada'); // pincel do modo "pintar divisa"
  // camada de desenho livre (objetos da gleba ativa)
  const [objetos, setObjetos] = useState<ObjetoDesenho[]>([]);
  const [desenhoBuffer, setDesenhoBuffer] = useState<PontoLL[]>([]);
  const [objetoSelId, setObjetoSelId] = useState<string | null>(null);
  const [dragVtxIdx, setDragVtxIdx] = useState<number | null>(null);
  const [situacaoUrl, setSituacaoUrl] = useState<string | undefined>(undefined);
  // referências (confrontantes certificados importados de GeoJSON) — desenho + alvos de snap
  const [referencias, setReferencias] = useState<{ lat: number; lon: number; leste: number; norte: number }[][]>([]);
  const [tema, setTema] = useState<'claro' | 'escuro'>('claro');
  const [vista, setVista] = useState<'mapa' | 'planta'>('mapa');
  const [aba, setAba] = useState<Aba>('imovel');
  const [projetoId, setProjetoId] = useState<string | null>(null);
  const [nomeProjeto, setNomeProjeto] = useState('');
  const [reqAberto, setReqAberto] = useState(false);
  const [trtAberto, setTrtAberto] = useState(false);
  const [requerente, setRequerente] = useState<PessoaQualificada | undefined>(undefined);
  const [transmitente, setTransmitente] = useState<PessoaQualificada | undefined>(undefined);
  const [plantaConfig, setPlantaConfig] = useState<PlantaConfig>({});
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [sugProp, setSugProp] = useState<ProprietarioCad[]>([]);
  const [sugConf, setSugConf] = useState<ConfrontanteCad[]>([]);
  const [sugCns, setSugCns] = useState<string[]>([]);
  const [totalPontos, setTotalPontos] = useState(0);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const dxfRef = useRef<HTMLInputElement>(null);
  const geojsonRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTecnico(carregarTecnico());
    setEscritorio(carregarEscritorio());
    cadProp.listar().then(setSugProp).catch(() => {});
    cadConf.listar().then(setSugConf).catch(() => {});
    cadCart.listar().then((cs) => setSugCns(cs.map((c) => c.cns).filter(Boolean))).catch(() => {});
    totalPontosRegistrados().then(setTotalPontos).catch(() => {});
    const t = (localStorage.getItem('metrica.tema') as 'claro' | 'escuro') || 'claro';
    setTema(t);
    // começa com uma gleba
    const g = glebaDe(1, [], [], {}, 'Parcela 1');
    setGlebas([g]);
    setGlebaAtivaId(g.id);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'escuro');
    try { localStorage.setItem('metrica.tema', tema); } catch { /* ignore */ }
  }, [tema]);

  const res = useMemo(() => (vertices.length >= 3 ? calcular(vertices, confrontantePorLado) : null), [vertices, confrontantePorLado]);

  function aviso(t: string) { setMsg(t); setTimeout(() => setMsg(''), 4000); }

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
    setGlebaAtivaId(g.id);
    setSelecionadoId(null);
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
    setProcessando(true);
    try {
      const buf = await file.arrayBuffer();
      // TXT do GNSS costuma vir em Windows-1252 (acentos)
      const texto = new TextDecoder('windows-1252').decode(buf);
      const pontos = parseTxt(texto);
      const perim = pontosDePerimetro(pontos);
      if (perim.length < 3) { aviso('O arquivo não tem pontos de perímetro suficientes.'); return; }
      const tec = tecnico ?? carregarTecnico();
      const fusos = tec.fusosPermitidos ?? [22, 23, 24, 25];
      // Fuso: âncora do município se conhecido; senão o fuso-base configurado.
      let z = detectarZona(perim[0].leste, perim[0].norte, hemisferio, tec.zonaBase ?? zona, fusos);
      const anc = ancoraMunicipio(imovel.municipio);
      if (anc) z = escolherZonaPorAncora(perim[0].leste, perim[0].norte, hemisferio, anc, fusos);
      setZona(z);
      // numeração provisória a partir do banco de pontos (para não colidir com o já usado)
      const cont = await lerContadores(tec.credenciamentoIncra, tec).catch(() => semente(tec.credenciamentoIncra, tec));
      const vs = montarVertices(perim, z, hemisferio, { credenciamentoIncra: tec.credenciamentoIncra, contadorMarco: cont.M, contadorPonto: cont.P });
      const { confrontantes: cs, confrontantePorLado: mapa } = montarConfrontantes(vs);
      // grava a importação NA gleba ativa (em glebas) e no estado de trabalho, juntos.
      const alvoId = glebaAtivaId;
      setGlebas((prev) => prev.map((g) => (g.id === alvoId ? { ...g, vertices: vs, confrontantes: cs, confrontantePorLado: mapa } : g)));
      setVertices(vs);
      setConfrontantes(cs);
      setConfrontantePorLado(mapa);
      if (!nomeProjeto) setNomeProjeto(file.name.replace(/\.[^.]+$/, ''));
      aviso(`${vs.length} vértices importados na ${glebaAtivaNome} — fuso ${z}${hemisferio}.`);
    } finally { setProcessando(false); }
  }

  function trocarZona(z: number) {
    if (!Number.isFinite(z) || z < 1 || z > 60) { setZona(z); return; }
    setZona(z);
    setVertices((vs) => reprojetar(vs, z, hemisferio));
  }

  // Ao informar o município, tenta acertar o fuso pela âncora (resolve a divisa 23/24).
  function aoMudarMunicipio(novo: string) {
    setImovel((im) => ({ ...im, municipio: novo }));
    const anc = ancoraMunicipio(novo);
    if (anc && vertices.length) {
      const tec = tecnico ?? carregarTecnico();
      const z = escolherZonaPorAncora(vertices[0].leste, vertices[0].norte, hemisferio, anc, tec.fusosPermitidos ?? [22, 23, 24, 25]);
      if (z !== zona) { trocarZona(z); aviso(`Fuso ajustado para ${z}${hemisferio} pelo município.`); }
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
    let { leste, norte } = geoParaUtm(lat, lon, zona, hemisferio);
    if (snapAtivo) {
      const s = snapUtm(leste, norte, alvosSnap(id), { tolVerticeM: 2 });
      if (s.tipo) { leste = s.leste; norte = s.norte; const g = utmParaGeo(leste, norte, zona, hemisferio); lat = g.lat; lon = g.lon; }
    }
    setVertices((vs) => vs.map((v) => (v.id === id ? { ...v, lat, lon, leste, norte } : v)));
  }

  function apagarVertice(id: string) {
    setVertices((vs) => reordenar(vs.filter((v) => v.id !== id)));
    if (selecionadoId === id) setSelecionadoId(null);
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

  function inserirVertice(lat: number, lon: number) {
    let { leste, norte } = geoParaUtm(lat, lon, zona, hemisferio);
    if (snapAtivo) {
      const s = snapUtm(leste, norte, alvosSnap(), { tolVerticeM: 2 });
      if (s.tipo) { leste = s.leste; norte = s.norte; const g = utmParaGeo(leste, norte, zona, hemisferio); lat = g.lat; lon = g.lon; }
    }
    let out: Vertex[];
    if (vertices.length < 2) {
      out = reordenar([...vertices, novoVertice({ lat, lon, leste, norte, elevacao: 0 })]);
    } else {
      // acha o lado mais próximo (no plano UTM) e insere ali
      let melhor = 0, melhorD = Infinity;
      for (let i = 0; i < vertices.length; i++) {
        const a = vertices[i], b = vertices[(i + 1) % vertices.length];
        const d = distPontoSegmento(leste, norte, a.leste, a.norte, b.leste, b.norte);
        if (d < melhorD) { melhorD = d; melhor = i; }
      }
      const out2 = [...vertices];
      out2.splice(melhor + 1, 0, novoVertice({ lat, lon, leste, norte, elevacao: 0 }));
      out = reordenar(out2);
    }
    aplicarCodigos(out); // já atribui código para não deixar vértice sem código
  }

  async function renumerar() {
    await aplicarCodigos(vertices);
    aviso('Vértices renumerados.');
  }

  // Reordena o anel arrastando na lista e renumera (muda o polígono e os nomes).
  async function reordenarVertice(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= vertices.length || to >= vertices.length) return;
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
  function onCliqueDesenho(lat: number, lon: number) {
    const p = pontoLL(lat, lon);
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
      setDesenhoBuffer((buf) => [...buf, p]);
    }
  }
  function finalizarLinha() {
    if (desenhoBuffer.length >= 2) setObjetos((os) => [...os, novaPolilinha(desenhoBuffer)]);
    setDesenhoBuffer([]);
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
  function onMoverRotulo(id: string, lat: number, lon: number) {
    setConfrontantes((cs) => cs.map((c) => (c.id === id ? { ...c, posRotulo: { lat, lon } } : c)));
  }

  function alternarTipo(id: string) {
    setVertices((vs) => vs.map((v) => (v.id === id ? { ...v, tipo: v.tipo === 'M' ? 'P' : 'M', isDivisa: v.tipo !== 'M' } : v)));
  }

  function editarVertice(id: string, patch: Partial<Vertex>) {
    setVertices((vs) => vs.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }

  // Pintar divisa: aplica o tipo escolhido ao trecho que SAI do vértice clicado. Para marcar um
  // caminho, é só clicar os vértices em sequência ao longo dele.
  function pintarDivisa(id: string) {
    setVertices((vs) => vs.map((v) => (v.id === id ? { ...v, representacao: tipoDivisaPincel } : v)));
  }

  function detectarConfrontantes() {
    const { confrontantes: cs, confrontantePorLado: mapa } = montarConfrontantes(vertices);
    // preserva dados já preenchidos por nome
    setConfrontantes((old) => cs.map((c) => {
      const igual = old.find((o) => o.nome && o.nome.toUpperCase() === c.nome.toUpperCase());
      return igual ? { ...igual, id: c.id } : c;
    }));
    setConfrontantePorLado(mapa);
    aviso(`${cs.length} trechos de confrontante detectados.`);
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

  async function exportarMemorial() {
    if (!tecnico || vertices.length < 3) { aviso('Importe pontos primeiro.'); return; }
    try {
      const vs = await comCodigos();
      const r = calcular(vs, confrontantePorLado);
      const blob = await gerarMemorialDocx({ res: r, imovel, tecnico, confrontantes, confrontantePorLado, dataExtenso: dataPorExtenso() });
      const sufixo = glebas.length > 1 ? ` - ${glebaAtivaNome}` : '';
      saveAs(blob, `Memorial - ${imovel.denominacao || nomeProjeto || 'imovel'}${sufixo}.docx`);
    } catch (e) { aviso((e as Error).message || 'Erro ao gerar o memorial.'); }
  }

  async function exportarOds() {
    if (!tecnico || vertices.length < 3) { aviso('Importe pontos primeiro.'); return; }
    const tec = tecnico;
    try {
      const tpl = await fetch('/templates/sigef.ods').then((rr) => rr.arrayBuffer());
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
    } catch (e) { aviso((e as Error).message || 'Erro ao gerar a planilha.'); }
    finally { setProcessando(false); }
  }

  async function exportarPlanta() {
    if (vertices.length < 3) { aviso('Importe pontos primeiro.'); return; }
    await comCodigos();
    setVista('planta');
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
    aviso(url ? 'Planta de situação gerada.' : 'Não consegui carregar o satélite (rede/CORS).');
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

  async function importarDxfArquivo(file: File) {
    if (processando) return;
    setProcessando(true);
    try {
      const texto = await file.text();
      let anel = anelDeDxf(importarDxf(texto));
      if (!anel || anel.length < 3) { aviso('Não encontrei uma poligonal fechada no DXF.'); return; }
      // remove ponto de fechamento duplicado, se houver
      const f = anel[0], l = anel[anel.length - 1];
      if (Math.hypot(f.x - l.x, f.y - l.y) < 0.01) anel = anel.slice(0, -1);
      const tec = tecnico ?? carregarTecnico();
      const cont = await lerContadores(tec.credenciamentoIncra, tec).catch(() => semente(tec.credenciamentoIncra, tec));
      let vs: Vertex[] = anel.map((p) => {
        const { lat, lon } = utmParaGeo(p.x, p.y, zona, hemisferio);
        return { ...novoVertice({ lat, lon, leste: p.x, norte: p.y, elevacao: 0 }), metodo: tec.metodoPosicionamento, tipoLimite: tec.tipoLimite, representacao: 'linha-ideal' };
      });
      vs = atribuirProvisorio(reordenar(vs), cont);
      const { confrontantes: cs, confrontantePorLado: mapa } = montarConfrontantes(vs);
      const alvoId = glebaAtivaId;
      setGlebas((prev) => prev.map((g) => (g.id === alvoId ? { ...g, vertices: vs, confrontantes: cs, confrontantePorLado: mapa } : g)));
      setVertices(vs); setConfrontantes(cs); setConfrontantePorLado(mapa);
      aviso(`${vs.length} vértices importados do DXF na ${glebaAtivaNome} (fuso ${zona}${hemisferio}).`);
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
        imovel, glebas: gs, zonaUtm: zona, hemisferio, requerente, transmitente, plantaConfig,
      };
      await salvarProjeto(p);
      setProjetoId(id);
      aviso(registrou ? 'Projeto salvo e pontos registrados.' : 'Projeto salvo, mas falhou registrar os pontos — tente salvar de novo.');
      atualizarLista();
    } finally { setProcessando(false); }
  }
  async function salvarPropCadastro() {
    if (!imovel.proprietario) { aviso('Preencha o proprietário primeiro.'); return; }
    await cadProp.salvar({ id: '', nome: imovel.proprietario, cpf: imovel.cpfProprietario, tipoPessoa: imovel.tipoPessoa });
    cadProp.listar().then(setSugProp).catch(() => {});
    aviso('Proprietário salvo no cadastro.');
  }
  async function salvarConfCadastro(c: Confrontante) {
    if (!c.nome) { aviso('Preencha o nome do confrontante.'); return; }
    await cadConf.salvar({
      id: '', nome: c.nome, cpf: c.cpf, matricula: c.matricula, cns: c.cns, descricaoExtra: c.descricaoExtra,
      condicao: c.condicao, conjugeNome: c.conjugeNome, conjugeCpf: c.conjugeCpf,
      inventarianteNome: c.inventarianteNome, inventarianteCpf: c.inventarianteCpf,
    });
    cadConf.listar().then(setSugConf).catch(() => {});
    aviso('Confrontante salvo no cadastro.');
  }
  async function atualizarLista() { setProjetos(await listarProjetos()); totalPontosRegistrados().then(setTotalPontos).catch(() => {}); }
  async function abrir(id: string) {
    const p0 = await carregarProjeto(id);
    if (!p0) return;
    const p = migrarProjeto(p0); // projetos antigos (sem glebas) viram glebas[0]
    setProjetoId(p.id); setNomeProjeto(p.nome); setImovel(p.imovel);
    setZona(p.zonaUtm); setHemisferio(p.hemisferio);
    setRequerente(p.requerente); setTransmitente(p.transmitente);
    setPlantaConfig(p.plantaConfig ?? {});
    setGlebas(p.glebas);
    carregarGleba(p.glebas[0]);
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

  // rótulos de confrontante arrastáveis no mapa (posRotulo manual ou centróide dos lados)
  const rotulosConf: RotuloMapa[] = useMemo(() => {
    const out: RotuloMapa[] = [];
    for (const c of confrontantes) {
      if (!c.nome) continue;
      if (c.posRotulo) { out.push({ id: c.id, lat: c.posRotulo.lat, lon: c.posRotulo.lon, texto: c.nome }); continue; }
      const idxs = Object.entries(confrontantePorLado).filter(([, cid]) => cid === c.id).map(([i]) => Number(i));
      if (!idxs.length || vertices.length < 2) continue;
      const mid = idxs[Math.floor(idxs.length / 2)];
      const a = vertices[mid], b = vertices[(mid + 1) % vertices.length];
      if (!a || !b) continue;
      out.push({ id: c.id, lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2, texto: c.nome });
    }
    return out;
  }, [confrontantes, confrontantePorLado, vertices]);
  const objSel = objetos.find((o) => o.id === objetoSelId) ?? null;

  return (
    <div className="flex h-screen flex-col">
      {/* Topo */}
      <header className="no-print flex items-center gap-1.5 border-b px-3 py-2">
        <input ref={fileRef} type="file" accept=".txt,.csv" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importarArquivo(f); e.currentTarget.value = ''; }} />
        <input ref={dxfRef} type="file" accept=".dxf" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importarDxfArquivo(f); e.currentTarget.value = ''; }} />
        <input ref={geojsonRef} type="file" accept=".geojson,.json" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importarReferenciaGeoJson(f); e.currentTarget.value = ''; }} />
        <Button size="sm" variant="outline" className={COR_IMPORT} disabled={processando} title="Importar pontos de um arquivo TXT" onClick={() => fileRef.current?.click()}><Upload /> TXT</Button>
        <Button size="sm" variant="outline" className={COR_IMPORT} disabled={processando} title="Importar desenho de um arquivo DXF" onClick={() => dxfRef.current?.click()}><Upload /> DXF</Button>
        <div className="mx-1 h-6 w-px bg-border" />
        <Button size="sm" variant="outline" className={COR_PECA} title="Gerar o memorial descritivo (.docx)" onClick={exportarMemorial}><FileText /> Memorial</Button>
        <Button size="sm" variant="outline" className={COR_PECA} title="Gerar a planilha SIGEF (.ods)" onClick={exportarOds}><Download /> ODS</Button>
        <Button size="sm" variant="outline" className={COR_PECA} title="Exportar o desenho em DXF (georreferenciado)" onClick={exportarDxf}><PenTool /> DXF</Button>
        <Button size="sm" variant="outline" className={COR_PECA} title="Gerar o requerimento ao cartório (.docx)" onClick={() => setReqAberto(true)}><FileSignature /> Requerimento</Button>
        <Button size="sm" variant="outline" className={COR_PECA} title="Gerar os dados do TRT" onClick={() => setTrtAberto(true)}><FileText /> TRT</Button>
        <div className="mx-1 h-6 w-px bg-border" />
        <Button size="sm" variant="outline" className={COR_PLANTA} title={vista === 'mapa' ? 'Abrir a prévia da planta' : 'Voltar ao mapa'} onClick={() => setVista(vista === 'mapa' ? 'planta' : 'mapa')}>
          {vista === 'mapa' ? <><Eye /> Planta</> : <><MapIcon /> Mapa</>}
        </Button>
        <div className="ml-auto flex items-center gap-2">
          {msg && <span className="text-xs text-primary">{msg}</span>}
          <Button size="sm" variant="ghost" disabled={processando} title="Salvar o projeto" onClick={salvar}><Save /> Salvar</Button>
          <Button size="sm" variant="ghost" onClick={() => setTema((t) => (t === 'claro' ? 'escuro' : 'claro'))} title="Tema claro/escuro">{tema === 'claro' ? <Moon /> : <Sun />}</Button>
          <AuthBar onMudou={() => { atualizarLista(); }} />
          <Link href="/cadastros"><Button size="sm" variant="ghost" title="Dados de proprietários, confrontantes, imóveis e cartórios"><BookUser /> Dados</Button></Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Área principal: mapa ou planta */}
        <main className="relative min-w-0 flex-1">
          {vista === 'mapa' ? (
            <>
              <div className="no-print absolute left-3 top-3 z-[1000] flex gap-1 rounded-md border bg-background/95 p-1 shadow">
                <Button size="sm" variant={modo === 'navegar' ? 'default' : 'ghost'} onClick={() => setModo('navegar')} title="Navegar e mover"><MousePointer2 /></Button>
                <Button size="sm" variant={modo === 'inserir' ? 'default' : 'ghost'} onClick={() => setModo('inserir')} title="Inserir vértice"><Plus /></Button>
                <Button size="sm" variant={modo === 'apagar' ? 'default' : 'ghost'} onClick={() => setModo('apagar')} title="Apagar vértice"><Trash2 /></Button>
                <div className="mx-1 w-px bg-border" />
                <Button size="sm" variant="ghost" onClick={() => setVertices((vs) => inverterSentido(vs))} title="Inverter sentido"><RotateCcw /></Button>
                <Button size="sm" variant="ghost" disabled={!selecionadoId} onClick={() => selecionadoId && setVertices((vs) => definirInicio(vs, selecionadoId))} title="Definir início no vértice selecionado"><Flag /></Button>
                <Button size="sm" variant="ghost" onClick={renumerar} title="Renumerar vértices"><Crosshair /></Button>
                <Button size="sm" variant="ghost" onClick={() => setMostrarRotulos((m) => !m)} title={mostrarRotulos ? 'Esconder nomes' : 'Mostrar nomes'}>{mostrarRotulos ? <EyeOff /> : <Eye />}</Button>
                <Button size="sm" variant={snapAtivo ? 'default' : 'ghost'} onClick={() => setSnapAtivo((s) => !s)} title="Snap: encaixar em vértices existentes"><Magnet /></Button>
                <Button size="sm" variant={bloqueado ? 'default' : 'ghost'} onClick={() => setBloqueado((b) => !b)} title={bloqueado ? 'Vértices travados (clique para liberar a edição)' : 'Vértices liberados — cuidado para não mover sem querer'}>{bloqueado ? <Lock /> : <LockOpen />}</Button>
                <div className="mx-1 w-px bg-border" />
                <Button size="sm" variant={modo === 'divisa' ? 'default' : 'ghost'} onClick={() => setModo(modo === 'divisa' ? 'navegar' : 'divisa')} title="Pintar divisa: escolha o tipo e clique os vértices ao longo do caminho"><Brush /></Button>
                {modo === 'divisa' && (
                  <select className="h-8 rounded border border-input bg-background px-1 text-xs" value={tipoDivisaPincel} onChange={(e) => setTipoDivisaPincel(e.target.value)} title="Tipo de divisa a pintar">
                    {REPRESENTACOES.map((r) => <option key={r} value={r}>{REPRES_LABEL[r] || r}</option>)}
                  </select>
                )}
                <div className="mx-1 w-px bg-border" />
                <Button size="sm" variant={modo === 'linha' ? 'default' : 'ghost'} onClick={() => { setModo('linha'); setDesenhoBuffer([]); }} title="Desenhar linha/polilinha (clique os pontos, depois Finalizar)"><PenTool /></Button>
                <Button size="sm" variant={modo === 'cota' ? 'default' : 'ghost'} onClick={() => { setModo('cota'); setDesenhoBuffer([]); }} title="Cotar: clique dois pontos"><RotateCcw className="rotate-90" /></Button>
                <Button size="sm" variant={modo === 'texto' ? 'default' : 'ghost'} onClick={() => setModo('texto')} title="Texto: clique para inserir"><FileText /></Button>
                {modo === 'linha' && desenhoBuffer.length >= 2 && <Button size="sm" variant="secondary" onClick={finalizarLinha}>Finalizar</Button>}
                {objSel?.tipo === 'texto' && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => editarObjetoSel({ tamanho: Math.max(6, (objSel.tamanho ?? 12) - 2) })} title="Diminuir">A-</Button>
                    <Button size="sm" variant="ghost" onClick={() => editarObjetoSel({ tamanho: (objSel.tamanho ?? 12) + 2 })} title="Aumentar">A+</Button>
                    <Button size="sm" variant="ghost" onClick={() => { const t = window.prompt('Texto:', objSel.texto ?? ''); if (t != null) editarObjetoSel({ texto: t }); }} title="Editar texto"><Pencil /></Button>
                  </>
                )}
                {objSel?.tipo === 'polilinha' && (
                  <Button size="sm" variant={objSel.preenchido ? 'default' : 'ghost'} onClick={() => editarObjetoSel({ preenchido: !objSel.preenchido })} title="Preencher (ex.: lago)">Preencher</Button>
                )}
                {objetoSelId && <Button size="sm" variant="ghost" onClick={apagarObjetoSel} title="Apagar objeto selecionado"><Trash2 className="text-destructive" /></Button>}
                <div className="mx-1 w-px bg-border" />
                <Button size="sm" variant="ghost" onClick={() => geojsonRef.current?.click()} title="Ref. SIGEF: importar confrontante certificado (GeoJSON do SIGEF/QGIS)"><Upload /></Button>
              </div>
              <MapEditor vertices={vertices} selecionadoId={selecionadoId} modo={modo} mostrarRotulos={mostrarRotulos} bloqueado={bloqueado}
                referencias={referencias.map((anel) => anel.map((p) => [p.lat, p.lon] as [number, number]))}
                outrasGlebas={glebas.filter((g) => g.id !== glebaAtivaId).map((g) => g.vertices.filter((v) => Number.isFinite(v.lat)).map((v) => [v.lat, v.lon] as [number, number]))}
                objetos={objetos} desenhoAtual={desenhoBuffer.map((p) => [p.lat, p.lon] as [number, number])} rotulos={rotulosConf} objetoSelId={objetoSelId}
                onMover={moverVertice} onSelecionar={setSelecionadoId} onApagar={apagarVertice} onInserir={inserirVertice}
                onCliqueDesenho={onCliqueDesenho} onSelecObjeto={setObjetoSelId} onMoverPontoObjeto={onMoverPontoObjeto} onMoverRotulo={onMoverRotulo} onPintarDivisa={pintarDivisa} />
            </>
          ) : (
            <div id="planta-print" className="relative h-full overflow-auto bg-neutral-200 p-4">
              <div className="no-print absolute right-4 top-4 z-10 flex gap-1">
                <Button size="sm" variant="default" title="Baixar a planta em PDF (A3)" onClick={exportarPlanta}><Download /> Baixar PDF</Button>
                <Button size="sm" variant="secondary" title="Gerar a planta de situação (recorte de satélite)" onClick={gerarSituacaoPlanta}><MapIcon /> Gerar situação</Button>
                {situacaoUrl && <Button size="sm" variant="ghost" title="Remover a planta de situação" onClick={() => setSituacaoUrl(undefined)}>Remover</Button>}
              </div>
              {res && tecnico && escritorio && (
                <div className="mx-auto max-w-[1587px] bg-white shadow">
                  <Planta vertices={vertices} res={res} imovel={imovel} tecnico={tecnico} escritorio={escritorio}
                    confrontantes={confrontantes} confrontantePorLado={confrontantePorLado} zona={zona} hemisferio={hemisferio}
                    glebaNome={glebas.length > 1 ? glebaAtivaNome : undefined} dataExtenso={dataPorExtenso()} situacaoUrl={situacaoUrl} objetos={objetos} config={plantaConfig}
                    outrasGlebas={glebas.filter((g) => g.id !== glebaAtivaId).map((g) => ({ nome: g.denominacao, pts: g.vertices.map((v) => ({ leste: v.leste, norte: v.norte })) }))} />
                </div>
              )}
            </div>
          )}
        </main>

        {/* Painel direito */}
        <aside className="no-print flex w-[380px] shrink-0 flex-col border-l">
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
          {/* resumo */}
          <div className="grid grid-cols-3 gap-2 border-b p-3 text-center">
            <div><div className="text-[10px] uppercase text-muted-foreground">Área SGL</div><div className="font-semibold">{res ? `${numBR(res.areaHa, 4)} ha` : '—'}</div></div>
            <div><div className="text-[10px] uppercase text-muted-foreground">Perímetro</div><div className="font-semibold">{res ? `${numBR(res.perimetro)} m` : '—'}</div></div>
            <div><div className="text-[10px] uppercase text-muted-foreground">Vértices</div><div className="font-semibold">{vertices.length}</div></div>
          </div>

          {/* abas */}
          <div className="flex border-b text-xs">
            {(['imovel', 'vertices', 'confrontantes', 'planta', 'conferencia', 'projetos'] as Aba[]).map((a) => (
              <button key={a} onClick={() => setAba(a)}
                className={`flex-1 px-1 py-2 ${aba === a ? 'border-b-2 border-primary font-medium text-primary' : 'text-muted-foreground'}`}>
                {a === 'imovel' ? 'Imóvel' : a === 'vertices' ? 'Vértices' : a === 'confrontantes' ? 'Confront.' : a === 'planta' ? 'Planta' : a === 'conferencia' ? 'Conferir' : 'Projetos'}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-3">
            <datalist id="lista-cns">{sugCns.map((c) => <option key={c} value={c} />)}</datalist>
            {aba === 'imovel' && <PainelImovel imovel={imovel} onChange={setImovel} onMunicipio={aoMudarMunicipio} nome={nomeProjeto} onNome={setNomeProjeto} zona={zona} hemisferio={hemisferio} onZona={trocarZona} onHemisferio={setHemisferio} sugProp={sugProp} onSalvarProp={salvarPropCadastro} />}
            {aba === 'vertices' && (
              <div className="space-y-1">
                <div className="mb-2 flex gap-1">
                  <Button size="sm" variant="outline" onClick={renumerar}>Renumerar</Button>
                  <Button size="sm" variant="outline" onClick={() => setVertices((vs) => inverterSentido(vs))}>Inverter</Button>
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
                      onClick={() => setSelecionadoId(v.id)}>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-semibold">{v.codigoSigef || '(sem código)'}</span>
                        <span className="flex gap-1">
                          <button className="rounded bg-secondary px-1" onClick={(e) => { e.stopPropagation(); alternarTipo(v.id); }} title="Alternar M/P">{v.tipo}</button>
                          <button className="rounded bg-destructive px-1 text-destructive-foreground" onClick={(e) => { e.stopPropagation(); apagarVertice(v.id); }}>×</button>
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
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {aba === 'confrontantes' && (
              <PainelConfrontantes confrontantes={confrontantes} onChange={setConfrontantes} onDetectar={detectarConfrontantes} mapa={confrontantePorLado} lados={lados} sugConf={sugConf} onSalvarCadastro={salvarConfCadastro} />
            )}
            {aba === 'planta' && (
              <PainelPlanta config={plantaConfig} onChange={setPlantaConfig} temSituacao={!!situacaoUrl} temLogo={!!escritorio?.logoDataUrl} onVerPlanta={() => setVista('planta')} />
            )}
            {aba === 'conferencia' && (
              <PainelConferencia vertices={vertices} res={res} imovel={imovel} confrontantes={confrontantes} onChange={setImovel} />
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
                    <div><div className="font-medium">{p.nome}</div><div className="text-muted-foreground">{contarVertices(p)} vértices{(p.glebas?.length ?? 0) > 1 ? ` · ${p.glebas!.length} glebas` : ''}</div></div>
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

      <RequerimentoModal
        open={reqAberto} onOpenChange={setReqAberto}
        imovel={imovel} onChangeImovel={setImovel}
        tecnico={tecnico} areaRealHa={res ? valoresEfetivos(res, imovel).areaHa : 0}
        requerente={requerente} transmitente={transmitente}
        onChangePessoas={(r, t) => { setRequerente(r); setTransmitente(t); }}
        sugProp={sugProp}
      />
      <TrtModal open={trtAberto} onOpenChange={setTrtAberto} imovel={imovel} tecnico={tecnico}
        areaHa={res ? valoresEfetivos(res, imovel).areaHa : 0} perimetro={res ? valoresEfetivos(res, imovel).perimetro : 0} />

      {/* Configurações: engrenagem flutuante no canto inferior esquerdo */}
      <Link href="/configuracoes" title="Configurações"
        className="no-print fixed bottom-3 left-3 z-[1100] flex size-10 items-center justify-center rounded-full border bg-background/95 text-muted-foreground shadow-md hover:text-foreground [&_svg]:size-5">
        <Settings />
      </Link>
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
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input list={list} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function PainelImovel({ imovel, onChange, onMunicipio, nome, onNome, zona, hemisferio, onZona, onHemisferio, sugProp, onSalvarProp }: {
  imovel: ImovelData; onChange: (i: ImovelData) => void; onMunicipio: (s: string) => void;
  nome: string; onNome: (s: string) => void;
  zona: number; hemisferio: 'N' | 'S'; onZona: (z: number) => void; onHemisferio: (h: 'N' | 'S') => void;
  sugProp: ProprietarioCad[]; onSalvarProp: () => void;
}) {
  const set = (k: keyof ImovelData, v: string) => onChange({ ...imovel, [k]: v });
  function setProprietario(v: string) {
    const m = sugProp.find((p) => p.nome === v);
    onChange(m ? { ...imovel, proprietario: v, cpfProprietario: m.cpf, tipoPessoa: m.tipoPessoa } : { ...imovel, proprietario: v });
  }
  return (
    <div className="space-y-3">
      <Campo label="Nome do projeto" value={nome} onChange={onNome} />
      <Campo label="Denominação do imóvel" value={imovel.denominacao} onChange={(v) => set('denominacao', v)} placeholder="Fazenda..." />
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Matrícula" value={imovel.matricula} onChange={(v) => set('matricula', v)} />
        <Campo label="Cartório (CNS)" value={imovel.cns} onChange={(v) => set('cns', v)} list="lista-cns" />
      </div>
      <Campo label="Código do Imóvel (SNCR/INCRA)" value={imovel.codigoImovelIncra} onChange={(v) => set('codigoImovelIncra', v)} />
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label>Proprietário</Label>
          <button className="text-[10px] text-primary hover:underline" onClick={onSalvarProp}>salvar no cadastro</button>
        </div>
        <Input list="lista-proprietarios" value={imovel.proprietario} onChange={(e) => setProprietario(e.target.value)} />
        <datalist id="lista-proprietarios">
          {sugProp.map((p) => <option key={p.id} value={p.nome} />)}
        </datalist>
      </div>
      <Campo label="CPF/CNPJ do proprietário" value={imovel.cpfProprietario} onChange={(v) => set('cpfProprietario', v)} />
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Cônjuge do proprietário" value={imovel.conjugeProprietario ?? ''} onChange={(v) => set('conjugeProprietario', v)} />
        <Campo label="CPF do cônjuge" value={imovel.cpfConjugeProprietario ?? ''} onChange={(v) => set('cpfConjugeProprietario', v)} />
      </div>
      <Campo label="Município" value={imovel.municipio} onChange={onMunicipio} placeholder="Espera Feliz-MG" />
      <Campo label="Local (memorial)" value={imovel.local} onChange={(v) => set('local', v)} placeholder="Córrego ..., Cidade-UF" />
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>Fuso UTM</Label>
          <Input type="number" value={zona} onChange={(e) => onZona(Number(e.target.value))} />
        </div>
        <div className="space-y-1">
          <Label>Hemisfério</Label>
          <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={hemisferio} onChange={(e) => onHemisferio(e.target.value as 'N' | 'S')}>
            <option value="S">Sul</option>
            <option value="N">Norte</option>
          </select>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">O fuso não é detectável só pelo TXT. Informe o município que o sistema acerta o fuso (23/24) e confirma no mapa.</p>
    </div>
  );
}

function PainelConferencia({ vertices, res, imovel, confrontantes, onChange }: {
  vertices: Vertex[]; res: ReturnType<typeof calcular> | null; imovel: ImovelData; confrontantes: Confrontante[]; onChange: (i: ImovelData) => void;
}) {
  const problemas: Problema[] = conferir(vertices, res, imovel, confrontantes);
  const Icone = ({ n }: { n: Problema['nivel'] }) =>
    n === 'erro' ? <XCircle className="text-destructive" /> : n === 'aviso' ? <AlertTriangle className="text-amber-500" /> : <CheckCircle2 className="text-primary" />;
  const ef = res ? valoresEfetivos(res, imovel) : null;
  const num = (v: number | undefined) => (v == null ? '' : String(v));
  return (
    <div className="space-y-3">
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

function PainelConfrontantes({ confrontantes, onChange, onDetectar, mapa, lados, sugConf, onSalvarCadastro }: {
  confrontantes: Confrontante[]; onChange: (c: Confrontante[]) => void; onDetectar: () => void;
  mapa: Record<number, string>; lados: { de: Vertex; para: Vertex }[];
  sugConf: ConfrontanteCad[]; onSalvarCadastro: (c: Confrontante) => void;
}) {
  const set = (id: string, k: keyof Confrontante, v: string) =>
    onChange(confrontantes.map((c) => (c.id === id ? ({ ...c, [k]: v } as Confrontante) : c)));
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
      <Button size="sm" variant="outline" className="w-full" onClick={onDetectar}>Detectar trechos pelas divisas</Button>
      {confrontantes.length === 0 && <p className="text-xs text-muted-foreground">Importe pontos e detecte os trechos.</p>}
      <datalist id="lista-confrontantes">
        {sugConf.map((s) => <option key={s.id} value={s.nome} />)}
      </datalist>
      {confrontantes.map((c) => {
        const idxs = ladosDe(c.id);
        return (
          <Card key={c.id}>
            <CardContent className="space-y-2 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
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
                  value={c.condicao ?? 'proprietario'} onChange={(e) => set(c.id, 'condicao', e.target.value)}>
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
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function PainelPlanta({ config, onChange, temSituacao, temLogo, onVerPlanta }: {
  config: PlantaConfig; onChange: (c: PlantaConfig) => void; temSituacao: boolean; temLogo: boolean; onVerPlanta: () => void;
}) {
  const set = (patch: Partial<PlantaConfig>) => onChange({ ...config, ...patch });
  type BoolKey = 'mostrarGrade' | 'mostrarNortes' | 'mostrarConvencoes' | 'mostrarEscalaGrafica' | 'mostrarSituacao';
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
      <Campo label="Título" value={config.titulo ?? ''} onChange={(v) => set({ titulo: v })} placeholder="Levantamento Planimétrico Georreferenciado" />
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Folha" value={config.folha ?? ''} onChange={(v) => set({ folha: v })} placeholder="Única" />
        <div className="space-y-1">
          <Label>Escala (1 : …)</Label>
          <Input type="number" placeholder="automática" value={config.escalaManual ? String(config.escalaManual) : ''}
            onChange={(e) => set({ escalaManual: e.target.value ? Number(e.target.value) : undefined })} />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Tamanho da fonte dos rótulos</Label>
        <Input type="number" step="0.5" placeholder="8.5" value={config.fonteRotulos ? String(config.fonteRotulos) : ''}
          onChange={(e) => set({ fonteRotulos: e.target.value ? Number(e.target.value) : undefined })} />
      </div>
      <div className="space-y-1 rounded border p-2">
        <div className="text-[10px] uppercase text-muted-foreground">Mostrar na planta</div>
        {chk('Grade de coordenadas', 'mostrarGrade')}
        {chk('Nortes (rosa dos ventos)', 'mostrarNortes')}
        {chk('Convenções (legenda)', 'mostrarConvencoes')}
        {chk('Escala gráfica', 'mostrarEscalaGrafica')}
        {chk('Planta de situação', 'mostrarSituacao')}
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
  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}
