import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { JsonDatabaseService, JsonCollection } from '../database/json-database.service';
import { UserRole } from './schemas/user.schema';

@Injectable()
export class UsersService {
  private userCollection: JsonCollection;

  constructor(private readonly jsonDb: JsonDatabaseService) {
    this.userCollection = this.jsonDb.collection('users');
  }

  async create(data: Partial<any>): Promise<any> {
    const existing = await this.userCollection.findOne({ email: data.email });
    if (existing) {
      throw new ConflictException('Email already exists');
    }
    const createdUser = {
      ...data,
      role: data.role || UserRole.CLIENT,
      isActive: data.isActive !== false,
    };
    return this.userCollection.insert(createdUser);
  }

  async findByEmail(email: string): Promise<any | null> {
    return this.userCollection.findOne({ email });
  }

  async findById(id: string): Promise<any | null> {
    const user = await this.userCollection.findById(id);
    if (user) {
      const { password, ...rest } = user;
      return rest;
    }
    return null;
  }

  async findAll(): Promise<any[]> {
    const users = await this.userCollection.find();
    return users.map(user => {
      const { password, ...rest } = user;
      return rest;
    });
  }

  async updateRole(id: string, role: UserRole): Promise<any | null> {
    const updated = await this.userCollection.update(id, { role });
    if (!updated) throw new NotFoundException('Utilisateur non trouvé');
    const { password, ...rest } = updated;
    return rest;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.userCollection.delete(id);
    if (!deleted) throw new NotFoundException('Utilisateur non trouvé');
  }
}