export type InvitationStatus = 'created' | 'sent' | 'delivered' | 'read' | 'completed' | 'not_completed' | 'cancelled';

export interface StatusHistoryItem {
  status: InvitationStatus;
  timestamp: string;
  changed_by: string;
  reason?: string;
}

export type DeliveryChannel = 'sms' | 'push' | 'messenger';

export interface DeliveryLogItem {
  channel: DeliveryChannel;
  status: 'sent' | 'delivered' | 'failed';
  timestamp: string;
  message_text: string;
  error_details?: string;
}

export interface PatientQuestionnaire {
  smoker: 'yes' | 'no';
  alcohol: 'never' | 'occasionally' | 'often';
  chronicDiseases: string;
  hasComplaints: 'yes' | 'no';
  complaintsDetails?: string;
  agreedToScreening: boolean;
}

export interface Invitation {
  id: string;
  patient_id: string;
  screening_type: string;
  status: InvitationStatus;
  status_history: StatusHistoryItem[];
  channels: DeliveryChannel[];
  created_by: string;
  created_at: string;
  due_date: string;
  cancel_or_reschedule_reason: string | null;
  linked_service_id: string | null;
  delivery_logs?: DeliveryLogItem[];
  patient_answers?: PatientQuestionnaire;
  appointment_date?: string;
  appointment_time?: string;
  registered_at?: string;
}

export interface Patient {
  id: string;
  fullName: string;
  gender: 'М' | 'Ж';
  birthDate: string; // YYYY-MM-DD
  diagnosis: string; // ICD code, e.g. "I10", "E11", "K25"
  dispensaryGroup: 'Д1' | 'Д2' | 'Д3'; // D-group
  lastScreenings: { [key: string]: string }; // screening_type -> date (YYYY-MM-DD)
  phone: string;
  district?: string;
  assignedDoctor?: string;
}

export interface ScreeningCriteria {
  screening_type: string;
  age_min: number;
  age_max: number;
  diagnosis_pattern: string; // ICD codes, or "Любой"
  dispensary_group: string;
  days_since_last_screening: number;
  schedule: 'daily' | 'weekly';
}

export interface MessageTemplate {
  channel: DeliveryChannel;
  text_with_placeholders: string;
}

export interface ScreeningType {
  id: string;
  name: string;
  description: string;
  department: string;
}

export type KMISRole = 'doctor' | 'operator' | 'coordinator' | 'admin' | 'director';

export interface KMISUser {
  id: string;
  name: string;
  role: KMISRole;
  roleName: string;
}
