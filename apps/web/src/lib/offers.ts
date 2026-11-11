import { CommercialOffer } from "@/types";

export const commercialOffers: CommercialOffer[] = [
  {
    id: "off-dist-01",
    tag: "DISTRIBUTION ALLIANCE",
    title: "Regional Pharmacy Network Distribution Tier",
    category: "Distribution",
    description: "Structured commercial supply program for licensed pharmaceutical wholesalers and regional pharmacy chain networks.",
    eligibility: "Registered pharmaceutical distributors with active regional trade licenses in East Africa or international territories.",
    incentive: "Guaranteed batch allocation, priority dispatch, and tiered volume commercial terms.",
    terms: "Minimum batch fulfillment orders apply; subject to national drug authority importation permits and regulatory verification.",
    status: "Active",
  },
  {
    id: "off-inst-02",
    tag: "INSTITUTIONAL TENDER",
    title: "Hospital & Healthcare System Procurement",
    category: "Institutional",
    description: "Direct-to-facility procurement program tailored for regional hospitals, clinical trusts, and healthcare networks.",
    eligibility: "Accredited private and government healthcare institutions, NGO clinical missions, and regional hospitals.",
    incentive: "Long-term fixed pricing agreements with scheduled quarterly delivery batches.",
    terms: "Subject to direct institutional contracting, certificate of analysis (CoA) sign-off, and supply agreement execution.",
    status: "Active",
  },
  {
    id: "off-paed-03",
    tag: "NEW LAUNCH TIER",
    title: "Paediatric Formulation Introductory Program",
    category: "Retail",
    description: "Introductory distribution allocation for our Paediatric Cough & Cold Relief and Vitality Kids Zinc Drops formulations.",
    eligibility: "Paediatric clinics, child healthcare centers, and community retail pharmacies.",
    incentive: "Sample clinical literature kits, clinician reference guides, and promotional partner margins.",
    terms: "Available for initial adoption orders; subject to regional inventory availability.",
    status: "Active",
  },
  {
    id: "off-mfg-04",
    tag: "MANUFACTURING PARTNERSHIP",
    title: "Contract Manufacturing & Private Labeling",
    category: "Manufacturing",
    description: "Custom batch manufacturing and regulatory dossier transfer leveraging our WHO-GMP certified production lines in India.",
    eligibility: "Established brand holders, healthcare conglomerates, and pharmaceutical marketing authorization holders.",
    incentive: "Full regulatory dossier support (CTD format), stability data, and customized primary packaging.",
    terms: "Commercial MOQs determined by batch size and primary packaging specifications (blister/bottle/sachet).",
    status: "Active",
  },
];

