import { Patient, ScreeningType, ScreeningCriteria, MessageTemplate, Invitation, KMISUser } from './types';

export const USERS: KMISUser[] = [
  { id: 'u1', name: 'Д-р Федоров А.В.', role: 'doctor', roleName: 'Врач' },
  { id: 'u2', name: 'Сестра Климова И.С.', role: 'doctor', roleName: 'Медсестра' },
  { id: 'u3', name: 'Королева О.Н. (Колл)', role: 'operator', roleName: 'Оператор колл-центра' },
  { id: 'u4', name: 'Мартынов С.П. (Коорд)', role: 'coordinator', roleName: 'Координатор скринингов' },
  { id: 'u5', name: 'Системный Администратор', role: 'admin', roleName: 'Администратор' },
  { id: 'u6', name: 'Васильев К.Д. (Главврач)', role: 'director', roleName: 'Руководитель' },
];

export const SCREENING_TYPES: ScreeningType[] = [
  {
    id: 'fluorography',
    name: 'Флюорография легких',
    description: 'Профилактическое обследование легких на туберкулез и новообразования. Рекомендуется ежегодно.',
    department: 'Отделение лучевой диагностики',
  },
  {
    id: 'mammography',
    name: 'Маммография молочных желез',
    description: 'Скрининг рака молочной железы для женщин старше 40 лет. Проводится раз в 2 года.',
    department: 'Рентген-кабинет',
  },
  {
    id: 'colonoscopy',
    name: 'Скрининговая колоноскопия',
    description: 'Выявление полипов и колоректального рака. Рекомендуется гражданам старше 50 лет раз в 5 лет.',
    department: 'Эндоскопическое отделение',
  },
  {
    id: 'glucose_cholesterol',
    name: 'Глюкоза и холестерин крови',
    description: 'Раннее выявление сахарного диабета и сердечно-сосудистых рисков. Рекомендуется ежегодно.',
    department: 'Клинико-диагностическая лаборатория',
  },
  {
    id: 'cytology',
    name: 'Жидкостная онкоцитология',
    description: 'Цитологический скрининг шейки матки для женщин от 21 до 65 лет. Раз в 3 года.',
    department: 'Кабинет гинеколога',
  },
];

