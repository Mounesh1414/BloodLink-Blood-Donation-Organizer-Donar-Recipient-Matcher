import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "./lib/api";

const defaultRegister = {
  name: "",
  email: "",
  password: "",
  role: "recipient",
  bloodGroup: "A+",
  city: "",
  area: "",
  phone: "",
  hospital: ""
};

const defaultRequest = {
  bloodGroup: "A+",
  units: 1,
  urgency: "normal",
  hospital: "",
  city: "",
  area: "",
  requiredDate: "",
  notes: ""
};

function Panel({ title, children }) {
  return (
    <section className="panel">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("bloodlink_token") || "");
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("bloodlink_user");
    return stored ? JSON.parse(stored) : null;
  });

  const [tab, setTab] = useState("dashboard");
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const [registerData, setRegisterData] = useState(defaultRegister);
  const [loginData, setLoginData] = useState({ email: "", password: "" });

  const [donors, setDonors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [donations, setDonations] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [adminDonors, setAdminDonors] = useState([]);

  const [searchFilters, setSearchFilters] = useState({ bloodGroup: "", city: "", area: "" });
  const [requestForm, setRequestForm] = useState(defaultRequest);
  const [scheduleForm, setScheduleForm] = useState({
    requestId: "",
    donorId: "",
    scheduledAt: "",
    location: "",
    hospital: "",
    notes: ""
  });

  const availableTabs = useMemo(() => {
    const base = ["dashboard", "find-donors", "request-blood", "notifications", "donations"];
    if (user?.role === "admin") base.push("admin");
    return base;
  }, [user]);

  useEffect(() => {
    if (!token) return;
    refreshCoreData();
  }, [token]);

  async function refreshCoreData() {
    try {
      const [reqRes, notifRes, donationRes] = await Promise.all([
        apiRequest("/requests/mine", { token }),
        apiRequest("/notifications", { token }),
        apiRequest("/donations/mine", { token })
      ]);
      setRequests(reqRes.requests || []);
      setNotifications(notifRes.notifications || []);
      setDonations(donationRes.donations || []);

      if (user?.role === "admin") {
        const [statsRes, donorsRes] = await Promise.all([
          apiRequest("/admin/stats", { token }),
          apiRequest("/admin/donors", { token })
        ]);
        setAdminStats(statsRes.stats);
        setAdminDonors(donorsRes.donors || []);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  function persistAuth(nextToken, nextUser) {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem("bloodlink_token", nextToken);
    localStorage.setItem("bloodlink_user", JSON.stringify(nextUser));
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    setStatus("");
    try {
      const res = await apiRequest("/auth/register", { method: "POST", body: registerData });
      persistAuth(res.token, res.user);
      setStatus("Registered and logged in");
      setRegisterData(defaultRegister);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setStatus("");
    try {
      const res = await apiRequest("/auth/login", { method: "POST", body: loginData });
      persistAuth(res.token, res.user);
      setStatus("Logged in successfully");
    } catch (err) {
      setError(err.message);
    }
  }

  function logout() {
    setToken("");
    setUser(null);
    localStorage.removeItem("bloodlink_token");
    localStorage.removeItem("bloodlink_user");
  }

  async function searchDonors(e) {
    e.preventDefault();
    setError("");
    setStatus("");
    try {
      const query = new URLSearchParams(
        Object.entries(searchFilters).filter(([, v]) => v)
      ).toString();
      const res = await apiRequest(`/donors/search${query ? `?${query}` : ""}`, { token });
      setDonors(res.donors || []);
      setStatus(`Found ${res.donors?.length || 0} donors`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function createRequest(e) {
    e.preventDefault();
    setError("");
    setStatus("");
    try {
      await apiRequest("/requests", { method: "POST", token, body: requestForm });
      setRequestForm(defaultRequest);
      setStatus("Blood request created and donor matching triggered");
      refreshCoreData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function respondToRequest(requestId, nextStatus) {
    setError("");
    setStatus("");
    try {
      await apiRequest(`/requests/${requestId}/respond`, {
        method: "POST",
        token,
        body: { status: nextStatus }
      });
      setStatus(`Request ${nextStatus}`);
      refreshCoreData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function scheduleDonation(e) {
    e.preventDefault();
    setError("");
    setStatus("");
    try {
      await apiRequest("/donations/schedule", {
        method: "POST",
        token,
        body: scheduleForm
      });
      setScheduleForm({ requestId: "", donorId: "", scheduledAt: "", location: "", hospital: "", notes: "" });
      setStatus("Donation scheduled");
      refreshCoreData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function completeDonation(donationId) {
    setError("");
    setStatus("");
    try {
      await apiRequest(`/donations/${donationId}/complete`, { method: "PATCH", token });
      setStatus("Donation marked completed");
      refreshCoreData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function markNotificationRead(id) {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: "PATCH", token });
      refreshCoreData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function verifyDonor(id) {
    try {
      await apiRequest(`/admin/donors/${id}/verify`, { method: "PATCH", token });
      refreshCoreData();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!token || !user) {
    return (
      <main className="shell auth-shell">
        <div className="hero-strip" />
        <Panel title="BloodLink Access">
          <p className="sub">Secure donor-recipient coordination in one dashboard.</p>
          <div className="switcher">
            <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button>
            <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Register</button>
          </div>

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="grid-form">
              <input placeholder="Email" type="email" value={loginData.email} onChange={(e) => setLoginData({ ...loginData, email: e.target.value })} required />
              <input placeholder="Password" type="password" value={loginData.password} onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} required />
              <button type="submit">Login</button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="grid-form">
              <input placeholder="Name" value={registerData.name} onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })} required />
              <input placeholder="Email" type="email" value={registerData.email} onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })} required />
              <input placeholder="Password" type="password" value={registerData.password} onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })} required />
              <select value={registerData.role} onChange={(e) => setRegisterData({ ...registerData, role: e.target.value })}>
                <option value="recipient">Recipient</option>
                <option value="donor">Donor</option>
              </select>
              <select value={registerData.bloodGroup} onChange={(e) => setRegisterData({ ...registerData, bloodGroup: e.target.value })}>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
              <input placeholder="City" value={registerData.city} onChange={(e) => setRegisterData({ ...registerData, city: e.target.value })} />
              <input placeholder="Area" value={registerData.area} onChange={(e) => setRegisterData({ ...registerData, area: e.target.value })} />
              <input placeholder="Phone" value={registerData.phone} onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })} />
              <input placeholder="Hospital" value={registerData.hospital} onChange={(e) => setRegisterData({ ...registerData, hospital: e.target.value })} />
              <button type="submit">Create Account</button>
            </form>
          )}

          {error && <p className="error">{error}</p>}
          {status && <p className="status">{status}</p>}
        </Panel>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <h1>BloodLink</h1>
          <p>{user.name} • {user.role.toUpperCase()} • {user.bloodGroup}</p>
        </div>
        <button onClick={logout}>Logout</button>
      </header>

      <nav className="tabs">
        {availableTabs.map((t) => (
          <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
            {t.replace("-", " ")}
          </button>
        ))}
      </nav>

      {error && <p className="error">{error}</p>}
      {status && <p className="status">{status}</p>}

      {tab === "dashboard" && (
        <Panel title="Overview">
          <div className="stats-grid">
            <article><strong>{requests.length}</strong><span>Requests</span></article>
            <article><strong>{donations.length}</strong><span>Donations</span></article>
            <article><strong>{notifications.filter((n) => !n.read).length}</strong><span>Unread Alerts</span></article>
            <article><strong>{user.isVerified ? "Yes" : "No"}</strong><span>Verified</span></article>
          </div>
        </Panel>
      )}

      {tab === "find-donors" && (
        <Panel title="Find Donors">
          <form className="grid-form" onSubmit={searchDonors}>
            <select value={searchFilters.bloodGroup} onChange={(e) => setSearchFilters({ ...searchFilters, bloodGroup: e.target.value })}>
              <option value="">Any Group</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
            <input placeholder="City" value={searchFilters.city} onChange={(e) => setSearchFilters({ ...searchFilters, city: e.target.value })} />
            <input placeholder="Area" value={searchFilters.area} onChange={(e) => setSearchFilters({ ...searchFilters, area: e.target.value })} />
            <button type="submit">Search</button>
          </form>
          <div className="list">
            {donors.map((donor) => (
              <article key={donor._id} className="card">
                <h4>{donor.name}</h4>
                <p>{donor.bloodGroup} • {donor.city || "-"} • {donor.area || "-"}</p>
                <p>{donor.phone || "No phone shared"}</p>
              </article>
            ))}
          </div>
        </Panel>
      )}

      {tab === "request-blood" && (
        <Panel title="Create Blood Request">
          <form className="grid-form" onSubmit={createRequest}>
            <select value={requestForm.bloodGroup} onChange={(e) => setRequestForm({ ...requestForm, bloodGroup: e.target.value })}>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
            <input type="number" min="1" max="20" value={requestForm.units} onChange={(e) => setRequestForm({ ...requestForm, units: Number(e.target.value) })} />
            <select value={requestForm.urgency} onChange={(e) => setRequestForm({ ...requestForm, urgency: e.target.value })}>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
              <option value="critical">Critical</option>
            </select>
            <input placeholder="Hospital" value={requestForm.hospital} onChange={(e) => setRequestForm({ ...requestForm, hospital: e.target.value })} required />
            <input placeholder="City" value={requestForm.city} onChange={(e) => setRequestForm({ ...requestForm, city: e.target.value })} required />
            <input placeholder="Area" value={requestForm.area} onChange={(e) => setRequestForm({ ...requestForm, area: e.target.value })} required />
            <input type="datetime-local" value={requestForm.requiredDate} onChange={(e) => setRequestForm({ ...requestForm, requiredDate: e.target.value })} required />
            <textarea placeholder="Notes" value={requestForm.notes} onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })} />
            <button type="submit">Submit Request</button>
          </form>

          <div className="list">
            {requests.map((req) => (
              <article key={req._id} className="card">
                <h4>{req.bloodGroup} • {req.urgency.toUpperCase()} • {req.status}</h4>
                <p>{req.hospital}, {req.city}, {req.area}</p>
                <p>Need by: {new Date(req.requiredDate).toLocaleString()}</p>

                {user.role === "donor" && (
                  <div className="actions">
                    <button onClick={() => respondToRequest(req._id, "accepted")}>Accept</button>
                    <button className="ghost" onClick={() => respondToRequest(req._id, "rejected")}>Reject</button>
                  </div>
                )}
              </article>
            ))}
          </div>

          {(user.role === "recipient" || user.role === "admin") && (
            <form className="grid-form" onSubmit={scheduleDonation}>
              <h4>Schedule Donation</h4>
              <input placeholder="Request ID" value={scheduleForm.requestId} onChange={(e) => setScheduleForm({ ...scheduleForm, requestId: e.target.value })} required />
              <input placeholder="Donor ID" value={scheduleForm.donorId} onChange={(e) => setScheduleForm({ ...scheduleForm, donorId: e.target.value })} required />
              <input type="datetime-local" value={scheduleForm.scheduledAt} onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledAt: e.target.value })} required />
              <input placeholder="Location" value={scheduleForm.location} onChange={(e) => setScheduleForm({ ...scheduleForm, location: e.target.value })} required />
              <input placeholder="Hospital" value={scheduleForm.hospital} onChange={(e) => setScheduleForm({ ...scheduleForm, hospital: e.target.value })} required />
              <textarea placeholder="Notes" value={scheduleForm.notes} onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })} />
              <button type="submit">Schedule</button>
            </form>
          )}
        </Panel>
      )}

      {tab === "notifications" && (
        <Panel title="Notifications">
          <div className="list">
            {notifications.map((n) => (
              <article key={n._id} className={`card ${n.read ? "read" : "unread"}`}>
                <h4>{n.title}</h4>
                <p>{n.message}</p>
                <small>{new Date(n.createdAt).toLocaleString()}</small>
                {!n.read && <button onClick={() => markNotificationRead(n._id)}>Mark as read</button>}
              </article>
            ))}
          </div>
        </Panel>
      )}

      {tab === "donations" && (
        <Panel title="Donation Tracker">
          <div className="list">
            {donations.map((d) => (
              <article key={d._id} className="card">
                <h4>{d.status.toUpperCase()} • {new Date(d.scheduledAt).toLocaleString()}</h4>
                <p>{d.hospital} @ {d.location}</p>
                <p>Request urgency: {d.request?.urgency || "-"}</p>
                {(user.role === "recipient" || user.role === "admin") && d.status !== "completed" && (
                  <button onClick={() => completeDonation(d._id)}>Mark Completed</button>
                )}
              </article>
            ))}
          </div>
        </Panel>
      )}

      {tab === "admin" && user.role === "admin" && (
        <Panel title="Admin Dashboard">
          {adminStats && (
            <div className="stats-grid">
              <article><strong>{adminStats.users}</strong><span>Total Users</span></article>
              <article><strong>{adminStats.donors}</strong><span>Donors</span></article>
              <article><strong>{adminStats.verifiedDonors}</strong><span>Verified Donors</span></article>
              <article><strong>{adminStats.openRequests}</strong><span>Open Requests</span></article>
              <article><strong>{adminStats.criticalRequests}</strong><span>Critical Requests</span></article>
              <article><strong>{adminStats.completedDonations}</strong><span>Completed Donations</span></article>
            </div>
          )}
          <div className="list">
            {adminDonors.map((donor) => (
              <article key={donor._id} className="card">
                <h4>{donor.name} • {donor.bloodGroup}</h4>
                <p>{donor.city || "-"}, {donor.area || "-"}</p>
                <p>{donor.isVerified ? "Verified" : "Pending Verification"}</p>
                {!donor.isVerified && <button onClick={() => verifyDonor(donor._id)}>Verify Donor</button>}
              </article>
            ))}
          </div>
        </Panel>
      )}
    </main>
  );
}
