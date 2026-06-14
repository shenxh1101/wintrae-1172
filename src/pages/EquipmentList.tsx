import { useState, useMemo } from 'react';
import { Search, Filter, Calendar, Clock, X, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import type { Equipment } from '@/types';
import EquipmentCard from '@/components/EquipmentCard';
import EquipmentDetailModal from '@/components/EquipmentDetailModal';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function EquipmentList() {
  const navigate = useNavigate();
  const {
    equipments,
    departments,
    equipmentTypes,
    setSelectedEquipment,
    filterDate,
    filterStartTime,
    filterEndTime,
    setFilterDate,
    setFilterStartTime,
    setFilterEndTime,
    getAvailableEquipmentsByTime,
    resetToDefault,
  } = useAppStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [detailEquipment, setDetailEquipment] = useState<Equipment | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showTimeFilter, setShowTimeFilter] = useState(false);

  const hasTimeFilter = filterDate && filterStartTime && filterEndTime;

  const filteredEquipments = useMemo(() => {
    let result = equipments;

    if (hasTimeFilter) {
      result = getAvailableEquipmentsByTime(
        filterDate,
        filterStartTime,
        filterEndTime,
        selectedDepartment || undefined,
        selectedType || undefined
      );
    } else {
      if (selectedDepartment) {
        result = result.filter((e) => e.departmentId === selectedDepartment);
      }
      if (selectedType) {
        result = result.filter((e) => e.typeId === selectedType);
      }
    }

    if (searchKeyword) {
      result = result.filter((eq) =>
        eq.name.toLowerCase().includes(searchKeyword.toLowerCase())
      );
    }

    if (statusFilter) {
      result = result.filter((e) => e.status === statusFilter);
    }

    return result;
  }, [
    equipments,
    hasTimeFilter,
    filterDate,
    filterStartTime,
    filterEndTime,
    selectedDepartment,
    selectedType,
    searchKeyword,
    statusFilter,
    getAvailableEquipmentsByTime,
  ]);

  const handleViewDetail = (equipment: Equipment) => {
    setDetailEquipment(equipment);
    setShowDetail(true);
  };

  const handleReserve = (equipment: Equipment) => {
    setSelectedEquipment(equipment.id);
    navigate('/calendar');
  };

  const clearTimeFilter = () => {
    setFilterDate('');
    setFilterStartTime('');
    setFilterEndTime('');
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

      {/* 时间筛选栏 */}
      <div className={`card transition-all duration-300 ${showTimeFilter ? 'p-4' : 'py-2 px-4'}`}>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowTimeFilter(!showTimeFilter)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              hasTimeFilter || showTimeFilter
                ? 'bg-primary-50 text-primary-600'
                : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>按时段筛选</span>
          </button>

          {hasTimeFilter && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 rounded-lg">
              <span className="text-sm text-primary-700">
                {filterDate && format(new Date(filterDate), 'MM月dd日', { locale: zhCN })}
                {' · '}
                {filterStartTime} - {filterEndTime}
              </span>
              <span className="badge-primary">
                可用 {filteredEquipments.length} 台
              </span>
              <button
                onClick={clearTimeFilter}
                className="p-0.5 rounded hover:bg-primary-100 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-primary-600" />
              </button>
            </div>
          )}
        </div>

        {showTimeFilter && (
          <div className="mt-4 pt-4 border-t border-neutral-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                <Calendar className="w-3.5 h-3.5 inline mr-1" />
                预约日期
              </label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                <Clock className="w-3.5 h-3.5 inline mr-1" />
                开始时间
              </label>
              <select
                value={filterStartTime}
                onChange={(e) => setFilterStartTime(e.target.value)}
                className="select"
              >
                <option value="">请选择</option>
                {Array.from({ length: 12 }, (_, i) => i + 8).map((hour) => (
                  <option key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                    {hour.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                <Clock className="w-3.5 h-3.5 inline mr-1" />
                结束时间
              </label>
              <select
                value={filterEndTime}
                onChange={(e) => setFilterEndTime(e.target.value)}
                className="select"
              >
                <option value="">请选择</option>
                {Array.from({ length: 12 }, (_, i) => i + 9).map((hour) => (
                  <option key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                    {hour.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button onClick={clearTimeFilter} className="btn-secondary flex-1">
                <X className="w-3.5 h-3.5" />
                清除
              </button>
              <button
                onClick={() => setShowTimeFilter(false)}
                className="btn-primary flex-1"
              >
                应用筛选
              </button>
            </div>
          </div>
        )}
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

            <button
              onClick={() => {
                setSearchKeyword('');
                setSelectedDepartment('');
                setSelectedType('');
                setStatusFilter('');
                clearTimeFilter();
              }}
              className="btn-ghost btn-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              重置
            </button>
          </div>
        </div>
      </div>

      {/* 筛选结果提示 */}
      {hasTimeFilter && (
        <div className="p-3 bg-primary-50 border border-primary-100 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-primary-700">
            <Calendar className="w-4 h-4" />
            <span>
              已筛选
              <span className="font-semibold mx-1">
                {filterDate && format(new Date(filterDate), 'yyyy年MM月dd日', { locale: zhCN })}
              </span>
              <span className="font-semibold mx-1">
                {filterStartTime} - {filterEndTime}
              </span>
              期间可用设备，共
              <span className="font-bold text-primary-600 mx-1">{filteredEquipments.length}</span>
              台
            </span>
          </div>
          <button onClick={clearTimeFilter} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
            清除筛选
          </button>
        </div>
      )}

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
          <p className="text-neutral-500">
            {hasTimeFilter
              ? '该时段没有可用设备，请尝试调整时间或筛选条件'
              : '未找到符合条件的设备'}
          </p>
          {hasTimeFilter && (
            <button onClick={clearTimeFilter} className="btn-primary mt-4">
              清除时段筛选
            </button>
          )}
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
