'use client';

import type { Vertex, ImovelData, TecnicoData, EscritorioData, ResultadoCalculo, Confrontante, PlantaConfig, PessoaQualificada } from '@/lib/topo/types';
import { numBR, formatMatricula } from '@/lib/topo/geometry';
import { valoresEfetivos } from '@/lib/topo/conferencia';
import { grausParaDMS, convergenciaMeridiana, meridianoCentral, geoParaUtm } from '@/lib/topo/coords';
import { distanciaCota } from '@/lib/topo/objetos';
import { REPRES_LABEL, corDivisa } from '@/lib/topo/sigefVocab';
import type { ObjetoDesenho } from '@/lib/topo/types';

interface Props {
  vertices: Vertex[];
  res: ResultadoCalculo;
  imovel: ImovelData;
  tecnico: TecnicoData;
  escritorio: EscritorioData;
  confrontantes: Confrontante[];
  confrontantePorLado: Record<number, string>;
  zona: number;
  hemisferio: 'N' | 'S';
  glebaNome?: string;
  dataExtenso?: string;
  situacaoUrl?: string;
  outrasGlebas?: { nome: string; pts: { leste: number; norte: number }[] }[];
  objetos?: ObjetoDesenho[];
  config?: PlantaConfig;
  requerente?: PessoaQualificada;
  transmitente?: PessoaQualificada;
}

const LAUDO_PADRAO = 'LAUDO TÉCNICO: Atesto, sob as penas da lei, que efetuei pessoalmente o levantamento da área e que os valores dos azimutes, distâncias e dados de identificação dos confrontantes são os apresentados nesta planta e no memorial que a acompanha.';
const CONFRONT_PADRAO = 'Concordamos com as medidas apresentadas nesta planta e no memorial anexo, no tocante aos espaços em que o referido imóvel faz confrontação com o imóvel de nossa propriedade (§10 do art. 213 da LRP).';

// A3 paisagem @96dpi: 420x297mm
const W = 1587;
const H = 1123;
const CARW = 470;            // largura da coluna de carimbo (direita)
const STRIP = 210;           // altura da faixa inferior (observações/convenções/etc.)
const DRAW = { x0: 24, y0: 24, x1: W - CARW - 12, y1: H - STRIP - 12 };

/** Linhas do rótulo do confrontante na planta, conforme a condição (proprietário/posseiro/espólio). */
function rotuloConfrontanteLinhas(c: Confrontante): string[] {
  const cond = c.condicao ?? 'proprietario';
  const linhas: string[] = [];
  if (cond === 'espolio') {
    linhas.push(/esp[óo]lio/i.test(c.nome) ? c.nome : `Espólio de ${c.nome}`);
    if (c.inventarianteNome) linhas.push(`Inventariante: ${c.inventarianteNome}`);
    if (c.matricula) linhas.push(`Matrícula nº ${formatMatricula(c.matricula)}`);
    return linhas;
  }
  linhas.push(`Nome: ${c.nome}`);
  linhas.push(`CPF: ${c.cpf || '—'}`);
  if (cond === 'posseiro') linhas.push('Possuidor(a)');
  else {
    if (c.matricula) linhas.push(`Matrícula nº ${formatMatricula(c.matricula)}`);
  }
  if (c.conjugeNome) linhas.push(`Cônjuge: ${c.conjugeNome}`);
  return linhas;
}

function intervaloGrade(extent: number): number {
  const alvo = extent / 6;
  const pot = Math.pow(10, Math.floor(Math.log10(alvo)));
  for (const m of [1, 2, 5, 10]) if (pot * m >= alvo) return pot * m;
  return pot * 10;
}

