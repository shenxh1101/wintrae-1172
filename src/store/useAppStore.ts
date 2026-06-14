import { create } from 'zustand';
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
  areIntervalsOverlapping,
  startOfDay,
  endOfDay,
} from 'date-fns';

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
  selectedEquipmentId: string | null;
  selectedDate: Date;

  getCurrentUser: () => User | undefined;
  getEquipmentById: (id: string) => Equipment | undefined;
  getReservationsByEquipment: (equipmentId: string) => Reservation[];
  getReservationsByDate: (date: Date) => Reservation[];
  getMyReservations: () => Reservation[];
  getUserById: (id: string) => User | undefined;
  getDepartmentById: (id: string) => Dept | undefined;
  getEquipmentTypeById: (id: string) => EquipmentType | undefined;
  getConsumableById: (id: string) => Consumable | undefined;
  isSlotAvailable: (equipmentId: string, startTime: string, endTime: string, excludeId?: string) => boolean;

  setSelectedEquipment: (id: string | null) => void;
  setSelectedDate: (date: Date) => void;
  setCurrentUser: (userId: string) => void;

  addReservation: (data: Omit<Reservation, 'id' | 'status' | 'createdAt'>) => void;
  updateReservation: (id: string, data: Partial<Reservation>) => void;
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
}

type Dept = Department;

const generateId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useAppStore = create<AppState>((set, get) => ({
  currentUserId: 'user-1',
  departments: mockDepartments,
  equipmentTypes: mockEquipmentTypes,
  equipments: mockEquipments,
  reservations: mockReservations,
  consumables: mockConsumables,
  consumptionRecords: mockConsumptionRecords,
  users: mockUsers,
  notifications: mockNotifications,
  selectedEquipmentId: null,
  selectedDate: new Date(),

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

  isSlotAvailable: (equipmentId: string, startTime: string, endTime: string, excludeId?: string) => {
    const { reservations, equipments } = get();
    const equipment = equipments.find((e) => e.id === equipmentId);
    if (!equipment || equipment.status === 'disabled' || equipment.status === 'maintenance') {
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

  setSelectedEquipment: (id: string | null) => {
    set({ selectedEquipmentId: id });
  },

  setSelectedDate: (date: Date) => {
    set({ selectedDate: date });
  },

  setCurrentUser: (userId: string) => {
    set({ currentUserId: userId });
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
  },

  updateReservation: (id: string, data: Partial<Reservation>) => {
    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.id === id ? { ...r, ...data } : r
      ),
    }));
  },

  cancelReservation: (id: string) => {
    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.id === id ? { ...r, status: 'cancelled' as ReservationStatus } : r
      ),
    }));
  },

  checkIn: (id: string) => {
    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.id === id
          ? { ...r, status: 'checked-in' as ReservationStatus, checkInTime: new Date().toISOString() }
          : r
      ),
    }));
  },

  checkOut: (id: string) => {
    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.id === id
          ? { ...r, status: 'completed' as ReservationStatus, checkOutTime: new Date().toISOString() }
          : r
      ),
    }));
  },

  rateReservation: (id: string, rating: number, feedback: string) => {
    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.id === id ? { ...r, rating, feedback } : r
      ),
    }));
  },

  approveReservation: (id: string, comment?: string) => {
    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.id === id
          ? { ...r, status: 'approved' as ReservationStatus, reviewComment: comment }
          : r
      ),
    }));
  },

  rejectReservation: (id: string, comment: string) => {
    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.id === id
          ? { ...r, status: 'rejected' as ReservationStatus, reviewComment: comment }
          : r
      ),
    }));
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
  },

  addNotification: (data) => {
    const newNotification: Notification = {
      ...data,
      id: generateId('notif'),
    };
    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));
  },

  updateEquipmentStatus: (id: string, status: Equipment['status']) => {
    set((state) => ({
      equipments: state.equipments.map((e) =>
        e.id === id ? { ...e, status } : e
      ),
    }));
  },
}));
