import {
    getProjectionFromAST,
    InputTypeComposer,
    ObjectTypeComposer,
    InputTypeComposerFieldConfigMapDefinition,
    SchemaComposer,
    deepmerge,
    ProjectionType
} from "graphql-compose";
import _ from "lodash";

import {
    DeepBaseType,
    FieldTCMap,
    FilterType,
    GenericModel,
    InputDict,
    ModelOrder,
    operators,
    OPValue,
    resolveMap,
    ResolverParams,
    SortType,
    WhereOp,
    WhereParams
} from ".";
import { read_db } from "../db.service";
import {
    flattenObj,
    mapValuesRecursive,
    pickByRecursive,
    pickRelation
} from "./util.gen";

export function addCRUD<TSource extends typeof GenericModel, TContext>(
    sc: SchemaComposer<TContext>,
    model : TSource,
    modelTC: ObjectTypeComposer<TSource, TContext>
) {

    _.forOwn(resolveMap, (value, operarion) => {
        value.forEach((predicate) => {
            const isSingle = predicate == 'One';

            const pageArg = isSingle ? {} : {
                page: {
                    type: 'Int',
                    defaultValue: 1
                },
                size: {
                    type: 'Int',
                    defaultValue: 5
                }
            }

            const modelArg = {
                filter: getOrCreateITC(
                    sc,
                    `${model.name}FilterInput`,
                    model,
                    modelTC,
                    createFilterInput
                ),
                ...pageArg as object,
                sort: getOrCreateITC(
                    sc,
                    `${model.name}SortInput`,
                    model,
                    modelTC,
                    createSortInput
                )
            };

            modelTC.addResolver({
                args: modelArg,
                name: operarion + predicate,
                type: isSingle ? modelTC : [modelTC],
                resolve: getOpResolver(model, modelTC, operarion, isSingle)
            });
        })
    });

}

function getOpResolver<TSource extends typeof GenericModel, TContext>(
    model : TSource,
    modelTC: ObjectTypeComposer<TSource, TContext>,
    operarion: string,
    isSingle: boolean,
){

    return async (resolverParams: ResolverParams<TContext>) => {
        let whereFilter: WhereParams = [];

        let fieldProjection: ProjectionType = {};

        let sortArray: Array<ModelOrder> = [];

        const infoMap = mapValuesRecursive(
            getProjectionFromAST(resolverParams.info),
            _ => true
        );

        const cleanRP = pickByRecursive(
            resolverParams.args,
            (value) => value != null
        );

        if(cleanRP?.filter){
            whereFilter = createFlatFilter(model, cleanRP.filter);
            fieldProjection = filterMap(cleanRP.filter);
        }

        if(cleanRP?.sort){
            sortArray = orderModel(cleanRP.sort, model);
            fieldProjection = deepmerge(
                fieldProjection,
                mapValuesRecursive(cleanRP.sort, _ => true)
            );
        }

        const relInfo = pickRelation(infoMap, model);

        const relField = pickRelation(fieldProjection, model);

        switch (operarion){
            case 'find':{
                return await read_db(model, isSingle, {
                    relInfo : relInfo,
                    where: whereFilter,
                    relField: relField,
                    order: sortArray
                });
            }
        }

    }
}

function orderModel<TSource extends typeof GenericModel>
(sortArg: SortType, model: TSource) {
    const newSort = _.mapValues(
        flattenObj(sortArg as DeepBaseType, model.name),
        sortVal => sortVal ? 'ASC' : 'DESC'
    );

    const sortArray: Array<ModelOrder> = []

    _.forOwn(newSort, (sortStr, sortCoulmn) => {
        sortArray.push({
            column: sortCoulmn,
            order: sortStr
        });
    })

    return sortArray;
}

function filterMap(filterRP: FilterType) {
    const filterMap = mapValuesRecursive(filterRP, _ => true);

    let newFilterMap = _.omit(filterMap, '_operator');

    const opFilterMap = filterMap?._operator
    if(opFilterMap)
        _.forOwn(opFilterMap, (opValue: DeepBaseType) => {
            newFilterMap = deepmerge(newFilterMap, opValue);
        });

    return newFilterMap
}

function createFlatFilter<TSource extends typeof GenericModel>
(model : TSource, filterRP: FilterType | undefined) {
    const opFilter = filterRP?._operator

    let filterArr: WhereParams = [];

    if (opFilter){

        if(opFilter?.like)
            opFilter!.like = mapValuesRecursive(opFilter!.like as DeepBaseType, value => `%${value}%`);

        _.forOwn(opFilter, (opValues, opKey) => {
            const flatOpValue = flattenObj(opValues as DeepBaseType, model.name);

            const flatOpArray = Object.entries(flatOpValue).map(
                value => [value[0], operators[opKey as OPValue].map, value[1]] as WhereOp
            );

            filterArr = filterArr.concat(flatOpArray);
        });

    }

    const flatFilter = Object.entries(
        flattenObj(_.omit(filterRP, '_operator'), model.name)
    );

    return filterArr.concat(flatFilter);
}

