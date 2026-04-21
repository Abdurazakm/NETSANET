import { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, Plus } from 'lucide-react';

const TIME_SLOTS = {
  Morning: [
    { time: '09:00 AM', doctor: 'Dr. Sarah Chen', patient: 'James Miller', type: 'Follow-up', location: 'Room 204', status: 'confirmed' },
    { time: '10:30 AM', doctor: 'Dr. Sarah Chen', patient: 'Emily Davis', type: 'New Patient', location: 'Room 101', status: 'pending' },
  ],
  Afternoon: [
    { time: '01:00 PM', doctor: 'Dr. Sarah Chen', patient: 'Michael Brown', type: 'Consultation', location: 'Room 302', status: 'confirmed' },
    { time: '02:30 PM', doctor: 'Dr. Sarah Chen', patient: 'Sophie Wilson', type: 'Lab Review', location: 'Room 105', status: 'in-progress' },
    { time: '04:00 PM', doctor: 'Dr. Sarah Chen', patient: 'David Lee', type: 'Follow-up', location: 'Room 204', status: 'cancelled' },
  ],
  Evening: [
    { time: '05:30 PM', doctor: 'Dr. Sarah Chen', patient: 'Anna Martinez', type: 'Telehealth', location: 'Virtual', status: 'pending' },
  ],
};

const STATUS_COLORS = {
  confirmed: 'bg-success text-success-foreground',
  pending: 'bg-warning text-warning-foreground',
  'in-progress': 'bg-info text-info-foreground',
  cancelled: 'bg-muted text-muted-foreground',
};

export default function WeeklyClinicalPlanner() {
  const [expanded, setExpanded] = useState(true);
  const [selectedDate] = useState('Mon, Jan 15');

  return (
    <div className="card-flat p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-primary" />
          <span className="text-sm font-medium">Weekly Planner</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="size-6 rounded-full bg-primary text-white flex items-center justify-center">
            <Plus className="size-3" />
          </button>
          <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground">
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-1.5">
            <span className="text-xs font-medium">{selectedDate}</span>
            <span className="text-xs text-muted-foreground">This Week</span>
          </div>

          {Object.entries(TIME_SLOTS).map(([period, slots]) => (
            <div key={period}>
              <p className="text-xs font-medium text-muted-foreground mb-2">{period}</p>
              <div className="space-y-2">
                {slots.map((slot, i) => (
                  <div key={i} className="rounded-lg border border-border p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{slot.time}</span>
                      <span className={`badge text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_COLORS[slot.status]}`}>
                        {slot.status}
                      </span>
                    </div>
                    <p className="mt-1 font-medium">{slot.patient}</p>
                    <p className="text-muted-foreground">{slot.type}</p>
                    <p className="text-muted-foreground">{slot.location}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}