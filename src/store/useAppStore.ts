import { create } from 'zustand';
import {
  areIntervalsOverlapping,
  startOfDay,
  endOfDay,
  format,
  parseISO,
  setHours,
  setMinutes,
  isSameDay,
  isWithinInterval,
} from 'date-fns';
import type {
  Equipment,
  Reservation,
  Consumable,
  ConsumptionRecord,
  User,
  Department,
  EquipmentType,
  Notification,
  ReservationStatus,
  EquipmentSchedule,
  Holiday,
  PersistState,
  AuditLog,
  AuditLogActionType,
  AvailabilityDetail,
  AvailabilityHitRule,
} from '@/types';
import {
  equipments as mockEquipments,
  reservations as mockReservations,
  consumables as mockConsumables,
  consumptionRecords as mockConsumptionRecords,
  users as mockUsers,
  departments as mockDepartments,
  equipmentTypes as mockEquipmentTypes,
  notifications as mockNotifications,
} from '@/data/mockData';
import {
  defaultSchedules,
  defaultHolidays,
} from '@/data/scheduleData';
import { loadState, saveState } from '@/utils/persist';

const weekDayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

interface AppState {
  currentUserId: string;
  departments: Department[];
  equipmentTypes: EquipmentType[];
  equipments: Equipment[];
  reservations: Reservation[];
  consumables: Consumable[];
  consumptionRecords: ConsumptionRecord[];
  users: User[];
  notifications: Notification[];
  schedules: EquipmentSchedule[];
  holidays: Holiday[];
  auditLogs: AuditLog[];
  selectedEquipmentId: string | null;
  selectedDate: Date;
  filterDate: string;
  filterStartTime: string;
  filterEndTime: string;

  getCurrentUser: () => User | undefined;
  getEquipmentById: (id: string) => Equipment | undefined;
  getReservationsByEquipment: (equipmentId: string) => Reservation[];
  getReservationsByDate: (date: Date) => Reservation[];
  getMyReservations: () => Reservation[];
  getUserById: (id: string) => User | undefined;
  getDepartmentById: (id: string) => Department | undefined;
  getEquipmentTypeById: (id: string) => EquipmentType | undefined;
  getConsumableById: (id: string) => Consumable | undefined;
  getScheduleByEquipment: (equipmentId: string) => EquipmentSchedule | undefined;
  isSlotAvailable: (equipmentId: string, startTime: string, endTime: string, excludeId?: string) => boolean;
  isWithinOperatingHours: (equipmentId: string, startTime: string, endTime: string) => boolean;
  getAvailableEquipmentsByTime: (date: string, startTime: string, endTime: string, departmentId?: string, typeId?: string) => Equipment[];
  getEquipmentAvailabilityDetail: (equipmentId: string, date: string, startTime: string, endTime: string) => AvailabilityDetail;
  getDayAvailabilityDetail: (equipmentId: string, date: string) => {
    available: boolean;
    hitRules: AvailabilityHitRule[];
    fullReason: string;
    defaultWindow?: string;
  };
  getAlternativeSlots: (equipmentId: string, date: string, preferredStart?: string, count?: number) => Array<{
    startTime: string;
    endTime: string;
  }>;
  validateTimeFilterParams: (date: string, startTime: string, endTime: string) => {
    valid: boolean;
    error?: string;
  };
  canModifyReservation: (reservation: Reservation) => boolean;

  setSelectedEquipment: (id: string | null) => void;
  setSelectedDate: (date: Date) => void;
  setCurrentUser: (userId: string) => void;
  setFilterDate: (date: string) => void;
  setFilterStartTime: (time: string) => void;
  setFilterEndTime: (time: string) => void;

  addReservation: (data: Omit<Reservation, 'id' | 'status' | 'createdAt'>) => string;
  updateReservation: (id: string, data: Partial<Reservation>) => void;
  modifyReservation: (id: string, startTime: string, endTime: string, purpose?: string, participants?: string) => boolean;
  cancelReservation: (id: string) => void;
  checkIn: (id: string) => void;
  checkOut: (id: string) => void;
  rateReservation: (id: string, rating: number, feedback: string) => void;

  approveReservation: (id: string, comment?: string) => void;
  rejectReservation: (id: string, comment: string) => void;

  addConsumptionRecord: (data: Omit<ConsumptionRecord, 'id' | 'createdAt'>) => void;

  toggleUserBlacklist: (userId: string, reason?: string) => void;
  addNotification: (data: Omit<Notification, 'id'>) => void;
  updateEquipmentStatus: (id: string, status: Equipment['status']) => void;

