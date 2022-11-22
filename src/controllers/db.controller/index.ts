import { ProjectionType } from 'graphql-compose';
import { Modifier, QueryBuilder } from 'objection';

import { DeepBaseType, GenericModel, ModelOrder, WhereParams } from '../../generator';


export type QueryCallback = (
    currentQuery : QueryBuilder<GenericModel>,
    queryProp: QueryProperties<typeof GenericModel>
)=> QueryBuilder<GenericModel, GenericModel[] | GenericModel>;

export type QueryProperties<TSource extends typeof GenericModel> = {
    model : TSource,
    single: boolean,
    where?: WhereParams,
    order?: ModelOrder[],
    relInfo?: ProjectionType,
    relField?: ProjectionType,
    modifiers: Modifier<QueryBuilder<GenericModel, GenericModel[]>>[],
    record?: DeepBaseType | DeepBaseType[]
}

export interface DBHelper{
    beforeQuery?: QueryCallback,
    actionQuery?: QueryCallback,
}

export * from './read';