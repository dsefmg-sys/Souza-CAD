import { describe, it, expect } from 'vitest';
import { precoNoNivel, formatBRL, verificarBloqueioFaturamento } from './assinatura';

describe('Assinatura SaaS e Faturamento', () => {
  describe('precoNoNivel', () => {
    it('calcula o preço proporcional correto com base na porcentagem de fidelidade', () => {
      expect(precoNoNivel(100, 20)).toBe(20);
      expect(precoNoNivel(129, 20)).toBe(25.8);
      expect(precoNoNivel(249, 40)).toBe(99.6);
      expect(precoNoNivel(129, 100)).toBe(129);
      expect(precoNoNivel(129, 0)).toBe(0);
      expect(precoNoNivel(129, -10)).toBe(0);
      expect(precoNoNivel(129, 150)).toBe(129);
    });
  });

  describe('formatBRL', () => {
    it('formata valores numéricos para BRL (R$ X,XX)', () => {
      expect(formatBRL(25.8)).toBe('R$ 25,80');
      expect(formatBRL(129)).toBe('R$ 129,00');
      expect(formatBRL(99.6)).toBe('R$ 99,60');
      expect(formatBRL(0)).toBe('R$ 0,00');
      expect(formatBRL(1234.56)).toBe('R$ 1.234,56');
    });
  });

  describe('verificarBloqueioFaturamento', () => {
    const umDiaMs = 24 * 60 * 60 * 1000;
    const agora = Date.now();

    it('não bloqueia se o status de pagamento não for atrasado', () => {
      const res = verificarBloqueioFaturamento({
        statusPagamento: 'pago',
        atrasadoDesde: agora - 10 * umDiaMs,
        souMaster: false,
        ocultarCobranca: false,
        agora,
      });
      expect(res.bloqueadoPorFaturamento).toBe(false);
      expect(res.diasAtrasoRestantes).toBe(15);
    });

    it('não bloqueia se o usuário for o master administrativo', () => {
      const res = verificarBloqueioFaturamento({
        statusPagamento: 'atrasado',
        atrasadoDesde: agora - 10 * umDiaMs,
        souMaster: true,
        ocultarCobranca: false,
        agora,
      });
      expect(res.bloqueadoPorFaturamento).toBe(false);
      expect(res.diasAtrasoRestantes).toBe(15);
    });

    it('não bloqueia se a cobrança estiver configurada como oculta', () => {
      const res = verificarBloqueioFaturamento({
        statusPagamento: 'atrasado',
        atrasadoDesde: agora - 10 * umDiaMs,
        souMaster: false,
        ocultarCobranca: true,
        agora,
      });
      expect(res.bloqueadoPorFaturamento).toBe(false);
      expect(res.diasAtrasoRestantes).toBe(15);
    });

    it('não bloqueia mas reduz dias restantes quando dentro do limite de 15 dias', () => {
      const res = verificarBloqueioFaturamento({
        statusPagamento: 'atrasado',
        atrasadoDesde: agora - 3 * umDiaMs,
        souMaster: false,
        ocultarCobranca: false,
        agora,
      });
      expect(res.bloqueadoPorFaturamento).toBe(false);
      expect(res.diasAtrasoRestantes).toBe(12); // 15 - 3 = 12
    });

    it('bloqueia completamente quando atraso ultrapassa 15 dias', () => {
      const res = verificarBloqueioFaturamento({
        statusPagamento: 'atrasado',
        atrasadoDesde: agora - 16 * umDiaMs,
        souMaster: false,
        ocultarCobranca: false,
        agora,
      });
      expect(res.bloqueadoPorFaturamento).toBe(true);
      expect(res.diasAtrasoRestantes).toBe(0);
    });
  });
});
