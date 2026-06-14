import { MapPin, Clock } from 'lucide-react';
import type { Equipment } from '@/types';
import StatusBadge from './StatusBadge';
import { useAppStore } from '@/store/useAppStore';

interface EquipmentCardProps {
  equipment: Equipment;
  onViewDetail: (equipment: Equipment) => void;
  onReserve: (equipment: Equipment) => void;
}

export default function EquipmentCard({ equipment, onViewDetail, onReserve }: EquipmentCardProps) {
  const { getDepartmentById, getEquipmentTypeById } = useAppStore();
  const department = getDepartmentById(equipment.departmentId);
  const type = getEquipmentTypeById(equipment.typeId);

  const isDisabled = equipment.status === 'disabled' || equipment.status === 'maintenance';

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
        <h3 className="text-base font-semibold text-neutral-800 mb-1 line-clamp-1">
          {equipment.name}
        </h3>
        <p className="text-sm text-neutral-500 mb-3">{type?.name}</p>

        <div className="flex items-center gap-4 text-xs text-neutral-500 mb-4">
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            <span className="line-clamp-1">{equipment.location}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{department?.name}</span>
          </div>
        </div>

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
            disabled={isDisabled}
            className="flex-1 btn-primary btn-sm"
          >
            立即预约
          </button>
        </div>
      </div>
    </div>
  );
}
