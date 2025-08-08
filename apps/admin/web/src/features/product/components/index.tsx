import { useState } from 'react';
import { Category,CascadingDropdown } from './cascading-dropdown';


const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
  };

  // Mock API search function
  const handleSearch = async (query: string): Promise<Category[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock search results - in real app, this would call your API
    const mockResults: Category[] = [
      { 
        id: 'search-1', 
        name: `${query} - Gaming Laptops`, 
        parentId: '111', 
        hasChildren: false, 
        level: 3, 
        path: ['Electronics', 'Computers', 'Laptops', `${query} - Gaming Laptops`] 
      },
      { 
        id: 'search-2', 
        name: `${query} - Business Laptops`, 
        parentId: '111', 
        hasChildren: false, 
        level: 3, 
        path: ['Electronics', 'Computers', 'Laptops', `${query} - Business Laptops`] 
      },
      { 
        id: 'search-3', 
        name: `${query} - Smartphones`, 
        parentId: '121', 
        hasChildren: false, 
        level: 2, 
        path: ['Electronics', 'Mobile Phones', `${query} - Smartphones`] 
      },
    ];
    
    return mockResults;
  };

  return (
    

        <div className="space-y-4">
          <label className="text-sm font-medium">Choose Category:</label>
          <CascadingDropdown
            onSelect={handleCategorySelect}
            selectedCategory={selectedCategory}
            placeholder="Browse categories or search..."
            onSearch={handleSearch}
          />
          
          {selectedCategory && (
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Selected Category:</h3>
              <p className="text-sm">
                <strong>Name:</strong> {selectedCategory.name}
              </p>
              <p className="text-sm">
                <strong>Path:</strong> {selectedCategory.path.join(' > ')}
              </p>
              <p className="text-sm">
                <strong>Level:</strong> {selectedCategory.level}
              </p>
            </div>
          )}
        </div>

  );
};

export default Index;
