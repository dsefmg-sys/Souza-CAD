'use client';

import React, { type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** chame para tentar recarregar o trecho que falhou */
  onReset?: () => void;
  /** avisa o pai que algo quebrou aqui dentro — útil pra logar de verdade (antes o erro sumia sem
   *  rastro nenhum) e, se quiser, tentar de novo sozinho (ex.: falha passageira de rede). */
  onError?: (erro: unknown) => void;
}
interface State { erro: boolean }

/**
 * Captura erros de render de uma sub-árvore (ex.: falha de ChunkLoad ao carregar um componente
 * dinâmico como o satélite) e mostra um fallback, em vez de derrubar a tela inteira.
 * Escrito em sintaxe ES5/prototípica para contornar bugs do compilador Turbopack do Next.js com a palavra-chave 'super'.
 */
function ErrorBoundary(this: any, props: Props) {
  (React.Component as any).call(this, props);
  this.state = { erro: false };
  this.reset = this.reset.bind(this);
}

// Herança de React.Component
ErrorBoundary.prototype = Object.create(React.Component.prototype);
ErrorBoundary.prototype.constructor = ErrorBoundary;

// getDerivedStateFromError estático
(ErrorBoundary as any).getDerivedStateFromError = function (): State {
  return { erro: true };
};

// componentDidCatch: antes o erro era só engolido (sem log nenhum) — impossível saber depois se
// foi falha de rede baixando o chunk, erro de inicialização do Leaflet, ou outra coisa.
ErrorBoundary.prototype.componentDidCatch = function (this: any, erro: unknown) {
  console.error('ErrorBoundary capturou uma falha:', erro);
  this.props.onError?.(erro);
};

// Método reset no prototype
ErrorBoundary.prototype.reset = function (this: any) {
  this.setState({ erro: false });
  this.props.onReset?.();
};

// Método render no prototype
ErrorBoundary.prototype.render = function (this: any) {
  if (this.state.erro) {
    return this.props.fallback ?? (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
        <span>Não consegui carregar esta parte. O resto da tela continua funcionando.</span>
        <button className="rounded-sm border px-3 py-1 text-xs font-semibold hover:bg-muted" onClick={this.reset}>Tentar de novo</button>
      </div>
    );
  }
  return this.props.children;
};

export default ErrorBoundary as any as new (props: Props) => React.Component<Props, State>;
