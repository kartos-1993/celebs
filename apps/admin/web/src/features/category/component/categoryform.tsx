import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus } from "lucide-react";

interface CategoryFormProps {
  initialData: any;
  isSubcategory: boolean;
  onSave: (data: any) => void;
  onCancel: () => void;
}

const CategoryForm = ({
  initialData,
  isSubcategory,
  onSave,
  onCancel,
}: CategoryFormProps) => {
  const [name, setName] = useState(initialData?.name || "");
  const [attributes, setAttributes] = useState<string[]>(initialData?.attributes || []);
  const [newAttribute, setNewAttribute] = useState("");

  const handleAddAttribute = () => {
    if (newAttribute && !attributes.includes(newAttribute)) {
      setAttributes([...attributes, newAttribute]);
      setNewAttribute("");
    }
  };

  const handleRemoveAttribute = (attribute: string) => {
    setAttributes(attributes.filter((attr) => attr !== attribute));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      attributes: isSubcategory ? attributes : [],
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4 py-2 pb-4">
        <div className="space-y-2">
          <Label htmlFor="name">{isSubcategory ? "Subcategory" : "Category"} Name</Label>
          <Input
            id="name"
            placeholder={`Enter ${isSubcategory ? "subcategory" : "category"} name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        {isSubcategory && (
          <div className="space-y-2">
            <Label htmlFor="attributes">Attributes</Label>
            <div className="flex gap-2">
              <Input
                id="attributes"
                placeholder="Add attribute (e.g. Size, Color)"
                value={newAttribute}
                onChange={(e) => setNewAttribute(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddAttribute}
                disabled={!newAttribute}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-2">
              {attributes.map((attribute, index) => (
                <div
                  key={index}
                  className="inline-flex items-center gap-1 rounded-full bg-fashion-100 px-3 py-1 text-sm text-fashion-700"
                >
                  {attribute}
                  <button
                    type="button"
                    className="text-fashion-500 hover:text-fashion-700"
                    onClick={() => handleRemoveAttribute(attribute)}
                    aria-label={`Remove ${attribute} attribute`}
                    title={`Remove ${attribute}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="bg-fashion-700 hover:bg-fashion-800">
            Save
          </Button>
        </div>
      </div>
    </form>
  );
};

export default CategoryForm;
