import { MapPin, Clock, AlertTriangle, Info } from 'lucide-react';
import type { Equipment } from '@/types';
import StatusBadge from './StatusBadge';
import { useAppStore } from '@/store/useAppStore';

interface EquipmentCardProps {
  equipment: Equipment;
  onViewDetail: (equipment: Equipment) => void;
  onReserve: (equipment: Equipment) => void;
  availabilityDetail?: {
    available: boolean;
    reason?: string;
    ruleType?: 'status' | 'holiday' | 'exception' | 'schedule' | 'conflict' | 'expired';
    alternativeWindow?: string;
  };
}

export default function EquipmentCard({ equipment, onViewDetail, onReserve, availabilityDetail }: EquipmentCardProps) {
  const { getDepartmentById, getEquipmentTypeById } = useAppStore();
  const department = getDepartmentById(equipment.departmentId);
  const type = getEquipmentTypeById(equipment.typeId);

  const isDisabled = equipment.status === 'disabled' || equipment.status === 'maintenance';

  const ruleBadgeInfo = () => {
    if (!availabilityDetail || availabilityDetail.available) return null;
    switch (availabilityDetail.ruleType) {
      case 'holiday':
        return { bg: 'bg-danger-50', text: 'text-danger-700', border: 'border-danger-100', icon: <AlertTriangle className="w-3 h-3" />, label: '节假日' };
      case 'exception':
        return { bg: 'bg-warning-50', text: 'text-warning-700', border: 'border-warning-100', icon: <AlertTriangle className="w-3 h-3" />, label: '临时闭馆' };
      case 'schedule':
        return { bg: 'bg-neutral-50', text: 'text-neutral-600', border: 'border-neutral-200', icon: <Info className="w-3 h-3" />, label: '不在开放时段' };
      case 'conflict':
        return { bg: 'bg-primary-50', text: 'text-primary-700', border: 'border-primary-100', icon: <Info className="w-3 h-3" />, label: '已被预约' };
      case 'expired':
        return { bg: 'bg-neutral-50', text: 'text-neutral-600', border: 'border-neutral-200', icon: <Info className="w-3 h-3" />, label: '已过期' };
      case 'status':
        return { bg: 'bg-danger-50', text: 'text-danger-700', border: 'border-danger-100', icon: <AlertTriangle className="w-3 h-3" />, label: '设备不可用' };
      default:
        return null;
    }
  };

  const badge = ruleBadgeInfo();

  return (
    <div className="card card-hover overflow-hidden group">
      <div className="relative h-48 bg-neutral-100 overflow-hidden">
        <img
          src={equipment.image}
          alt={equipment.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-3 right-3">
          <StatusBadge status={equipment.status} type="equipment" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-base font-semibold text-neutral-800 line-clamp-1 flex-1">
            {equipment.name}
          </h3>
          {badge && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${badge.bg} ${badge.text} ${badge.border} flex-shrink-0`}
              title={availabilityDetail?.reason}>
              {badge.icon}
              {badge.label}
            </span>
          )}
        </div>
        <p className="text-sm text-neutral-500 mb-3">{type?.name}</p>

        <div className="flex items-center gap-4 text-xs text-neutral-500 mb-3">
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            <span className="line-clamp-1">{equipment.location}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{department?.name}</span>
          </div>
        </div>

        {/* 规则命中原因 */}
        {availabilityDetail && !availabilityDetail.available && availabilityDetail.reason && (
          <div className="mb-3 p-2 rounded bg-neutral-50 border border-neutral-100">
            <p className="text-xs text-neutral-600 line-clamp-2">{availabilityDetail.reason}</p>
            {availabilityDetail.alternativeWindow && (
              <p className="text-[11px] text-success-600 mt-0.5">
                建议时段：{availabilityDetail.alternativeWindow}
              </p>
            )}
          </div>
        )}

        <p className="text-sm text-neutral-600 line-clamp-2 mb-4">{equipment.description}</p>

        <div className="flex gap-2">
          <button
            onClick={() => onViewDetail(equipment)}
            className="flex-1 btn-secondary btn-sm"
          >
            查看详情
          </button>
          <button
            onClick={() => onReserve(equipment)}
            disabled={isDisabled || (availabilityDetail && !availabilityDetail.available)}
            className="flex-1 btn-primary btn-sm"
          >
            {availabilityDetail && !availabilityDetail.available ? '不可预约' : '立即预约'}
          </button>
        </div>
      </div>
    </div>
  );
}
