import {
	Column,
	CreateDateColumn,
	Entity,
	PrimaryColumn,
	UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
	@PrimaryColumn({ unique: true })
	id: string;

	@Column({ unique: true})
	username: string;

	@Column()
	passwordHash: string;

	@Column('varchar', { length: 500 })
	avatar: string;

	@Column({ default: false })
	isBeta: boolean;
	
	@Column({default: null})
	betaKey: string;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
