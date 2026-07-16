import { describe, it, expect } from 'vitest';
import { validarTamanhoArquivo, formatarTamanho } from './validarArquivo';

// Cria um File simulado com o tamanho desejado
function fakeFile(nome: string, bytes: number, tipo = 'application/octet-stream'): File {
  // Truque: cria um File com ArrayBuffer do tamanho desejado
  const buf = new Uint8Array(bytes);
  return new File([buf], nome, { type: tipo });
}

describe('formatarTamanho', () => {
  it('formata bytes', () => expect(formatarTamanho(500)).toBe('500 B'));
  it('formata KB', () => expect(formatarTamanho(2048)).toBe('2.0 KB'));
  it('formata MB', () => expect(formatarTamanho(5 * 1024 * 1024)).toBe('5.0 MB'));
  it('formata GB', () => expect(formatarTamanho(2 * 1024 * 1024 * 1024)).toBe('2.00 GB'));
});

describe('validarTamanhoArquivo — OK', () => {
  it('arquivo TXT pequeno: ok', () => {
    const f = fakeFile('pontos.txt', 100 * 1024); // 100 KB
    const r = validarTamanhoArquivo(f);
    expect(r.ok).toBe(true);
    expect(r.erro).toBe('');
    expect(r.categoria).toBe('txt');
    expect(r.tamanhoFormatado).toBe('100.0 KB');
  });

  it('DXF grande mas dentro do limite: ok', () => {
    const f = fakeFile('topografia.dxf', 100 * 1024 * 1024); // 100 MB
    const r = validarTamanhoArquivo(f);
    expect(r.ok).toBe(true);
    expect(r.categoria).toBe('dxf');
  });

  it('GeoJSON médio: ok', () => {
    const f = fakeFile('parcelas.geojson', 10 * 1024 * 1024); // 10 MB
    const r = validarTamanhoArquivo(f);
    expect(r.ok).toBe(true);
    expect(r.categoria).toBe('geojson');
  });
});

describe('validarTamanhoArquivo — erro', () => {
  it('DXF acima de 150MB: erro', () => {
    const f = fakeFile('enorme.dxf', 200 * 1024 * 1024); // 200 MB
    const r = validarTamanhoArquivo(f);
    expect(r.ok).toBe(false);
    expect(r.erro).toContain('enorme.dxf');
    expect(r.erro).toContain('200.0 MB');
    expect(r.erro).toContain('150.0 MB');
    expect(r.categoria).toBe('dxf');
  });

  it('TXT acima de 20MB: erro (TXT de ponto GNSS não devia ser tão grande)', () => {
    const f = fakeFile('gigante.txt', 50 * 1024 * 1024); // 50 MB
    const r = validarTamanhoArquivo(f);
    expect(r.ok).toBe(false);
    expect(r.categoria).toBe('txt');
  });

  it('KML acima de 20MB: erro', () => {
    const f = fakeFile('gigante.kml', 30 * 1024 * 1024); // 30 MB
    const r = validarTamanhoArquivo(f);
    expect(r.ok).toBe(false);
  });

  it('extensão desconhecida cai no fallback TXT (limite 20MB)', () => {
    const f = fakeFile('basura.xyz', 30 * 1024 * 1024); // 30 MB, extensão desconhecida
    const r = validarTamanhoArquivo(f);
    // fallback para txt → 20MB → erro
    expect(r.ok).toBe(false);
    expect(r.categoria).toBe('txt');
  });

  it('sem extensão: fallback para txt', () => {
    const f = fakeFile('semextensao', 1024); // 1 KB
    const r = validarTamanhoArquivo(f);
    expect(r.ok).toBe(true);
    expect(r.categoria).toBe('txt');
  });

  it('mensagem de erro cita onde ajustar o limite (pra facilitar troubleshooting)', () => {
    const f = fakeFile('gigante.dxf', 200 * 1024 * 1024);
    const r = validarTamanhoArquivo(f);
    expect(r.erro).toContain('src/lib/io/validarArquivo.ts');
  });
});

describe('validarTamanhoArquivo — case insensitive na extensão', () => {
  it('.TXT maiúsculo é tratado como txt', () => {
    const f = fakeFile('PONTOS.TXT', 100 * 1024);
    const r = validarTamanhoArquivo(f);
    expect(r.categoria).toBe('txt');
  });
  it('.DXF maiúsculo é tratado como dxf', () => {
    const f = fakeFile('MAPA.DXF', 100 * 1024);
    const r = validarTamanhoArquivo(f);
    expect(r.categoria).toBe('dxf');
  });
});
