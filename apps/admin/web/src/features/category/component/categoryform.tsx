import { useState, useEffect } from "react";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { X, Plus } from "lucide-react";
import { createCategoryMutationFn } from "../api";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";


const formSchema = z.object({
name: z.string().min(1,{message:"Category name is required"}).min(2,{message:"Category name must be at least 2 characters"}).max(30,{message:"Category name must be less than 30 characters"}),
})
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
   const {mutate} = useMutation({
      mutationFn:createCategoryMutationFn
    })

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || ""
    }
  })
  
  // State for attributes (for future use when subcategory attribute management is needed)
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
    function onSubmit(values:z.infer<typeof formSchema>) {
    console.log("Submitting form with values:", values);
    
    // Pass the values directly to the API
    mutate(values, {
      onSuccess: response => {
        console.log("Category created successfully", response);
        onSave(response.data);  // Pass the response data to the parent component
      },
      onError: error => {
        console.error("Error creating category", error);
        // Show the error to help with debugging
        alert(`Error creating category: ${JSON.stringify(error)}`);
      }
    });
  };



  return (
    <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-4 py-2 pb-4">
        <div className="space-y-2">          <FormField
         control ={form.control}
         name="name"
         render = {({field}) => (
          <FormItem className="space-y-1">
            <FormLabel>Category</FormLabel>
            <FormControl>
              <Input
                placeholder= "Category name"
                {...field}
              />
            </FormControl>
            <FormMessage/>
            </FormItem>
         )}
          />
         
        </div>
         

        {/* {isSubcategory && (
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
        )} */}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="outline">
            Save
          </Button>
        </div>
      </div>
    </form>
    </Form>
   
  );
};

export default CategoryForm;
