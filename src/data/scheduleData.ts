import type { EquipmentSchedule, Holiday, DaySchedule } from '@/types';

export const defaultWeekSchedule: DaySchedule[] = [
  { dayOfWeek: 1, enabled: true, startTime: '08:00', endTime: '20:00' },
  { dayOfWeek: 2, enabled: true, startTime: '08:00', endTime: '20:00' },
  { dayOfWeek: 3, enabled: true, startTime: '08:00', endTime: '20:00' },
  { dayOfWeek: 4, enabled: true, startTime: '08:00', endTime: '20:00' },
  { dayOfWeek: 5, enabled: true, startTime: '08:00', endTime: '20:00' },
  { dayOfWeek: 6, enabled: true, startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 0, enabled: false, startTime: '09:00', endTime: '18:00' },
];

export const defaultSchedules: EquipmentSchedule[] = [
  {
    equipmentId: 'equip-1',
    defaultSchedule: defaultWeekSchedule,
    exceptions: [],
  },
  {
    equipmentId: 'equip-2',
    defaultSchedule: defaultWeekSchedule,
    exceptions: [],
  },
  {
    equipmentId: 'equip-3',
    defaultSchedule: defaultWeekSchedule,
    exceptions: [],
  },
  {
    equipmentId: 'equip-4',
    defaultSchedule: defaultWeekSchedule,
    exceptions: [],
  },
  {
    equipmentId: 'equip-5',
    defaultSchedule: defaultWeekSchedule,
    exceptions: [],
  },
  {
    equipmentId: 'equip-6',
    defaultSchedule: defaultWeekSchedule,
    exceptions: [],
  },
  {
    equipmentId: 'equip-7',
    defaultSchedule: defaultWeekSchedule,
    exceptions: [],
  },
  {
    equipmentId: 'equip-8',
    defaultSchedule: defaultWeekSchedule,
    exceptions: [],
  },
  {
    equipmentId: 'equip-9',
    defaultSchedule: defaultWeekSchedule,
    exceptions: [],
  },
  {
    equipmentId: 'equip-10',
    defaultSchedule: defaultWeekSchedule,
    exceptions: [],
  },
  {
    equipmentId: 'equip-11',
    defaultSchedule: defaultWeekSchedule,
    exceptions: [],
  },
  {
    equipmentId: 'equip-12',
    defaultSchedule: defaultWeekSchedule,
    exceptions: [],
  },
];

export const defaultHolidays: Holiday[] = [
  {
    id: 'holiday-1',
    name: '元旦',
    startDate: '2026-01-01',
    endDate: '2026-01-03',
  },
  {
    id: 'holiday-2',
    name: '春节',
    startDate: '2026-02-16',
    endDate: '2026-02-22',
  },
  {
    id: 'holiday-3',
    name: '清明节',
    startDate: '2026-04-04',
    endDate: '2026-04-06',
  },
  {
    id: 'holiday-4',
    name: '劳动节',
    startDate: '2026-05-01',
    endDate: '2026-05-05',
  },
  {
    id: 'holiday-5',
    name: '端午节',
    startDate: '2026-06-19',
    endDate: '2026-06-21',
  },
  {
    id: 'holiday-6',
    name: '中秋节',
    startDate: '2026-09-25',
    endDate: '2026-09-27',
  },
  {
    id: 'holiday-7',
    name: '国庆节',
    startDate: '2026-10-01',
    endDate: '2026-10-07',
  },
];