  updateEquipmentSchedule: (equipmentId: string, schedule: Partial<EquipmentSchedule>) => void;
  addScheduleException: (equipmentId: string, exception: Omit<import('@/types').ScheduleException, 'id'>) => void;
  updateScheduleException: (equipmentId: string, exceptionId: string, data: Partial<Omit<import('@/types').ScheduleException, 'id'>>) => void;
  removeScheduleException: (equipmentId: string, exceptionId: string) => void;
  addHoliday: (holiday: Omit<Holiday, 'id'>) => void;
  removeHoliday: (id: string) => void;
  addAuditLog: (data: Omit<AuditLog, 'id' | 'createdAt'>) => void;

  resetToDefault: () => void;
  persist: () => void;
}

const generateId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const getInitialState = () => {
  const persisted = loadState();

  if (persisted) {
    return {
      reservations: persisted.reservations || mockReservations,
      consumables: persisted.consumables || mockConsumables,
      consumptionRecords: persisted.consumptionRecords || mockConsumptionRecords,
      users: persisted.users || mockUsers,
      notifications: persisted.notifications || mockNotifications,
      equipments: persisted.equipments || mockEquipments,
      schedules: persisted.schedules || defaultSchedules,
      holidays: persisted.holidays || defaultHolidays,
      auditLogs: persisted.auditLogs || [],
    };
  }

  return {
    reservations: mockReservations,
    consumables: mockConsumables,
    consumptionRecords: mockConsumptionRecords,
    users: mockUsers,
    notifications: mockNotifications,
    equipments: mockEquipments,
    schedules: defaultSchedules,
    holidays: defaultHolidays,
    auditLogs: [],
  };
};

const initialState = getInitialState();

