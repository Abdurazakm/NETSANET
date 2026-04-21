import { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, MapPin, Plus, Trash2, User, X } from 'lucide-react';
import { toast } from 'sonner';
import { AddressPill } from '../components/app/address-pill';

const ACTIVITY_TYPES = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'new-patient', label: 'New Patient' },
  { value: 'lab-review', label: 'Lab Review' },
  { value: 'telehealth', label: 'Telehealth' },
  { value: 'procedure', label: 'Procedure' },
];

const STATUS_COLORS = {
  confirmed: 'bg-success text-success-foreground',
  pending: 'bg-warning text-warning-foreground',
  'in-progress': 'bg-info text-info-foreground',
  cancelled: 'bg-muted text-muted-foreground',
};

const PERIODS = ['Morning', 'Afternoon', 'Evening'];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function ClinicalPlanner({ address }) {
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    time: '09:00 AM',
    period: 'Morning',
    patient: '',
    type: 'consultation',
    location: '',
    status: 'pending',
  });

  useEffect(() => {
    const stored = localStorage.getItem('clinical_planner');
    if (stored) {
      setAppointments(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('clinical_planner', JSON.stringify(appointments));
  }, [appointments]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.patient.trim() || !form.location.trim()) {
      toast.error('Please fill in patient name and location');
      return;
    }

    const newAppointment = {
      id: editingId || generateId(),
      date: selectedDate,
      ...form,
      createdAt: editingId ? appointments.find(a => a.id === editingId)?.createdAt : Date.now(),
    };

    if (editingId) {
      setAppointments(prev => prev.map(a => a.id === editingId ? newAppointment : a));
      toast.success('Appointment updated');
    } else {
      setAppointments(prev => [...prev, newAppointment]);
      toast.success('Appointment added');
    }

    resetForm();
  };

  const handleDelete = (id) => {
    setAppointments(prev => prev.filter(a => a.id !== id));
    toast.success('Appointment deleted');
  };

  const handleEdit = (appointment) => {
    setForm({ ...appointment });
    setEditingId(appointment.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({
      time: '09:00 AM',
      period: 'Morning',
      patient: '',
      type: 'consultation',
      location: '',
      status: 'pending',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const filteredAppointments = appointments
    .filter(a => a.date === selectedDate)
    .sort((a, b) => {
      const timeA = convertTo24Hour(a.time);
      const timeB = convertTo24Hour(b.time);
      return timeA - timeB;
    });

  const groupedByPeriod = PERIODS.reduce((acc, period) => {
    acc[period] = filteredAppointments.filter(a => a.period === period);
    return acc;
  }, {});

  const weekDays = getWeekDays(selectedDate);

  const goToPrevWeek = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() - 7);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const goToNextWeek = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + 7);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const goToThisWeek = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="card-premium p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white">
              <Calendar className="size-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Clinical Planner</h2>
              <p className="text-sm text-muted-foreground">Manage your weekly schedule</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AddressPill value={address} label="Doctor" className="bg-muted/50" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="card-flat p-4 lg:w-64">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Week</h3>
            <div className="flex gap-1">
              <button onClick={goToPrevWeek} className="btn-ghost size-7 p-0">
                <ChevronLeft className="size-4" />
              </button>
              <button onClick={goToThisWeek} className="btn-ghost size-7 p-0 text-xs px-2">
                Today
              </button>
              <button onClick={goToNextWeek} className="btn-ghost size-7 p-0">
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input-premium w-full"
          />
          
          <div className="mt-4 space-y-2">
            {weekDays.map(day => (
              <button
                key={day.date}
                onClick={() => setSelectedDate(day.date)}
                className={`w-full rounded-lg p-3 text-left transition-colors ${
                  day.date === selectedDate
                    ? 'bg-primary text-white'
                    : 'bg-muted/50 hover:bg-muted'
                }`}
              >
                <p className="text-xs">{day.dayName}</p>
                <p className="text-lg font-bold">{day.dayNum}</p>
              </button>
            ))}
          </div>

          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="btn-primary mt-4 w-full"
          >
            <Plus className="size-4" />
            Add Appointment
          </button>
        </div>

        <div className="flex-1 space-y-4">
          {showForm && (
            <div className="card-premium p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">{editingId ? 'Edit Appointment' : 'New Appointment'}</h3>
                <button onClick={resetForm} className="text-muted-foreground hover:text-foreground">
                  <X className="size-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium">Time</label>
                    <div className="flex gap-2 mt-1">
                      <select
                        value={form.time}
                        onChange={(e) => setForm({ ...form, time: e.target.value })}
                        className="input-premium flex-1"
                      >
                        {generateTimeSlots().map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <select
                        value={form.period}
                        onChange={(e) => setForm({ ...form, period: e.target.value })}
                        className="input-premium w-32"
                      >
                        {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Type</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="mt-1 input-premium"
                    >
                      {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium">Patient Name</label>
                  <input
                    type="text"
                    value={form.patient}
                    onChange={(e) => setForm({ ...form, patient: e.target.value })}
                    placeholder="Enter patient name"
                    className="mt-1 input-premium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium">Location</label>
                    <input
                      type="text"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="Room 101"
                      className="mt-1 input-premium"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="mt-1 input-premium"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="in-progress">In Progress</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary">
                    {editingId ? 'Update' : 'Add'} Appointment
                  </button>
                  <button type="button" onClick={resetForm} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {filteredAppointments.length === 0 && !showForm ? (
            <div className="card-flat p-12 text-center">
              <Calendar className="mx-auto size-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-bold">No Appointments</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                No appointments scheduled for this date
              </p>
              <button onClick={() => setShowForm(true)} className="btn-primary mt-4">
                <Plus className="size-4" />
                Add Appointment
              </button>
            </div>
          ) : (
            PERIODS.map(period => (
              groupedByPeriod[period].length > 0 && (
                <div key={period}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">{period}</h3>
                  <div className="space-y-2">
                    {groupedByPeriod[period].map(apt => (
                      <div key={apt.id} className="card-flat p-4 flex items-center gap-4">
                        <div className="text-center min-w-[60px]">
                          <p className="text-lg font-bold">{apt.time}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <User className="size-4 text-muted-foreground" />
                            <p className="font-medium truncate">{apt.patient}</p>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <span className="capitalize">{apt.type}</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3" />
                              {apt.location}
                            </span>
                          </div>
                        </div>
                        <span className={`badge text-xs px-2 py-1 rounded-full ${STATUS_COLORS[apt.status]}`}>
                          {apt.status}
                        </span>
                        <div className="flex gap-1">
                          <button onClick={() => handleEdit(apt)} className="btn-ghost size-8 p-0">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(apt.id)} className="btn-ghost size-8 p-0 text-destructive hover:bg-destructive/10">
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function convertTo24Hour(timeStr) {
  const [time, period] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function getWeekDays(selectedDate) {
  const date = new Date(selectedDate);
  const dayOfWeek = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  const days = [];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push({
      date: d.toISOString().split('T')[0],
      dayName: dayNames[i],
      dayNum: d.getDate(),
    });
  }
  return days;
}

function generateTimeSlots() {
  const slots = [];
  const times = [
    { hour: 8, min: 0 }, { hour: 8, min: 30 },
    { hour: 9, min: 0 }, { hour: 9, min: 30 },
    { hour: 10, min: 0 }, { hour: 10, min: 30 },
    { hour: 11, min: 0 }, { hour: 11, min: 30 },
    { hour: 12, min: 0 }, { hour: 12, min: 30 },
    { hour: 13, min: 0 }, { hour: 13, min: 30 },
    { hour: 14, min: 0 }, { hour: 14, min: 30 },
    { hour: 15, min: 0 }, { hour: 15, min: 30 },
    { hour: 16, min: 0 }, { hour: 16, min: 30 },
    { hour: 17, min: 0 }, { hour: 17, min: 30 },
    { hour: 18, min: 0 }, { hour: 18, min: 30 },
  ];
  times.forEach(t => {
    const period = t.hour >= 12 ? 'PM' : 'AM';
    const displayHour = t.hour > 12 ? t.hour - 12 : t.hour === 0 ? 12 : t.hour;
    const displayHourFinal = t.hour > 12 && t.hour !== 12 ? t.hour - 12 : t.hour === 0 ? 12 : (t.hour > 12 ? t.hour - 12 : t.hour);
    slots.push(`${displayHourFinal.toString().padStart(2, '0')}:${t.min.toString().padStart(2, '0')} ${period}`);
  });
  return slots;
}