export default function Planta({
  vertices, res, imovel, tecnico, escritorio, confrontantes, confrontantePorLado,
  zona, hemisferio, glebaNome, dataExtenso, situacaoUrl, outrasGlebas = [], objetos = [], config = {},
  requerente, transmitente
}: Props) {
  if (vertices.length < 3) {
    return <div className="p-8 text-sm text-muted-foreground">Importe pontos para gerar a planta.</div>;
  }

  const verGrade = config.mostrarGrade !== false;
  const verNortes = config.mostrarNortes !== false;
  const verConv = config.mostrarConvencoes !== false;
  const verEscalaG = config.mostrarEscalaGrafica !== false;
  const verSituacao = config.mostrarSituacao !== false;
  const escTxt = config.escalaTextos && config.escalaTextos > 0 ? config.escalaTextos : 1;
  const fs = (n: number) => +(n * escTxt).toFixed(2); // escala global de todos os textos
  const fonteRot = fs(config.fonteRotulos ?? 8.5);
  const ef = valoresEfetivos(res, imovel);
  const mapaC = new Map(confrontantes.map((c) => [c.id, c]));

  // ---- transform UTM -> tela (escala múltipla de 250) ----
  const outrasPts = outrasGlebas.flatMap((g) => g.pts);
  const xs = [...vertices.map((v) => v.leste), ...outrasPts.map((p) => p.leste)];
  const ys = [...vertices.map((v) => v.norte), ...outrasPts.map((p) => p.norte)];
  let minX = Math.min(...xs), maxX = Math.max(...xs);
  let minY = Math.min(...ys), maxY = Math.max(...ys);
  const padX = (maxX - minX) * 0.15 || 10;
  const padY = (maxY - minY) * 0.15 || 10;
  minX -= padX; maxX += padX; minY -= padY; maxY += padY;
  const areaW = DRAW.x1 - DRAW.x0;
  const areaH = DRAW.y1 - DRAW.y0;
  const escalaFit = Math.min(areaW / (maxX - minX), areaH / (maxY - minY));
  const denomNatural = 1 / (escalaFit * 0.0002645);
  const TABELA = [250, 500, 750, 1000, 1500, 2000, 2500, 4000, 5000, 7500, 10000, 15000, 20000, 25000, 50000, 100000];
  const escalaDenom = (config.escalaManual && config.escalaManual > 0)
    ? config.escalaManual
    : (TABELA.find((d) => d >= denomNatural) ?? Math.ceil(denomNatural / 10000) * 10000);
  const escala = 1 / (escalaDenom * 0.0002645);
  const desW = (maxX - minX) * escala, desH = (maxY - minY) * escala;
  const offX = DRAW.x0 + (areaW - desW) / 2;
  const offY = DRAW.y0 + (areaH - desH) / 2;
  const sx = (e: number) => offX + (e - minX) * escala;
  const sy = (n: number) => offY + (maxY - n) * escala;

  const intervalo = intervaloGrade(Math.max(maxX - minX, maxY - minY));
  const linhasX: number[] = [];
  for (let x = Math.ceil(minX / intervalo) * intervalo; x <= maxX; x += intervalo) linhasX.push(x);
  const linhasY: number[] = [];
  for (let y = Math.ceil(minY / intervalo) * intervalo; y <= maxY; y += intervalo) linhasY.push(y);

  const anel = vertices.map((v) => ({ x: sx(v.leste), y: sy(v.norte) }));
  const pts = anel.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const cx = anel.reduce((s, p) => s + p.x, 0) / anel.length;
  const cy = anel.reduce((s, p) => s + p.y, 0) / anel.length;

  // ---- confrontantes por trecho: posição do rótulo (fora do polígono) ----
  const trechos = new Map<string, number[]>();
  for (let i = 0; i < vertices.length; i++) {
    const cid = confrontantePorLado[i];
    if (!cid) continue;
    if (!trechos.has(cid)) trechos.set(cid, []);
    trechos.get(cid)!.push(i);
  }
  const clampX = (x: number) => Math.max(DRAW.x0 + 75, Math.min(DRAW.x1 - 75, x));
  const clampY = (y: number) => Math.max(DRAW.y0 + 22, Math.min(DRAW.y1 - 24, y));
  const rotulosConf = [...trechos.entries()].map(([cid, idxs]) => {
    const c = mapaC.get(cid);
    if (c?.posRotulo) {
      const u = geoParaUtm(c.posRotulo.lat, c.posRotulo.lon, zona, hemisferio);
      return { c, x: clampX(sx(u.leste)), y: clampY(sy(u.norte)) };
    }
    const meio = idxs[Math.floor(idxs.length / 2)];
    const a = anel[meio], b = anel[(meio + 1) % anel.length];
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    let dx = mx - cx, dy = my - cy;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    return { c, x: clampX(mx + dx * 60), y: clampY(my + dy * 60) };
  });

  // ---- cálculo de nortes e coordenadas ----
  const vref = vertices[0];
  const conv = convergenciaMeridiana(vref.lat, vref.lon, zona);
  const decl = imovel.declinacaoMagnetica ?? 0;
  const dLamb = ((vref.lon - meridianoCentral(zona)) * Math.PI) / 180;
  const phiRef = (vref.lat * Math.PI) / 180;
  const fatorK = 0.9996 * (1 + Math.pow(dLamb * Math.cos(phiRef), 2) / 2);
  const represUsadas = Array.from(new Set(vertices.map((v) => v.representacao || 'linha-ideal')));

  return (
    <svg id="planta-svg" viewBox={`0 0 ${W} ${H}`} width="100%" style={{ background: '#fff', fontFamily: 'Arial, Helvetica, sans-serif' }} xmlns="http://www.w3.org/2000/svg">
      {/* Moldura externa */}
      <rect x={0} y={0} width={W} height={H} fill="#fff" />
      <rect x={8} y={8} width={W - 16} height={H - 16} fill="none" stroke="#000" strokeWidth={1.5} />

      {/* ---------- GRADE ---------- */}
      {verGrade && linhasX.map((x) => (
        <g key={`x${x}`}>
          <line x1={sx(x)} y1={DRAW.y0} x2={sx(x)} y2={DRAW.y1} stroke="#bbb" strokeWidth={0.4} strokeDasharray="4 4" />
          <text x={sx(x)} y={DRAW.y1 + 12} fontSize={fs(9)} textAnchor="middle" fill="#333">{`E ${numBR(x, 4)} m`}</text>
        </g>
      ))}
      {verGrade && linhasY.map((y) => (
        <g key={`y${y}`}>
          <line x1={DRAW.x0} y1={sy(y)} x2={DRAW.x1} y2={sy(y)} stroke="#bbb" strokeWidth={0.4} strokeDasharray="4 4" />
          <text x={DRAW.x0 - 4} y={sy(y) + 3} fontSize={fs(9)} textAnchor="end" fill="#333" transform={`rotate(-90 ${DRAW.x0 - 4} ${sy(y)})`}>{`N ${numBR(y, 4)} m`}</text>
        </g>
      ))}

      {/* demais glebas do imóvel (contorno + nome) */}
      {outrasGlebas.map((g, i) => {
        if (g.pts.length < 3) return null;
        const pp = g.pts.map((p) => `${sx(p.leste).toFixed(1)},${sy(p.norte).toFixed(1)}`).join(' ');
        const ccx = g.pts.reduce((s, p) => s + sx(p.leste), 0) / g.pts.length;
        const ccy = g.pts.reduce((s, p) => s + sy(p.norte), 0) / g.pts.length;
        return (
          <g key={`og${i}`}>
            <polygon points={pp} fill="#f97316" fillOpacity={0.06} stroke="#c2410c" strokeWidth={1.2} strokeDasharray="6 4" />
            <text x={ccx} y={ccy} fontSize={fs(10)} fontWeight="bold" textAnchor="middle" fill="#7c2d12">{g.nome}</text>
          </g>
        );
      })}

      {/* ---------- POLÍGONO (gleba ativa) ---------- */}
      <polygon points={pts} fill="#fde68a" fillOpacity={0.18} stroke="#7c2d12" strokeWidth={1.8} />

      {/* ---------- LINHAS DE APOIO DAS DIVISAS ---------- */}
      {vertices.map((v, i) => {
        const cor = corDivisa(v.representacao);
        if (!cor) return null;
        const a = anel[i], b = anel[(i + 1) % anel.length];
        if (!a || !b) return null;
        let nx = -(b.y - a.y), ny = b.x - a.x;
        const len = Math.hypot(nx, ny) || 1; nx /= len; ny /= len;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        if ((mx - cx) * nx + (my - cy) * ny < 0) { nx = -nx; ny = -ny; }
        const off = 3.2;
        return (
          <line key={`div${v.id}`} x1={a.x + nx * off} y1={a.y + ny * off} x2={b.x + nx * off} y2={b.y + ny * off}
            stroke={cor} strokeWidth={3.2} strokeLinecap="round" opacity={0.9} />
        );
      })}

      {/* ---------- OBJETOS DE DESENHO ---------- */}
      {objetos.map((o) => {
        const sp = o.pontos.map((p) => ({ x: sx(p.leste), y: sy(p.norte) }));
        if (o.tipo === 'texto' && sp[0]) {
          const anchor = o.alinhamento === 'center' ? 'middle' : o.alinhamento === 'right' ? 'end' : 'start';
          return <text key={o.id} x={sp[0].x} y={sp[0].y} fontSize={(o.tamanho ?? 12) * 0.8} textAnchor={anchor} fill={o.cor ?? '#000'}>{o.texto}</text>;
        }
        if (o.tipo === 'cota' && sp.length >= 2) {
          const mx = (sp[0].x + sp[1].x) / 2, my = (sp[0].y + sp[1].y) / 2;
          return (
            <g key={o.id}>
              <line x1={sp[0].x} y1={sp[0].y} x2={sp[1].x} y2={sp[1].y} stroke={o.cor ?? '#b91c1c'} strokeWidth={0.8} />
              <text x={mx} y={my - 3} fontSize={8} textAnchor="middle" fill={o.cor ?? '#b91c1c'}>{numBR(distanciaCota(o))} m</text>
            </g>
          );
        }
        if (o.tipo === 'polilinha' && sp.length >= 2) {
          const pp = sp.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
          return o.preenchido && sp.length >= 3
            ? <polygon key={o.id} points={pp} fill={o.cor ?? '#2563eb'} fillOpacity={0.4} stroke={o.cor ?? '#2563eb'} strokeWidth={o.espessura ?? 1.2} />
            : <polyline key={o.id} points={pp} fill="none" stroke={o.cor ?? '#2563eb'} strokeWidth={o.espessura ?? 1.2} />;
        }
        return null;
      })}

      {/* confrontantes (rótulo + linha de assinatura) */}
      {rotulosConf.map((r, i) => {
        if (!r.c || !r.c.nome) return null;
        const linhas = rotuloConfrontanteLinhas(r.c);
        return (
          <g key={i}>
            <line x1={r.x - 72} y1={r.y - 13} x2={r.x + 72} y2={r.y - 13} stroke="#000" strokeWidth={0.6} />
            {linhas.map((t, k) => (
              <text key={k} x={r.x} y={r.y - 2 + k * (fonteRot + 1.5)} fontSize={fonteRot} textAnchor="middle" fill="#000">{t}</text>
            ))}
          </g>
        );
      })}

      {/* vértices + códigos */}
      {vertices.map((v) => (
        <g key={v.id}>
          <SimboloVertice tipo={v.tipo} cx={sx(v.leste)} cy={sy(v.norte)} r={v.tipo === 'M' ? 3.6 : v.tipo === 'V' ? 3 : 2.6} />
          <text x={sx(v.leste) + 5} y={sy(v.norte) - 4} fontSize={Math.max(6, fonteRot - 0.5)} fill="#000">{v.codigoSigef || 'S/N'}</text>
        </g>
      ))}

      {/* texto central com dados da gleba */}
      <g>
        {[
          glebaNome || imovel.denominacao || 'Imóvel',
          `Área: ${numBR(ef.areaHa, 4)} ha`,
          imovel.proprietario ? `Prop.: ${imovel.proprietario}` : '',
        ].filter(Boolean).map((t, i) => (
          <text key={i} x={cx} y={cy + i * 14} fontSize={fs(i === 0 ? 13 : 11)} fontWeight={i === 0 ? 'bold' : 'normal'} textAnchor="middle" fill="#1c1917">{t}</text>
        ))}
      </g>

      {/* ---------- BARRA DE ESCALA GRÁFICA ---------- */}
      {verEscalaG && (() => {
        const nices = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
        const barM = nices.find((n) => n * escala >= 120) ?? 5000;
        const barPx = barM * escala;
        const bx = DRAW.x0 + 14, by = DRAW.y1 - 18;
        const seg = barPx / 4;
        return (
          <g>
            <text x={bx} y={by - 6} fontSize={fs(9)} fontWeight="bold">Escala Gráfica:</text>
            {[0, 1, 2, 3].map((k) => <rect key={k} x={bx + k * seg} y={by} width={seg} height={5} fill={k % 2 ? '#fff' : '#000'} stroke="#000" strokeWidth={0.5} />)}
            {[0, 1, 2, 3, 4].map((k) => <text key={k} x={bx + k * seg} y={by + 13} fontSize={fs(7)} textAnchor="middle">{Math.round((barM * k) / 4)}</text>)}
            <text x={bx + barPx + 10} y={by + 5} fontSize={fs(7)}>m</text>
          </g>
        );
      })()}

      {/* ---------- FAIXA INFERIOR (SITUAÇÃO, CONVENÇÕES, INFOS COORDENADAS) ---------- */}
      <FaixaInferior
        imovel={imovel} res={res} ef={ef} tecnico={tecnico} zona={zona} hemisferio={hemisferio}
        vref={vref} conv={conv} decl={decl} represUsadas={represUsadas} fatorK={fatorK}
        verConv={verConv} verNortes={verNortes} escala={escTxt} situacaoUrl={situacaoUrl} verSituacao={verSituacao}
      />

      {/* ---------- CARIMBO (coluna direita - reformulada) ---------- */}
      <CarimboA3
        imovel={imovel} ef={ef} tecnico={tecnico} escritorio={escritorio} glebaNome={glebaNome}
        escalaDenom={escalaDenom} dataExtenso={dataExtenso}
        titulo={config.titulo || 'Levantamento Planimétrico Georreferenciado'} folha={config.folha || 'Única'}
        textoLaudo={config.textoLaudo || LAUDO_PADRAO} textoConfront={config.textoConfrontantes || CONFRONT_PADRAO} escala={escTxt}
        requerente={requerente} transmitente={transmitente}
      />
    </svg>
  );
}

