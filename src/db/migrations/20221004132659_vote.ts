import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable('vote', (table) => {
        table.uuid('user_id').references('id').inTable('user').onDelete('CASCADE').onUpdate('CASCADE').deferrable('deferred');
        table.uuid('choice_id').references('id').inTable('choice').onDelete('CASCADE').onUpdate('CASCADE').deferrable('deferred');
        table.timestamp('voted_on', {useTz: true}).defaultTo(knex.fn.now(6));
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTable('vote');
}