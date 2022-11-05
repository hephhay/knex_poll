import { ProjectionType } from 'graphql-compose';
import { QueryBuilder } from 'objection';

import { DeepBaseType, GenericModel, ModelOrder, WhereParams } from '../generator';


export type QueryCallback = (
    currentQuery : QueryBuilder<GenericModel>,
    queryProp: QueryProperties
)=> void

export type QueryProperties = {
    single: boolean
    where?: WhereParams,
    order?: ModelOrder[],
    relInfo?: ProjectionType,
    relField?: ProjectionType,
    record?: DeepBaseType | DeepBaseType[]
}

export interface DBHelper{
    beforeQuery?: QueryCallback,
    actionQuery?: QueryCallback,
}

export * from './read';