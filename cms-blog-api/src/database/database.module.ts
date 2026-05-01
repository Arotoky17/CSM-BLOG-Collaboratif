import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JsonDatabaseService } from './json-database.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Article, ArticleSchema } from '../articles/schemas/article.schema';
import { Category, CategorySchema } from '../categories/schemas/category.schema';
import { Comment, CommentSchema } from '../comments/schemas/comment.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Article.name, schema: ArticleSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Comment.name, schema: CommentSchema },
    ]),
  ],
  providers: [JsonDatabaseService],
  exports: [JsonDatabaseService, MongooseModule],
})
export class DatabaseModule {}
