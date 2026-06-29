'use client';

import type { Vertex, ImovelData, TecnicoData, EscritorioData, ResultadoCalculo, Confrontante, PlantaConfig } from '@/lib/topo/types';
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
  else linhas.push(`Matrícula nº ${formatMatricula(c.matricula) || '—'}`);
  if (c.conjugeNome) linhas.push(`Cônjuge: ${c.conjugeNome}`);
  return linhas;
}

function intervaloGrade(extent: number): number {
  const alvo = extent / 6;
  const pot = Math.pow(10, Math.floor(Math.log10(alvo)));
  for (const m of [1, 2, 5, 10]) if (pot * m >= alvo) return pot * m;
  return pot * 10;
}

export default function Planta({ vertices, res, imovel, tecnico, escritorio, confrontantes, confrontantePorLado, zona, hemisferio, glebaNome, dataExtenso, situacaoUrl, outrasGlebas = [], objetos = [], config = {} }: Props) {
  if (vertices.length < 3) {
    return <div className="p-8 text-sm text-muted-foreground">Importe pontos para gerar a planta.</div>;
  }
  // padrões: vazio = comportamento de sempre (plantas antigas idênticas)
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
  // enquadra a gleba ativa + as demais glebas, para todas aparecerem
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
  // escala da tabela cartográfica padrão (1:250, 500, 1000, 2000, 2500, 4000, 5000...)
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

  // centróide (tela) para empurrar rótulos de confrontante pra fora
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
  // mantém o rótulo dentro da área de desenho (não estoura a moldura)
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

  // ---- nortes ----
  const vref = vertices[0];
  const conv = convergenciaMeridiana(vref.lat, vref.lon, zona); // NQ vs NV
  const decl = imovel.declinacaoMagnetica ?? 0;                 // NM vs NV (input)
  const escalaDenominador = escalaDenom;
  // fator de escala (k) NO PONTO de referência: k = k0·(1 + (Δλ·cosφ)²/2), k0 = 0,9996 no MC.
  const dLamb = ((vref.lon - meridianoCentral(zona)) * Math.PI) / 180;
  const phiRef = (vref.lat * Math.PI) / 180;
  const fatorK = 0.9996 * (1 + Math.pow(dLamb * Math.cos(phiRef), 2) / 2);

  // tipos de divisa em uso (legenda)
  const represUsadas = Array.from(new Set(vertices.map((v) => v.representacao || 'linha-ideal')));

  const ix = (DRAW.x1 + DRAW.x0) / 2;

  return (
    <svg id="planta-svg" viewBox={`0 0 ${W} ${H}`} width="100%" style={{ background: '#fff', fontFamily: 'Arial, Helvetica, sans-serif' }} xmlns="http://www.w3.org/2000/svg">
      <rect x={0} y={0} width={W} height={H} fill="#fff" />
      <rect x={8} y={8} width={W - 16} height={H - 16} fill="none" stroke="#000" strokeWidth={1.5} />

      {/* ---------- GRADE ---------- */}
      {verGrade && linhasX.map((x) => (
        <g key={`x${x}`}>
          <line x1={sx(x)} y1={DRAW.y0} x2={sx(x)} y2={DRAW.y1} stroke="#bbb" strokeWidth={0.4} strokeDasharray="4 4" />
          <text x={sx(x)} y={DRAW.y1 + 12} fontSize={fs(9)} textAnchor="middle" fill="#333">{`E ${x.toFixed(0)}`}</text>
        </g>
      ))}
      {verGrade && linhasY.map((y) => (
        <g key={`y${y}`}>
          <line x1={DRAW.x0} y1={sy(y)} x2={DRAW.x1} y2={sy(y)} stroke="#bbb" strokeWidth={0.4} strokeDasharray="4 4" />
          <text x={DRAW.x0 - 4} y={sy(y) + 3} fontSize={fs(9)} textAnchor="end" fill="#333" transform={`rotate(-90 ${DRAW.x0 - 4} ${sy(y)})`}>{`N ${y.toFixed(0)}`}</text>
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

      {/* ---------- LINHAS DE APOIO DAS DIVISAS (cor externa à linha) ---------- */}
      {vertices.map((v, i) => {
        const cor = corDivisa(v.representacao);
        if (!cor) return null;
        const a = anel[i], b = anel[(i + 1) % anel.length];
        if (!a || !b) return null;
        // normal unitária do segmento, empurrada para FORA do polígono (lado oposto ao centróide)
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

      {/* ---------- PLANTA DE SITUAÇÃO (recorte sobre satélite) ---------- */}
      {situacaoUrl && verSituacao ? (
        <g>
          <image href={situacaoUrl} x={DRAW.x0 + 6} y={DRAW.y0 + 6} width={232} height={168} preserveAspectRatio="xMidYMid slice" />
          <rect x={DRAW.x0 + 6} y={DRAW.y0 + 6} width={232} height={168} fill="none" stroke="#000" strokeWidth={1} />
          <rect x={DRAW.x0 + 6} y={DRAW.y0 + 6} width={232} height={15} fill="#000" />
          <text x={DRAW.x0 + 122} y={DRAW.y0 + 17} fontSize={fs(9)} fontWeight="bold" textAnchor="middle" fill="#fff">PLANTA DE SITUAÇÃO</text>
        </g>
      ) : null}

      {/* ---------- BARRA DE ESCALA GRÁFICA ---------- */}
      {verEscalaG && (() => {
        const nices = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
        const barM = nices.find((n) => n * escala >= 120) ?? 5000;
        const barPx = barM * escala;
        const bx = DRAW.x0 + 14, by = DRAW.y1 - 18;
        const seg = barPx / 4;
        return (
          <g>
            <text x={bx} y={by - 6} fontSize={fs(8)} fontWeight="bold">Escala 1:{escalaDenom}</text>
            {[0, 1, 2, 3].map((k) => <rect key={k} x={bx + k * seg} y={by} width={seg} height={5} fill={k % 2 ? '#fff' : '#000'} stroke="#000" strokeWidth={0.5} />)}
            {[0, 1, 2, 3, 4].map((k) => <text key={k} x={bx + k * seg} y={by + 13} fontSize={fs(7)} textAnchor="middle">{Math.round((barM * k) / 4)}</text>)}
            <text x={bx + barPx + 10} y={by + 5} fontSize={fs(7)}>m</text>
          </g>
        );
      })()}

      {/* ---------- FAIXA INFERIOR ---------- */}
      <Faixa
        imovel={imovel} res={res} ef={ef} tecnico={tecnico} zona={zona} hemisferio={hemisferio}
        vref={vref} conv={conv} decl={decl} represUsadas={represUsadas} ix={ix} fatorK={fatorK}
        verConv={verConv} verNortes={verNortes} escala={escTxt}
      />

      {/* ---------- CARIMBO (coluna direita) ---------- */}
      <Carimbo
        imovel={imovel} ef={ef} tecnico={tecnico} escritorio={escritorio} glebaNome={glebaNome}
        confrontantes={confrontantes} escalaDenom={escalaDenominador} dataExtenso={dataExtenso}
        titulo={config.titulo || 'Levantamento Planimétrico Georreferenciado'} folha={config.folha || 'Única'}
        textoLaudo={config.textoLaudo || LAUDO_PADRAO} textoConfront={config.textoConfrontantes || CONFRONT_PADRAO} escala={escTxt}
      />
    </svg>
  );
}

// ---------------- Faixa inferior ----------------
function Faixa(props: {
  imovel: ImovelData; res: ResultadoCalculo; ef: ReturnType<typeof valoresEfetivos>; tecnico: TecnicoData;
  zona: number; hemisferio: 'N' | 'S'; vref: Vertex; conv: number; decl: number; represUsadas: string[]; ix: number; fatorK: number;
  verConv: boolean; verNortes: boolean; escala: number;
}) {
  const { imovel, ef, zona, hemisferio, vref, conv, decl, represUsadas, fatorK, verConv, verNortes, escala } = props;
  const fs = (n: number) => +(n * escala).toFixed(2);
  const y0 = H - STRIP - 4;
  const x0 = DRAW.x0, x1 = DRAW.x1;
  const w = x1 - x0;
  const c1 = x0 + w * 0.30;   // fim Observações
  const c2 = x0 + w * 0.62;   // fim Coordenadas
  const c3 = x0 + w * 0.82;   // fim Convenções

  const lon = grausParaDMS(vref.lon, { estilo: 'memorial', casas: 3 });
  const lat = grausParaDMS(vref.lat, { estilo: 'memorial', casas: 3 });

  return (
    <g>
      <rect x={x0} y={y0} width={w} height={STRIP} fill="none" stroke="#000" strokeWidth={1} />
      <line x1={c1} y1={y0} x2={c1} y2={y0 + STRIP} stroke="#000" strokeWidth={0.8} />
      <line x1={c2} y1={y0} x2={c2} y2={y0 + STRIP} stroke="#000" strokeWidth={0.8} />
      <line x1={c3} y1={y0} x2={c3} y2={y0 + STRIP} stroke="#000" strokeWidth={0.8} />

      {/* Observações */}
      <text x={x0 + 8} y={y0 + 16} fontSize={fs(10)} fontWeight="bold">Observações</text>
      {imovel.matricula ? <text x={x0 + 8} y={y0 + 34} fontSize={fs(9)}>Matrícula nº {imovel.matricula}</text> : null}
      {imovel.codigoImovelIncra ? <text x={x0 + 8} y={y0 + 48} fontSize={fs(9)}>SNCR/INCRA: {imovel.codigoImovelIncra}</text> : null}

      {/* Informações de Coordenadas */}
      <text x={c1 + 8} y={y0 + 16} fontSize={fs(10)} fontWeight="bold">Informações de Coordenadas</text>
      {[
        ['Vértice de ref.:', vref.codigoSigef],
        ['Latitude:', lat], ['Longitude:', lon],
        ['Declinação magnética:', `${numBR(decl, 4)}°`],
        ['Variação anual:', imovel.variacaoAnual != null ? `${numBR(imovel.variacaoAnual, 1)}'/ano` : '—'],
        ['Conv. meridiana:', `${numBR(conv, 4)}°`],
        ['SGR:', 'SIRGAS2000'],
        ['MC:', `${meridianoCentral(zona)}°  ·  Fuso ${zona}${hemisferio}`],
        ['K:', fatorK.toFixed(7)],
      ].map(([k, v], i) => (
        <text key={i} x={c1 + 8} y={y0 + 34 + i * 14} fontSize={fs(9)}><tspan fontWeight="bold">{k} </tspan>{v}</text>
      ))}

      {/* Convenções */}
      {verConv && <text x={c2 + 8} y={y0 + 16} fontSize={fs(10)} fontWeight="bold">CONVENÇÕES</text>}
      {verConv && <g>
        <SimboloVertice tipo="M" cx={c2 + 16} cy={y0 + 32} r={3.6} />
        <text x={c2 + 26} y={y0 + 35} fontSize={fs(9)}>Vértice tipo M</text>
        <SimboloVertice tipo="P" cx={c2 + 16} cy={y0 + 48} r={2.6} />
        <text x={c2 + 26} y={y0 + 51} fontSize={fs(9)}>Vértice tipo P</text>
        <SimboloVertice tipo="V" cx={c2 + 16} cy={y0 + 64} r={3} />
        <text x={c2 + 26} y={y0 + 67} fontSize={fs(9)}>Vértice tipo V (virtual)</text>
        {represUsadas.map((r, i) => (
          <g key={r}>
            <SimboloDivisa tipo={r} x={c2 + 10} y={y0 + 82 + i * 16} />
            <text x={c2 + 26} y={y0 + 85 + i * 16} fontSize={fs(9)}>{REPRES_LABEL[r] || r}</text>
          </g>
        ))}
      </g>}

      {/* Projeção + Nortes */}
      <text x={c3 + 8} y={y0 + 16} fontSize={fs(9)} fontWeight="bold">PROJEÇÃO UTM</text>
      <text x={c3 + 8} y={y0 + 30} fontSize={fs(8)}>Univ. Transversa de Mercator</text>
      {verNortes && <Nortes cx={(c3 + x1) / 2} cy={y0 + STRIP - 55} conv={conv} decl={decl} />}
    </g>
  );
}

// símbolo do vértice por tipo (igual ao do mapa): M = losango, P = círculo, V = triângulo
function SimboloVertice({ tipo, cx, cy, r }: { tipo: string; cx: number; cy: number; r: number }) {
  const cor = tipo === 'M' ? '#b45309' : tipo === 'V' ? '#7c3aed' : '#15803d';
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

function Nortes({ cx, cy, conv, decl }: { cx: number; cy: number; conv: number; decl: number }) {
  // NV para cima; NQ rotacionado por -conv; NM por -decl (visual, ângulos pequenos exagerados)
  const seta = (ang: number, label: string, cor: string) => {
    const r = 34;
    const a = (-ang * Math.PI) / 180; // ang em graus a partir do topo, horário
    const tx = cx + r * Math.sin(a), ty = cy - r * Math.cos(a);
    return <g><line x1={cx} y1={cy} x2={tx} y2={ty} stroke={cor} strokeWidth={1.3} /><text x={tx} y={ty - 3} fontSize={9} fontWeight="bold" textAnchor="middle" fill={cor}>{label}</text></g>;
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

// ---------------- Carimbo (coluna direita) ----------------
function Carimbo(props: {
  imovel: ImovelData; ef: ReturnType<typeof valoresEfetivos>; tecnico: TecnicoData; escritorio: EscritorioData;
  glebaNome?: string; confrontantes: Confrontante[]; escalaDenom: number; dataExtenso?: string;
  titulo: string; folha: string; textoLaudo: string; textoConfront: string; escala: number;
}) {
  const { imovel, ef, tecnico, escritorio, glebaNome, escalaDenom, dataExtenso, titulo, folha, textoLaudo, textoConfront, escala } = props;
  const fs = (n: number) => +(n * escala).toFixed(2);
  const x0 = W - CARW;
  const padX = 10;
  const lx = x0 + padX;          // x do conteúdo
  const rx = W - 14;             // borda direita do conteúdo
  const cxc = (x0 + W) / 2;      // centro da coluna
  const temLogo = !!escritorio.logoDataUrl;

  const campos: [string, string][] = [
    ['Título:', titulo],
    ['Folha:', folha],
    ['PROPRIEDADE:', glebaNome || imovel.denominacao || '—'],
    ['PROPRIETÁRIO(S):', imovel.proprietario || '—'],
    ['MUNICÍPIO(S):', imovel.municipio || '—'],
    ['MAT./TRANSC.:', imovel.matricula || '—'],
    ['ÁREA TOTAL (ha):', `${numBR(ef.areaHa, 4)} ha`],
    ['PERÍMETRO (m):', `${numBR(ef.perimetro)} m`],
    ['TRT nº:', tecnico.art || '—'],
    ['ESCALA:', `1 / ${escalaDenom}`],
    ['DATA:', dataExtenso || '—'],
  ];

  // âncoras verticais: cabeçalho no topo, carimbo do escritório no rodapé; o miolo (campos,
  // assinaturas e declarações) é distribuído para preencher a coluna sem vãos.
  const headerBottom = temLogo ? 70 : 24;
  const fieldsTop = headerBottom + 18;
  const fieldGap = 30;
  const fieldsEnd = fieldsTop + campos.length * fieldGap;
  const officeTop = H - 112;
  const declTop = officeTop - 132;
  const sigSpace = declTop - fieldsEnd;
  const sig1 = fieldsEnd + sigSpace * 0.34;
  const sig2 = fieldsEnd + sigSpace * 0.72;

  const assinatura = (yLine: number, linhas: { t: string; b?: boolean; muted?: boolean }[]) => (
    <g>
      <line x1={lx + 6} y1={yLine} x2={rx - 6} y2={yLine} stroke="#000" strokeWidth={0.7} />
      {linhas.map((l, i) => (
        <text key={i} x={cxc} y={yLine + 13 + i * 11} fontSize={fs(l.b ? 9 : 8)} fontWeight={l.b ? 'bold' : 'normal'} fill={l.muted ? '#555' : '#000'} textAnchor="middle">{l.t}</text>
      ))}
    </g>
  );

  return (
    <g>
      <line x1={x0} y1={16} x2={x0} y2={H - 16} stroke="#000" strokeWidth={1.2} />

      {/* cabeçalho: logotipo enquadrado */}
      {temLogo ? <image href={escritorio.logoDataUrl} x={lx} y={18} width={rx - lx} height={44} preserveAspectRatio="xMidYMid meet" /> : null}
      <line x1={lx} y1={headerBottom} x2={rx} y2={headerBottom} stroke="#000" strokeWidth={0.6} />

      {/* campos */}
      {campos.map(([k, v], i) => {
        const y = fieldsTop + i * fieldGap;
        const valor = (v || '—').slice(0, 64);
        return (
          <g key={k}>
            <text x={lx} y={y} fontSize={fs(8)} fontWeight="bold" fill="#444">{k}</text>
            <text x={lx} y={y + 12.5} fontSize={fs(valor.length > 40 ? 8 : 9.5)} fill="#111">{valor}</text>
          </g>
        );
      })}
      <line x1={lx} y1={fieldsEnd - 4} x2={rx} y2={fieldsEnd - 4} stroke="#000" strokeWidth={0.6} />

      {/* assinaturas distribuídas */}
      {assinatura(sig1, [
        { t: imovel.proprietario || 'Proprietário' },
        { t: 'Assinatura do Proprietário', muted: true },
      ])}
      {assinatura(sig2, [
        { t: tecnico.nome, b: true },
        { t: tecnico.formacao },
        { t: `CFT nº ${tecnico.cft} · INCRA: ${tecnico.credenciamentoIncra}` },
        { t: 'Assinatura do Responsável Técnico', muted: true },
      ])}

      {/* declarações (laudo + confrontantes) */}
      <line x1={lx} y1={declTop - 10} x2={rx} y2={declTop - 10} stroke="#000" strokeWidth={0.6} />
      <TextoQuebrado x={lx} y={declTop + 4} fontSize={fs(7)} larguraChars={72} texto={textoLaudo} />
      <text x={lx} y={declTop + 52} fontSize={fs(8)} fontWeight="bold">CONFRONTANTES</text>
      <TextoQuebrado x={lx} y={declTop + 64} fontSize={fs(7)} larguraChars={72} texto={textoConfront} />

      {/* carimbo do escritório (rodapé) */}
      <rect x={x0 + 8} y={officeTop} width={CARW - 16} height={96} fill="none" stroke="#000" strokeWidth={1} />
      <text x={cxc} y={officeTop + 22} fontSize={fs(11)} fontWeight="bold" textAnchor="middle">{escritorio.nome}</text>
      <text x={cxc} y={officeTop + 37} fontSize={fs(8)} textAnchor="middle">{escritorio.ramo}</text>
      <text x={cxc} y={officeTop + 51} fontSize={fs(8)} textAnchor="middle">CNPJ {escritorio.cnpj}</text>
      <text x={cxc} y={officeTop + 65} fontSize={fs(8)} textAnchor="middle">{escritorio.endereco.slice(0, 60)}</text>
      <text x={cxc} y={officeTop + 79} fontSize={fs(8)} textAnchor="middle">Tel./WhatsApp: {escritorio.telefone}</text>
    </g>
  );
}

// SVG não quebra texto sozinho; quebramos em linhas por contagem de caracteres (texto nativo,
// para o PDF rasterizar sem problema — foreignObject costuma falhar na conversão p/ canvas).
function TextoQuebrado({ x, y, fontSize, larguraChars, texto }: { x: number; y: number; fontSize: number; larguraChars: number; texto: string }) {
  const palavras = texto.split(' ');
  const linhas: string[] = [];
  let atual = '';
  for (const p of palavras) {
    if ((atual + ' ' + p).trim().length > larguraChars) { linhas.push(atual.trim()); atual = p; }
    else atual = (atual + ' ' + p).trim();
  }
  if (atual) linhas.push(atual.trim());
  return (
    <text x={x} y={y} fontSize={fontSize} fill="#000">
      {linhas.map((l, i) => <tspan key={i} x={x} dy={i === 0 ? 0 : fontSize * 1.25}>{l}</tspan>)}
    </text>
  );
}
