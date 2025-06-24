// Enums
export enum DayOfWeekEnum {
  Sunday = 0,
  Monday,
  Tuesday,
  Wednesday,
  Thursday,
  Friday,
  Saturday
}

export enum ScheduleCycleType {
  Weekly = 0,
  BiWeekly,
  Monthly,
  Custom
}

export enum DayAvailabilityStatus {
  Open24Hours = 0,
  Unavailable,
  SpecificHours
}

export enum ExceptionType {
  Holiday = 0,
  SpecialEvent,
  Maintenance,
  Weather,
  StaffShortage,
  Custom
}

export enum RecurrencePattern {
  None = 0,
  Daily,
  Weekly,
  Monthly,
  Yearly,
  Custom
}

// Interfaces
export interface OpeningPeriod {
  id?: number;
  businessId: string;
  cycleId: number;
  day: DayOfWeekEnum;
  openingTime: string; // "HH:mm:ss"
  closingTime: string; // "HH:mm:ss"
  exceptionBusinessId?: string;
  exceptionDate?: string; // ISO date string
}

export interface DaySchedule {
  businessId: string;
  cycleId: number;
  day: DayOfWeekEnum;
  availabilityStatus: DayAvailabilityStatus;
  openingPeriods: OpeningPeriod[];
}

export interface ScheduleCycle {
  businessId: string;
  cycleId: number;
  startDate: string; // ISO date string
  endDate: string;   // ISO date string
  days: DaySchedule[];
  isActive: boolean;
}

export interface ScheduleException {
  businessId: string;
  exceptionDate: string; // ISO date string
  endDate?: string; // ISO date string, optional
  reason: string;
  exceptionType: ExceptionType;
  availabilityStatus: DayAvailabilityStatus;
  specialHours: OpeningPeriod[];
  isClosed: boolean;
  timeZone?: string;
  recurrencePattern: RecurrencePattern;
  recurrenceInterval?: number;
  recurrenceRule?: string;
  isActive: boolean;
  notes?: string;
}

export interface BusinessSchedule {
  businessId: string;
  cycleType: ScheduleCycleType;
  cycleLengthInDays: number;
  cycleStartDate: string; // ISO date string
  cycles: ScheduleCycle[];
  exceptions: ScheduleException[];
}