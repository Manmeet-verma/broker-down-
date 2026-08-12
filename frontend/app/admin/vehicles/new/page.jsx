'use client';

import { useAuthGuard } from '@/lib/auth';
import { PageLoading } from '@/components/ui';
import { PageHeader } from '@/components/common';
import VehicleForm from '@/components/VehicleForm';

export default function NewVehicle() {
  const { loading } = useAuthGuard('admin');
  if (loading) return <PageLoading />;
  return (
    <div>
      <PageHeader title="Add Vehicle" subtitle="Enter complete vehicle, document and finance details" />
      <VehicleForm />
    </div>
  );
}