// ---------------- Faixa inferior reformulada com caixas fechadas ----------------
function FaixaInferior(props: {
  imovel: ImovelData; res: ResultadoCalculo; ef: ReturnType<typeof valoresEfetivos>; tecnico: TecnicoData;
  zona: number; hemisferio: 'N' | 'S'; vref: Vertex; conv: number; decl: number; represUsadas: string[]; fatorK: number;
  verConv: boolean; verNortes: boolean; escala: number; situacaoUrl?: string; verSituacao: boolean;
}) {
  const { imovel, ef, zona, hemisferio, vref, conv, decl, represUsadas, fatorK, verConv, verNortes, escala, situacaoUrl, verSituacao } = props;
  const fs = (n: number) => +(n * escala).toFixed(2);
  const y0 = H - STRIP - 12; // 901px
  const hBox = STRIP;       // 210px

  const lon = grausParaDMS(vref.lon, { estilo: 'memorial', casas: 3 });
  const lat = grausParaDMS(vref.lat, { estilo: 'memorial', casas: 3 });

  // Posições X das 3 caixas
  const w1 = 244;
  const w2 = 200;
  const w3 = DRAW.x1 - (DRAW.x0 + w1 + 12 + w2 + 12); // Restante: 613px
  
  const x1 = DRAW.x0; // 24
  const x2 = x1 + w1 + 12; // 280
  const x3 = x2 + w2 + 12; // 492

  return (
    <g>
      {/* --- BOX 1: SITUAÇÃO --- */}
      <g>
        <rect x={x1} y={y0} width={w1} height={hBox} rx={4} ry={4} fill="none" stroke="#000" strokeWidth={0.8} />
        <rect x={x1} y={y0} width={w1} height={18} fill="#000" rx={2} ry={2} />
        <text x={x1 + w1 / 2} y={y0 + 13} fontSize={fs(9)} fontWeight="bold" fill="#fff" textAnchor="middle">Situação</text>
        {situacaoUrl && verSituacao ? (
          <image href={situacaoUrl} x={x1 + 6} y={y0 + 24} width={w1 - 12} height={hBox - 30} preserveAspectRatio="xMidYMid slice" />
        ) : (
          <g>
            <rect x={x1 + 6} y={y0 + 24} width={w1 - 12} height={hBox - 30} fill="#f3f4f6" stroke="#d1d5db" strokeWidth={0.5} />
            <text x={x1 + w1 / 2} y={y0 + hBox / 2 + 10} fontSize={fs(8)} fill="#6b7280" textAnchor="middle">Situação Indisponível</text>
          </g>
        )}
      </g>

      {/* --- BOX 2: CONVENÇÕES --- */}
      {verConv && (
        <g>
          <rect x={x2} y={y0} width={w2} height={hBox} rx={4} ry={4} fill="none" stroke="#000" strokeWidth={0.8} />
          <text x={x2 + w2 / 2} y={y0 + 17} fontSize={fs(9)} fontWeight="bold" textAnchor="middle">CONVENÇÕES</text>
          
          <g>
            <SimboloVertice tipo="M" cx={x2 + 18} cy={y0 + 35} r={3.6} />
            <text x={x2 + 28} y={y0 + 38} fontSize={fs(8)}>Vértices Tipo M</text>
            
            <SimboloVertice tipo="P" cx={x2 + 18} cy={y0 + 51} r={2.6} />
            <text x={x2 + 28} y={y0 + 54} fontSize={fs(8)}>Vértices Tipo P</text>
            
            <SimboloVertice tipo="V" cx={x2 + 18} cy={y0 + 67} r={3} />
            <text x={x2 + 28} y={y0 + 70} fontSize={fs(8)}>Vértices Tipo V (virtual)</text>

            <SimboloDivisa tipo="linha-ideal" x={x2 + 12} y={y0 + 83} />
            <text x={x2 + 28} y={y0 + 86} fontSize={fs(8)}>Linha ideal</text>

            {represUsadas.filter((r) => r !== 'linha-ideal').slice(0, 7).map((r, i) => (
              <g key={r}>
                <SimboloDivisa tipo={r} x={x2 + 12} y={y0 + 99 + i * 16} />
                <text x={x2 + 28} y={y0 + 102 + i * 16} fontSize={fs(8)}>{REPRES_LABEL[r] || r}</text>
              </g>
            ))}
          </g>
        </g>
      )}

      {/* --- BOX 3: INFORMAÇÕES DE COORDENADAS --- */}
      <g>
        <rect x={x3} y={y0} width={w3} height={hBox} rx={4} ry={4} fill="none" stroke="#000" strokeWidth={0.8} />
        <text x={x3 + w3 / 2} y={y0 + 17} fontSize={fs(9)} fontWeight="bold" textAnchor="middle">Informações de Coordenadas</text>

        {/* Lado Esquerdo do Box 3 (Projeção e Diagrama) */}
        <g>
          <text x={x3 + 12} y={y0 + 38} fontSize={fs(8)} fontWeight="bold">PROJEÇÃO UNIVERSAL TRANSVERSA DE MERCATOR - UTM</text>
          <text x={x3 + 12} y={y0 + 52} fontSize={fs(8)} fontWeight="bold">SGR - SIRGAS2000</text>
          <text x={x3 + 12} y={y0 + 66} fontSize={fs(8)}>MC: {meridianoCentral(zona)}° · Fuso {zona}{hemisferio}</text>
          {verNortes && <Nortes cx={x3 + 80} cy={y0 + 144} conv={conv} decl={decl} />}
        </g>

        {/* Lado Direito do Box 3 (Valores do Vértice de Referência) */}
        <g transform="translate(230, 0)">
          <text x={x3 + 12} y={y0 + 38} fontSize={fs(8)} fontWeight="bold">Vértice: {vref.codigoSigef || vref.nome}</text>
          {[
            ['Lat:', lat],
            ['Long:', lon],
            ['Declinação magnética:', grausParaDMS(decl, { casas: 6, estilo: 'memorial' })],
            ['Variação anual:', imovel.variacaoAnual != null ? `${numBR(imovel.variacaoAnual, 1)}'/ano` : '—'],
            ['Conv. meridiana:', grausParaDMS(conv, { casas: 6, estilo: 'memorial' })],
            ['K:', fatorK.toFixed(9)],
          ].map(([label, val], idx) => (
            <text key={idx} x={x3 + 12} y={y0 + 56 + idx * 16} fontSize={fs(8)}>
              <tspan fontWeight="bold">{label} </tspan> {val}
            </text>
          ))}
        </g>
      </g>
    </g>
  );
}

