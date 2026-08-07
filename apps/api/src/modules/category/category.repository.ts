import { CategoryModel, ICategory } from '@/db/models/category.model';
import { AttributeModel, IAttribute } from '@/db/models/attribute.model';
import { CategoryFilterModel, ICategoryFilter } from '@/db/models/category-filter.model';
import { ProductModel } from '@/db/models/product.model';
import mongoose, { ClientSession, Types } from 'mongoose';

export class CategoryRepository {
  async countDocuments(query: Record<string, any> = {}): Promise<number> {
    return CategoryModel.countDocuments(query);
  }

  async findById(id: string): Promise<ICategory | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return CategoryModel.findById(id);
  }

  async findOne(query: Record<string, any>): Promise<ICategory | null> {
    return CategoryModel.findOne(query);
  }

  async find(query: Record<string, any>, limit?: number): Promise<ICategory[]> {
    const q = CategoryModel.find(query).sort({ level: 1, name: 1 });
    if (limit) q.limit(limit);
    return q.lean<ICategory[]>();
  }

  async aggregate(pipeline: any[]): Promise<any[]> {
    return CategoryModel.aggregate(pipeline);
  }

  async create(data: Partial<ICategory>): Promise<ICategory> {
    return CategoryModel.create(data);
  }

  async updateById(id: string, updateData: Record<string, any>): Promise<ICategory | null> {
    return CategoryModel.findByIdAndUpdate(id, updateData, { new: true });
  }

  async deleteById(id: string): Promise<ICategory | null> {
    return CategoryModel.findByIdAndDelete(id);
  }

  async bulkWrite(ops: any[], session?: ClientSession): Promise<any> {
    return CategoryModel.bulkWrite(ops, session ? { session } : undefined);
  }

  // Attribute Operations
  async findAttributes(query: Record<string, any>, session?: ClientSession): Promise<IAttribute[]> {
    return AttributeModel.find(query, null, session ? { session } : undefined);
  }

  async findAttributeById(id: string): Promise<IAttribute | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return AttributeModel.findById(id);
  }

  async findAttributeOne(query: Record<string, any>, session?: ClientSession): Promise<IAttribute | null> {
    return AttributeModel.findOne(query, null, session ? { session } : undefined);
  }

  async createAttribute(data: Record<string, any> | Record<string, any>[], session?: ClientSession): Promise<any> {
    if (Array.isArray(data)) {
      return AttributeModel.create(data, session ? { session } : undefined);
    }
    return AttributeModel.create(data);
  }

  async updateAttributeById(id: string, updateData: Record<string, any>): Promise<IAttribute | null> {
    return AttributeModel.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  }

  async deleteAttributeById(id: string): Promise<IAttribute | null> {
    return AttributeModel.findByIdAndDelete(id);
  }

  async deleteAttributesByCategoryId(categoryId: string, session?: ClientSession): Promise<any> {
    return AttributeModel.deleteMany({ categoryId }, session ? { session } : undefined);
  }

  async deleteAttributesNotIn(categoryId: string, keepIds: Types.ObjectId[], session?: ClientSession): Promise<any> {
    return AttributeModel.deleteMany({ categoryId, _id: { $nin: keepIds } }, session ? { session } : undefined);
  }

  // Filter Operations
  async findFiltersByCategoryId(categoryId: string): Promise<ICategoryFilter[]> {
    return CategoryFilterModel.find({ categoryId })
      .populate('attributeId')
      .sort({ displayOrder: 1 });
  }

  async deleteFiltersByCategoryId(categoryId: string): Promise<any> {
    return CategoryFilterModel.deleteMany({ categoryId });
  }

  // Product Count Check for safety
  async countProductsByCategory(categoryId: string): Promise<number> {
    return ProductModel.countDocuments({
      $or: [{ category: categoryId }, { subcategory: categoryId }],
    });
  }
}

export const categoryRepository = new CategoryRepository();
