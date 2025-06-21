export interface StaffMember {
  firstName: string;     // max length 2000
  lastName: string;      // max length 2000
  email: string;         // max length 2000
  role: string;
  accessAll: boolean;    // toggle for full access
  isActive: boolean;     // default to true for new staff
}

export interface BusinessTypeSelection {
  operationType: 'solo' | 'with_staff';
}

export const defaultStaffMember: StaffMember = {
  firstName: '',
  lastName: '',
  email: '',
  role: '',
  accessAll: false,
  isActive: true
}; 