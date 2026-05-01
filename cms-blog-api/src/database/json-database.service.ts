import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import * as fs from 'fs/promises';
import * as path from 'path';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Article, ArticleDocument } from '../articles/schemas/article.schema';
import { Category, CategoryDocument } from '../categories/schemas/category.schema';
import { Comment, CommentDocument } from '../comments/schemas/comment.schema';

export type JsonFilter = Record<string, any>;

export interface JsonDocument {
  _id?: string;
  [key: string]: any;
}

export interface JsonCollection {
  find(filter?: JsonFilter): Promise<JsonDocument[]>;
  findOne(filter?: JsonFilter): Promise<JsonDocument | null>;
  findById(id: string): Promise<JsonDocument | null>;
  insert(doc: JsonDocument): Promise<JsonDocument>;
  update(id: string, update: Partial<JsonDocument>): Promise<JsonDocument | null>;
  delete(id: string): Promise<boolean>;
  count(filter?: JsonFilter): Promise<number>;
  populate<T extends JsonDocument>(
    doc: T | T[],
    path: string,
    collectionName: string,
    select?: string,
  ): Promise<T | T[]>;
}

@Injectable()
export class JsonDatabaseService implements OnModuleInit {
  private collections: Record<string, JsonCollection> = {};
  private models: Record<string, Model<any>> = {};

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Article.name) private articleModel: Model<ArticleDocument>,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
  ) {
    this.models = {
      users: userModel,
      articles: articleModel,
      categories: categoryModel,
      comments: commentModel,
    };
  }

  async onModuleInit() {
    await this.migrateFromJsonIfNeeded();
  }

  private async migrateFromJsonIfNeeded() {
    const userCount = await this.userModel.countDocuments();
    if (userCount > 0) {
      console.log('[MONGODB] Collections already contain data. Skipping migration.');
      return;
    }

    const filePath = path.join(process.cwd(), 'storage', 'data.json');
    try {
      await fs.access(filePath);
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      console.log('[MONGODB] Starting migration from data.json...');

      // 1. Migrate Categories
      if (data.categories) {
        console.log(`[MONGODB] Migrating ${data.categories.length} categories...`);
        for (const cat of data.categories) {
          const { _id, ...rest } = cat;
          await this.categoryModel.create({ 
            ...rest, 
            _id: isValidObjectId(_id) ? new Types.ObjectId(_id as any) : new Types.ObjectId() 
          });
        }
      }

      // 2. Migrate Users
      if (data.users) {
        console.log(`[MONGODB] Migrating ${data.users.length} users...`);
        for (const user of data.users) {
          const { _id, ...rest } = user;
          await this.userModel.create({ 
            ...rest, 
            _id: isValidObjectId(_id) ? new Types.ObjectId(_id as any) : new Types.ObjectId() 
          });
        }
      }

      // 3. Migrate Articles
      if (data.articles) {
        console.log(`[MONGODB] Migrating ${data.articles.length} articles...`);
        for (const art of data.articles) {
          const { _id, author, category, ...rest } = art;
          await this.articleModel.create({
            ...rest,
            _id: isValidObjectId(_id) ? new Types.ObjectId(_id as any) : new Types.ObjectId(),
            author: isValidObjectId(author) ? new Types.ObjectId(author as any) : null,
            category: (category && isValidObjectId(category)) ? new Types.ObjectId(category as any) : null,
          });
        }
      }

      // 4. Migrate Comments
      if (data.comments) {
        console.log(`[MONGODB] Migrating ${data.comments.length} comments...`);
        for (const com of data.comments) {
          const { _id, author, article, ...rest } = com;
          await this.commentModel.create({
            ...rest,
            _id: isValidObjectId(_id) ? new Types.ObjectId(_id as any) : new Types.ObjectId(),
            author: isValidObjectId(author) ? new Types.ObjectId(author as any) : null,
            article: isValidObjectId(article) ? new Types.ObjectId(article as any) : null,
          });
        }
      }

      console.log('[MONGODB] Migration completed successfully.');
    } catch (err) {
      console.error('[MONGODB] Error during migration:', err);
      await this.seedDefaultAdmin();
    }
  }

  private async seedDefaultAdmin() {
    await this.userModel.create({
      name: 'Admin User',
      email: 'admin@novapulse.com',
      password: '$2b$10$LC.mgo0.JlMleroCuYqQO.TgZxtDVfa.HrjKtCQbVqE/1T14jT8vW',
      role: 'admin',
      bio: 'Administrateur du site',
      isActive: true,
    });
  }

  collection<T extends JsonDocument>(name: string): JsonCollection {
    if (!this.collections[name]) {
      this.collections[name] = new MongoCollectionWrapper(name, this.models[name], this.models);
    }
    return this.collections[name] as JsonCollection;
  }
}

