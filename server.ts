import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

// Since we are running in TS, we can import the initial data directly or define a local DB initializer
import { INITIAL_INVITATIONS, INITIAL_PATIENTS, INITIAL_CRITERIA, INITIAL_TEMPLATES, SCREENING_TYPES } from './src/mockData';
import { Invitation, InvitationStatus } from './src/types';

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'db.json');

// Ensure database file exists
function initDatabase() {
  if (!fs.existsSync(DB_FILE)) {
    console.log('Initializing database file with mock data...');
    const initialDb = {
      invitations: INITIAL_INVITATIONS,
      patients: INITIAL_PATIENTS,
      criteria: INITIAL_CRITERIA,
      templates: INITIAL_TEMPLATES
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
  } else {
    // Migrate existing DB to include district and assignedDoctor if missing
    try {
      const dbContent = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(dbContent);
      let modified = false;
      if (data.patients && Array.isArray(data.patients)) {
        data.patients = data.patients.map((p: any) => {
          const match = INITIAL_PATIENTS.find(ip => ip.id === p.id);
          if (match && (!p.district || !p.assignedDoctor)) {
            modified = true;
            return {
              ...p,
              district: p.district || match.district,
              assignedDoctor: p.assignedDoctor || match.assignedDoctor
            };
          }
          return p;
        });
      }
      if (modified) {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
        console.log('Migrated existing database to include patient district & doctor details.');
      }
    } catch (err) {
      console.error('Error during database migration:', err);
    }
  }
}

initDatabase();

// Helper to read database
function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      initDatabase();
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading database file, returning defaults', err);
    return {
      invitations: INITIAL_INVITATIONS,
      patients: INITIAL_PATIENTS,
      criteria: INITIAL_CRITERIA,
      templates: INITIAL_TEMPLATES
    };
  }
}

// Helper to write database
function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing database file', err);
  }
}

// Enable JSON request body parsing
app.use(express.json());

// API: Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API: Reset database
app.post('/api/reset', (req, res) => {
  const initialDb = {
    invitations: INITIAL_INVITATIONS,
    patients: INITIAL_PATIENTS,
    criteria: INITIAL_CRITERIA,
    templates: INITIAL_TEMPLATES
  };
  writeDb(initialDb);
  res.json({ success: true, message: 'Database reset to initial mock data' });
});

// API: Get all patients
app.get('/api/patients', (req, res) => {
  const db = readDb();
  res.json(db.patients || []);
});

// API: Get criteria
app.get('/api/criteria', (req, res) => {
  const db = readDb();
  res.json(db.criteria || []);
});

// API: Save criteria
app.post('/api/criteria', (req, res) => {
  const db = readDb();
  db.criteria = req.body;
  writeDb(db);
  res.json({ success: true, criteria: db.criteria });
});

// API: Get templates
app.get('/api/templates', (req, res) => {
  const db = readDb();
  res.json(db.templates || []);
});

// API: Save templates
app.post('/api/templates', (req, res) => {
  const db = readDb();
  db.templates = req.body;
  writeDb(db);
  res.json({ success: true, templates: db.templates });
});

// ==========================================
// CRUD: INVITATIONS (Базовая сущность «Приглашение»)
// ==========================================

// 1. GET /api/invitations - Get all invitations or list by patient_id
app.get('/api/invitations', (req, res) => {
  const db = readDb();
  let list: Invitation[] = db.invitations || [];
  
  const { patient_id } = req.query;
  if (patient_id) {
    list = list.filter(inv => inv.patient_id === patient_id);
  }
  
  res.json(list);
});

// 2. GET /api/invitations/:id - Get single invitation by ID
app.get('/api/invitations/:id', (req, res) => {
  const db = readDb();
  const list: Invitation[] = db.invitations || [];
  const invitation = list.find(inv => inv.id === req.params.id);
  
  if (!invitation) {
    res.status(404).json({ error: `Приглашение с ID ${req.params.id} не найдено` });
    return;
  }
  
  res.json(invitation);
});

