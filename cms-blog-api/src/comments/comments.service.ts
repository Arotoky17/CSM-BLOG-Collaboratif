import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { JsonDatabaseService, JsonCollection } from '../database/json-database.service';

@Injectable()
export class CommentsService {
  private commentCollection: JsonCollection;

  constructor(private readonly jsonDb: JsonDatabaseService) {
    this.commentCollection = this.jsonDb.collection('comments');
  }

  async create(data: any, userId: string): Promise<any> {
    const newComment = {
      ...data,
      author: userId,
      status: 'pending',
      replies: [],
    };
    const saved = await this.commentCollection.insert(newComment);
    return this.populateComment(saved);
  }

  private async populateComment(comment: any) {
    if (!comment) return null;
    return this.jsonDb.collection('users').populate(comment, 'author', 'users', 'name avatar');
  }

  async getByArticle(articleId: string): Promise<any[]> {
    const comments = await this.commentCollection.find({ article: articleId, status: 'approved' });
    const sorted = comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return Promise.all(sorted.map(c => this.populateComment(c)));
  }

  async getPending(): Promise<any[]> {
    const comments = await this.commentCollection.find({ status: 'pending' });
    const sorted = comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return Promise.all(sorted.map(c => this.populateComment(c)));
  }

  async approve(id: string): Promise<any> {
    const updated = await this.commentCollection.update(id, { status: 'approved' });
    if (!updated) throw new NotFoundException('Commentaire non trouvé');
    return this.populateComment(updated);
  }

  async reject(id: string): Promise<void> {
    const deleted = await this.commentCollection.delete(id);
    if (!deleted) throw new NotFoundException('Commentaire non trouvé');
  }

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    const comment = await this.commentCollection.findById(id);
    if (!comment) throw new NotFoundException('Commentaire non trouvé');

    if (comment.author !== userId && userRole !== 'admin') {
      throw new ForbiddenException('Vous ne pouvez pas supprimer ce commentaire');
    }

    await this.commentCollection.delete(id);
  }
}