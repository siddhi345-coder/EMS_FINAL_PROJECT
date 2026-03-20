import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import {
  FaUsers, FaClock, FaTasks, FaCheckCircle, FaTimesCircle,
  FaEye, FaSearch, FaBell,
  FaSignInAlt, FaSignOutAlt, FaStopwatch, FaCalendarCheck,
  FaUmbrellaBeach, FaRegClock, FaIdBadge, FaUpload
} from "react-icons/fa";
import { getEmployees, getMyProfile, updateMyProfile } from "../../api/employee.api";
import { getManagerTeam } from "../../api/manager.api";
import { getAttendanceByEmployee, getMyAttendance, checkIn, checkOut } from "../../api/attendance.api";
import { getLeavesByEmployee } from "../../api/leave_requests.api";
import axiosInstance from "../../api/axiosInstance";
import "./ManagerDashboard.css";
import "./EmployeeDashboard.css";

const formatTime = (t) => {
  if (!t) return "-";
  if (String(t).includes("T")) {
    return new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  }
  const [h, m] = String(t).split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

const formatHours = (h) => {
  if (h === null || h === undefined || h === "") return "-";
  const total = Number(h);
  if (isNaN(total)) return "-";
  const hrs = Math.floor(total);
  const mins = Math.round((total - hrs) * 60);
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
};

const ManagerDashboard = () => {
  const { user } = useAuth();
  const [section, setSection] = useState("overview");

  // core data
  const [allEmployees, setAllEmployees] = useState([]);
  const [myTeam, setMyTeam] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [myProfile, setMyProfile] = useState(null);

  // team tab
  const [teamSearch, setTeamSearch] = useState("");
  const [profileModal, setProfileModal] = useState(null);
  const [profileAtt, setProfileAtt] = useState([]);
  const [profileLeaves, setProfileLeaves] = useState([]);

  // leaves tab
  const [leaveSearch, setLeaveSearch] = useState("");
  const [leaveStatusFilter, setLeaveStatusFilter] = useState("all");
  const [leaveRemark, setLeaveRemark] = useState({});

  // tasks tab
  const [taskForm, setTaskForm] = useState({ employee_id: "", title: "", description: "", due_date: "" });
  const [taskError, setTaskError] = useState("");

  // my attendance
  const [myAttendance, setMyAttendance] = useState([]);
  const [myMonth, setMyMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [mySelectedDate, setMySelectedDate] = useState(null);
  const [myCalendarDate, setMyCalendarDate] = useState(new Date());
  const [now, setNow] = useState(new Date());

  // my profile edit
  const [profileForm, setProfileForm] = useState({ first_name: "", last_name: "", email: "", phone: "", gender: "", address: "", profile_image: "" });
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const profileErrors = {
    email: profileForm.email && !profileForm.email.endsWith("@xtsworld.in") ? "Email must end with @xtsworld.in" : "",
    phone: profileForm.phone && !/^\d{10}$/.test(profileForm.phone) ? "Phone must be exactly 10 digits" : ""
  };
  const isProfileValid = !profileErrors.email && !profileErrors.phone;

  const loadAll = async () => {
    try {
      const [empData, leaveData, teamData, profileRes] = await Promise.all([
        getEmployees(),
        axiosInstance.get("/manager/leaves").catch(() => ({ data: [] })),
        getManagerTeam(),
        axiosInstance.get("/employees/me").catch(() => ({ data: null }))
      ]);

      setAllEmployees(Array.isArray(empData) ? empData : []);
      setLeaves(Array.isArray(leaveData.data) ? leaveData.data : []);
      setMyTeam(Array.isArray(teamData) ? teamData : []);
      if (profileRes.data) {
        setMyProfile(profileRes.data);
        setProfileForm({
          first_name: profileRes.data.first_name || "",
          last_name: profileRes.data.last_name || "",
          email: profileRes.data.email || "",
          phone: profileRes.data.phone || "",
          gender: profileRes.data.gender || "",
          address: profileRes.data.address || "",
          profile_image: profileRes.data.profile_image || ""
        });
      }
    } catch (err) {
      console.error("Failed to load manager data", err);
    }
  };

  const loadMyAttendance = async () => {
    try {
      const data = await getMyAttendance({ month: myMonth });
      setMyAttendance(data);
    } catch (err) {
      console.error("Failed to load my attendance", err);
    }
  };

  const handleMyCheckIn = async () => {
    try { await checkIn(); loadMyAttendance(); }
    catch { alert("Check-in failed"); }
  };

  const handleMyCheckOut = async () => {
    try { await checkOut(); loadMyAttendance(); }
    catch (err) { alert(err?.response?.data?.message || "Check-out failed"); }
  };

  const handleProfileSave = async () => {
    try {
      await updateMyProfile(profileForm);
      setProfileSaved(true);
      setEditingProfile(false);
      setTimeout(() => setProfileSaved(false), 2000);
      loadAll();
    } catch { alert("Profile update failed"); }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProfileForm(prev => ({ ...prev, profile_image: reader.result }));
    reader.readAsDataURL(file);
  };

  const loadTasks = async () => {
    try {
      const res = await axiosInstance.get("/manager/tasks");
      setTasks(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load tasks", err);
    }
  };

  useEffect(() => {
    loadAll();
    loadTasks();
    loadMyAttendance();
  }, []);

  useEffect(() => { loadMyAttendance(); }, [myMonth]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── overview stats ──────────────────────────────────────────────
  const pendingLeaves = useMemo(
    () => leaves.filter(l => {
      const emp = myTeam.find(e => e.employee_id === l.employee_id);
      return emp && l.status === "Pending";
    }).length,
    [leaves, myTeam]
  );
  const ongoingTasks = tasks.filter(t => t.status !== "Completed").length;

  // ── team tab ────────────────────────────────────────────────────
  const filteredTeam = useMemo(() => {
    const q = teamSearch.toLowerCase();
    return myTeam.filter(m =>
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
      String(m.employee_id).includes(q)
    );
  }, [myTeam, teamSearch]);

  const openProfile = async (emp) => {
    setProfileModal(emp);
    try {
      const [att, lv] = await Promise.all([
        getAttendanceByEmployee(emp.employee_id),
        getLeavesByEmployee(emp.employee_id)
      ]);
      setProfileAtt(Array.isArray(att) ? att : []);
      setProfileLeaves(Array.isArray(lv) ? lv : []);
    } catch {
      setProfileAtt([]);
      setProfileLeaves([]);
    }
  };

  // ── leaves tab ──────────────────────────────────────────────────
  const teamLeaves = leaves; // already scoped by /manager/leaves

  const filteredLeaves = useMemo(() => {
    const q = leaveSearch.toLowerCase();
    return teamLeaves.filter(l => {
      const emp = allEmployees.find(e => e.employee_id === l.employee_id);
      const name = emp ? `${emp.first_name} ${emp.last_name}`.toLowerCase() : "";
      const matchSearch = !q || name.includes(q) || String(l.employee_id).includes(q);
      const matchStatus = leaveStatusFilter === "all" || l.status === leaveStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [teamLeaves, leaveSearch, leaveStatusFilter, allEmployees]);

  const handleLeaveAction = async (leaveId, status) => {
    try {
      await axiosInstance.patch(`/manager/leaves/${leaveId}`, {
        status,
        manager_remark: leaveRemark[leaveId] || ""
      });
      setLeaveRemark(prev => ({ ...prev, [leaveId]: "" }));
      loadAll();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to update leave");
    }
  };

  const getEmpName = (id) => {
    const emp = allEmployees.find(e => e.employee_id === id);
    return emp ? `${emp.first_name} ${emp.last_name}` : `#${id}`;
  };

  // ── tasks tab ───────────────────────────────────────────────────
  const handleAssignTask = async (e) => {
    e.preventDefault();
    setTaskError("");
    try {
      await axiosInstance.post("/manager/tasks", taskForm);
      setTaskForm({ employee_id: "", title: "", description: "", due_date: "" });
      loadTasks();
    } catch (err) {
      setTaskError(err?.response?.data?.message || "Failed to assign task");
    }
  };

  const handleTaskStatus = async (taskId, status) => {
    try {
      await axiosInstance.patch(`/manager/tasks/${taskId}`, { status });
      loadTasks();
    } catch (err) {
      console.error("Failed to update task", err);
    }
  };

  const myToday = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  })();

  const normalizeDate = (d) => {
    if (!d) return "";
    if (d instanceof Date) return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    return String(d).split("T")[0];
  };

  const isWeekend = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.getDay() === 0 || d.getDay() === 6;
  };

  const todayMyAttendance = myAttendance.find(a => (a.dateStr || normalizeDate(a.date)) === myToday) || null;

  const secondsSinceCheckIn = (() => {
    const t = todayMyAttendance?.check_in_time;
    if (!t) return null;
    const [h, m, s] = t.split(":").map(Number);
    const nowSecs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    return nowSecs - (h * 3600 + m * 60 + s);
  })();

  const canCheckOut = secondsSinceCheckIn !== null && secondsSinceCheckIn >= 9 * 3600;

  const expectedCheckOutTime = (() => {
    const t = todayMyAttendance?.check_in_time;
    if (!t) return null;
    const [h, m, s] = t.split(":").map(Number);
    const totalSecs = h * 3600 + m * 60 + s + 9 * 3600;
    const eh = Math.floor(totalSecs / 3600) % 24;
    const em = Math.floor((totalSecs % 3600) / 60);
    const es = totalSecs % 60;
    return `${String(eh).padStart(2,"0")}:${String(em).padStart(2,"0")}:${String(es).padStart(2,"0")}`;
  })();

  const formatCountdown = (secs) => {
    if (secs === null) return null;
    const remaining = Math.max(0, 9 * 3600 - secs);
    if (remaining === 0) return null;
    const h = Math.floor(remaining / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = remaining % 60;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  };

  const myAttendanceByDate = useMemo(() => {
    const [year, monthIdx] = myMonth.split("-").map(Number);
    const totalDays = new Date(year, monthIdx, 0).getDate();
    const recordMap = {};
    myAttendance.forEach(a => { recordMap[a.dateStr || normalizeDate(a.date)] = a; });
    const rows = [];
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(monthIdx).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      if (dateStr > myToday) break;
      rows.push(recordMap[dateStr] || { date: dateStr, status: isWeekend(dateStr) ? "Holiday" : "Absent", check_in_time: null, check_out_time: null, working_hours: null });
    }
    return rows;
  }, [myMonth, myAttendance, myToday]);

  const myPresentDays = myAttendanceByDate.filter(a => a.status === "Present").length;
  const myMonthlyHours = myAttendance.reduce((sum, r) => sum + (Number(r.working_hours) || 0), 0);

  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "team", label: "My Team" },
    { key: "leaves", label: "Leave Requests" },
    { key: "tasks", label: "Tasks" },
    { key: "my-attendance", label: "My Attendance" },
    { key: "my-profile", label: "My Profile" }
  ];

  return (
    <div className="manager-dashboard">
      <div className="manager-header">
        <div>
          <h1>Manager Dashboard</h1>
          <p>Welcome, {user?.username} — {myProfile?.department_name || "your department"}</p>
        </div>
      </div>

      <div className="tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={section === t.key ? "tab-active" : "tab"}
            onClick={() => setSection(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {section === "overview" && (
        <>
          <div className="card-grid">
            <div className="dashboard-card">
              <FaUsers className="card-icon" />
              <h3>Team Members</h3>
              <p>{myTeam.length}</p>
            </div>
            <div className="dashboard-card">
              <FaClock className="card-icon" />
              <h3>Pending Leaves</h3>
              <p>{pendingLeaves}</p>
            </div>
            <div className="dashboard-card">
              <FaTasks className="card-icon" />
              <h3>Ongoing Tasks</h3>
              <p>{ongoingTasks}</p>
            </div>
          </div>

          <div className="section">
            <h2>Team Overview</h2>
            {myTeam.length === 0 ? (
              <p className="muted-text">No team members assigned yet. Ask HR to assign employees to you.</p>
            ) : (
              <div className="table-wrapper">
                <table className="manager-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Department</th>
                      <th>Role</th>
                      <th>Email</th>
                      <th>Leave Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myTeam.slice(0, 5).map(m => (
                      <tr key={m.employee_id}>
                        <td>{m.first_name} {m.last_name}</td>
                        <td>{m.department_name || "-"}</td>
                        <td>{m.role_name || "-"}</td>
                        <td>{m.email || "-"}</td>
                        <td>{m.leave_balance ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {teamLeaves.filter(l => l.status === "Pending").length > 0 && (
            <div className="section">
              <h2><FaBell style={{ marginRight: 8 }} />Pending Leave Requests</h2>
              <div className="table-wrapper">
                <table className="manager-table">
                  <thead>
                    <tr><th>Employee</th><th>Dates</th><th>Reason</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {teamLeaves.filter(l => l.status === "Pending").slice(0, 5).map(l => (
                      <tr key={l.leave_request_id}>
                        <td>{l.first_name || getEmpName(l.employee_id)} {l.last_name || ""}</td>
                        <td>{l.start_date} to {l.end_date}</td>
                        <td>{l.reason || "-"}</td>
                        <td className="table-actions">
                          <button className="btn-success" onClick={() => handleLeaveAction(l.leave_request_id, "Approved")}>Approve</button>
                          <button className="btn-danger" onClick={() => handleLeaveAction(l.leave_request_id, "Rejected")}>Reject</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── MY TEAM ── */}
      {section === "team" && (
        <div className="section">
          <div className="section-header">
            <h2>My Team ({myTeam.length})</h2>
            <div className="filter-row">
              <div className="filter-input">
                <FaSearch />
                <input
                  placeholder="Search by name or ID"
                  value={teamSearch}
                  onChange={e => setTeamSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {myTeam.length === 0 ? (
            <div className="empty-state">
              <FaUsers size={40} />
              <p>No team members found.</p>
              <span>Ask HR to assign employees to you by editing their profile and selecting you as their manager.</span>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="manager-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Leave Balance</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeam.map(m => (
                    <tr key={m.employee_id}>
                      <td>{m.first_name} {m.last_name}</td>
                      <td>{m.department_name || "-"}</td>
                      <td>{m.role_name || "-"}</td>
                      <td>{m.email || "-"}</td>
                      <td>{m.phone || "-"}</td>
                      <td>{m.leave_balance ?? 0}</td>
                      <td>
                        <button className="btn-secondary" onClick={() => openProfile(m)}>
                          <FaEye /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── LEAVE REQUESTS ── */}
      {section === "leaves" && (
        <div className="section">
          <div className="section-header">
            <h2>Team Leave Requests</h2>
            <div className="filter-row">
              <div className="filter-input">
                <FaSearch />
                <input
                  placeholder="Search employee"
                  value={leaveSearch}
                  onChange={e => setLeaveSearch(e.target.value)}
                />
              </div>
              <select value={leaveStatusFilter} onChange={e => setLeaveStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {filteredLeaves.length === 0 ? (
            <p className="muted-text">No leave requests found.</p>
          ) : (
            <div className="table-wrapper">
              <table className="manager-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Dates</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Applied</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaves.map(l => (
                    <tr key={l.leave_request_id}>
                      <td>{l.first_name || getEmpName(l.employee_id)} {l.last_name || ""}</td>
                      <td>{l.start_date} to {l.end_date}</td>
                      <td>{l.reason || "-"}</td>
                      <td>
                        <span className={`status-badge status-${l.status?.toLowerCase()}`}>
                          {l.status}
                        </span>
                      </td>
                      <td>{l.applied_at ? new Date(l.applied_at).toLocaleDateString() : "-"}</td>
                      <td className="table-actions">
                        {l.status === "Pending" ? (
                          <>
                            <button className="btn-success" onClick={() => handleLeaveAction(l.leave_request_id, "Approved")}>
                              <FaCheckCircle /> Approve
                            </button>
                            <button className="btn-danger" onClick={() => handleLeaveAction(l.leave_request_id, "Rejected")}>
                              <FaTimesCircle /> Reject
                            </button>
                          </>
                        ) : (
                          <span className="muted-text">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TASKS ── */}
      {section === "tasks" && (
        <div className="section">
          <h2>Task Management</h2>
          <div className="task-grid">
            <div className="panel-card">
              <h3>Assign New Task</h3>
              {myTeam.length === 0 ? (
                <p className="muted-text">No team members to assign tasks to.</p>
              ) : (
                <form onSubmit={handleAssignTask} className="form-grid">
                  <select
                    required
                    value={taskForm.employee_id}
                    onChange={e => setTaskForm({ ...taskForm, employee_id: e.target.value })}
                  >
                    <option value="">Select team member</option>
                    {myTeam.map(m => (
                      <option key={m.employee_id} value={m.employee_id}>
                        {m.first_name} {m.last_name}
                      </option>
                    ))}
                  </select>
                  <input
                    required
                    placeholder="Task title"
                    value={taskForm.title}
                    onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                  />
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={taskForm.due_date}
                    onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })}
                  />
                  <textarea
                    placeholder="Description (optional)"
                    value={taskForm.description}
                    onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                    style={{ gridColumn: "1 / -1" }}
                  />
                  {taskError && <p style={{ color: "red", gridColumn: "1 / -1", margin: 0 }}>{taskError}</p>}
                  <button type="submit" className="btn-primary" style={{ width: "fit-content" }}>
                    Assign Task
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="section-sub">
            <h3>Active Tasks</h3>
            {tasks.length === 0 ? (
              <p className="muted-text">No tasks assigned yet.</p>
            ) : (
              <div className="table-wrapper">
                <table className="manager-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Task</th>
                      <th>Due Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map(t => (
                      <tr key={t.task_id}>
                        <td>{t.first_name || getEmpName(t.employee_id)} {t.last_name || ""}</td>
                        <td>
                          <strong>{t.title}</strong>
                          {t.description && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>{t.description}</p>}
                        </td>
                        <td>{t.due_date ? String(t.due_date).split("T")[0] : "-"}</td>
                        <td>
                          <select
                            value={t.status}
                            onChange={e => handleTaskStatus(t.task_id, e.target.value)}
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MY ATTENDANCE ── */}
      {section === "my-attendance" && (
        <div className="attendance-page">
          <div className="attendance-action-bar">
            <div className="attendance-action-bar-left">
              <span className="attendance-month-label">
                {new Date(myMonth + "-01").toLocaleString("default", { month: "long", year: "numeric" })}
              </span>
              {todayMyAttendance?.check_in_time && (
                <span className="att-checkin-info">
                  <FaSignInAlt /> Checked in at {formatTime(todayMyAttendance.check_in_time)}
                  {!todayMyAttendance.check_out_time && (
                    <>
                      <span style={{ marginLeft: 12 }}><FaSignOutAlt /> Expected checkout at {formatTime(expectedCheckOutTime)}</span>
                      {formatCountdown(secondsSinceCheckIn) && (
                        <span className="att-countdown"> &mdash; Checkout in {formatCountdown(secondsSinceCheckIn)}</span>
                      )}
                    </>
                  )}
                  {todayMyAttendance.check_out_time && (
                    <span style={{ marginLeft: 12 }}><FaSignOutAlt /> Checked out at {formatTime(todayMyAttendance.check_out_time)}</span>
                  )}
                </span>
              )}
            </div>
            <div className="attendance-action-bar-right">
              <button className="btn-primary" onClick={handleMyCheckIn} disabled={!!todayMyAttendance?.check_in_time}>
                <FaSignInAlt /> Check In
              </button>
              <button className="btn-outline" onClick={handleMyCheckOut}
                disabled={!todayMyAttendance?.check_in_time || !!todayMyAttendance?.check_out_time || !canCheckOut}>
                <FaSignOutAlt /> Check Out
              </button>
            </div>
          </div>

          <div className="attendance-cards">
            <div className="att-card att-card-calendar">
              <h3 className="att-card-title">Monthly Calendar</h3>
              <Calendar
                onChange={setMySelectedDate}
                value={mySelectedDate}
                activeStartDate={myCalendarDate}
                onActiveStartDateChange={({ activeStartDate }) => {
                  setMyCalendarDate(activeStartDate);
                  setMyMonth(`${activeStartDate.getFullYear()}-${String(activeStartDate.getMonth() + 1).padStart(2, "0")}`);
                }}
                maxDate={new Date()}
                tileClassName={({ date, view }) => {
                  if (view !== "month") return null;
                  const ds = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
                  if (ds === myToday) return "cal-today";
                  if (isWeekend(ds)) return "cal-holiday";
                  const rec = myAttendanceByDate.find(a => (a.dateStr || normalizeDate(a.date)) === ds || a.date === ds);
                  if (rec?.status === "Present") return "cal-present";
                  if (rec?.status === "Absent") return "cal-absent";
                  return null;
                }}
                tileDisabled={({ date }) => date > new Date()}
              />
              <div className="cal-legend">
                <span className="legend-dot legend-present" /> Present
                <span className="legend-dot legend-absent" /> Absent
                <span className="legend-dot legend-today" /> Today
                <span className="legend-dot legend-holiday" /> Weekend
              </div>
            </div>

            <div className="att-card att-card-details">
              <h3 className="att-card-title">Attendance Details</h3>
              {mySelectedDate ? (() => {
                const ds = `${mySelectedDate.getFullYear()}-${String(mySelectedDate.getMonth()+1).padStart(2,"0")}-${String(mySelectedDate.getDate()).padStart(2,"0")}`;
                const isWknd = isWeekend(ds);
                const rec = myAttendanceByDate.find(a => (a.dateStr || normalizeDate(a.date)) === ds || a.date === ds);
                const hasRecord = rec && rec.status === "Present";
                return (
                  <>
                    <div className="att-detail-date">
                      {mySelectedDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                    </div>
                    {isWknd ? (
                      <div className="att-no-record"><FaUmbrellaBeach /><p>Weekend — No attendance required.</p><span className="att-status-badge att-status-holiday">Holiday</span></div>
                    ) : hasRecord ? (
                      <div className="att-detail-rows">
                        <div className="att-detail-row">
                          <span className="att-detail-icon att-icon-in"><FaSignInAlt /></span>
                          <div><span className="att-detail-label">Check In</span><span className="att-detail-value">{formatTime(rec.check_in_time || rec.check_in) || "—"}</span></div>
                        </div>
                        <div className="att-detail-row">
                          <span className="att-detail-icon att-icon-out"><FaSignOutAlt /></span>
                          <div><span className="att-detail-label">Check Out</span><span className="att-detail-value">{formatTime(rec.check_out_time || rec.check_out) || "—"}</span></div>
                        </div>
                        <div className="att-detail-row">
                          <span className="att-detail-icon att-icon-hours"><FaStopwatch /></span>
                          <div><span className="att-detail-label">Working Hours</span><span className="att-detail-value">{formatHours(rec.working_hours)}</span></div>
                        </div>
                        <div className="att-detail-row">
                          <span className="att-detail-icon att-icon-status"><FaRegClock /></span>
                          <div><span className="att-detail-label">Status</span><span className="att-status-badge att-status-present">Present</span></div>
                        </div>
                      </div>
                    ) : (
                      <div className="att-no-record"><FaTimesCircle /><p>No attendance record for this day.</p>{rec?.status === "Absent" && <span className="att-status-badge att-status-absent">Absent</span>}</div>
                    )}
                  </>
                );
              })() : (
                <div className="att-no-selection"><FaCalendarCheck /><p>Select a date on the calendar to view attendance details.</p></div>
              )}

              <div className="att-today-bar">
                <span className="att-today-label">Today</span>
                <div className="att-today-times">
                  <span><FaSignInAlt /> {formatTime(todayMyAttendance?.check_in_time || todayMyAttendance?.check_in) || "Not checked in"}</span>
                  <span><FaSignOutAlt /> {todayMyAttendance?.check_out_time || todayMyAttendance?.check_out ? formatTime(todayMyAttendance.check_out_time || todayMyAttendance.check_out) : (expectedCheckOutTime ? `Expected: ${formatTime(expectedCheckOutTime)}` : "Not checked out")}</span>
                  <span><FaStopwatch /> {todayMyAttendance?.working_hours ? formatHours(todayMyAttendance.working_hours) : (todayMyAttendance?.check_in_time ? "9h 0m" : "-")}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="att-summary-bar">
            <div className="att-summary-item">
              <FaCheckCircle className="att-sum-icon present" />
              <div><span className="att-sum-label">Present</span><strong>{myPresentDays}</strong></div>
            </div>
            <div className="att-summary-item">
              <FaTimesCircle className="att-sum-icon absent" />
              <div><span className="att-sum-label">Absent</span><strong>{myAttendanceByDate.filter(a => a.status === "Absent").length}</strong></div>
            </div>
            <div className="att-summary-item">
              <FaCalendarCheck className="att-sum-icon" />
              <div><span className="att-sum-label">Working Days</span><strong>{myAttendanceByDate.filter(a => !isWeekend(a.date)).length}</strong></div>
            </div>
            <div className="att-summary-item">
              <FaStopwatch className="att-sum-icon" />
              <div><span className="att-sum-label">Total Hours</span><strong>{formatHours(myMonthlyHours)}</strong></div>
            </div>
          </div>
        </div>
      )}

      {/* ── MY PROFILE ── */}
      {section === "my-profile" && (
        <div className="profile-page">
          <div className="profile-hero">
            <div className="profile-hero-bg" />
            <div className="profile-hero-body">
              <div className="profile-avatar-wrap">
                <div className="avatar">
                  {profileForm.profile_image ? <img src={profileForm.profile_image} alt="profile" /> : <FaIdBadge />}
                </div>
                {editingProfile && (
                  <label className="upload-btn">
                    <FaUpload />
                    <input type="file" accept="image/*" onChange={handleImageUpload} hidden />
                  </label>
                )}
              </div>
              <div className="profile-hero-info">
                <h2 className="profile-name">{myProfile?.first_name || "-"} {myProfile?.last_name || ""}</h2>
                <div className="profile-hero-meta">
                  <span className="profile-role-badge">{myProfile?.role_name || "Manager"}</span>
                  <span className="profile-dept-tag">🏢 {myProfile?.department_name || "—"}</span>
                </div>
              </div>
              <div className="profile-hero-stats">
                <div className="phs-item"><strong>{myPresentDays}</strong><span>Present</span></div>
                <div className="phs-divider" />
                <div className="phs-item"><strong>{myProfile?.leave_balance ?? 0}</strong><span>Leave Left</span></div>
              </div>
            </div>
          </div>

          <div className="profile-details-card">
            <div className="profile-details-header">
              <div>
                <h3 className="profile-section-title">Personal Information</h3>
                <p className="profile-section-sub">Your account details and employment info</p>
              </div>
              <div className="profile-actions">
                {profileSaved && <span className="saved">✓ Saved</span>}
                {!editingProfile
                  ? <button className="btn-edit-profile" onClick={() => setEditingProfile(true)}>Edit Profile</button>
                  : <>
                      <button className="btn-save-profile" onClick={handleProfileSave} disabled={!isProfileValid} style={{ opacity: isProfileValid ? 1 : 0.5, cursor: isProfileValid ? "pointer" : "not-allowed" }}>Save Changes</button>
                      <button className="btn-outline" onClick={() => { setEditingProfile(false); loadAll(); }}>Cancel</button>
                    </>
                }
              </div>
            </div>

            {!editingProfile ? (
              <>
                <div className="profile-fields-grid">
                  <div className="pf-item"><span className="pf-label">Full Name</span><span className="pf-value">{myProfile?.first_name || "-"} {myProfile?.last_name || ""}</span></div>
                  <div className="pf-item"><span className="pf-label">Email</span><span className="pf-value">{myProfile?.email || "-"}</span></div>
                  <div className="pf-item"><span className="pf-label">Phone</span><span className="pf-value">{myProfile?.phone || "-"}</span></div>
                  <div className="pf-item"><span className="pf-label">Gender</span><span className="pf-value">{myProfile?.gender || "-"}</span></div>
                  <div className="pf-item pf-full"><span className="pf-label">Address</span><span className="pf-value">{myProfile?.address || "-"}</span></div>
                </div>
                <div className="profile-divider-line"><span>Employment</span></div>
                <div className="profile-fields-grid">
                  <div className="pf-item"><span className="pf-label">Department</span><span className="pf-value">{myProfile?.department_name || "-"}</span></div>
                  <div className="pf-item"><span className="pf-label">Role</span><span className="pf-value">{myProfile?.role_name || "Manager"}</span></div>
                  <div className="pf-item"><span className="pf-label">Join Date</span><span className="pf-value">{myProfile?.hire_date || "-"}</span></div>
                </div>
              </>
            ) : (
              <>
                <div className="profile-edit-grid">
                  <div className="profile-field"><label>First Name</label><input value={profileForm.first_name} onChange={e => setProfileForm({ ...profileForm, first_name: e.target.value })} /></div>
                  <div className="profile-field"><label>Last Name</label><input value={profileForm.last_name} onChange={e => setProfileForm({ ...profileForm, last_name: e.target.value })} /></div>
                  <div className="profile-field"><label>Email</label><input type="email" value={profileForm.email} onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} style={{ borderColor: profileErrors.email ? "#ef4444" : "" }} />
                    {profileErrors.email && <span style={{ color: "#ef4444", fontSize: 12, marginTop: 4, display: "block" }}>{profileErrors.email}</span>}
                  </div>
                  <div className="profile-field"><label>Phone</label><input value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} style={{ borderColor: profileErrors.phone ? "#ef4444" : "" }} />
                    {profileErrors.phone && <span style={{ color: "#ef4444", fontSize: 12, marginTop: 4, display: "block" }}>{profileErrors.phone}</span>}
                  </div>
                  <div className="profile-field"><label>Gender</label>
                    <select value={profileForm.gender} onChange={e => setProfileForm({ ...profileForm, gender: e.target.value })}>
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="profile-field profile-field-full"><label>Address</label><input value={profileForm.address} onChange={e => setProfileForm({ ...profileForm, address: e.target.value })} /></div>
                </div>
                <p className="muted-text" style={{ margin: "12px 0 0", fontSize: 13 }}>Department, Role, and Join Date can only be updated by HR.</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── PROFILE MODAL ── */}
      {profileModal && (
        <div className="modal-overlay" onClick={() => setProfileModal(null)}>
          <div className="modal-card wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{profileModal.first_name} {profileModal.last_name}</h2>
              <button className="close-btn" onClick={() => setProfileModal(null)}>×</button>
            </div>
            <div className="profile-grid">
              <div>
                <h4>Details</h4>
                <p><strong>Email:</strong> {profileModal.email || "-"}</p>
                <p><strong>Phone:</strong> {profileModal.phone || "-"}</p>
                <p><strong>Department:</strong> {profileModal.department_name || "-"}</p>
                <p><strong>Role:</strong> {profileModal.role_name || "-"}</p>
                <p><strong>Leave Balance:</strong> {profileModal.leave_balance ?? 0}</p>
              </div>
              <div>
                <h4>Recent Attendance</h4>
                <ul>
                  {profileAtt.slice(0, 6).map(a => (
                    <li key={a.attendance_id}>{a.date} — {a.status}</li>
                  ))}
                  {profileAtt.length === 0 && <li>No records.</li>}
                </ul>
              </div>
              <div>
                <h4>Leave History</h4>
                <ul>
                  {profileLeaves.slice(0, 6).map(l => (
                    <li key={l.leave_request_id || l.leave_id}>
                      {l.start_date} → {l.end_date} ({l.status})
                    </li>
                  ))}
                  {profileLeaves.length === 0 && <li>No records.</li>}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