// 3. POST /api/invitations - Create invitation
app.post('/api/invitations', (req, res) => {
  const { patient_id, screening_type, channels, due_date, created_by } = req.body;
  
  if (!patient_id || !screening_type || !due_date) {
    res.status(400).json({ error: 'Необходимые поля: patient_id, screening_type, due_date' });
    return;
  }
  
  const db = readDb();
  const list: Invitation[] = db.invitations || [];
  
  // Check for existing active, non-expired duplicate invitation
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today for safe comparison
  
  const existingActiveIndex = list.findIndex(inv => {
    const isSamePatient = inv.patient_id === patient_id;
    const isSameType = inv.screening_type === screening_type;
    const isTerminal = inv.status === 'completed' || inv.status === 'cancelled' || inv.status === 'not_completed';
    const invDueDate = new Date(inv.due_date);
    invDueDate.setHours(23, 59, 59, 999); // End of due date
    const isNotExpired = invDueDate >= today;
    
    return isSamePatient && isSameType && !isTerminal && isNotExpired;
  });
  
  if (existingActiveIndex !== -1) {
    // Duplicate found! Extend its due_date instead of creating a new one
    const existing = list[existingActiveIndex];
    
    const updatedInv: Invitation = {
      ...existing,
      due_date,
      status_history: [
        ...existing.status_history,
        {
          status: existing.status,
          timestamp: new Date().toISOString(),
          changed_by: created_by || 'system',
          reason: `Срок действия продлен до ${due_date} (предотвращение дублирования)`
        }
      ]
    };
    
    list[existingActiveIndex] = updatedInv;
    db.invitations = list;
    writeDb(db);
    
    // Return warning with 200 OK
    res.status(200).json({
      warning: 'duplicate_extended',
      message: `У пациента уже имеется активное направление на данный скрининг. Срок действия существующего направления продлен до ${due_date}.`,
      invitation: updatedInv
    });
    return;
  }
  
  // Create invitation ID (e.g., inv-XXX)
  const newId = `inv-${Math.floor(100 + Math.random() * 900)}`;
  
  const newInv: Invitation = {
    id: newId,
    patient_id,
    screening_type,
    status: 'created',
    channels: channels || ['sms'],
    created_by: created_by || 'system',
    created_at: new Date().toISOString(),
    due_date,
    cancel_or_reschedule_reason: null,
    linked_service_id: null,
    status_history: [
      {
        status: 'created',
        timestamp: new Date().toISOString(),
        changed_by: created_by || 'system'
      }
    ]
  };
  
  list.push(newInv);
  db.invitations = list;
  writeDb(db);
  
  res.status(201).json(newInv);
});

// 4. PUT /api/invitations/:id - Update invitation
app.put('/api/invitations/:id', (req, res) => {
  const db = readDb();
  const list: Invitation[] = db.invitations || [];
  const index = list.findIndex(inv => inv.id === req.params.id);
  
  if (index === -1) {
    res.status(404).json({ error: `Приглашение с ID ${req.params.id} не найдено` });
    return;
  }
  
  const existing = list[index];
  const { status, cancel_or_reschedule_reason, linked_service_id, status_history, channels, due_date, patient_answers, appointment_date, appointment_time, registered_at } = req.body;
  
  const updatedInv: Invitation = {
    ...existing,
    status: status !== undefined ? status : existing.status,
    cancel_or_reschedule_reason: cancel_or_reschedule_reason !== undefined ? cancel_or_reschedule_reason : existing.cancel_or_reschedule_reason,
    linked_service_id: linked_service_id !== undefined ? linked_service_id : existing.linked_service_id,
    channels: channels !== undefined ? channels : existing.channels,
    due_date: due_date !== undefined ? due_date : existing.due_date,
    patient_answers: patient_answers !== undefined ? patient_answers : existing.patient_answers,
    appointment_date: appointment_date !== undefined ? appointment_date : existing.appointment_date,
    appointment_time: appointment_time !== undefined ? appointment_time : existing.appointment_time,
    registered_at: registered_at !== undefined ? registered_at : existing.registered_at,
  };
  
  if (status_history) {
    updatedInv.status_history = status_history;
  } else {
    let history = [...existing.status_history];
    let changed = false;
    
    if (status && status !== existing.status) {
      history.push({
        status,
        timestamp: new Date().toISOString(),
        changed_by: req.body.changed_by || 'system',
        reason: cancel_or_reschedule_reason || undefined
      });
      changed = true;
    } else if (due_date && due_date !== existing.due_date) {
      history.push({
        status: status !== undefined ? (status as InvitationStatus) : existing.status,
        timestamp: new Date().toISOString(),
        changed_by: req.body.changed_by || 'system',
        reason: `Срок прохождения изменен с ${existing.due_date} на ${due_date}. Причина: ${cancel_or_reschedule_reason || 'Не указана'}`
      });
      changed = true;
    }
    
    if (changed) {
      updatedInv.status_history = history;
    }
  }
  
  // If completed, update patient's last screening date!
  if (status === 'completed' && linked_service_id) {
    const patients = db.patients || [];
    const patientIndex = patients.findIndex((p: any) => p.id === existing.patient_id);
    if (patientIndex !== -1) {
      patients[patientIndex].lastScreenings = {
        ...patients[patientIndex].lastScreenings,
        [existing.screening_type]: new Date().toISOString().split('T')[0]
      };
      db.patients = patients;
    }
  }
  
  list[index] = updatedInv;
  db.invitations = list;
  writeDb(db);
  
  res.json(updatedInv);
});

