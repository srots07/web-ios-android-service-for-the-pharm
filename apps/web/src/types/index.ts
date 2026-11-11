export interface Product {
  id: string;
  name: string;
  category: "Tablets" | "Syrups / Susp." | "Paediatric Drops" | "Capsules" | "Oil Filled Capsules";
  sku: string;
  description: string;
  image: string;
  packSize: string;
  indications?: string[];
  certifications: string[];
  shelfLife?: string;
  storageConditions?: string;
  dosageForm?: string;
}

export interface Category {
  name: string;
  image: string;
  description: string;
}

export interface StatItem {
  value: string;
  label: string;
  detail: string;
}

export interface CommercialOffer {
  id: string;
  tag: string;
  title: string;
  category: "Distribution" | "Institutional" | "Manufacturing" | "Retail";
  description: string;
  eligibility: string;
  incentive: string;
  terms: string;
  status: "Active" | "Upcoming" | "Review";
}

export interface PartnerInquiry {
  fullName: string;
  email: string;
  phone?: string;
  country: string;
  organization?: string;
  enquiryType: "Product Enquiry" | "Distributor Enquiry" | "Institutional Supply" | "Quality & Regulatory" | "General Enquiry";
  subject: string;
  message: string;
  consent: boolean;
}
