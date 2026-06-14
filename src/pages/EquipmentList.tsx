import { useState, useMemo } from 'react';
import { Search, Filter, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import type { Equipment } from '@/types';
import EquipmentCard from '@/components/EquipmentCard';
import EquipmentDetailModal from '@/components/EquipmentDetailModal';

export default function EquipmentList() {
  const navigate = useNavigate();
  const {
    equipments,
    departments,
    equipmentTypes,
    setSelectedEquipment,
  } = useAppStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [detailEquipment, setDetailEquipment] = useState<Equipment | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const filteredEquipments = useMemo(() => {
    return equipments.filter((eq) => {
      if (searchKeyword && !eq.name.toLowerCase().includes(searchKeyword.toLowerCase())) {
        return false;
      }
      if (selectedDepartment && eq.departmentId !== selectedDepartment) {
        return false;
      }
      if (selectedType && eq.typeId !== selectedType) {
        return false;
      }
      if (statusFilter && eq.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [equipments, searchKeyword, selectedDepartment, selectedType, statusFilter]);

  const handleViewDetail = (equipment: Equipment) => {
    setDetailEquipment(equipment);
    setShowDetail(true);
  };

  const handleReserve = (equipment: Equipment) => {
    setSelectedEquipment(equipment.id);
    navigate('/calendar');
  };

  const stats = {
    total: equipments.length,
    available: equipments.filter((e) => e.status === 'available').length,
    inUse: equipments.filter((e) => e.status === 'in-use').length,
    maintenance: equipments.filter((e) => e.status === 'maintenance').length,
  };

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-neutral-500 mb-1">设备总数</p>
          <p className="text-2xl font-bold text-neutral-800">{stats.total}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-neutral-500 mb-1">可预约</p>
          <p className="text-2xl font-bold text-success-500">{stats.available}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-neutral-500 mb-1">使用中</p>
          <p className="text-2xl font-bold text-primary-500">{stats.inUse}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-neutral-500 mb-1">维护中</p>
          <p className="text-2xl font-bold text-warning-500">{stats.maintenance}</p>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="card p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="搜索设备名称..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="input pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-neutral-400" />
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="select min-w-[120px]"
              >
                <option value="">全部院系</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="select min-w-[120px]"
            >
              <option value="">全部类型</option>
              {equipmentTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select min-w-[120px]"
            >
              <option value="">全部状态</option>
              <option value="available">可预约</option>
              <option value="in-use">使用中</option>
              <option value="maintenance">维护中</option>
              <option value="disabled">已停用</option>
            </select>
          </div>
        </div>
      </div>

      {/* 设备列表 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredEquipments.map((equipment) => (
          <EquipmentCard
            key={equipment.id}
            equipment={equipment}
            onViewDetail={handleViewDetail}
            onReserve={handleReserve}
          />
        ))}
      </div>

      {filteredEquipments.length === 0 && (
        <div className="py-20 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-neutral-500">未找到符合条件的设备</p>
        </div>
      )}

      {/* 详情弹窗 */}
      <EquipmentDetailModal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        equipment={detailEquipment}
      />
    </div>
  );
}
