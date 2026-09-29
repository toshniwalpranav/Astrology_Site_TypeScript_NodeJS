'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import KundaliWallpaper from '@/components/KundaliWallpaper';

type CSC = typeof import('country-state-city');

export default function HomePage() {
  const router = useRouter();
  const { status } = useSession();
  const [csc, setCsc] = useState<CSC | null>(null);
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [tob, setTob] = useState('');
  const [countryCode, setCountryCode] = useState('IN');
  const [stateCode, setStateCode] = useState('');
  const [cityName, setCityName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    import('country-state-city').then(setCsc);
  }, []);

  const countries = useMemo(() => csc?.Country.getAllCountries() ?? [], [csc]);
  const states = useMemo(
    () => (csc && countryCode ? csc.State.getStatesOfCountry(countryCode) : []),
    [csc, countryCode],
  );
  const cities = useMemo(() => {
    if (!csc || !countryCode) return [];
    if (states.length === 0) return csc.City.getCitiesOfCountry(countryCode) ?? [];
    return stateCode ? csc.City.getCitiesOfState(countryCode, stateCode) ?? [] : [];
  }, [csc, countryCode, stateCode, states]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const needsState = states.length > 0;
    if (!name.trim() || !dob || !tob || !countryCode || (needsState && !stateCode) || !cityName) {
      setError('Please fill in all fields, including country, state and city.');
      return;
    }
    setError('');
    const country = countries.find((c) => c.isoCode === countryCode);
    const state = states.find((s) => s.isoCode === stateCode);
    const city = cities.find((c) => c.name === cityName);
    const place = [cityName, state?.name, country?.name].filter(Boolean).join(', ');
    const params = new URLSearchParams({ name: name.trim(), dob, tob, place });
    if (city?.latitude) params.set('lat', city.latitude);
    if (city?.longitude) params.set('lng', city.longitude);
    const url = `/kundali?${params.toString()}`;

    setSubmitting(true);
    if (status === 'authenticated') {
      router.push(url);
    } else {
      // Google login first; after it succeeds the user lands on the kundali page with these details.
      signIn('google', { callbackUrl: url });
    }
  };

  const field =
    'w-full rounded-md border border-amber-200/30 bg-white/5 px-4 py-3 text-base text-amber-50 ' +
    'placeholder:text-amber-100/40 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300/40 ' +
    'disabled:opacity-40 [&>option]:bg-slate-900 [&>option]:text-amber-50';

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_center,#2c1440_0%,#140b1f_70%)] px-4 py-12">
      <KundaliWallpaper />

      <form
        onSubmit={onSubmit}
        noValidate
        className="relative z-10 w-full max-w-md space-y-5 rounded-2xl border border-amber-300/30 bg-[#1a1026]/90 p-8 shadow-2xl backdrop-blur"
      >
        <div className="space-y-1 text-center">
          <p className="text-2xl text-amber-300">जन्म कुंडली</p>
          <h1 className="text-3xl font-semibold text-amber-100">Janam Kundali</h1>
          <p className="text-sm text-amber-100/60">Enter your birth details to get your birth chart.</p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm text-amber-100/80">Full name</span>
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block space-y-1.5">
            <span className="text-sm text-amber-100/80">Date of birth</span>
            <input type="date" className={field} value={dob} onChange={(e) => setDob(e.target.value)} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm text-amber-100/80">Time of birth</span>
            <input type="time" className={field} value={tob} onChange={(e) => setTob(e.target.value)} />
          </label>
        </div>

        <fieldset className="space-y-3">
          <legend className="mb-1.5 text-sm text-amber-100/80">Place of birth</legend>

          <select
            aria-label="Country"
            className={field}
            value={countryCode}
            disabled={!csc}
            onChange={(e) => { setCountryCode(e.target.value); setStateCode(''); setCityName(''); }}
          >
            <option value="">{csc ? 'Select country' : 'Loading…'}</option>
            {countries.map((c) => (
              <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
            ))}
          </select>

          <select
            aria-label="State"
            className={field}
            value={stateCode}
            disabled={!countryCode || states.length === 0}
            onChange={(e) => { setStateCode(e.target.value); setCityName(''); }}
          >
            <option value="">{countryCode && states.length === 0 && csc ? 'No states listed' : 'Select state'}</option>
            {states.map((s) => (
              <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
            ))}
          </select>

          <select
            aria-label="City"
            className={field}
            value={cityName}
            disabled={cities.length === 0}
            onChange={(e) => setCityName(e.target.value)}
          >
            <option value="">Select city</option>
            {cities.map((c, i) => (
              <option key={`${c.name}-${i}`} value={c.name}>{c.name}</option>
            ))}
          </select>
        </fieldset>

        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-amber-400 px-4 py-3 text-base font-semibold text-slate-950 hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:opacity-60"
        >
          {submitting ? 'Please wait…' : 'Generate Kundali'}
        </button>
        <p className="text-center text-xs text-amber-100/50">You will sign in with Google to continue.</p>
      </form>
    </main>
  );
}