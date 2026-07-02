export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole =
  | "super_admin"
  | "college_admin"
  | "organizer"
  | "scanner"
  | "student";
export type EventStatus = "draft" | "published" | "cancelled" | "completed";
export type EventCategory =
  | "technical"
  | "cultural"
  | "sports"
  | "workshop"
  | "placement"
  | "pharmacy"
  | "seminar"
  | "other";
export type RegistrationStatus =
  | "pending_payment"
  | "confirmed"
  | "cancelled"
  | "refunded";
export type PaymentStatus =
  | "created"
  | "pending"
  | "success"
  | "failed"
  | "refunded";
export type TicketStatus = "active" | "used" | "cancelled";

export interface College {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  tagline: string | null;
  header_media_url: string | null;
  header_media_type: string | null;
  footer_media_url: string | null;
  footer_media_type: string | null;
  og_image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  college_id: string | null;
  department: string | null;
  prn: string | null;
  year_of_study: number | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  college_id: string | null;
  granted_by: string | null;
  created_at: string;
}

export interface Student {
  id: string;
  college_id: string;
  prn: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  year_of_study: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  college_id: string;
  slug: string;
  title: string;
  description: string | null;
  short_description: string | null;
  category: EventCategory;
  banner_url: string | null;
  gallery: Json;
  venue: string | null;
  start_at: string;
  end_at: string;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  capacity: number | null;
  price_inr: number;
  is_paid: boolean;
  organizer_name: string | null;
  organizer_contact: string | null;
  organizer_user_id: string | null;
  speakers: Json;
  sponsors: Json;
  custom_fields: Json;
  tags: string[];
  status: EventStatus;
  featured: boolean;
  trending_score: number;
  qr_required: boolean | null;
  certificate_required: boolean | null;
  volunteer_required: boolean | null;
  google_form_url: string | null;
  rules: string | null;
  what_to_bring: string | null;
  dress_code: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Registration {
  id: string;
  event_id: string;
  user_id: string;
  student_id: string | null;
  prn: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  custom_responses: Json;
  status: RegistrationStatus;
  amount_paid: number;
  payment_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  events?: Partial<Event>;
}

export interface Ticket {
  id: string;
  registration_id: string;
  event_id: string;
  user_id: string;
  ticket_code: string;
  qr_token: string;
  status: TicketStatus;
  issued_at: string;
  checked_in_at: string | null;
  checked_in_by: string | null;
  created_at: string;
  // Joined
  events?: Partial<Event>;
  registrations?: Partial<Registration>;
}

export interface Payment {
  id: string;
  registration_id: string | null;
  event_id: string | null;
  user_id: string;
  college_id: string | null;
  provider_code: string | null;
  provider_order_id: string | null;
  provider_payment_id: string | null;
  provider_signature: string | null;
  amount_inr: number;
  currency: string;
  status: PaymentStatus;
  raw_response: Json;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  events?: Partial<Event>;
}

export interface Certificate {
  id: string;
  event_id: string;
  user_id: string;
  registration_id: string | null;
  certificate_code: string;
  verification_token: string;
  full_name: string;
  event_title: string;
  issued_at: string;
  pdf_url: string | null;
  // Joined
  events?: Partial<Event>;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface Attendance {
  id: string;
  ticket_id: string;
  event_id: string;
  user_id: string;
  scanned_by: string | null;
  scan_method: string | null;
  scanned_at: string;
  device_info: string | null;
}
