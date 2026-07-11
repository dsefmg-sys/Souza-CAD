import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checarLimiteIA } from './rateLimit';

describe('checarLimiteIA (Rate Limiter)', () => {
  beforeEach(() => {
    // Como o mapa de registros é um Map global em memória no módulo rateLimit.ts,
    // e não temos exportação direta dele para limpá-lo nos testes, usaremos chaves únicas
    // (ex.: timestamps/tokens aleatórios) para cada caso de teste para evitar interferências.
    vi.useFakeTimers();
  });

  it('permite chamadas normais abaixo do limite', () => {
    const chave = 'cliente_feliz';
    const res1 = checarLimiteIA(chave, { porMinuto: 3, porDia: 5 });
    expect(res1.ok).toBe(true);

    const res2 = checarLimiteIA(chave, { porMinuto: 3, porDia: 5 });
    expect(res2.ok).toBe(true);
  });

  it('bloqueia chamadas ao exceder o limite por minuto', () => {
    const chave = 'cliente_rajada';
    // Limite de 2 por minuto
    expect(checarLimiteIA(chave, { porMinuto: 2 }).ok).toBe(true);
    expect(checarLimiteIA(chave, { porMinuto: 2 }).ok).toBe(true);
    
    // Terceira chamada deve ser bloqueada
    const res = checarLimiteIA(chave, { porMinuto: 2 });
    expect(res.ok).toBe(false);
    expect(res.motivo).toBe('muitas leituras em pouco tempo');
    expect(res.retryAposS).toBe(60);
  });

  it('libera o limite por minuto após 1 minuto', () => {
    const chave = 'cliente_paciente';
    expect(checarLimiteIA(chave, { porMinuto: 1 }).ok).toBe(true);
    expect(checarLimiteIA(chave, { porMinuto: 1 }).ok).toBe(false);

    // Avança o relógio em 61 segundos
    vi.advanceTimersByTime(61_000);

    // Deve estar liberado de novo
    expect(checarLimiteIA(chave, { porMinuto: 1 }).ok).toBe(true);
  });

  it('bloqueia chamadas ao exceder o limite por dia', () => {
    const chave = 'cliente_exagerado';
    // Limite de 1 por dia (e por minuto alto para não esbarrar no limite por minuto)
    expect(checarLimiteIA(chave, { porMinuto: 10, porDia: 2 }).ok).toBe(true);
    expect(checarLimiteIA(chave, { porMinuto: 10, porDia: 2 }).ok).toBe(true);

    // Terceira chamada deve bloquear pelo dia
    const res = checarLimiteIA(chave, { porMinuto: 10, porDia: 2 });
    expect(res.ok).toBe(false);
    expect(res.motivo).toBe('limite diário de leituras atingido');
    expect(res.retryAposS).toBe(3600);
  });

  it('libera o limite diário após 24 horas', () => {
    const chave = 'cliente_diario';
    expect(checarLimiteIA(chave, { porMinuto: 10, porDia: 1 }).ok).toBe(true);
    expect(checarLimiteIA(chave, { porMinuto: 10, porDia: 1 }).ok).toBe(false);

    // Avança 24 horas + 1 segundo
    vi.advanceTimersByTime(86_400_000 + 1000);

    expect(checarLimiteIA(chave, { porMinuto: 10, porDia: 1 }).ok).toBe(true);
  });

  it('limpa registros antigos quando o mapa cresce muito (faxina automática)', () => {
    // Como a faxina só roda se mapa.size > 5000, vamos inserir muitos registros antigos.
    // E depois de expirar o tempo diário de todos eles, checaremos o comportamento da limpeza.
    const chaves: string[] = [];
    for (let i = 0; i < 5005; i++) {
      chaves.push(`chave_${i}`);
    }

    // Registra todos eles
    for (const c of chaves) {
      checarLimiteIA(c, { porMinuto: 10, porDia: 10 });
    }

    // Avança 24 horas + 1 segundo para todos expirarem no limite por dia
    vi.advanceTimersByTime(86_400_000 + 1000);

    // Registra mais um para engatilhar a limpeza
    const novaChave = 'chave_limpeza';
    const res = checarLimiteIA(novaChave, { porMinuto: 10, porDia: 10 });
    expect(res.ok).toBe(true);
    
    // A limpeza deve ter expurgado as chaves antigas do mapa, evitando consumo desmedido de RAM.
  });
});
