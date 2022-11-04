import { Model, RelationMapping } from "objection";
import { ThunkObjMap, GraphQLFieldConfig, GraphQLResolveInfo } from "graphql";
import { InputTypeComposer, ObjectTypeComposer } from "graphql-compose";
import _ from 'lodash';
import { type } from "os";

export type RelMap<M extends Model> = RelationMapping<M> & {
    typeComposer: ObjectTypeComposer | string
}

export interface RelMaps {
    [relationName: string]: RelMap<any>;
}

export type RelMapsThunk = () => RelMaps;

export interface CustomGraphQLFieldConfig<TSource, TContext, TArgs = any> extends GraphQLFieldConfig<TSource, TContext, TArgs>{
    input?: string
}

export class GenericModel extends Model{
    static optionalID?: string[] | string;

    static graqhqlSchema: ThunkObjMap<CustomGraphQLFieldConfig<any, any>>;

    static relationMappings: RelMaps| RelMapsThunk; 
}

export interface FieldTCMap<TContext>{

    [key : string] : string | InputTypeComposer<TContext>| FieldTCMap<TContext>;

}

export type InputDict<TContext> = _.Dictionary<string | InputTypeComposer<TContext> | FieldTCMap<TContext>>;

export type ScalarType = string | boolean | number | Date;

export type FieldType = ScalarType | Array<ScalarType>;

export type BaseType = {
    [fieldName: string]: FieldType;
}

// export type DeepBaseType = {
//     [fieldName: string]: FieldType | BaseType; 
// }

export interface DeepBaseType {
    [fieldName: string]: FieldType | BaseType | DeepBaseType | DeepBaseType[]; 
}

export interface SortType {
    [fieldName: string]: boolean | SortType
}

export interface OperatorType{
    _operator?: DeepBaseType;
}

export type FilterType = BaseType & OperatorType;

export type BaseWhere  = [string, FieldType];

export type WhereOp = [string, string, FieldType];

export type WhereParams = Array<WhereOp | BaseWhere>;

export interface ArgType{
    filter?: FilterType;
    sort?: SortType
    page?: Number
    size?: Number
    record?: DeepBaseType | DeepBaseType 
}

export interface ResolverParams<TContext>{
    source: BaseType,
    args: ArgType,
    context: TContext,
    info: GraphQLResolveInfo
}

export type ModelOrder = {
    column: string,
    order: 'DESC' | 'ASC',
    null?: 'first'| 'last'
}

export const operations = ['find', 'create'];

export const predicates = ['One', 'Many'];

const arithLike = ['Int', 'Float', 'Date'];

const charLike = ['String'];

const allLike = [...arithLike, ...charLike, 'ID'];

export const operators = {
    lt: {type: arithLike, map: '<'},
    lte: {type: arithLike, map: '<='},
    gt: {type: arithLike, map: '>'},
    gte: {type: arithLike, map: '>='},
    like: {type: charLike, map: 'ilike'},
    in: {type: allLike, map: 'in'}

}

export type OPValue =  keyof typeof operators

export const resolveMap: Record<string, string[]> = operations.reduce(
    (initial, current) => _.set(initial, current, predicates),
    {}
);

export * from './model_tc';
export * from './query_resolvers';
export * from './util.gen'