import { type CategoryFormData } from "./schemas";

export type { CategoryFormData };

export interface Category {
  _id: string;
  name: string;
  level: number;
  parent: string | null;
  path: string[];
}

export interface CategoryFormProps {
  initialData?: any;
  onSave: (data: CategoryFormData) => void;
  onCancel: () => void;
  categories?: Category[];
}
