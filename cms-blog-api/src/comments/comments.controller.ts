import {
  Controller, Get, Post, Put, Delete,
  Body, Param, UseGuards, Request
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  // Route publique
  @Get('article/:articleId')
  findByArticle(@Param('articleId') articleId: string) {
    return this.commentsService.getByArticle(articleId);
  }

  // Routes protégées
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createCommentDto: CreateCommentDto, @Request() req: any) {
    return this.commentsService.create(createCommentDto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.commentsService.remove(id, req.user.userId, req.user.role);
  }

  // Routes admin/editor uniquement
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @Get('admin/pending')
  findAllPending() {
    return this.commentsService.getPending();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @Put(':id/approve')
  approve(@Param('id') id: string) {
    return this.commentsService.approve(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @Put(':id/reject')
  reject(@Param('id') id: string) {
    return this.commentsService.reject(id);
  }
}