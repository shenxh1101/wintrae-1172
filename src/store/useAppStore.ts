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
    get().persist();
    return true;
  },

  cancelReservation: (id: string) => {
    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.id === id ? { ...r, status: 'cancelled' as ReservationStatus } : r
      ),
    }));
    get().persist();
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
    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.id === id
          ? { ...r, status: 'approved' as ReservationStatus, reviewComment: comment }
          : r
      ),
    }));
    get().persist();
  },

  rejectReservation: (id: string, comment: string) => {
    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.id === id
          ? { ...r, status: 'rejected' as ReservationStatus, reviewComment: comment }
          : r
      ),
    }));
    get().persist();
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
    get().persist();
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
    set((state) => ({
      equipments: state.equipments.map((e) =>
        e.id === id ? { ...e, status } : e
      ),
    }));
    get().persist();
  },

  updateEquipmentSchedule: (equipmentId: string, schedule: Partial<EquipmentSchedule>) => {
    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.equipmentId === equipmentId ? { ...s, ...schedule } : s
      ),
    }));
    get().persist();
  },

  addScheduleException: (equipmentId: string, exception: Omit<import('@/types').ScheduleException, 'id'>) => {
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
    get().persist();
  },

  updateScheduleException: (equipmentId: string, exceptionId: string, data: Partial<Omit<import('@/types').ScheduleException, 'id'>>) => {
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
    get().persist();
  },

  removeScheduleException: (equipmentId: string, exceptionId: string) => {
    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.equipmentId === equipmentId
          ? { ...s, exceptions: s.exceptions.filter((e) => e.id !== exceptionId) }
          : s
      ),
    }));
    get().persist();
  },

  addHoliday: (holiday) => {
    set((state) => ({
      holidays: [...state.holidays, { ...holiday, id: generateId('holiday') }],
    }));
    get().persist();
  },

  removeHoliday: (id) => {
    set((state) => ({
      holidays: state.holidays.filter((h) => h.id !== id),
    }));
    get().persist();
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
    };

    saveState(stateToPersist);
  },
}));
