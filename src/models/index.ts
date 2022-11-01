import { SchemaComposer } from "graphql-compose";

const schemaComposer = new SchemaComposer();

import { Model } from "objection";
import db from '../db';

Model.knex(db);

export { schemaComposer }

export * from './choice.model';
export * from './user.model';
export * from './vote.model';
export * from './poll.model';