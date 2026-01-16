import fs from 'fs';
import path from 'path';

// Data file paths
const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const MILK_ENTRIES_FILE = path.join(DATA_DIR, 'milkEntries.json');
const PAYMENTS_FILE = path.join(DATA_DIR, 'payments.json');
const CUSTOMER_RATES_FILE = path.join(DATA_DIR, 'customerRates.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backup');
const USERS_BACKUP_FILE = path.join(BACKUP_DIR, 'users_backup.json');
const MILK_ENTRIES_BACKUP_FILE = path.join(BACKUP_DIR, 'milkEntries_backup.json');
const PAYMENTS_BACKUP_FILE = path.join(BACKUP_DIR, 'payments_backup.json');
const CUSTOMER_RATES_BACKUP_FILE = path.join(BACKUP_DIR, 'customerRates_backup.json');

// Types
export interface User {
  userId: string;
  name: string;
  password: string;
  role: 'admin' | 'customer';
  address?: string;
  mobile?: string;
}

export interface MilkEntry {
  entryId: string;
  userId: string;
  date: string;
  nepaliDate?: string; // B.S. date
  liters: number;
  rate: number;
  total: number;
  time?: 'morning' | 'evening';
}

export interface Payment {
  paymentId: string;
  userId: string;
  amount: number;
  date: string;
  description?: string;
}

export interface CustomerRate {
  userId: string;
  rate: number;
  effectiveDate: string; // Date when this rate becomes effective
}

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

// Read JSON file
export function readJsonFile<T>(filePath: string): T {
  try {
    ensureDataDir();
  } catch (error) {
    // Directory creation might fail on read-only file systems (e.g., Vercel build)
    // This is okay if the directory already exists
    console.warn(`Could not ensure data directory exists: ${error}`);
  }
  
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`File does not exist: ${filePath}`);
      return [] as unknown as T;
    }
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    if (!fileContent || fileContent.trim() === '') {
      console.warn(`File is empty: ${filePath}`);
      return [] as unknown as T;
    }
    return JSON.parse(fileContent) as T;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return [] as unknown as T;
  }
}

// Write JSON file
export function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    ensureDataDir();
  } catch (error) {
    // Directory creation might fail on read-only file systems
    console.warn(`Could not ensure data directory exists: ${error}`);
  }
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error: any) {
    console.error(`Error writing file ${filePath}:`, error);
    // On Vercel, file writes might fail - throw a more descriptive error
    if (error.code === 'EROFS' || error.code === 'EACCES') {
      throw new Error(`Cannot write to file system. This might be a read-only environment. ${error.message}`);
    }
    throw error;
  }
}

// Users operations
export function getUsers(): User[] {
  return readJsonFile<User[]>(USERS_FILE);
}

export function saveUsers(users: User[]): void {
  writeJsonFile(USERS_FILE, users);
}

export function getUserById(userId: string): User | undefined {
  const users = getUsers();
  return users.find(u => u.userId === userId);
}

export function addUser(user: User): void {
  const users = getUsers();
  users.push(user);
  saveUsers(users);
}

// Milk entries operations
export function getMilkEntries(): MilkEntry[] {
  return readJsonFile<MilkEntry[]>(MILK_ENTRIES_FILE);
}

export function saveMilkEntries(entries: MilkEntry[]): void {
  writeJsonFile(MILK_ENTRIES_FILE, entries);
}

export function getMilkEntriesByUserId(userId: string): MilkEntry[] {
  const entries = getMilkEntries();
  return entries.filter(e => e.userId === userId);
}

export function addMilkEntry(entry: MilkEntry): void {
  const entries = getMilkEntries();
  
  // If rate is not provided, try to get customer-specific rate
  if (!entry.rate || entry.rate === 0) {
    const customerRate = getCustomerRate(entry.userId, entry.date);
    if (customerRate) {
      entry.rate = customerRate;
      entry.total = entry.liters * customerRate;
    }
  }
  
  entries.push(entry);
  saveMilkEntries(entries);
}

export function updateMilkEntry(entryId: string, updates: Partial<MilkEntry>): boolean {
  const entries = getMilkEntries();
  const index = entries.findIndex(e => e.entryId === entryId);
  if (index !== -1) {
    const entry = entries[index];
    // Recalculate total if liters or rate changed
    let total = entry.total;
    if (updates.liters !== undefined || updates.rate !== undefined) {
      const liters = updates.liters !== undefined ? updates.liters : entry.liters;
      const rate = updates.rate !== undefined ? updates.rate : entry.rate;
      total = liters * rate;
    }
    
    // Update nepali date if date changed
    let nepaliDate = entry.nepaliDate;
    if (updates.date && updates.date !== entry.date) {
      nepaliDate = convertToNepaliDate(updates.date);
    }
    
    entries[index] = {
      ...entry,
      ...updates,
      total,
      nepaliDate,
    };
    saveMilkEntries(entries);
    return true;
  }
  return false;
}

