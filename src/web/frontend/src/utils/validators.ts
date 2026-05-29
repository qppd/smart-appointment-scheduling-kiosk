export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateContactNumber(num: string): boolean {
  return /^09\d{9}$/.test(num) || /^\+639\d{9}$/.test(num) || /^[0-9]{7,15}$/.test(num);
}

export function validatePassword(pw: string): string | null {
  if (pw.length < 6) return 'Password must be at least 6 characters';
  return null;
}
