import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, UseGuards, Request
} from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  // Routes publiques
  @Get()
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('category') category?: string,
    @Query('exclude') exclude?: string,
  ) {
    return this.articlesService.findAllPublished(Number(page), Number(limit), category, exclude);
  }

  @Get('featured')
  findFeatured() {
    return this.articlesService.findFeatured();
  }

  @Get('trending')
  getTrending(@Query('limit') limit: number = 3) {
    return this.articlesService.getTrending(Number(limit));
  }

  @Get('search')
  search(
    @Query('q') query: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.articlesService.search(query, page, limit);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':slug')
  findBySlug(@Param('slug') slug: string, @Request() req: any) {
    return this.articlesService.findBySlug(slug, req.user?.userId, req.user?.role);
  }

  // Routes protégées
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createArticleDto: CreateArticleDto, @Request() req: any) {
    return this.articlesService.create(createArticleDto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/my-articles')
  findMyArticles(@Request() req: any) {
    return this.articlesService.findByAuthor(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateArticleDto: UpdateArticleDto,
    @Request() req: any,
  ) {
    return this.articlesService.update(id, updateArticleDto, req.user.userId, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.articlesService.remove(id, req.user.userId, req.user.role);
  }

  // Routes admin/editor uniquement
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @Get('admin/all')
  findAllAdmin(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.articlesService.findAll(page, limit);
  }
}