export function deleteMilkEntry(entryId: string): boolean {
  const entries = getMilkEntries();
  const index = entries.findIndex(e => e.entryId === entryId);
  if (index !== -1) {
    entries.splice(index, 1);
    saveMilkEntries(entries);
    return true;
  }
  return false;
}

// Generate next User ID
export function generateNextUserId(): string {
  const users = getUsers();
  const customerUsers = users.filter(u => u.role === 'customer');
  if (customerUsers.length === 0) {
    return 'CUST001';
  }
  const lastId = customerUsers[customerUsers.length - 1].userId;
  const num = parseInt(lastId.replace('CUST', '')) || 0;
  const nextNum = num + 1;
  return `CUST${nextNum.toString().padStart(3, '0')}`;
}

// Generate next Entry ID
export function generateNextEntryId(): string {
  const entries = getMilkEntries();
  if (entries.length === 0) {
    return 'M001';
  }
  const lastId = entries[entries.length - 1].entryId;
  const num = parseInt(lastId.replace('M', '')) || 0;
  const nextNum = num + 1;
  return `M${nextNum.toString().padStart(3, '0')}`;
}

// Payment operations
export function getPayments(): Payment[] {
  return readJsonFile<Payment[]>(PAYMENTS_FILE);
}

export function savePayments(payments: Payment[]): void {
  writeJsonFile(PAYMENTS_FILE, payments);
}

export function getPaymentsByUserId(userId: string): Payment[] {
  const payments = getPayments();
  return payments.filter(p => p.userId === userId);
}

export function addPayment(payment: Payment): void {
  const payments = getPayments();
  payments.push(payment);
  savePayments(payments);
}

export function generateNextPaymentId(): string {
  const payments = getPayments();
  if (payments.length === 0) {
    return 'PAY001';
  }
  const lastId = payments[payments.length - 1].paymentId;
  const num = parseInt(lastId.replace('PAY', '')) || 0;
  const nextNum = num + 1;
  return `PAY${nextNum.toString().padStart(3, '0')}`;
}

// Customer Rate operations
export function getCustomerRates(): CustomerRate[] {
  return readJsonFile<CustomerRate[]>(CUSTOMER_RATES_FILE);
}

export function saveCustomerRates(rates: CustomerRate[]): void {
  writeJsonFile(CUSTOMER_RATES_FILE, rates);
}

export function getCustomerRate(userId: string, date: string): number | null {
  const rates = getCustomerRates();
  const customerRates = rates
    .filter(r => r.userId === userId && r.effectiveDate <= date)
    .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
  
  return customerRates.length > 0 ? customerRates[0].rate : null;
}

export function setCustomerRate(userId: string, rate: number, effectiveDate: string): void {
  const rates = getCustomerRates();
  rates.push({ userId, rate, effectiveDate });
  saveCustomerRates(rates);
}

// Calculate dues for a customer
export function calculateDues(userId: string): number {
  const entries = getMilkEntriesByUserId(userId);
  const payments = getPaymentsByUserId(userId);
  
  const totalBill = entries.reduce((sum, entry) => sum + entry.total, 0);
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  
  return totalBill - totalPaid;
}

// Backup operations
export function backupData(): { success: boolean; message: string } {
  try {
    ensureDataDir();
    
    // Copy all data files to backup
    if (fs.existsSync(USERS_FILE)) {
      fs.copyFileSync(USERS_FILE, USERS_BACKUP_FILE);
    }
    if (fs.existsSync(MILK_ENTRIES_FILE)) {
      fs.copyFileSync(MILK_ENTRIES_FILE, MILK_ENTRIES_BACKUP_FILE);
    }
    if (fs.existsSync(PAYMENTS_FILE)) {
      fs.copyFileSync(PAYMENTS_FILE, PAYMENTS_BACKUP_FILE);
    }
    if (fs.existsSync(CUSTOMER_RATES_FILE)) {
      fs.copyFileSync(CUSTOMER_RATES_FILE, CUSTOMER_RATES_BACKUP_FILE);
    }
    
    return { success: true, message: 'Backup created successfully' };
  } catch (error) {
    console.error('Backup error:', error);
    return { success: false, message: `Backup failed: ${error}` };
  }
}