class MongoCollectionWrapper implements JsonCollection {
  constructor(
    private name: string, 
    private model: Model<any>,
    private allModels: Record<string, Model<any>>
  ) {}

  private mapId(filter: JsonFilter): any {
    if (!filter) return {};
    const mapped = { ...filter };
    if (mapped._id) {
      if (typeof mapped._id === 'string' && isValidObjectId(mapped._id)) {
        mapped._id = new Types.ObjectId(mapped._id as any);
      } else if (mapped._id.$in) {
        mapped._id.$in = mapped._id.$in
          .filter((id: string) => isValidObjectId(id))
          .map((id: string) => new Types.ObjectId(id as any));
      }
    }
    return mapped;
  }

  async find(filter: JsonFilter = {}): Promise<JsonDocument[]> {
    const mongoFilter = this.mapId(filter);
    const results = await this.model.find(mongoFilter).lean().exec();
    return results.map(r => ({ ...r, _id: r._id.toString() }));
  }

  async findOne(filter: JsonFilter = {}): Promise<JsonDocument | null> {
    const mongoFilter = this.mapId(filter);
    const result = await this.model.findOne(mongoFilter).lean().exec();
    return result ? { ...result, _id: result._id.toString() } : null;
  }

  async findById(id: string): Promise<JsonDocument | null> {
    if (!isValidObjectId(id)) return null;
    const result = await this.model.findById(new Types.ObjectId(id as any)).lean().exec();
    return result ? { ...result, _id: result._id.toString() } : null;
  }

  async insert(doc: JsonDocument): Promise<JsonDocument> {
    const created = await this.model.create(doc);
    const result = created.toObject();
    return { ...result, _id: result._id.toString() };
  }

  async update(id: string, update: Partial<JsonDocument>): Promise<JsonDocument | null> {
    if (!isValidObjectId(id)) return null;
    const updated = await this.model
      .findByIdAndUpdate(new Types.ObjectId(id as any), update, { new: true })
      .lean()
      .exec();
    return updated ? { ...updated, _id: updated._id.toString() } : null;
  }

  async delete(id: string): Promise<boolean> {
    if (!isValidObjectId(id)) return false;
    const deleted = await this.model.findByIdAndDelete(new Types.ObjectId(id as any)).exec();
    return !!deleted;
  }

  async count(filter: JsonFilter = {}): Promise<number> {
    const mongoFilter = this.mapId(filter);
    return this.model.countDocuments(mongoFilter).exec();
  }

  async populate<T extends JsonDocument>(
    doc: T | T[],
    path: string,
    collectionName: string,
    select?: string,
  ): Promise<T | T[]> {
    const isArray = Array.isArray(doc);
    const docs = isArray ? doc : [doc];
    const refModel = this.allModels[collectionName];

    if (!refModel) return isArray ? (docs as T[]) : (docs[0] as T);

    const results = await Promise.all(
      docs.map(async (d) => {
        const refId = d[path];
        if (!refId || !isValidObjectId(refId)) return d;
        
        const refDoc = await refModel.findById(new Types.ObjectId(refId as any)).lean().exec();
        if (!refDoc) return { ...d, [path]: null };

        const mappedRef = { ...refDoc, _id: refDoc._id.toString() };
        if (select) {
          const fields = select.split(' ').reduce((acc, field) => {
            acc[field] = mappedRef[field];
            return acc;
          }, {} as any);
          return { ...d, [path]: fields };
        }
        return { ...d, [path]: mappedRef };
      }),
    );

    return isArray ? (results as T[]) : results[0];
  }
}
