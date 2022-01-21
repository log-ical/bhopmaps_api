import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateUserDto } from './Dto/update-user.dto';
import { User } from './Entities/user.entity';
import { Map } from './Entities/map.entity';
import { S3 } from 'aws-sdk';
import { nanoid } from 'nanoid';
require('dotenv').config();

@Injectable()
export class AppService {
	constructor(
		@InjectRepository(User) private userRepository: Repository<User>,
		@InjectRepository(Map)
		private mapRepository: Repository<Map>,
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
		delete toUpdate.createdAt;
		let updated = Object.assign(toUpdate, dto);
		return await this.userRepository.save(updated);
	}

	async delete(id: string): Promise<any> {
		return await this.userRepository.delete({ id });
	}

	// Todo: Fix double uplaod

	async uploadFile(dataBuffer: Buffer, filename: string) {
		const s3 = new S3();
		const uploadResult = await s3
			.upload({
				Bucket: process.env.S3_BUCKET,
				Body: dataBuffer,
				Key: `${nanoid(8)}.zip`,
			})
			.promise();

		const newFile = this.mapRepository.create({
			id: uploadResult.Key.replace('.zip', ''),
			download: uploadResult.Location,
		});

		await this.mapRepository.save(newFile);
		return newFile;
	}

	async addMap(
		id: string,
		author: string,
		authorId: string,
		mapName: string,
		thumbnail: string,
		description: string,
		fileBuffer: Buffer,
		download: string,
	) {
		return await this.mapRepository.save({
			id,
			author,
			authorId,
			mapName,
			thumbnail,
			description,
			fileBuffer,
			download,
		});
	}

	async getAllMaps() {
		return await this.mapRepository.find();
	}

	async findMap(id: string): Promise<Map> {
		return await this.mapRepository.findOne({id});
	}

	async deleteMap(fileId: string) {
		const file = await this.mapRepository.findOne({ id: fileId });
		const s3 = new S3();
		await s3
			.deleteObject({
				Bucket: process.env.S3_BUCKET,
				Key: `${file.id}.zip`,
			})
			.promise();
		await this.mapRepository.delete(fileId);
	}
}
