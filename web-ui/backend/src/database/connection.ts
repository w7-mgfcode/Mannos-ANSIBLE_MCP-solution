import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from './models/User.js';
import { Playbook } from './models/Playbook.js';
import { Execution } from './models/Execution.js';
import { Job } from './models/Job.js';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'awx',
  database: process.env.DB_NAME || 'ansible_mcp',
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
  entities: [User, Playbook, Execution, Job],
  migrations: [],
  subscribers: [],
});

export async function initializeDatabase(): Promise<void> {
  try {
    await AppDataSource.initialize();
    console.log('Database connection established');
  } catch (error) {
    console.error('Error connecting to database:', error);
    throw error;
  }
}

export { User, Playbook, Execution, Job };
