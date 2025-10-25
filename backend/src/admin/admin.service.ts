import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from './admin.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    private readonly jwtService: JwtService,
  ) {}

  async login({ email, password }: { email: string; password: string }) {
    const admin = await this.adminRepo.findOne({ where: { email } });
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload = { sub: admin.id, email: admin.email, role: admin.role };
    return {
      access_token: this.jwtService.sign(payload),
      admin: { id: admin.id, email: admin.email },
    };
  }
}