import {
  Home,
  Package,
  Tag,
  ShieldCheck,
  Info,
  Mail,
  LayoutDashboard,
  ShoppingCart,
  Users,
  FileText,
  Boxes,
  ShieldAlert,
  Settings,
  Bell,
  Activity,
  FileCheck,
  User,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  badge?: string;
  icon?: LucideIcon;
  disabled?: boolean;
  requiredRole?: "admin" | "customer" | "all";
}

export interface NavGroup {
  group: string;
  items: NavItem[];
}

export const publicNavItems: NavItem[] = [
  { label: "HOME", href: "/", icon: Home },
  { label: "PRODUCTS", href: "/products", icon: Package },
  { label: "OFFERS", href: "/offers", badge: "DEALS", icon: Tag },
  { label: "QUALITY", href: "/quality", icon: ShieldCheck },
  { label: "ABOUT US", href: "/about", icon: Info },
  { label: "CONTACT US", href: "/contact", icon: Mail },
];

export const productCategories = [
  { name: "Tablets", href: "/products?category=Tablets" },
  { name: "Syrups / Susp.", href: "/products?category=Syrups%20%2F%20Susp." },
  { name: "Paediatric Drops", href: "/products?category=Paediatric%20Drops" },
  { name: "Capsules", href: "/products?category=Capsules" },
  { name: "Oil Filled Capsules", href: "/products?category=Oil%20Filled%20Capsules" },
];

/**
 * Reusable Sidebar Navigation Architecture for W06 Admin Dashboard.
 */
export const sidebarNavGroups: NavGroup[] = [
  {
    group: "GENERAL",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard, requiredRole: "admin" },
      { label: "Overview", href: "/admin/overview", icon: FileCheck, requiredRole: "admin" },
      { label: "Activity", href: "/admin/activity", icon: Activity, requiredRole: "admin" },
      { label: "Notifications", href: "/admin/notifications", icon: Bell, requiredRole: "admin" },
    ],
  },
  {
    group: "MANAGEMENT",
    items: [
      { label: "Users", href: "/admin/users", icon: Users, requiredRole: "admin" },
      { label: "Products", href: "/admin/products", icon: Package, requiredRole: "admin" },
      { label: "Enquiries", href: "/admin/enquiries", icon: Mail, requiredRole: "admin" },
      { label: "Orders", href: "/admin/orders", icon: ShoppingCart, requiredRole: "admin" },
      { label: "Quotations", href: "/admin/quotations", icon: FileText, requiredRole: "admin" },
    ],
  },
  {
    group: "SYSTEM",
    items: [
      { label: "Roles & Permissions", href: "/admin/roles", icon: ShieldAlert, requiredRole: "admin" },
      { label: "Settings", href: "/admin/settings", icon: Settings, requiredRole: "admin" },
      { label: "Profile", href: "/admin/profile", icon: User, requiredRole: "admin" },
    ],
  },
];
