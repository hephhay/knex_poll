import { ProjectionType } from "graphql-compose";
import _ from "lodash";
import { BaseType, DeepBaseType, FieldType, GenericModel, InputDict, resolveRelMap } from "../generator";

// export function pickByRecursive<T>(objMap: _.Dictionary<T> | null | undefined, condition: (value: T, key: string) => boolean) {

//     let retMap = _.pickBy(
//         objMap,
//         (objValue, objKey) => _.isObject(objValue) || condition(objValue, objKey)
//     );

//     _.forOwn(retMap, (value, key) => {
//         if(_.isObject(value)){

//             const newMap = pickByRecursive(value as _.Dictionary<T>, condition)

//             if(!_.isEmpty(newMap))
//                 _.set(retMap, key, newMap);
//         }

//     })

//     return retMap

// }

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
    
    const relMaps = resolveRelMap(model.relationMappings);

    let retGraph: ProjectionType = _.pick(objInfo, Object.keys(relMaps));

    if (_.size(retGraph)){
        _.forOwn(retGraph, (value: ProjectionType, key: string) => {
            const mCls: TSource =  relMaps[key].modelClass as any;

            retGraph[key] = pickRelation(value, mCls);
        });

        retGraph = _.mapValues(
            retGraph,
            val => _.isEmpty(val) || !_.isObject(val) ? true : val
        );

    }
    return retGraph;
}

// export function pickRelation2(objInfo: ProjectionType) {

//     if (_.size(objInfo)){
//         _.forOwn(objInfo, (value: ProjectionType, key: string) => {
//             const mCls: TContext =  relMaps[key].modelClass as any;

//             retGraph[key] = pickRelation2(value, mCls);
//         });

//         retGraph = _.mapValues(retGraph, val => _.isEqual(val, {}) ? true : val);

//     }
//     return retGraph;
// }

// export function changeScalarType<TContext>(value: InputDict<TContext>, changeFN: (scalarType: string) => string): InputDict<TContext>{
//     return _.mapValues(value, opType => {
//         if(_.isObject(opType))
//             return changeScalarType(opType as InputDict<TContext>, changeFN);

//         else
//             return changeFN(opType);
//     });
// }

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
                depth+1
            );
        else
            res[`${baseName === '' ? '' : _.lowerCase(baseName)+'.'}${propName}`] = collection[key] as FieldType;
    }
    return res;
}