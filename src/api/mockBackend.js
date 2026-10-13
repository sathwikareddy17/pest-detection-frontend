// In-browser mock backend matching the Spring Boot pest-detection-backend API
// Used when no external Spring Boot server is reachable.

const STORAGE_KEY = "pd_mock_db";

function makeJwt(username, role) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      sub: username,
      role: role,
      roles: [role],
      exp: Math.floor(Date.now() / 1000) + 86400,
    })
  );
  return `${header}.${payload}.mock-signature`;
}

function getInitialDb() {
  const now = Date.now();
  const PESTS = ["Aphid", "Whitefly", "Thrips", "Fall armyworm", "Fruit fly", "Spider mite"];

  const users = [
    { id: 1, username: "admin", email: "admin@greenfield.example", role: "ADMIN", password: "admin123" },
    { id: 2, username: "priya", email: "priya@greenfield.example", role: "USER", password: "field123" },
  ];

  const traps = [
    { id: 1, name: "Polyhouse 1 North", location: "Block A, tomato", status: "ACTIVE", battery: 86, deviceId: "ST-1001" },
    { id: 2, name: "Polyhouse 2 South", location: "Block A, capsicum", status: "ACTIVE", battery: 72, deviceId: "ST-1002" },
    { id: 3, name: "Chilli plot East", location: "Block C, open field", status: "ACTIVE", battery: 54, deviceId: "ST-1003" },
    { id: 4, name: "Cotton block 3", location: "Block D, open field", status: "ACTIVE", battery: 91, deviceId: "ST-1004" },
    { id: 5, name: "Mango orchard row 4", location: "Orchard", status: "MAINTENANCE", battery: 18, deviceId: "ST-1005" },
    { id: 6, name: "Seedling nursery", location: "Shade house", status: "INACTIVE", battery: 0, deviceId: "ST-1006" },
  ];

  const detections = [];
  let dId = 1;
  for (let i = 0; i < 40; i++) {
    const trapIdx = i % 5;
    const trap = traps[trapIdx];
    const hoursAgo = Math.floor(Math.random() * (14 * 24));
    detections.push({
      id: dId++,
      trapId: trap.id,
      trapName: trap.name,
      pestType: PESTS[i % PESTS.length],
      count: 1 + Math.floor(Math.random() * 5),
      quantity: 1 + Math.floor(Math.random() * 5),
      confidence: Number((0.75 + Math.random() * 0.22).toFixed(2)),
      detectedAt: new Date(now - hoursAgo * 3600 * 1000).toISOString(),
    });
  }

  const sensors = [];
  let sId = 1;
  for (let ti = 0; ti < 5; ti++) {
    const trap = traps[ti];
    for (let k = 0; k < 24; k++) {
      const at = new Date(now - (23 - k) * 3600 * 1000);
      const hour = at.getHours();
      const cycle = Math.sin(((hour - 9) / 24) * 2 * Math.PI);
      const temp = Number((27 + 5 * cycle + (Math.random() - 0.5) * 1.6 + ti * 0.3).toFixed(1));
      const hum = Number((Math.min(97, 70 - 14 * cycle + (Math.random() - 0.5) * 4)).toFixed(1));
      sensors.push({
        id: sId++,
        trapId: trap.id,
        trapName: trap.name,
        temperature: temp,
        humidity: hum,
        recordedAt: at.toISOString(),
      });
    }
  }

  const alerts = [
    {
      id: 1,
      trapId: 1,
      severity: "HIGH",
      message: "Aphid surge: 14 caught in 24 h at Polyhouse 1 North",
      read: false,
      resolved: false,
      createdAt: new Date(now - 130 * 60 * 1000).toISOString(),
    },
    {
      id: 2,
      trapId: 2,
      severity: "MEDIUM",
      message: "Whitefly count rising at Polyhouse 2 South",
      read: false,
      resolved: false,
      createdAt: new Date(now - 7 * 3600 * 1000).toISOString(),
    },
    {
      id: 3,
      trapId: 3,
      severity: "MEDIUM",
      message: "Humidity at 89%. Conditions favour fungal pests at Chilli plot East",
      read: true,
      resolved: false,
      createdAt: new Date(now - 19 * 3600 * 1000).toISOString(),
    },
    {
      id: 4,
      trapId: 5,
      severity: "LOW",
      message: "Battery at 18% on Mango orchard row 4. Swap before next round",
      read: true,
      resolved: false,
      createdAt: new Date(now - 38 * 3600 * 1000).toISOString(),
    },
    {
      id: 5,
      trapId: 4,
      severity: "HIGH",
      message: "Fall armyworm surge: 11 caught in 24 h at Cotton block 3",
      read: true,
      resolved: true,
      createdAt: new Date(now - 4 * 24 * 3600 * 1000).toISOString(),
    },
  ];

  return { users, traps, detections, sensors, alerts };
}

function loadDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed to load mock DB from storage", e);
  }
  const db = getInitialDb();
  saveDb(db);
  return db;
}

function saveDb(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.warn("Failed to persist mock DB", e);
  }
}