// 5. DELETE /api/invitations/:id - Delete invitation
app.delete('/api/invitations/:id', (req, res) => {
  const db = readDb();
  const list: Invitation[] = db.invitations || [];
  const filtered = list.filter(inv => inv.id !== req.params.id);
  
  if (list.length === filtered.length) {
    res.status(404).json({ error: `Приглашение с ID ${req.params.id} не найдено` });
    return;
  }
  
  db.invitations = filtered;
  writeDb(db);
  
  res.json({ success: true, message: `Приглашение ${req.params.id} успешно удалено` });
});

// 5a. GET /api/channel_priority - Get delivery channels priority order
app.get('/api/channel_priority', (req, res) => {
  const db = readDb();
  res.json(db.channel_priority || ['push', 'messenger', 'sms']);
});

// 5b. POST /api/channel_priority - Save delivery channels priority order
app.post('/api/channel_priority', (req, res) => {
  const db = readDb();
  db.channel_priority = req.body;
  writeDb(db);
  res.json({ success: true, channel_priority: db.channel_priority });
});

// 5c. POST /api/invitations/:id/send - Send invitation using multi-channel priority with failover
app.post('/api/invitations/:id/send', (req, res) => {
  const db = readDb();
  const invitations: Invitation[] = db.invitations || [];
  const patients = db.patients || [];
  
  const index = invitations.findIndex(inv => inv.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: `Приглашение с ID ${req.params.id} не найдено` });
    return;
  }
  
  const invitation = invitations[index];
  const patient = patients.find((p: any) => p.id === invitation.patient_id);
  
  if (!patient) {
    res.status(404).json({ error: `Пациент для приглашения не найден в базе данных` });
    return;
  }

  // 1. Determine priority sequence of channels to try
  const defaultPriority = db.channel_priority || ['push', 'messenger', 'sms'];
  let requestedChannels: string[] = req.body.channels || invitation.channels || defaultPriority;
  
  if (!Array.isArray(requestedChannels) || requestedChannels.length === 0) {
    requestedChannels = defaultPriority;
  }

  const CABINETS: { [key: string]: string } = {
    fluorography: 'Кабинет лучевой диагностики №104',
    mammography: 'Кабинет маммографии №205',
    colonoscopy: 'Кабинет эндоскопии №308',
    glucose_cholesterol: 'Процедурный кабинет №12',
    cytology: 'Смотровая №4',
  };

  const SCREENING_NAMES: { [key: string]: string } = {
    fluorography: 'Флюорография легких',
    mammography: 'Маммография молочных желез',
    colonoscopy: 'Скрининговая колоноскопия',
    glucose_cholesterol: 'Глюкоза и холестерин крови',
    cytology: 'Жидкостная онкоцитология',
  };

  const screeningName = SCREENING_NAMES[invitation.screening_type] || invitation.screening_type;
  const cabinetName = CABINETS[invitation.screening_type] || 'Кабинет профилактики №10';

  const attemptedLogs: any[] = [];
  let finalStatus: 'sent' | 'delivered' = 'sent';
  let successChannel: string | null = null;

  // 2. Multi-channel delivery failover loop
  for (const channel of requestedChannels) {
    // Compile template for this channel
    const template = db.templates?.find((t: any) => t.channel === channel);
    let rawText = template ? template.text_with_placeholders : '';
    
    if (!rawText) {
      if (channel === 'sms') {
        rawText = 'Уважаемый(ая) {ФИО}! Вам необходимо пройти скрининг ({скрининг}). Ждем Вас в {кабинет} по адресу: {адрес}. Справки по тел. 8-800-100-20-30.';
      } else if (channel === 'push') {
        rawText = '🔔 Время позаботиться о здоровье! {ФИО}, вам назначен плановый скрининг: {скрининг}. Просим записаться в {кабинет}.';
      } else if (channel === 'messenger') {
        rawText = 'Здравствуйте, {ФИО}! 🏥 КМИС напоминает о важности регулярного обследования. Для Вас подготовлен плановый скрининг: "{скрининг}". Срок прохождения до {дата}. Вы можете пройти процедуру в {кабинет}, расположенном по адресу: {адрес}. Ответьте на это сообщение для записи.';
      }
    }

    // Replace placeholders with actual patient and screening data
    let compiledText = rawText || '';
    compiledText = compiledText.replace(/{ФИО}/g, patient.fullName);
    compiledText = compiledText.replace(/{скрининг}/g, screeningName);
    compiledText = compiledText.replace(/{кабинет}/g, cabinetName);
    compiledText = compiledText.replace(/{адрес}/g, 'ГБУЗ "Городская поликлиника №1", ул. Ленина, д. 45');
    compiledText = compiledText.replace(/{адрес поликлиники}/g, 'ГБУЗ "Городская поликлиника №1", ул. Ленина, д. 45');
    compiledText = compiledText.replace(/{дата}/g, new Date(invitation.due_date).toLocaleDateString('ru-RU'));

    let isAvailable = true;
    let errorDetails = '';

    // Simulated failover conditions
    if (channel === 'sms') {
      if (!patient.phone) {
        isAvailable = false;
        errorDetails = 'У пациента отсутствует номер телефона в КМИС';
      } else if (patient.phone.endsWith('9')) {
        isAvailable = false;
        errorDetails = 'Ошибка SMS-шлюза: Сбой маршрутизации оператора связи (код 404/ROUTING)';
      }
    } else if (channel === 'push') {
      // Simulate that push app is installed for patients with odd IDs
      const numericId = parseInt(patient.id.replace('p', '')) || 0;
      const hasApp = numericId % 2 !== 0;
      if (!hasApp) {
        isAvailable = false;
        errorDetails = 'Мобильное приложение "Моё Здоровье" не установлено на устройстве (нет Push-токена)';
      }
    } else if (channel === 'messenger') {
      // WhatsApp/Telegram available for patients: p1, p2, p5, p6
      const numericId = parseInt(patient.id.replace('p', '')) || 0;
      const hasMessenger = [1, 2, 5, 6].includes(numericId);
      if (!hasMessenger) {
        isAvailable = false;
        errorDetails = 'Аккаунт Viber/WhatsApp/Telegram не привязан к номеру телефона пациента';
      }
    }

    if (isAvailable) {
      finalStatus = (channel === 'push') ? 'delivered' : 'sent';
      successChannel = channel;
      attemptedLogs.push({
        channel,
        status: finalStatus,
        timestamp: new Date().toISOString(),
        message_text: compiledText
      });
      break; // Successfully sent, terminate failover sequence
    } else {
      attemptedLogs.push({
        channel,
        status: 'failed',
        timestamp: new Date().toISOString(),
        message_text: compiledText,
        error_details: errorDetails
      });
    }
  }

  // 3. Update invitation with delivery results
  const updatedInv: Invitation = {
    ...invitation,
    delivery_logs: attemptedLogs,
  };

  if (successChannel) {
    updatedInv.status = finalStatus;
    updatedInv.status_history = [
      ...invitation.status_history,
      {
        status: finalStatus,
        timestamp: new Date().toISOString(),
        changed_by: req.body.changed_by || 'system_messenger',
        reason: `Успешная доставка по каналу ${successChannel.toUpperCase()}`
      }
    ];
  } else {
    // All channels failed
    updatedInv.status_history = [
      ...invitation.status_history,
      {
        status: invitation.status, // remain at current status
        timestamp: new Date().toISOString(),
        changed_by: req.body.changed_by || 'system_messenger',
        reason: 'Все каналы доставки дали сбой в процессе failover-рассылки'
      }
    ];
  }

  invitations[index] = updatedInv;
  db.invitations = invitations;
  writeDb(db);

  res.json({
    success: successChannel !== null,
    successChannel,
    invitation: updatedInv
  });
});

