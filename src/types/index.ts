export interface User {
  id: string;
  name: string;
  studentId: string;
  department: string;
  role: 'user' | 'admin';
  avatar: string;
  isBlacklisted: boolean;
  blacklistReason?: string;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
}

export interface EquipmentType {
  id: string;
  name: string;
}

export interface Equipment {
  id: string;
  name: string;
  typeId: string;
  departmentId: string;
  location: string;
  image: string;
  status: 'available' | 'in-use' | 'maintenance' | 'disabled';
  description: string;
  operationManual: string;
  safetyRequirement: string;
  technicalParams: Record<string, string>;
}

export type ReservationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'checked-in'
  | 'completed'
  | 'cancelled';

export interface Reservation {
  id: string;
  userId: string;
  equipmentId: string;
  startTime: string;
  endTime: string;
  purpose: string;
  participants: string;
  status: ReservationStatus;
  checkInTime?: string;
  checkOutTime?: string;
  rating?: number;
  feedback?: string;
  reviewComment?: string;
  createdAt: string;
}

export interface Consumable {
  id: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  specification: string;
}

export interface ConsumptionRecord {
  id: string;
  consumableId: string;
  reservationId?: string;
  userId: string;
  quantity: number;
  remark: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  equipmentId?: string;
  title: string;
  content: string;
  type: 'maintenance' | 'disabled' | 'info';
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

export interface DaySchedule {
  dayOfWeek: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

export interface EquipmentSchedule {
  equipmentId: string;
  defaultSchedule: DaySchedule[];
  exceptions: ScheduleException[];
}

export interface ScheduleException {
  id: string;
  date: string;
  enabled: boolean;
  startTime?: string;
  endTime?: string;
  reason?: string;
  type: 'temporary' | 'holiday';
}

export interface Holiday {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  description?: string;
}

export interface PersistState {
  reservations: Reservation[];
  consumables: Consumable[];
  consumptionRecords: ConsumptionRecord[];
  users: User[];
  notifications: Notification[];
  equipments: Equipment[];
  schedules: EquipmentSchedule[];
  holidays: Holiday[];
}
