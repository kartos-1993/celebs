import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ShoppingBag,
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Download,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const mockProducts = [
  {
    id: '1',
    name: 'Regular Fit Essential Zip Through Hoodie',
    category: "Men's Clothing",
    subcategory: 'Hoodies',
    price: 3000,
    stock: 2,
    variants: 3,
    status: 'active',
    contentScore: 'excellent',
    createdAt: '2023-05-12',
    image: '/placeholder.svg',
    sku: '174174876-1733656171557-0',
    lowStock: true,
  },
  {
    id: '2',
    name: 'Black Chest 52',
    category: "Men's Clothing",
    subcategory: 'T-Shirts',
    price: 3000,
    stock: 1,
    variants: 2,
    status: 'active',
    contentScore: 'good',
    createdAt: '2023-05-10',
    image: '/placeholder.svg',
    sku: '174174876-1733656171561-1',
    lowStock: true,
  },
  {
    id: '3',
    name: 'Grey Chest 52',
    category: "Men's Clothing",
    subcategory: 'T-Shirts',
    price: 3000,
    stock: 1,
    variants: 2,
    status: 'active',
    contentScore: 'good',
    createdAt: '2023-05-08',
    image: '/placeholder.svg',
    sku: '174174876-1733656171561-1',
    lowStock: true,
  },
  {
    id: '4',
    name: 'Summer Collection Dress',
    category: "Women's Clothing",
    subcategory: 'Dresses',
    price: 4500,
    stock: 15,
    variants: 4,
    status: 'draft',
    contentScore: 'needs_improvement',
    createdAt: '2023-05-05',
    image: '/placeholder.svg',
    sku: 'WD-2023-001',
    lowStock: false,
  },
  {
    id: '5',
    name: 'Vintage Denim Jacket',
    category: "Men's Clothing",
    subcategory: 'Jackets',
    price: 5500,
    stock: 0,
    variants: 3,
    status: 'inactive',
    contentScore: 'excellent',
    createdAt: '2023-05-03',
    image: '/placeholder.svg',
    sku: 'MJ-2023-VDJ',
    lowStock: false,
  },
];

const productStatusTabs = [
  { id: 'all', label: 'All', count: 5 },
  { id: 'active', label: 'Active', count: 3, hasAlert: true },
  { id: 'inactive', label: 'Inactive', count: 1 },
  { id: 'draft', label: 'Draft', count: 1 },
  { id: 'pending_qc', label: 'Pending QC', count: 0 },
  { id: 'violation', label: 'Violation', count: 0 },
  { id: 'deleted', label: 'Deleted', count: 0 },
];

