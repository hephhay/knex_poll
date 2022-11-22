import { deepmerge, ProjectionType } from "graphql-compose";
import _ from "lodash";
import { QueryBuilder } from "objection";

import {
    BaseType,
    DeepBaseType,
    FieldType,
    GenericModel,
    orderModel,
    SortType
} from "../generator";

// type tempVal = put all possible types

export function pickByRecursive<T extends object>(objMap: T, condition: (value: T, key: string) => boolean) {

    let retMap = _.pickBy(
        objMap,
        (objValue, objKey) => _.isObject(objValue) || condition(objValue as T, objKey)
    );

    _.forOwn(retMap, (value, key) => {
        if(_.isObject(value) && !(value instanceof Date) ){

            const newMap = pickByRecursive(value as T, condition);

            if(_.isEmpty(newMap))
                _.unset(retMap, key)
            else
                _.set(retMap, key, newMap);

        }

    });

    return retMap;

}

export function pickFieldGraph<TSource extends typeof GenericModel>
(
    objInfo: ProjectionType,
    sortArg: SortType,
    model: TSource,
) {

    const mod = pickRelation(objInfo, model, pickModifiers);

    const sort = pickRelation(sortArg, model, orderByModifier);

    return deepmerge(sort, mod);

}

export function pickRelation<TSource extends typeof GenericModel>
(
    objInfo: ProjectionType,
    model: TSource,
    caller: (objInfo: ProjectionType, model: TSource) => any[],
    depth = 0
) {

    const relMaps = resolveVal(model.relationMappings);

    let retGraph = _.pick(objInfo, Object.keys(relMaps));

    if (depth > 0){
        const modifiers = caller(objInfo, model);
        if(!_.isEmpty(modifiers)) retGraph['$modify'] = modifiers;
    }

    for( const [key, val] of Object.entries(retGraph)){
        if (key === '$modify') continue;

        const value: ProjectionType = val

        const mCls =  relMaps[key].modelClass;

        retGraph[key] = pickRelation(value, mCls as TSource, caller, depth + 1);
    }

    return _.mapValues(
        retGraph,
        val => _.isEmpty(val) || !_.isObject(val) ? true : val
    );

}

export function pickModifiers<TSource extends typeof GenericModel>(objInfo: ProjectionType, model: TSource){

    const modifiers = model.modifiers;

    let mods = _.intersection(Object.keys(modifiers ?? []), Object.keys(objInfo));

    return mods.map(key => modifiers[key]);

    

}

export function orderByModifier<TSource extends typeof GenericModel>
(sortArg: SortType, model: TSource) {

    return [
        function (query: QueryBuilder<GenericModel>) {
            query.orderBy(orderModel(sortArg, model));
        }
    ];

}

export function mapValuesRecursive<T extends object, TIn, TRet>
(value: T, changeFN: (scalarType: TIn) => TRet): { [P in keyof T]: any} {
    return _.mapValues(value, opType => {
        if(_.isObject(opType)  && _.size(opType))
            return mapValuesRecursive(opType, changeFN);

        else
            return changeFN(opType as TIn);
    });
}

export function flatSchema <T extends object>(collection: T, keys: Array<string> = []): any[]{
    return _.isObject(collection) ?
        _.flatMap(collection, (value, key) => flatSchema(value as T, [...keys, key])) as any
            :keys.join('.');
}

export function flattenObj(collection: DeepBaseType, baseName: string, parent?: string, res:BaseType = {}, depth = 0){
    for(let key in collection){

        let propName = parent ? parent + '.'  + key : key;

        if(typeof collection[key] == 'object')
            flattenObj(
                collection[key] as DeepBaseType,
                '',
                propName,
                res,
                depth + 1
            );
        else
            res[`${baseName === '' ? '' : _.lowerCase(baseName)+'.'}${propName}`] = collection[key] as FieldType;
    }
    return res;
}

export function deepMapKeys(
    originalObject: DeepBaseType | DeepBaseType [],
    callback: (key: string) => string
): DeepBaseType | DeepBaseType[] {

    if (Array.isArray(originalObject))
        return originalObject.map(item => deepMapKeys(item, callback)) as DeepBaseType[];

    else if (typeof originalObject !== 'object')
        return originalObject;

    return Object.keys(originalObject || {}).reduce((newObject, key) => {

        const newKey = callback(key);
        const originalValue = originalObject[key];
        let newValue = originalValue;

        if (typeof originalValue === 'object')
            newValue = deepMapKeys(originalValue as DeepBaseType, callback);

        return {
            ...newObject,
            [newKey]: newValue,
        }

    }, {} as DeepBaseType);

}

export const resolveVal = <T>(funVal: T | (() => T)) =>  
    _.isFunction(funVal) ? funVal() : funVal;