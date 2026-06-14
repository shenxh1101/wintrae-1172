import type { ReservationStatus, Equipment } from '@/types';

interface StatusBadgeProps {
  status: ReservationStatus | Equipment['status'];
  type?: 'reservation' | 'equipment';
}

const reservationStatusMap: Record<ReservationStatus, { label: string; className: string }> = {
  pending: { label: '待审核', className: 'badge-warning' },
  approved: { label: '已通过', className: 'badge-success' },
  rejected: { label: '已驳回', className: 'badge-danger' },
  'checked-in': { label: '使用中', className: 'badge-primary' },
  completed: { label: '已完成', className: 'badge-neutral' },
  cancelled: { label: '已取消', className: 'badge-neutral' },
};

const equipmentStatusMap: Record<string, { label: string; className: string }> = {
  available: { label: '可预约', className: 'badge-success' },
  'in-use': { label: '使用中', className: 'badge-primary' },
  maintenance: { label: '维护中', className: 'badge-warning' },
  disabled: { label: '已停用', className: 'badge-danger' },
};

export default function StatusBadge({ status, type = 'reservation' }: StatusBadgeProps) {
  const map = type === 'reservation' ? reservationStatusMap : equipmentStatusMap;
  const config = map[status as string];

  if (!config) return null;

  return <span className={config.className}>{config.label}</span>;
}
