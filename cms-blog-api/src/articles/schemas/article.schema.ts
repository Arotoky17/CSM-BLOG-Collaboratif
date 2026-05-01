import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ArticleDocument = Article & Document;

export enum ArticleStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PUBLISHED = 'published',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true })
export class Article {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  author: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Category', default: null })
  category: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: String, enum: ArticleStatus, default: ArticleStatus.DRAFT })
  status: ArticleStatus;

  @Prop({ default: null })
  rejectionReason: string;

  @Prop({ default: null })
  publishedAt: Date;

  @Prop({ default: null })
  coverImage: string;

  @Prop({ default: false })
  isPinned: boolean;

  @Prop({ default: 0 })
  viewCount: number;

  @Prop({ default: 0 })
  readTime: number;

  @Prop({ default: null })
  excerpt: string;
}

export const ArticleSchema = SchemaFactory.createForClass(Article);

// Index full-text pour la recherche
ArticleSchema.index({ title: 'text', content: 'text', tags: 'text' });
// Index composé pour le feed
ArticleSchema.index({ status: 1, publishedAt: -1 });
