import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ default: null })
  description: string;

  @Prop({ default: '#a855f7' })
  color: string;
}

export const CategorySchema = SchemaFactory.createForClass(Category);