export const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'p1',
    fullName: 'Иванов Иван Сергеевич',
    gender: 'М',
    birthDate: '1981-05-14', // 45 лет в 2026
    diagnosis: 'I11.9', // Гипертоническая болезнь
    dispensaryGroup: 'Д2',
    phone: '+7 (911) 123-45-67',
    lastScreenings: {
      fluorography: '2025-02-10', // 513 дней назад
      glucose_cholesterol: '2025-11-20',
    },
    district: 'Участок №1',
    assignedDoctor: 'Д-р Федоров А.В.',
  },
  {
    id: 'p2',
    fullName: 'Петрова Анна Васильевна',
    gender: 'Ж',
    birthDate: '1974-11-03', // 51 год в 2026
    diagnosis: 'E11.9', // Сахарный диабет 2 типа
    dispensaryGroup: 'Д3',
    phone: '+7 (921) 987-65-43',
    lastScreenings: {
      mammography: '2024-04-15', // 813 дней назад (пора!)
      fluorography: '2025-08-01',
      cytology: '2023-10-12', // пора
    },
    district: 'Участок №1',
    assignedDoctor: 'Д-р Федоров А.В.',
  },
  {
    id: 'p3',
    fullName: 'Сидоров Алексей Петрович',
    gender: 'М',
    birthDate: '1965-08-22', // 60 лет в 2026
    diagnosis: 'K29.5', // Хронический гастрит
    dispensaryGroup: 'Д1',
    phone: '+7 (905) 555-12-34',
    lastScreenings: {
      colonoscopy: '2020-03-12', // 6 лет назад (пора!)
      fluorography: '2025-12-05',
    },
    district: 'Участок №2',
    assignedDoctor: 'Д-р Смирнова Е.Н.',
  },
  {
    id: 'p4',
    fullName: 'Кузнецова Мария Дмитриевна',
    gender: 'Ж',
    birthDate: '1991-03-25', // 35 лет
    diagnosis: 'Z00.0', // Здоров
    dispensaryGroup: 'Д1',
    phone: '+7 (999) 777-88-99',
    lastScreenings: {
      cytology: '2022-05-18', // 4 года назад (пора!)
      fluorography: '2026-01-10',
    },
    district: 'Участок №2',
    assignedDoctor: 'Д-р Смирнова Е.Н.',
  },
  {
    id: 'p5',
    fullName: 'Смирнов Дмитрий Александрович',
    gender: 'М',
    birthDate: '1998-12-10', // 27 лет
    diagnosis: 'I10', // Эссенциальная гипертензия
    dispensaryGroup: 'Д2',
    phone: '+7 (916) 444-55-66',
    lastScreenings: {
      glucose_cholesterol: '2025-03-15', // 479 дней назад (пора!)
    },
    district: 'Участок №3',
    assignedDoctor: 'Д-р Иванов К.П.',
  },
  {
    id: 'p6',
    fullName: 'Соколова Елена Игоревна',
    gender: 'Ж',
    birthDate: '1978-02-18', // 48 лет
    diagnosis: 'E11.9',
    dispensaryGroup: 'Д3',
    phone: '+7 (903) 111-22-33',
    lastScreenings: {
      mammography: '2026-05-10', // Недавно проходила, не нужно
      fluorography: '2026-02-15',
    },
    district: 'Участок №3',
    assignedDoctor: 'Д-р Иванов К.П.',
  },
  {
    id: 'p7',
    fullName: 'Попова Ольга Николаевна',
    gender: 'Ж',
    birthDate: '1961-07-07', // ровно 65 лет в 2026-07-07!
    diagnosis: 'I11.0', // Гипертония с сердечной недостаточностью
    dispensaryGroup: 'Д3',
    phone: '+7 (909) 333-44-55',
    lastScreenings: {
      fluorography: '2024-11-12', // 602 дня назад
      glucose_cholesterol: '2024-12-01',
    },
    district: 'Участок №1',
    assignedDoctor: 'Д-р Федоров А.В.',
  },
  {
    id: 'p8',
    fullName: 'Васильев Сергей Павлович',
    gender: 'М',
    birthDate: '1976-09-30', // 49 лет
    diagnosis: 'K25.4', // Язва желудка
    dispensaryGroup: 'Д2',
    phone: '+7 (985) 222-33-44',
    lastScreenings: {
      fluorography: '2025-04-10',
      glucose_cholesterol: '2025-02-15',
    },
    district: 'Участок №2',
    assignedDoctor: 'Д-р Смирнова Е.Н.',
  },
];

export const INITIAL_CRITERIA: ScreeningCriteria[] = [
  {
    screening_type: 'fluorography',
    age_min: 18,
    age_max: 99,
    diagnosis_pattern: 'Любой',
    dispensary_group: 'Любая',
    days_since_last_screening: 365,
    schedule: 'daily',
  },
  {
    screening_type: 'mammography',
    age_min: 40,
    age_max: 75,
    diagnosis_pattern: 'Любой',
    dispensary_group: 'Любая',
    days_since_last_screening: 730,
    schedule: 'weekly',
  },
  {
    screening_type: 'colonoscopy',
    age_min: 50,
    age_max: 75,
    diagnosis_pattern: 'K25|K29', // с заболеваниями ЖКТ в анамнезе или возрастных
    dispensary_group: 'Любая',
    days_since_last_screening: 1825, // 5 лет
    schedule: 'weekly',
  },
  {
    screening_type: 'glucose_cholesterol',
    age_min: 18,
    age_max: 99,
    diagnosis_pattern: 'E11|I10|I11', // диабет, гипертония
    dispensary_group: 'Д2|Д3',
    days_since_last_screening: 365,
    schedule: 'daily',
  },
  {
    screening_type: 'cytology',
    age_min: 21,
    age_max: 65,
    diagnosis_pattern: 'Любой',
    dispensary_group: 'Любая',
    days_since_last_screening: 1095, // 3 года
    schedule: 'weekly',
  },
];

