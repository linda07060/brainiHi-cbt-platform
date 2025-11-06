import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findById(id: number): Promise<User | null> {
    // use findOneBy if you prefer the shorthand in TypeORM v0.3+
    return this.userRepository.findOne({ where: { id } });
  }

  /**
   * Create a single user.
   * repository.create(...) returns a User (not an array) for a single payload,
   * but repository.save(...) can be typed by TypeORM as returning User | User[] depending
   * on the value passed. To keep the method signature strict (Promise<User>) we
   * cast the save result to User here (safe because we pass a single entity).
   */
  async create(payload: Partial<User>): Promise<User> {
    const entity = this.userRepository.create(payload as any); // create a single User entity
    const saved = await this.userRepository.save(entity as User | any);
    return saved as User;
  }

  /**
   * Update returns the updated User (or null if not found).
   * Use update(...) then re-fetch to return the complete entity.
   */
  async update(id: number, payload: Partial<User>): Promise<User | null> {
    await this.userRepository.update(id, payload as any);
    return this.findById(id);
  }

  async remove(id: number): Promise<void> {
    await this.userRepository.delete(id);
  }
}