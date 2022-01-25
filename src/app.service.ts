import { Injectable, NotFoundException } from '@nestjs/common';
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

	// * Creating a user
	async create(data: any): Promise<User> {
		return await this.userRepository.save(data);
	}

	// * Find functions
	async findOneByUsername(username: string): Promise<User> {
		return await this.userRepository.findOne({ username });
	}

	async findAllUsers(): Promise<User[]> {
		return await this.userRepository.find();
	}

	async findOneById(id: string): Promise<User> {
		return await this.userRepository.findOne({ id });
	}

	async findeOneByMapId(id: string): Promise<Map> {
		return await this.mapRepository.findOne({ id });
	}

	async findAllMapsByAuthor(authorId: string): Promise<Map[]> {
		return await this.mapRepository.find({ authorId });
	}

	async findOne(condition: any): Promise<User> {
		return await this.userRepository.findOne(condition);
	}

	// * Updating user
	async update(id: string, dto: UpdateUserDto): Promise<User> {
		let toUpdate = await this.userRepository.findOne(id);
		delete toUpdate.passwordHash;
		delete toUpdate.createdAt;
		let updated = Object.assign(toUpdate, dto);
		return await this.userRepository.save(updated);
	}

	// * Updating Mapauthor when user updates his account name
	async updateMapAuthor(id: string, author: string): Promise<Map> {
		let toUpdate = await this.mapRepository.findOne(id);
		let updated = Object.assign(toUpdate, { author: author });
		return await this.mapRepository.save(updated);
	}

	// ! Deleting an Account
	async delete(id: string): Promise<any> {
		const maps = await this.mapRepository.find({ authorId: id });
		const s3 = new S3();
		for (let i = 0; i < maps.length; i++) {
			await s3

				.deleteObject({
					Bucket: process.env.S3_BUCKET,
					Key: `${maps[i].id}.zip`,
				})
				.promise();
			await this.mapRepository.delete(maps[i].id);
		}
		await this.userRepository.delete({ id });
		return;
	}

	// * Map related functions

	// async uploadThumbnailFile(fileBuffer: Buffer, filename: string) {
	// 	const s3 = new S3();
	// 	const fileKey = `${nanoid()}.png`;
	// 	const params = {
	// 		Bucket: process.env.S3_BUCKET,
	// 		Key: fileKey,
	// 		Body: fileBuffer,
	// 		ContentType: 'image/png',
	// 	};
	// 	await s3.upload(params).promise();
	// 	return fileKey;
	// }

	async uploadFile(dataBuffer: Buffer, filename: string) {
		const s3 = new S3();
		const uploadResult = await s3
			.upload({
				Bucket: process.env.S3_BUCKET,
				Body: dataBuffer,
				Key: `${nanoid(8)}.zip`,
			})
			.promise();
		const mapId = uploadResult.Key.replace('.zip', '');

		const newFile = this.mapRepository.create({
			id: mapId,
		});

		await this.mapRepository.save(newFile);
		return newFile;
	}

	// * Adding map to database
	async addMap(
		id: string,
		author: string,
		authorId: string,
		mapName: string,
		thumbnail: string,
		description: string,
		fileBuffer: Buffer,
		gameType: string,
	) {
		return await this.mapRepository.save({
			id,
			author,
			authorId,
			mapName,
			thumbnail,
			description,
			fileBuffer,
			gameType,
			bhopmapsUrl: `${process.env.ORIGIN_URL}/maps/${id}`,
		});
	}
	// Upload thumbnail and update map thumbnail
	async uploadThumbnail(id: string, thumbnail: Buffer) {
		const s3 = new S3();
		const fileKey = `images/${id}.png`;
		const params = {
			Bucket: process.env.S3_BUCKET,
			Key: fileKey,
			Body: thumbnail,
			ContentType: 'image/*',
			ACL: 'public-read',
		};
		await s3.upload(params).promise();

		const url = `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${fileKey}`;
		return url;
	}

	// * Find functions for maps
	async getAllMaps() {
		return await this.mapRepository
			.createQueryBuilder('map')
			.orderBy('map.createdAt', 'DESC')
			.getMany();
	}

	async findMap(id: string): Promise<Map> {
		return await this.mapRepository.findOne({ id });
	}

	// ! Deleting a map
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

	// * Downloading a map

	async downloadMap(id: string) {
		const s3 = new S3();

		const mapId = id;
		const file = await this.mapRepository.findOne({ id: mapId });
		if (!file) {
			return { message: 'Map not found' };
		}
		const fileKey = `${file.id.trim()}.zip`;

		const params = {
			Bucket: process.env.S3_BUCKET,
			Key: `${fileKey}`,
			Expires: 3,
		};

		const url = await s3.getSignedUrl('getObject', params);

		return {
			url: url,
		};
	}

	// Incrementing download count
	async incrementDownload(id: string) {
		const map = await this.mapRepository.findOne(id);
		return await this.mapRepository.save({
			id: map.id,
			downloads: map.downloads + 1,
		});
	}
}
