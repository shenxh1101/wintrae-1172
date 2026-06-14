import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
} from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  setHours,
  setMinutes,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppStore } from '@/store/useAppStore';
import type { Reservation } from '@/types';

interface WeekCalendarProps {
  selectedDate: Date;
  equipmentId: string;
  onSelectSlot: (start: Date, end: Date) => void;
  selectedSlot?: { start: Date; end: Date } | null;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8);

export default function WeekCalendar({
  selectedDate,
  equipmentId,
  onSelectSlot,
  selectedSlot,
}: WeekCalendarProps) {
  const { getReservationsByEquipment } = useAppStore();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(selectedDate, { weekStartsOn: 1 }));
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<Date | null>(null);

  const reservations = useMemo(
    () => getReservationsByEquipment(equipmentId).filter(
      (r) => r.status !== 'cancelled' && r.status !== 'rejected'
    ),
    [getReservationsByEquipment, equipmentId]
  );

  const weekDays = useMemo(() => {
    const start = currentWeekStart;
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentWeekStart]);

  const goToPrevWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, -7));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, 7));
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const getReservationForSlot = (day: Date, hour: number): Reservation | undefined => {
    const slotStart = setMinutes(setHours(day, hour), 0);
    const slotEnd = setMinutes(setHours(day, hour + 1), 0);

    return reservations.find((r) => {
      const rStart = new Date(r.startTime);
      const rEnd = new Date(r.endTime);
      return (
        (slotStart >= rStart && slotStart < rEnd) ||
        (slotEnd > rStart && slotEnd <= rEnd) ||
        (slotStart <= rStart && slotEnd >= rEnd)
      );
    });
  };

  const isSlotSelected = (day: Date, hour: number): boolean => {
    if (!selectedSlot) return false;
    const slotStart = setMinutes(setHours(day, hour), 0);
    const slotEnd = setMinutes(setHours(day, hour + 1), 0);
    return (
      slotStart >= selectedSlot.start &&
      slotEnd <= selectedSlot.end
    );
  };

  const handleSlotMouseDown = (day: Date, hour: number) => {
    const reservation = getReservationForSlot(day, hour);
    if (reservation) return;

    const start = setMinutes(setHours(day, hour), 0);
    setIsSelecting(true);
    setSelectionStart(start);
    onSelectSlot(start, setMinutes(setHours(day, hour + 1), 0));
  };

  const handleSlotMouseEnter = (day: Date, hour: number) => {
    if (!isSelecting || !selectionStart) return;

    const reservation = getReservationForSlot(day, hour);
    if (reservation) return;

    const current = setMinutes(setHours(day, hour + 1), 0);
    const start = selectionStart < current ? selectionStart : current;
    const end = selectionStart < current ? current : selectionStart;

    onSelectSlot(start, end);
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
    setSelectionStart(null);
  };

  const isPastHour = (day: Date, hour: number): boolean => {
    const slotTime = setMinutes(setHours(day, hour), 0);
    return slotTime < new Date();
  };

  return (
    <div
      className="card overflow-hidden"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="flex items-center justify-between p-4 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevWeek}
            className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-neutral-600" />
          </button>
          <h3 className="text-base font-semibold text-neutral-800 min-w-[180px] text-center">
            {format(currentWeekStart, 'yyyy年MM月dd日', { locale: zhCN })} -{' '}
            {format(addDays(currentWeekStart, 6), 'MM月dd日', { locale: zhCN })}
          </h3>
          <button
            onClick={goToNextWeek}
            className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-neutral-600" />
          </button>
        </div>
        <button
          onClick={goToToday}
          className="btn-secondary btn-sm"
        >
          今天
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-neutral-100">
            <div className="p-3 text-center text-xs text-neutral-400 font-medium">
              <Clock className="w-4 h-4 mx-auto" />
            </div>
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={`p-3 text-center border-l border-neutral-100 first:border-l-0 ${
                  isToday(day) ? 'bg-primary-50/50' : ''
                }`}
              >
                <p className="text-xs text-neutral-500 mb-0.5">
                  {format(day, 'EEE', { locale: zhCN })}
                </p>
                <p
                  className={`text-base font-semibold ${
                    isToday(day) ? 'text-primary-600' : 'text-neutral-800'
                  }`}
                >
                  {format(day, 'd')}
                </p>
              </div>
            ))}
          </div>

          <div className="relative">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-neutral-50 last:border-b-0"
              >
                <div className="p-2 text-center text-xs text-neutral-400 border-r border-neutral-100">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                {weekDays.map((day) => {
                  const reservation = getReservationForSlot(day, hour);
                  const isSelected = isSlotSelected(day, hour);
                  const isPast = isPastHour(day, hour);

                  return (
                    <div
                      key={`${day.toISOString()}-${hour}`}
                      className={`h-10 border-l border-neutral-50 cursor-pointer transition-colors relative ${
                        reservation
                          ? 'bg-primary-100/50 cursor-not-allowed'
                          : isPast
                          ? 'bg-neutral-50 cursor-not-allowed'
                          : isSelected
                          ? 'bg-primary-500/20'
                          : 'hover:bg-primary-50'
                      }`}
                      onMouseDown={() => !reservation && !isPast && handleSlotMouseDown(day, hour)}
                      onMouseEnter={() => !reservation && !isPast && handleSlotMouseEnter(day, hour)}
                    >
                      {reservation && (
                        <div className="absolute inset-0.5 rounded bg-primary-500 text-white text-xs px-1.5 py-0.5 overflow-hidden">
                          <p className="font-medium truncate">已预约</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 p-3 border-t border-neutral-100 bg-neutral-50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-white border border-neutral-200" />
          <span className="text-xs text-neutral-500">可预约</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-primary-100" />
          <span className="text-xs text-neutral-500">已预约</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-primary-500/30" />
          <span className="text-xs text-neutral-500">已选择</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-neutral-100" />
          <span className="text-xs text-neutral-500">已过期</span>
        </div>
      </div>
    </div>
  );
}
