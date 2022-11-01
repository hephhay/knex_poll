import { knex } from "knex" ;
import { Model } from "objection";

import config from "./knexfile";

const db = knex(config.development);
Model.knex(db);

db.on( 'query', function( queryData ) {
    console.log(queryData);
});


export default db;