const getOrCreateITC = <TSource extends typeof GenericModel, TContext>(
    sc: SchemaComposer<TContext>,
    typeName: string,
    model: TSource,
    modelTC: ObjectTypeComposer<TSource, TContext>,
    createInput: <TSource extends typeof GenericModel, TContext>(
                    model: TSource,
                    modelTC: ObjectTypeComposer<TSource, TContext>,
                    sc?: SchemaComposer<TContext>,
                ) => InputTypeComposer<TContext>
) => {

    try{
        return sc.getITC(typeName);
    }catch(err){
        return createInput(model, modelTC, sc);
    }

};

const createSortInput = <TSource extends typeof GenericModel, TContext>(
    model: TSource,
    modelTC: ObjectTypeComposer<TSource, TContext>,
    sc?: SchemaComposer<TContext>,
) => {
    const nullInputMap = fieldsTCRecusive(sc!.getITC(`${model.name}NullInput`));

    const sortInputMap = mapValuesRecursive(
        nullInputMap,
        _ => 'Boolean'
    );

    const sortInputFilter = initializeITCRecusive(sortInputMap, 'SortInput', model.name);

    sc?.add(sortInputFilter);

    return sortInputFilter;

}

const createFilterInput = <TSource extends typeof GenericModel, TContext>(
    model : TSource,
    modelTC:ObjectTypeComposer<TSource, TContext>
) => {

    const modelFilterType = makeFieldsNullRecusive(modelTC.getITC(), model.name, 1)
                                    .clone(`${model.name}FilterInput`);

    const inputMap = fieldsTCRecusive(modelFilterType);

    const operatorFilter = _.mapValues(operators, opValue => 
        pickByRecursive(inputMap, value => opValue.type.includes(_.isString(value) ? value : ''))
    ) as _.Dictionary<InputDict<TContext>>;

    operatorFilter.in = mapValuesRecursive(
        operatorFilter.in,
        opType => `[${opType}]`
    )

    const operatorITC = initializeITCRecusive(operatorFilter, model.name, 'operator');

    modelFilterType.setField('_operator', {type: operatorITC});

    return modelFilterType;

}

function initializeITCRecusive<TContext>(
    nestedObj: _.Dictionary<string | InputTypeComposer<TContext> | FieldTCMap<TContext>>,
    modelName: string, fieldName: string
) {

const inputName = fieldName + modelName;

_.forOwn(nestedObj, (value, key) => {

    if(_.isObject(value)) {
        const newInput = initializeITCRecusive(value as FieldTCMap<TContext>, inputName, key);

        nestedObj[key] = newInput
    }

});

    return InputTypeComposer.createTemp({
        name: inputName,
        fields: nestedObj as InputTypeComposerFieldConfigMapDefinition
    })

}

function fieldsTCRecusive<TContext>(inputTC: InputTypeComposer<TContext>) {

    return inputTC.getFieldNames().reduce(

        (collate, current) => {
            const currentTC = inputTC.getFieldTC(current);

            let mapValue: FieldTCMap<TContext>;

            if (currentTC instanceof InputTypeComposer)
                mapValue = fieldsTCRecusive(currentTC);
            else
                mapValue = currentTC.getTypeName() as any;
            return _.set(collate, current, mapValue);
        },

        {} as FieldTCMap<TContext>
    );

}

function makeFieldsNullRecusive<TContext>(
    inputTC: InputTypeComposer<TContext>,
    modelName?: string,
    depth = Number.POSITIVE_INFINITY,
    ITCFieldName?: string
) {

    const newName = (ITCFieldName ? ITCFieldName : '') + modelName;

    const modelFilterType = inputTC.clone(`${newName}NullInput`);

    modelFilterType.getFieldNames().forEach(fieldName => {
        modelFilterType.makeFieldNullable(fieldName);

        let fieldTC = modelFilterType.getFieldTC(fieldName);

        if (fieldTC instanceof InputTypeComposer){

            if ( depth === 0){
                modelFilterType.removeField(fieldName);
            }

            else {
            
                modelFilterType.setField(
                    fieldName,
                    makeFieldsNullRecusive(fieldTC, newName, (depth - 1), fieldName)
                );
            }
        }

        modelFilterType.makeFieldNullable(fieldName)

    });

    return modelFilterType

}