export const useAppStore = create<AppState>((set, get) => ({
  currentUserId: 'user-1',
  departments: mockDepartments,
  equipmentTypes: mockEquipmentTypes,
  equipments: initialState.equipments,
  reservations: initialState.reservations,
  consumables: initialState.consumables,
  consumptionRecords: initialState.consumptionRecords,
  users: initialState.users,
  notifications: initialState.notifications,
  schedules: initialState.schedules,
  holidays: initialState.holidays,
  auditLogs: initialState.auditLogs,
  selectedEquipmentId: null,
  selectedDate: new Date(),
  filterDate: '',
  filterStartTime: '',
  filterEndTime: '',

  getCurrentUser: () => {
    const { currentUserId, users } = get();
    return users.find((u) => u.id === currentUserId);
  },

  getEquipmentById: (id: string) => {
    return get().equipments.find((e) => e.id === id);
  },

  getReservationsByEquipment: (equipmentId: string) => {
    return get().reservations.filter((r) => r.equipmentId === equipmentId);
  },

  getReservationsByDate: (date: Date) => {
    const { reservations } = get();
    const start = startOfDay(date);
    const end = endOfDay(date);
    return reservations.filter(
      (r) =>
        r.status !== 'cancelled' &&
        r.status !== 'rejected' &&
        areIntervalsOverlapping(
          { start: new Date(r.startTime), end: new Date(r.endTime) },
          { start, end }
        )
    );
  },

  getMyReservations: () => {
    const { currentUserId, reservations } = get();
    return reservations.filter((r) => r.userId === currentUserId);
  },

  getUserById: (id: string) => {
    return get().users.find((u) => u.id === id);
  },

  getDepartmentById: (id: string) => {
    return get().departments.find((d) => d.id === id);
  },

  getEquipmentTypeById: (id: string) => {
    return get().equipmentTypes.find((t) => t.id === id);
  },

  getConsumableById: (id: string) => {
    return get().consumables.find((c) => c.id === id);
  },

  getScheduleByEquipment: (equipmentId: string) => {
    return get().schedules.find((s) => s.equipmentId === equipmentId);
  },

  isWithinOperatingHours: (equipmentId: string, startTime: string, endTime: string) => {
    const { schedules, holidays } = get();
    const schedule = schedules.find((s) => s.equipmentId === equipmentId);
    if (!schedule) return true;

    const start = new Date(startTime);
    const end = new Date(endTime);
    const dateStr = format(start, 'yyyy-MM-dd');

    const isHoliday = holidays.some((h) =>
      isWithinInterval(start, {
        start: startOfDay(parseISO(h.startDate)),
        end: endOfDay(parseISO(h.endDate)),
      }) ||
      isWithinInterval(end, {
        start: startOfDay(parseISO(h.startDate)),
        end: endOfDay(parseISO(h.endDate)),
      })
    );
    if (isHoliday) return false;

    const exception = schedule.exceptions.find((e) => e.date === dateStr);
    if (exception) {
      if (!exception.enabled) return false;
      if (exception.startTime && exception.endTime) {
        const [exStartHour, exStartMin] = exception.startTime.split(':').map(Number);
        const [exEndHour, exEndMin] = exception.endTime.split(':').map(Number);
        const exStart = setMinutes(setHours(startOfDay(start), exStartHour), exStartMin);
        const exEnd = setMinutes(setHours(startOfDay(start), exEndHour), exEndMin);
        return start >= exStart && end <= exEnd;
      }
    }

    const dayOfWeek = start.getDay();
    const daySchedule = schedule.defaultSchedule.find((d) => d.dayOfWeek === dayOfWeek);
    if (!daySchedule || !daySchedule.enabled) return false;

    const [startHour, startMin] = daySchedule.startTime.split(':').map(Number);
    const [endHour, endMin] = daySchedule.endTime.split(':').map(Number);
    const scheduleStart = setMinutes(setHours(startOfDay(start), startHour), startMin);
    const scheduleEnd = setMinutes(setHours(startOfDay(start), endHour), endMin);

    return start >= scheduleStart && end <= scheduleEnd;
  },

  isSlotAvailable: (equipmentId: string, startTime: string, endTime: string, excludeId?: string) => {
    const { reservations, equipments } = get();
    const equipment = equipments.find((e) => e.id === equipmentId);
    if (!equipment || equipment.status === 'disabled' || equipment.status === 'maintenance') {
      return false;
    }

    if (!get().isWithinOperatingHours(equipmentId, startTime, endTime)) {
      return false;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    return !reservations.some((r) => {
      if (r.id === excludeId) return false;
      if (r.equipmentId !== equipmentId) return false;
      if (r.status === 'cancelled' || r.status === 'rejected') return false;
      return areIntervalsOverlapping(
        { start, end },
        { start: new Date(r.startTime), end: new Date(r.endTime) }
      );
    });
  },

  getAvailableEquipmentsByTime: (date: string, startTime: string, endTime: string, departmentId?: string, typeId?: string) => {
    const { equipments } = get();

    if (!date || !startTime || !endTime) {
      return equipments.filter((e) => {
        if (departmentId && e.departmentId !== departmentId) return false;
        if (typeId && e.typeId !== typeId) return false;
        return true;
      });
    }

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const baseDate = parseISO(date);
    const fullStart = setMinutes(setHours(baseDate, startHour), startMin);
    const fullEnd = setMinutes(setHours(baseDate, endHour), endMin);

    return equipments.filter((e) => {
      if (departmentId && e.departmentId !== departmentId) return false;
      if (typeId && e.typeId !== typeId) return false;
      if (e.status === 'disabled' || e.status === 'maintenance') return false;
      return get().isSlotAvailable(e.id, fullStart.toISOString(), fullEnd.toISOString());
    });
  },

  validateTimeFilterParams: (date, startTime, endTime) => {
    if (!date || !startTime || !endTime) {
      return { valid: true };
    }
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    if (endH * 60 + endM <= startH * 60 + startM) {
      return { valid: false, error: '结束时间必须晚于开始时间' };
    }
    const baseDate = parseISO(date);
    const fullStart = setMinutes(setHours(baseDate, startH), startM);
    if (fullStart < new Date()) {
      return { valid: false, error: '预约时间不能早于当前时间' };
    }
    return { valid: true };
  },

  getEquipmentAvailabilityDetail: (equipmentId, date, startTime, endTime) => {
    if (!date || !startTime || !endTime) {
      return { available: true, hitRules: [], fullReason: '' };
    }
    const { equipments, holidays, reservations } = get();
    const equipment = equipments.find((e) => e.id === equipmentId);

    const hitRules: AvailabilityHitRule[] = [];

    if (!equipment) {
      hitRules.push({
        ruleType: 'status',
        ruleName: '设备状态',
        description: '设备不存在',
        blocksAvailability: true,
      });
      return {
        available: false,
        ruleType: 'status',
        reason: '设备不存在',
        hitRules,
        fullReason: '设备不存在',
      };
    }

    if (equipment.status === 'disabled') {
      hitRules.push({
        ruleType: 'status',
        ruleName: '设备状态',
        description: '设备已停用',
        blocksAvailability: true,
      });
    }
    if (equipment.status === 'maintenance') {
      hitRules.push({
        ruleType: 'status',
        ruleName: '设备状态',
        description: '设备维护中',
        blocksAvailability: true,
      });
    }

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const baseDate = parseISO(date);
    const fullStart = setMinutes(setHours(baseDate, startHour), startMin);
    const fullEnd = setMinutes(setHours(baseDate, endHour), endMin);

    if (fullStart < new Date()) {
      hitRules.push({
        ruleType: 'expired',
        ruleName: '时间过期',
        description: '预约时间已过期',
        blocksAvailability: true,
      });
    }

    const schedule = get().getScheduleByEquipment(equipmentId);
    let defaultWindow: string | undefined;

    if (schedule) {
      const dateStr = format(baseDate, 'yyyy-MM-dd');

      const holiday = holidays.find((h) =>
        isWithinInterval(baseDate, {
          start: startOfDay(parseISO(h.startDate)),
          end: endOfDay(parseISO(h.endDate)),
        })
      );
      if (holiday) {
        hitRules.push({
          ruleType: 'holiday',
          ruleName: '节假日',
          description: `节假日关闭：${holiday.name}${holiday.description ? ' - ' + holiday.description : ''}`,
          blocksAvailability: true,
          ruleSource: holiday,
        });
      }

      const exception = schedule.exceptions.find((e) => e.date === dateStr);
      if (exception) {
        if (!exception.enabled) {
          hitRules.push({
            ruleType: 'exception',
            ruleName: '临时闭馆',
            description: `临时闭馆：${exception.reason || '设备特殊安排'}`,
            blocksAvailability: true,
            ruleSource: exception,
          });
        } else {
          hitRules.push({
            ruleType: 'exception',
            ruleName: '特殊开放',
            description: exception.startTime && exception.endTime
              ? `特殊开放时段：${exception.startTime} - ${exception.endTime}${exception.reason ? '（' + exception.reason + '）' : ''}`
              : `特殊开放：${exception.reason || '当日全天开放'}`,
            blocksAvailability: false,
            ruleSource: exception,
          });

          if (exception.startTime && exception.endTime) {
            const [exSH, exSM] = exception.startTime.split(':').map(Number);
            const [exEH, exEM] = exception.endTime.split(':').map(Number);
            const exStart = setMinutes(setHours(baseDate, exSH), exSM);
            const exEnd = setMinutes(setHours(baseDate, exEH), exEM);
            defaultWindow = `${exception.startTime} - ${exception.endTime}`;
            if (!(fullStart >= exStart && fullEnd <= exEnd)) {
              hitRules.push({
                ruleType: 'exception',
                ruleName: '时段不符',
                description: `不在特殊开放时段内，可用时段 ${exception.startTime} - ${exception.endTime}`,
                blocksAvailability: true,
                alternativeWindow: `${exception.startTime} - ${exception.endTime}`,
              });
            }
          }
        }
      }

      if (!exception) {
        const dayOfWeek = baseDate.getDay();
        const daySchedule = schedule.defaultSchedule.find((d) => d.dayOfWeek === dayOfWeek);
        if (!daySchedule || !daySchedule.enabled) {
          hitRules.push({
            ruleType: 'schedule',
            ruleName: '周时间表',
            description: `设备每周${weekDayNames[dayOfWeek]}例行不开放`,
            blocksAvailability: true,
          });
        } else {
          defaultWindow = `${daySchedule.startTime} - ${daySchedule.endTime}`;
          const [dSH, dSM] = daySchedule.startTime.split(':').map(Number);
          const [dEH, dEM] = daySchedule.endTime.split(':').map(Number);
          const dStart = setMinutes(setHours(baseDate, dSH), dSM);
          const dEnd = setMinutes(setHours(baseDate, dEH), dEM);

          hitRules.push({
            ruleType: 'schedule',
            ruleName: '周时间表',
            description: `正常开放时段：${daySchedule.startTime} - ${daySchedule.endTime}`,
            blocksAvailability: false,
          });

          if (!(fullStart >= dStart && fullEnd <= dEnd)) {
            hitRules.push({
              ruleType: 'schedule',
              ruleName: '时段不符',
              description: `不在开放时段内，该日开放时间 ${daySchedule.startTime} - ${daySchedule.endTime}`,
              blocksAvailability: true,
              alternativeWindow: `${daySchedule.startTime} - ${daySchedule.endTime}`,
            });
          }
        }
      }
    }

    const conflicts = reservations.filter((r) => {
      if (r.equipmentId !== equipmentId) return false;
      if (r.status === 'cancelled' || r.status === 'rejected') return false;
      return areIntervalsOverlapping(
        { start: fullStart, end: fullEnd },
        { start: new Date(r.startTime), end: new Date(r.endTime) }
      );
    });

    if (conflicts.length > 0) {
      hitRules.push({
        ruleType: 'conflict',
        ruleName: '时段冲突',
        description: `与 ${conflicts.length} 个已通过预约时段冲突`,
        blocksAvailability: true,
        ruleSource: conflicts,
      });
    }

    const blockingRule = hitRules.find((r) => r.blocksAvailability);
    const available = !blockingRule;
    const reason = blockingRule?.description;
    const ruleType = blockingRule?.ruleType;
    const alternativeWindow = blockingRule?.alternativeWindow || defaultWindow;

    const fullReasonParts: string[] = [];
    if (hitRules.length > 0) {
      fullReasonParts.push(`【校验结果】${available ? '可预约' : '不可预约'}`);
      hitRules.forEach((r, i) => {
        const icon = r.blocksAvailability ? '🔴' : '🟡';
        fullReasonParts.push(`${icon} ${r.ruleName}：${r.description}`);
      });
    }
    const fullReason = fullReasonParts.join('\n');

    return {
      available,
      reason,
      ruleType,
      alternativeWindow,
      hitRules,
      fullReason,
    };
  },

  getDayAvailabilityDetail: (equipmentId, date) => {
    const { equipments, holidays } = get();
    const equipment = equipments.find((e) => e.id === equipmentId);
    const hitRules: AvailabilityHitRule[] = [];
    let available = true;
    let defaultWindow: string | undefined;

    if (!equipment) {
      return { available: false, hitRules: [], fullReason: '设备不存在' };
    }

    if (equipment.status === 'disabled') {
      hitRules.push({
        ruleType: 'status', ruleName: '设备状态', description: '设备已停用', blocksAvailability: true,
      });
      available = false;
    } else if (equipment.status === 'maintenance') {
      hitRules.push({
        ruleType: 'status', ruleName: '设备状态', description: '设备维护中', blocksAvailability: true,
      });
      available = false;
    }

    const baseDate = parseISO(date);
    const schedule = get().getScheduleByEquipment(equipmentId);
    if (schedule) {
      const dateStr = format(baseDate, 'yyyy-MM-dd');

      const holiday = holidays.find((h) =>
        isWithinInterval(baseDate, {
          start: startOfDay(parseISO(h.startDate)),
          end: endOfDay(parseISO(h.endDate)),
        })
      );
      if (holiday) {
        hitRules.push({
          ruleType: 'holiday',
          ruleName: '节假日',
          description: `节假日关闭：${holiday.name}${holiday.description ? ' - ' + holiday.description : ''}`,
          blocksAvailability: true,
        });
        available = false;
      }

      const exception = schedule.exceptions.find((e) => e.date === dateStr);
      if (exception) {
        if (!exception.enabled) {
          hitRules.push({
            ruleType: 'exception',
            ruleName: '临时闭馆',
            description: `临时闭馆：${exception.reason || '设备特殊安排'}`,
            blocksAvailability: true,
          });
          available = false;
        } else {
          defaultWindow = exception.startTime && exception.endTime
            ? `${exception.startTime} - ${exception.endTime}`
            : '09:00 - 18:00';
          hitRules.push({
            ruleType: 'exception',
            ruleName: '特殊开放',
            description: exception.startTime && exception.endTime
              ? `特殊开放时段：${exception.startTime} - ${exception.endTime}${exception.reason ? '（' + exception.reason + '）' : ''}`
              : `特殊开放：${exception.reason || '当日全天开放'}`,
            blocksAvailability: false,
          });
        }
      } else {
        const dayOfWeek = baseDate.getDay();
        const daySchedule = schedule.defaultSchedule.find((d) => d.dayOfWeek === dayOfWeek);
        if (!daySchedule || !daySchedule.enabled) {
          hitRules.push({
            ruleType: 'schedule',
            ruleName: '周时间表',
            description: `设备每周${weekDayNames[dayOfWeek]}例行不开放`,
            blocksAvailability: true,
          });
          available = false;
        } else {
          defaultWindow = `${daySchedule.startTime} - ${daySchedule.endTime}`;
          hitRules.push({
            ruleType: 'schedule',
            ruleName: '周时间表',
            description: `正常开放时段：${daySchedule.startTime} - ${daySchedule.endTime}`,
            blocksAvailability: false,
          });
        }
      }
    }

    const fullReasonParts: string[] = [];
    if (hitRules.length > 0) {
      fullReasonParts.push(`【${available ? '可预约' : '不可预约'}】`);
      hitRules.forEach((r) => {
        const icon = r.blocksAvailability ? '🔴' : '🟡';
        fullReasonParts.push(`${icon} ${r.ruleName}：${r.description}`);
      });
    }
    const fullReason = fullReasonParts.join('\n');

    return { available, hitRules, fullReason, defaultWindow };
  },

  getAlternativeSlots: (equipmentId, date, preferredStart = '09:00', count = 3) => {
    const dayDetail = get().getDayAvailabilityDetail(equipmentId, date);
    if (!dayDetail.available || !dayDetail.defaultWindow) return [];

    const [winStart, winEnd] = dayDetail.defaultWindow.split(' - ');
    const [winSH, winSM] = winStart.split(':').map(Number);
    const [winEH, winEM] = winEnd.split(':').map(Number);
    const baseDate = parseISO(date);

    const { reservations } = get();
    const dayReservations = reservations.filter((r) => {
      if (r.equipmentId !== equipmentId) return false;
      if (r.status === 'cancelled' || r.status === 'rejected') return false;
      const rDate = format(new Date(r.startTime), 'yyyy-MM-dd');
      return rDate === date;
    });

    const [prefH] = preferredStart.split(':').map(Number);
    const slots: Array<{ startTime: string; endTime: string }> = [];
    let currentH = Math.max(winSH, prefH);

    while (currentH < winEH && slots.length < count) {
      const slotStart = setMinutes(setHours(baseDate, currentH), 0);
      const slotEnd = setMinutes(setHours(baseDate, currentH + 2), 0);
      if (slotEnd > setMinutes(setHours(baseDate, winEH), winEM)) {
        currentH++;
        continue;
      }

      const conflict = dayReservations.some((r) =>
        areIntervalsOverlapping(
          { start: slotStart, end: slotEnd },
          { start: new Date(r.startTime), end: new Date(r.endTime) }
        )
      );

      if (!conflict) {
        slots.push({
          startTime: `${currentH.toString().padStart(2, '0')}:00`,
          endTime: `${(currentH + 2).toString().padStart(2, '0')}:00`,
        });
      }
      currentH++;
    }

    return slots;
  },

  canModifyReservation: (reservation: Reservation) => {
    return reservation.status === 'pending' || reservation.status === 'approved';
  },

  setSelectedEquipment: (id: string | null) => {
    set({ selectedEquipmentId: id });
  },

  setSelectedDate: (date: Date) => {
    set({ selectedDate: date });
  },

  setCurrentUser: (userId: string) => {
    set({ currentUserId: userId });
  },

  setFilterDate: (date: string) => {
    set({ filterDate: date });
  },

  setFilterStartTime: (time: string) => {
    set({ filterStartTime: time });
  },

  setFilterEndTime: (time: string) => {
    set({ filterEndTime: time });
  },

  addReservation: (data) => {
    const newReservation: Reservation = {
      ...data,
      id: generateId('res'),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      reservations: [...state.reservations, newReservation],
    }));
    get().persist();
    return newReservation.id;
  },

  updateReservation: (id: string, data: Partial<Reservation>) => {
    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.id === id ? { ...r, ...data } : r
      ),
    }));
    get().persist();
  },

  modifyReservation: (id: string, startTime: string, endTime: string, purpose?: string, participants?: string) => {
    const reservation = get().reservations.find((r) => r.id === id);
    if (!reservation || !get().canModifyReservation(reservation)) {
      return false;
    }

    if (!get().isSlotAvailable(reservation.equipmentId, startTime, endTime, id)) {
      return false;
    }

    const eq = get().getEquipmentById(reservation.equipmentId);
    const before = {
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      purpose: reservation.purpose,
      participants: reservation.participants,
      status: reservation.status,
    };

    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.id === id
          ? {
              ...r,
              startTime,
              endTime,
              purpose: purpose ?? r.purpose,
              participants: participants ?? r.participants,
              status: 'pending' as ReservationStatus,
              reviewComment: undefined,
              createdAt: new Date().toISOString(),
            }
          : r
      ),
    }));

    const updated = get().reservations.find((r) => r.id === id);
    const after = {
      startTime: updated?.startTime,
      endTime: updated?.endTime,
      purpose: updated?.purpose,
      participants: updated?.participants,
      status: updated?.status,
    };

    get().addAuditLog({
      actionType: 'reservation.modify',
      targetId: id,
      targetName: eq?.name || reservation.equipmentId,
      detail: `修改预约时段：${format(new Date(startTime), 'MM月dd日 HH:mm')} - ${format(new Date(endTime), 'HH:mm')}`,
      before,
      after,
      result: 'success',
    });
    return true;
  },

  cancelReservation: (id: string) => {
    const r = get().reservations.find((x) => x.id === id);
    const eq = r ? get().getEquipmentById(r.equipmentId) : undefined;
    const before = r ? { status: r.status } : undefined;
    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.id === id ? { ...r, status: 'cancelled' as ReservationStatus } : r
      ),
    }));
    const after = { status: 'cancelled' };
    get().addAuditLog({
      actionType: 'reservation.cancel',
      targetId: id,
      targetName: eq?.name || r?.equipmentId || id,
      detail: `取消预约${r ? `（${format(new Date(r.startTime), 'MM月dd日 HH:mm')} - ${format(new Date(r.endTime), 'HH:mm')}）` : ''}`,
      before,
      after,
      result: 'success',
    });
  },

  checkIn: (id: string) => {
    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.id === id
          ? { ...r, status: 'checked-in' as ReservationStatus, checkInTime: new Date().toISOString() }
          : r
      ),
    }));
    get().persist();
  },

  checkOut: (id: string) => {
    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.id === id
          ? { ...r, status: 'completed' as ReservationStatus, checkOutTime: new Date().toISOString() }
          : r
      ),
    }));
    get().persist();
  },

  rateReservation: (id: string, rating: number, feedback: string) => {
    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.id === id ? { ...r, rating, feedback } : r
      ),
    }));
    get().persist();
  },

  approveReservation: (id: string, comment?: string) => {
    const r = get().reservations.find((x) => x.id === id);
    const eq = r ? get().getEquipmentById(r.equipmentId) : undefined;
    const before = r ? { status: r.status, reviewComment: r.reviewComment } : undefined;
    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.id === id
          ? { ...r, status: 'approved' as ReservationStatus, reviewComment: comment }
          : r
      ),
    }));
    const after = { status: 'approved', reviewComment: comment };
    get().addAuditLog({
      actionType: 'reservation.approve',
      targetId: id,
      targetName: eq?.name || r?.equipmentId || id,
      detail: `审批通过预约${r ? `（${format(new Date(r.startTime), 'MM月dd日 HH:mm')} - ${format(new Date(r.endTime), 'HH:mm')}）` : ''}${comment ? `：${comment}` : ''}`,
      before,
      after,
      result: 'success',
    });
  },

  rejectReservation: (id: string, comment: string) => {
    const r = get().reservations.find((x) => x.id === id);
    const eq = r ? get().getEquipmentById(r.equipmentId) : undefined;
    const before = r ? { status: r.status, reviewComment: r.reviewComment } : undefined;
    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.id === id
          ? { ...r, status: 'rejected' as ReservationStatus, reviewComment: comment }
          : r
      ),
    }));
    const after = { status: 'rejected', reviewComment: comment };
    get().addAuditLog({
      actionType: 'reservation.reject',
      targetId: id,
      targetName: eq?.name || r?.equipmentId || id,
      detail: `驳回预约${r ? `（${format(new Date(r.startTime), 'MM月dd日 HH:mm')} - ${format(new Date(r.endTime), 'HH:mm')}）` : ''}：${comment}`,
      before,
      after,
      result: 'success',
    });
  },

  addConsumptionRecord: (data) => {
    const newRecord: ConsumptionRecord = {
      ...data,
      id: generateId('cr'),
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      consumptionRecords: [...state.consumptionRecords, newRecord],
      consumables: state.consumables.map((c) =>
        c.id === data.consumableId
          ? { ...c, stock: Math.max(0, c.stock - data.quantity) }
          : c
      ),
    }));
    get().persist();
  },

  toggleUserBlacklist: (userId: string, reason?: string) => {
    const u = get().users.find((x) => x.id === userId);
    const before = u ? { isBlacklisted: u.isBlacklisted, blacklistReason: u.blacklistReason } : undefined;
    set((state) => ({
      users: state.users.map((u) =>
        u.id === userId
          ? {
              ...u,
              isBlacklisted: !u.isBlacklisted,
              blacklistReason: u.isBlacklisted ? undefined : reason,
            }
          : u
      ),
    }));
    const uAfter = get().users.find((x) => x.id === userId);
    const after = uAfter ? { isBlacklisted: uAfter.isBlacklisted, blacklistReason: uAfter.blacklistReason } : undefined;
    get().addAuditLog({
      actionType: 'user.blacklist.toggle',
      targetId: userId,
      targetName: u?.name || userId,
      detail: uAfter?.isBlacklisted ? `加入黑名单${reason ? `：${reason}` : ''}` : `移出黑名单`,
      before,
      after,
      result: 'success',
    });
  },

  addNotification: (data) => {
    const newNotification: Notification = {
      ...data,
      id: generateId('notif'),
    };
    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));
    get().persist();
  },

  updateEquipmentStatus: (id: string, status: Equipment['status']) => {
    const eq = get().getEquipmentById(id);
    const before = eq ? { status: eq.status } : undefined;
    set((state) => ({
      equipments: state.equipments.map((e) =>
        e.id === id ? { ...e, status } : e
      ),
    }));
    const after = { status };
    const statusText = { available: '正常开放', 'in-use': '使用中', maintenance: '维护中', disabled: '已停用' }[status] || status;
    get().addAuditLog({
      actionType: 'equipment.status.change',
      targetId: id,
      targetName: eq?.name || id,
      detail: `将设备状态改为【${statusText}】`,
      before,
      after,
      result: 'success',
    });
  },

  updateEquipmentSchedule: (equipmentId: string, schedule: Partial<EquipmentSchedule>) => {
    const eq = get().getEquipmentById(equipmentId);
    const before = get().getScheduleByEquipment(equipmentId);
    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.equipmentId === equipmentId ? { ...s, ...schedule } : s
      ),
    }));
    const after = get().getScheduleByEquipment(equipmentId);
    get().addAuditLog({
      actionType: 'equipment.schedule.update',
      targetId: equipmentId,
      targetName: eq?.name || equipmentId,
      detail: '更新设备默认开放时间表',
      before,
      after,
      result: 'success',
    });
  },

  addScheduleException: (equipmentId: string, exception: Omit<import('@/types').ScheduleException, 'id'>) => {
    const eq = get().getEquipmentById(equipmentId);
    const before = get().getScheduleByEquipment(equipmentId);
    set((state) => ({
      schedules: state.schedules.map((s) => {
        if (s.equipmentId !== equipmentId) return s;
        const existingIdx = s.exceptions.findIndex((e) => e.date === exception.date);
        if (existingIdx >= 0) {
          const updated = [...s.exceptions];
          updated[existingIdx] = {
            ...updated[existingIdx],
            ...exception,
          };
          return { ...s, exceptions: updated };
        }
        return {
          ...s,
          exceptions: [...s.exceptions, { ...exception, id: generateId('ex') }],
        };
      }),
    }));
    const after = get().getScheduleByEquipment(equipmentId);
    get().addAuditLog({
      actionType: 'equipment.schedule.exception.add',
      targetId: equipmentId,
      targetName: eq?.name || equipmentId,
      detail: `${exception.enabled ? '添加/覆盖' : '添加/覆盖'}例外日期【${exception.date}】：${exception.reason || (exception.enabled ? '特殊开放' : '临时闭馆')}`,
      before,
      after,
      result: 'success',
    });
  },

  updateScheduleException: (equipmentId: string, exceptionId: string, data: Partial<Omit<import('@/types').ScheduleException, 'id'>>) => {
    const eq = get().getEquipmentById(equipmentId);
    const before = get().getScheduleByEquipment(equipmentId);
    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.equipmentId === equipmentId
          ? {
              ...s,
              exceptions: s.exceptions.map((e) =>
                e.id === exceptionId ? { ...e, ...data } : e
              ),
            }
          : s
      ),
    }));
    const after = get().getScheduleByEquipment(equipmentId);
    get().addAuditLog({
      actionType: 'equipment.schedule.exception.update',
      targetId: equipmentId,
      targetName: eq?.name || equipmentId,
      detail: `编辑例外日期【${data.date || exceptionId}】`,
      before,
      after,
      result: 'success',
    });
  },

  removeScheduleException: (equipmentId: string, exceptionId: string) => {
    const eq = get().getEquipmentById(equipmentId);
    const before = get().getScheduleByEquipment(equipmentId);
    const removed = before?.exceptions.find((e) => e.id === exceptionId);
    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.equipmentId === equipmentId
          ? { ...s, exceptions: s.exceptions.filter((e) => e.id !== exceptionId) }
          : s
      ),
    }));
    const after = get().getScheduleByEquipment(equipmentId);
    get().addAuditLog({
      actionType: 'equipment.schedule.exception.remove',
      targetId: equipmentId,
      targetName: eq?.name || equipmentId,
      detail: `删除例外日期规则【${removed?.date || exceptionId}】`,
      before,
      after,
      result: 'success',
    });
  },

  addHoliday: (holiday) => {
    const newHoliday: Holiday = { ...holiday, id: generateId('holiday') };
    const before = { holidays: [...get().holidays] };
    set((state) => ({
      holidays: [...state.holidays, newHoliday],
    }));
    const after = { holidays: [...get().holidays] };
    get().addAuditLog({
      actionType: 'holiday.add',
      targetId: newHoliday.id,
      targetName: holiday.name,
      detail: `添加节假日：${holiday.name}（${holiday.startDate} 至 ${holiday.endDate}）`,
      before,
      after,
      result: 'success',
    });
  },

  removeHoliday: (id) => {
    const h = get().holidays.find((x) => x.id === id);
    const before = { holidays: [...get().holidays] };
    set((state) => ({
      holidays: state.holidays.filter((h) => h.id !== id),
    }));
    const after = { holidays: [...get().holidays] };
    get().addAuditLog({
      actionType: 'holiday.remove',
      targetId: id,
      targetName: h?.name || id,
      detail: `删除节假日：${h?.name || id}`,
      before,
      after,
      result: 'success',
    });
  },

  resetToDefault: () => {
    set({
      reservations: mockReservations,
      consumables: mockConsumables,
      consumptionRecords: mockConsumptionRecords,
      users: mockUsers,
      notifications: mockNotifications,
      equipments: mockEquipments,
      schedules: defaultSchedules,
      holidays: defaultHolidays,
    });
    get().persist();
  },

  persist: () => {
    const {
      reservations,
      consumables,
      consumptionRecords,
      users,
      notifications,
      equipments,
      schedules,
      holidays,
      auditLogs,
    } = get();

    const stateToPersist: PersistState = {
      reservations,
      consumables,
      consumptionRecords,
      users,
      notifications,
      equipments,
      schedules,
      holidays,
      auditLogs,
    };

    saveState(stateToPersist);
  },

  addAuditLog: (data) => {
    const operator = get().getCurrentUser();
    const newLog: AuditLog = {
      ...data,
      id: generateId('log'),
      createdAt: new Date().toISOString(),
      operatorId: data.operatorId || operator?.id || 'system',
      operatorName: data.operatorName || operator?.name || '系统',
    };
    set((state) => ({
      auditLogs: [newLog, ...state.auditLogs].slice(0, 500),
    }));
    get().persist();
  },
}));