export function handleMockRequest(method, path, body) {
  const db = loadDb();
  const cleanPath = path.replace(/^\/api/, "");

  // Auth: /auth/login
  if (cleanPath === "/auth/login" && method === "POST") {
    const user = db.users.find((u) => u.username === body?.username);
    if (!user || (user.password && user.password !== body?.password)) {
      throw new Error("Invalid username or password");
    }
    const token = makeJwt(user.username, user.role);
    return { token, accessToken: token, username: user.username, role: user.role };
  }

  // Auth: /auth/register
  if (cleanPath === "/auth/register" && method === "POST") {
    const existing = db.users.find((u) => u.username === body.username);
    if (existing) throw new Error("Username already taken");
    const newUser = {
      id: db.users.length + 1,
      username: body.username,
      email: body.email,
      role: "USER",
      password: body.password,
    };
    db.users.push(newUser);
    saveDb(db);
    const token = makeJwt(newUser.username, newUser.role);
    return { token, accessToken: token, username: newUser.username, role: newUser.role };
  }

  // Users: /users/me
  if (cleanPath === "/users/me" && method === "GET") {
    return db.users[0];
  }

  // Users: /users
  if (cleanPath === "/users" && method === "GET") {
    return db.users.map(({ password, ...u }) => u);
  }

  if (cleanPath.startsWith("/users/") && method === "PUT") {
    const id = Number(cleanPath.split("/")[2]);
    const idx = db.users.findIndex((u) => u.id === id);
    if (idx !== -1) {
      db.users[idx] = { ...db.users[idx], ...body };
      saveDb(db);
      return db.users[idx];
    }
    throw new Error("User not found");
  }

  if (cleanPath.startsWith("/users/") && method === "DELETE") {
    const id = Number(cleanPath.split("/")[2]);
    db.users = db.users.filter((u) => u.id !== id);
    saveDb(db);
    return { success: true };
  }

  // Traps: /traps
  if (cleanPath === "/traps" && method === "GET") {
    return db.traps;
  }

  if (cleanPath === "/traps" && method === "POST") {
    const newTrap = {
      id: db.traps.length > 0 ? Math.max(...db.traps.map((t) => t.id)) + 1 : 1,
      battery: 100,
      status: "ACTIVE",
      ...body,
    };
    db.traps.push(newTrap);
    saveDb(db);
    return newTrap;
  }

  if (cleanPath.startsWith("/traps/") && method === "GET") {
    const id = Number(cleanPath.split("/")[2]);
    const trap = db.traps.find((t) => t.id === id);
    if (!trap) throw new Error("Trap not found");
    return trap;
  }

  if (cleanPath.startsWith("/traps/") && method === "PUT") {
    const id = Number(cleanPath.split("/")[2]);
    const idx = db.traps.findIndex((t) => t.id === id);
    if (idx !== -1) {
      db.traps[idx] = { ...db.traps[idx], ...body };
      saveDb(db);
      return db.traps[idx];
    }
    throw new Error("Trap not found");
  }

  if (cleanPath.startsWith("/traps/") && method === "DELETE") {
    const id = Number(cleanPath.split("/")[2]);
    db.traps = db.traps.filter((t) => t.id !== id);
    saveDb(db);
    return { success: true };
  }

  // Detections: /detections
  if (cleanPath === "/detections" && method === "GET") {
    return db.detections;
  }

  if (cleanPath.startsWith("/detections/trap/") && method === "GET") {
    const trapId = Number(cleanPath.split("/")[3]);
    return db.detections.filter((d) => d.trapId === trapId);
  }

  if (cleanPath === "/detections" && method === "POST") {
    const newDetection = {
      id: db.detections.length > 0 ? Math.max(...db.detections.map((d) => d.id)) + 1 : 1,
      detectedAt: new Date().toISOString(),
      confidence: 0.9,
      quantity: body.count || body.quantity || 1,
      count: body.count || body.quantity || 1,
      ...body,
    };
    db.detections.unshift(newDetection);
    saveDb(db);
    return newDetection;
  }

  if (cleanPath.startsWith("/detections/") && method === "DELETE") {
    const id = Number(cleanPath.split("/")[2]);
    db.detections = db.detections.filter((d) => d.id !== id);
    saveDb(db);
    return { success: true };
  }

  // Sensors: /sensors
  if (cleanPath === "/sensors" && method === "GET") {
    return db.sensors;
  }

  if (cleanPath.startsWith("/sensors/trap/") && method === "GET") {
    const trapId = Number(cleanPath.split("/")[3]);
    return db.sensors.filter((s) => s.trapId === trapId);
  }

  if (cleanPath === "/sensors" && method === "POST") {
    const newSensor = {
      id: db.sensors.length > 0 ? Math.max(...db.sensors.map((s) => s.id)) + 1 : 1,
      recordedAt: new Date().toISOString(),
      ...body,
    };
    db.sensors.push(newSensor);
    saveDb(db);
    return newSensor;
  }

  // Alerts: /alerts
  if (cleanPath === "/alerts" && method === "GET") {
    return db.alerts;
  }

  if (cleanPath.match(/\/alerts\/\d+\/read/) && method === "PUT") {
    const id = Number(cleanPath.split("/")[2]);
    const alert = db.alerts.find((a) => a.id === id);
    if (alert) {
      alert.read = true;
      saveDb(db);
      return alert;
    }
    throw new Error("Alert not found");
  }

  if (cleanPath.match(/\/alerts\/\d+\/resolve/) && method === "PUT") {
    const id = Number(cleanPath.split("/")[2]);
    const alert = db.alerts.find((a) => a.id === id);
    if (alert) {
      alert.resolved = true;
      saveDb(db);
      return alert;
    }
    throw new Error("Alert not found");
  }

  if (cleanPath.startsWith("/alerts/") && method === "DELETE") {
    const id = Number(cleanPath.split("/")[2]);
    db.alerts = db.alerts.filter((a) => a.id !== id);
    saveDb(db);
    return { success: true };
  }

  console.warn(`Unmatched mock request: ${method} ${cleanPath}`);
  return [];
}
