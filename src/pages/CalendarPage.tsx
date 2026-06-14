import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Info,
  AlertCircle,
  Layers,
  CheckCircle2,
  XCircle,
  ChevronRight,
  CalendarRange,
  Clock,
} from 'lucide-react';
import { format, addDays, eachDayOfInterval, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppStore } from '@/store/useAppStore';
import WeekCalendar from '@/components/WeekCalendar';
import Modal from '@/components/Modal';
import StatusBadge from '@/components/StatusBadge';
import type { Equipment } from '@/types';

interface BatchResult {
  success: Array<{
    id: string;
    equipmentId: string;
    equipmentName: string;
    date: string;
    time: string;
  }>;
  failed: Array<{
    equipmentId: string;
    equipmentName: string;
    date: string;
    time: string;
    reason: string;
  }>;
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const {
    equipments,
    selectedEquipmentId,
    selectedDate,
    setSelectedEquipment,
    setSelectedDate,
    addReservation,
    currentUserId,
    getCurrentUser,
    getReservationsByEquipment,
    isSlotAvailable,
    isWithinOperatingHours,
  } = useAppStore();

  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showBatchSummaryModal, setShowBatchSummaryModal] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [participants, setParticipants] = useState('');
  const [remark, setRemark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchResult>({ success: [], failed: [] });

  // 批量模式相关状态
  const [batchEquipmentIds, setBatchEquipmentIds] = useState<string[]>([]);
  const [batchMode, setBatchMode] = useState<'multi-equipment' | 'multi-days'>('multi-equipment');
  const [batchStartTime, setBatchStartTime] = useState('09:00');
  const [batchEndTime, setBatchEndTime] = useState('11:00');
  const [batchStartDate, setBatchStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [batchEndDate, setBatchEndDate] = useState(format(addDays(new Date(), 2), 'yyyy-MM-dd'));
  const [batchError, setBatchError] = useState('');

  const currentUser = getCurrentUser();

  const availableEquipments = useMemo(
    () => equipments.filter((e) => e.status === 'available' || e.status === 'in-use'),
    [equipments]
  );

  const selectedEquipment = useMemo(
    () => equipments.find((e) => e.id === selectedEquipmentId),
    [equipments, selectedEquipmentId]
  );

  const batchEquipments = useMemo(
    () => equipments.filter((e) => batchEquipmentIds.includes(e.id)),
    [equipments, batchEquipmentIds]
  );

  const handleSelectSlot = (start: Date, end: Date) => {
    setSelectedSlot({ start, end });
  };

  const toggleBatchEquipment = (equipmentId: string) => {
    setBatchEquipmentIds((prev) =>
      prev.includes(equipmentId)
        ? prev.filter((id) => id !== equipmentId)
        : [...prev, equipmentId]
    );
  };

  const selectAllEquipments = () => {
    if (batchEquipmentIds.length === availableEquipments.length) {
      setBatchEquipmentIds([]);
    } else {
      setBatchEquipmentIds(availableEquipments.map((e) => e.id));
    }
  };

  const validateBatch = (): boolean => {
    setBatchError('');

    if (batchMode === 'multi-equipment') {
      if (batchEquipmentIds.length === 0) {
        setBatchError('请至少选择一台设备');
        return false;
      }
    } else {
      if (!batchStartDate || !batchEndDate) {
        setBatchError('请选择日期范围');
        return false;
      }
      if (parseISO(batchEndDate) < parseISO(batchStartDate)) {
        setBatchError('结束日期不能早于开始日期');
        return false;
      }
    }

    if (!batchStartTime || !batchEndTime) {
      setBatchError('请选择时间段');
      return false;
    }

    const [startH, startM] = batchStartTime.split(':').map(Number);
    const [endH, endM] = batchEndTime.split(':').map(Number);
    if (endH * 60 + endM <= startH * 60 + startM) {
      setBatchError('结束时间必须晚于开始时间');
      return false;
    }

    if (!purpose.trim()) {
      setBatchError('请填写实验目的');
      return false;
    }

    if (!participants.trim()) {
      setBatchError('请填写参与人员');
      return false;
    }

    return true;
  };

  const handleBatchSubmit = () => {
    if (!validateBatch()) return;
    setShowConfirmModal(true);
  };

  const handleSingleSubmit = () => {
    if (!selectedEquipmentId || !selectedSlot) return;
    setShowConfirmModal(true);
  };

  const executeSingleReservation = () => {
    if (!selectedEquipmentId || !selectedSlot) return;

    addReservation({
      userId: currentUserId,
      equipmentId: selectedEquipmentId,
      startTime: selectedSlot.start.toISOString(),
      endTime: selectedSlot.end.toISOString(),
      purpose,
      participants,
    });
  };

  const executeBatchReservation = (): BatchResult => {
    const result: BatchResult = { success: [], failed: [] };

    const [startH, startM] = batchStartTime.split(':').map(Number);
    const [endH, endM] = batchEndTime.split(':').map(Number);

    let datesToProcess: Date[] = [];
    let equipmentsToProcess: Equipment[] = [];

    if (batchMode === 'multi-equipment') {
      // 多设备模式：固定一天（今天），多台设备
      datesToProcess = [parseISO(batchStartDate)];
      equipmentsToProcess = batchEquipments;
    } else {
      // 多日期模式：固定当前选中设备，连续多天
      datesToProcess = eachDayOfInterval({
        start: parseISO(batchStartDate),
        end: parseISO(batchEndDate),
      });
      const defaultEquipment = selectedEquipment || availableEquipments[0];
      equipmentsToProcess = defaultEquipment ? [defaultEquipment] : [];
    }

    for (const equipment of equipmentsToProcess) {
      for (const date of datesToProcess) {
        const start = new Date(date);
        start.setHours(startH, startM, 0, 0);
        const end = new Date(date);
        end.setHours(endH, endM, 0, 0);

        const dateStr = format(date, 'MM月dd日');
        const timeStr = `${batchStartTime} - ${batchEndTime}`;

        // 1. 检查开放时间
        const inOperatingHours = isWithinOperatingHours(
          equipment.id,
          start.toISOString(),
          end.toISOString()
        );
        if (!inOperatingHours) {
          result.failed.push({
            equipmentId: equipment.id,
            equipmentName: equipment.name,
            date: dateStr,
            time: timeStr,
            reason: '时段不在设备开放时间内',
          });
          continue;
        }

        // 2. 检查时间冲突
        const available = isSlotAvailable(
          equipment.id,
          start.toISOString(),
          end.toISOString()
        );
        if (!available) {
          result.failed.push({
            equipmentId: equipment.id,
            equipmentName: equipment.name,
            date: dateStr,
            time: timeStr,
            reason: '与其他预约时段冲突',
          });
          continue;
        }

        // 3. 检查是否已过期
        if (start < new Date()) {
          result.failed.push({
            equipmentId: equipment.id,
            equipmentName: equipment.name,
            date: dateStr,
            time: timeStr,
            reason: '预约时间已过期',
          });
          continue;
        }

        // 4. 提交预约
        const newId = addReservation({
          userId: currentUserId,
          equipmentId: equipment.id,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          purpose,
          participants,
        });

        result.success.push({
          id: newId,
          equipmentId: equipment.id,
          equipmentName: equipment.name,
          date: dateStr,
          time: timeStr,
        });
      }
    }

    return result;
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);

    setTimeout(() => {
      if (mode === 'single') {
        executeSingleReservation();
        setIsSubmitting(false);
        setShowConfirmModal(false);
        resetSingleForm();
        navigate('/records');
      } else {
        const result = executeBatchReservation();
        setBatchResult(result);
        setIsSubmitting(false);
        setShowConfirmModal(false);
        setShowBatchSummaryModal(true);
      }
    }, 500);
  };

  const resetSingleForm = () => {
    setSelectedSlot(null);
    setPurpose('');
    setParticipants('');
    setRemark('');
  };

  const resetBatchForm = () => {
    setBatchEquipmentIds([]);
    setBatchStartDate(format(new Date(), 'yyyy-MM-dd'));
    setBatchEndDate(format(addDays(new Date(), 2), 'yyyy-MM-dd'));
    setBatchStartTime('09:00');
    setBatchEndTime('11:00');
    setPurpose('');
    setParticipants('');
    setRemark('');
    setBatchError('');
  };

  const handleBatchSummaryClose = () => {
    setShowBatchSummaryModal(false);
    resetBatchForm();
    navigate('/records');
  };

  const canSingleSubmit =
    selectedEquipmentId &&
    selectedSlot &&
    purpose.trim() &&
    participants.trim();

  const batchSummaryInfo = useMemo(() => {
    const [startH, startM] = batchStartTime.split(':').map(Number);
    const [endH, endM] = batchEndTime.split(':').map(Number);
    const hours = (endH * 60 + endM - startH * 60 - startM) / 60;
    const daysCount = batchMode === 'multi-equipment'
      ? 1
      : eachDayOfInterval({ start: parseISO(batchStartDate), end: parseISO(batchEndDate) }).length;
    const eqCount = batchMode === 'multi-equipment'
      ? batchEquipmentIds.length
      : (selectedEquipment ? 1 : 0);
    const totalCount = daysCount * eqCount;

    return { hours, daysCount, eqCount, totalCount };
  }, [batchMode, batchStartTime, batchEndTime, batchStartDate, batchEndDate, batchEquipmentIds.length, selectedEquipment]);

  return (
    <div className="space-y-6">
      {/* 模式切换 */}
      <div className="card p-2 bg-neutral-50/80">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setMode('single')}
            className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-all ${
              mode === 'single'
                ? 'bg-white shadow-sm text-primary-600 font-semibold'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            单设备预约
          </button>
          <button
            onClick={() => setMode('batch')}
            className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-all ${
              mode === 'batch'
                ? 'bg-white shadow-sm text-primary-600 font-semibold'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            批量预约
            <span className="text-[10px] bg-primary-50 text-primary-600 px-1.5 py-0.5 rounded">NEW</span>
          </button>
        </div>
      </div>

      {mode === 'single' ? (
        /* ===== 单设备预约 ===== */
        <>
          {/* 设备选择 */}
          <div className="card p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="text-sm font-medium text-neutral-700 whitespace-nowrap">
                选择设备：
              </label>
              <select
                value={selectedEquipmentId || ''}
                onChange={(e) => {
                  setSelectedEquipment(e.target.value || null);
                  setSelectedSlot(null);
                }}
                className="select max-w-xs"
              >
                <option value="">请选择设备</option>
                {availableEquipments.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.name} - {eq.location}
                  </option>
                ))}
              </select>
              {selectedEquipment && (
                <StatusBadge status={selectedEquipment.status} type="equipment" />
              )}
            </div>

            {selectedEquipment && (
              <div className="mt-4 p-4 bg-primary-50/50 rounded-lg border border-primary-100">
                <div className="flex gap-4">
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                    <img
                      src={selectedEquipment.image}
                      alt={selectedEquipment.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-neutral-800 mb-1">
                      {selectedEquipment.name}
                    </h3>
                    <p className="text-sm text-neutral-600 line-clamp-2">
                      {selectedEquipment.description}
                    </p>
                    <p className="text-xs text-neutral-500 mt-2">
                      位置：{selectedEquipment.location}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {selectedEquipmentId ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 日历 */}
              <div className="lg:col-span-2">
                <WeekCalendar
                  selectedDate={selectedDate}
                  equipmentId={selectedEquipmentId}
                  onSelectSlot={handleSelectSlot}
                  selectedSlot={selectedSlot}
                />
              </div>

              {/* 预约表单 */}
              <div className="space-y-4">
                <div className="card p-5">
                  <h3 className="text-base font-semibold text-neutral-800 mb-4 flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-primary-500" />
                    预约信息
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                        预约时段
                      </label>
                      {selectedSlot ? (
                        <div className="p-3 bg-primary-50 rounded-lg border border-primary-100">
                          <p className="text-sm font-medium text-primary-700">
                            {format(selectedSlot.start, 'MM月dd日 HH:mm', { locale: zhCN })}
                            {' - '}
                            {format(selectedSlot.end, 'HH:mm', { locale: zhCN })}
                          </p>
                          <p className="text-xs text-primary-500 mt-1">
                            时长：{Math.round((selectedSlot.end.getTime() - selectedSlot.start.getTime()) / (1000 * 60 * 60) * 10) / 10} 小时
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 bg-neutral-50 rounded-lg border border-dashed border-neutral-200 text-center">
                          <p className="text-sm text-neutral-400">请在日历中选择时段</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                        实验目的 <span className="text-danger-500">*</span>
                      </label>
                      <textarea
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        placeholder="请描述实验目的和内容..."
                        rows={3}
                        className="textarea"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                        参与人员 <span className="text-danger-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={participants}
                        onChange={(e) => setParticipants(e.target.value)}
                        placeholder="请填写参与人数及人员信息"
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                        备注
                      </label>
                      <textarea
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        placeholder="其他需要说明的事项..."
                        rows={2}
                        className="textarea"
                      />
                    </div>

                    <button
                      onClick={handleSingleSubmit}
                      disabled={!canSingleSubmit}
                      className="w-full btn-primary btn-lg"
                    >
                      提交预约申请
                    </button>
                  </div>
                </div>

                <div className="card p-4 bg-warning-50 border-warning-200">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-warning-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-warning-800">预约须知</p>
                      <ul className="mt-2 text-xs text-warning-600 space-y-1">
                        <li>• 预约提交后需等待管理员审核</li>
                        <li>• 如需取消请提前24小时操作</li>
                        <li>• 爽约3次将被限制预约权限</li>
                        <li>• 请严格遵守设备操作规程</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
                <CalendarDays className="w-8 h-8 text-neutral-400" />
              </div>
              <p className="text-neutral-500 mb-4">请先选择要预约的设备</p>
              <button
                onClick={() => navigate('/')}
                className="btn-primary"
              >
                浏览设备列表
              </button>
            </div>
          )}
        </>
      ) : (
        /* ===== 批量预约 ===== */
        <div className="space-y-6">
          {/* 批量子模式切换 */}
          <div className="card p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
              <div className="flex items-center gap-2 p-1 bg-neutral-100 rounded-lg">
                <button
                  onClick={() => setBatchMode('multi-equipment')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    batchMode === 'multi-equipment'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-neutral-600'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 inline mr-1" />
                  同时预约多台设备
                </button>
                <button
                  onClick={() => setBatchMode('multi-days')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    batchMode === 'multi-days'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-neutral-600'
                  }`}
                >
                  <CalendarRange className="w-3.5 h-3.5 inline mr-1" />
                  连续多天预约
                </button>
              </div>
            </div>

            {batchMode === 'multi-equipment' ? (
              /* 多选设备 */
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-neutral-700">
                    选择设备（已选 {batchEquipmentIds.length} / {availableEquipments.length}）
                  </label>
                  <button
                    onClick={selectAllEquipments}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    {batchEquipmentIds.length === availableEquipments.length ? '取消全选' : '全选'}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto p-1">
                  {availableEquipments.map((eq) => {
                    const checked = batchEquipmentIds.includes(eq.id);
                    return (
                      <div
                        key={eq.id}
                        onClick={() => toggleBatchEquipment(eq.id)}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          checked
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-neutral-200 hover:border-neutral-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            checked
                              ? 'bg-primary-500 border-primary-500'
                              : 'border-neutral-300'
                          }`}>
                            {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-neutral-800 text-sm truncate">{eq.name}</p>
                              <StatusBadge status={eq.status} type="equipment" />
                            </div>
                            <p className="text-xs text-neutral-500 mt-0.5">{eq.location}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* 多日期 */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    选择设备
                  </label>
                  <select
                    value={selectedEquipmentId || ''}
                    onChange={(e) => setSelectedEquipment(e.target.value || null)}
                    className="select w-full"
                  >
                    <option value="">请选择设备</option>
                    {availableEquipments.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.name} - {eq.location}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    开始日期
                  </label>
                  <input
                    type="date"
                    value={batchStartDate}
                    onChange={(e) => setBatchStartDate(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    结束日期
                  </label>
                  <input
                    type="date"
                    value={batchEndDate}
                    onChange={(e) => setBatchEndDate(e.target.value)}
                    min={batchStartDate}
                    className="input w-full"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 时间设置 + 表单 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="card p-5">
                <h3 className="text-base font-semibold text-neutral-800 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary-500" />
                  统一预约时段
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                      每天开始时间
                    </label>
                    <select
                      value={batchStartTime}
                      onChange={(e) => {
                        setBatchStartTime(e.target.value);
                        setBatchError('');
                      }}
                      className="select"
                    >
                      {Array.from({ length: 13 }, (_, i) => i + 8).map((hour) => (
                        <option key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                          {hour.toString().padStart(2, '0')}:00
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                      每天结束时间
                    </label>
                    <select
                      value={batchEndTime}
                      onChange={(e) => {
                        setBatchEndTime(e.target.value);
                        setBatchError('');
                      }}
                      className="select"
                    >
                      {Array.from({ length: 13 }, (_, i) => i + 9).map((hour) => (
                        <option key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                          {hour.toString().padStart(2, '0')}:00
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 预估信息 */}
                <div className="mt-5 p-4 bg-primary-50/50 rounded-lg border border-primary-100">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-neutral-500">设备数</p>
                      <p className="text-lg font-bold text-primary-700">{batchSummaryInfo.eqCount} 台</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">天数</p>
                      <p className="text-lg font-bold text-primary-700">{batchSummaryInfo.daysCount} 天</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">每天时长</p>
                      <p className="text-lg font-bold text-primary-700">{batchSummaryInfo.hours} 小时</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">总预约数</p>
                      <p className="text-lg font-bold text-primary-700">{batchSummaryInfo.totalCount} 条</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card p-4 bg-warning-50 border-warning-200">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-warning-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-warning-800">批量预约说明</p>
                    <ul className="mt-2 text-xs text-warning-600 space-y-1">
                      <li>• 系统将自动为每个（设备 × 日期）组合生成独立预约</li>
                      <li>• 每条预约会分别校验开放时间和时段冲突</li>
                      <li>• 提交后会显示成功和失败的汇总清单</li>
                      <li>• 失败的预约不会占用设备时段，可稍后重试</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="card p-5">
                <h3 className="text-base font-semibold text-neutral-800 mb-4 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary-500" />
                  预约信息
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                      实验目的 <span className="text-danger-500">*</span>
                    </label>
                    <textarea
                      value={purpose}
                      onChange={(e) => {
                        setPurpose(e.target.value);
                        setBatchError('');
                      }}
                      placeholder="请描述实验目的和内容（所有预约共用）..."
                      rows={3}
                      className="textarea"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                      参与人员 <span className="text-danger-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={participants}
                      onChange={(e) => {
                        setParticipants(e.target.value);
                        setBatchError('');
                      }}
                      placeholder="请填写参与人数及人员信息"
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                      备注
                    </label>
                    <textarea
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      placeholder="其他需要说明的事项..."
                      rows={2}
                      className="textarea"
                    />
                  </div>

                  {batchError && (
                    <div className="p-3 bg-danger-50 border border-danger-100 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-danger-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-danger-700">{batchError}</p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleBatchSubmit}
                    className="w-full btn-primary btn-lg"
                  >
                    <Layers className="w-4 h-4" />
                    提交批量预约申请
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 确认弹窗（共用） */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => !isSubmitting && setShowConfirmModal(false)}
        title={mode === 'single' ? '确认预约' : '确认批量预约'}
      >
        <div className="space-y-4">
          {mode === 'single' ? (
            <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-neutral-500">设备</span>
                <span className="text-sm font-medium text-neutral-800">
                  {selectedEquipment?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-neutral-500">时段</span>
                <span className="text-sm font-medium text-neutral-800">
                  {selectedSlot && format(selectedSlot.start, 'MM月dd日 HH:mm', { locale: zhCN })}
                  {' - '}
                  {selectedSlot && format(selectedSlot.end, 'HH:mm', { locale: zhCN })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-neutral-500">申请人</span>
                <span className="text-sm font-medium text-neutral-800">
                  {currentUser?.name}
                </span>
              </div>
              <div className="border-t border-neutral-200 pt-3">
                <span className="text-sm text-neutral-500 block mb-1">实验目的</span>
                <p className="text-sm text-neutral-700">{purpose}</p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-neutral-50 rounded-lg space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-neutral-500">预约模式</span>
                <span className="text-sm font-medium text-neutral-800">
                  {batchMode === 'multi-equipment' ? '多设备预约' : '多日期预约'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-neutral-500">
                  {batchMode === 'multi-equipment' ? '设备数' : '预约天数'}
                </span>
                <span className="text-sm font-medium text-neutral-800">
                  {batchMode === 'multi-equipment'
                    ? `${batchEquipmentIds.length} 台`
                    : `${batchSummaryInfo.daysCount} 天 (${batchStartDate} 至 ${batchEndDate})`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-neutral-500">每日时段</span>
                <span className="text-sm font-medium text-neutral-800">
                  {batchStartTime} - {batchEndTime}（{batchSummaryInfo.hours}小时）
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-neutral-500">总预约数</span>
                <span className="text-sm font-bold text-primary-600">{batchSummaryInfo.totalCount} 条</span>
              </div>
              <div className="border-t border-neutral-200 pt-3">
                <span className="text-sm text-neutral-500 block mb-1">实验目的</span>
                <p className="text-sm text-neutral-700">{purpose}</p>
              </div>
              <div className="p-3 bg-warning-50 rounded-lg border border-warning-100">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-warning-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-warning-700">
                    系统将自动为每条预约分别校验开放时间和时段冲突，提交后会显示成功和失败的汇总。
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowConfirmModal(false)}
              disabled={isSubmitting}
              className="btn-secondary"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? '提交中...' : '确认提交'}
            </button>
          </div>
        </div>
      </Modal>

      {/* 批量结果汇总弹窗 */}
      <Modal
        isOpen={showBatchSummaryModal}
        onClose={handleBatchSummaryClose}
        title="批量预约结果"
        size="lg"
      >
        <div className="space-y-5">
          {/* 统计 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-success-50 rounded-lg border border-success-100">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-5 h-5 text-success-500" />
                <span className="text-sm font-medium text-success-700">预约成功</span>
              </div>
              <p className="text-3xl font-bold text-success-600">{batchResult.success.length}</p>
            </div>
            <div className="p-4 bg-danger-50 rounded-lg border border-danger-100">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-5 h-5 text-danger-500" />
                <span className="text-sm font-medium text-danger-700">预约失败</span>
              </div>
              <p className="text-3xl font-bold text-danger-600">{batchResult.failed.length}</p>
            </div>
          </div>

          {/* 成功列表 */}
          {batchResult.success.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-neutral-700 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success-500" />
                成功预约（{batchResult.success.length} 条）
              </h4>
              <div className="max-h-[180px] overflow-y-auto border border-neutral-200 rounded-lg divide-y divide-neutral-100">
                {batchResult.success.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-success-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-neutral-800">{item.equipmentName}</p>
                        <p className="text-xs text-neutral-500">{item.date} · {item.time}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-300" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 失败列表 */}
          {batchResult.failed.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-neutral-700 mb-2 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-danger-500" />
                预约失败（{batchResult.failed.length} 条）
              </h4>
              <div className="max-h-[180px] overflow-y-auto border border-neutral-200 rounded-lg divide-y divide-neutral-100">
                {batchResult.failed.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between bg-danger-50/30">
                    <div className="flex items-center gap-3">
                      <XCircle className="w-4 h-4 text-danger-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-neutral-800">{item.equipmentName}</p>
                        <p className="text-xs text-neutral-500">{item.date} · {item.time}</p>
                        <p className="text-xs text-danger-600 mt-0.5">原因：{item.reason}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-neutral-100">
            <button onClick={handleBatchSummaryClose} className="btn-primary">
              查看我的预约
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
