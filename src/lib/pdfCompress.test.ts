import { describe, it, expect } from 'vitest';
import { compressPdf, unirPdfs } from './pdfCompress';

describe('pdfCompress module', () => {
  it('exporta funções essenciais de compressão e fusão de PDF', () => {
    expect(compressPdf).toBeDefined();
    expect(unirPdfs).toBeDefined();
  });
});
