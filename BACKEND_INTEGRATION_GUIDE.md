# 🔐 Backend Integration Guide - Rôles et Permissions NestJS

## 📋 Résumé des Changes Effectuées

### Frontend (Angular)
✅ Rôle `editor` maintenant disponible à l'inscription
✅ Navigation basée sur les rôles
✅ Contrôle d'accès aux pages par rôle
✅ 4 comptes de test pré-configurés
✅ Workflow d'approbation d'articles

---

## 🚀 Prochaines Étapes: Intégration Backend

### 1. Mettre à jour les Entités NestJS

**File**: `cms-blog-api/src/articles/schemas/article.schema.ts`

Ajouter les champs et l'enum de statut:

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ArticleStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PUBLISHED = 'published',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true })
export class Article extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ unique: true, required: true })
  slug: string;

  @Prop({ required: true })
  content: string;

  @Prop()
  coverImage?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  author: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Category' })
  category?: Types.ObjectId;

  @Prop([String])
  tags?: string[];

  @Prop({ enum: ArticleStatus, default: ArticleStatus.DRAFT })
  status: ArticleStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  rejectedBy?: Types.ObjectId;

  @Prop()
  rejectionReason?: string;

  @Prop()
  publishedAt?: Date;
}

export const ArticleSchema = SchemaFactory.createForClass(Article);
ArticleSchema.index({ slug: 1 }, { unique: true });
```

---

### 2. Mettre à jour l'Entité User

**File**: `cms-blog-api/src/users/schemas/user.schema.ts`

Ajouter l'enum des rôles:

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum UserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  AUTHOR = 'author',
  CLIENT = 'client',
}

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ unique: true, required: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ enum: UserRole, default: UserRole.CLIENT })
  role: UserRole;

  @Prop()
  avatar?: string;

  @Prop()
  bio?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
```

---

### 3. Créer les Guards de Rôles

**File**: `cms-blog-api/src/auth/guards/roles.guard.ts`

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) {
      return true; // No roles required
    }

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Accès refusé. Rôles requis: ${requiredRoles.join(', ')}`
      );
    }

    return true;
  }
}
```

---

### 4. Créer le Décorateur @Roles()

**File**: `cms-blog-api/src/auth/decorators/roles.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
```

---

### 5. Mettre à jour le ArticlesController

**File**: `cms-blog-api/src/articles/articles.controller.ts`

```typescript
import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ArticlesService } from './articles.service';
import { CreateArticleDto, UpdateArticleDto } from './dto';
import { UserRole } from '../users/schemas/user.schema';

@Controller('api/articles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ArticlesController {
  constructor(private articlesService: ArticlesService) {}

  // Public: Lire les articles published
  @Get()
  async getPublished(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.articlesService.findPublished(page, limit);
  }

  // Author + Editor + Admin: Créer un article
  @Post()
  @Roles(UserRole.AUTHOR, UserRole.EDITOR, UserRole.ADMIN)
  async create(@Body() dto: CreateArticleDto, @Req() req) {
    const userId = req.user.sub; // from JWT payload
    return this.articlesService.create(userId, dto);
  }

  // Editor + Admin: Approuver un article
  @Put(':id/approve')
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  async approve(@Param('id') id: string, @Req() req) {
    return this.articlesService.approve(id, req.user.sub);
  }

  // Editor + Admin: Rejeter un article
  @Put(':id/reject')
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  async reject(
    @Param('id') id: string,
    @Body() dto: { reason: string },
    @Req() req
  ) {
    return this.articlesService.reject(id, req.user.sub, dto.reason);
  }

  // Voir les articles en attente (Editor + Admin)
  @Get('pending')
  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  async getPending() {
    return this.articlesService.findPending();
  }

  // Author + Editor + Admin: Voir ses articles
  @Get('my-articles')
  @Roles(UserRole.AUTHOR, UserRole.EDITOR, UserRole.ADMIN)
  async getMyArticles(@Req() req) {
    return this.articlesService.findByAuthor(req.user.sub);
  }
}
```

---

### 6. Mettre à jour ArticlesService

