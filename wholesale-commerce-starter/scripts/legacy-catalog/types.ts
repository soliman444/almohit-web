export type Severity = "warning" | "error";

export type Issue = {
  severity: Severity;
  code: string;
  message: string;
  legacyId?: string;
};

export type Counts = {
  categories: number;
  brands: number;
  attributes: number;
  attributeValues: number;
  products: number;
  variants: number;
  prices: number;
  inventoryRows: number;
  images: number;
  galleryImages: number;
};

export type PhaseCounts = {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
};

export type ImageReport = {
  primaryMigrated: number;
  alreadyHadImage: number;
  missingSource: number;
  brokenSource: number;
  downloadFailed: number;
  galleryOnly: number;
  localFiles: number;
  remoteUrls: number;
};

export type MigrationReport = {
  dryRun: boolean;
  counts: Counts;
  issues: Issue[];
  inventory: {
    onHand: number;
    reserved: number;
    available: number;
    rows: number;
    reservedRows: number;
  };
  priceGroups: Array<{ id: string; name: string; slug: string; status: string; priceCount: number }>;
  images?: ImageReport;
  phases?: Record<string, PhaseCounts>;
};

export type OdooBatchResult = {
  phase: string;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  results: Array<{
    action: string;
    xmlid: string;
    odoo_id?: number | null;
    reason?: string;
    warnings?: string[];
    primary_written?: boolean;
  }>;
};