// 6. Webhook POST /api/webhooks/service_provided - Fact of service provision (Tfoms Integration)
app.post('/api/webhooks/service_provided', (req, res) => {
  const { patient_id, screening_type, service_id } = req.body;
  
  if (!patient_id || !screening_type || !service_id) {
    res.status(400).json({ error: 'Необходимые поля: patient_id, screening_type, service_id' });
    return;
  }
  
  const db = readDb();
  const list: Invitation[] = db.invitations || [];
  
  // Find an active (non-completed, non-cancelled) invitation for this patient & screening type
  const index = list.findIndex(inv => 
    inv.patient_id === patient_id && 
    inv.screening_type === screening_type &&
    inv.status !== 'completed' &&
    inv.status !== 'cancelled'
  );
  
  if (index === -1) {
    res.status(404).json({ 
      error: `Активное приглашение для пациента ${patient_id} по скринингу ${screening_type} не найдено в КМИС` 
    });
    return;
  }
  
  const existing = list[index];
  const updatedInv: Invitation = {
    ...existing,
    status: 'completed',
    linked_service_id: service_id,
    status_history: [
      ...existing.status_history,
      {
        status: 'completed',
        timestamp: new Date().toISOString(),
        changed_by: 'system_webhook',
        reason: `ТФОМС: зарегистрировано оказание услуги с кодом ${service_id}`
      }
    ]
  };
  
  // Update patient last screenings date
  const patients = db.patients || [];
  const patientIndex = patients.findIndex((p: any) => p.id === patient_id);
  if (patientIndex !== -1) {
    patients[patientIndex].lastScreenings = {
      ...patients[patientIndex].lastScreenings,
      [screening_type]: new Date().toISOString().split('T')[0]
    };
    db.patients = patients;
  }
  
  list[index] = updatedInv;
  db.invitations = list;
  writeDb(db);
  
  res.json({
    success: true,
    message: `Приглашение ${existing.id} автоматически закрыто со статусом «Пройден»`,
    invitation: updatedInv
  });
});

