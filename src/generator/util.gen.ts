import { ProjectionType } from "graphql-compose";
import _ from "lodash";

import {
    BaseType,
    DeepBaseType,
    FieldType,
    GenericModel
} from "../generator";

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

export function pickRelation<TSource extends typeof GenericModel>(objInfo: ProjectionType, model: TSource) {
    
    const relMaps = resolveVal(model.relationMappings);

    let retGraph: ProjectionType = _.pick(objInfo, Object.keys(relMaps));

    if (_.size(retGraph)){
        _.forOwn(retGraph, (value: ProjectionType, key: string) => {
            const mCls =  relMaps[key].modelClass;

            retGraph[key] = pickRelation(value, mCls as TSource);
        });

        retGraph = _.mapValues(
            retGraph,
            val => _.isEmpty(val) || !_.isObject(val) ? true : val
        );

    }
    return retGraph;
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