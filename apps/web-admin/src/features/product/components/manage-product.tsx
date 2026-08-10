import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@celebs/shared-ui/components/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@celebs/shared-ui/components/table';
import { Button } from '@celebs/shared-ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@celebs/shared-ui/components/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@celebs/shared-ui/components/select';
import { Input } from '@celebs/shared-ui/components/input';
import { Checkbox } from '@celebs/shared-ui/components/checkbox';
import { Badge } from '@celebs/shared-ui/components/badge';
import { Alert, AlertDescription } from '@celebs/shared-ui/components/alert';
import { ShoppingBag, Plus, Search, AlertTriangle, Info, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getProducts,
  toggleProductActivation,
  archiveProduct,
  submitProductForReview,
  ProductApiService,
} from '../api';
import { useAuthContext } from '@/context/auth-provider';

const productStatusTabs = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'pending_review', label: 'Pending Review' },
  { id: 'published', label: 'Active (Published)' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'deactivated', label: 'Deactivated' },
];

const ManageProduct = () => {
  const { toast } = useToast();
  const { role } = useAuthContext();
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('');
  const [showHelpNotification, setShowHelpNotification] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await getProducts({
        search: searchTerm || undefined,
        status: filterStatus === 'all' ? undefined : (filterStatus as any),
        page,
        limit: 10,
      });
      setProducts(res.data?.products ?? []);
      setTotal(res.data?.total ?? 0);
    } catch (err: any) {
      toast({
        title: 'Failed to load products',
        description: err.message || 'Operation failed',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [filterStatus, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, productId]);
    } else {
      setSelectedProducts(selectedProducts.filter((id) => id !== productId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(products.map((p) => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleToggleActivation = async (id: string) => {
    try {
      await toggleProductActivation(id);
      toast({
        title: 'Status Updated',
        description: 'Successfully toggled product status.',
      });
      fetchProducts();
    } catch (err: any) {
      toast({
        title: 'Action failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveProduct(id);
      toast({
        title: 'Product Archived',
        description: 'The product was successfully soft deleted.',
      });
      fetchProducts();
    } catch (err: any) {
      toast({
        title: 'Archive failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleResubmit = async (id: string) => {
    try {
      await ProductApiService.submitProductForReview(id);
      toast({
        title: 'Product Submitted',
        description: 'Product has been queued for review successfully.',
      });
      fetchProducts();
    } catch (err: any) {
      toast({
        title: 'Submission failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-fashion-700">Manage Products</h1>
          <p className="text-gray-500 mt-1">Manage your product inventory and track performance</p>
        </div>
        <div className="flex gap-2">
          <Button asChild className="bg-orange-500 hover:bg-orange-600">
            <Link to="/products/new">+ New Product</Link>
          </Button>
        </div>
      </div>

      {/* Help Notification */}
      {showHelpNotification && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700 flex items-center justify-between">
            <div>
              <span className="font-medium">Welcome to Product Management.</span> Sellers can view
              status and submit drafts for review. Admins can approve items.
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
            Product List
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Status Tabs */}
          <div className="flex gap-6 mb-6 border-b">
            {productStatusTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setFilterStatus(tab.id);
                  setPage(1);
                }}
                className={`pb-3 px-1 border-b-2 transition-colors ${
                  filterStatus === tab.id
                    ? 'border-orange-500 text-orange-600 font-medium'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filters and Search */}
          <form onSubmit={handleSearch} className="flex gap-4 mb-6 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search products..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button type="submit">Search</Button>
          </form>

          {/* Products Table */}
          {isLoading ? (
            <div className="py-8 text-center text-sm text-gray-500">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">No products found.</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedProducts.length === products.length && products.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Product Info</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ownership</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={(checked) => handleSelectProduct(product.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          {product.brand && (
                            <div className="text-xs text-gray-500">Brand: {product.brand}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        Rs. {product.price.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            product.status === 'published'
                              ? 'default'
                              : product.status === 'pending_review'
                                ? 'secondary'
                                : product.status === 'rejected'
                                  ? 'destructive'
                                  : 'outline'
                          }
                        >
                          {product.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {product.vendorName || 'Independent Seller'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {role === 'VENDOR' &&
                            (product.status === 'draft' || product.status === 'rejected') && (
                              <Button size="sm" onClick={() => handleResubmit(product.id)}>
                                Submit
                              </Button>
                            )}

                          {role === 'VENDOR' &&
                            (product.status === 'published' ||
                              product.status === 'deactivated') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleActivation(product.id)}
                              >
                                {product.status === 'published' ? 'Deactivate' : 'Activate'}
                              </Button>
                            )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                More ▼
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link to={`/products/edit/${product.id}`}>Edit</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleArchive(product.id)}>
                                Archive (Delete)
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
          )}

          {total > 10 && (
            <div className="flex justify-between items-center mt-4">
              <Button disabled={page === 1} onClick={() => setPage(page - 1)} variant="outline">
                Previous
              </Button>
              <span className="text-sm text-gray-500">
                Page {page} of {Math.ceil(total / 10)}
              </span>
              <Button
                disabled={page * 10 >= total}
                onClick={() => setPage(page + 1)}
                variant="outline"
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManageProduct;
