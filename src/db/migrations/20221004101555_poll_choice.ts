import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable('poll', (table) => {
        table.uuid('id', {useBinaryUuid: true, primaryKey: true}).defaultTo(knex.raw('uuid_generate_v4()'));
        table.string('title', 100).notNullable().unique();
        table.uuid('created_by').references('id').inTable('user').onDelete('CASCADE').onUpdate('CASCADE').deferrable('deferred');
        table.text('description');
        table.timestamps(true, true);
    }).createTable('choice', (table) => {
        table.uuid('id', {useBinaryUuid: true, primaryKey: true}).defaultTo(knex.raw('uuid_generate_v4()'));
        table.uuid('poll_id').references('id').inTable('poll').onDelete('CASCADE').onUpdate('CASCADE').deferrable('deferred');
        table.string('name', 100).notNullable();
        table.timestamps(true, true);
    });
}


export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTable('choice')
                        .dropTable('poll');
}

