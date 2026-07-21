'use client';

import { useState, useRef } from 'react';
import { Copy, CheckCheck, Award, ExternalLink, ShieldCheck, FileCheck2, Building2, Pencil, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ImovelData, TecnicoData } from '@/lib/topo/types';
import { numBR } from '@/lib/topo/geometry';
import { rotulosProfissional } from '@/lib/topo/profissional';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  imovel: ImovelData;
  tecnico: TecnicoData | null;
  areaHa: number;
  perimetro: number;
  onChangeImovel?: (im: ImovelData) => void;
}

export default function TrtModal({ open, onOpenChange, imovel, tecnico, areaHa, perimetro, onChangeImovel }: Props) {
  const [copiado, setCopiado] = useState<string | null>(null);
  const trtInputRef = useRef<HTMLInputElement>(null);
  const extras = tecnico?.registrosExtras ?? [];
  const [credencialIdx, setCredencialIdx] = useState(-1);
  const credencial = credencialIdx >= 0 && extras[credencialIdx]
    ? extras[credencialIdx]
    : { formacao: tecnico?.formacao ?? '', conselho: tecnico?.conselho ?? 'CFT', registro: tecnico?.cft ?? '' };
  const rot = rotulosProfissional({ conselho: credencial.conselho });
  const isCrea = rot.termo === 'ART';
  const linkEmitir = isCrea ? 'https://servicos-crea-mg.sitac.com.br/index.php' : 'https://servicos.sinceti.net.br/';

  const isSigefConciliado = !!(imovel.usarValoresSigef && imovel.areaSigefHa);
  const areaUsada = isSigefConciliado ? imovel.areaSigefHa! : areaHa;
  const perimetroUsado = (isSigefConciliado && imovel.perimetroSigef) ? imovel.perimetroSigef : perimetro;

  const linhas: { label: string; valor: string; cor: string; copiavel: boolean }[] = [
    { label: 'Atividade técnica', valor: 'Georreferenciamento de imóvel rural — levantamento topográfico georreferenciado (SIGEF/INCRA)', cor: 'border-l-emerald-500', copiavel: true },
    { label: 'Proprietário / contratante', valor: imovel.proprietario, cor: 'border-l-blue-500', copiavel: true },
    { label: 'CPF/CNPJ do Titular', valor: imovel.cpfProprietario, cor: 'border-l-blue-500', copiavel: true },
    { label: 'Imóvel', valor: imovel.denominacao, cor: 'border-l-purple-500', copiavel: true },
    { label: 'Matrícula', valor: imovel.matricula, cor: 'border-l-purple-500', copiavel: true },
    { label: 'Código do Imóvel (SNCR/INCRA)', valor: imovel.codigoImovelIncra, cor: 'border-l-amber-500', copiavel: true },
    { label: 'Cartório (CNS)', valor: imovel.cns, cor: 'border-l-teal-500', copiavel: true },
    { label: 'Município/UF', valor: imovel.municipio, cor: 'border-l-teal-500', copiavel: true },
    { label: 'Área (ha)', valor: `${numBR(areaUsada, 4)} ha`, cor: 'border-l-emerald-500', copiavel: true },
    { label: 'Perímetro (m)', valor: `${numBR(perimetroUsado)} m`, cor: 'border-l-emerald-500', copiavel: true },
  ];

  function copiar(texto: string, chave: string) {
    const txtFinal = texto.toUpperCase();
    const ok = () => { setCopiado(chave); setTimeout(() => setCopiado(null), 1500); };
    const fallback = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = txtFinal; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.focus(); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta); ok();
      } catch { /* erro */ }
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(txtFinal).then(ok).catch(fallback);
    else fallback();
  }

  function copiarTudo() {
    const txt = linhas
      .filter((l) => l.copiavel && l.valor)
      .map(({ label, valor }) => `${label}: ${valor.toUpperCase()}`)
      .join('\n');
    copiar(txt, '__tudo__');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col p-5 bg-background shadow-2xl rounded-2xl border border-border">
        <DialogHeader className="shrink-0 pb-3 border-b border-border/60 flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2.5 text-base font-black uppercase tracking-wider text-foreground">
            <div className={`flex size-9 items-center justify-center rounded-xl ${isCrea ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'}`}>
              <Award className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span>Dados Oficiais para a {rot.termo}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${isCrea ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'}`}>
                  {rot.conselho}
                </span>
              </div>
              <p className="text-[11px] font-normal text-muted-foreground normal-case">
                Copie os campos preenchidos e abra o sistema do conselho ({isCrea ? 'CREA-MG / SITAC' : 'CFT / SINCETI'}) para emissão.
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Banner de Conciliação SIGEF */}
        {isSigefConciliado ? (
          <div className="flex items-center gap-2.5 p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs font-semibold shrink-0">
            <CheckCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="font-bold">Valores Oficiais Conciliados com o SIGEF:</span> Área de <strong>{numBR(imovel.areaSigefHa, 4)} ha</strong> e Perímetro de <strong>{numBR(imovel.perimetroSigef ?? perimetro)} m</strong> serão copiados para a {rot.termo}.
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-300 text-xs font-medium shrink-0">
            <ShieldCheck className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <span><strong>Aviso de Conciliação:</strong> A área atual (<strong>{numBR(areaHa, 4)} ha</strong>) é o cálculo plano bruto. Se você já gerou o rascunho no SIGEF, recomendamos <strong>conciliar com o SIGEF</strong> na aba Reconciliação antes de emitir a {rot.termo}.</span>
            </div>
          </div>
        )}

        {/* Escolha de credencial (se tiver extras) */}
        {extras.length > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-2.5 shrink-0">
            <Building2 className="size-4 text-indigo-500 shrink-0" />
            <label className="shrink-0 text-xs font-bold text-indigo-600 dark:text-indigo-400">Emitir como:</label>
            <select
              className="h-8 flex-1 rounded-lg border border-indigo-500/30 bg-background px-3 text-xs font-bold uppercase text-foreground outline-none focus:ring-1 focus:ring-indigo-500"
              value={credencialIdx}
              onChange={(e) => setCredencialIdx(Number(e.target.value))}
            >
              <option value={-1}>{(tecnico?.formacao || 'Formação principal').toUpperCase()} — {tecnico?.conselho ?? 'CFT'}{tecnico?.cft ? ` (${tecnico.cft})` : ''}</option>
              {extras.map((r, i) => (
                <option key={i} value={i}>{(r.formacao || r.conselho).toUpperCase()} — {r.conselho}{r.registro ? ` (${r.registro})` : ''}</option>
              ))}
            </select>
          </div>
        )}

        {/* Grid colorido de campos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 p-3 rounded-xl border border-border/80 bg-slate-500/5 overflow-y-auto min-h-0 flex-1">
          {linhas.map(({ label, valor, cor, copiavel }) => (
            <div
              key={label}
              className={`group flex items-center justify-between gap-2 p-2.5 border border-border/60 border-l-4 ${cor} rounded-xl bg-card hover:bg-muted/40 transition-all shadow-2xs`}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[9.5px] uppercase font-black tracking-wider text-muted-foreground">{label}</div>
                <div className="truncate text-xs font-extrabold uppercase text-foreground mt-0.5" title={valor ? valor.toUpperCase() : ''}>
                  {valor ? valor.toUpperCase() : <span className="text-muted-foreground/60 font-normal italic normal-case">DADO AUSENTE</span>}
                </div>
              </div>
              {copiavel && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 shrink-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                  onClick={() => copiar(valor, label)}
                  title={`Copiar ${label}`}
                >
                  {copiado === label ? <CheckCheck className="size-3.5 text-emerald-500 animate-in zoom-in-50" /> : <Copy className="size-3.5" />}
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Barra de ação inferior */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/60 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a href={linkEmitir} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-initial">
              <Button
                size="sm"
                className={`w-full h-9 gap-1.5 font-black uppercase text-xs tracking-wider shadow-md active:scale-98 transition-all ${
                  isCrea ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                <ExternalLink className="size-4" /> Abrir Portal {isCrea ? 'CREA-MG' : 'SINCETI'}
              </Button>
            </a>
            <Button size="sm" variant="outline" className="h-9 gap-1.5 text-xs font-bold" onClick={copiarTudo}>
              {copiado === '__tudo__' ? <CheckCheck className="size-4 text-emerald-500" /> : <Copy className="size-4" />} Copiar Tudo
            </Button>
          </div>

          {/* Campo de vinculo de numero TRT/ART (Totalmente Editavel) */}
          <div
            className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md bg-amber-500/10 border border-amber-500/40 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 rounded-xl px-3 py-1.5 transition-all cursor-text"
            onClick={() => trtInputRef.current?.focus()}
          >
            <FileCheck2 className="size-4 text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[9px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center justify-between">
                <span>Nº do {rot.termo} Emitido (Editável)</span>
              </div>
              <input
                ref={trtInputRef}
                className="w-full bg-transparent border-0 outline-none text-xs font-mono font-bold text-foreground placeholder:text-muted-foreground/60 focus:ring-0 p-0"
                placeholder={`Cole ou digite o nº da ${rot.termo} (ex.: CFT2605777798)`}
                value={imovel.numeroTrt ?? ''}
                onChange={(e) => onChangeImovel?.({ ...imovel, numeroTrt: e.target.value })}
              />
            </div>
            {imovel.numeroTrt ? (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    trtInputRef.current?.focus();
                    trtInputRef.current?.select();
                  }}
                  className="flex items-center gap-1 text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                  title="Número vinculado à planta! Clique para editar a qualquer momento"
                >
                  <ShieldCheck className="size-3" /> VINCULADO <Pencil className="size-2.5 ml-0.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChangeImovel?.({ ...imovel, numeroTrt: '' });
                    trtInputRef.current?.focus();
                  }}
                  className="size-5 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Limpar número do TRT/ART"
                >
                  <X className="size-3" />
                </button>
              </div>
            ) : (
              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full shrink-0">
                Digite ou cole
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