export const INITIAL_TEMPLATES: MessageTemplate[] = [
  {
    channel: 'sms',
    text_with_placeholders: 'Уважаемый(ая) {ФИО}! Вам необходимо пройти скрининг ({скрининг}). Ждем Вас в {кабинет} по адресу: {адрес}. Справки по тел. 8-800-100-20-30.',
  },
  {
    channel: 'push',
    text_with_placeholders: '🔔 Время позаботиться о здоровье! {ФИО}, вам назначен плановый скрининг: {скрининг}. Просим записаться в {кабинет}.',
  },
  {
    channel: 'messenger',
    text_with_placeholders: 'Здравствуйте, {ФИО}! 🏥 КМИС напоминает о важности регулярного обследования. Для Вас подготовлен плановый скрининг: "{скрининг}". Срок прохождения до {дата}. Вы можете пройти процедуру в {кабинет}, расположенном по адресу: {адрес}. Ответьте на это сообщение для записи.',
  },
];

export const INITIAL_INVITATIONS: Invitation[] = [
  {
    id: 'inv-1',
    patient_id: 'p1',
    screening_type: 'fluorography',
    status: 'completed',
    channels: ['sms'],
    created_by: 'system',
    created_at: '2026-06-10T10:00:00Z',
    due_date: '2026-07-10',
    cancel_or_reschedule_reason: null,
    linked_service_id: 'srv-9921',
    status_history: [
      { status: 'created', timestamp: '2026-06-10T10:00:00Z', changed_by: 'system' },
      { status: 'sent', timestamp: '2026-06-10T10:05:00Z', changed_by: 'system' },
      { status: 'delivered', timestamp: '2026-06-10T10:07:00Z', changed_by: 'system' },
      { status: 'read', timestamp: '2026-06-11T12:30:00Z', changed_by: 'system' },
      { status: 'completed', timestamp: '2026-06-15T09:15:00Z', changed_by: 'u1', reason: 'Скрининг успешно пройден, услуга №srv-9921 зарегистрирована' },
    ],
  },
  {
    id: 'inv-2',
    patient_id: 'p2',
    screening_type: 'mammography',
    status: 'delivered',
    channels: ['messenger', 'sms'],
    created_by: 'u4',
    created_at: '2026-07-01T11:20:00Z',
    due_date: '2026-08-01',
    cancel_or_reschedule_reason: null,
    linked_service_id: null,
    status_history: [
      { status: 'created', timestamp: '2026-07-01T11:20:00Z', changed_by: 'u4' },
      { status: 'sent', timestamp: '2026-07-01T11:22:00Z', changed_by: 'system' },
      { status: 'delivered', timestamp: '2026-07-01T11:25:00Z', changed_by: 'system' },
    ],
  },
  {
    id: 'inv-3',
    patient_id: 'p3',
    screening_type: 'colonoscopy',
    status: 'cancelled',
    channels: ['sms'],
    created_by: 'u1',
    created_at: '2026-07-02T14:00:00Z',
    due_date: '2026-08-02',
    cancel_or_reschedule_reason: 'Отказ пациента по религиозным соображениям',
    linked_service_id: null,
    status_history: [
      { status: 'created', timestamp: '2026-07-02T14:00:00Z', changed_by: 'u1' },
      { status: 'sent', timestamp: '2026-07-02T14:05:00Z', changed_by: 'system' },
      { status: 'delivered', timestamp: '2026-07-02T14:07:00Z', changed_by: 'system' },
      { status: 'read', timestamp: '2026-07-02T15:10:00Z', changed_by: 'system' },
      { status: 'cancelled', timestamp: '2026-07-03T11:00:00Z', changed_by: 'u3', reason: 'Отказ пациента по религиозным соображениям' },
    ],
  },
  {
    id: 'inv-4',
    patient_id: 'p5',
    screening_type: 'glucose_cholesterol',
    status: 'created',
    channels: ['push'],
    created_by: 'system',
    created_at: '2026-07-06T09:00:00Z',
    due_date: '2026-08-06',
    cancel_or_reschedule_reason: null,
    linked_service_id: null,
    status_history: [
      { status: 'created', timestamp: '2026-07-06T09:00:00Z', changed_by: 'system' },
    ],
  },
];
