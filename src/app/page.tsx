'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { saveAs } from 'file-saver';
import {
  Upload, FileText, Sheet, Map as MapIcon, Printer, Settings, Plus, Trash2,
  RotateCcw, Flag, Save, FolderOpen, MousePointer2, Crosshair,
  CheckCircle2, AlertTriangle, XCircle, Database, BookUser, Eye, EyeOff,
  Moon, Sun, Pencil, FileSignature, PenTool,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Planta from '@/components/Planta';
import RequerimentoModal from '@/components/RequerimentoModal';
import type { ModoEdicao } from '@/components/MapEditor';
import type { Vertex, ImovelData, Confrontante, TecnicoData, EscritorioData, Projeto, ProprietarioCad, ConfrontanteCad, Gleba, PessoaQualificada } from '@/lib/topo/types';
import { parseTxt, pontosDePerimetro } from '@/lib/topo/parseTxt';
import { montarVertices, reordenar, inverterSentido, definirInicio, novoVertice, reprojetar } from '@/lib/topo/vertices';
import { montarConfrontantes } from '@/lib/topo/confrontantes';
import { novaGlebaVazia, glebaDe, migrarProjeto } from '@/lib/topo/glebas';
import { calcular } from '@/lib/topo/calcular';
import { detectarZona, escolherZonaPorAncora, geoParaUtm, utmParaGeo } from '@/lib/topo/coords';
import { exportarDxf as gerarDxf, importarDxf, anelDeDxf } from '@/lib/io/dxf';
import { ancoraMunicipio } from '@/lib/topo/municipios';
import { atribuirProvisorio, semente } from '@/lib/topo/registroCore';
import { conferir, valoresEfetivos, type Problema } from '@/lib/topo/conferencia';
import { TIPOS_VERTICE, TIPOS_LIMITE, METODOS_POSICIONAMENTO, REPRESENTACOES } from '@/lib/topo/sigefVocab';
import { numBR, azimuteDMS } from '@/lib/topo/geometry';
import { carregarTecnico, carregarEscritorio } from '@/lib/store/settings';
import { salvarProjeto, listarProjetos, carregarProjeto, excluirProjeto, novoId } from '@/lib/store/projects';
import { lerContadores, registrarPontos, totalPontosRegistrados } from '@/lib/store/registro';
import { proprietarios as cadProp, confrontantesCad as cadConf, cartoriosCad as cadCart } from '@/lib/store/cadastros';
import { gerarMemorialDocx } from '@/lib/export/memorial';
import { gerarSigefOds } from '@/lib/export/sigefOds';

const MapEditor = dynamic(() => import('@/components/MapEditor'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Carregando mapa…</div>,
});

const IMOVEL_VAZIO: ImovelData = {
  denominacao: '', matricula: '', cns: '', codigoImovelIncra: '', proprietario: '',
  cpfProprietario: '', tipoPessoa: 'Física', municipio: '', local: '',
  naturezaServico: 'Particular', situacao: 'Imóvel Registrado', naturezaArea: 'Particular',
};

type Aba = 'imovel' | 'vertices' | 'confrontantes' | 'conferencia' | 'projetos';

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
  const [tema, setTema] = useState<'claro' | 'escuro'>('claro');
  const [vista, setVista] = useState<'mapa' | 'planta'>('mapa');
  const [aba, setAba] = useState<Aba>('imovel');
  const [projetoId, setProjetoId] = useState<string | null>(null);
  const [nomeProjeto, setNomeProjeto] = useState('');
  const [reqAberto, setReqAberto] = useState(false);
  const [requerente, setRequerente] = useState<PessoaQualificada | undefined>(undefined);
  const [transmitente, setTransmitente] = useState<PessoaQualificada | undefined>(undefined);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [sugProp, setSugProp] = useState<ProprietarioCad[]>([]);
  const [sugConf, setSugConf] = useState<ConfrontanteCad[]>([]);
  const [sugCns, setSugCns] = useState<string[]>([]);
  const [totalPontos, setTotalPontos] = useState(0);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const dxfRef = useRef<HTMLInputElement>(null);

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
      return [glebaDe(1, vertices, confrontantes, confrontantePorLado, 'Parcela 1')];
    }
    if (!glebas.some((g) => g.id === glebaAtivaId)) {
      return glebas.map((g, i) => (i === 0 ? { ...g, vertices, confrontantes, confrontantePorLado } : g));
    }
    return glebas.map((g) => (g.id === glebaAtivaId ? { ...g, vertices, confrontantes, confrontantePorLado } : g));
  }
  function carregarGleba(g: Gleba) {
    setVertices(g.vertices);
    setConfrontantes(g.confrontantes);
    setConfrontantePorLado(g.confrontantePorLado);
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

  function moverVertice(id: string, lat: number, lon: number) {
    const { leste, norte } = geoParaUtm(lat, lon, zona, hemisferio);
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
    setVertices(atribuirProvisorio(lista, cont));
  }

  function inserirVertice(lat: number, lon: number) {
    const { leste, norte } = geoParaUtm(lat, lon, zona, hemisferio);
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

  function alternarTipo(id: string) {
    setVertices((vs) => vs.map((v) => (v.id === id ? { ...v, tipo: v.tipo === 'M' ? 'P' : 'M', isDivisa: v.tipo !== 'M' } : v)));
  }

  function editarVertice(id: string, patch: Partial<Vertex>) {
    setVertices((vs) => vs.map((v) => (v.id === id ? { ...v, ...patch } : v)));
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
    try {
      const vs = await comCodigos();
      const r = calcular(vs, confrontantePorLado);
      const tpl = await fetch('/templates/sigef.ods').then((rr) => rr.arrayBuffer());
      const blob = await gerarSigefOds({ templateBytes: tpl, res: r, imovel, tecnico, confrontantes, confrontantePorLado });
      const sufixo = glebas.length > 1 ? ` - ${glebaAtivaNome}` : '';
      saveAs(blob, `SIGEF - ${imovel.denominacao || nomeProjeto || 'imovel'}${sufixo}.ods`);
    } catch (e) { aviso((e as Error).message || 'Erro ao gerar a planilha.'); }
  }

  async function exportarPlanta() {
    if (vertices.length < 3) { aviso('Importe pontos primeiro.'); return; }
    await comCodigos();
    setVista('planta');
    setTimeout(() => window.print(), 300);
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
        imovel, glebas: gs, zonaUtm: zona, hemisferio, requerente, transmitente,
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
    await cadConf.salvar({ id: '', nome: c.nome, cpf: c.cpf, matricula: c.matricula, cns: c.cns, descricaoExtra: c.descricaoExtra });
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

  return (
    <div className="flex h-screen flex-col">
      {/* Topo */}
      <header className="no-print flex items-center gap-2 border-b px-3 py-2">
        <span className="mr-2 text-lg font-semibold tracking-tight">Métrica</span>
        <input ref={fileRef} type="file" accept=".txt,.csv" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importarArquivo(f); e.currentTarget.value = ''; }} />
        <input ref={dxfRef} type="file" accept=".dxf" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importarDxfArquivo(f); e.currentTarget.value = ''; }} />
        <Button size="sm" variant="secondary" disabled={processando} onClick={() => fileRef.current?.click()}><Upload /> Importar TXT</Button>
        <Button size="sm" variant="secondary" disabled={processando} onClick={() => dxfRef.current?.click()}><Upload /> Importar DXF</Button>
        <div className="mx-1 h-6 w-px bg-border" />
        <Button size="sm" variant="outline" onClick={exportarMemorial}><FileText /> Memorial</Button>
        <Button size="sm" variant="outline" onClick={exportarOds}><Sheet /> Planilha SIGEF</Button>
        <Button size="sm" variant="outline" onClick={exportarPlanta}><Printer /> Planta</Button>
        <Button size="sm" variant="outline" onClick={exportarDxf}><PenTool /> DXF</Button>
        <Button size="sm" variant="outline" onClick={() => setReqAberto(true)}><FileSignature /> Requerimento</Button>
        <div className="mx-1 h-6 w-px bg-border" />
        <Button size="sm" variant="ghost" onClick={() => setVista(vista === 'mapa' ? 'planta' : 'mapa')}>
          {vista === 'mapa' ? <><FileText /> Ver planta</> : <><MapIcon /> Ver mapa</>}
        </Button>
        <div className="ml-auto flex items-center gap-2">
          {msg && <span className="text-xs text-primary">{msg}</span>}
          <Button size="sm" variant="ghost" disabled={processando} onClick={salvar}><Save /> Salvar</Button>
          <Button size="sm" variant="ghost" onClick={() => setTema((t) => (t === 'claro' ? 'escuro' : 'claro'))} title="Tema claro/escuro">{tema === 'claro' ? <Moon /> : <Sun />}</Button>
          <Link href="/cadastros"><Button size="sm" variant="ghost"><BookUser /> Cadastros</Button></Link>
          <Link href="/configuracoes"><Button size="sm" variant="ghost"><Settings /> Config</Button></Link>
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
              </div>
              <MapEditor vertices={vertices} selecionadoId={selecionadoId} modo={modo} mostrarRotulos={mostrarRotulos}
                onMover={moverVertice} onSelecionar={setSelecionadoId} onApagar={apagarVertice} onInserir={inserirVertice} />
            </>
          ) : (
            <div id="planta-print" className="h-full overflow-auto bg-neutral-200 p-4">
              {res && tecnico && escritorio && (
                <div className="mx-auto max-w-[1587px] bg-white shadow">
                  <Planta vertices={vertices} res={res} imovel={imovel} tecnico={tecnico} escritorio={escritorio}
                    confrontantes={confrontantes} confrontantePorLado={confrontantePorLado} zona={zona} hemisferio={hemisferio}
                    glebaNome={glebas.length > 1 ? glebaAtivaNome : undefined} dataExtenso={dataPorExtenso()} />
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
            {(['imovel', 'vertices', 'confrontantes', 'conferencia', 'projetos'] as Aba[]).map((a) => (
              <button key={a} onClick={() => setAba(a)}
                className={`flex-1 px-1 py-2 ${aba === a ? 'border-b-2 border-primary font-medium text-primary' : 'text-muted-foreground'}`}>
                {a === 'imovel' ? 'Imóvel' : a === 'vertices' ? 'Vértices' : a === 'confrontantes' ? 'Confront.' : a === 'conferencia' ? 'Conferir' : 'Projetos'}
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
                {vertices.map((v, i) => {
                  const l = lados[i];
                  return (
                    <div key={v.id} className={`rounded border p-2 text-xs ${selecionadoId === v.id ? 'border-primary bg-accent' : ''}`} onClick={() => setSelecionadoId(v.id)}>
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
            {aba === 'conferencia' && (
              <PainelConferencia vertices={vertices} res={res} imovel={imovel} onChange={setImovel} />
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

function PainelConferencia({ vertices, res, imovel, onChange }: {
  vertices: Vertex[]; res: ReturnType<typeof calcular> | null; imovel: ImovelData; onChange: (i: ImovelData) => void;
}) {
  const problemas: Problema[] = conferir(vertices, res, imovel);
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
    onChange(confrontantes.map((c) => (c.id === id ? { ...c, [k]: v } : c)));
  const setNome = (id: string, v: string) => {
    const m = sugConf.find((s) => s.nome === v);
    onChange(confrontantes.map((c) => (c.id === id
      ? (m ? { ...c, nome: v, cpf: m.cpf, matricula: m.matricula, cns: m.cns, descricaoExtra: m.descricaoExtra } : { ...c, nome: v })
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
              <div className="grid grid-cols-2 gap-2">
                <Campo label="CPF/CNPJ" value={c.cpf} onChange={(v) => set(c.id, 'cpf', v)} />
                <Campo label="Matrícula" value={c.matricula} onChange={(v) => set(c.id, 'matricula', v)} />
              </div>
              <Campo label="Cartório (CNS)" value={c.cns} onChange={(v) => set(c.id, 'cns', v)} list="lista-cns" />
              <Campo label="Descrição extra (espólio/inventariante)" value={c.descricaoExtra ?? ''} onChange={(v) => set(c.id, 'descricaoExtra', v)} />
            </CardContent>
          </Card>
        );
      })}
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
