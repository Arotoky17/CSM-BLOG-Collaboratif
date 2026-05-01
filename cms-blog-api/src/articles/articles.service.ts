import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { JsonDatabaseService, JsonCollection } from '../database/json-database.service';
import { ArticleStatus } from './schemas/article.schema';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@Injectable()
export class ArticlesService {
  private articleCollection: JsonCollection;

  constructor(private readonly jsonDb: JsonDatabaseService) {
    this.articleCollection = this.jsonDb.collection('articles');
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>?/gm, '');
  }

  private calculateReadTime(content: string): number {
    const words = this.stripHtml(content).split(/\s+/).length;
    return Math.ceil(words / 200);
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  }

  async create(createArticleDto: CreateArticleDto, userId: string): Promise<any> {
    const slug = this.generateSlug(createArticleDto.title);
    
    let uniqueSlug = slug;
    let count = 1;
    while (await this.articleCollection.findOne({ slug: uniqueSlug })) {
      uniqueSlug = `${slug}-${count++}`;
    }

    const readTime = this.calculateReadTime(createArticleDto.content);
    const excerpt = createArticleDto.content ? this.stripHtml(createArticleDto.content).slice(0, 250) : '';

    const newArticle = {
      ...createArticleDto,
      slug: uniqueSlug,
      author: userId,
      category: createArticleDto.category || null,
      status: createArticleDto.status || ArticleStatus.DRAFT,
      publishedAt: (createArticleDto.status === ArticleStatus.PUBLISHED) ? new Date().toISOString() : null,
      readTime,
      excerpt: createArticleDto.excerpt || excerpt,
      viewCount: 0,
      likes: [],
      isPinned: false,
    };

    const saved = await this.articleCollection.insert(newArticle);
    return this.populateArticle(saved);
  }

  private async populateArticle(article: any) {
    if (!article) return null;
    let populated = await this.jsonDb.collection('users').populate(article, 'author', 'users', 'name avatar bio');
    populated = await this.jsonDb.collection('categories').populate(populated, 'category', 'categories', 'name slug color');
    return populated;
  }

  async findFeatured(): Promise<any> {
    const articles = await this.articleCollection.find({ status: ArticleStatus.PUBLISHED, isPinned: true });
    let article = articles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())[0];

    if (!article) {
      const allPublished = await this.articleCollection.find({ status: ArticleStatus.PUBLISHED });
      article = allPublished.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))[0];
    }

    if (!article) throw new NotFoundException('Aucun article à la une trouvé');
    return this.populateArticle(article);
  }

  async getTrending(limit: number = 3): Promise<any[]> {
    const published = await this.articleCollection.find({ status: ArticleStatus.PUBLISHED });
    const sorted = published.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, limit);
    return Promise.all(sorted.map(a => this.populateArticle(a)));
  }

  async findAllPublished(page: number = 1, limit: number = 10, categoryId?: string, excludeId?: string) {
    const skip = (page - 1) * limit;
    const filter: any = { status: ArticleStatus.PUBLISHED };
    
    if (categoryId) filter.category = categoryId;

    let articles = await this.articleCollection.find(filter);
    
    if (excludeId) {
      articles = articles.filter(a => a._id !== excludeId);
    }

    const total = articles.length;
    const data = articles
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(skip, skip + limit);

    const populatedData = await Promise.all(data.map(a => this.populateArticle(a)));
    return { data: populatedData, total, page, limit };
  }

  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const articles = await this.articleCollection.find();
    const total = articles.length;
    const data = articles
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(skip, skip + limit);

    const populatedData = await Promise.all(data.map(a => this.populateArticle(a)));
    return { data: populatedData, total, page, limit };
  }

  async findByAuthor(userId: string) {
    const articles = await this.articleCollection.find({ author: userId });
    const sorted = articles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return Promise.all(sorted.map(a => this.populateArticle(a)));
  }

  async findBySlug(slug: string, userId?: string, userRole?: string): Promise<any> {
    const article = await this.articleCollection.findOne({ slug });
    
    if (!article) throw new NotFoundException('Article non trouvé');

    // Permissions check
    if (article.status !== ArticleStatus.PUBLISHED) {
      const isAuthor = article.author === userId;
      const isAdminOrEditor = userRole && ['admin', 'editor'].includes(userRole);
      if (!isAuthor && !isAdminOrEditor) {
        throw new NotFoundException('Article non trouvé');
      }
    }

    // Increment view count if published
    if (article.status === ArticleStatus.PUBLISHED && article._id) {
      await this.articleCollection.update(article._id, { viewCount: (article.viewCount || 0) + 1 });
    }

    return this.populateArticle(article);
  }

  async findById(id: string): Promise<any> {
    const article = await this.articleCollection.findById(id);
    if (!article) throw new NotFoundException('Article non trouvé');
    return this.populateArticle(article);
  }

  async update(id: string, updateArticleDto: UpdateArticleDto, userId: string, userRole: string): Promise<any> {
    const article = await this.articleCollection.findById(id);
    if (!article) throw new NotFoundException('Article non trouvé');

    if (article.author !== userId && !['admin', 'editor'].includes(userRole)) {
      throw new ForbiddenException('Vous ne pouvez pas modifier cet article');
    }

    const updateData: any = { ...updateArticleDto };
    
    if (updateArticleDto.content) {
      updateData.readTime = this.calculateReadTime(updateArticleDto.content);
      if (!updateArticleDto.excerpt) {
        updateData.excerpt = this.stripHtml(updateArticleDto.content).slice(0, 250);
      }
    }
    
    if (updateArticleDto.status === ArticleStatus.PUBLISHED && !article.publishedAt) {
      updateData.publishedAt = new Date().toISOString();
    }

    const updated = await this.articleCollection.update(id, updateData);
    return this.populateArticle(updated);
  }

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    const article = await this.articleCollection.findById(id);
    if (!article) throw new NotFoundException('Article non trouvé');

    if (article.author !== userId && userRole !== 'admin') {
      throw new ForbiddenException('Vous ne pouvez pas supprimer cet article');
    }

    await this.articleCollection.delete(id);
  }

  async search(query: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const regex = new RegExp(query, 'i');
    
    const articles = await this.articleCollection.find({ status: ArticleStatus.PUBLISHED });
    const matched = articles.filter(a => 
      regex.test(a.title) || 
      regex.test(a.content) || 
      (a.tags && a.tags.some(t => regex.test(t)))
    );

    const total = matched.length;
    const data = matched
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(skip, skip + limit);

    const populatedData = await Promise.all(data.map(a => this.populateArticle(a)));
    return { data: populatedData, total, page, limit };
  }
}