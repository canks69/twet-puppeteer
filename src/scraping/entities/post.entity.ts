import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity()
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Unique('Post_link', ['link'])
  link: string;

  @Column()
  textContent: string;

  @Column({ nullable: true })
  videoUrl: string;

  @Column('simple-array')
  images: string[];

  @Column({ default: new Date() })
  createdAt: Date;
}
