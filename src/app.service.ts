import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateUserDto } from './Dto/update-user.dto';
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
		return await this.userRepository.findOne(condition);
	}

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    let toUpdate = await this.userRepository.findOne(id);
    delete toUpdate.passwordHash;
    delete toUpdate.createdAt
    let updated = Object.assign(toUpdate, dto);
    return await this.userRepository.save(updated);
  }

}
