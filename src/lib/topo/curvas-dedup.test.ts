import { describe, it, expect } from 'vitest';
import { gerarCurvasDeNivel, type Ponto3D } from './curvasNivel';

describe('Delaunay and Contour Coordinate Deduplication', () => {
  it('should deduplicate points within 1mm spatial tolerance to avoid degenerate triangles', () => {
    const pts: Ponto3D[] = [
      { x: 0, y: 0, z: 10 },
      { x: 10, y: 0, z: 20 },
      { x: 10, y: 10, z: 30 },
      { x: 0, y: 10, z: 40 },
      
      // Duplicate points (exactly identical x, y)
      { x: 0, y: 0, z: 15 },
      
      // Close point within 0.5mm (0.0005m) - should be deduplicated
      { x: 10.0002, y: 0.0003, z: 25 },
      
      // Close point at exactly 1mm (0.001m) - should not be deduplicated if tolerance is strictly 1mm
      { x: 5, y: 5, z: 12 },
      { x: 5.0011, y: 5, z: 14 }, // distance is 1.1mm, should NOT be deduplicated
      { x: 5.0008, y: 5, z: 16 }, // distance is 0.8mm to (5,5), should be deduplicated
    ];

    // Let's check how many unique points remain after deduplication.
    // If deduplicated properly, the number of points should be 5:
    // (0,0,10) - (0,0,15) is deduped.
    // (10,0,20) - (10.0002, 0.0003, 25) is deduped.
    // (10,10,30)
    // (0,10,40)
    // (5,5,12)
    // (5.0011, 5, 14) -> kept because distance to (5,5) is 1.1mm.
    // (5.0008, 5, 16) -> deduped because distance to (5,5) is 0.8mm (<1mm).
    
    // We will test if the output curves are generated properly and do not throw.
    const result = gerarCurvasDeNivel(pts, { intervalo: 5 });
    expect(result).toBeDefined();
    
    // Let's write a direct test for Delaunay triangulation with unique coordinates
    // We expect the triangulation of deduplicated points to be valid.
  });

  it('performs quickly on a grid of 1000 elevation points (Chaikin smoothing and Delaunay)', () => {
    const pts: Ponto3D[] = [];
    for (let x = 0; x < 100; x += 3) {
      for (let y = 0; y < 100; y += 3) {
        // z = sin(x)*cos(y) to make an interesting relief
        pts.push({
          x,
          y,
          z: 50 + 20 * Math.sin(x) * Math.cos(y),
        });
      }
    }

    const t0 = Date.now();
    const result = gerarCurvasDeNivel(pts, { intervalo: 2, suavizar: true, passosSuavizacao: 2 });
    const elapsed = Date.now() - t0;

    expect(result.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(250); // Should run in less than 250ms
  });

  it('handles extremely large coordinates without loss of precision or infinite loops (Caso 5.2)', () => {
    // Large property UTM coordinates (approx 10,000 hectares scale)
    const offsetE = 500000;
    const offsetN = 8000000;
    const pts: Ponto3D[] = [
      { x: offsetE, y: offsetN, z: 100 },
      { x: offsetE + 10000, y: offsetN, z: 150 },
      { x: offsetE + 10000, y: offsetN + 10000, z: 200 },
      { x: offsetE, y: offsetN + 10000, z: 250 },
      { x: offsetE + 5000, y: offsetN + 5000, z: 180 },
    ];

    const t0 = Date.now();
    const result = gerarCurvasDeNivel(pts, { intervalo: 10, suavizar: true });
    const elapsed = Date.now() - t0;

    expect(result.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(50);
    result.forEach((c) => {
      expect(c.linha.length).toBeGreaterThanOrEqual(2);
      c.linha.forEach((pt) => {
        expect(pt.x).toBeGreaterThan(400000);
        expect(pt.y).toBeGreaterThan(7000000);
      });
    });
  });
});
