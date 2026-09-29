import type { KundaliData } from '@/types/kundali';

// Centre point of each house (1-12) in a 400x400 North Indian chart.
const CENTRES: Record<number, [number, number]> = {
  1: [200, 100], 2: [100, 45], 3: [45, 100], 4: [100, 200],
  5: [45, 300], 6: [100, 355], 7: [200, 300], 8: [300, 355],
  9: [355, 300], 10: [300, 200], 11: [355, 100], 12: [300, 45],
};

export default function KundaliChart({ data }: { data: KundaliData }) {
  return (
    <svg viewBox="0 0 400 400" className="mx-auto w-full max-w-md" role="img" aria-label="Kundali chart">
      <g fill="none" stroke="#1e293b" strokeWidth="2">
        <rect x="1" y="1" width="398" height="398" />
        <line x1="0" y1="0" x2="400" y2="400" />
        <line x1="400" y1="0" x2="0" y2="400" />
        <polygon points="200,0 400,200 200,400 0,200" />
      </g>

      {Object.entries(CENTRES).map(([h, [x, y]]) => {
        const house = Number(h);
        const sign = ((data.ascendantSign + house - 2) % 12) + 1; // sign number in this house
        const planets = data.planets.filter((p) => p.house === house);
        return (
          <text key={house} x={x} y={y - 8} textAnchor="middle" fontSize="13" fill="#0f172a">
            <tspan x={x} fill="#94a3b8" fontSize="11">{sign}</tspan>
            {planets.map((p, i) => (
              <tspan key={p.short} x={x} dy={i === 0 ? 16 : 14} fontWeight="600">
                {p.short}
              </tspan>
            ))}
          </text>
        );
      })}
    </svg>
  );
}