// ---------------- Nortes modificado ----------------
function Nortes({ cx, cy, conv, decl }: { cx: number; cy: number; conv: number; decl: number }) {
  const seta = (ang: number, label: string, cor: string) => {
    const r = 32;
    const a = (-ang * Math.PI) / 180;
    const tx = cx + r * Math.sin(a), ty = cy - r * Math.cos(a);
    return (
      <g>
        <line x1={cx} y1={cy} x2={tx} y2={ty} stroke={cor} strokeWidth={1.3} />
        <text x={tx} y={ty - 3} fontSize={8} fontWeight="bold" textAnchor="middle" fill={cor}>{label}</text>
      </g>
    );
  };
  return (
    <g>
      {seta(0, 'NV', '#000')}
      {seta(conv, 'NQ', '#1d4ed8')}
      {seta(decl, 'NM', '#b91c1c')}
      <circle cx={cx} cy={cy} r={2} fill="#000" />
    </g>
  );
}

// ---------------- CarimboA3 reformulado com bordas e harmonia visual ----------------
function CarimboA3(props: {
  imovel: ImovelData; ef: ReturnType<typeof valoresEfetivos>; tecnico: TecnicoData; escritorio: EscritorioData;
  glebaNome?: string; escalaDenom: number; dataExtenso?: string;
  titulo: string; folha: string; textoLaudo: string; textoConfront: string; escala: number;
  requerente?: PessoaQualificada; transmitente?: PessoaQualificada;
}) {
  const { imovel, ef, tecnico, escritorio, glebaNome, escalaDenom, dataExtenso, titulo, folha, textoLaudo, textoConfront, escala, requerente, transmitente } = props;
  const fs = (n: number) => +(n * escala).toFixed(2);
  const x0 = W - CARW; // 1117
  const padX = 10;
  const lx = x0 + padX; // 1127
  const rx = W - 18;  // 1569
  const wBox = rx - lx; // 442
  const cxc = lx + wBox / 2; // 1348.5
  const temLogo = !!escritorio.logoDataUrl;

  // Lista dos dados do imóvel a serem desenhados na Box de Dados
  const campos: [string, string][] = [
    ['PROPRIEDADE:', glebaNome || imovel.denominacao || '—'],
    ['PROPRIETÁRIO(A):', imovel.proprietario || '—'],
  ];
  if (imovel.comprador) {
    campos.push(['COMPRADOR(ES):', imovel.comprador]);
  }
  campos.push(
    ['MUNICÍPIO(S):', imovel.municipio || '—'],
    ['TRT:', tecnico.art || '—'],
    ['MAT./TRANSC.:', imovel.matricula || '—'],
    ['ÁREA TOTAL (ha):', `${numBR(ef.areaHa, 4)} ha`],
    ['PERÍMETRO (m):', `${numBR(ef.perimetro)} m`],
    ['DATA:', dataExtenso || '—'],
    ['ESCALA:', `1 / ${escalaDenom}`],
  );

  const gap = campos.length > 10 ? 25 : 27;

  // Estrutura de Assinatura
  const renderAssinatura = (yLine: number, label: string, nome: string, detalhe1?: string, detalhe2?: string, detalhe3?: string) => (
    <g>
      <line x1={lx + 10} y1={yLine} x2={rx - 10} y2={yLine} stroke="#000" strokeWidth={0.6} />
      <text x={cxc} y={yLine - 4} fontSize={fs(7)} fill="#666" textAnchor="middle">{label}</text>
      <text x={cxc} y={yLine + 13} fontSize={fs(8.5)} fontWeight="bold" fill="#000" textAnchor="middle">{nome}</text>
      {detalhe1 && <text x={cxc} y={yLine + 24} fontSize={fs(7.5)} fill="#222" textAnchor="middle">{detalhe1}</text>}
      {detalhe2 && <text x={cxc} y={yLine + 35} fontSize={fs(7.5)} fill="#222" textAnchor="middle">{detalhe2}</text>}
      {detalhe3 && <text x={cxc} y={yLine + 46} fontSize={fs(7.5)} fill="#222" textAnchor="middle">{detalhe3}</text>}
    </g>
  );

  return (
    <g>
      {/* Linha separadora vertical principal */}
      <line x1={x0} y1={16} x2={x0} y2={H - 16} stroke="#000" strokeWidth={1.2} />

      {/* --- BOX 1: TÍTULO --- */}
      <g>
        <rect x={lx} y={24} width={wBox - 72} height={90} rx={4} ry={4} fill="none" stroke="#000" strokeWidth={0.8} />
        <text x={lx + 10} y={42} fontSize={fs(8)} fontWeight="bold" fill="#4b5563">Título:</text>
        <text x={lx + (wBox - 72) / 2} y={76} fontSize={fs(14.5)} fontWeight="bold" textAnchor="middle" fill="#000">{titulo}</text>
      </g>

      {/* --- BOX 2: FOLHA --- */}
      <g>
        <rect x={rx - 62} y={24} width={62} height={90} rx={4} ry={4} fill="none" stroke="#000" strokeWidth={0.8} />
        <text x={rx - 54} y={42} fontSize={fs(8)} fill="#4b5563">Folha:</text>
        <text x={rx - 31} y={76} fontSize={fs(14.5)} fontWeight="bold" textAnchor="middle" fill="#000">{folha}</text>
      </g>

      {/* --- BOX 3: DADOS DO IMÓVEL --- */}
      <g>
        <rect x={lx} y={126} width={wBox} height={290} rx={4} ry={4} fill="none" stroke="#000" strokeWidth={0.8} />
        {campos.map(([k, v], i) => {
          const y = 152 + i * gap;
          return (
            <g key={k}>
              <text x={lx + 12} y={y} fontSize={fs(8)} fontWeight="bold" fill="#374151">{k}</text>
              <text x={lx + 150} y={y} fontSize={fs(9)} fontWeight="medium" fill="#000">{v.slice(0, 48)}</text>
            </g>
          );
        })}
      </g>

      {/* --- BOXES 4 & 5: ASSINATURAS DO PROPRIETÁRIO E DO RESPONSÁVEL TÉCNICO (Lado a Lado!) --- */}
      {/* Assinatura Proprietário */}
      <g>
        <rect x={lx} y={428} width={215} height={240} rx={4} ry={4} fill="none" stroke="#000" strokeWidth={0.8} />
        <text x={lx + 107.5} y={444} fontSize={fs(7)} fontWeight="bold" textAnchor="middle" fill="#4b5563">Assinatura do Proprietário</text>
        <text x={lx + 107.5} y={466} fontSize={fs(8)} fontWeight="bold" textAnchor="middle">PROPRIETÁRIO(S)</text>
        <TextoQuebrado x={lx + 10} y={478} fontSize={fs(6.5)} larguraChars={34} textAnchor="middle" texto={
          `Atestamos, sob as penas da lei, serem verdadeiras todas as informações apresentadas nesta planta e no memorial anexo. Declaramos, sob as penas da lei que indicamos em campo, de forma expressa, as divisas, limites e confrontações consideradas verdadeiras.`
        } />
        
        {/* Assinaturas dinâmicas dependendo se há comprador */}
        {imovel.comprador ? (
          <g>
            {renderAssinatura(545, 'Assinatura do Transmitente', imovel.proprietario, `CPF: ${imovel.cpfProprietario}`, transmitente?.rg ? `RG: ${transmitente.rg}` : undefined)}
            {renderAssinatura(615, 'Assinatura do Comprador', imovel.comprador, `CPF: ${imovel.cpfComprador || '—'}`, requerente?.rg ? `RG: ${requerente.rg}` : undefined)}
          </g>
        ) : (
          <g>
            {renderAssinatura(610, 'Assinatura do Proprietário', imovel.proprietario, `CPF: ${imovel.cpfProprietario}`, transmitente?.rg ? `RG: ${transmitente.rg}` : undefined)}
          </g>
        )}
      </g>

      {/* Assinatura Responsável Técnico */}
      <g>
        <rect x={lx + 227} y={428} width={215} height={240} rx={4} ry={4} fill="none" stroke="#000" strokeWidth={0.8} />
        <text x={lx + 334.5} y={444} fontSize={fs(7)} fontWeight="bold" textAnchor="middle" fill="#4b5563">Assinatura do Responsável Técnico</text>
        <text x={lx + 334.5} y={466} fontSize={fs(8)} fontWeight="bold" textAnchor="middle">LAUDO TÉCNICO</text>
        <TextoQuebrado x={lx + 237} y={478} fontSize={fs(6.5)} larguraChars={34} textAnchor="middle" texto={textoLaudo} />
        
        {renderAssinatura(615, 'Assinatura do Responsável Técnico', tecnico.nome, tecnico.formacao, `CFT: ${tecnico.cft}`, `INCRA: ${tecnico.credenciamentoIncra}`)}
      </g>

      {/* --- BOX 6: DECLARAÇÃO DOS CONFRONTANTES --- */}
      <g>
        <rect x={lx} y={680} width={wBox} height={160} rx={4} ry={4} fill="none" stroke="#000" strokeWidth={0.8} />
        <text x={lx + 10} y={696} fontSize={fs(7)} fontWeight="bold" fill="#4b5563">Declaração dos Confrontantes:</text>
        <text x={cxc} y={716} fontSize={fs(8)} fontWeight="bold" textAnchor="middle">CONFRONTANTES</text>
        <TextoQuebrado x={lx + 12} y={729} fontSize={fs(7)} larguraChars={75} textAnchor="middle" texto={textoConfront} />
      </g>

      {/* --- BOX 7: CARIMBO DO ESCRITÓRIO --- */}
      <g>
        <rect x={lx} y={852} width={wBox} height={H - 852 - 24} rx={4} ry={4} fill="none" stroke="#000" strokeWidth={0.8} />
        
        {temLogo ? (
          <g>
            <image href={escritorio.logoDataUrl} x={lx + 12} y={864} width={wBox - 24} height={50} preserveAspectRatio="xMidYMid meet" />
            <text x={cxc} y={938} fontSize={fs(11)} fontWeight="bold" textAnchor="middle">{escritorio.nome}</text>
            <text x={cxc} y={953} fontSize={fs(8)} textAnchor="middle">{escritorio.ramo}</text>
            <text x={cxc} y={967} fontSize={fs(8)} textAnchor="middle">CNPJ {escritorio.cnpj}</text>
            <text x={cxc} y={981} fontSize={fs(8)} textAnchor="middle">{escritorio.endereco.slice(0, 60)}</text>
            <text x={cxc} y={995} fontSize={fs(8)} textAnchor="middle">Tel./WhatsApp: {escritorio.telefone}</text>
          </g>
        ) : (
          <g>
            <text x={cxc} y={895} fontSize={fs(12)} fontWeight="bold" textAnchor="middle">{escritorio.nome}</text>
            <text x={cxc} y={915} fontSize={fs(8.5)} textAnchor="middle">{escritorio.ramo}</text>
            <text x={cxc} y={935} fontSize={fs(8.5)} textAnchor="middle">CNPJ {escritorio.cnpj}</text>
            <text x={cxc} y={955} fontSize={fs(8.5)} textAnchor="middle">{escritorio.endereco}</text>
            <text x={cxc} y={975} fontSize={fs(8.5)} textAnchor="middle">Tel./WhatsApp: {escritorio.telefone}</text>
          </g>
        )}
      </g>
    </g>
  );
}