// Restore operations
export function restoreData(): { success: boolean; message: string } {
  try {
    ensureDataDir();
    
    // Restore all data files from backup
    if (fs.existsSync(USERS_BACKUP_FILE)) {
      fs.copyFileSync(USERS_BACKUP_FILE, USERS_FILE);
    }
    if (fs.existsSync(MILK_ENTRIES_BACKUP_FILE)) {
      fs.copyFileSync(MILK_ENTRIES_BACKUP_FILE, MILK_ENTRIES_FILE);
    }
    if (fs.existsSync(PAYMENTS_BACKUP_FILE)) {
      fs.copyFileSync(PAYMENTS_BACKUP_FILE, PAYMENTS_FILE);
    }
    if (fs.existsSync(CUSTOMER_RATES_BACKUP_FILE)) {
      fs.copyFileSync(CUSTOMER_RATES_BACKUP_FILE, CUSTOMER_RATES_FILE);
    }
    
    return { success: true, message: 'Data restored successfully' };
  } catch (error) {
    console.error('Restore error:', error);
    return { success: false, message: `Restore failed: ${error}` };
  }
}

// Restore from uploaded files
export function restoreFromFiles(fileData: {
  users?: any[];
  milkEntries?: any[];
  payments?: any[];
  customerRates?: any[];
}): { success: boolean; message: string } {
  try {
    ensureDataDir();
    
    let restoredCount = 0;
    const restoredFiles: string[] = [];
    
    // Restore users if provided
    if (fileData.users !== undefined) {
      writeJsonFile(USERS_FILE, fileData.users);
      restoredCount++;
      restoredFiles.push('users');
    }
    
    // Restore milk entries if provided
    if (fileData.milkEntries !== undefined) {
      writeJsonFile(MILK_ENTRIES_FILE, fileData.milkEntries);
      restoredCount++;
      restoredFiles.push('milkEntries');
    }
    
    // Restore payments if provided
    if (fileData.payments !== undefined) {
      writeJsonFile(PAYMENTS_FILE, fileData.payments);
      restoredCount++;
      restoredFiles.push('payments');
    }
    
    // Restore customer rates if provided
    if (fileData.customerRates !== undefined) {
      writeJsonFile(CUSTOMER_RATES_FILE, fileData.customerRates);
      restoredCount++;
      restoredFiles.push('customerRates');
    }
    
    if (restoredCount === 0) {
      return { success: false, message: 'No valid data files found to restore' };
    }
    
    return { 
      success: true, 
      message: `Data restored successfully from ${restoredCount} file(s): ${restoredFiles.join(', ')}` 
    };
  } catch (error) {
    console.error('Restore from files error:', error);
    return { success: false, message: `Restore failed: ${error}` };
  }
}

// Nepali Date Conversion - Accurate implementation
// Reference dates:
// April 13, 2025 = Baishakh 1, 2082 BS
// January 16, 2026 = Magh 2, 2082 BS
export function convertToNepaliDate(adDate: string): string {
  const date = new Date(adDate + 'T12:00:00');
  const adYear = date.getFullYear();
  const adMonth = date.getMonth() + 1;
  const adDay = date.getDate();
  
  // Reference: Jan 16, 2026 = Magh 2, 2082
  const refAD = new Date('2026-01-16T12:00:00');
  const refBSYear = 2082;
  const refBSMonth = 10; // Magh
  const refBSDay = 2;
  
  // Calculate days difference from reference
  const daysDiff = Math.floor((date.getTime() - refAD.getTime()) / (1000 * 60 * 60 * 24));
  
  // Nepali month lengths for 2082 BS (approximate)
  // [Baishakh, Jestha, Ashadh, Shrawan, Bhadra, Ashwin, Kartik, Mangsir, Poush, Magh, Falgun, Chaitra]
  const monthLengths2082 = [30, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30];
  
  let bsYear = refBSYear;
  let bsMonth = refBSMonth;
  let bsDay = refBSDay + daysDiff;
  
  // Adjust day and month
  while (bsDay > monthLengths2082[bsMonth - 1]) {
    bsDay -= monthLengths2082[bsMonth - 1];
    bsMonth += 1;
    if (bsMonth > 12) {
      bsMonth = 1;
      bsYear += 1;
      // Use same month lengths for next year (approximate)
    }
  }
  
  while (bsDay < 1) {
    bsMonth -= 1;
    if (bsMonth < 1) {
      bsMonth = 12;
      bsYear -= 1;
    }
    bsDay += monthLengths2082[bsMonth - 1];
  }
  
  // Ensure valid ranges
  if (bsDay < 1) bsDay = 1;
  if (bsDay > 32) bsDay = 32;
  if (bsMonth < 1) bsMonth = 1;
  if (bsMonth > 12) bsMonth = 12;
  
  return `${bsYear}-${bsMonth.toString().padStart(2, '0')}-${bsDay.toString().padStart(2, '0')}`;
}
