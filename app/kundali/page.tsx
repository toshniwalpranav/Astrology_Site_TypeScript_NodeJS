'use client';

import { ReactNode, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import KundaliChart from '@/components/KundaliChart';
import KundaliWallpaper from '@/components/KundaliWallpaper';
import type { BirthDetails, KundaliData } from '@/types/kundali';

const PARCHMENT = '#fdf6e3';

async function buildPdf(el: HTMLElement): Promise<Blob> {
  // html2canvas-pro is used because Tailwind v4 colours (oklch) break plain html2canvas.
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas-pro'),
    import('jspdf'),
  ]);
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: PARCHMENT });
  const pdf = new jsPDF('p', 'mm', 'a4');
  const w = pdf.internal.pageSize.getWidth();
  const h = pdf.internal.pageSize.getHeight();
  const imgH = (canvas.height * w) / canvas.width;
  const img = canvas.toDataURL('image/png');

  let y = 0;
  let left = imgH;
  pdf.addImage(img, 'PNG', 0, y, w, imgH);
  left -= h;
  while (left > 0) {
    y -= h;
    pdf.addPage();
    pdf.addImage(img, 'PNG', 0, y, w, imgH);
    left -= h;
  }
  return pdf.output('blob');
}

// Page background shared by every state (loading, error, result).
function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen bg-[radial-gradient(ellipse_at_center,#2c1440_0%,#140b1f_70%)] px-4 py-10">
      <KundaliWallpaper />
      <div className="relative z-10 mx-auto max-w-3xl">{children}</div>
    </main>
  );
}

// Thin gold line with a diamond in the middle.
function Divider() {
  return (
    <svg viewBox="0 0 300 12" className="mx-auto h-3 w-64" fill="none" stroke="#b8860b" strokeWidth="1.2" aria-hidden>
      <line x1="0" y1="6" x2="130" y2="6" />
      <polygon points="150,0 158,6 150,12 142,6" />
      <line x1="170" y1="6" x2="300" y2="6" />
    </svg>
  );
}

function KundaliView() {
  const params = useSearchParams();
  const printRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<KundaliData | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const details: BirthDetails = useMemo(
    () => ({
      name: params.get('name') ?? '',
      dob: params.get('dob') ?? '',
      tob: params.get('tob') ?? '',
      place: params.get('place') ?? '',
      latitude: params.get('lat') ?? undefined,
      longitude: params.get('lng') ?? undefined,
    }),
    [params],
  );

  useEffect(() => {
    if (!details.name || !details.dob || !details.tob || !details.place) {
      setError('Birth details are missing. Please go back and fill in the form.');
      return;
    }
    fetch('/api/kundali', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(details),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Could not generate the kundali.'))))
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [details]);

  const fileName = `kundali-${details.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;

  const downloadBlob = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onDownload = async () => {
    if (!printRef.current) return;
    setBusy(true);
    try {
      downloadBlob(await buildPdf(printRef.current));
    } finally {
      setBusy(false);
    }
  };

  const onWhatsApp = async () => {
    if (!printRef.current) return;
    setBusy(true);
    try {
      const blob = await buildPdf(printRef.current);
      const file = new File([blob], fileName, { type: 'application/pdf' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Kundali of ${details.name}` });
      } else {
        // Desktop fallback: WhatsApp links cannot attach files, so save the PDF and open a chat.
        downloadBlob(blob);
        const text = encodeURIComponent(`Kundali of ${details.name} (PDF attached)`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
      }
    } catch {
      /* share sheet dismissed */
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <Shell>
        <div className="py-16 text-center">
          <p role="alert" className="text-red-300">{error}</p>
          <Link href="/" className="mt-4 inline-block text-amber-200 underline">Back to home</Link>
        </div>
      </Shell>
    );
  }
  if (!data) {
    return (
      <Shell>
        <p className="py-16 text-center text-amber-100">Generating kundali…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      {/* Everything inside this box becomes the PDF. */}
      <div ref={printRef} className="p-3 text-slate-900" style={{ backgroundColor: PARCHMENT }}>
        <div className="border-2 border-[#b8860b] p-1.5">
          <div className="space-y-8 border border-[#b8860b] p-6">
            <header className="space-y-2 text-center">
              <p className="text-lg text-[#8a5a00]">॥ श्री गणेशाय नमः ॥</p>
              <p className="text-2xl text-[#7a1f3d]">जन्म कुंडली</p>
              <h1 className="text-3xl font-semibold">Janam Kundali</h1>
              <Divider />
              <p className="text-slate-700">
                {details.name} · Born {details.dob} at {details.tob}, {details.place}
              </p>
            </header>

            <section className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <p className="text-slate-600">Lagna (Ascendant)</p>
                <p className="text-lg font-semibold text-[#7a1f3d]">{data.ascendant}</p>
              </div>
              <div>
                <p className="text-slate-600">Moon sign</p>
                <p className="text-lg font-semibold text-[#7a1f3d]">{data.moonSign}</p>
              </div>
              <div>
                <p className="text-slate-600">Nakshatra</p>
                <p className="text-lg font-semibold text-[#7a1f3d]">{data.nakshatra}</p>
              </div>
            </section>

            <Divider />

            <KundaliChart data={data} />

            <Divider />

            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b-2 border-[#b8860b] text-[#7a1f3d]">
                  <th className="py-2 pr-2">Planet</th>
                  <th className="py-2 pr-2">Sign</th>
                  <th className="py-2 pr-2">House</th>
                  <th className="py-2 pr-2">Degree</th>
                  <th className="py-2">Nakshatra</th>
                </tr>
              </thead>
              <tbody>
                {data.planets.map((p) => (
                  <tr key={p.planet} className="border-b border-[#e6d3a3]">
                    <td className="py-2 pr-2 font-medium">{p.planet}</td>
                    <td className="py-2 pr-2">{p.sign}</td>
                    <td className="py-2 pr-2">{p.house}</td>
                    <td className="py-2 pr-2">{p.degree}</td>
                    <td className="py-2">{p.nakshatra}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="text-center text-[#8a5a00]">॥ शुभम् भवतु ॥</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={onDownload}
          disabled={busy}
          className="rounded-md bg-amber-400 px-5 py-3 font-semibold text-slate-950 hover:bg-amber-300 disabled:opacity-50"
        >
          {busy ? 'Preparing PDF…' : 'Download PDF'}
        </button>
        <button
          onClick={onWhatsApp}
          disabled={busy}
          className="rounded-md bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-500 disabled:opacity-50"
        >
          Share on WhatsApp
        </button>
        <Link href="/" className="px-3 py-3 text-amber-200 underline">New kundali</Link>
      </div>
    </Shell>
  );
}

export default function KundaliPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#140b1f] px-4 py-16 text-center text-amber-100">Loading…</main>
      }
    >
      <KundaliView />
    </Suspense>
  );
}