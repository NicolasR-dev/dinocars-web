'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function MonthlyScheduleView({ schedules }: { schedules: any[] }) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
        // 0 = Sunday, 1 = Monday, ...
        let day = new Date(year, month, 1).getDay();
        // Convert to 0 = Monday, 6 = Sunday
        return day === 0 ? 6 : day - 1;
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const monthName = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

    // Generate calendar grid
    const days = [];
    // Empty cells for previous month
    for (let i = 0; i < firstDay; i++) {
        days.push(null);
    }
    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(year, month, i));
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                <button onClick={prevMonth} className="p-1 hover:bg-white/10 rounded transition-colors">
                    <ChevronLeft className="w-5 h-5 text-slate-400" />
                </button>
                <h4 className="text-lg font-bold text-white capitalize">{monthName}</h4>
                <button onClick={nextMonth} className="p-1 hover:bg-white/10 rounded transition-colors">
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
                {DAYS_ES.map(day => (
                    <div key={day} className="text-center py-2 text-xs font-bold text-slate-400 uppercase">
                        {day}
                    </div>
                ))}

                {days.map((date, index) => {
                    if (!date) return <div key={`empty-${index}`} className="bg-slate-800/20 rounded-lg min-h-[100px]"></div>;

                    // Find schedules for this specific date
                    const dateStr = date.toISOString().split('T')[0];
                    const daySchedules = schedules
                        .filter(s => s.date === dateStr)
                        .sort((a, b) => a.start_time.localeCompare(b.start_time));

                    const isToday = new Date().toDateString() === date.toDateString();

                    return (
                        <div key={date.toISOString()} className={`bg-slate-800/30 rounded-lg p-2 min-h-[100px] border ${isToday ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-slate-700/50'}`}>
                            <div className={`text-right text-xs font-bold mb-1 ${isToday ? 'text-indigo-400' : 'text-slate-500'}`}>
                                {date.getDate()}
                            </div>
                            <div className="space-y-1">
                                {daySchedules.map(schedule => (
                                    <div key={`${date.toISOString()}-${schedule.id}`} className={`text-[10px] px-1.5 py-0.5 rounded ${schedule.user.color} text-white truncate`}>
                                        <span className="font-bold">{schedule.user.username}</span>
                                        <span className="opacity-75 ml-1">{schedule.start_time}-{schedule.end_time}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
