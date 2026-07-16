'use client';

import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight, Ruler, Copy, Check } from 'lucide-react';
import { utmParaGeo, geoParaUtm, grausParaDMS } from '@/lib/topo/coords';
import { azimute, distancia, azimuteDMS, numBR } from '@/lib/topo/geometry';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  zona: number;
  hemisferio: 'N' | 'S';
}

type Aba = 'converter' | 'distancia' | 'lote';

function Campo({ label, value, onChange, ph }: { label: string; value: string; onChange: (v: string) => void; ph?: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-left">
      <span className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">{label}</span>
      <input className="h-11 rounded-lg border bg-[#05140b] dark:bg-[#05140b] border-border/85 px-3 text-sm font-mono text-foreground focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none placeholder:text-muted-foreground/50" value={value} placeholder={ph} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function num(v: string): number {
  return Number(String(v).replace(',', '.').trim());
}

export default function CalculadoraModal({ open, onOpenChange, zona, hemisferio }: Props) {
  const [aba, setAba] = useState<Aba>('converter');
  const [zonaSel, setZonaSel] = useState(String(zona));
  const [hemi, setHemi] = useState<'N' | 'S'>(hemisferio);

  // --- conversão UTM <-> geo ---
  const [leste, setLeste] = useState('');
  const [norte, setNorte] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');

  const z = Math.round(num(zonaSel));
  const zOk = Number.isFinite(z) && z >= 1 && z <= 60;

  function utmParaGeoCalc() {
    const e = num(leste), n = num(norte);
    if (!zOk || !Number.isFinite(e) || !Number.isFinite(n)) return;
    const g = utmParaGeo(e, n, z, hemi);
    setLat(g.lat.toFixed(8)); setLon(g.lon.toFixed(8));
  }
  function geoParaUtmCalc() {
    const la = num(lat), lo = num(lon);
    if (!zOk || !Number.isFinite(la) || !Number.isFinite(lo)) return;
    const u = geoParaUtm(la, lo, z, hemi);
    setLeste(u.leste.toFixed(3)); setNorte(u.norte.toFixed(3));
  }
  const dmsLat = Number.isFinite(num(lat)) && lat ? grausParaDMS(num(lat), { estilo: 'memorial' }) : '';
  const dmsLon = Number.isFinite(num(lon)) && lon ? grausParaDMS(num(lon), { estilo: 'memorial' }) : '';

  // --- distância e azimute entre dois pontos UTM ---
  const [ea, setEa] = useState(''); const [na, setNa] = useState('');
  const [eb, setEb] = useState(''); const [nb, setNb] = useState('');
  const A = { e: num(ea), n: num(na) }, B = { e: num(eb), n: num(nb) };
  const valido2 = [A.e, A.n, B.e, B.n].every((x) => Number.isFinite(x)) && (A.e !== B.e || A.n !== B.n) && !!(ea && na && eb && nb);
  const dist = valido2 ? distancia(A, B) : null;
  const az = valido2 ? azimute(A, B) : null;

  // --- conversão em lote ---
  const [loteIn, setLoteIn] = useState('');
  const [loteDir, setLoteDir] = useState<'u2g' | 'g2u'>('u2g');
  const [virgula, setVirgula] = useState(true); // vírgula = separador decimal
  const [copiado, setCopiado] = useState(false);

  const lote = useMemo(() => {
    const linhas = loteIn.split(/\r?\n/);
    const sep = virgula ? /[\s;\t]+/ : /[\s,;\t]+/;
    const parseNum = (t: string) => Number((virgula ? t.replace(',', '.') : t).trim());
    type Linha = { rotulo: string; x: string; y: string; ok: boolean };
    const out: Linha[] = [];
    let nOk = 0;
    for (const raw of linhas) {
      const linha = raw.trim();
      if (!linha) continue;
      const toks = linha.split(sep).filter(Boolean);
      const todosNums: { val: number; raw: string; idx: number }[] = [];
      toks.forEach((t, idx) => {
        const v = parseNum(t);
        if (Number.isFinite(v) && /\d/.test(t)) {
          todosNums.push({ val: v, raw: t, idx });
        }
      });

      let numsValidos = [...todosNums];
      if (numsValidos.length > 2) {
        if (loteDir === 'u2g') {
          numsValidos = numsValidos.filter((n) => Math.abs(n.val) > 10000);
        } else {
          numsValidos = numsValidos.filter((n) => Math.abs(n.val) <= 180);
        }
      }

      let rotParsed = '';
      if (numsValidos.length >= 3 && !numsValidos[0].raw.includes('.') && !numsValidos[0].raw.includes(',')) {
        rotParsed = numsValidos[0].raw;
        numsValidos = numsValidos.slice(1);
      }

      if (numsValidos.length >= 2) {
        const xVal = numsValidos[0].val;
        const yVal = numsValidos[1].val;
        let rot = rotParsed;
        if (!rot && toks.length > numsValidos.length) {
          const idxs = new Set(numsValidos.map((n) => n.idx));
          const textTokens = toks.filter((_, i) => !idxs.has(i));
          rot = textTokens.join(' ');
        }
        if (loteDir === 'u2g') {
          const g = utmParaGeo(xVal, yVal, z, hemi);
          out.push({ rotulo: rot, x: g.lat.toFixed(8), y: g.lon.toFixed(8), ok: true });
          nOk++;
        } else {
          const u = geoParaUtm(xVal, yVal, z, hemi);
          out.push({ rotulo: rot, x: u.leste.toFixed(3), y: u.norte.toFixed(3), ok: true });
          nOk++;
        }
      } else {
        out.push({ rotulo: 'inválido', x: '—', y: '—', ok: false });
      }
    }
    return { linhas: out, nOk };
  }, [loteIn, loteDir, virgula, z, hemi]);

  function copiarLote() {
    const txt = lote.linhas.filter((l) => l.ok).map((l) => [l.rotulo, l.x, l.y].filter(Boolean).join('\t')).join('\n');
    if (!txt) return;
    navigator.clipboard?.writeText(txt).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 1500); }).catch(() => {});
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-background shadow-2xl p-6 rounded-xl overflow-hidden">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2.5 text-lg font-black text-foreground">
            <Ruler className="size-5.5 text-emerald-500 animate-pulse" /> Calculadora Topográfica
          </DialogTitle>
        </DialogHeader>

        {/* Configurações Globais do Fuso e Hemisfério */}
        <div className="flex items-center gap-4 text-sm border border-emerald-500/20 bg-emerald-500/5 p-4 rounded-xl justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Fuso Padrão:</span>
            <input className="w-14 h-8 rounded-md border bg-background border-border/80 px-2 text-sm text-center font-bold font-mono" value={zonaSel} onChange={(e) => setZonaSel(e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Hemisfério:</span>
            <div className="flex gap-0.5 border rounded-lg p-0.5 bg-background border-border/60">
              {(['S', 'N'] as const).map((h) => (
                <button key={h} type="button" className={`h-7 px-3.5 rounded-md text-xs font-bold transition-all ${hemi === h ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`} onClick={() => setHemi(h)}>{h}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Abas como Segmented Control */}
        <div className="flex gap-1.5 bg-zinc-100 dark:bg-zinc-900/60 p-1.5 rounded-xl border border-border/40 my-2">
          <button className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-lg ${aba === 'converter' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setAba('converter')}>Conversão UTM ↔ Geo</button>
          <button className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-lg ${aba === 'distancia' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setAba('distancia')}>Distância & Azimute</button>
          <button className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-lg ${aba === 'lote' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setAba('lote')}>Conversão em Lote</button>
        </div>

        {aba === 'converter' ? (
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Este (E) - Metros" value={leste} onChange={setLeste} ph="ex.: 290000.000" />
              <Campo label="Norte (N) - Metros" value={norte} onChange={setNorte} ph="ex.: 7720000.000" />
            </div>
            <div className="flex justify-center gap-3">
              <Button className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 transition-all text-xs shadow-md" onClick={utmParaGeoCalc}>UTM → Geo <ArrowLeftRight className="size-3.5" /></Button>
              <Button className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 transition-all text-xs shadow-md" onClick={geoParaUtmCalc}><ArrowLeftRight className="size-3.5" /> Geo → UTM</Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Latitude (Graus Decimais)" value={lat} onChange={setLat} ph="-20.59180" />
              <Campo label="Longitude (Graus Decimais)" value={lon} onChange={setLon} ph="-42.00344" />
            </div>
            {(dmsLat || dmsLon) && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-center text-sm font-mono leading-relaxed text-foreground">
                {dmsLat && <div className="flex justify-between border-b border-border/20 pb-1.5 mb-1.5"><span>Lat (DMS):</span><span className="font-bold text-emerald-600 dark:text-emerald-400">{dmsLat}</span></div>}
                {dmsLon && <div className="flex justify-between"><span>Lon (DMS):</span><span className="font-bold text-emerald-600 dark:text-emerald-400">{dmsLon}</span></div>}
              </div>
            )}
          </div>
        ) : aba === 'distancia' ? (
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Ponto A — Este" value={ea} onChange={setEa} ph="Ex.: 290000" />
              <Campo label="Ponto A — Norte" value={na} onChange={setNa} ph="Ex.: 7720000" />
              <Campo label="Ponto B — Este" value={eb} onChange={setEb} ph="Ex.: 290100" />
              <Campo label="Ponto B — Norte" value={nb} onChange={setNb} ph="Ex.: 7720100" />
            </div>
            {dist != null && az != null ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center space-y-1">
                <div className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400">{numBR(dist, 3)} m</div>
                <div className="text-sm font-mono text-foreground font-semibold">Azimute: {numBR(az, 4)}° ({azimuteDMS(az)})</div>
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground p-3 border border-dashed rounded-lg">Preencha os quatro valores UTM para obter a distância e azimute de quadrícula.</p>
            )}
            <p className="text-[11px] text-muted-foreground leading-relaxed">Nota: Distância e azimute calculados no plano UTM (quadrícula). Para obter a distância real geodésica oficial SGL, consulte a tabela de lados do projeto.</p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex gap-0.5 border rounded-lg p-0.5 bg-[#05140b] border-border/60">
                <button type="button" className={`h-7 px-3.5 rounded-md text-xs font-bold transition-all ${loteDir === 'u2g' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`} onClick={() => setLoteDir('u2g')}>UTM → Geo</button>
                <button type="button" className={`h-7 px-3.5 rounded-md text-xs font-bold transition-all ${loteDir === 'g2u' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`} onClick={() => setLoteDir('g2u')}>Geo → UTM</button>
              </div>
              <span className="ml-auto text-muted-foreground font-medium">Decimal:</span>
              <div className="flex gap-0.5 border rounded-lg p-0.5 bg-[#05140b] border-border/60">
                <button type="button" className={`h-7 px-3.5 rounded-md text-xs font-bold transition-all ${virgula ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`} onClick={() => setVirgula(true)}>Vírgula</button>
                <button type="button" className={`h-7 px-3.5 rounded-md text-xs font-bold transition-all ${!virgula ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`} onClick={() => setVirgula(false)}>Ponto</button>
              </div>
            </div>
            <textarea
              className="h-32 w-full resize-y rounded-lg border bg-[#05140b] border-border/80 px-3 py-2 text-xs font-mono text-foreground focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none placeholder:text-muted-foreground/45"
              value={loteIn}
              onChange={(e) => setLoteIn(e.target.value)}
              placeholder={loteDir === 'u2g' ? 'Uma linha por ponto. Ex.:\nP1 290000,000 7720000,000\nP2 290100,500 7720050,250' : 'Uma linha por ponto. Ex.:\nP1 -20,591800 -42,003440\nP2 -20,591500 -42,003100'}
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed">Aceita uma linha por ponto contendo {loteDir === 'u2g' ? 'Este e Norte' : 'Latitude e Longitude'}, com rótulo opcional. Separe por espaço, tabulação ou ponto-e-vírgula.</p>
            {lote.linhas.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#87a992]">{lote.nOk} de {lote.linhas.length} convertido{lote.nOk === 1 ? '' : 's'}</span>
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs font-bold" disabled={lote.nOk === 0} onClick={copiarLote}>{copiado ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copiado ? 'Copiado' : 'Copiar Resultados'}</Button>
                </div>
                <div className="max-h-48 overflow-auto rounded-lg border border-border bg-[#05140b]/50">
                  <table className="w-full text-xs font-mono">
                    <thead className="sticky top-0 bg-[#07170d] text-[10px] uppercase text-muted-foreground border-b border-border/85">
                      <tr><th className="px-3 py-1.5 text-left font-bold">Ponto</th><th className="px-3 py-1.5 text-right font-bold">{loteDir === 'u2g' ? 'Latitude' : 'Este'}</th><th className="px-3 py-1.5 text-right font-bold">{loteDir === 'u2g' ? 'Longitude' : 'Norte'}</th></tr>
                    </thead>
                    <tbody>
                      {lote.linhas.map((l, i) => (
                        <tr key={i} className={`border-t border-border/10 ${l.ok ? 'hover:bg-muted/15' : 'bg-destructive/10 text-destructive'}`}>
                          <td className="px-3 py-1.5 font-bold">{l.rotulo || (i + 1)}</td>
                          <td className="px-3 py-1.5 text-right">{l.x}</td>
                          <td className="px-3 py-1.5 text-right">{l.y}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
