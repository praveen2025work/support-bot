export interface UserInfo {
  samAccountName: string;
  displayName: string;
  emailAddress: string;
  employeeId: string;
  givenName: string;
  surname: string;
  userName: string;
  department?: string;
  location?: string;
  role?: string;
}
