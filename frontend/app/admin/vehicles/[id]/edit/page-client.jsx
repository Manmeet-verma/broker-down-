'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { PageLoading, notify } from '@/components/ui';
import { PageHeader } from '@/components/common';
import VehicleForm, { vehicleToForm } from '@/components/VehicleForm';

export default function EditVehicle() {
  const { id } = useParams();
  const [vehicle, setVehicle] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/vehicles/${id}`).then(({ vehicle }) => {
      setVehicle(vehicle);
      setForm(vehicleToForm(vehicle));
    }).catch((err) => setError(err.message));
  }, [id]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!form) return <PageLoading />;

  return (
    <div>
      <PageHeader title={`Edit Vehicle — ${vehicle.vehicleNumber}`} subtitle="Changes update the existing vehicle record" />
      <VehicleForm initial={form} vehicleId={id} />
    </div>
  );
}