const ManageProduct = () => {
  const { toast } = useToast();

  const [products, setProducts] = useState(mockProducts);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('');
  const [showHelpNotification, setShowHelpNotification] = useState(true);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      filterCategory === '' ||
      filterCategory === 'all-categories' ||
      product.category === filterCategory;
    const matchesStatus =
      filterStatus === 'all' || product.status === filterStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, productId]);
    } else {
      setSelectedProducts(selectedProducts.filter((id) => id !== productId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(filteredProducts.map((p) => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleBulkAction = (action: string) => {
    if (selectedProducts.length === 0) {
      toast({
        title: 'No products selected',
        description: 'Please select products to perform bulk actions.',
        variant: 'destructive',
      });
      return;
    }

    switch (action) {
      case 'deactivate':
        setProducts(
          products.map((p) =>
            selectedProducts.includes(p.id) ? { ...p, status: 'inactive' } : p,
          ),
        );
        toast({
          title: 'Products deactivated',
          description: `${selectedProducts.length} products have been deactivated.`,
        });
        break;
      case 'delete':
        setProducts(products.filter((p) => !selectedProducts.includes(p.id)));
        toast({
          title: 'Products deleted',
          description: `${selectedProducts.length} products have been deleted.`,
        });
        break;
      case 'export':
        toast({
          title: 'Export started',
          description: `Exporting ${selectedProducts.length} selected products.`,
        });
        break;
    }
    setSelectedProducts([]);
  };

  const getContentScoreBadge = (score: string) => {
    switch (score) {
      case 'excellent':
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            ● Excellent
          </Badge>
        );
      case 'good':
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
            ● Good
          </Badge>
        );
      case 'needs_improvement':
        return (
          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
            ● Needs Improvement
          </Badge>
        );
      default:
        return <Badge variant="secondary">● Unknown</Badge>;
    }
  };

  const activeTab = productStatusTabs.find((tab) => tab.id === filterStatus);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-fashion-700">
            Manage Products
          </h1>
          <p className="text-gray-500 mt-1">
            Manage your product inventory and track performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="bg-orange-50 text-orange-600 border-orange-200"
          >
            Product Data
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="bg-orange-50 text-orange-600 border-orange-200"
              >
                Bulk Manage ▼
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleBulkAction('export')}>
                Bulk Export
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkAction('deactivate')}>
                Bulk Deactivate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link to="/products/new">
            <Button className="bg-orange-500 hover:bg-orange-600">
              + New Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Help Notification */}
      {showHelpNotification && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700 flex items-center justify-between">
            <div>
              <span className="font-medium">
                Welcome to Product Management Page.
              </span>{' '}
              <a href="#" className="text-blue-600 underline">
                Learn More
              </a>
              <br />
              <span className="text-sm">
                Try the New Size Chart Tool to enrich your fashion products
                information.{' '}
                <a href="#" className="text-blue-600 underline">
                  Learn how to use
                </a>
              </span>
              <br />
              <span className="text-sm mt-2 block">
                Your store is on Holiday Mode and all products cannot be
                purchased by buyers. You can manually turn off Holiday Mode by
                going to My Account &gt; Setting &gt; Holiday Mode and wait 1-2
                hours to resume normal sales.
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHelpNotification(false)}
              className="ml-4"
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Product Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Status Tabs */}
          <div className="flex gap-6 mb-6 border-b">
            {productStatusTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`pb-3 px-1 border-b-2 transition-colors ${
                  filterStatus === tab.id
                    ? 'border-orange-500 text-orange-600 font-medium'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                <span className="flex items-center gap-2">
                  {tab.label}
                  {tab.hasAlert && (
                    <span className="bg-orange-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      !
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Please Input"
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-categories">Please Select</SelectItem>
                  <SelectItem value="Men's Clothing">Men's Clothing</SelectItem>
                  <SelectItem value="Women's Clothing">
                    Women's Clothing
                  </SelectItem>
                  <SelectItem value="Accessories">Accessories</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Please Select</SelectItem>
                  <SelectItem value="price_low">Price: Low to High</SelectItem>
                  <SelectItem value="price_high">Price: High to Low</SelectItem>
                  <SelectItem value="stock">Stock Level</SelectItem>
                  <SelectItem value="date">Date Created</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="flex items-center gap-4 mb-4">
            <span className="text-sm text-gray-600">
              {selectedProducts.length} products selected
            </span>
            {selectedProducts.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('deactivate')}
                >
                  Deactivate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('delete')}
                >
                  Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('export')}
                >
                  Export Selected Products
                </Button>
              </div>
            )}
          </div>

          {/* Products Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        selectedProducts.length === filteredProducts.length &&
                        filteredProducts.length > 0
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Product Info</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Content Score</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedProducts.includes(product.id)}
                        onCheckedChange={(checked) =>
                          handleSelectProduct(product.id, !!checked)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-12 h-12 rounded border object-cover"
                        />
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-gray-500">
                            <div>📷 0 📝 0 💎 {product.variants}</div>
                            <div className="text-xs">
                              Seller Sku: {product.sku}
                            </div>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      Rs. {product.price.toLocaleString()} 💵
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span>{product.stock}</span>
                        {product.lowStock && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                        {product.stock === 0 && (
                          <span className="text-red-500">📝</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <div
                          className={`w-12 h-6 rounded-full p-1 transition-colors ${
                            product.status === 'active'
                              ? 'bg-orange-500'
                              : 'bg-gray-300'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full bg-white transition-transform ${
                              product.status === 'active'
                                ? 'translate-x-6'
                                : 'translate-x-0'
                            }`}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getContentScoreBadge(product.contentScore)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link to={`/products/edit/${product.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:bg-blue-50"
                          >
                            Edit
                          </Button>
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:bg-blue-50"
                            >
                              More ▼
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuItem>Duplicate</DropdownMenuItem>
                            <DropdownMenuItem>Archive</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No products found matching your filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManageProduct;
