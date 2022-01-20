import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './Entities/user.entity';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  async create(data: any): Promise<User> {
    return await this.userRepository.save(data);
  }

  async findOneByUsername(username: string): Promise<User> {
    return await this.userRepository.findOne({ username });
  }

  async findOneById(id: string): Promise<User> {
    return await this.userRepository.findOne({ id });
  }

  async findOne(condition: any): Promise<User> {
    return this.userRepository.findOne(condition);
}
}