```typescript
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Article, ArticleStatus } from './schemas/article.schema';
import { CreateArticleDto } from './dto';

@Injectable()
export class ArticlesService {
  constructor(@InjectModel(Article.name) private articleModel: Model<Article>) {}

  async create(authorId: string, dto: CreateArticleDto): Promise<Article> {
    // Les auteurs créent en 'pending', les éditeurs en 'draft'
    const status = authorRole === 'author' ? ArticleStatus.PENDING : ArticleStatus.DRAFT;

    const article = new this.articleModel({
      ...dto,
      author: authorId,
      status,
    });

    return article.save();
  }

  async approve(articleId: string, editorId: string): Promise<Article> {
    const article = await this.articleModel.findById(articleId);
    if (!article) throw new NotFoundException('Article not found');
    if (article.status !== ArticleStatus.PENDING) {
      throw new BadRequestException('Only pending articles can be approved');
    }

    article.status = ArticleStatus.PUBLISHED;
    article.approvedBy = editorId;
    article.publishedAt = new Date();

    return article.save();
  }

  async reject(articleId: string, editorId: string, reason: string): Promise<Article> {
    const article = await this.articleModel.findById(articleId);
    if (!article) throw new NotFoundException('Article not found');
    if (article.status !== ArticleStatus.PENDING) {
      throw new BadRequestException('Only pending articles can be rejected');
    }

    article.status = ArticleStatus.REJECTED;
    article.rejectedBy = editorId;
    article.rejectionReason = reason;

    return article.save();
  }

  async findPublished(page = 1, limit = 10): Promise<any> {
    const skip = (page - 1) * limit;
    const articles = await this.articleModel
      .find({ status: ArticleStatus.PUBLISHED })
      .populate('author', 'name email avatar')
      .populate('category', 'name slug')
      .skip(skip)
      .limit(limit)
      .sort({ publishedAt: -1 });

    const total = await this.articleModel.countDocuments({ status: ArticleStatus.PUBLISHED });
    return { data: articles, total, page, limit };
  }

  async findPending(): Promise<Article[]> {
    return this.articleModel
      .find({ status: ArticleStatus.PENDING })
      .populate('author', 'name email avatar')
      .populate('category', 'name slug')
      .sort({ createdAt: -1 });
  }

  async findByAuthor(authorId: string): Promise<Article[]> {
    return this.articleModel
      .find({ author: authorId })
      .populate('category', 'name slug')
      .sort({ createdAt: -1 });
  }
}
```

---

### 7. Mettre à jour le JWT Payload

**File**: `cms-blog-api/src/auth/interfaces/jwt-payload.interface.ts`

```typescript
export interface JwtPayload {
  sub: string;        // user id
  email: string;
  name: string;
  role: string;       // ADD THIS
  iat?: number;
  exp?: number;
}
```

---

### 8. Ajouter les Routes dans app.module.ts

Assurez-vous que `RolesGuard` est enregistré globalement:

```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
```

---

## 📊 Mappage Frontend → Backend

| Frontend | Backend |
|----------|---------|
| `mock-storage.ts` validation | `RolesGuard` + `Roles` decorator |
| `ArticlesService.getAll()` | `GET /api/articles` |
| `ArticlesService.getBySlug()` | `GET /api/articles/:slug` |
| `ArticlesService.create()` | `POST /api/articles` |
| `moderation.component.ts` approve | `PUT /api/articles/:id/approve` |
| `moderation.component.ts` reject | `PUT /api/articles/:id/reject` |

---

## 🧪 Tester avec Postman

### 1. Login admin
```
POST http://localhost:3000/api/auth/login
{
  "email": "admin@example.com",
  "password": "admin123"
}
```

Response:
```json
{
  "access_token": "eyJ...",
  "user": {
    "id": "...",
    "role": "admin"
  }
}
```

### 2. Créer un article (as author)
```
POST http://localhost:3000/api/articles
Headers: Authorization: Bearer <token>
{
  "title": "My Article",
  "content": "<p>Content</p>",
  "slug": "my-article",
  "category": "tech"
}
```

### 3. Approuver (as editor)
```
PUT http://localhost:3000/api/articles/{id}/approve
Headers: Authorization: Bearer <editor_token>
```

---

## ✅ Checklist de Migration

- [ ] Mettre à jour les schémas MongoDB (Article, User)
- [ ] Créer `RolesGuard` et décorateur `@Roles()`
- [ ] Mettre à jour `JWT payload` avec le rôle
- [ ] Ajouter les endpoints d'approbation/rejet
- [ ] Implémenter la logique de statut d'article
- [ ] Tester avec les 4 rôles
- [ ] Ajouter la validation côté backend
- [ ] Sécuriser les endpoints sensibles
- [ ] Ajouter les notifications (futur)

---

## 🚨 Important

En production, **TOUJOURS valider les rôles côté backend**, jamais côté frontend.
Le frontend peut être contourné, le backend ne peut pas!

