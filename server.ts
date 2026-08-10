import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'central_db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DEFAULT_USERS = [
  {
    id: 'super_admin_thugz',
    name: 'Gerald (Super Admin)',
    email: 'thugz.gerald13@gmail.com',
    password: 'password123',
    role: 'Super Admin',
    organization_id: 'org_main_practice',
  },
  {
    id: 'super_admin_tagz',
    name: 'Gerald (Super Admin)',
    email: 'tagz.gerald13@gmail.com',
    password: 'password123',
    role: 'Super Admin',
    organization_id: 'org_main_practice',
  },
];

// Helper to read database
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: DEFAULT_USERS,
      clients: [],
      forms: [],
      user_clients: {},
      user_forms: {},
      logs: {},
      settings: {},
    };
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf8');
    } catch (e) {}
    return initialData;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.users) parsed.users = DEFAULT_USERS;
    if (!parsed.clients) parsed.clients = [];
    if (!parsed.forms) parsed.forms = [];
    if (!parsed.user_clients) parsed.user_clients = {};
    if (!parsed.user_forms) parsed.user_forms = {};
    if (!parsed.logs) parsed.logs = {};
    if (!parsed.settings) parsed.settings = {};
    if (!parsed.messages) parsed.messages = [];
    return parsed;
  } catch (err) {
    console.error('Error reading central_db.json:', err);
    return {
      users: DEFAULT_USERS,
      clients: [],
      forms: [],
      user_clients: {},
      user_forms: {},
      logs: {},
      settings: {},
      messages: [],
    };
  }
}

