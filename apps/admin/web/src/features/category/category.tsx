import { useEffect, useState } from "react";

import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FolderTree, FolderPlus, ChevronRight, Edit, Trash2, Plus } from "lucide-react";
import CategoryForm from "./component/categoryform";
import { useToast } from "@/hooks/use-toast";





// Mock data
const mockCategories = [
  {
    id: "1",
    name: "Men's Clothing",
    subcategories: [
      { id: "1-1", name: "T-Shirts", attributes: ["Neckline", "Sleeves", "Material"] },
      { id: "1-2", name: "Jeans", attributes: ["Fit", "Wash", "Rise"] },
      { id: "1-3", name: "Jackets", attributes: ["Style", "Material", "Features"] },
    ],
  },
  {
    id: "2",
    name: "Women's Clothing",
    subcategories: [
      { id: "2-1", name: "Dresses", attributes: ["Length", "Silhouette", "Neckline"] },
      { id: "2-2", name: "Tops", attributes: ["Sleeve", "Fit", "Material"] },
      { id: "2-3", name: "Skirts", attributes: ["Length", "Style", "Rise"] },
    ],
  },
  {
    id: "3",
    name: "Accessories",
    subcategories: [
      { id: "3-1", name: "Watches", attributes: ["Movement", "Material", "Features"] },
      { id: "3-2", name: "Jewelry", attributes: ["Type", "Material", "Occasion"] },
      { id: "3-3", name: "Bags", attributes: ["Type", "Material", "Size"] },
    ],
  },
];

const Category = () => {
 
  const [categories, setCategories] = useState(mockCategories);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [isSubcategory, setIsSubcategory] = useState(false);
  const [parentCategory, setParentCategory] = useState<string | null>(null);
  const { toast } = useToast();



  const toggleCategory = (id: string) => {
    setExpandedCategories({
      ...expandedCategories,
      [id]: !expandedCategories[id],
    });
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setIsSubcategory(false);
    setParentCategory(null);
    setFormDialogOpen(true);
  };

  const handleAddSubcategory = (categoryId: string) => {
    setEditingCategory(null);
    setIsSubcategory(true);
    setParentCategory(categoryId);
    setFormDialogOpen(true);
  };

  const handleEdit = (item: any, isSubcategory = false, parentId: string | null = null) => {
    setEditingCategory(item);
    setIsSubcategory(isSubcategory);
    setParentCategory(parentId);
    setFormDialogOpen(true);
  };

  const handleDelete = (id: string, isSubcategory = false, parentId: string | null = null) => {
    if (isSubcategory && parentId) {
      const updatedCategories = categories.map((category) => {
        if (category.id === parentId) {
          return {
            ...category,
            subcategories: category.subcategories.filter((sub) => sub.id !== id),
          };
        }
        return category;
      });
      setCategories(updatedCategories);
    } else {
      setCategories(categories.filter((category) => category.id !== id));
    }

    toast({
      title: "Success",
      description: `${isSubcategory ? "Subcategory" : "Category"} deleted successfully`,
    });
  };

  const handleSave = (formData: any) => {
    if (editingCategory) {
      // Edit existing category/subcategory
      if (isSubcategory && parentCategory) {
        const updatedCategories = categories.map((category) => {
          if (category.id === parentCategory) {
            return {
              ...category,
              subcategories: category.subcategories.map((sub) =>
                sub.id === editingCategory.id ? { ...sub, ...formData } : sub
              ),
            };
          }
          return category;
        });
        setCategories(updatedCategories);
      } else {
        const updatedCategories = categories.map((category) =>
          category.id === editingCategory.id ? { ...category, ...formData } : category
        );
        setCategories(updatedCategories);
      }
      toast({
        title: "Success",
        description: `${isSubcategory ? "Subcategory" : "Category"} updated successfully`,
      });
    } else {
      // Add new category/subcategory
      if (isSubcategory && parentCategory) {
        const newSubcategory = {
          id: `${parentCategory}-${Date.now()}`,
          name: formData.name,
          attributes: formData.attributes || [],
        };
        const updatedCategories = categories.map((category) => {
          if (category.id === parentCategory) {
            return {
              ...category,
              subcategories: [...category.subcategories, newSubcategory],
            };
          }
          return category;
        });
        setCategories(updatedCategories);
      } else {
        const newCategory = {
          id: Date.now().toString(),
          name: formData.name,
          subcategories: [],
        };
        setCategories([...categories, newCategory]);
      }
      toast({
        title: "Success",
        description: `${isSubcategory ? "Subcategory" : "Category"} added successfully`,
      });
    }
    setFormDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold ">Categories</h1>
          <p className="text-gray-500 mt-1">Manage product categories and attributes</p>
        </div>
        <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
          <DialogTrigger asChild>
            <Button className="" onClick={handleAddCategory}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Edit" : "Add"} {isSubcategory ? "Subcategory" : "Category"}</DialogTitle>
            </DialogHeader>
            <CategoryForm
              initialData={editingCategory}
              isSubcategory={isSubcategory}
              onSave={handleSave}
              onCancel={() => setFormDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Category Structure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Name</TableHead>
                <TableHead>Attributes</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <>
                  <TableRow key={category.id} className="">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => toggleCategory(category.id)}
                        >
                          <ChevronRight
                            className={`h-4 w-4 transition-transform ${
                              expandedCategories[category.id] ? "rotate-90" : ""
                            }`}
                          />
                        </Button>
                        {category.name}
                      </div>
                    </TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-gray-500 hover:text-fashion-700"
                          onClick={() => handleEdit(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-gray-500 hover:text-red-700"
                          onClick={() => handleDelete(category.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-gray-500 hover:text-fashion-700"
                          onClick={() => handleAddSubcategory(category.id)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedCategories[category.id] &&
                    category.subcategories.map((subcategory) => (
                      <TableRow key={subcategory.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2 pl-10">
                            {subcategory.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {subcategory.attributes.map((attr, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center justify-center rounded-full bg-zinc-600 px-2.5 py-0.5 text-xs font-medium text-fashion-700"
                              >
                                {attr}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-gray-500 hover:text-fashion-700"
                              onClick={() => handleEdit(subcategory, true, category.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-gray-500 hover:text-red-700"
                              onClick={() => handleDelete(subcategory.id, true, category.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Category;
