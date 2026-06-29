'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** chame para tentar recarregar o trecho que falhou */
  onReset?: () => void;
}
interface State { erro: boolean }

/**
 * Captura erros de render de uma sub-árvore (ex.: falha de ChunkLoad ao carregar um componente
 * dinâmico como o satélite) e mostra um fallback, em vez de derrubar a tela inteira.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { erro: false };

  static getDerivedStateFromError(): State {
    return { erro: true };
  }

  reset = () => {
    this.setState({ erro: false });
    this.props.onReset?.();
  };

  render() {
    if (this.state.erro) {
      return this.props.fallback ?? (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
          <span>Não consegui carregar esta parte. O resto da tela continua funcionando.</span>
          <button className="rounded border px-3 py-1 text-xs font-semibold hover:bg-muted" onClick={this.reset}>Tentar de novo</button>
        </div>
      );
    }
    return this.props.children;
  }
}
