import type { Stroke } from '../../../components/PencilStroke';

/**
 * Graph-paper rules for Figma frame "H3" (4244:893).
 * This frame uses fewer rules than H2 and adds the dense pencil bands at the
 * left and right edges (see PencilBands).
 */
export const gridH3: Stroke[] = [
  // Horizontal rules
  { src: '/figma/f2e73.png', left: 0, top: 436, width: 1445, height: 2.001, rotate: -0.08, length: 1445.001 },
  { src: '/figma/bf8dd.png', left: -1, top: 515, width: 1446.999, height: 2, rotate: 0.08, length: 1447 },
  { src: '/figma/f6dc3.png', left: 1, top: 583, width: 1448.999, height: 2, rotate: 0.08, length: 1449 },
  { src: '/figma/58dd8.png', left: 0, top: 655, width: 1446, height: 3.004, rotate: -0.12, length: 1446.003 },
  { src: '/figma/db9ca.png', left: 2, top: 730.84, width: 1445, height: 2.162, rotate: -0.09, length: 1445.001 },
  { src: '/figma/b0338.png', left: 0, top: 805, width: 1448, height: 6, rotate: 0.24, length: 1448.012 },
  { src: '/figma/87c2e.svg', left: 1, top: 934, width: 1443, height: 6.995, rotate: -0.28, length: 1443.017 },

  // Vertical rules
  { src: '/figma/16bc0.png', left: 'calc(8.33% + 133.67px)', top: 0, width: 4.997, height: 1026, rotate: 89.72, length: 1026.012 },
  { src: '/figma/d9c39.png', left: 'calc(16.67% + 89.33px)', top: 0, width: 4.035, height: 1027, rotate: 89.77, length: 1027.008, inset: 2 },
  { src: '/figma/d1111.png', left: 'calc(25% + 39px)', top: 0, width: 4.989, height: 881, rotate: 89.68, length: 881.014 },
  { src: '/figma/0ab8e.png', left: 'calc(25% + 113px)', top: 1, width: 5, height: 937, rotate: 89.69, length: 937.013 },
  { src: '/figma/2bff6.png', left: 'calc(33.33% + 70.67px)', top: -1, width: 2.01, height: 940.001, rotate: 89.88, length: 940.003 },
  { src: '/figma/ab35a.png', left: 'calc(41.67% + 16.33px)', top: -1, width: 5.994, height: 1024, rotate: 89.66, length: 1024.018, inset: 2 },
  { src: '/figma/35f5d.png', left: 'calc(50% - 1px)', top: 0, width: 2.008, height: 937, rotate: 89.88, length: 937.002 },
  { src: '/figma/b1cf2.png', left: 'calc(50% + 69px)', top: 0, width: 5.21, height: 1023.998, rotate: 89.71, length: 1024.011 },
  { src: '/figma/c1a33.png', left: 'calc(58.33% + 19.67px)', top: 2, width: 0, height: 1018, rotate: 90, length: 1018 },
  { src: '/figma/121ec.png', left: 'calc(58.33% + 92.67px)', top: 0, width: 1.999, height: 1024, rotate: 89.89, length: 1024.002, inset: 2 },
];
