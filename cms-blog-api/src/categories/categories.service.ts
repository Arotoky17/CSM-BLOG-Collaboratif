import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { JsonDatabaseService, JsonCollection } from '../database/json-database.service';

@Injectable()
export class CategoriesService {
  private categoryCollection: JsonCollection;
  private articleCollection: JsonCollection;

  constructor(private readonly jsonDb: JsonDatabaseService) {
    this.categoryCollection = this.jsonDb.collection('categories');
    this.articleCollection = this.jsonDb.collection('articles');
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  }

  async create(data: any): Promise<any> {
    const slug = this.generateSlug(data.name);
    const existing = await this.categoryCollection.findOne({ slug });
    if (existing) throw new ConflictException('Cette catégorie existe déjà');

    return this.categoryCollection.insert({
      ...data,
      slug,
    });
  }

  async findAll(): Promise<any[]> {
    const categories = await this.categoryCollection.find();
    return Promise.all(categories.map(async cat => {
      const count = await this.articleCollection.count({ category: cat._id, status: 'published' });
      return { ...cat, articleCount: count };
    }));
  }

  async findBySlug(slug: string): Promise<any> {
    const category = await this.categoryCollection.findOne({ slug });
    if (!category) throw new NotFoundException('Catégorie non trouvée');
    return category;
  }

  async findById(id: string): Promise<any> {
    const category = await this.categoryCollection.findById(id);
    if (!category) throw new NotFoundException('Catégorie non trouvée');
    return category;
  }

  async update(id: string, data: any): Promise<any> {
    if (data.name) {
      data.slug = this.generateSlug(data.name);
    }
    const updated = await this.categoryCollection.update(id, data);
    if (!updated) throw new NotFoundException('Catégorie non trouvée');
    return updated;
  }

  async remove(id: string): Promise<void> {
    // Vérifier si des articles utilisent cette catégorie
    const articles = await this.articleCollection.find({ category: id });
    if (articles.length > 0) {
      throw new ConflictException('Impossible de supprimer une catégorie utilisée par des articles');
    }
    const deleted = await this.categoryCollection.delete(id);
    if (!deleted) throw new NotFoundException('Catégorie non trouvée');
  }
}