import { Knex } from 'knex';

import { Model } from 'objection';
import { Choice } from '../../models';

export async function seed(knex: Knex): Promise<void> {
    Model.knex(knex);
    // Deletes ALL existing entries
    await knex('vote').del();

    // Inserts seed entries
    await Choice.relatedQuery('voters').for('23647e3a-9bf9-4089-91ad-f1e09176406d').relate(['e5d65a17-f362-433e-b13a-5d5544c159f5', '17379e14-62be-4b3a-9788-36e1dc95ff43']);
    await Choice.relatedQuery('voters').for('f8a43276-16bd-402e-81d2-a7ee468dd342').relate(['deb9b6f9-b302-4987-820f-a3e9133f4d26', 'dd1ff72a-11ec-442a-a794-529e656ffb38']);
    await Choice.relatedQuery('voters').for('bbb19816-691a-4ae0-ad3d-4891010ec76f').relate(['d8c330e8-f5a1-4a83-b785-993fcd044552', '8bd53998-1426-4137-9110-cfc913f1fba2']);
    await Choice.relatedQuery('voters').for('ac9c0c0c-32e9-4b06-9cb6-32479af68fcf').relate(['aad9a3a0-6602-4f98-b32f-914340ae095c', '8bd53998-1426-4137-9110-cfc913f1fba2', 'd8c330e8-f5a1-4a83-b785-993fcd044552']);
    await Choice.relatedQuery('voters').for('e3e7d640-1868-47c5-9825-611247850d66').relate(['dd1ff72a-11ec-442a-a794-529e656ffb38', 'deb9b6f9-b302-4987-820f-a3e9133f4d26']);
    await Choice.relatedQuery('voters').for('5014ae5c-ad7d-4031-8c19-c2a3c1dadba3').relate(['aad9a3a0-6602-4f98-b32f-914340ae095c', 'd8c330e8-f5a1-4a83-b785-993fcd044552', 'dd1ff72a-11ec-442a-a794-529e656ffb38', 'deb9b6f9-b302-4987-820f-a3e9133f4d26']);
    await Choice.relatedQuery('voters').for('dc20cbfd-cc92-45bc-a582-adbb5cae7f8b').relate(['17379e14-62be-4b3a-9788-36e1dc95ff43']);
};
