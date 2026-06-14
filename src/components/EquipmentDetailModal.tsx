import { useState } from 'react';
import { MapPin, Clock, Shield, FileText, Settings, Calendar } from 'lucide-react';
import type { Equipment } from '@/types';
import Modal from './Modal';
import Tabs from './Tabs';
import StatusBadge from './StatusBadge';
import { useAppStore } from '@/store/useAppStore';
import { useNavigate } from 'react-router-dom';

interface EquipmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: Equipment | null;
}

const tabItems = [
  { key: 'params', label: '技术参数' },
  { key: 'manual', label: '操作说明' },
  { key: 'safety', label: '安全要求' },
];

export default function EquipmentDetailModal({
  isOpen,
  onClose,
  equipment,
}: EquipmentDetailModalProps) {
  const [activeTab, setActiveTab] = useState('params');
  const { getDepartmentById, getEquipmentTypeById, setSelectedEquipment } = useAppStore();
  const navigate = useNavigate();

  if (!equipment) return null;

  const department = getDepartmentById(equipment.departmentId);
  const type = getEquipmentTypeById(equipment.typeId);

  const handleReserve = () => {
    setSelectedEquipment(equipment.id);
    navigate('/calendar');
    onClose();
  };

  const isDisabled = equipment.status === 'disabled' || equipment.status === 'maintenance';

  const renderTabContent = () => {
    switch (activeTab) {
      case 'params':
        return (
          <div className="space-y-3">
            {Object.entries(equipment.technicalParams).map(([key, value]) => (
              <div key={key} className="flex justify-between py-2 border-b border-neutral-100 last:border-0">
                <span className="text-sm text-neutral-500">{key}</span>
                <span className="text-sm font-medium text-neutral-800">{value}</span>
              </div>
            ))}
          </div>
        );
      case 'manual':
        return (
          <div className="space-y-2">
            {equipment.operationManual.split('\n').map((line, i) => (
              <p key={i} className="text-sm text-neutral-600 leading-relaxed">
                {line}
              </p>
            ))}
          </div>
        );
      case 'safety':
        return (
          <div className="space-y-2">
            {equipment.safetyRequirement.split('\n').map((line, i) => (
              <p key={i} className="text-sm text-neutral-600 leading-relaxed">
                {line}
              </p>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title="设备详情">
      <div className="space-y-6">
        <div className="flex gap-6">
          <div className="w-48 h-48 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0">
            <img
              src={equipment.image}
              alt={equipment.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <h2 className="text-xl font-bold text-neutral-800">{equipment.name}</h2>
              <StatusBadge status={equipment.status} type="equipment" />
            </div>
            <p className="text-sm text-neutral-500 mb-4">{type?.name}</p>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <MapPin className="w-4 h-4 text-neutral-400" />
                <span>{equipment.location}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <Clock className="w-4 h-4 text-neutral-400" />
                <span>{department?.name}</span>
              </div>
            </div>

            <p className="mt-4 text-sm text-neutral-600 leading-relaxed">
              {equipment.description}
            </p>
          </div>
        </div>

        <Tabs items={tabItems} activeKey={activeTab} onChange={setActiveTab} />

        <div className="min-h-[160px] py-2">{renderTabContent()}</div>

        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
          <button onClick={onClose} className="btn-secondary">
            关闭
          </button>
          <button
            onClick={handleReserve}
            disabled={isDisabled}
            className="btn-primary"
          >
            <Calendar className="w-4 h-4" />
            立即预约
          </button>
        </div>
      </div>
    </Modal>
  );
}
