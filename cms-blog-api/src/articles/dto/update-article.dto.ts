import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { CreateArticleDto } from './create-article.dto';
import { ArticleStatus } from '../schemas/article.schema';

export class UpdateArticleDto extends PartialType(CreateArticleDto) {
  @IsEnum(ArticleStatus)
  @IsOptional()
  status?: ArticleStatus;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}