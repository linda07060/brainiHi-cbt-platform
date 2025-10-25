import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  public async validateUser(email: string, password: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) return null;
    return user;
  }

  public async login({ email, password }: { email: string; password: string }) {
    const user = await this.validateUser(email, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const payload = { sub: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan, level: user.level, plan_expiry: user.plan_expiry };
    return {
      access_token: this.jwtService.sign(payload, {
        secret: this.configService.get('JWT_SECRET'),
      }),
      user: payload,
    };
  }

  public async register({ email, password, name }: { email: string; password: string; name: string }) {
    const exists = await this.userRepo.findOne({ where: { email } });
    if (exists) throw new UnauthorizedException('Email already registered');
    const hash = await bcrypt.hash(password, 10);
    const user = this.userRepo.create({ email, password: hash, name });
    await this.userRepo.save(user);
    return this.login({ email, password });
  }

  public async changePassword(id: number, oldPassword: string, newPassword: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user || !(await bcrypt.compare(oldPassword, user.password))) throw new UnauthorizedException('Invalid credentials');
    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepo.save(user);
    return { message: 'Password changed' };
  }

  public async findById(id: number) {
    return this.userRepo.findOne({ where: { id } });
  }

  public async validateGoogleUser(googleProfile: any) {
    let user = await this.userRepo.findOne({ where: { email: googleProfile.email } });
    if (!user) {
      user = this.userRepo.create({
        email: googleProfile.email,
        name: googleProfile.name,
        googleId: googleProfile.googleId,
        password: '', // Not used for Google accounts
      });
      await this.userRepo.save(user);
    }
    const payload = { sub: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan, level: user.level, plan_expiry: user.plan_expiry };
    return {
      access_token: this.jwtService.sign(payload, {
        secret: this.configService.get('JWT_SECRET'),
      }),
      user: payload,
    };
  }
}