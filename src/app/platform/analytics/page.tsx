"use client";

import Link from "next/link";
import { usePlatformStore } from "@/store/usePlatformStore";

export default function PlatformAnalyticsPage() {
  const analytics = usePlatformStore((s) => s.analytics);
  const leads = usePlatformStore((s) => s.leads);
  const totalVisits = analytics.reduce((a, d) => a + d.visits, 0);
  const totalLeads = leads.length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-stone-50">Site / analytics</h1>
        <p className="mt-1 text-sm text-stone-400">
          Visitas registradas na landing <Link href="/site" className="text-amber-600 hover:underline">/site</Link> (local, mesmo dispositivo).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-stone-800 bg-[#141210] p-4">
          <p className="text-xs uppercase text-stone-500">Visitas (soma)</p>
          <p className="mt-2 font-display text-3xl text-stone-50">{totalVisits}</p>
        </div>
        <div className="rounded-xl border border-stone-800 bg-[#141210] p-4">
          <p className="text-xs uppercase text-stone-500">Leads</p>
          <p className="mt-2 font-display text-3xl text-stone-50">{totalLeads}</p>
        </div>
      </div>

      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-stone-500">
          <tr>
            <th className="py-2">Dia</th>
            <th className="py-2">Visitas</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-800">
          {[...analytics].reverse().slice(0, 14).map((d) => (
            <tr key={d.date}>
              <td className="py-2 text-stone-300">{d.date}</td>
              <td className="py-2 text-stone-400">{d.visits}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
