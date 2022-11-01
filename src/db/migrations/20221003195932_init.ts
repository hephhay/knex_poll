import { Knex } from "knex";

const validEmail = '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[\.][A-Za-z]+$';

export async function up(knex: Knex): Promise<void> {
    return knex.schema.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp" ')
            .createTable('user', (table) => {
                table.uuid('id', {useBinaryUuid: true, primaryKey: true}).defaultTo(knex.raw('uuid_generate_v4()'));
                table.string('email', 50).notNullable().unique().checkRegex(validEmail, 'valid_email');
                table.string('first_name', 30).notNullable();
                table.string('last_name', 30).notNullable();
                table.boolean('is_admin').notNullable().defaultTo(false);
                table.timestamps(true, true);
    });
}


export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTable('user').raw('DROP EXTENSION IF EXISTS "uuid-ossp" ');
}

