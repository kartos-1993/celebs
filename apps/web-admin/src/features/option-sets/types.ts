export interface OptionSet {
  id: string;
  name: string;
  displayName: string;
  description?: string | null;
  values: string[];
}

export interface CreateOptionSetInput {
  name: string;
  displayName?: string;
  description?: string;
  values: string[];
}

export interface UpdateOptionSetInput {
  name?: string;
  displayName?: string;
  description?: string;
  values?: string[];
}
