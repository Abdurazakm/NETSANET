import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  TrendingUp,
  Users,
} from 'lucide-react';
import { StatCard } from '../components/app/stat-card';

const MOCK_DATA = {
  patientsAccessed: 47,
  recordsAdded: 128,
  pendingRequests: 5,
  completedRequests: 42,
  monthlyData: [
    { month: 'Jan', patients: 8, records: 22 },
    { month: 'Feb', patients: 12, records: 35 },
    { month: 'Mar', patients: 6, records: 18 },
    { month: 'Apr', patients: 15, records: 42 },
    { month: 'May', patients: 11, records: 28 },
    { month: 'Jun', patients: 18, records: 51 },
  ],
  categoryData: [
    { name: 'General', value: 45, color: '#22A05B' },
    { name: 'Cardiology', value: 28, color: '#3B82F6' },
    { name: 'Orthopedics', value: 18, color: '#F59E0B' },
    { name: 'Dental', value: 9, color: '#8B5CF6' },
  ],
  weeklyActivity: [
    { day: 'Mon', visits: 12 },
    { day: 'Tue', visits: 18 },
    { day: 'Wed', visits: 8 },
    { day: 'Thu', visits: 22 },
    { day: 'Fri', visits: 15 },
    { day: 'Sat', visits: 6 },
    { day: 'Sun', visits: 2 },
  ],
};

const COLORS = {
  primary: '#22A05B',
  primaryLight: '#D5EBD9',
  slate: '#64748B',
  slateLight: '#F1F5F9',
};

export default function DoctorAnalytics({ address, contract }) {
  const stats = useMemo(() => [
    {
      label: 'Patients Accessed',
      value: MOCK_DATA.patientsAccessed,
      icon: Users,
      trend: '+12%',
      trendUp: true,
    },
    {
      label: 'Records Added',
      value: MOCK_DATA.recordsAdded,
      icon: FileText,
      trend: '+24%',
      trendUp: true,
    },
    {
      label: 'Pending Requests',
      value: MOCK_DATA.pendingRequests,
      icon: Clock,
      trend: '-8%',
      trendUp: false,
    },
    {
      label: 'Completed',
      value: MOCK_DATA.completedRequests,
      icon: CheckCircle2,
      trend: '+35%',
      trendUp: true,
    },
  ], []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            icon={stat.icon}
            label={stat.label}
            value={stat.value}
            trend={stat.trend}
            trendUp={stat.trendUp}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6" style={{ boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.1)' }}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Monthly Activity</h3>
            <TrendingUp className="size-5" style={{ color: COLORS.primary }} />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_DATA.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.slateLight} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: COLORS.slate, fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: COLORS.slate, fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: 'none',
                    boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.15)',
                  }}
                />
                <Bar
                  dataKey="patients"
                  name="Patients"
                  fill={COLORS.primary}
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="records"
                  name="Records"
                  fill={COLORS.primaryLight}
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6" style={{ boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.1)' }}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Category Distribution</h3>
            <Activity className="size-5" style={{ color: COLORS.primary }} />
          </div>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={MOCK_DATA.categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {MOCK_DATA.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: 'none',
                    boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.15)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {MOCK_DATA.categoryData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="size-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-slate-600">
                    {item.name} ({item.value}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6" style={{ boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.1)' }}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Weekly Visits</h3>
            <Calendar className="size-5" style={{ color: COLORS.primary }} />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MOCK_DATA.weeklyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.slateLight} />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: COLORS.slate, fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: COLORS.slate, fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: 'none',
                    boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.15)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="visits"
                  stroke={COLORS.primary}
                  strokeWidth={3}
                  dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6" style={{ boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.1)' }}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Patient Trend</h3>
            <Users className="size-5" style={{ color: COLORS.primary }} />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MOCK_DATA.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.slateLight} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: COLORS.slate, fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: COLORS.slate, fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: 'none',
                    boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.15)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="patients"
                  stroke={COLORS.primary}
                  strokeWidth={3}
                  dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}