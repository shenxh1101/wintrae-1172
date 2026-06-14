import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Info, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppStore } from '@/store/useAppStore';
import WeekCalendar from '@/components/WeekCalendar';
import Modal from '@/components/Modal';
import StatusBadge from '@/components/StatusBadge';

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
  } = useAppStore();

  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [participants, setParticipants] = useState('');
  const [remark, setRemark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentUser = getCurrentUser();

  const availableEquipments = useMemo(
    () => equipments.filter((e) => e.status === 'available' || e.status === 'in-use'),
    [equipments]
  );

  const selectedEquipment = useMemo(
    () => equipments.find((e) => e.id === selectedEquipmentId),
    [equipments, selectedEquipmentId]
  );

  const handleSelectSlot = (start: Date, end: Date) => {
    setSelectedSlot({ start, end });
  };

  const handleSubmit = () => {
    if (!selectedEquipmentId || !selectedSlot) return;
    setShowConfirmModal(true);
  };

  const handleConfirm = async () => {
    if (!selectedEquipmentId || !selectedSlot) return;

    setIsSubmitting(true);

    addReservation({
      userId: currentUserId,
      equipmentId: selectedEquipmentId,
      startTime: selectedSlot.start.toISOString(),
      endTime: selectedSlot.end.toISOString(),
      purpose,
      participants,
    });

    setTimeout(() => {
      setIsSubmitting(false);
      setShowConfirmModal(false);
      setSelectedSlot(null);
      setPurpose('');
      setParticipants('');
      setRemark('');
      navigate('/records');
    }, 500);
  };

  const canSubmit =
    selectedEquipmentId &&
    selectedSlot &&
    purpose.trim() &&
    participants.trim();

  return (
    <div className="space-y-6">
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
                  onClick={handleSubmit}
                  disabled={!canSubmit}
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

      {/* 确认弹窗 */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => !isSubmitting && setShowConfirmModal(false)}
        title="确认预约"
      >
        <div className="space-y-4">
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
    </div>
  );
}
