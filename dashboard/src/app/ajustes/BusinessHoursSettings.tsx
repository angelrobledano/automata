"use client";

import React, { useState } from 'react';
import { Clock, Plus, Trash2 } from 'lucide-react';

interface TimeSlot {
  open: string;
  close: string;
}

interface DaySchedule {
  closed: boolean;
  slots: TimeSlot[];
}

export interface WeeklySchedule {
  enabled: boolean;
  timezone: string;
  days: {
    monday: DaySchedule;
    tuesday: DaySchedule;
    wednesday: DaySchedule;
    thursday: DaySchedule;
    friday: DaySchedule;
    saturday: DaySchedule;
    sunday: DaySchedule;
  };
}

interface BusinessHoursSettingsProps {
  initialHours: WeeklySchedule | null;
  onSave: (hoursJson: string) => void;
}

const defaultSchedule: WeeklySchedule = {
  enabled: true,
  timezone: 'Europe/Madrid',
  days: {
    monday: { closed: false, slots: [{ open: '09:00', close: '18:00' }] },
    tuesday: { closed: false, slots: [{ open: '09:00', close: '18:00' }] },
    wednesday: { closed: false, slots: [{ open: '09:00', close: '18:00' }] },
    thursday: { closed: false, slots: [{ open: '09:00', close: '18:00' }] },
    friday: { closed: false, slots: [{ open: '09:00', close: '18:00' }] },
    saturday: { closed: true, slots: [{ open: '10:00', close: '14:00' }] },
    sunday: { closed: true, slots: [{ open: '10:00', close: '14:00' }] },
  }
};

const daysMap = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

const timezones = [
  { value: 'Europe/Madrid', label: 'Europa/Madrid' },
  { value: 'America/Bogota', label: 'América/Bogotá' },
  { value: 'America/Mexico_City', label: 'América/Ciudad de México' },
  { value: 'America/Buenos_Aires', label: 'América/Buenos Aires' },
];

export default function BusinessHoursSettings({ initialHours, onSave }: BusinessHoursSettingsProps) {
  const [schedule, setSchedule] = useState<WeeklySchedule>(initialHours || defaultSchedule);

  const handleToggleEnabled = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSchedule({ ...schedule, enabled: e.target.checked });
  };

  const handleTimezoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSchedule({ ...schedule, timezone: e.target.value });
  };

  const handleToggleDay = (dayKey: keyof WeeklySchedule['days']) => {
    const dayData = schedule.days[dayKey];
    setSchedule({
      ...schedule,
      days: {
        ...schedule.days,
        [dayKey]: { ...dayData, closed: !dayData.closed },
      }
    });
  };

  const handleSlotChange = (dayKey: keyof WeeklySchedule['days'], slotIndex: number, field: 'open' | 'close', value: string) => {
    const dayData = schedule.days[dayKey];
    const newSlots = [...dayData.slots];
    newSlots[slotIndex][field] = value;
    setSchedule({
      ...schedule,
      days: {
        ...schedule.days,
        [dayKey]: { ...dayData, slots: newSlots },
      }
    });
  };

  const addSlot = (dayKey: keyof WeeklySchedule['days']) => {
    const dayData = schedule.days[dayKey];
    setSchedule({
      ...schedule,
      days: {
        ...schedule.days,
        [dayKey]: { ...dayData, slots: [...dayData.slots, { open: '00:00', close: '00:00' }] },
      }
    });
  };

  const removeSlot = (dayKey: keyof WeeklySchedule['days'], slotIndex: number) => {
    const dayData = schedule.days[dayKey];
    const newSlots = [...dayData.slots];
    newSlots.splice(slotIndex, 1);
    setSchedule({
      ...schedule,
      days: {
        ...schedule.days,
        [dayKey]: { ...dayData, slots: newSlots },
      }
    });
  };

  const handleSave = () => {
    onSave(JSON.stringify(schedule));
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Horario Comercial y Atención</h2>
        <p className="text-sm text-slate-500">Configura cuándo tu tienda acepta pedidos y los horarios de atención al cliente.</p>
        
        <div className="mt-6 flex items-center justify-between bg-slate-50 p-4 rounded-lg">
          <div>
            <h3 className="text-sm font-medium text-slate-900">Habilitar control de horarios comerciales</h3>
            <p className="text-xs text-slate-500 mt-1">Si está apagado, la tienda acepta pedidos 24/7 sin restricciones.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={schedule.enabled} onChange={handleToggleEnabled} />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {schedule.enabled && (
        <div className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-900 mb-2">Zona Horaria</label>
            <select 
              value={schedule.timezone} 
              onChange={handleTimezoneChange}
              className="w-full max-w-xs p-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            >
              {timezones.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            {daysMap.map((day) => {
              const dayKey = day.key as keyof WeeklySchedule['days'];
              const dayData = schedule.days[dayKey];
              return (
                <div key={day.key} className="flex flex-col sm:flex-row sm:items-center py-4 border-b border-slate-100 last:border-0 gap-4">
                  <div className="w-32 flex items-center">
                    <label className="relative inline-flex items-center cursor-pointer mr-3">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={!dayData.closed} 
                        onChange={() => handleToggleDay(dayKey)} 
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                    <span className="text-sm font-medium text-slate-900">{day.label}</span>
                  </div>

                  {dayData.closed ? (
                    <div className="text-sm text-slate-500 py-1.5 px-3 bg-slate-50 rounded-md inline-block w-fit">Cerrado</div>
                  ) : (
                    <div className="flex flex-col gap-2 flex-1">
                      {dayData.slots.map((slot, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input 
                            type="time" 
                            value={slot.open} 
                            onChange={(e) => handleSlotChange(dayKey, index, 'open', e.target.value)}
                            className="p-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                          />
                          <span className="text-slate-400">-</span>
                          <input 
                            type="time" 
                            value={slot.close} 
                            onChange={(e) => handleSlotChange(dayKey, index, 'close', e.target.value)}
                            className="p-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                          />
                          
                          {index > 0 && (
                            <button 
                              onClick={() => removeSlot(dayKey, index)}
                              className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50"
                              title="Eliminar turno"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                      
                      {dayData.slots.length < 2 && (
                        <button 
                          onClick={() => addSlot(dayKey)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center w-fit mt-1"
                        >
                          <Plus size={14} className="mr-1" /> Añadir turno partido
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="p-6 border-t border-slate-200 flex justify-end">
        <button 
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors flex items-center"
        >
          <Clock size={16} className="mr-2" />
          Guardar Horario Comercial
        </button>
      </div>
    </div>
  );
}
