import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { isEligibleComplianceOfficer } from './src/shared/complianceOfficerFilter';

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
    role: 'Compliance Officer',
    accountType: 'accountant',
    organization_id: 'org_main_practice',
    companyInfo: {
      companyName: 'CAPO Management & Advisory Services',
      cpaLicenseNo: 'CPA-0192834',
    },
  },
  {
    id: 'super_admin_tagz',
    name: 'Gerald (Super Admin)',
    email: 'tagz.gerald13@gmail.com',
    password: 'password123',
    role: 'Compliance Officer',
    accountType: 'accountant',
    organization_id: 'org_main_practice',
    companyInfo: {
      companyName: 'CAPO Management & Advisory Services',
      cpaLicenseNo: 'CPA-0192834',
    },
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

function normEmail(e?: string): string {
  return e ? String(e).toLowerCase().trim() : '';
}

function normTin(t?: string): string {
  if (!t) return '';
  return String(t).replace(/\D/g, '');
}

function normName(n?: string): string {
  if (!n) return '';
  return String(n)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function isClientMatch(c: any, email?: string, tin?: string, name?: string, clientId?: string): boolean {
  if (!c) return false;

  // 1. Direct ID match
  const cId = c.id || c.clientId;
  const targetId = clientId;
  if (targetId && cId && String(cId) === String(targetId)) return true;

  // 2. Email match
  const cEmail = normEmail(c.email);
  const targetEmail = normEmail(email);
  if (targetEmail && cEmail && cEmail === targetEmail) return true;

  // 3. TIN match
  const cTin = normTin(c.tin || c.companyInfo?.tin);
  const targetTin = normTin(tin);
  if (targetTin && cTin) {
    if (cTin === targetTin) return true;
    if (cTin.length >= 9 && targetTin.length >= 9 && cTin.slice(0, 9) === targetTin.slice(0, 9)) return true;
  }

  // 4. Name match (Company name or taxpayer name)
  const cName = normName(c.name || c.companyName || c.companyInfo?.companyName);
  const targetName = normName(name);
  if (targetName && cName && cName.length >= 3) {
    if (cName === targetName) return true;
    if (cName.length >= 5 && targetName.length >= 5 && (cName.includes(targetName) || targetName.includes(cName))) return true;
  }

  return false;
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
    const { id, email, accountType, companyInfo, clientDashboardMode, name, role, tin, syncedAccountantEmail, syncedAccountantName, isSyncedWithAccountant } = req.body || {};
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
        clientDashboardMode: clientDashboardMode || 'shared_accountant',
        tin: companyInfo?.tin || tin,
        syncedAccountantEmail,
        syncedAccountantName,
        isSyncedWithAccountant: isSyncedWithAccountant ?? false,
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
      syncedAccountantEmail: syncedAccountantEmail !== undefined ? syncedAccountantEmail : existing.syncedAccountantEmail,
      syncedAccountantName: syncedAccountantName !== undefined ? syncedAccountantName : existing.syncedAccountantName,
      isSyncedWithAccountant: isSyncedWithAccountant !== undefined ? isSyncedWithAccountant : existing.isSyncedWithAccountant,
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

    const users = db.users || [];
    const currentUser = users.find((u: any) => 
      (userEmail && u.email && u.email.toLowerCase().trim() === userEmail) ||
      (userId && u.id === userId)
    );

    const isBusinessOwner = currentUser?.accountType === 'business_owner' || currentUser?.role === 'Client';

    if (isBusinessOwner) {
      const boEmail = currentUser?.email || userEmail;
      const boTin = currentUser?.companyInfo?.tin || currentUser?.tin;
      const boName = currentUser?.companyInfo?.companyName || currentUser?.name;
      const boId = currentUser?.id || userId;
      const boClientId = currentUser?.clientId;
      const syncedOfficerEmail = currentUser?.syncedAccountantEmail ? currentUser.syncedAccountantEmail.toLowerCase().trim() : '';

      const matchedClients: any[] = [];
      const matchedClientKeys = new Set<string>();

      const addMatched = (c: any, officerKey?: string) => {
        if (!c) return;
        const key = c.id || c.name || c.tin;
        if (key && !matchedClientKeys.has(key)) {
          matchedClientKeys.add(key);
          matchedClients.push(c);
        }
      };

      // 1. Look in synced officer's client list
      if (syncedOfficerEmail && db.user_clients[syncedOfficerEmail]) {
        const list = db.user_clients[syncedOfficerEmail];
        if (Array.isArray(list)) {
          for (const c of list) {
            if (isClientMatch(c, boEmail, boTin, boName, boClientId || boId)) {
              addMatched(c, syncedOfficerEmail);
            }
          }
        }
      }

      // 2. Scan all officer user_clients lists
      for (const [key, list] of Object.entries(db.user_clients)) {
        if (key === boEmail || key === boId) continue;
        if (Array.isArray(list)) {
          for (const c of list) {
            if (isClientMatch(c, boEmail, boTin, boName, boClientId || boId)) {
              addMatched(c, key);

              // Auto-sync officer link on business owner profile if missing
              if (currentUser && !currentUser.syncedAccountantEmail) {
                const officerUser = users.find((u: any) => 
                  (u.email && u.email.toLowerCase().trim() === key.toLowerCase().trim()) || u.id === key
                );
                currentUser.syncedAccountantEmail = officerUser?.email || key;
                currentUser.syncedAccountantName = officerUser?.companyInfo?.companyName || officerUser?.name || 'MAW Tax & Accounting Services';
                currentUser.isSyncedWithAccountant = true;
                currentUser.clientDashboardMode = 'shared_accountant';
                writeDB(db);
              }
            }
          }
        }
      }

      // 3. Fallback to global db.clients
      if (Array.isArray(db.clients)) {
        for (const c of db.clients) {
          if (isClientMatch(c, boEmail, boTin, boName, boClientId || boId)) {
            addMatched(c);
          }
        }
      }

      // 4. Fallback to business owner's own saved list
      let boList = db.user_clients[boEmail] || (boId ? db.user_clients[boId] : null) || [];
      if (Array.isArray(boList)) {
        for (const c of boList) {
          addMatched(c);
        }
      }

      if (matchedClients.length > 0) {
        // Keep business owner's user_clients array in sync
        if (boEmail) db.user_clients[boEmail] = matchedClients;
        if (boId) db.user_clients[boId] = matchedClients;
        writeDB(db);

        return res.json({ success: true, clients: matchedClients });
      }

      return res.json({ success: true, clients: boList });
    }

    // For Compliance Officers / Accountants
    let clientList: any[] = [];
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
    if (!Array.isArray(clients)) {
      return res.status(400).json({ success: false, message: 'Invalid clients array' });
    }

    const db = readDB();
    if (!db.user_clients) db.user_clients = {};
    if (!db.clients) db.clients = [];
    const users = db.users || [];

    const callerEmail = userEmail ? String(userEmail).toLowerCase().trim() : '';
    const callerUser = users.find((u: any) => 
      (callerEmail && u.email && u.email.toLowerCase().trim() === callerEmail) ||
      (userId && u.id === userId)
    );

    // Save under caller's keys
    if (callerEmail) db.user_clients[callerEmail] = clients;
    if (userId) db.user_clients[userId] = clients;

    // Check caller role
    const isCallerBusinessOwner = callerUser?.accountType === 'business_owner' || callerUser?.role === 'Client';

    if (!isCallerBusinessOwner) {
      // Officer is uploading/saving client list
      const officerEmail = callerUser?.email || callerEmail;
      const officerName = callerUser?.companyInfo?.companyName || callerUser?.name || 'CAPO Management & Advisory Services';

      for (const clientItem of clients) {
        if (!clientItem) continue;

        // Upsert into global db.clients
        const gIdx = db.clients.findIndex((c: any) => 
          isClientMatch(c, clientItem.email, clientItem.tin, clientItem.name, clientItem.id)
        );
        if (gIdx !== -1) {
          db.clients[gIdx] = { ...db.clients[gIdx], ...clientItem };
        } else {
          db.clients.push(clientItem);
        }

        // Find registered business owner user matching this client item
        const matchingUsers = users.filter((u: any) => 
          (u.accountType === 'business_owner' || u.role === 'Client') &&
          isClientMatch(u, clientItem.email, clientItem.companyInfo?.tin || u.tin, clientItem.name || clientItem.companyName, clientItem.id)
        );

        for (const matchingUser of matchingUsers) {
          matchingUser.syncedAccountantEmail = officerEmail;
          matchingUser.syncedAccountantName = officerName;
          matchingUser.isSyncedWithAccountant = true;
          matchingUser.clientDashboardMode = 'shared_accountant';

          // Sync client object directly to business owner's user_clients key
          const boEmail = matchingUser.email ? matchingUser.email.toLowerCase().trim() : '';
          if (boEmail) {
            const existingBoList = db.user_clients[boEmail] || [];
            const idx = existingBoList.findIndex((c: any) => isClientMatch(c, clientItem.email, clientItem.tin, clientItem.name, clientItem.id));
            if (idx !== -1) {
              existingBoList[idx] = { ...existingBoList[idx], ...clientItem };
            } else {
              existingBoList.push(clientItem);
            }
            db.user_clients[boEmail] = existingBoList;
          }

          if (matchingUser.id) {
            db.user_clients[matchingUser.id] = db.user_clients[boEmail] || [clientItem];
          }
        }
      }
    } else {
      // Business Owner is updating forms/status in Client Portal
      const boEmail = callerUser?.email || callerEmail;
      const boName = callerUser?.companyInfo?.companyName || callerUser?.name;
      const boTin = callerUser?.companyInfo?.tin || callerUser?.tin;

      for (const boClient of clients) {
        if (!boClient) continue;

        // Update in global db.clients
        const gIdx = db.clients.findIndex((c: any) => 
          isClientMatch(c, boClient.email, boClient.tin, boClient.name, boClient.id)
        );
        if (gIdx !== -1) {
          db.clients[gIdx] = { ...db.clients[gIdx], ...boClient };
        }

        // Find officer user_clients entries and update the officer's copy
        for (const [key, list] of Object.entries(db.user_clients)) {
          if (key === boEmail || key === userId) continue; // Skip business owner's own key
          if (Array.isArray(list)) {
            const idx = list.findIndex((c: any) => 
              isClientMatch(c, boClient.email || boEmail, boClient.tin || boTin, boClient.name || boName, boClient.id)
            );
            if (idx !== -1) {
              list[idx] = { ...list[idx], ...boClient };
              db.user_clients[key] = list;
            }
          }
        }
      }
    }

    writeDB(db);
    return res.json({ success: true, count: clients.length });
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

  // ACCOUNTANTS LIST API (For business owners to select / sync with a registered compliance firm)
  // Only verified, registered Compliance Officers may appear here. Business owner
  // and client accounts are hard-excluded via isEligibleComplianceOfficer, which is
  // the same predicate used by the client-side fallback list — see
  // src/shared/complianceOfficerFilter.ts for the single source of truth.
  app.get('/api/accountants/list', (_req, res) => {
    const db = readDB();
    const users = db.users || [];
    const accountants = users
      .filter((u: any) => isEligibleComplianceOfficer(u))
      .map((u: any) => ({
        id: u.id,
        name: u.companyInfo?.companyName || u.name || 'Compliance CPA Firm',
        email: u.email,
        role: u.role || 'Compliance Officer',
        // accountType is included so downstream consumers can safely re-apply
        // isEligibleComplianceOfficer() without losing information (an
        // accountType:'accountant' user may not have one of the literal
        // COMPLIANCE_OFFICER_ROLES strings as their role).
        accountType: u.accountType || 'accountant',
        cpaLicenseNo: u.companyInfo?.cpaLicenseNo || 'CPA-LIC-009812',
      }));

    // If empty, supply default registered compliance firms with company names
    if (accountants.length === 0) {
      accountants.push(
        {
          id: 'acc_tagz_cpa',
          name: 'CAPO Management & Advisory Services',
          email: 'thugz.gerald13@gmail.com',
          role: 'Compliance Officer',
          accountType: 'accountant',
          cpaLicenseNo: 'CPA-0192834',
        },
        {
          id: 'acc_maw_tax',
          name: 'MAW Tax & Accounting Services',
          email: 'mawcons.bir@gmail.com',
          role: 'Compliance Officer',
          accountType: 'accountant',
          cpaLicenseNo: 'CPA-0884120',
        }
      );
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
      const accEmail = user.syncedAccountantEmail ? user.syncedAccountantEmail.toLowerCase().trim() : '';
      if (accEmail && accEmail !== clientEmail) {
        isSynced = true;
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
      } else if (accEmail === clientEmail) {
        // Clean up invalid self-sync
        delete user.syncedAccountantEmail;
        delete user.syncedAccountantName;
        user.isSyncedWithAccountant = false;
        writeDB(db);
      }
    }

    // Secondary check: Has any accountant added this client in db.user_clients or db.clients?
    if (!isSynced) {
      const userClientsMap = db.user_clients || {};
      for (const [accKey, clientList] of Object.entries(userClientsMap)) {
        if (Array.isArray(clientList)) {
          const match = clientList.find((c: any) => 
            (c.email && c.email.toLowerCase().trim() === clientEmail) ||
            (user && user.tin && c.tin === user.tin)
          );
          if (match) {
            const foundAcc = users.find((u: any) => 
              (u.email && u.email.toLowerCase().trim() === accKey.toLowerCase().trim()) ||
              u.id === accKey
            );
            const actualAccEmail = (foundAcc?.email || accKey).toLowerCase().trim();

            if (actualAccEmail && actualAccEmail !== clientEmail) {
              isSynced = true;
              accountantObj = {
                name: foundAcc?.companyInfo?.companyName || foundAcc?.name || 'CAPO Management & Advisory Services',
                email: actualAccEmail,
                role: foundAcc?.role || 'Compliance Officer',
                cpaLicenseNo: foundAcc?.companyInfo?.cpaLicenseNo || 'CPA-LIC-009812',
              };
              // Persist sync state back on user profile
              if (user) {
                user.syncedAccountantEmail = actualAccEmail;
                user.syncedAccountantName = accountantObj.name;
                user.isSyncedWithAccountant = true;
                writeDB(db);
              }
              break;
            }
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

    if (normClientEmail === normAccEmail) {
      return res.status(400).json({ success: false, message: 'Cannot sync client with their own email address as accountant' });
    }

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
      users[clientUserIdx].clientDashboardMode = 'shared_accountant';
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

    // Ensure client is present in accountant's user_clients array and global clients list
    if (!db.user_clients) db.user_clients = {};
    if (!db.clients) db.clients = [];

    const existingAccClients = db.user_clients[normAccEmail] || (accUser?.id ? db.user_clients[accUser.id] : null) || [];
    const accClients = [...existingAccClients];
    const clientUser = users.find((u: any) => u.email && u.email.toLowerCase().trim() === normClientEmail);

    const clientName = clientUser?.companyInfo?.companyName || clientUser?.name || normClientEmail.split('@')[0];
    const clientTin = clientUser?.companyInfo?.tin || clientUser?.tin || '000-000-000-00000';
    const clientRdo = clientUser?.companyInfo?.rdo || '043';

    const accClientIdx = accClients.findIndex((c: any) => c.email && c.email.toLowerCase().trim() === normClientEmail);
    if (accClientIdx !== -1) {
      accClients[accClientIdx].name = clientName;
      accClients[accClientIdx].tin = clientTin;
      accClients[accClientIdx].rdo = clientRdo;
    } else {
      const newClientRecord = {
        id: clientUser?.clientId || 'client_' + Date.now(),
        name: clientName,
        email: normClientEmail,
        tin: clientTin,
        rdo: clientRdo,
        type: 'Corporate',
        status: 'Active',
        forms: [],
      };
      accClients.push(newClientRecord);
    }
    db.user_clients[normAccEmail] = accClients;
    if (accUser?.id) {
      db.user_clients[accUser.id] = accClients;
    }

    // Also update or add in db.clients
    const globalIdx = db.clients.findIndex((c: any) => c.email && c.email.toLowerCase().trim() === normClientEmail);
    if (globalIdx !== -1) {
      db.clients[globalIdx].name = clientName;
      db.clients[globalIdx].tin = clientTin;
      db.clients[globalIdx].rdo = clientRdo;
    } else {
      db.clients.push({
        id: clientUser?.clientId || 'client_' + Date.now(),
        name: clientName,
        email: normClientEmail,
        tin: clientTin,
        rdo: clientRdo,
        type: 'Corporate',
        status: 'Active',
        forms: [],
      });
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

    // Maintain sync state on client user record
    if (normClient) {
      const users = db.users || [];
      const clientIdx = users.findIndex((u: any) => u.email && u.email.toLowerCase().trim() === normClient);
      if (clientIdx !== -1) {
        // Correct accountant email determination:
        // If sender is client, accountant is recipient. If sender is officer, accountant is sender.
        let targetAccEmail = (normSender === normClient) ? normRecipient : normSender;
        
        if (targetAccEmail && targetAccEmail !== normClient) {
          users[clientIdx].syncedAccountantEmail = targetAccEmail;
          users[clientIdx].isSyncedWithAccountant = true;

          const accUser = users.find((u: any) => u.email && u.email.toLowerCase().trim() === targetAccEmail);
          if (accUser) {
            users[clientIdx].syncedAccountantName = accUser.companyInfo?.companyName || accUser.name || 'Compliance CPA Firm';
          }
          db.users = users;
        }
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