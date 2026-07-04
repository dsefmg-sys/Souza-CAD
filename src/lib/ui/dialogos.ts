'use client';

// Diálogos PRÓPRIOS do app (não as janelas cruas do navegador). Qualquer arquivo importa e usa
// `await confirmar(...)`, `await avisar(...)`, `await perguntar(...)`. Um host (DialogosHost, montado
// no layout) registra o tratador de verdade; enquanto não há host, cai nas janelas do navegador
// (fallback seguro pra SSR/testes).

export interface ConfirmOpts { titulo?: string; mensagem: string; okLabel?: string; cancelLabel?: string; perigo?: boolean }
export interface AvisoOpts { titulo?: string; mensagem: string; okLabel?: string }
export interface PromptOpts { titulo?: string; mensagem?: string; valorInicial?: string; placeholder?: string }

export interface TratadorDialogos {
  confirmar: (o: ConfirmOpts) => Promise<boolean>;
  avisar: (o: AvisoOpts) => Promise<void>;
  perguntar: (o: PromptOpts) => Promise<string | null>;
}

let tratador: TratadorDialogos | null = null;
export function registrarDialogos(h: TratadorDialogos | null) { tratador = h; }

export function confirmar(o: ConfirmOpts): Promise<boolean> {
  if (tratador) return tratador.confirmar(o);
  return Promise.resolve(typeof window !== 'undefined' ? window.confirm(o.mensagem) : false);
}
export function avisar(o: AvisoOpts): Promise<void> {
  if (tratador) return tratador.avisar(o);
  if (typeof window !== 'undefined') window.alert(o.mensagem);
  return Promise.resolve();
}
export function perguntar(o: PromptOpts): Promise<string | null> {
  if (tratador) return tratador.perguntar(o);
  return Promise.resolve(typeof window !== 'undefined' ? window.prompt(o.mensagem ?? '', o.valorInicial ?? '') : null);
}