// símbolo do vértice por tipo (M = losango, P = círculo, V = triângulo)
function SimboloVertice({ tipo, cx, cy, r }: { tipo: string; cx: number; cy: number; r: number }) {
  const cor = tipo === 'M' ? '#f59e0b' : tipo === 'V' ? '#a855f7' : '#22c55e';
  if (tipo === 'M') {
    const d = r * 1.15;
    return <rect x={cx - d} y={cy - d} width={d * 2} height={d * 2} transform={`rotate(45 ${cx} ${cy})`} fill={cor} stroke="#000" strokeWidth={0.5} />;
  }
  if (tipo === 'V') {
    return <polygon points={`${cx},${cy - r * 1.25} ${cx + r * 1.15},${cy + r} ${cx - r * 1.15},${cy + r}`} fill={cor} stroke="#000" strokeWidth={0.5} />;
  }
  return <circle cx={cx} cy={cy} r={r} fill={cor} stroke="#000" strokeWidth={0.5} />;
}

function SimboloDivisa({ tipo, x, y }: { tipo: string; x: number; y: number }) {
  const w = 12;
  const cor = corDivisa(tipo);
  if (cor) return <line x1={x} y1={y} x2={x + w} y2={y} stroke={cor} strokeWidth={3} strokeLinecap="round" />;
  if (tipo === 'cerca') return <g><line x1={x} y1={y} x2={x + w} y2={y} stroke="#000" strokeWidth={1} />{[0, 4, 8, 12].map((d) => <line key={d} x1={x + d} y1={y - 3} x2={x + d} y2={y + 3} stroke="#000" strokeWidth={0.7} />)}</g>;
  if (tipo === 'estrada') return <g><line x1={x} y1={y - 2} x2={x + w} y2={y - 2} stroke="#000" strokeWidth={0.8} /><line x1={x} y1={y + 2} x2={x + w} y2={y + 2} stroke="#000" strokeWidth={0.8} /></g>;
  if (tipo === 'corrego' || tipo === 'rio') return <path d={`M${x} ${y} q3 -4 6 0 t6 0`} fill="none" stroke="#1d4ed8" strokeWidth={1} />;
  if (tipo === 'acude') return <rect x={x} y={y - 3} width={w} height={6} fill="#93c5fd" stroke="#1d4ed8" strokeWidth={0.6} />;
  if (tipo === 'muro') return <rect x={x} y={y - 2} width={w} height={4} fill="#000" />;
  if (tipo === 'vala') return <line x1={x} y1={y} x2={x + w} y2={y} stroke="#000" strokeWidth={1} strokeDasharray="2 2" />;
  return <line x1={x} y1={y} x2={x + w} y2={y} stroke="#000" strokeWidth={1.2} />; // linha ideal
}

// SVG não quebra texto sozinho; quebramos em linhas por contagem de caracteres (texto nativo)
function TextoQuebrado({ x, y, fontSize, larguraChars, texto, textAnchor = 'start' }: { x: number; y: number; fontSize: number; larguraChars: number; texto: string; textAnchor?: 'start' | 'middle' | 'end' }) {
  const palavras = texto.split(' ');
  const linhas: string[] = [];
  let atual = '';
  for (const p of palavras) {
    if ((atual + ' ' + p).trim().length > larguraChars) { linhas.push(atual.trim()); atual = p; }
    else atual = (atual + ' ' + p).trim();
  }
  if (atual) linhas.push(atual.trim());
  return (
    <text x={x} y={y} fontSize={fontSize} fill="#000" textAnchor={textAnchor}>
      {linhas.map((l, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : fontSize * 1.25} textAnchor={textAnchor}>{l}</tspan>
      ))}
    </text>
  );
}