// ==========================================
// Analytics, Reporting, and Daily Updates (Stage 7)
// ==========================================

// Helper to calculate age relative to 2026-07-07
function calculateAge(birthDateStr: string): number {
  const birthDate = new Date(birthDateStr);
  const today = new Date('2026-07-07');
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Aggregation Engine
function computeAnalytics(filters?: { startDate?: string; endDate?: string; district?: string; doctor?: string; screeningType?: string }) {
  const db = readDb();
  const invitations: Invitation[] = db.invitations || [];
  const patients: any[] = db.patients || [];
  
  // 1. Determine date range
  const start = filters?.startDate || '2026-01-01';
  const end = filters?.endDate || '2026-12-31';
  
  // 2. Filter invitations
  let filteredInv = invitations.filter(inv => {
    const invDate = inv.created_at.slice(0, 10);
    const matchesDate = invDate >= start && invDate <= end;
    if (!matchesDate) return false;
    
    if (filters?.screeningType && inv.screening_type !== filters.screeningType) return false;
    
    const p = patients.find(pat => pat.id === inv.patient_id);
    if (filters?.district && p?.district !== filters.district) return false;
    if (filters?.doctor && p?.assignedDoctor !== filters.doctor) return false;
    
    return true;
  });
  
  // 3. Filter patients for coverage calculation
  let filteredPatients = patients.filter(p => {
    if (filters?.district && p.district !== filters.district) return false;
    if (filters?.doctor && p.assignedDoctor !== filters.doctor) return false;
    return true;
  });
  
  // 4. Calculate general metrics
  const totalPatients = filteredPatients.length;
  const totalInvitations = filteredInv.length;
  const completedInvitations = filteredInv.filter(i => i.status === 'completed').length;
  const activeInvitations = filteredInv.filter(i => ['created', 'sent', 'delivered', 'read'].includes(i.status)).length;
  const cancelledInvitations = filteredInv.filter(i => i.status === 'cancelled').length;
  
  const conversionRate = totalInvitations ? Math.round((completedInvitations / totalInvitations) * 100) : 0;
  
  // 5. Coverage breakdown
  let totalEligible = 0;
  let totalCovered = 0;
  
  const coverageBreakdown = SCREENING_TYPES.map(type => {
    if (filters?.screeningType && type.id !== filters.screeningType) return null;
    
    let eligibleCount = 0;
    let coveredCount = 0;
    
    filteredPatients.forEach(p => {
      const age = calculateAge(p.birthDate);
      let eligible = false;
      
      if (type.id === 'fluorography') {
        eligible = age >= 18;
      } else if (type.id === 'mammography') {
        eligible = p.gender === 'Ж' && age >= 40 && age <= 75;
      } else if (type.id === 'colonoscopy') {
        eligible = age >= 50 && age <= 75;
      } else if (type.id === 'glucose_cholesterol') {
        eligible = age >= 18 && (['E11', 'I10', 'I11'].some(diag => p.diagnosis.startsWith(diag)) || p.dispensaryGroup !== 'Д1');
      } else if (type.id === 'cytology') {
        eligible = p.gender === 'Ж' && age >= 21 && age <= 65;
      }
      
      if (eligible) {
        eligibleCount++;
        const lastDateStr = p.lastScreenings[type.id];
        if (lastDateStr) {
          const lastDate = new Date(lastDateStr);
          const limitDate = new Date('2026-07-07');
          let daysAllowed = 365;
          if (type.id === 'mammography') daysAllowed = 730;
          if (type.id === 'colonoscopy') daysAllowed = 1825;
          if (type.id === 'cytology') daysAllowed = 1095;
          
          const diffTime = Math.abs(limitDate.getTime() - lastDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays <= daysAllowed) {
            coveredCount++;
          }
        }
      }
    });
    
    totalEligible += eligibleCount;
    totalCovered += coveredCount;
    
    return {
      id: type.id,
      name: type.name,
      eligible: eligibleCount,
      covered: coveredCount,
      percentage: eligibleCount ? Math.round((coveredCount / eligibleCount) * 100) : 0
    };
  }).filter(Boolean);
  
  const overallCoverageRate = totalEligible ? Math.round((totalCovered / totalEligible) * 100) : 0;
  
  // 6. Screening Breakdown
  const screeningBreakdown = SCREENING_TYPES.map(type => {
    if (filters?.screeningType && type.id !== filters.screeningType) return null;
    const typeInv = filteredInv.filter(i => i.screening_type === type.id);
    const total = typeInv.length;
    const completed = typeInv.filter(i => i.status === 'completed').length;
    return {
      id: type.id,
      name: type.name,
      total,
      completed,
      conversion: total ? Math.round((completed / total) * 100) : 0
    };
  }).filter(Boolean);
  
  // 7. District Breakdown
  const districts = Array.from(new Set(patients.map(p => p.district).filter(Boolean))) as string[];
  const districtBreakdown = districts.map(dist => {
    // Patients in district
    const dPatients = filteredPatients.filter(p => p.district === dist);
    let dEligible = 0;
    let dCovered = 0;
    
    SCREENING_TYPES.forEach(type => {
      if (filters?.screeningType && type.id !== filters.screeningType) return;
      dPatients.forEach(p => {
        const age = calculateAge(p.birthDate);
        let eligible = false;
        if (type.id === 'fluorography') eligible = age >= 18;
        else if (type.id === 'mammography') eligible = p.gender === 'Ж' && age >= 40 && age <= 75;
        else if (type.id === 'colonoscopy') eligible = age >= 50 && age <= 75;
        else if (type.id === 'glucose_cholesterol') eligible = age >= 18 && (['E11', 'I10', 'I11'].some(diag => p.diagnosis.startsWith(diag)) || p.dispensaryGroup !== 'Д1');
        else if (type.id === 'cytology') eligible = p.gender === 'Ж' && age >= 21 && age <= 65;
        
        if (eligible) {
          dEligible++;
          const lastDateStr = p.lastScreenings[type.id];
          if (lastDateStr) {
            const lastDate = new Date(lastDateStr);
            const limitDate = new Date('2026-07-07');
            let daysAllowed = 365;
            if (type.id === 'mammography') daysAllowed = 730;
            if (type.id === 'colonoscopy') daysAllowed = 1825;
            if (type.id === 'cytology') daysAllowed = 1095;
            
            const diffTime = Math.abs(limitDate.getTime() - lastDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays <= daysAllowed) {
              dCovered++;
            }
          }
        }
      });
    });
    
    const dInv = filteredInv.filter(inv => {
      const p = patients.find(pat => pat.id === inv.patient_id);
      return p?.district === dist;
    });
    const dTotal = dInv.length;
    const dCompleted = dInv.filter(i => i.status === 'completed').length;
    
    return {
      name: dist,
      total: dTotal,
      completed: dCompleted,
      conversion: dTotal ? Math.round((dCompleted / dTotal) * 100) : 0,
      eligible: dEligible,
      covered: dCovered,
      coverage: dEligible ? Math.round((dCovered / dEligible) * 100) : 0
    };
  });
  
  // 8. Doctor Breakdown
  const doctors = Array.from(new Set(patients.map(p => p.assignedDoctor).filter(Boolean))) as string[];
  const doctorBreakdown = doctors.map(doc => {
    const docPatients = filteredPatients.filter(p => p.assignedDoctor === doc);
    let docEligible = 0;
    let docCovered = 0;
    
    SCREENING_TYPES.forEach(type => {
      if (filters?.screeningType && type.id !== filters.screeningType) return;
      docPatients.forEach(p => {
        const age = calculateAge(p.birthDate);
        let eligible = false;
        if (type.id === 'fluorography') eligible = age >= 18;
        else if (type.id === 'mammography') eligible = p.gender === 'Ж' && age >= 40 && age <= 75;
        else if (type.id === 'colonoscopy') eligible = age >= 50 && age <= 75;
        else if (type.id === 'glucose_cholesterol') eligible = age >= 18 && (['E11', 'I10', 'I11'].some(diag => p.diagnosis.startsWith(diag)) || p.dispensaryGroup !== 'Д1');
        else if (type.id === 'cytology') eligible = p.gender === 'Ж' && age >= 21 && age <= 65;
        
        if (eligible) {
          docEligible++;
          const lastDateStr = p.lastScreenings[type.id];
          if (lastDateStr) {
            const lastDate = new Date(lastDateStr);
            const limitDate = new Date('2026-07-07');
            let daysAllowed = 365;
            if (type.id === 'mammography') daysAllowed = 730;
            if (type.id === 'colonoscopy') daysAllowed = 1825;
            if (type.id === 'cytology') daysAllowed = 1095;
            
            const diffTime = Math.abs(limitDate.getTime() - lastDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays <= daysAllowed) {
              docCovered++;
            }
          }
        }
      });
    });
    
    const docInv = filteredInv.filter(inv => {
      const p = patients.find(pat => pat.id === inv.patient_id);
      return p?.assignedDoctor === doc;
    });
    const docTotal = docInv.length;
    const docCompleted = docInv.filter(i => i.status === 'completed').length;
    
    return {
      name: doc,
      total: docTotal,
      completed: docCompleted,
      conversion: docTotal ? Math.round((docCompleted / docTotal) * 100) : 0,
      eligible: docEligible,
      covered: docCovered,
      coverage: docEligible ? Math.round((docCovered / docEligible) * 100) : 0
    };
  });
  
  // 9. Period Breakdown (daily counts)
  const periodMap: Record<string, { created: number; completed: number }> = {};
  filteredInv.forEach(inv => {
    const cDate = inv.created_at.slice(0, 10);
    if (!periodMap[cDate]) periodMap[cDate] = { created: 0, completed: 0 };
    periodMap[cDate].created++;
    
    const completedHistory = inv.status_history.find(h => h.status === 'completed');
    if (completedHistory) {
      const compDate = completedHistory.timestamp.slice(0, 10);
      if (compDate >= start && compDate <= end) {
        if (!periodMap[compDate]) periodMap[compDate] = { created: 0, completed: 0 };
        periodMap[compDate].completed++;
      }
    }
  });
  
  const periodBreakdown = Object.entries(periodMap)
    .map(([date, counts]) => ({
      period: date,
      created: counts.created,
      completed: counts.completed
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
    
  return {
    metrics: {
      totalPatients,
      totalInvitations,
      completedInvitations,
      activeInvitations,
      cancelledInvitations,
      coverageRate: overallCoverageRate,
      conversionRate
    },
    coverageBreakdown,
    screeningBreakdown,
    districtBreakdown,
    doctorBreakdown,
    periodBreakdown
  };
}

// Memory caching for metrics updated once a day (simulated daily cron / on demand refresh)
let lastCacheUpdate = new Date().toISOString();
let cachedStandardMetrics: any = null;

// Cron simulator (runs every 60 seconds to simulate checking for the daily interval or can be manually triggered)
setInterval(() => {
  const now = new Date();
  // Daily check (e.g. if we want to print or reset something at midnight, or just log daily cron health)
  console.log(`[Scheduler Daemon - ${now.toLocaleTimeString()}] Running automated daily jobs: Metrics check & criteria audit (cron: 0 0 * * *). Cache is healthy.`);
}, 60000);

// API GET /api/analytics
app.get('/api/analytics', (req, res) => {
  const { startDate, endDate, district, doctor, screeningType, forceRefresh } = req.query;
  
  const isCustom = startDate || endDate || district || doctor || screeningType;
  
  if (forceRefresh === 'true' || !cachedStandardMetrics) {
    lastCacheUpdate = new Date().toISOString();
    cachedStandardMetrics = computeAnalytics();
  }
  
  let result;
  if (isCustom) {
    result = computeAnalytics({
      startDate: startDate as string,
      endDate: endDate as string,
      district: district as string,
      doctor: doctor as string,
      screeningType: screeningType as string
    });
  } else {
    result = cachedStandardMetrics;
  }
  
  res.json({
    cacheInfo: {
      lastUpdated: lastCacheUpdate,
      nextScheduled: new Date(new Date(lastCacheUpdate).getTime() + 24 * 60 * 60 * 1000).toISOString(),
      isFromCache: !isCustom && forceRefresh !== 'true'
    },
    ...result
  });
});

// API GET /api/analytics/export
app.get('/api/analytics/export', (req, res) => {
  const { startDate, endDate, district, doctor, screeningType } = req.query;
  
  const analytics = computeAnalytics({
    startDate: startDate as string,
    endDate: endDate as string,
    district: district as string,
    doctor: doctor as string,
    screeningType: screeningType as string
  });
  
  // Create beautiful CSV file
  let csv = '\uFEFF'; // UTF-8 BOM
  csv += 'ОТЧЕТ ПО ЭФФЕКТИВНОСТИ И ОХВАТУ ДИСПАНСЕРИЗАЦИИ\n';
  csv += `Период: ${startDate || '01.01.2026'} - ${endDate || '31.12.2026'}\n`;
  csv += `Фильтры: Участок [${district || 'Все'}], Врач [${doctor || 'Все'}], Скрининг [${screeningType || 'Все'}]\n`;
  csv += `Дата выгрузки: ${new Date().toLocaleString('ru-RU')}\n\n`;
  
  csv += 'ОСНОВНЫЕ ПОКАЗАТЕЛИ\n';
  csv += 'Показатель,Значение\n';
  csv += `Пациентов прикреплено,${analytics.metrics.totalPatients}\n`;
  csv += `Выписано направлений,${analytics.metrics.totalInvitations}\n`;
  csv += `Пройдено скринингов (Явка),${analytics.metrics.completedInvitations}\n`;
  csv += `Активных направлений,${analytics.metrics.activeInvitations}\n`;
  csv += `Отменено/Отказов,${analytics.metrics.cancelledInvitations}\n`;
  csv += `Средний охват целевой группы (%),${analytics.metrics.coverageRate}%\n`;
  csv += `Конверсия приглашение в явку (%),${analytics.metrics.conversionRate}%\n\n`;
  
  csv += 'ОХВАТ ЦЕЛЕВОЙ ГРУППЫ ПО СКРИНИНГАМ\n';
  csv += 'Вид скрининга,Целевая группа (чел),Обследовано (чел),Процент охвата (%)\n';
  analytics.coverageBreakdown.forEach((cb: any) => {
    if (cb) {
      csv += `"${cb.name}",${cb.eligible},${cb.covered},${cb.percentage}%\n`;
    }
  });
  csv += '\n';
  
  csv += 'КОНВЕРСИЯ НАПРАВЛЕНИЙ ПО СКРИНИНГАМ\n';
  csv += 'Вид скрининга,Выписано направлений,Пройдено,Конверсия (%)\n';
  analytics.screeningBreakdown.forEach((sb: any) => {
    if (sb) {
      csv += `"${sb.name}",${sb.total},${sb.completed},${sb.conversion}%\n`;
    }
  });
  csv += '\n';
  
  csv += 'ЭФФЕКТИВНОСТЬ ПО ТЕРАПЕВТИЧЕСКИМ УЧАСТКАМ\n';
  csv += 'Участок,Направлений всего,Пройдено,Конверсия (%),Целевая группа (чел),Обследовано (чел),Охват (%)\n';
  analytics.districtBreakdown.forEach((db: any) => {
    csv += `"${db.name}",${db.total},${db.completed},${db.conversion}%,${db.eligible},${db.covered},${db.coverage}%\n`;
  });
  csv += '\n';
  
  csv += 'ЭФФЕКТИВНОСТЬ ПО УЧАСТКОВЫМ ВРАЧАМ\n';
  csv += 'Участковый врач,Направлений всего,Пройдено,Конверсия (%),Целевая группа (чел),Обследовано (чел),Охват (%)\n';
  analytics.doctorBreakdown.forEach((db: any) => {
    csv += `"${db.name}",${db.total},${db.completed},${db.conversion}%,${db.eligible},${db.covered},${db.coverage}%\n`;
  });
  csv += '\n';
  
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="analytics_report_${startDate || 'all'}_${endDate || 'all'}.csv"`);
  res.send(csv);
});

// ==========================================
// Vite Dev Server & Static Assets
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
