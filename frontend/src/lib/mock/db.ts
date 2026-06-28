/* In-memory mock database — the single source of truth while the real API is
   not yet built. Ported from the Bloom prototype's data.js into typed structures.
   All money is in Moroccan Dirham (DH). Five spending modes, lean → indulgent.

   Feature `api/` modules are the ONLY code that reads or mutates this object;
   everything else goes through those typed async functions. See docs/mock-data.md. */
import type {
  Category,
  ModePlan,
  MonthHistory,
  Person,
  PersonEntry,
  SavingsGoal,
  Transaction,
} from '@/types';

/** A category plus its planned amount per mode. */
export interface SeedCategory extends Category {
  plan: ModePlan;
}

export interface MockDb {
  month: string;
  trackingSince: string;
  monthlyIncome: number;
  categories: SeedCategory[];
  savings: SavingsGoal;
  people: Person[];
  personHistory: Record<string, PersonEntry[]>;
  history: MonthHistory[];
  transactions: Transaction[];
}

export const db: MockDb = {
  month: 'June 2026',
  trackingSince: 'May 2025',
  monthlyIncome: 11800,

  // category: planned amount per mode [Bare, Basics, Comfort, Treat, Feast].
  // Per-category actual spend is derived from `transactions` (their out-sums match).
  categories: [
    { name: 'Rent', icon: 'home', plan: [3200, 3200, 3200, 3200, 3200] },
    { name: 'Groceries', icon: 'cart', plan: [1200, 1500, 1750, 2000, 2600] },
    { name: 'Utilities', icon: 'bolt', plan: [420, 480, 520, 580, 680] },
    { name: 'Phone & net', icon: 'wifi', plan: [200, 250, 250, 300, 360] },
    { name: 'Transport & gas', icon: 'car', plan: [400, 600, 720, 900, 1200] },
    { name: 'Family support', icon: 'heart', plan: [500, 800, 1000, 1200, 1600] },
    { name: 'Eating out', icon: 'fork', plan: [150, 400, 600, 1000, 1800] },
    { name: 'Coffee', icon: 'cup', plan: [80, 150, 220, 340, 520] },
    { name: 'Cigarettes', icon: 'smoke', plan: [200, 300, 340, 400, 460] },
    { name: 'Gym', icon: 'dumbbell', plan: [0, 150, 250, 300, 420] },
    { name: 'Dating', icon: 'spark', plan: [0, 200, 420, 720, 1300] },
    { name: 'Clothes', icon: 'shirt', plan: [120, 260, 420, 720, 1350] },
    { name: 'Subscriptions', icon: 'play', plan: [60, 120, 160, 260, 420] },
    { name: 'Savings', icon: 'piggy', plan: [900, 1100, 1150, 1250, 1500] },
  ],

  savings: { label: 'Emergency fund', goal: 30000, saved: 19850 },

  // balance > 0 → they owe you; < 0 → you owe them; 0 → settled up.
  people: [
    { name: 'Youssef Benali', balance: 2400, note: 'Car repair loan' },
    { name: 'Salma Idrissi', balance: -1850, note: 'Covered my flight' },
    { name: 'Karim Tazi', balance: 650, note: 'Lunch + concert' },
    { name: 'Fatima Zahra', balance: 3500, note: 'Deposit help' },
    { name: 'Mehdi Alaoui', balance: -420, note: 'Groceries run' },
    { name: 'Imane Saidi', balance: 0, note: 'Settled up' },
    { name: 'Omar Cherkaoui', balance: 1200, note: 'Phone advance' },
    { name: 'Nadia Bennani', balance: -300, note: 'Coffee tab' },
    { name: 'Hamza El Fassi', balance: 980, note: 'Furniture split' },
    { name: 'Sofia Berrada', balance: -2100, note: 'Rent overlap' },
    { name: 'Reda Ouazzani', balance: 180, note: 'Taxi' },
    { name: 'Yasmine Kabbaj', balance: 540, note: 'Gift pool' },
    { name: 'Anas Bouazza', balance: -760, note: 'Tools' },
    { name: 'Khadija Lahlou', balance: 0, note: 'Settled up' },
    { name: 'Bilal Naciri', balance: 1450, note: 'Bike loan' },
    { name: 'Aya Sefrioui', balance: -150, note: 'Movie night' },
    { name: 'Ayoub Mansouri', balance: 320, note: 'Parking + gas' },
    { name: 'Lina Chraibi', balance: 2750, note: 'Tuition bridge' },
    { name: 'Zakaria Haddad', balance: -540, note: 'Dinner party' },
    { name: 'Ghita Amrani', balance: 210, note: 'Pharmacy' },
  ],

  // Per-person drill-in history (only a few people have detailed entries).
  personHistory: {
    'Youssef Benali': [
      { date: 'Jun 2', label: 'Car repair loan', amount: 2000, direction: 'out' },
      { date: 'May 18', label: 'Dinner — you paid', amount: 240, direction: 'out' },
      { date: 'May 4', label: 'He paid for gas', amount: -180, direction: 'in' },
      { date: 'Apr 22', label: 'Concert tickets', amount: 600, direction: 'out' },
      { date: 'Apr 9', label: 'Partial repayment', amount: -260, direction: 'in' },
    ],
  },

  // All-time history (14 months: May 2025 → Jun 2026). mode = landed mode idx
  // (0 Bare … 4 Feast); fund = emergency-fund balance that month.
  // The final month mirrors the live June figures.
  history: [
    { month: 'May', year: 25, mode: 3, spent: 13400, income: 12000, fund: 6200 },
    { month: 'Jun', year: 25, mode: 4, spent: 17600, income: 14500, fund: 6800 },
    { month: 'Jul', year: 25, mode: 3, spent: 13300, income: 12000, fund: 8100 },
    { month: 'Aug', year: 25, mode: 2, spent: 11400, income: 12800, fund: 9400 },
    { month: 'Sep', year: 25, mode: 1, spent: 9900, income: 12000, fund: 10600 },
    { month: 'Oct', year: 25, mode: 2, spent: 11200, income: 13500, fund: 11500 },
    { month: 'Nov', year: 25, mode: 3, spent: 13500, income: 12500, fund: 12900 },
    { month: 'Dec', year: 25, mode: 4, spent: 18200, income: 15500, fund: 12200 },
    { month: 'Jan', year: 26, mode: 1, spent: 9800, income: 12000, fund: 13900 },
    { month: 'Feb', year: 26, mode: 3, spent: 13200, income: 13000, fund: 15100 },
    { month: 'Mar', year: 26, mode: 2, spent: 11100, income: 13200, fund: 16400 },
    { month: 'Apr', year: 26, mode: 2, spent: 11400, income: 12500, fund: 17600 },
    { month: 'May', year: 26, mode: 1, spent: 10100, income: 13000, fund: 18700 },
    // June mirrors the live month: spend = sum of this month's out transactions.
    { month: 'Jun', year: 26, mode: 2, spent: 11275, income: 11800, fund: 19850 },
  ],

  // June 2026 transactions. direction 'out' = expense (counts toward spend/mode),
  // 'in' = income. Per-category out sums equal each category's actual.
  transactions: [
    { id: 1, day: 1, description: 'Salary — June', category: 'Income', amount: 9500, direction: 'in' },
    { id: 2, day: 1, description: 'Apartment rent', category: 'Rent', amount: 3200, direction: 'out' },
    { id: 3, day: 1, description: 'To emergency fund', category: 'Savings', amount: 1150, direction: 'out' },
    { id: 4, day: 1, description: 'Gym membership', category: 'Gym', amount: 250, direction: 'out' },
    { id: 5, day: 2, description: 'Support — Mom', category: 'Family support', amount: 1000, direction: 'out' },
    { id: 6, day: 2, description: 'Netflix', category: 'Subscriptions', amount: 75, direction: 'out' },
    { id: 7, day: 2, description: 'Spotify', category: 'Subscriptions', amount: 60, direction: 'out' },
    { id: 8, day: 3, description: 'Marjane', category: 'Groceries', amount: 620, direction: 'out' },
    { id: 9, day: 3, description: 'Tobacconist', category: 'Cigarettes', amount: 120, direction: 'out' },
    { id: 10, day: 4, description: 'Shell station', category: 'Transport & gas', amount: 300, direction: 'out' },
    { id: 11, day: 5, description: 'Maroc Telecom', category: 'Phone & net', amount: 250, direction: 'out' },
    { id: 12, day: 5, description: 'Café Maure', category: 'Coffee', amount: 65, direction: 'out' },
    { id: 13, day: 6, description: 'LYDEC — water & power', category: 'Utilities', amount: 360, direction: 'out' },
    { id: 14, day: 7, description: 'Dinner — Le Cabestan', category: 'Eating out', amount: 280, direction: 'out' },
    { id: 15, day: 8, description: 'Cinema & dinner', category: 'Dating', amount: 300, direction: 'out' },
    { id: 16, day: 10, description: 'Carrefour', category: 'Groceries', amount: 480, direction: 'out' },
    { id: 17, day: 11, description: 'Zara', category: 'Clothes', amount: 240, direction: 'out' },
    { id: 18, day: 12, description: 'Starbucks', category: 'Coffee', amount: 70, direction: 'out' },
    { id: 19, day: 13, description: 'Tobacconist', category: 'Cigarettes', amount: 120, direction: 'out' },
    { id: 20, day: 14, description: 'Pizza night', category: 'Eating out', amount: 180, direction: 'out' },
    { id: 21, day: 15, description: 'Freelance — design work', category: 'Income', amount: 2300, direction: 'in' },
    { id: 22, day: 15, description: 'YouTube Premium', category: 'Subscriptions', amount: 40, direction: 'out' },
    { id: 23, day: 16, description: 'Souk — fresh produce', category: 'Groceries', amount: 310, direction: 'out' },
    { id: 24, day: 18, description: 'Shell station', category: 'Transport & gas', amount: 250, direction: 'out' },
    { id: 25, day: 19, description: 'Café', category: 'Coffee', amount: 60, direction: 'out' },
    { id: 26, day: 19, description: 'Gas bottle', category: 'Utilities', amount: 145, direction: 'out' },
    { id: 27, day: 20, description: 'Gift', category: 'Dating', amount: 180, direction: 'out' },
    { id: 28, day: 21, description: 'Dinner — friends', category: 'Eating out', amount: 260, direction: 'out' },
    { id: 29, day: 22, description: 'Careem rides', category: 'Transport & gas', amount: 140, direction: 'out' },
    { id: 30, day: 23, description: 'Tobacconist', category: 'Cigarettes', amount: 120, direction: 'out' },
    { id: 31, day: 24, description: 'Marjane', category: 'Groceries', amount: 430, direction: 'out' },
    { id: 32, day: 25, description: 'Shoes — Derby', category: 'Clothes', amount: 150, direction: 'out' },
    { id: 33, day: 26, description: 'Café', category: 'Coffee', amount: 70, direction: 'out' },
  ],
};

/** The current user (display only). */
export const currentUser = { name: 'Yassine A.', firstName: 'Yassine', initials: 'YA' };
