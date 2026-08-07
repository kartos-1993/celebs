import { ProductModel, IProduct } from '@/db/models/product.model';
import { CategoryModel, ICategory } from '@/db/models/category.model';
import mongoose from 'mongoose';

export class MongoProductRepository {
  public async createProduct(payload: Partial<IProduct>): Promise<IProduct> {
    return await ProductModel.create(payload);
  }

  public async findProductById(id: string): Promise<IProduct | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await ProductModel.findById(id);
  }

  public async updateProductById(id: string, updateData: Partial<IProduct>): Promise<IProduct | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await ProductModel.findByIdAndUpdate(id, { $set: updateData }, { new: true });
  }

  public async deleteProductById(id: string): Promise<IProduct | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await ProductModel.findByIdAndDelete(id);
  }

  public async findCategoryById(id: string): Promise<ICategory | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await CategoryModel.findById(id);
  }
}
