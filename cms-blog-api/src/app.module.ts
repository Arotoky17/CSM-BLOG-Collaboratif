import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { WinstonModule } from 'nest-winston';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ArticlesModule } from './articles/articles.module';
import { CategoriesModule } from './categories/categories.module';
import { CommentsModule } from './comments/comments.module';
import { UploadModule } from './upload/upload.module';
import { winstonConfig } from './logger.config';

@Module({
   imports: [
     ConfigModule.forRoot({ isGlobal: true }),
     MongooseModule.forRootAsync({
       imports: [ConfigModule],
       useFactory: async (configService: ConfigService) => ({
         uri: configService.get<string>('MONGODB_URI'),
       }),
       inject: [ConfigService],
     }),
     WinstonModule.forRoot(winstonConfig),
     ServeStaticModule.forRoot({
       rootPath: join(__dirname, '..', 'uploads'),
       serveRoot: '/uploads',
     }),
     DatabaseModule,
     AuthModule,
     UsersModule,
     ArticlesModule,
     CategoriesModule,
     CommentsModule,
     UploadModule,
   ],
})
export class AppModule {}