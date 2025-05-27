// src/db/schema.ts
import { pgTable, serial, text, varchar } from 'drizzle-orm/pg-core';

export const classes = pgTable('classes', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }),
  description: text('description'),
});