// Helper to write database
function writeDB(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing to central_db.json:', err);
  }
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '50mb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // UNIFIED GET user data across device
  app.get('/api/user-data', (req, res) => {
    const email = req.query.email ? String(req.query.email).toLowerCase().trim() : '';
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email query is required' });
    }

    const db = readDB();
    const user = (db.users || []).find((u: any) => u.email && u.email.toLowerCase().trim() === email);

    const userClients = (db.user_clients && db.user_clients[email]) || db.clients || [];
    const userForms = (db.user_forms && db.user_forms[email]) || db.forms || [];
    const userLogs = (db.logs && (db.logs[email] || db.logs['default'])) || [];
    const userSettings = (db.settings && (db.settings[email] || db.settings['default'])) || null;

    res.json({
      success: true,
      user: user || null,
      clients: userClients,
      forms: userForms,
      logs: userLogs,
      settings: userSettings,
    });
  });

  // UNIFIED POST user data save
  app.post('/api/user-data/save', (req, res) => {
    const { email, user, clients, forms, settings, logs } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const normEmail = String(email).toLowerCase().trim();
    const db = readDB();

    if (user) {
      const users = db.users || [];
      const idx = users.findIndex((u: any) => u.email && u.email.toLowerCase().trim() === normEmail);
      if (idx !== -1) {
        users[idx] = { ...users[idx], ...user, updatedAt: new Date().toISOString() };
      } else {
        users.push({ ...user, email: normEmail, updatedAt: new Date().toISOString() });
      }
      db.users = users;
    }

    if (Array.isArray(clients)) {
      if (!db.user_clients) db.user_clients = {};
      db.user_clients[normEmail] = clients;
      db.clients = clients;
    }

    if (Array.isArray(forms)) {
      if (!db.user_forms) db.user_forms = {};
      db.user_forms[normEmail] = forms;
      db.forms = forms;
    }

    if (settings) {
      if (!db.settings) db.settings = {};
      db.settings[normEmail] = settings;
    }

    if (Array.isArray(logs)) {
      if (!db.logs) db.logs = {};
      db.logs[normEmail] = logs;
    }

    writeDB(db);
    return res.json({ success: true });
  });

  // GET all users
  app.get('/api/users', (_req, res) => {
    const db = readDB();
    res.json({ success: true, users: db.users || [] });
  });

  // GET user by email or ID
  app.get('/api/users/find', (req, res) => {
    const query = String(req.query.q || '').toLowerCase().trim();
    if (!query) {
      return res.status(400).json({ success: false, message: 'Query parameter required' });
    }
    const db = readDB();
    const found = (db.users || []).find(
      (u: any) => u.id === query || (u.email && u.email.toLowerCase().trim() === query)
    );
    if (found) {
      return res.json({ success: true, user: found });
    }
    return res.status(404).json({ success: false, message: 'User not found' });
  });

  // REGISTER or UPSERT user
  app.post('/api/users/register', (req, res) => {
    const { name, email, password, role, accountType, companyInfo, clientDashboardMode } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const normEmail = String(email).toLowerCase().trim();
    const db = readDB();
    const users = db.users || [];

    const existingIndex = users.findIndex((u: any) => u.email?.toLowerCase().trim() === normEmail);

    if (existingIndex !== -1) {
      // Update existing user with provided info without destroying existing profile selections
      const existing = users[existingIndex];
      const updatedUser = {
        ...existing,
        name: existing.companyInfo?.companyName || existing.name || (name ? name.trim() : 'User'),
        role: existing.role || role || 'Compliance Officer',
        accountType: existing.accountType || accountType,
        companyInfo: existing.companyInfo || companyInfo,
        clientDashboardMode: existing.clientDashboardMode || clientDashboardMode,
        tin: existing.companyInfo?.tin || existing.tin || companyInfo?.tin,
        updatedAt: new Date().toISOString(),
      };
      if (password && !existing.password) updatedUser.password = password;
      users[existingIndex] = updatedUser;
      db.users = users;
      writeDB(db);
      return res.json({ success: true, user: updatedUser });
    }

    // Create new user
    const newUser = {
      id: req.body.id || 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      name: name ? name.trim() : normEmail.split('@')[0],
      email: normEmail,
      password: password || 'password123',
      role: role || 'Compliance Officer',
      organization_id: 'org_main_practice',
      accountType,
      companyInfo,
      clientDashboardMode,
      tin: companyInfo?.tin,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    users.push(newUser);
    db.users = users;
    writeDB(db);

    return res.json({ success: true, user: newUser });
  });

  // UPDATE user profile (onboarding & dashboard mode)
  app.post('/api/users/update-profile', (req, res) => {
    const { id, email, accountType, companyInfo, clientDashboardMode, name, role, tin } = req.body || {};
    if (!id && !email) {
      return res.status(400).json({ success: false, message: 'User ID or Email is required' });
    }

    const normEmail = email ? String(email).toLowerCase().trim() : '';
    const db = readDB();
    const users = db.users || [];

    const existingIndex = users.findIndex(
      (u: any) => (id && u.id === id) || (normEmail && u.email?.toLowerCase().trim() === normEmail)
    );

    if (existingIndex === -1) {
      // Create user if missing
      const newUser = {
        id: id || 'user_' + Date.now(),
        name: companyInfo?.companyName || name || normEmail.split('@')[0] || 'User',
        email: normEmail,
        role: role || 'Compliance Officer',
        accountType,
        companyInfo,
        clientDashboardMode: clientDashboardMode || (accountType === 'business_owner' ? 'business_owner' : 'shared_accountant'),
        tin: companyInfo?.tin || tin,
        organization_id: 'org_main_practice',
        updatedAt: new Date().toISOString(),
      };
      users.push(newUser);
      db.users = users;
      writeDB(db);
      return res.json({ success: true, user: newUser });
    }

    const existing = users[existingIndex];
    const updatedUser = {
      ...existing,
      name: companyInfo?.companyName || name || existing.name,
      accountType: accountType !== undefined ? accountType : existing.accountType,
      companyInfo: companyInfo !== undefined ? companyInfo : existing.companyInfo,
      clientDashboardMode: clientDashboardMode !== undefined ? clientDashboardMode : existing.clientDashboardMode,
      role: role || existing.role,
      tin: companyInfo?.tin || tin || existing.tin,
      updatedAt: new Date().toISOString(),
    };

    users[existingIndex] = updatedUser;
    db.users = users;
    writeDB(db);

    return res.json({ success: true, user: updatedUser });
  });

  // CLIENTS sync API
  app.get('/api/clients', (req, res) => {
    const userEmail = req.query.email ? String(req.query.email).toLowerCase().trim() : '';
    const userId = req.query.userId ? String(req.query.userId) : '';
    const db = readDB();
    if (!db.user_clients) db.user_clients = {};

    let clientList = [];
    if (userEmail && db.user_clients[userEmail]) {
      clientList = db.user_clients[userEmail];
    } else if (userId && db.user_clients[userId]) {
      clientList = db.user_clients[userId];
    } else {
      clientList = db.clients || [];
    }

    res.json({ success: true, clients: clientList });
  });

  app.post('/api/clients/sync', (req, res) => {
    const { clients, userEmail, userId } = req.body || {};
    if (Array.isArray(clients)) {
      const db = readDB();
      if (!db.user_clients) db.user_clients = {};

      const normEmail = userEmail ? String(userEmail).toLowerCase().trim() : '';
      if (normEmail) db.user_clients[normEmail] = clients;
      if (userId) db.user_clients[userId] = clients;
      db.clients = clients;
      writeDB(db);
      return res.json({ success: true, count: clients.length });
    }
    return res.status(400).json({ success: false, message: 'Invalid clients array' });
  });

  // FORMS sync API
  app.get('/api/forms', (req, res) => {
    const userEmail = req.query.email ? String(req.query.email).toLowerCase().trim() : '';
    const userId = req.query.userId ? String(req.query.userId) : '';
    const db = readDB();
    if (!db.user_forms) db.user_forms = {};

    let formList = [];
    if (userEmail && db.user_forms[userEmail]) {
      formList = db.user_forms[userEmail];
    } else if (userId && db.user_forms[userId]) {
      formList = db.user_forms[userId];
    } else {
      formList = db.forms || [];
    }

    res.json({ success: true, forms: formList });
  });

  app.post('/api/forms/sync', (req, res) => {
    const { forms, userEmail, userId } = req.body || {};
    if (Array.isArray(forms)) {
      const db = readDB();
      if (!db.user_forms) db.user_forms = {};

      const normEmail = userEmail ? String(userEmail).toLowerCase().trim() : '';
      if (normEmail) db.user_forms[normEmail] = forms;
      if (userId) db.user_forms[userId] = forms;
      db.forms = forms;
      writeDB(db);
      return res.json({ success: true, count: forms.length });
    }
    return res.status(400).json({ success: false, message: 'Invalid forms array' });
  });

  // NOTIFICATIONS LOGS & SETTINGS sync API
  app.get('/api/notifications/logs', (req, res) => {
    const userEmail = req.query.email ? String(req.query.email).toLowerCase().trim() : '';
    const db = readDB();
    const logsObj = db.logs || {};
    const logList = (userEmail && logsObj[userEmail]) || logsObj['default'] || [];
    res.json({ success: true, logs: logList });
  });

  app.post('/api/notifications/logs', (req, res) => {
    const { logs, userEmail } = req.body || {};
    if (Array.isArray(logs)) {
      const normEmail = userEmail ? String(userEmail).toLowerCase().trim() : 'default';
      const db = readDB();
      if (!db.logs) db.logs = {};
      db.logs[normEmail] = logs;
      db.logs['default'] = logs;
      writeDB(db);
      return res.json({ success: true, count: logs.length });
    }
    return res.status(400).json({ success: false, message: 'Invalid logs array' });
  });

  app.get('/api/notifications/settings', (req, res) => {
    const userEmail = req.query.email ? String(req.query.email).toLowerCase().trim() : 'default';
    const db = readDB();
    const settingsMap = db.settings || {};
    res.json({ success: true, settings: settingsMap[userEmail] || settingsMap['default'] || null });
  });

  app.post('/api/notifications/settings', (req, res) => {
    const { settings, userEmail } = req.body || {};
    if (settings) {
      const emailKey = userEmail ? String(userEmail).toLowerCase().trim() : 'default';
      const db = readDB();
      if (!db.settings) db.settings = {};
      db.settings[emailKey] = settings;
      db.settings['default'] = settings;
      writeDB(db);
      return res.json({ success: true });
    }
    return res.status(400).json({ success: false, message: 'Invalid settings object' });
  });

  // ACCOUNTANTS LIST API (For business owners to select / sync with an accountant)
  app.get('/api/accountants/list', (_req, res) => {
    const db = readDB();
    const users = db.users || [];
    const accountants = users.filter((u: any) => 
      u.accountType === 'accountant' || 
      u.role === 'Compliance Officer' || 
      u.role === 'Compliance Specialist' || 
      u.role === 'Super Admin' || 
      u.role === 'Admin'
    ).map((u: any) => ({
      id: u.id,
      name: u.companyInfo?.companyName || u.name || 'CPA Firm',
      email: u.email,
      role: u.role || 'Compliance Officer',
      cpaLicenseNo: u.companyInfo?.cpaLicenseNo || 'CPA-LIC-009812',
    }));

    // If empty, add a default compliance firm so business owners can always sync
    if (accountants.length === 0) {
      accountants.push({
        id: 'cpa_main_firm',
        name: 'BIZ-COMPLY CPA & Compliance Firm',
        email: 'thugz.gerald13@gmail.com',
        role: 'Lead Compliance CPA',
        cpaLicenseNo: 'CPA-LIC-009812',
      });
    }

    res.json({ success: true, accountants });
  });

  // ACCOUNTANT SYNC STATUS API
  app.get('/api/accountant/status', (req, res) => {
    const clientEmail = req.query.email ? String(req.query.email).toLowerCase().trim() : '';
    if (!clientEmail) {
      return res.status(400).json({ success: false, message: 'Client email required' });
    }

    const db = readDB();
    const users = db.users || [];
    const user = users.find((u: any) => u.email && u.email.toLowerCase().trim() === clientEmail);

    let isSynced = false;
    let accountantObj: any = null;

    // Check direct user property
    if (user && (user.syncedAccountantEmail || user.isSyncedWithAccountant)) {
      isSynced = true;
      const accEmail = user.syncedAccountantEmail ? user.syncedAccountantEmail.toLowerCase().trim() : '';
      const foundAcc = users.find((u: any) => u.email && u.email.toLowerCase().trim() === accEmail);
      if (foundAcc) {
        accountantObj = {
          name: foundAcc.companyInfo?.companyName || foundAcc.name || 'Lead CPA Officer',
          email: foundAcc.email,
          role: foundAcc.role || 'Compliance Officer',
          cpaLicenseNo: foundAcc.companyInfo?.cpaLicenseNo || 'CPA-LIC-009812',
        };
      } else {
        accountantObj = {
          name: user.syncedAccountantName || 'Designated CPA Firm',
          email: accEmail || 'compliance@bizcomply.ph',
          role: 'Compliance Officer',
          cpaLicenseNo: 'CPA-LIC-009812',
        };
      }
    }

    // Secondary check: Has any accountant added this client in db.user_clients or db.clients?
    if (!isSynced) {
      const userClientsMap = db.user_clients || {};
      for (const [accEmail, clientList] of Object.entries(userClientsMap)) {
        if (Array.isArray(clientList)) {
          const match = clientList.find((c: any) => 
            (c.email && c.email.toLowerCase().trim() === clientEmail) ||
            (user && user.tin && c.tin === user.tin)
          );
          if (match) {
            isSynced = true;
            const foundAcc = users.find((u: any) => u.email && u.email.toLowerCase().trim() === accEmail.toLowerCase().trim());
            accountantObj = {
              name: foundAcc?.companyInfo?.companyName || foundAcc?.name || 'BIZ-COMPLY Practice Firm',
              email: accEmail,
              role: foundAcc?.role || 'Compliance Officer',
              cpaLicenseNo: foundAcc?.companyInfo?.cpaLicenseNo || 'CPA-LIC-009812',
            };
            // Persist sync state back on user profile
            if (user) {
              user.syncedAccountantEmail = accEmail;
              user.syncedAccountantName = accountantObj.name;
              user.isSyncedWithAccountant = true;
              writeDB(db);
            }
            break;
          }
        }
      }
    }

    res.json({ success: true, isSynced, accountant: accountantObj });
  });

  // CONNECT & SYNC ACCOUNTANT API
  app.post('/api/accountant/sync', (req, res) => {
    const { clientEmail, accountantEmail, accountantName } = req.body || {};
    if (!clientEmail || !accountantEmail) {
      return res.status(400).json({ success: false, message: 'Client email and Accountant email are required' });
    }

    const normClientEmail = String(clientEmail).toLowerCase().trim();
    const normAccEmail = String(accountantEmail).toLowerCase().trim();

    const db = readDB();
    const users = db.users || [];

    // Find or update client user
    let clientUserIdx = users.findIndex((u: any) => u.email && u.email.toLowerCase().trim() === normClientEmail);
    const accUser = users.find((u: any) => u.email && u.email.toLowerCase().trim() === normAccEmail);
    const accDisplayName = accUser?.companyInfo?.companyName || accUser?.name || accountantName || 'Designated CPA Firm';

    if (clientUserIdx !== -1) {
      users[clientUserIdx].syncedAccountantEmail = normAccEmail;
      users[clientUserIdx].syncedAccountantName = accDisplayName;
      users[clientUserIdx].isSyncedWithAccountant = true;
    } else {
      users.push({
        id: 'user_' + Date.now(),
        email: normClientEmail,
        name: normClientEmail.split('@')[0],
        accountType: 'business_owner',
        clientDashboardMode: 'shared_accountant',
        syncedAccountantEmail: normAccEmail,
        syncedAccountantName: accDisplayName,
        isSyncedWithAccountant: true,
      });
    }

    // Ensure client is present in accountant's user_clients array
    if (!db.user_clients) db.user_clients = {};
    const accClients = db.user_clients[normAccEmail] || db.clients || [];
    const clientExists = accClients.some((c: any) => c.email && c.email.toLowerCase().trim() === normClientEmail);

    if (!clientExists) {
      const clientUser = users.find((u: any) => u.email && u.email.toLowerCase().trim() === normClientEmail);
      const newClientRecord = {
        id: clientUser?.clientId || 'client_' + Date.now(),
        name: clientUser?.companyInfo?.companyName || clientUser?.name || normClientEmail.split('@')[0],
        email: normClientEmail,
        tin: clientUser?.companyInfo?.tin || clientUser?.tin || '000-000-000-00000',
        rdo: clientUser?.companyInfo?.rdo || '043',
        type: 'Corporate',
        status: 'Active',
        forms: [],
      };
      accClients.push(newClientRecord);
      db.user_clients[normAccEmail] = accClients;
      db.clients = accClients;
    }

    db.users = users;
    writeDB(db);

    return res.json({
      success: true,
      isSynced: true,
      accountant: {
        name: accDisplayName,
        email: normAccEmail,
        role: accUser?.role || 'Compliance Officer',
        cpaLicenseNo: accUser?.companyInfo?.cpaLicenseNo || 'CPA-LIC-009812',
      },
      message: `Successfully synced with ${accDisplayName}!`,
    });
  });

  // MESSAGES API - GET conversation history
  app.get('/api/messages', (req, res) => {
    const clientEmail = req.query.clientEmail ? String(req.query.clientEmail).toLowerCase().trim() : '';
    const db = readDB();
    const allMessages = db.messages || [];

    if (!clientEmail) {
      return res.json({ success: true, messages: allMessages });
    }

    // Filter messages for this client
    const conversation = allMessages.filter((m: any) => 
      (m.clientEmail && m.clientEmail.toLowerCase().trim() === clientEmail) ||
      (m.senderEmail && m.senderEmail.toLowerCase().trim() === clientEmail) ||
      (m.recipientEmail && m.recipientEmail.toLowerCase().trim() === clientEmail)
    );

    res.json({ success: true, messages: conversation });
  });

  // MESSAGES API - POST send new message
  app.post('/api/messages', (req, res) => {
    const { id, senderEmail, senderName, senderRole, recipientEmail, clientEmail, text, formCode } = req.body || {};
    if (!text || (!senderEmail && !clientEmail)) {
      return res.status(400).json({ success: false, message: 'Message text and sender/client email are required' });
    }

    const normSender = senderEmail ? String(senderEmail).toLowerCase().trim() : '';
    const normClient = clientEmail ? String(clientEmail).toLowerCase().trim() : normSender;
    const normRecipient = recipientEmail ? String(recipientEmail).toLowerCase().trim() : '';

    const db = readDB();
    if (!db.messages) db.messages = [];

    const newMessage = {
      id: id || 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      senderEmail: normSender,
      senderName: senderName || 'User',
      senderRole: senderRole || 'Client',
      recipientEmail: normRecipient,
      clientEmail: normClient,
      text: text.trim(),
      formCode: formCode || null,
      timestamp: new Date().toISOString(),
    };

    db.messages.push(newMessage);

    // If client is sending to recipient, or accountant replying to client, maintain sync state
    if (normClient && normRecipient) {
      const users = db.users || [];
      const clientIdx = users.findIndex((u: any) => u.email && u.email.toLowerCase().trim() === normClient);
      if (clientIdx !== -1) {
        users[clientIdx].syncedAccountantEmail = normRecipient;
        users[clientIdx].isSyncedWithAccountant = true;
        db.users = users;
      }
    }

    writeDB(db);

    return res.json({ success: true, message: newMessage });
  });

  // Vite middleware in dev mode or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
