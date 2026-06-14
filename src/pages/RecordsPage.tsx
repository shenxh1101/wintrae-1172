import { useState, useMemo } from 'react';
import {
  Clock,
  MapPin,
  Play,
  Square,
  Star,
  MessageSquare,
  XCircle,
  ChevronDown,
  ChevronUp,
  Edit3,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppStore } from '@/store/useAppStore';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import Rating from '@/components/Rating';
import Tabs from '@/components/Tabs';
import type { Reservation } from '@/types';

const tabItems = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待审核' },
  { key: 'approved', label: '待使用' },
  { key: 'checked-in', label: '使用中' },
  { key: 'completed', label: '已完成' },
];

export default function RecordsPage() {
  const {
    getMyReservations,
    getEquipmentById,
    checkIn,
    checkOut,
    cancelReservation,
    rateReservation,
    canModifyReservation,
    modifyReservation: updateReservation,
    isWithinOperatingHours,
    isSlotAvailable,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showRateModal, setShowRateModal] = useState(false);
  const [ratingReservationId, setRatingReservationId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReservationId, setCancelReservationId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [modifyReservation, setModifyReservation] = useState<Reservation | null>(null);
  const [modifyDate, setModifyDate] = useState('');
  const [modifyStartTime, setModifyStartTime] = useState('');
  const [modifyEndTime, setModifyEndTime] = useState('');
  const [modifyPurpose, setModifyPurpose] = useState('');
  const [modifyParticipants, setModifyParticipants] = useState('');
  const [modifyError, setModifyError] = useState('');

  const openModifyModal = (reservation: Reservation) => {
    setModifyReservation(reservation);
    const start = new Date(reservation.startTime);
    const end = new Date(reservation.endTime);
    setModifyDate(format(start, 'yyyy-MM-dd'));
    setModifyStartTime(format(start, 'HH:mm'));
    setModifyEndTime(format(end, 'HH:mm'));
    setModifyPurpose(reservation.purpose);
    setModifyParticipants(reservation.participants || '');
    setModifyError('');
    setShowModifyModal(true);
  };

  const validateModify = (): boolean => {
    setModifyError('');

    if (!modifyDate || !modifyStartTime || !modifyEndTime) {
      setModifyError('请选择完整的预约日期和时间');
      return false;
    }

    const startDateTime = parseISO(`${modifyDate}T${modifyStartTime}`);
    const endDateTime = parseISO(`${modifyDate}T${modifyEndTime}`);

    if (endDateTime <= startDateTime) {
      setModifyError('结束时间必须晚于开始时间');
      return false;
    }

    if (startDateTime < new Date()) {
      setModifyError('预约时间不能早于当前时间');
      return false;
    }

    if (modifyReservation) {
      const inOperatingHours = isWithinOperatingHours(
        modifyReservation.equipmentId,
        startDateTime.toISOString(),
        endDateTime.toISOString()
      );
      if (!inOperatingHours) {
        setModifyError('所选时段不在设备开放时间内');
        return false;
      }

      const hasConflict = !isSlotAvailable(
        modifyReservation.equipmentId,
        startDateTime.toISOString(),
        endDateTime.toISOString(),
        modifyReservation.id
      );
      if (hasConflict) {
        setModifyError('所选时段与其他预约冲突');
        return false;
      }
    }

    return true;
  };

  const handleModifySubmit = () => {
    if (!validateModify() || !modifyReservation) return;

    const startDateTime = parseISO(`${modifyDate}T${modifyStartTime}`);
    const endDateTime = parseISO(`${modifyDate}T${modifyEndTime}`);

    updateReservation(
      modifyReservation.id,
      startDateTime.toISOString(),
      endDateTime.toISOString(),
      modifyPurpose,
      modifyParticipants || undefined
    );

    setShowModifyModal(false);
    setModifyReservation(null);
  };

  const myReservations = getMyReservations();

  const filteredReservations = useMemo(() => {
    const sorted = [...myReservations].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (activeTab === 'all') return sorted;
    if (activeTab === 'approved') {
      return sorted.filter((r) => r.status === 'approved');
    }
    return sorted.filter((r) => r.status === activeTab);
  }, [myReservations, activeTab]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleCheckIn = (id: string) => {
    checkIn(id);
  };

  const handleCheckOut = (id: string) => {
    checkOut(id);
  };

  const handleCancel = (id: string) => {
    setCancelReservationId(id);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const confirmCancel = () => {
    if (cancelReservationId) {
      cancelReservation(cancelReservationId);
    }
    setShowCancelModal(false);
    setCancelReservationId(null);
    setCancelReason('');
  };

  const handleRate = (id: string) => {
    setRatingReservationId(id);
    setRating(5);
    setFeedback('');
    setShowRateModal(true);
  };

  const submitRating = () => {
    if (ratingReservationId) {
      rateReservation(ratingReservationId, rating, feedback);
    }
    setShowRateModal(false);
    setRatingReservationId(null);
  };

  const stats = {
    total: myReservations.length,
    pending: myReservations.filter((r) => r.status === 'pending').length,
    approved: myReservations.filter((r) => r.status === 'approved').length,
    completed: myReservations.filter((r) => r.status === 'completed').length,
  };

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-neutral-500 mb-1">总预约</p>
          <p className="text-2xl font-bold text-neutral-800">{stats.total}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-neutral-500 mb-1">待审核</p>
          <p className="text-2xl font-bold text-warning-500">{stats.pending}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-neutral-500 mb-1">待使用</p>
          <p className="text-2xl font-bold text-success-500">{stats.approved}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-neutral-500 mb-1">已完成</p>
          <p className="text-2xl font-bold text-neutral-600">{stats.completed}</p>
        </div>
      </div>

      {/* 筛选标签 */}
      <div className="card p-2">
        <Tabs items={tabItems} activeKey={activeTab} onChange={setActiveTab} />
      </div>

      {/* 记录列表 */}
      <div className="space-y-4">
        {filteredReservations.map((reservation) => {
          const equipment = getEquipmentById(reservation.equipmentId);
          const isExpanded = expandedId === reservation.id;

          return (
            <div key={reservation.id} className="card overflow-hidden">
              <div
                className="p-4 cursor-pointer"
                onClick={() => toggleExpand(reservation.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                      {equipment && (
                        <img
                          src={equipment.image}
                          alt={equipment.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-neutral-800 truncate">
                          {equipment?.name}
                        </h3>
                        <StatusBadge status={reservation.status} />
                      </div>
                      <div className="flex items-center gap-4 text-sm text-neutral-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {format(new Date(reservation.startTime), 'MM-dd HH:mm', {
                              locale: zhCN,
                            })}
                            {' - '}
                            {format(new Date(reservation.endTime), 'HH:mm', {
                              locale: zhCN,
                            })}
                          </span>
                        </div>
                        {equipment && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="truncate">{equipment.location}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 mt-1">
                        提交于{' '}
                        {formatDistanceToNow(new Date(reservation.createdAt), {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {reservation.status === 'approved' && (
                      <>
                        {canModifyReservation(reservation) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openModifyModal(reservation);
                            }}
                            className="btn-secondary btn-sm"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            修改
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCheckIn(reservation.id);
                          }}
                          className="btn-success btn-sm"
                        >
                          <Play className="w-3.5 h-3.5" />
                          签到
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancel(reservation.id);
                          }}
                          className="btn-ghost btn-sm text-danger-500 hover:bg-danger-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          取消
                        </button>
                      </>
                    )}

                    {reservation.status === 'checked-in' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCheckOut(reservation.id);
                        }}
                        className="btn-warning btn-sm"
                      >
                        <Square className="w-3.5 h-3.5" />
                        签退
                      </button>
                    )}

                    {reservation.status === 'completed' && !reservation.rating && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRate(reservation.id);
                        }}
                        className="btn-primary btn-sm"
                      >
                        <Star className="w-3.5 h-3.5" />
                        评价
                      </button>
                    )}

                    {reservation.status === 'completed' && reservation.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-warning-500 text-warning-500" />
                        <span className="text-sm font-medium text-warning-500">
                          {reservation.rating}
                        </span>
                      </div>
                    )}

                    {reservation.status === 'pending' && (
                      <>
                        {canModifyReservation(reservation) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openModifyModal(reservation);
                            }}
                            className="btn-secondary btn-sm"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            修改
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancel(reservation.id);
                          }}
                          className="btn-ghost btn-sm text-neutral-500"
                        >
                          取消预约
                        </button>
                      </>
                    )}

                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-neutral-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-neutral-400" />
                    )}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-neutral-100">
                  <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-neutral-700 mb-2">
                        实验目的
                      </h4>
                      <p className="text-sm text-neutral-600">{reservation.purpose}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-neutral-700 mb-2">
                        参与人员
                      </h4>
                      <p className="text-sm text-neutral-600">{reservation.participants}</p>
                    </div>

                    {reservation.checkInTime && (
                      <div>
                        <h4 className="text-sm font-medium text-neutral-700 mb-2">
                          签到时间
                        </h4>
                        <p className="text-sm text-neutral-600">
                          {format(new Date(reservation.checkInTime), 'yyyy-MM-dd HH:mm:ss', {
                            locale: zhCN,
                          })}
                        </p>
                      </div>
                    )}

                    {reservation.checkOutTime && (
                      <div>
                        <h4 className="text-sm font-medium text-neutral-700 mb-2">
                          签退时间
                        </h4>
                        <p className="text-sm text-neutral-600">
                          {format(new Date(reservation.checkOutTime), 'yyyy-MM-dd HH:mm:ss', {
                            locale: zhCN,
                          })}
                        </p>
                      </div>
                    )}

                    {reservation.reviewComment && (
                      <div className="md:col-span-2">
                        <h4 className="text-sm font-medium text-neutral-700 mb-2">
                          审核意见
                        </h4>
                        <p className="text-sm text-neutral-600">
                          {reservation.reviewComment}
                        </p>
                      </div>
                    )}

                    {reservation.feedback && (
                      <div className="md:col-span-2">
                        <h4 className="text-sm font-medium text-neutral-700 mb-2">
                          使用评价
                        </h4>
                        <div className="flex items-center gap-2 mb-2">
                          <Rating value={reservation.rating || 0} readonly size="sm" />
                        </div>
                        <p className="text-sm text-neutral-600">{reservation.feedback}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredReservations.length === 0 && (
          <div className="card p-16 text-center">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-neutral-500">暂无预约记录</p>
          </div>
        )}
      </div>

      {/* 评价弹窗 */}
      <Modal isOpen={showRateModal} onClose={() => setShowRateModal(false)} title="设备评价">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              设备评分
            </label>
            <div className="flex items-center gap-3">
              <Rating value={rating} onChange={setRating} size="lg" />
              <span className="text-lg font-semibold text-warning-500">{rating}.0</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              使用反馈
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="请描述设备使用情况、遇到的问题或建议..."
              rows={4}
              className="textarea"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowRateModal(false)} className="btn-secondary">
              取消
            </button>
            <button onClick={submitRating} className="btn-primary">
              提交评价
            </button>
          </div>
        </div>
      </Modal>

      {/* 取消弹窗 */}
      <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} title="取消预约">
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">确定要取消这个预约吗？</p>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              取消原因（可选）
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="请填写取消原因..."
              rows={3}
              className="textarea"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowCancelModal(false)} className="btn-secondary">
              再想想
            </button>
            <button onClick={confirmCancel} className="btn-danger">
              确认取消
            </button>
          </div>
        </div>
      </Modal>

      {/* 修改预约弹窗 */}
      <Modal isOpen={showModifyModal} onClose={() => setShowModifyModal(false)} title="修改预约">
        <div className="space-y-5">
          {modifyReservation && (
            <>
              <div className="p-3 bg-primary-50 border border-primary-100 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-primary-500" />
                  <p className="text-sm text-primary-700">
                    修改后将重新进入待审核状态，请管理员再次审核
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    <Calendar className="w-3.5 h-3.5 inline mr-1" />
                    预约日期
                  </label>
                  <input
                    type="date"
                    value={modifyDate}
                    onChange={(e) => {
                      setModifyDate(e.target.value);
                      setModifyError('');
                    }}
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
                    value={modifyStartTime}
                    onChange={(e) => {
                      setModifyStartTime(e.target.value);
                      setModifyError('');
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
                    <Clock className="w-3.5 h-3.5 inline mr-1" />
                    结束时间
                  </label>
                  <select
                    value={modifyEndTime}
                    onChange={(e) => {
                      setModifyEndTime(e.target.value);
                      setModifyError('');
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

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  实验目的
                </label>
                <textarea
                  value={modifyPurpose}
                  onChange={(e) => setModifyPurpose(e.target.value)}
                  placeholder="请简要描述实验目的..."
                  rows={3}
                  className="textarea"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  参与人员
                </label>
                <input
                  type="text"
                  value={modifyParticipants}
                  onChange={(e) => setModifyParticipants(e.target.value)}
                  placeholder="请输入参与人员姓名，多人用逗号分隔"
                  className="input"
                />
              </div>

              {modifyError && (
                <div className="p-3 bg-danger-50 border border-danger-100 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-danger-500 mt-0.5" />
                    <p className="text-sm text-danger-700">{modifyError}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowModifyModal(false)} className="btn-secondary">
                  取消
                </button>
                <button onClick={handleModifySubmit} className="btn-primary">
                  <Edit3 className="w-3.5 h-3.5" />
                  提交修改
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
