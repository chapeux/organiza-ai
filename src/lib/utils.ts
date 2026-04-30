import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatInTimeZone } from "date-fns-tz"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatToBrazilDate(date: Date | string, formatStr: string = "dd/MM/yyyy") {
  // Fix: explicitly handle the string-as-UTC to avoid local timezone shift
  const dateObj = typeof date === 'string' ? new Date(date.replace('Z', '')) : date;
  return formatInTimeZone(dateObj, "America/Sao_Paulo", formatStr, { locale: ptBR })
}

export function parseDateString(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  // Handle ISO format YYYY-MM-DDTHH:mm:... or just YYYY-MM-DD
  const datePart = dateStr.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  // Construct Date at noon to avoid timezone border issues
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function addMonthsToDateString(dateStr: string, months: number): string {
  const date = parseDateString(dateStr) || new Date();
  date.setMonth(date.getMonth() + months);
  return format(date, "yyyy-MM-dd");
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const date = parseDateString(dateStr) || new Date();
  date.setDate(date.getDate() + days);
  return format(date, "yyyy-MM-dd");
}
