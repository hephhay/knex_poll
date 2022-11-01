import { schemaComposer }  from '../models';
import './user.shema';
import './choice.shema';
import './poll.shema';
import './vote.shema';

export const schema = schemaComposer.buildSchema();