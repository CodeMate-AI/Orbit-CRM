"use client";

import AppLayout from "@/components/AppLayout";
import { Check } from "lucide-react";
import { useState } from "react";

interface TaskItem {
  id: number;
  title: string;
  due: string;
  priority: "High" | "Medium" | "Low";
  done: boolean;
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([
    { id: 1, title: "Follow up with Rajiv Kumar", due: "Due today", priority: "High", done: false },
    { id: 2, title: "Send proposal to Acme Corp", due: "Due today", priority: "Medium", done: true },
    { id: 3, title: "Schedule demo for Titan Logistics", due: "Due tomorrow", priority: "Medium", done: false },
    { id: 4, title: "Review contract with Delta Systems", due: "14 Aug", priority: "Low", done: false },
    { id: 5, title: "Update deal stage for Nova Retail", due: "15 Aug", priority: "High", done: false },
  ]);

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case "High": return "pill-high";
      case "Medium": return "pill-med";
      default: return "pill-low";
    }
  };

  return (
    <AppLayout pageTitle="Dashboard">
      <div className="widget-grid">
        {/* 1. Pipeline Value (2-col) */}
        <div className="widget widget--2col">
          <div className="widget-header">
            <div className="widget-title">Pipeline value</div>
            <div className="widget-meta">INR</div>
          </div>
          <div className="pipeline-total">₹1,84,50,000</div>
          <div className="pipeline-list">
            <div className="pipeline-row">
              <div className="pipeline-header">
                <span className="pipeline-stage">Prospecting</span>
                <span className="pipeline-value">₹42,50,000</span>
              </div>
              <div className="pipeline-bar-bg">
                <div className="pipeline-bar-fill" style={{ width: "23%" }}></div>
              </div>
            </div>
            <div className="pipeline-row">
              <div className="pipeline-header">
                <span className="pipeline-stage">Qualified</span>
                <span className="pipeline-value">₹65,00,000</span>
              </div>
              <div className="pipeline-bar-bg">
                <div className="pipeline-bar-fill" style={{ width: "35%" }}></div>
              </div>
            </div>
            <div className="pipeline-row">
              <div className="pipeline-header">
                <span className="pipeline-stage">Proposal</span>
                <span className="pipeline-value">₹38,75,000</span>
              </div>
              <div className="pipeline-bar-bg">
                <div className="pipeline-bar-fill" style={{ width: "21%" }}></div>
              </div>
            </div>
            <div className="pipeline-row">
              <div className="pipeline-header">
                <span className="pipeline-stage">Negotiation</span>
                <span className="pipeline-value">₹28,00,000</span>
              </div>
              <div className="pipeline-bar-bg">
                <div className="pipeline-bar-fill" style={{ width: "15%" }}></div>
              </div>
            </div>
            <div className="pipeline-row">
              <div className="pipeline-header">
                <span className="pipeline-stage">Closed (pending)</span>
                <span className="pipeline-value">₹10,25,000</span>
              </div>
              <div className="pipeline-bar-bg">
                <div className="pipeline-bar-fill" style={{ width: "6%" }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Deals Won/Lost (1-col) */}
        <div className="widget">
          <div className="widget-header">
            <div className="widget-title">Deals this month</div>
          </div>
          <div className="stat-pair">
            <div className="stat-item">
              <div className="stat-number">8</div>
              <div className="stat-label">Won</div>
              <div className="stat-sub">₹12.4L</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-number">3</div>
              <div className="stat-label">Lost</div>
              <div className="stat-sub">₹3.2L</div>
            </div>
          </div>
        </div>

        {/* 3. Upcoming Tasks (1-col) */}
        <div className="widget">
          <div className="widget-header">
            <div className="widget-title">Upcoming tasks</div>
            <div className="widget-meta">{tasks.filter(t => !t.done).length} pending</div>
          </div>
          <div className="task-list">
            {tasks.map((task) => (
              <div key={task.id} className="task-item">
                <button
                  type="button"
                  onClick={() => toggleTask(task.id)}
                  className={`task-check ${task.done ? "done" : ""}`}
                  aria-label={task.done ? "Mark task as incomplete" : "Mark task as complete"}
                >
                  {task.done && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                </button>
                <div className="task-body">
                  <div className={`task-title ${task.done ? "done" : ""}`}>
                    {task.title}
                  </div>
                  <div className="task-meta">
                    <span className={`task-due ${task.due.includes("today") || task.due.includes("tomorrow") ? "urgent" : ""}`}>
                      {task.due}
                    </span>
                    <span className={`pill ${getPriorityClass(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Recent Activity (2-col) */}
        <div className="widget widget--2col">
          <div className="widget-header">
            <div className="widget-title">Recent activity</div>
          </div>
          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-avatar" style={{ background: "#7c6ce6" }}>SM</div>
              <div className="activity-content">
                <div className="activity-text">
                  <span className="name">Sarah Mehta</span> sent an email to <span className="name">Vikram Patel</span>
                </div>
                <div className="activity-time">10 min ago</div>
              </div>
              <div className="activity-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
            </div>
            
            <div className="activity-item">
              <div className="activity-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div className="activity-content">
                <div className="activity-text">
                  Deal <span className="name">"Titan Logistics Q3"</span> moved to <span className="name">Negotiation</span>
                </div>
                <div className="activity-time">32 min ago</div>
              </div>
              <div className="activity-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"/>
                  <polyline points="5 12 12 5 19 12"/>
                </svg>
              </div>
            </div>

            <div className="activity-item">
              <div className="activity-avatar" style={{ background: "#4a9c7a" }}>AS</div>
              <div className="activity-content">
                <div className="activity-text">
                  <span className="name">Aarav Sharma</span> logged a call with <span className="name">Neha Gupta</span>
                </div>
                <div className="activity-time">1 hr ago</div>
              </div>
              <div className="activity-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </div>
            </div>

            <div className="activity-item">
              <div className="activity-avatar" style={{ background: "#c49a45" }}>RI</div>
              <div className="activity-content">
                <div className="activity-text">
                  New contact created: <span className="name">Ramesh Iyer</span>
                </div>
                <div className="activity-time">2 hr ago</div>
              </div>
              <div className="activity-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
            </div>

            <div className="activity-item">
              <div className="activity-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                </svg>
              </div>
              <div className="activity-content">
                <div className="activity-text">
                  Deal <span className="name">"Acme Corp Renewal"</span> closed won — <span className="name">₹4.2L</span>
                </div>
                <div className="activity-time">3 hr ago</div>
              </div>
              <div className="activity-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* 5. New Contacts (1-col) */}
        <div className="widget">
          <div className="widget-header">
            <div className="widget-title">New contacts</div>
            <div className="widget-meta">This month</div>
          </div>
          <div className="contacts-top">
            <div className="contacts-number">24</div>
            <div className="contacts-label">contacts added</div>
          </div>
          <div className="sparkline-wrap">
            <svg className="sparkline" viewBox="0 0 300 60" preserveAspectRatio="none">
              <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#32d583" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#32d583" stopOpacity={0} />
                </linearGradient>
              </defs>
              <polyline 
                points="0,48 30,42 60,45 90,35 120,38 150,28 180,30 210,20 240,22 270,12 300,15" 
                fill="none" 
                stroke="#32d583" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
              <polygon 
                points="0,48 30,42 60,45 90,35 120,38 150,28 180,30 210,20 240,22 270,12 300,15 300,60 0,60" 
                fill="url(#sparkGrad)" 
                stroke="none" 
              />
            </svg>
          </div>
        </div>

        {/* 6. Conversion Rate (1-col) */}
        <div className="widget">
          <div className="widget-header">
            <div className="widget-title">Conversion rate</div>
          </div>
          <div className="conversion-big">18.5%</div>
          <div className="conversion-context">vs 15.2% last month</div>
          <div className="funnel-wrap">
            <div className="funnel-stage">
              <div className="funnel-bar" style={{ width: "100%" }}></div>
              <div className="funnel-label"><span>Leads</span><span>142</span></div>
            </div>
            <div className="funnel-stage">
              <div className="funnel-bar" style={{ width: "66%", opacity: 0.75 }}></div>
              <div className="funnel-label"><span>Qualified</span><span>48</span></div>
            </div>
            <div className="funnel-stage">
              <div className="funnel-bar" style={{ width: "33%", opacity: 0.55 }}></div>
              <div className="funnel-label"><span>Proposals</span><span>16</span></div>
            </div>
            <div className="funnel-stage">
              <div className="funnel-bar" style={{ width: "20%", opacity: 0.4 }}></div>
              <div className="funnel-label"><span>Closed</span><span>9</span></div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
