import { useState, useMemo } from 'react';
import {
  ClipboardCheck,
  Clock,
  Users,
  Bell,
  BarChart3,
  Check,
  X,
  Download,
  UserX,
  UserCheck,
  Plus,
  Trash2,
  Eye,
  Settings,
  CalendarOff,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppStore } from '@/store/useAppStore';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import Tabs from '@/components/Tabs';
import type { DaySchedule, Holiday, ScheduleException } from '@/types';

const sideMenuItems = [
  { key: 'review', label: '预约审核', icon: ClipboardCheck },
  { key: 'time', label: '时间设置', icon: Clock },
  { key: 'users', label: '账号管理', icon: Users },
  { key: 'notifications', label: '通知发布', icon: Bell },
  { key: 'stats', label: '统计导出', icon: BarChart3 },
];

export default function AdminPage() {
  const {
    reservations,
    users,
    equipments,
    notifications,
    schedules,
    holidays,
    getEquipmentById,
    getUserById,
    getScheduleByEquipment,
    approveReservation,
    rejectReservation,
    toggleUserBlacklist,
    addNotification,
    updateEquipmentStatus,
    updateEquipmentSchedule,
    addScheduleException,
    removeScheduleException,
    addHoliday,
    removeHoliday,
    resetToDefault,
  } = useAppStore();

  const [activeSection, setActiveSection] = useState('review');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifContent, setNotifContent] = useState('');
  const [notifType, setNotifType] = useState<'maintenance' | 'disabled' | 'info'>('info');
  const [notifEquipment, setNotifEquipment] = useState('');
  const [notifStartDate, setNotifStartDate] = useState('');
  const [notifEndDate, setNotifEndDate] = useState('');
  const [viewingReservation, setViewingReservation] = useState<string | null>(null);

  // 时间表编辑弹窗
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingEquipmentId, setEditingEquipmentId] = useState<string | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<DaySchedule[]>([]);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [exceptionEquipmentId, setExceptionEquipmentId] = useState<string | null>(null);
  const [exceptionDate, setExceptionDate] = useState('');
  const [exceptionEnabled, setExceptionEnabled] = useState(false);
  const [exceptionStartTime, setExceptionStartTime] = useState('');
  const [exceptionEndTime, setExceptionEndTime] = useState('');
  const [exceptionReason, setExceptionReason] = useState('');

  // 节假日管理
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayName, setHolidayName] = useState('');
  const [holidayStartDate, setHolidayStartDate] = useState('');
  const [holidayEndDate, setHolidayEndDate] = useState('');
  const [holidayDescription, setHolidayDescription] = useState('');

  const weekDayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  const openScheduleModal = (equipmentId: string) => {
    const schedule = getScheduleByEquipment(equipmentId);
    setEditingEquipmentId(equipmentId);
    setEditingSchedule(JSON.parse(JSON.stringify(schedule.defaultSchedule)));
    setShowScheduleModal(true);
  };

  const handleSaveSchedule = () => {
    if (!editingEquipmentId) return;
    updateEquipmentSchedule(editingEquipmentId, { defaultSchedule: editingSchedule });
    setShowScheduleModal(false);
    setEditingEquipmentId(null);
  };

  const updateDaySchedule = (dayOfWeek: number, field: keyof DaySchedule, value: any) => {
    setEditingSchedule(
      editingSchedule.map((d) =>
        d.dayOfWeek === dayOfWeek ? { ...d, [field]: value } : d
      )
    );
  };

  const openExceptionModal = (equipmentId: string) => {
    setExceptionEquipmentId(equipmentId);
    setExceptionDate('');
    setExceptionEnabled(false);
    setExceptionStartTime('');
    setExceptionEndTime('');
    setExceptionReason('');
    setShowExceptionModal(true);
  };

  const handleAddException = () => {
    if (!exceptionEquipmentId || !exceptionDate) return;

    addScheduleException(exceptionEquipmentId, {
      date: exceptionDate,
      enabled: exceptionEnabled,
      startTime: exceptionStartTime || undefined,
      endTime: exceptionEndTime || undefined,
      reason: exceptionReason || undefined,
      type: 'temporary',
    });
    setShowExceptionModal(false);
  };

  const handleAddHoliday = () => {
    if (!holidayName || !holidayStartDate || !holidayEndDate) return;

    addHoliday({
      name: holidayName,
      startDate: holidayStartDate,
      endDate: holidayEndDate,
      description: holidayDescription || undefined,
    });
    setShowHolidayModal(false);
    setHolidayName('');
    setHolidayStartDate('');
    setHolidayEndDate('');
    setHolidayDescription('');
  };

  const handleResetData = () => {
    if (confirm('确定要重置所有数据为默认状态吗？此操作不可恢复！')) {
      resetToDefault();
    }
  };

  // 待审核预约
  const pendingReservations = useMemo(
    () =>
      reservations
        .filter((r) => r.status === 'pending')
        .sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        ),
    [reservations]
  );

  // 全部预约
  const allReservations = useMemo(
    () =>
      [...reservations].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [reservations]
  );

  // 普通用户列表
  const normalUsers = useMemo(
    () => users.filter((u) => u.role === 'user'),
    [users]
  );

  // 统计数据
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const monthReservations = reservations.filter((r) => {
      const rDate = new Date(r.createdAt);
      return rDate >= monthStart && rDate <= monthEnd;
    });

    const completedCount = monthReservations.filter((r) => r.status === 'completed').length;
    const approvedCount = monthReservations.filter(
      (r) => r.status === 'approved' || r.status === 'completed' || r.status === 'checked-in'
    ).length;
    const pendingCount = monthReservations.filter((r) => r.status === 'pending').length;

    const equipmentUsage = equipments.map((eq) => {
      const eqReservations = reservations.filter(
        (r) =>
          r.equipmentId === eq.id &&
          (r.status === 'completed' || r.status === 'checked-in' || r.status === 'approved')
      );
      const totalHours = eqReservations.reduce((acc, r) => {
        const start = new Date(r.startTime);
        const end = new Date(r.endTime);
        return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }, 0);
      return {
        equipment: eq,
        count: eqReservations.length,
        hours: Math.round(totalHours * 10) / 10,
      };
    });

    return {
      totalReservations: monthReservations.length,
      completedCount,
      approvedCount,
      pendingCount,
      equipmentUsage: equipmentUsage.sort((a, b) => b.count - a.count),
      daysInMonth: daysInMonth.length,
    };
  }, [reservations, equipments]);

  const handleApprove = (id: string) => {
    approveReservation(id, '预约已通过，请按时使用。');
  };

  const handleReject = (id: string) => {
    setRejectingId(id);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const confirmReject = () => {
    if (rejectingId) {
      rejectReservation(rejectingId, rejectReason || '预约未通过审核。');
    }
    setShowRejectModal(false);
    setRejectingId(null);
  };

  const handleToggleBlacklist = (userId: string) => {
    const user = getUserById(userId);
    if (user?.isBlacklisted) {
      toggleUserBlacklist(userId);
    } else {
      const reason = prompt('请输入拉黑原因：');
      if (reason !== null) {
        toggleUserBlacklist(userId, reason || '违规操作');
      }
    }
  };

  const handleAddNotification = () => {
    if (!notifTitle || !notifContent || !notifStartDate || !notifEndDate) return;

    addNotification({
      equipmentId: notifEquipment || undefined,
      title: notifTitle,
      content: notifContent,
      type: notifType,
      startDate: new Date(notifStartDate).toISOString(),
      endDate: new Date(notifEndDate).toISOString(),
      isActive: true,
    });

    setShowNotifModal(false);
    setNotifTitle('');
    setNotifContent('');
    setNotifType('info');
    setNotifEquipment('');
    setNotifStartDate('');
    setNotifEndDate('');
  };

  const handleExport = () => {
    const csvContent = generateStatsCSV();
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `月度使用统计_${format(new Date(), 'yyyyMM', { locale: zhCN })}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateStatsCSV = () => {
    let csv = '实验室月度使用统计报表\n';
    csv += `统计月份,${format(new Date(), 'yyyy年MM月', { locale: zhCN })}\n\n`;

    csv += '预约统计\n';
    csv += `总预约数,${stats.totalReservations}\n`;
    csv += `已通过,${stats.approvedCount}\n`;
    csv += `已完成,${stats.completedCount}\n`;
    csv += `待审核,${stats.pendingCount}\n\n`;

    csv += '设备使用排行\n';
    csv += '设备名称,使用次数,使用时长(小时)\n';
    stats.equipmentUsage.forEach((item) => {
      csv += `${item.equipment.name},${item.count},${item.hours}\n`;
    });

    return csv;
  };

  const viewingRes = viewingReservation
    ? reservations.find((r) => r.id === viewingReservation)
    : null;
  const viewingEq = viewingRes ? getEquipmentById(viewingRes.equipmentId) : null;
  const viewingUser = viewingRes ? getUserById(viewingRes.userId) : null;

  const renderContent = () => {
    switch (activeSection) {
      case 'review':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card p-4">
                <p className="text-sm text-neutral-500 mb-1">待审核</p>
                <p className="text-2xl font-bold text-warning-500">
                  {pendingReservations.length}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-neutral-500 mb-1">本月预约</p>
                <p className="text-2xl font-bold text-primary-500">
                  {stats.totalReservations}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-neutral-500 mb-1">已通过</p>
                <p className="text-2xl font-bold text-success-500">{stats.approvedCount}</p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-neutral-500 mb-1">已完成</p>
                <p className="text-2xl font-bold text-neutral-600">
                  {stats.completedCount}
                </p>
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="p-4 border-b border-neutral-100">
                <h3 className="font-semibold text-neutral-800">待审核预约</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                        设备
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                        申请人
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                        时段
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                        实验目的
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                        提交时间
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {pendingReservations.map((r) => {
                      const eq = getEquipmentById(r.equipmentId);
                      const user = getUserById(r.userId);
                      return (
                        <tr key={r.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-100">
                                {eq && (
                                  <img
                                    src={eq.image}
                                    alt={eq.name}
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>
                              <span className="font-medium text-neutral-800">
                                {eq?.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-600">
                            {user?.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-600">
                            <p>
                              {format(new Date(r.startTime), 'MM-dd HH:mm', {
                                locale: zhCN,
                              })}
                            </p>
                            <p className="text-neutral-400 text-xs">
                              至{' '}
                              {format(new Date(r.endTime), 'MM-dd HH:mm', {
                                locale: zhCN,
                              })}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-600 max-w-[200px] truncate">
                            {r.purpose}
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-500">
                            {format(new Date(r.createdAt), 'MM-dd HH:mm', {
                              locale: zhCN,
                            })}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setViewingReservation(r.id)}
                                className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
                              >
                                <Eye className="w-4 h-4 text-neutral-500" />
                              </button>
                              <button
                                onClick={() => handleApprove(r.id)}
                                className="p-1.5 rounded-lg hover:bg-success-50 transition-colors"
                              >
                                <Check className="w-4 h-4 text-success-500" />
                              </button>
                              <button
                                onClick={() => handleReject(r.id)}
                                className="p-1.5 rounded-lg hover:bg-danger-50 transition-colors"
                              >
                                <X className="w-4 h-4 text-danger-500" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {pendingReservations.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-neutral-400">
                          暂无待审核预约
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'time':
        return (
          <div className="space-y-6">
            {/* 设备开放时间设置 */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-neutral-800">设备开放时间设置</h3>
                  <p className="text-sm text-neutral-500 mt-1">
                    为每台设备单独设置每日开放区间、临时闭馆和例外日期
                  </p>
                </div>
                <button onClick={handleResetData} className="btn-ghost btn-sm text-warning-600 hover:bg-warning-50">
                  <RefreshCw className="w-3.5 h-3.5" />
                  重置默认数据
                </button>
              </div>

              <div className="space-y-4">
                {equipments.map((eq) => {
                  const schedule = getScheduleByEquipment(eq.id);
                  const defaultOpen = schedule.defaultSchedule.find(
                    (d) => d.dayOfWeek === 1
                  );
                  return (
                    <div
                      key={eq.id}
                      className="p-4 bg-neutral-50 rounded-lg"
                    >
                      <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-200">
                            <img
                              src={eq.image}
                              alt={eq.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-neutral-800">{eq.name}</p>
                              <StatusBadge status={eq.status} />
                            </div>
                            <p className="text-sm text-neutral-500">{eq.location}</p>
                            <p className="text-xs text-neutral-400 mt-1">
                              默认工作日：{defaultOpen?.startTime} - {defaultOpen?.endTime}
                              {schedule.exceptions.length > 0 && (
                                <span className="ml-2 text-warning-600">
                                  · {schedule.exceptions.length} 条例外
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <select
                            value={eq.status}
                            onChange={(e) =>
                              updateEquipmentStatus(
                                eq.id,
                                e.target.value as typeof eq.status
                              )
                            }
                            className="select min-w-[120px] text-sm"
                          >
                            <option value="available">正常开放</option>
                            <option value="maintenance">维护中</option>
                            <option value="disabled">已停用</option>
                          </select>
                          <button
                            onClick={() => openScheduleModal(eq.id)}
                            className="btn-secondary btn-sm"
                          >
                            <Settings className="w-3.5 h-3.5" />
                            设置开放时间
                          </button>
                          <button
                            onClick={() => openExceptionModal(eq.id)}
                            className="btn-secondary btn-sm"
                          >
                            <CalendarOff className="w-3.5 h-3.5" />
                            添加例外
                          </button>
                        </div>
                      </div>

                      {/* 例外日期列表 */}
                      {schedule.exceptions.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-neutral-200">
                          <p className="text-xs font-medium text-neutral-600 mb-2">例外日期：</p>
                          <div className="flex flex-wrap gap-2">
                            {schedule.exceptions.map((exc) => (
                              <div
                                key={exc.id}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${
                                  exc.enabled
                                    ? 'bg-success-50 text-success-700 border border-success-200'
                                    : 'bg-danger-50 text-danger-700 border border-danger-200'
                                }`}
                              >
                                <Calendar className="w-3 h-3" />
                                <span>{exc.date}</span>
                                {exc.reason && <span>· {exc.reason}</span>}
                                <button
                                  onClick={() => removeScheduleException(eq.id, exc.id)}
                                  className="p-0.5 rounded-full hover:bg-white/50 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 节假日管理 */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-neutral-800">节假日闭馆设置</h3>
                  <p className="text-sm text-neutral-500 mt-1">
                    节假日期间所有设备自动停止预约
                  </p>
                </div>
                <button onClick={() => setShowHolidayModal(true)} className="btn-primary">
                  <Plus className="w-4 h-4" />
                  添加节假日
                </button>
              </div>

              {holidays.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {holidays.map((holiday) => (
                    <div
                      key={holiday.id}
                      className="flex items-center justify-between p-3 bg-danger-50 border border-danger-100 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-danger-100 flex items-center justify-center">
                          <CalendarOff className="w-4 h-4 text-danger-600" />
                        </div>
                        <div>
                          <p className="font-medium text-danger-800 text-sm">{holiday.name}</p>
                          <p className="text-xs text-danger-600">
                            {holiday.startDate} ~ {holiday.endDate}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeHoliday(holiday.id)}
                        className="p-1.5 rounded-lg hover:bg-danger-100 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-danger-500" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-400">
                  <CalendarOff className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无节假日设置</p>
                </div>
              )}
            </div>

            {/* 规则说明 */}
            <div className="card p-4 bg-neutral-50 border border-neutral-200">
              <h4 className="font-medium text-neutral-700 mb-2">规则说明</h4>
              <ul className="text-sm text-neutral-600 space-y-1">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
                  <span><strong>优先级</strong>：节假日 {'>'} 临时例外 {'>'} 周时间表</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
                  <span><strong>节假日</strong>：全天所有设备不可预约，优先级最高</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
                  <span><strong>临时例外</strong>：针对单台设备的单日特殊安排，可设置闭馆或特殊开放时段</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
                  <span><strong>周时间表</strong>：常规的每周开放时段，每台设备独立配置</span>
                </li>
              </ul>
            </div>
          </div>
        );

      case 'users':
        return (
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="font-semibold text-neutral-800">用户账号管理</h3>
              <span className="text-sm text-neutral-500">
                共 {normalUsers.length} 个用户
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                      用户
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                      学号/工号
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                      院系
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                      状态
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                      注册时间
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {normalUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-600">
                              {user.name.charAt(0)}
                            </span>
                          </div>
                          <span className="font-medium text-neutral-800">
                            {user.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        {user.studentId}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        {user.department}
                      </td>
                      <td className="px-4 py-3">
                        {user.isBlacklisted ? (
                          <span className="badge-danger">已拉黑</span>
                        ) : (
                          <span className="badge-success">正常</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-500">
                        {format(new Date(user.createdAt), 'yyyy-MM-dd', {
                          locale: zhCN,
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleToggleBlacklist(user.id)}
                          className={`btn-sm ${
                            user.isBlacklisted
                              ? 'btn-secondary text-success-600'
                              : 'btn-ghost text-danger-500 hover:bg-danger-50'
                          }`}
                        >
                          {user.isBlacklisted ? (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              恢复
                            </>
                          ) : (
                            <>
                              <UserX className="w-3.5 h-3.5" />
                              拉黑
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-neutral-800">通知管理</h3>
              <button onClick={() => setShowNotifModal(true)} className="btn-primary">
                <Plus className="w-4 h-4" />
                发布通知
              </button>
            </div>

            <div className="space-y-3">
              {notifications.map((notif) => {
                const eq = notif.equipmentId ? getEquipmentById(notif.equipmentId) : null;
                const typeColors = {
                  maintenance: 'bg-warning-50 border-warning-200 text-warning-700',
                  disabled: 'bg-danger-50 border-danger-200 text-danger-700',
                  info: 'bg-primary-50 border-primary-200 text-primary-700',
                };
                return (
                  <div
                    key={notif.id}
                    className={`card p-4 border ${typeColors[notif.type]}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{notif.title}</h4>
                          {notif.isActive && (
                            <span className="badge-success">生效中</span>
                          )}
                        </div>
                        <p className="text-sm opacity-80">{notif.content}</p>
                        <p className="text-xs mt-2 opacity-70">
                          {format(new Date(notif.startDate), 'yyyy-MM-dd', {
                            locale: zhCN,
                          })}{' '}
                          至{' '}
                          {format(new Date(notif.endDate), 'yyyy-MM-dd', {
                            locale: zhCN,
                          })}
                          {eq && ` · ${eq.name}`}
                        </p>
                      </div>
                      <button className="p-1.5 rounded-lg hover:bg-white/50 transition-colors">
                        <Trash2 className="w-4 h-4 opacity-60" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'stats':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-neutral-800">
                月度使用统计 - {format(new Date(), 'yyyy年MM月', { locale: zhCN })}
              </h3>
              <button onClick={handleExport} className="btn-secondary">
                <Download className="w-4 h-4" />
                导出报表
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card p-4">
                <p className="text-sm text-neutral-500 mb-1">总预约数</p>
                <p className="text-2xl font-bold text-neutral-800">
                  {stats.totalReservations}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-neutral-500 mb-1">通过率</p>
                <p className="text-2xl font-bold text-success-500">
                  {stats.totalReservations > 0
                    ? Math.round((stats.approvedCount / stats.totalReservations) * 100)
                    : 0}
                  %
                </p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-neutral-500 mb-1">设备总数</p>
                <p className="text-2xl font-bold text-primary-500">
                  {equipments.length}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-neutral-500 mb-1">活跃用户</p>
                <p className="text-2xl font-bold text-warning-500">
                  {new Set(reservations.map((r) => r.userId)).size}
                </p>
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="p-4 border-b border-neutral-100">
                <h3 className="font-semibold text-neutral-800">设备使用排行</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                        排名
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                        设备名称
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                        使用次数
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                        使用时长
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                        利用率
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {stats.equipmentUsage.map((item, index) => {
                      const maxHours = stats.equipmentUsage[0]?.hours || 1;
                      const utilization = (item.hours / (stats.daysInMonth * 12)) * 100;
                      return (
                        <tr key={item.equipment.id} className="hover:bg-neutral-50">
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                index === 0
                                  ? 'bg-warning-100 text-warning-600'
                                  : index === 1
                                  ? 'bg-neutral-200 text-neutral-600'
                                  : index === 2
                                  ? 'bg-orange-100 text-orange-600'
                                  : 'bg-neutral-100 text-neutral-500'
                              }`}
                            >
                              {index + 1}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg overflow-hidden bg-neutral-200">
                                <img
                                  src={item.equipment.image}
                                  alt={item.equipment.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <span className="font-medium text-neutral-800">
                                {item.equipment.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-600">
                            {item.count} 次
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-600">
                            {item.hours} 小时
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-neutral-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary-500 rounded-full"
                                  style={{ width: `${Math.min(100, utilization)}%` }}
                                />
                              </div>
                              <span className="text-xs text-neutral-500">
                                {Math.round(utilization * 10) / 10}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex gap-6">
      {/* 侧边子菜单 */}
      <div className="w-48 flex-shrink-0 hidden md:block">
        <div className="card p-2 sticky top-24">
          {sideMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                className={`w-full sidebar-item mb-1 ${
                  activeSection === item.key
                    ? 'sidebar-item-active'
                    : 'sidebar-item-inactive'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 移动端 Tab */}
      <div className="md:hidden w-full mb-4">
        <div className="card p-2 overflow-x-auto">
          <div className="flex gap-1">
            {sideMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveSection(item.key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeSection === item.key
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 主内容 */}
      <div className="flex-1 min-w-0">{renderContent()}</div>

      {/* 驳回弹窗 */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="驳回预约">
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">请填写驳回原因：</p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="请说明驳回原因..."
            rows={4}
            className="textarea"
          />
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowRejectModal(false)} className="btn-secondary">
              取消
            </button>
            <button onClick={confirmReject} className="btn-danger">
              确认驳回
            </button>
          </div>
        </div>
      </Modal>

      {/* 查看预约详情弹窗 */}
      <Modal
        isOpen={!!viewingReservation}
        onClose={() => setViewingReservation(null)}
        title="预约详情"
        size="lg"
      >
        {viewingRes && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-neutral-100">
                {viewingEq && (
                  <img
                    src={viewingEq.image}
                    alt={viewingEq.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-neutral-800 text-lg">
                  {viewingEq?.name}
                </h3>
                <StatusBadge status={viewingRes.status} />
                <p className="text-sm text-neutral-500 mt-2">{viewingEq?.location}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-neutral-500 mb-1">申请人</p>
                <p className="text-sm font-medium text-neutral-800">
                  {viewingUser?.name} ({viewingUser?.studentId})
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-1">所属院系</p>
                <p className="text-sm font-medium text-neutral-800">
                  {viewingUser?.department}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-1">开始时间</p>
                <p className="text-sm font-medium text-neutral-800">
                  {format(new Date(viewingRes.startTime), 'yyyy-MM-dd HH:mm', {
                    locale: zhCN,
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-1">结束时间</p>
                <p className="text-sm font-medium text-neutral-800">
                  {format(new Date(viewingRes.endTime), 'yyyy-MM-dd HH:mm', {
                    locale: zhCN,
                  })}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-neutral-500 mb-1">实验目的</p>
                <p className="text-sm text-neutral-700">{viewingRes.purpose}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-1">参与人员</p>
                <p className="text-sm text-neutral-700">{viewingRes.participants}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-1">提交时间</p>
                <p className="text-sm text-neutral-700">
                  {format(new Date(viewingRes.createdAt), 'yyyy-MM-dd HH:mm', {
                    locale: zhCN,
                  })}
                </p>
              </div>
            </div>

            {viewingRes.reviewComment && (
              <div className="p-3 bg-neutral-50 rounded-lg">
                <p className="text-xs text-neutral-500 mb-1">审核意见</p>
                <p className="text-sm text-neutral-700">{viewingRes.reviewComment}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setViewingReservation(null)}
                className="btn-secondary"
              >
                关闭
              </button>
              {viewingRes.status === 'pending' && (
                <>
                  <button
                    onClick={() => {
                      handleApprove(viewingRes.id);
                      setViewingReservation(null);
                    }}
                    className="btn-success"
                  >
                    <Check className="w-4 h-4" />
                    通过
                  </button>
                  <button
                    onClick={() => {
                      setViewingReservation(null);
                      handleReject(viewingRes.id);
                    }}
                    className="btn-danger"
                  >
                    <X className="w-4 h-4" />
                    驳回
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* 发布通知弹窗 */}
      <Modal
        isOpen={showNotifModal}
        onClose={() => setShowNotifModal(false)}
        title="发布通知"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              通知类型
            </label>
            <select
              value={notifType}
              onChange={(e) => setNotifType(e.target.value as typeof notifType)}
              className="select"
            >
              <option value="info">一般通知</option>
              <option value="maintenance">维护通知</option>
              <option value="disabled">停用通知</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              关联设备（可选）
            </label>
            <select
              value={notifEquipment}
              onChange={(e) => setNotifEquipment(e.target.value)}
              className="select"
            >
              <option value="">全部设备</option>
              {equipments.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              通知标题
            </label>
            <input
              type="text"
              value={notifTitle}
              onChange={(e) => setNotifTitle(e.target.value)}
              placeholder="请输入通知标题"
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              通知内容
            </label>
            <textarea
              value={notifContent}
              onChange={(e) => setNotifContent(e.target.value)}
              placeholder="请输入通知内容..."
              rows={4}
              className="textarea"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                开始日期
              </label>
              <input
                type="date"
                value={notifStartDate}
                onChange={(e) => setNotifStartDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                结束日期
              </label>
              <input
                type="date"
                value={notifEndDate}
                onChange={(e) => setNotifEndDate(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowNotifModal(false)} className="btn-secondary">
              取消
            </button>
            <button
              onClick={handleAddNotification}
              disabled={!notifTitle || !notifContent}
              className="btn-primary"
            >
              发布
            </button>
          </div>
        </div>
      </Modal>

      {/* 时间表编辑弹窗 */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title="设置开放时间"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-500">
            设置每周各天的开放时间，关闭开关表示当天不开放
          </p>

          <div className="space-y-3">
            {editingSchedule.map((day) => (
              <div
                key={day.dayOfWeek}
                className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                  day.enabled ? 'bg-primary-50/50' : 'bg-neutral-50'
                }`}
              >
                <div className="w-20 flex-shrink-0">
                  <span className={`font-medium ${day.enabled ? 'text-primary-700' : 'text-neutral-500'}`}>
                    {weekDayNames[day.dayOfWeek]}
                  </span>
                </div>

                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={(e) => updateDaySchedule(day.dayOfWeek, 'enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                </label>

                {day.enabled && (
                  <>
                    <select
                      value={day.startTime}
                      onChange={(e) => updateDaySchedule(day.dayOfWeek, 'startTime', e.target.value)}
                      className="select flex-1 max-w-[120px]"
                    >
                      {Array.from({ length: 13 }, (_, i) => i + 7).map((hour) => (
                        <option key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                          {hour.toString().padStart(2, '0')}:00
                        </option>
                      ))}
                    </select>
                    <span className="text-neutral-400 flex-shrink-0">至</span>
                    <select
                      value={day.endTime}
                      onChange={(e) => updateDaySchedule(day.dayOfWeek, 'endTime', e.target.value)}
                      className="select flex-1 max-w-[120px]"
                    >
                      {Array.from({ length: 13 }, (_, i) => i + 8).map((hour) => (
                        <option key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                          {hour.toString().padStart(2, '0')}:00
                        </option>
                      ))}
                    </select>
                  </>
                )}

                {!day.enabled && (
                  <span className="text-sm text-neutral-400">全天关闭</span>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
            <button onClick={() => setShowScheduleModal(false)} className="btn-secondary">
              取消
            </button>
            <button onClick={handleSaveSchedule} className="btn-primary">
              保存设置
            </button>
          </div>
        </div>
      </Modal>

      {/* 例外日期弹窗 */}
      <Modal
        isOpen={showExceptionModal}
        onClose={() => setShowExceptionModal(false)}
        title="添加例外日期"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-500">
            设置单日的特殊开放安排，优先级高于周时间表
          </p>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              日期
            </label>
            <input
              type="date"
              value={exceptionDate}
              onChange={(e) => setExceptionDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="input"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={exceptionEnabled}
                onChange={(e) => setExceptionEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
            <span className="text-sm text-neutral-700">
              {exceptionEnabled ? '当天特殊开放' : '当天闭馆'}
            </span>
          </div>

          {exceptionEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  开始时间
                </label>
                <select
                  value={exceptionStartTime}
                  onChange={(e) => setExceptionStartTime(e.target.value)}
                  className="select"
                >
                  <option value="">请选择</option>
                  {Array.from({ length: 13 }, (_, i) => i + 7).map((hour) => (
                    <option key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                      {hour.toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  结束时间
                </label>
                <select
                  value={exceptionEndTime}
                  onChange={(e) => setExceptionEndTime(e.target.value)}
                  className="select"
                >
                  <option value="">请选择</option>
                  {Array.from({ length: 13 }, (_, i) => i + 8).map((hour) => (
                    <option key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                      {hour.toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              原因说明（可选）
            </label>
            <input
              type="text"
              value={exceptionReason}
              onChange={(e) => setExceptionReason(e.target.value)}
              placeholder="如：设备检修、临时活动等"
              className="input"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowExceptionModal(false)} className="btn-secondary">
              取消
            </button>
            <button
              onClick={handleAddException}
              disabled={!exceptionDate}
              className="btn-primary"
            >
              添加
            </button>
          </div>
        </div>
      </Modal>

      {/* 节假日弹窗 */}
      <Modal
        isOpen={showHolidayModal}
        onClose={() => setShowHolidayModal(false)}
        title="添加节假日"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-500">
            节假日期间所有设备全天不可预约
          </p>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              节假日名称
            </label>
            <input
              type="text"
              value={holidayName}
              onChange={(e) => setHolidayName(e.target.value)}
              placeholder="如：元旦、春节、劳动节等"
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                开始日期
              </label>
              <input
                type="date"
                value={holidayStartDate}
                onChange={(e) => setHolidayStartDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                结束日期
              </label>
              <input
                type="date"
                value={holidayEndDate}
                onChange={(e) => setHolidayEndDate(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              描述说明（可选）
            </label>
            <textarea
              value={holidayDescription}
              onChange={(e) => setHolidayDescription(e.target.value)}
              placeholder="节假日放假安排说明..."
              rows={3}
              className="textarea"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowHolidayModal(false)} className="btn-secondary">
              取消
            </button>
            <button
              onClick={handleAddHoliday}
              disabled={!holidayName || !holidayStartDate || !holidayEndDate}
              className="btn-primary"
            >
              添加
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
