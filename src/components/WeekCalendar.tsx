import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Ban,
  Info,
  AlertTriangle,
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
const weekDayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

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

  const getHolidayInfo = (day: Date) => {
    return holidays.find((h) =>
      isWithinInterval(day, {
        start: startOfDay(parseISO(h.startDate)),
        end: endOfDay(parseISO(h.endDate)),
      })
    );
  };

  const isHoliday = (day: Date): boolean => {
    return !!getHolidayInfo(day);
  };

  const getExceptionInfo = (day: Date) => {
    if (!schedule) return null;
    const dateStr = format(day, 'yyyy-MM-dd');
    return schedule.exceptions.find((e) => e.date === dateStr) || null;
  };

  const getDaySchedule = (day: Date) => {
    if (!schedule) return null;

    const exception = getExceptionInfo(day);

    if (exception) {
      if (!exception.enabled) {
        return {
          startHour: 0,
          startMin: 0,
          endHour: 0,
          endMin: 0,
          enabled: false,
          reason: exception.reason || '临时闭馆',
          type: 'exception-closed',
        };
      }
      if (exception.startTime && exception.endTime) {
        const [startHour, startMin] = exception.startTime.split(':').map(Number);
        const [endHour, endMin] = exception.endTime.split(':').map(Number);
        return {
          startHour,
          startMin,
          endHour,
          endMin,
          enabled: true,
          reason: exception.reason || '特殊开放',
          type: 'exception-open',
        };
      }
    }

    if (isHoliday(day)) {
      const holidayInfo = getHolidayInfo(day);
      return {
        startHour: 0,
        startMin: 0,
        endHour: 0,
        endMin: 0,
        enabled: false,
        reason: holidayInfo?.name || '节假日',
        description: holidayInfo?.description,
        type: 'holiday',
      };
    }

    const dayOfWeek = day.getDay();
    const daySchedule = schedule.defaultSchedule.find((d) => d.dayOfWeek === dayOfWeek);
    if (!daySchedule || !daySchedule.enabled) {
      return {
        startHour: 0,
        startMin: 0,
        endHour: 0,
        endMin: 0,
        enabled: false,
        reason: `${weekDayNames[dayOfWeek]}不开放`,
        type: 'weekday-closed',
      };
    }

    const [startHour, startMin] = daySchedule.startTime.split(':').map(Number);
    const [endHour, endMin] = daySchedule.endTime.split(':').map(Number);

    return {
      startHour,
      startMin,
      endHour,
      endMin,
      enabled: true,
      type: 'normal',
    };
  };

  const getDayDisplayInfo = (day: Date) => {
    const daySched = getDaySchedule(day);
    const exception = getExceptionInfo(day);
    const holidayInfo = getHolidayInfo(day);

    let windowText = '';
    let windowClass = '';
    let tipText = '';
    let tipClass = '';
    let tipIcon = null;

    if (daySched.enabled) {
      const startStr = `${daySched.startHour.toString().padStart(2, '0')}:${daySched.startMin.toString().padStart(2, '0')}`;
      const endStr = `${daySched.endHour.toString().padStart(2, '0')}:${daySched.endMin.toString().padStart(2, '0')}`;
      windowText = `${startStr} - ${endStr}`;
    } else {
      windowText = '全天关闭';
    }

    if (daySched.type === 'normal') {
      windowClass = 'text-success-600';
    } else if (daySched.type === 'exception-open') {
      windowClass = 'text-warning-600';
      tipText = exception?.reason || '特殊开放时段';
      tipClass = 'text-warning-600';
      tipIcon = Info;
    } else if (daySched.type === 'exception-closed') {
      windowClass = 'text-danger-500';
      tipText = exception?.reason || '临时闭馆';
      tipClass = 'text-danger-600';
      tipIcon = AlertTriangle;
    } else if (daySched.type === 'holiday') {
      windowClass = 'text-danger-500';
      tipText = holidayInfo?.name || '节假日';
      tipClass = 'text-danger-600';
      tipIcon = AlertTriangle;
    } else {
      windowClass = 'text-neutral-400';
    }

    return { windowText, windowClass, tipText, tipClass, tipIcon };
  };

  const isWithinOperatingHours = (day: Date, hour: number): boolean => {
    const daySched = getDaySchedule(day);
    if (!daySched || !daySched.enabled) return false;

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
    const exception = getExceptionInfo(day);

    if (reservation) return 'reserved';
    if (isPast) return 'past';
    if (holiday) return 'holiday';
    if (exception && !exception.enabled) return 'exception-closed';
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
      case 'exception-closed':
        return 'bg-warning-50 cursor-not-allowed';
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
          {/* 日期 + 可约窗口 + 说明 */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-neutral-100">
            <div className="p-2 text-center text-xs text-neutral-400 font-medium border-r border-neutral-100">
              <Clock className="w-4 h-4 mx-auto mb-1" />
              <span>时间</span>
            </div>
            {weekDays.map((day) => {
              const holiday = isHoliday(day);
              const info = getDayDisplayInfo(day);
              const TipIcon = info.tipIcon;
              return (
                <div
                  key={day.toISOString()}
                  className={`p-2 text-center border-l border-neutral-100 first:border-l-0 ${
                    isToday(day) ? 'bg-primary-50/50' : ''
                  } ${holiday ? 'bg-danger-50/30' : ''}`}
                >
                  <p className={`text-xs mb-0.5 ${
                    holiday ? 'text-danger-500' : 'text-neutral-500'
                  }`}>
                    {format(day, 'EEE', { locale: zhCN })}
                  </p>
                  <p
                    className={`text-base font-semibold ${
                      isToday(day) ? 'text-primary-600' :
                      holiday ? 'text-danger-600' : 'text-neutral-800'
                    }`}
                  >
                    {format(day, 'd')}
                  </p>
                  {/* 可约窗口 */}
                  <div className={`mt-1 text-[10px] font-medium ${info.windowClass}`}>
                    {info.windowText}
                  </div>
                  {/* 说明提示 */}
                  {info.tipText && (
                    <div className={`mt-0.5 text-[10px] flex items-center justify-center gap-0.5 ${info.tipClass}`}
                      title={info.tipText}>
                      {TipIcon && <TipIcon className="w-2.5 h-2.5" />}
                      <span className="truncate max-w-full">{info.tipText}</span>
                    </div>
                  )}
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
                      {(status === 'closed' || status === 'holiday' || status === 'exception-closed') && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Ban className={`w-3 h-3 ${
                            status === 'holiday' ? 'text-danger-300' :
                            status === 'exception-closed' ? 'text-warning-300' :
                            'text-neutral-300'
                          }`} />
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
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-warning-100" />
          <span className="text-xs text-neutral-500">临时闭馆</span>
        </div>
      </div>
    </div>
  );
}
