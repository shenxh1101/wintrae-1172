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
  getEquipmentAvailabilityDetail: (equipmentId: string, date: string, startTime: string, endTime: string) => {
    available: boolean;
    reason?: string;
    ruleType?: 'status' | 'holiday' | 'exception' | 'schedule' | 'conflict' | 'expired';
    alternativeWindow?: string;
  };
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
      return { available: true };
    }
    const { equipments, holidays, reservations } = get();
    const equipment = equipments.find((e) => e.id === equipmentId);
    if (!equipment) {
      return { available: false, ruleType: 'status', reason: '设备不存在' };
    }
    if (equipment.status === 'disabled') {
      return { available: false, ruleType: 'status', reason: '设备已停用' };
    }
    if (equipment.status === 'maintenance') {
      return { available: false, ruleType: 'status', reason: '设备维护中' };
    }

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const baseDate = parseISO(date);
    const fullStart = setMinutes(setHours(baseDate, startHour), startMin);
    const fullEnd = setMinutes(setHours(baseDate, endHour), endMin);

    if (fullStart < new Date()) {
      return { available: false, ruleType: 'expired', reason: '预约时间已过期' };
    }

    const schedule = get().getScheduleByEquipment(equipmentId);
    if (schedule) {
      const dateStr = format(baseDate, 'yyyy-MM-dd');
      const exception = schedule.exceptions.find((e) => e.date === dateStr);
      if (exception) {
        if (!exception.enabled) {
          return {
            available: false,
            ruleType: 'exception',
            reason: `临时闭馆：${exception.reason || '设备特殊安排'}`,
          };
        }
        if (exception.startTime && exception.endTime) {
          const [exSH, exSM] = exception.startTime.split(':').map(Number);
          const [exEH, exEM] = exception.endTime.split(':').map(Number);
          const exStart = setMinutes(setHours(baseDate, exSH), exSM);
          const exEnd = setMinutes(setHours(baseDate, exEH), exEM);
          if (!(fullStart >= exStart && fullEnd <= exEnd)) {
            return {
              available: false,
              ruleType: 'exception',
              reason: `特殊开放时段仅 ${exception.startTime} - ${exception.endTime}`,
              alternativeWindow: `${exception.startTime} - ${exception.endTime}`,
            };
          }
        }
      } else {
        const holiday = holidays.find((h) =>
          isWithinInterval(baseDate, {
            start: startOfDay(parseISO(h.startDate)),
            end: endOfDay(parseISO(h.endDate)),
          })
        );
        if (holiday) {
          return {
            available: false,
            ruleType: 'holiday',
            reason: `节假日关闭：${holiday.name}${holiday.description ? ' - ' + holiday.description : ''}`,
          };
        }

        const dayOfWeek = baseDate.getDay();
        const daySchedule = schedule.defaultSchedule.find((d) => d.dayOfWeek === dayOfWeek);
        if (!daySchedule || !daySchedule.enabled) {
          return {
            available: false,
            ruleType: 'schedule',
            reason: `设备每周${weekDayNames[dayOfWeek]}例行不开放`,
          };
        }
        const [dSH, dSM] = daySchedule.startTime.split(':').map(Number);
        const [dEH, dEM] = daySchedule.endTime.split(':').map(Number);
        const dStart = setMinutes(setHours(baseDate, dSH), dSM);
        const dEnd = setMinutes(setHours(baseDate, dEH), dEM);
        if (!(fullStart >= dStart && fullEnd <= dEnd)) {
          return {
            available: false,
            ruleType: 'schedule',
            reason: `不在开放时段内，该日开放时间 ${daySchedule.startTime} - ${daySchedule.endTime}`,
            alternativeWindow: `${daySchedule.startTime} - ${daySchedule.endTime}`,
          };
        }
      }
    }

    const hasConflict = reservations.some((r) => {
      if (r.equipmentId !== equipmentId) return false;
      if (r.status === 'cancelled' || r.status === 'rejected') return false;
      return areIntervalsOverlapping(
        { start: fullStart, end: fullEnd },
        { start: new Date(r.startTime), end: new Date(r.endTime) }
      );
    });
    if (hasConflict) {
      return { available: false, ruleType: 'conflict', reason: '与其他预约时段冲突' };
    }

    return { available: true };
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
    get().addAuditLog({
      actionType: 'reservation.modify',
      targetId: id,
      targetName: eq?.name || reservation.equipmentId,
      detail: `修改预约时段：${format(new Date(startTime), 'MM月dd日 HH:mm')} - ${format(new Date(endTime), 'HH:mm')}`,
    });
    return true;
  },

  cancelReservation: (id: string) => {
    const r = get().reservations.find((x) => x.id === id);
    const eq = r ? get().getEquipmentById(r.equipmentId) : undefined;
    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.id === id ? { ...r, status: 'cancelled' as ReservationStatus } : r
      ),
    }));
    get().addAuditLog({
      actionType: 'reservation.cancel',
      targetId: id,
      targetName: eq?.name || r?.equipmentId || id,
      detail: `取消预约${r ? `（${format(new Date(r.startTime), 'MM月dd日 HH:mm')} - ${format(new Date(r.endTime), 'HH:mm')}）` : ''}`,
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
    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.id === id
          ? { ...r, status: 'approved' as ReservationStatus, reviewComment: comment }
          : r
      ),
    }));
    get().addAuditLog({
      actionType: 'reservation.approve',
      targetId: id,
      targetName: eq?.name || r?.equipmentId || id,
      detail: `审批通过预约${r ? `（${format(new Date(r.startTime), 'MM月dd日 HH:mm')} - ${format(new Date(r.endTime), 'HH:mm')}）` : ''}${comment ? `：${comment}` : ''}`,
    });
  },

  rejectReservation: (id: string, comment: string) => {
    const r = get().reservations.find((x) => x.id === id);
    const eq = r ? get().getEquipmentById(r.equipmentId) : undefined;
    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.id === id
          ? { ...r, status: 'rejected' as ReservationStatus, reviewComment: comment }
          : r
      ),
    }));
    get().addAuditLog({
      actionType: 'reservation.reject',
      targetId: id,
      targetName: eq?.name || r?.equipmentId || id,
      detail: `驳回预约${r ? `（${format(new Date(r.startTime), 'MM月dd日 HH:mm')} - ${format(new Date(r.endTime), 'HH:mm')}）` : ''}：${comment}`,
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
    get().addAuditLog({
      actionType: 'user.blacklist.toggle',
      targetId: userId,
      targetName: u?.name || userId,
      detail: uAfter?.isBlacklisted ? `加入黑名单${reason ? `：${reason}` : ''}` : `移出黑名单`,
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
    set((state) => ({
      equipments: state.equipments.map((e) =>
        e.id === id ? { ...e, status } : e
      ),
    }));
    const statusText = { available: '正常开放', 'in-use': '使用中', maintenance: '维护中', disabled: '已停用' }[status] || status;
    get().addAuditLog({
      actionType: 'equipment.status.change',
      targetId: id,
      targetName: eq?.name || id,
      detail: `将设备状态改为【${statusText}】`,
    });
  },

  updateEquipmentSchedule: (equipmentId: string, schedule: Partial<EquipmentSchedule>) => {
    const eq = get().getEquipmentById(equipmentId);
    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.equipmentId === equipmentId ? { ...s, ...schedule } : s
      ),
    }));
    get().addAuditLog({
      actionType: 'equipment.schedule.update',
      targetId: equipmentId,
      targetName: eq?.name || equipmentId,
      detail: '更新设备默认开放时间表',
    });
  },

  addScheduleException: (equipmentId: string, exception: Omit<import('@/types').ScheduleException, 'id'>) => {
    const eq = get().getEquipmentById(equipmentId);
    set((state) => ({
      schedules: state.schedules.map((s) => {
        if (s.equipmentId !== equipmentId) return s;
        // 检查同一天是否已存在例外，存在则覆盖（upsert）
        const existingIdx = s.exceptions.findIndex((e) => e.date === exception.date);
        if (existingIdx >= 0) {
          const updated = [...s.exceptions];
          updated[existingIdx] = {
            ...updated[existingIdx],
            ...exception,
          };
          return { ...s, exceptions: updated };
        }
        // 不存在则新增
        return {
          ...s,
          exceptions: [...s.exceptions, { ...exception, id: generateId('ex') }],
        };
      }),
    }));
    get().addAuditLog({
      actionType: 'equipment.schedule.exception.add',
      targetId: equipmentId,
      targetName: eq?.name || equipmentId,
      detail: `${exception.enabled ? '添加/覆盖' : '添加/覆盖'}例外日期【${exception.date}】：${exception.reason || (exception.enabled ? '特殊开放' : '临时闭馆')}`,
    });
  },

  updateScheduleException: (equipmentId: string, exceptionId: string, data: Partial<Omit<import('@/types').ScheduleException, 'id'>>) => {
    const eq = get().getEquipmentById(equipmentId);
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
    get().addAuditLog({
      actionType: 'equipment.schedule.exception.update',
      targetId: equipmentId,
      targetName: eq?.name || equipmentId,
      detail: `编辑例外日期【${data.date || exceptionId}】`,
    });
  },

  removeScheduleException: (equipmentId: string, exceptionId: string) => {
    const eq = get().getEquipmentById(equipmentId);
    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.equipmentId === equipmentId
          ? { ...s, exceptions: s.exceptions.filter((e) => e.id !== exceptionId) }
          : s
      ),
    }));
    get().addAuditLog({
      actionType: 'equipment.schedule.exception.remove',
      targetId: equipmentId,
      targetName: eq?.name || equipmentId,
      detail: '删除例外日期规则',
    });
  },

  addHoliday: (holiday) => {
    const newHoliday: Holiday = { ...holiday, id: generateId('holiday') };
    set((state) => ({
      holidays: [...state.holidays, newHoliday],
    }));
    get().addAuditLog({
      actionType: 'holiday.add',
      targetId: newHoliday.id,
      targetName: holiday.name,
      detail: `添加节假日：${holiday.name}（${holiday.startDate} 至 ${holiday.endDate}）`,
    });
  },

  removeHoliday: (id) => {
    const h = get().holidays.find((x) => x.id === id);
    set((state) => ({
      holidays: state.holidays.filter((h) => h.id !== id),
    }));
    get().addAuditLog({
      actionType: 'holiday.remove',
      targetId: id,
      targetName: h?.name || id,
      detail: `删除节假日：${h?.name || id}`,
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
