import {
  Users,
  ListOrdered,
  LayoutGrid,
  LucideIcon,
  ShoppingBag,
  UserPen,
  IndianRupee,
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

export function getMenuList(): Group[] {
  return [
    {
      menus: [
        {
          href: "",
          label: "Products",
          icon: ShoppingBag,
          submenus: [
            {
              href: "/products/manage",
              label: "Manage Product",
            },
            {
              href: "/products/new",
              label: "Add Product",
            },
            {
              href: "/products/mediacenter",
              label: "Media Center",
            },
            {
              href: "/categories",
              label: "Categories",
            },
          ],
        },
      ],
    },
    {
      menus: [
        {
          href: "",
          label: "Orders and Reviews",
          icon: ListOrdered,
          submenus: [
            {
              href: "/orders",
              label: "Orders",
            },
            {
              href: "/orders/return",
              label: "Return Orders",
            },
            {
              href: "/orders/reviews",
              label: "Reviews",
            },
          ],
        },
      ],
    },
    {
      menus: [
        {
          href: "",
          label: "My Account",
          icon: UserPen,
          submenus: [
            {
              href: "/account/settings",
              label: "Settings",
            },
            {
              href: "/account/account-setting",
              label: "Account Settings",
            },
          ],
        },
      ],
    },
    {
      menus: [
        {
          href: "",
          label: "Finance",
          icon: IndianRupee,
          submenus: [
            {
              href: "/finance",
              label: "Finance",
            },
          ],
        },
      ],
    },
  ];
}
