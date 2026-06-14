import { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Calendar, Clock, X, RotateCcw, AlertCircle, Info, Ban, AlertTriangle } from 'lucide-react';
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
    getEquipmentAvailabilityDetail,
    validateTimeFilterParams,
    resetToDefault,
  } = useAppStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [detailEquipment, setDetailEquipment] = useState<Equipment | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showTimeFilter, setShowTimeFilter] = useState(false);
  const [timeFilterError, setTimeFilterError] = useState('');
  const [timeFilterRuleHints, setTimeFilterRuleHints] = useState<string[]>([]);

  const hasTimeFilter = filterDate && filterStartTime && filterEndTime;

  // 实时校验时间参数
  useEffect(() => {
    const result = validateTimeFilterParams(filterDate, filterStartTime, filterEndTime);
    if (!result.valid) {
      setTimeFilterError(result.error || '时间参数不合法');
    } else {
      setTimeFilterError('');
    }
  }, [filterDate, filterStartTime, filterEndTime, validateTimeFilterParams]);

  // 扫描规则命中：统计有多少设备被哪条规则挡住
  useEffect(() => {
    if (!hasTimeFilter) {
      setTimeFilterRuleHints([]);
      return;
    }
    const counter: Record<string, number> = {};
    const labels: Record<string, { label: string; icon: string }> = {
      holiday: { label: '节假日关闭', icon: '🎊' },
      exception: { label: '临时闭馆/特殊开放', icon: '⚠️' },
      schedule: { label: '日常时段未开放', icon: '🕐' },
      conflict: { label: '时段已被预约', icon: '📅' },
      status: { label: '设备停用/维护中', icon: '🔧' },
      expired: { label: '时间已过期', icon: '⏰' },
    };

    for (const eq of equipments) {
      if (selectedDepartment && eq.departmentId !== selectedDepartment) continue;
      if (selectedType && eq.typeId !== selectedType) continue;
      const detail = getEquipmentAvailabilityDetail(eq.id, filterDate, filterStartTime, filterEndTime);
      if (!detail.available && detail.ruleType) {
        counter[detail.ruleType] = (counter[detail.ruleType] || 0) + 1;
      }
    }

    const hints: string[] = [];
    for (const [key, count] of Object.entries(counter)) {
      if (count > 0 && labels[key]) {
        hints.push(`${labels[key].icon} ${labels[key].label}（${count} 台）`);
      }
    }
    setTimeFilterRuleHints(hints);
  }, [
    hasTimeFilter,
    filterDate,
    filterStartTime,
    filterEndTime,
    equipments,
    selectedDepartment,
    selectedType,
    getEquipmentAvailabilityDetail,
  ]);

  const filteredEquipments = useMemo(() => {
    // 如果时间校验不通过，不按时间过滤
    if (timeFilterError && filterDate && filterStartTime && filterEndTime) {
      let result = equipments;
      if (selectedDepartment) result = result.filter((e) => e.departmentId === selectedDepartment);
      if (selectedType) result = result.filter((e) => e.typeId === selectedType);
      if (searchKeyword) {
        result = result.filter((eq) => eq.name.toLowerCase().includes(searchKeyword.toLowerCase()));
      }
      if (statusFilter) result = result.filter((e) => e.status === statusFilter);
      return result;
    }

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
    timeFilterError,
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
    setTimeFilterError('');
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

          {hasTimeFilter && !timeFilterError && (
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
          {timeFilterError && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-danger-50 rounded-lg">
              <AlertCircle className="w-4 h-4 text-danger-500" />
              <span className="text-sm text-danger-700">{timeFilterError}</span>
            </div>
          )}
        </div>

        {showTimeFilter && (
          <div className="mt-4 pt-4 border-t border-neutral-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

            {/* 实时校验错误 */}
            {timeFilterError && (
              <div className="mt-3 p-3 bg-danger-50 border border-danger-100 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-danger-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-danger-700 font-medium">{timeFilterError}</p>
              </div>
            )}

            {/* 规则命中提示 */}
            {hasTimeFilter && !timeFilterError && timeFilterRuleHints.length > 0 && (
              <div className="mt-3 p-3 bg-warning-50 border border-warning-100 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-warning-700 mb-1">
                      规则命中提示
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {timeFilterRuleHints.map((hint, i) => (
                        <span key={i} className="text-xs text-warning-600">
                          {hint}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
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
      {hasTimeFilter && !timeFilterError && (
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
            availabilityDetail={
              hasTimeFilter && !timeFilterError
                ? getEquipmentAvailabilityDetail(equipment.id, filterDate, filterStartTime, filterEndTime)
                : undefined
            }
          />
        ))}
      </div>

      {filteredEquipments.length === 0 && (
        <div className="py-20 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-neutral-500">
            {hasTimeFilter && !timeFilterError
              ? '该时段没有可用设备，请尝试调整时间或筛选条件'
              : timeFilterError
              ? '请修正时间筛选条件'
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
