export type LabRow = {
  Analit: string;
  Vrijednost: number | null;
  Jedinica: string;
  Ref_low: number | null;
  Ref_high: number | null;
  Status: string;
  Datum?: string;   // dd.mm.yyyy
  Source?: string;
  Linija?: string;
};

export type LabReport = {
  id: string;               // uuid
  date: string;             // YYYY-MM-DD (ISO)
  sourceFiles: string[];    // imena PDF-ova
  rows: LabRow[];
};

export type User = {
  id: string;
  email: string;
  passwordHash: string;     // bcrypt hash
  reports: LabReport[];
};

export type Session = {
  userId: string;
  email: string;
};
