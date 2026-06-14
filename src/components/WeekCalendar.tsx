import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Ban,
} from 'lucide-react';
import {
  startOfWeek,
  addDays,
  format,
  isToday,
  setHours,
  setMinutes,
  isWithinInterval,
  startOfDay,
  endOfDay,
  parseISO,
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

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);

export default function WeekCalendar({
  selectedDate,
  equipmentId,
  onSelectSlot,
  selectedSlot,
}: WeekCalendarProps) {
  const {
    getReservationsByEquipment,
    getScheduleByEquipment,
    holidays,
  } = useAppStore();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(selectedDate, { weekStartsOn: 1 }));
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<Date | null>(null);

  const reservations = useMemo(
    () => getReservationsByEquipment(equipmentId).filter(
      (r) => r.status !== 'cancelled' && r.status !== 'rejected'
    ),
    [getReservationsByEquipment, equipmentId]
  );

  const schedule = useMemo(
    () => getScheduleByEquipment(equipmentId),
    [getScheduleByEquipment, equipmentId]
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

  const isHoliday = (day: Date): boolean => {
    return holidays.some((h) =>
      isWithinInterval(day, {
        start: startOfDay(parseISO(h.startDate)),
        end: endOfDay(parseISO(h.endDate)),
      })
    );
  };

  const getDaySchedule = (day: Date) => {
    if (!schedule) return null;

    const dateStr = format(day, 'yyyy-MM-dd');
    const exception = schedule.exceptions.find((e) => e.date === dateStr);

    if (exception) {
      if (!exception.enabled) return null;
      if (exception.startTime && exception.endTime) {
        const [startHour, startMin] = exception.startTime.split(':').map(Number);
        const [endHour, endMin] = exception.endTime.split(':').map(Number);
        return {
          startHour,
          startMin,
          endHour,
          endMin,
          enabled: true,
        };
      }
    }

    if (isHoliday(day)) return null;

    const dayOfWeek = day.getDay();
    const daySchedule = schedule.defaultSchedule.find((d) => d.dayOfWeek === dayOfWeek);
    if (!daySchedule || !daySchedule.enabled) return null;

    const [startHour, startMin] = daySchedule.startTime.split(':').map(Number);
    const [endHour, endMin] = daySchedule.endTime.split(':').map(Number);

    return {
      startHour,
      startMin,
      endHour,
      endMin,
      enabled: true,
    };
  };

  const isWithinOperatingHours = (day: Date, hour: number): boolean => {
    const daySched = getDaySchedule(day);
    if (!daySched) return false;

    const slotStart = setMinutes(setHours(day, hour), 0);
    const shiftStart = setMinutes(setHours(day, daySched.startHour), daySched.startMin);
    const shiftEnd = setMinutes(setHours(day, daySched.endHour), daySched.endMin);

    return slotStart >= shiftStart && slotStart < shiftEnd;
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

  const isSlotDisabled = (day: Date, hour: number): boolean => {
    const reservation = getReservationForSlot(day, hour);
    const isPast = isPastHour(day, hour);
    const isClosed = !isWithinOperatingHours(day, hour);
    return !!reservation || isPast || isClosed;
  };

  const handleSlotMouseDown = (day: Date, hour: number) => {
    if (isSlotDisabled(day, hour)) return;

    const start = setMinutes(setHours(day, hour), 0);
    setIsSelecting(true);
    setSelectionStart(start);
    onSelectSlot(start, setMinutes(setHours(day, hour + 1), 0));
  };

  const handleSlotMouseEnter = (day: Date, hour: number) => {
    if (!isSelecting || !selectionStart) return;
    if (isSlotDisabled(day, hour)) return;

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

  const getSlotStatus = (day: Date, hour: number) => {
    const reservation = getReservationForSlot(day, hour);
    const isPast = isPastHour(day, hour);
    const isClosed = !isWithinOperatingHours(day, hour);
    const isSelected = isSlotSelected(day, hour);
    const holiday = isHoliday(day);

    if (reservation) return 'reserved';
    if (isPast) return 'past';
    if (holiday) return 'holiday';
    if (isClosed) return 'closed';
    if (isSelected) return 'selected';
    return 'available';
  };

  const getSlotClass = (status: string) => {
    switch (status) {
      case 'reserved':
        return 'bg-primary-100/70 cursor-not-allowed';
      case 'past':
        return 'bg-neutral-50 cursor-not-allowed';
      case 'closed':
        return 'bg-neutral-100/80 cursor-not-allowed';
      case 'holiday':
        return 'bg-danger-50 cursor-not-allowed';
      case 'selected':
        return 'bg-primary-500/25';
      default:
        return 'hover:bg-primary-50 cursor-pointer';
    }
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
            {weekDays.map((day) => {
              const holiday = isHoliday(day);
              return (
                <div
                  key={day.toISOString()}
                  className={`p-3 text-center border-l border-neutral-100 first:border-l-0 ${
                    isToday(day) ? 'bg-primary-50/50' : ''
                  } ${holiday ? 'bg-danger-50/30' : ''}`}
                >
                  <p className={`text-xs mb-0.5 ${
                    holiday ? 'text-danger-500' : 'text-neutral-500'
                  }`}>
                    {format(day, 'EEE', { locale: zhCN })}
                    {holiday && ' · 节假日'}
                  </p>
                  <p
                    className={`text-base font-semibold ${
                      isToday(day) ? 'text-primary-600' :
                      holiday ? 'text-danger-600' : 'text-neutral-800'
                    }`}
                  >
                    {format(day, 'd')}
                  </p>
                </div>
              );
            })}
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
                  const status = getSlotStatus(day, hour);
                  const slotClass = getSlotClass(status);
                  const daySched = getDaySchedule(day);
                  const showOpeningHours = hour === 7 && daySched;

                  return (
                    <div
                      key={`${day.toISOString()}-${hour}`}
                      className={`h-10 border-l border-neutral-50 transition-colors relative ${slotClass}`}
                      onMouseDown={() => handleSlotMouseDown(day, hour)}
                      onMouseEnter={() => handleSlotMouseEnter(day, hour)}
                    >
                      {status === 'reserved' && (
                        <div className="absolute inset-0.5 rounded bg-primary-500 text-white text-xs px-1.5 py-0.5 overflow-hidden">
                          <p className="font-medium truncate">已预约</p>
                        </div>
                      )}
                      {(status === 'closed' || status === 'holiday') && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Ban className="w-3 h-3 text-neutral-300" />
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

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3 border-t border-neutral-100 bg-neutral-50">
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
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-neutral-200/80 flex items-center justify-center">
            <Ban className="w-2 h-2 text-neutral-400" />
          </div>
          <span className="text-xs text-neutral-500">未开放</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-danger-100" />
          <span className="text-xs text-neutral-500">节假日</span>
        </div>
      </div>
    </div>
  );
}
