'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { fmtDate, fmtDateTime, cls } from '@/lib/utils';
import { Button, Card, PageLoading, StatusBadge, EmptyState, Confirm, notify } from '@/components/ui';
import { PageHeader, Th, Td, TableCard } from '@/components/common';

export default function ShiftsPage() {
  const [shifts, setShifts] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ driverId: '', vehicleId: '', shiftType: 'day', date: '' });
  const [confirmEnd, setConfirmEnd] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [{ shifts }, { drivers }, { vehicles }] = await Promise.all([
        api.get('/shifts'), api.get('/drivers?limit=200'), api.get('/vehicles?limit=200')
      ]);
      setShifts(shifts);
      setDrivers(drivers);
      setVehicles(vehicles);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.driverId || !form.vehicleId) {
      notify('Select both a driver and a vehicle', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.post('/shifts', form);
      notify('Shift assigned');
      setCreateOpen(false);
      setForm({ driverId: '', vehicleId: '', shiftType: 'day', date: '' });
      load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const endShift = async () => {
    try {
      await api.del(`/shifts/${confirmEnd.id}`);
      notify('Shift ended');
      setConfirmEnd(null);
      load();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <div>
      <PageHeader
        title="Shifts"
        subtitle="Assign drivers to vehicles for day or night shifts"
        actions={<Button onClick={() => setCreateOpen(true)}>+ Assign Shift</Button>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {createOpen && (
          <Card title="Assign New Shift" className="lg:col-span-1">
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Driver *</label>
                <select value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                  <option value="">Select driver…</option>
                  {drivers.filter((d) => d.status === 'active').map((d) => (
                    <option key={d.id} value={d.id}>{d.name} — {d.phone || 'no phone'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Vehicle *</label>
                <select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                  <option value="">Select vehicle…</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.vehicleNumber} — {v.typeOfEquipment || v.make || 'Vehicle'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Shift Type *</label>
                <div className="flex gap-2">
                  {['day', 'night'].map((t) => (
                    <button key={t} onClick={() => setForm({ ...form, shiftType: t })}
                      className={cls('flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition', form.shiftType === t ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
                      {t === 'day' ? 'Day' : 'Night'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Date (optional)</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setCreateOpen(false)} className="flex-1">Cancel</Button>
                <Button onClick={create} loading={saving} className="flex-1">Assign Shift</Button>
              </div>
            </div>
          </Card>
        )}

        <div className={cls(createOpen ? 'lg:col-span-2' : 'lg:col-span-3')}>
          <TableCard>
            {loading ? (
              <PageLoading />
            ) : shifts.length === 0 ? (
              <div className="p-6">
                <EmptyState title="No shifts assigned" message="Assign a driver to a vehicle to start a shift." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <Th>Driver</Th>
                      <Th>Vehicle</Th>
                      <Th>Shift</Th>
                      <Th>Date</Th>
                      <Th>Status</Th>
                      <Th>Assigned By</Th>
                      <Th className="text-right">Action</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.map((s) => (
                      <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <Td className="font-semibold">{s.driverName}</Td>
                        <Td className="font-mono text-xs font-bold text-blue-700">{s.vehicleNumber}</Td>
                        <Td><StatusBadge status={s.shiftType} /></Td>
                        <Td>{s.date ? fmtDate(s.date) : '—'}</Td>
                        <Td><StatusBadge status={s.active ? 'active' : 'inactive'} /></Td>
                        <Td>{s.assignedBy || '—'}</Td>
                        <Td className="text-right">
                          {s.active ? (
                            <Button variant="secondary" size="sm" onClick={() => setConfirmEnd(s)}>End Shift</Button>
                          ) : (
                            <span className="text-xs text-slate-400">Ended {fmtDateTime(s.endedAt)}</span>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TableCard>
        </div>
      </div>

      <Confirm
        open={!!confirmEnd}
        title="End shift?"
        message={`End the ${confirmEnd?.shiftType} shift for ${confirmEnd?.driverName} on ${confirmEnd?.vehicleNumber}?`}
        confirmLabel="End Shift"
        onConfirm={endShift}
        onClose={() => setConfirmEnd(null)}
      />
    </div>
  );
}
