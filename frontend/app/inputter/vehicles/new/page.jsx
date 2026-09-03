'use client';

import { useAuthGuard } from '@/lib/auth';
import { PageLoading } from '@/components/ui';
import { PageHeader } from '@/components/common';
import VehicleForm from '@/components/VehicleForm';

export default function InputterNewVehicle() {
  const { loading } = useAuthGuard('inputter');
  if (loading) return <PageLoading />;
  return (
    <div>
      <PageHeader title="Add Vehicle" subtitle="Enter complete vehicle details" />
      <VehicleForm />
    </div>
  );
}