import React from 'react';
import { motion } from 'motion/react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useApp } from '@/context/AppContext';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Analytics() {
  const { state } = useApp();

  const moduleData = (state.modules || []).map(module => {
    const moduleTopics = (state.topics || []).filter(t => t.module === module.name);
    const averageMastery = moduleTopics.length > 0 
      ? moduleTopics.reduce((acc, t) => acc + t.mastery, 0) / moduleTopics.length 
      : 0;
    return {
      name: module.name,
      mastery: Math.round(averageMastery)
    };
  }).sort((a, b) => b.mastery - a.mastery);

  // Real Mastery Distribution
  const priorityData = ['High', 'Medium', 'Low'].map(priority => {
    const priorityTopics = (state.topics || []).filter(t => t.priority === priority);
    const averageMastery = priorityTopics.length > 0 
      ? priorityTopics.reduce((acc, t) => acc + t.mastery, 0) / priorityTopics.length 
      : 0;
    return {
      priority,
      mastery: Math.round(averageMastery),
      count: priorityTopics.length
    };
  });

  // Real Performance projection or recent completion
  const performanceData = Array.from({ length: 7 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toISOString().split('T')[0];
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    
    // Count topics mastered on this day
    const masteredOnDay = (state.topics || []).filter(t => 
      t.status === 'Mastered' && 
      t.lastStudied?.startsWith(dateStr)
    ).length;

    return {
      day: dayName,
      mastered: masteredOnDay
    };
  });

  // Recent Study heatmap
  const getHeatmapData = () => {
    const days = 30;
    const heatmap = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dateStr = date.toISOString().split('T')[0];
      
      const topicsUpdated = (state.topics || []).filter(t => 
        t.lastStudied?.startsWith(dateStr)
      ).length;
      
      heatmap.push({ date: dateStr, count: topicsUpdated });
    }
    return heatmap;
  };

  const heatmapData = getHeatmapData();

  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-12 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="mb-4 sm:mb-6">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-xs font-bold uppercase tracking-widest bg-accent/30 px-3 py-1.5 rounded-lg border border-border">
          <ArrowLeft size={16} />
          Baseline
        </Link>
      </div>
      <h1 className="text-2xl sm:text-3xl font-black mb-8 uppercase tracking-tight">Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Performance Recently */}
        <div className="glass p-6 sm:p-8">
          <h2 className="text-lg sm:text-xl font-black mb-1 uppercase tracking-tight">Mastery Velocity</h2>
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-8 font-medium">Topics perfected over the last 7 cycles</p>
          <div className="h-48 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.1} vertical={false} />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  labelStyle={{ color: 'var(--foreground)' }}
                  itemStyle={{ color: 'var(--primary)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="mastered" 
                  stroke="var(--primary)" 
                  strokeWidth={3} 
                  dot={{ fill: 'var(--primary)', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Mastery */}
        <div className="glass p-6 sm:p-8">
          <h2 className="text-lg sm:text-xl font-black mb-1 uppercase tracking-tight">Priority Signal</h2>
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-8 font-medium">Readiness across difficulty vectors</p>
          <div className="h-48 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData}>
                <XAxis dataKey="priority" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'var(--accent)', opacity: 0.2 }}
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  labelStyle={{ color: 'var(--foreground)' }}
                  itemStyle={{ color: 'var(--primary)' }}
                />
                <Bar dataKey="mastery" radius={[4, 4, 0, 0]}>
                  {priorityData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.priority === 'High' ? 'var(--destructive)' : entry.priority === 'Medium' ? 'var(--warning)' : 'var(--success)'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Module Breakdown */}
        <div className="glass p-8">
          <h2 className="text-xl font-bold mb-8">Module Breakdown</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={moduleData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} width={100} />
                <Tooltip 
                  cursor={{ fill: 'var(--accent)', opacity: 0.2 }}
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  labelStyle={{ color: 'var(--foreground)' }}
                  itemStyle={{ color: 'var(--primary)' }}
                />
                <Bar dataKey="mastery" radius={[0, 4, 4, 0]}>
                  {moduleData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.mastery > 80 ? 'var(--success)' : entry.mastery > 50 ? 'var(--warning)' : 'var(--destructive)'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Study Consistency */}
        <div className="glass p-8">
          <h2 className="text-xl font-bold mb-2">Activity Stream</h2>
          <p className="text-xs text-muted-foreground mb-8">Daily topic interactions for the last 30 days</p>
          <div className="flex flex-wrap gap-1.5 overflow-hidden">
            {heatmapData.map((day, i) => (
              <div 
                key={i}
                className={`w-6 h-6 rounded-sm transition-colors duration-500 ${
                  day.count === 0 ? 'bg-muted border border-border' :
                  day.count < 2 ? 'bg-primary/20' :
                  day.count < 5 ? 'bg-primary/60' : 'bg-primary'
                }`}
                title={`${day.date}: ${day.count} topic updates`}
              />
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <span>Inactive</span>
            <div className="w-3 h-3 rounded-sm bg-muted border border-border"></div>
            <div className="w-3 h-3 rounded-sm bg-primary/20"></div>
            <div className="w-3 h-3 rounded-sm bg-primary/60"></div>
            <div className="w-3 h-3 rounded-sm bg-primary"></div>
            <span>Intense</span>
          </div>
        </div>
      </div>

      {/* Topics Table / Cards */}
      <div className="glass overflow-hidden border border-border">
        <div className="hidden sm:block overflow-x-auto no-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-accent/50">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Topic Name</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Module</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Mastery</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(state.topics || []).sort((a, b) => b.mastery - a.mastery).map((topic) => (
                <tr key={topic.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-6 py-4 font-medium">{topic.name}</td>
                  <td className="px-6 py-4 text-muted-foreground text-sm">{topic.module}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${topic.mastery > 80 ? 'bg-success' : topic.mastery > 40 ? 'bg-warning' : 'bg-danger'}`} 
                          style={{ width: `${topic.mastery}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-bold">{topic.mastery}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-widest ${
                      topic.status === 'Mastered' ? 'bg-success/10 text-success' :
                      topic.status === 'In Progress' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground border border-border'
                    }`}>
                      {topic.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Topic Cards */}
        <div className="sm:hidden divide-y divide-border">
          {(state.topics || []).sort((a, b) => b.mastery - a.mastery).map((topic) => (
            <div key={topic.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start gap-2">
                <h4 className="font-bold text-sm leading-tight">{topic.name}</h4>
                <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest shrink-0 ${
                  topic.status === 'Mastered' ? 'bg-success/10 text-success' :
                  topic.status === 'In Progress' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground border border-border'
                }`}>
                  {topic.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="uppercase tracking-widest font-bold opacity-60">Module: {topic.module}</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">{topic.mastery}%</span>
                  <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${topic.mastery > 80 ? 'bg-success' : topic.mastery > 40 ? 'bg-warning' : 'bg-danger'}`} 
                      style={{ width: `${topic.mastery}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
