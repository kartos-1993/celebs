import {
  Users,
  ListOrdered,
  ShoppingBag,
  UserPen,
  IndianRupee,
  Store,
  UserCog,
  Shield,
  LucideIcon,
} from "lucide-react";

type Submenu = {
  href: string;
  label: string;
  active?: boolean;
};

type Menu = {
  href: string;
  label: string;
  active?: boolean;
  icon: LucideIcon;
  submenus?: Submenu[];
};

type Group = {
  menus: Menu[];
};

export function getMenuList(role?: string): Group[] {
  const list: Group[] = [];

  const isSuperAdmin = role === 'SUPERADMIN';
  const isAdmin = role === 'ADMIN';
  const isVendor = role === 'VENDOR';
  const isStaff = role === 'STAFF';

  // 1. Products Group (All roles)
  const productSubmenus: Submenu[] = [
    { href: "/products/manage", label: "Manage Product" },
    { href: "/products/new", label: "Add Product" },
    { href: "/products/mediacenter", label: "Media Center" },
  ];

  // Only Admin/SuperAdmin can review products, only SuperAdmin can manage categories
  if (isAdmin || isSuperAdmin) {
    productSubmenus.push({ href: "/products/review-product-queue", label: "Review Queue" });
  }
  if (isSuperAdmin) {
    productSubmenus.push({ href: "/categories", label: "Categories" });
  }

  list.push({
    menus: [
      {
        href: "",
        label: "Products",
        icon: ShoppingBag,
        submenus: productSubmenus,
      },
    ],
  });

  // 2. Orders & Reviews Group (All roles)
  list.push({
    menus: [
      {
        href: "",
        label: "Orders & Reviews",
        icon: ListOrdered,
        submenus: [
          { href: "/orders", label: "Orders" },
          { href: "/orders/return", label: "Return Orders" },
          { href: "/orders/reviews", label: "Reviews" },
        ],
      },
    ],
  });

  // 3. Vendor Management (Admin & SuperAdmin only)
  if (isAdmin || isSuperAdmin) {
    list.push({
      menus: [
        {
          href: "/vendors",
          label: "Vendor Management",
          icon: Store,
        },
      ],
    });
  }

  // 4. User Management (SuperAdmin only)
  if (isSuperAdmin) {
    list.push({
      menus: [
        {
          href: "/users",
          label: "User Management",
          icon: UserCog,
        },
      ],
    });
  }

  // 5. Staff Management (Vendor & SuperAdmin only)
  if (isVendor || isSuperAdmin) {
    list.push({
      menus: [
        {
          href: "/staff",
          label: "Staff Management",
          icon: Users,
        },
      ],
    });
  }

  // 6. Finance Group (Vendor, Admin & SuperAdmin only)
  if (isVendor || isAdmin || isSuperAdmin) {
    list.push({
      menus: [
        {
          href: "",
          label: "Finance",
          icon: IndianRupee,
          submenus: [
            { href: "/finance", label: "Finance" },
          ],
        },
      ],
    });
  }

  // 7. My Account Group (All roles)
  list.push({
    menus: [
      {
        href: "",
        label: "My Account",
        icon: UserPen,
        submenus: [
          { href: "/account/settings", label: "Settings" },
          { href: "/account/account-setting", label: "Account Settings" },
        ],
      },
    ],
  });

  // 8. Platform Settings Group (SuperAdmin only)
  if (isSuperAdmin) {
    list.push({
      menus: [
        {
          href: "/platform-settings",
          label: "Platform Settings",
          icon: Shield,
        },
      ],
    });
  }

  return list;
}
