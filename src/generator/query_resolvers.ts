import {
    getProjectionFromAST,
    InputTypeComposer,
    ObjectTypeComposer,
    InputTypeComposerFieldConfigMapDefinition,
    SchemaComposer,
    deepmerge,
    ProjectionType,
    ObjectTypeComposerArgumentConfigAsObjectDefinition,
    sc,
    ObjectTypeComposerArgumentConfigDefinition
} from "graphql-compose";
import _ from "lodash";
import { Model } from 'objection';

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
    resolveVal,
    SortType,
    WhereOp,
    WhereParams,
    flattenObj,
    mapValuesRecursive,
    pickByRecursive,
    pickRelation,
    deepMapKeys
} from ".";
import { create_db, read_db } from "../db.service";

export function addCRUD<TSource extends typeof GenericModel, TContext>(
    sc: SchemaComposer<TContext>,
    model : TSource,
    modelTC: ObjectTypeComposer<TSource, TContext>
) {

    _.forOwn(resolveMap, (value, operation) => {
        value.forEach((predicate) => {
            const isSingle = predicate == 'One';

            const modelArg: {
                sort?: InputTypeComposer<TContext>,
                filter?: InputTypeComposer<TContext>,
                page?: ObjectTypeComposerArgumentConfigAsObjectDefinition,
                size?: ObjectTypeComposerArgumentConfigAsObjectDefinition,
                record?: ObjectTypeComposerArgumentConfigDefinition,
            } = {}

            if (operation === 'find' && !isSingle){
                modelArg.page = {
                    type: 'Int',
                    defaultValue: 1
                };

                modelArg.size = {
                    type: 'Int',
                    defaultValue: 5
                };

            }

            if (operation === 'create'){

                const createRTC = getOrCreateITC(
                    sc,
                    `${model.name}CreateRecordITC`,
                    model,
                    modelTC,
                    createRecordITC
                )

                modelArg.record = isSingle ? createRTC : createRTC.NonNull.List.NonNull

            }

            else{

                modelArg.sort = getOrCreateITC(
                    sc,
                    `${model.name}SortInput`,
                    model,
                    modelTC,
                    createSortInput
                );

                modelArg.filter = getOrCreateITC(
                    sc,
                    `${model.name}FilterInput`,
                    model,
                    modelTC,
                    createFilterInput
                );
            }

            modelTC.addResolver({
                args: modelArg,
                name: operation + predicate,
                type: isSingle ? modelTC : [modelTC],
                resolve: getOpResolver(model, modelTC, operation, isSingle)
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

        let cleanRecord: DeepBaseType | DeepBaseType[] = {};

        const record = resolverParams.args.record;

        if (record !== undefined)
            cleanRecord = deepMapKeys(record, key => {
                const mapTo: Record<string, string> = {dbref : '#dbref'}
                return mapTo[key] === undefined ? key : mapTo[key]
            })

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
        
            case 'create':{
                const a =  await create_db(model, cleanRecord, relInfo);
                console.log(a)
                return a
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
                    sc: SchemaComposer<TContext>,
                ) => InputTypeComposer<TContext>
) => {

    try{
        return sc.getITC(typeName);
    }catch(err){
        return createInput(model, modelTC, sc);
    }

};

function createRecordITC<TSource extends typeof GenericModel, TContext>
(
    model: TSource,
    modelTC: ObjectTypeComposer<TSource, TContext>,
    sc: SchemaComposer<TContext>,
) {

    const recordInput = recordTCRecursive(
        model,
        modelTC,
        'CreateRecordITC',
        model.name,
        1
    );

    sc.add(recordInput);

    return recordInput;

}

function recordTCRecursive<TSource extends typeof GenericModel, TContext>(
    model: TSource,
    typeComposer: ObjectTypeComposer<TSource, TContext> | InputTypeComposer<TContext>,
    baseName: string,
    fieldName: string,
    depth = Number.POSITIVE_INFINITY,
) {

    const TCName = `${fieldName}${baseName}`;

    let createRITC: InputTypeComposer<TContext>;

    if (typeComposer instanceof ObjectTypeComposer)
        createRITC = typeComposer.getITC().clone(TCName);

    else
        createRITC = typeComposer.clone(TCName);

    const graphqlSchema = resolveVal(model.graqhqlSchema)

    createRITC.getFieldNames().forEach(fieldName => {

        const fieldTC = createRITC.getFieldTC(fieldName)

        const inputOpt = graphqlSchema[fieldName]?.input

        if (inputOpt === 'omit' || fieldName === 'id')
            createRITC.removeField(fieldName);

        if (model.idColumn.includes(fieldName) || fieldName === 'null')
            createRITC.makeFieldNullable(fieldName);

        if (fieldTC instanceof InputTypeComposer){

            createRITC.makeFieldNullable(fieldName);

            const relationMap = resolveVal(model.relationMappings);

            const relInfo = relationMap[fieldName]

            if (depth > 0){

                if (relInfo.relation === Model.ManyToManyRelation)
                    createRITC.setField(
                        fieldName,
                        initializeITCRecusive({"id" : 'ID!'}, TCName, fieldName)
                    );

                else{

                    const RTC = relInfo.typeComposer;

                    const relTC = RTC instanceof ObjectTypeComposer ? RTC : sc.getOTC(RTC);

                    createRITC.setField(
                        fieldName,
                        recordTCRecursive(
                            relInfo.modelClass,
                            relTC,
                            TCName,
                            fieldName,
                            depth - 1
                        )
                    );

                }

            }

            else
                createRITC.removeField(fieldName);

        }

    });

    return createRITC;

}

const createSortInput = <TSource extends typeof GenericModel, TContext>(
    model: TSource,
    modelTC: ObjectTypeComposer<TSource, TContext>,
    sc: SchemaComposer<TContext>,
) => {
    const modelNullInputType = makeFieldsNullRecusive(modelTC.getITC(), model.name, 1);

    const nullInputMap = fieldsTCRecusive(modelNullInputType);

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
    modelTC:ObjectTypeComposer<TSource, TContext>,
    sc: SchemaComposer<TContext>,
) => {

    const modelFilterType = sc!.getITC(`${model.name}NullInput`)
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

    const modelNullType = inputTC.clone(`${newName}NullInput`);

    modelNullType.getFieldNames().forEach(fieldName => {
        modelNullType.makeFieldNullable(fieldName);

        let fieldTC = modelNullType.getFieldTC(fieldName);

        if (fieldTC instanceof InputTypeComposer){

            if ( depth === 0){
                modelNullType.removeField(fieldName);
            }

            else {
            
                modelNullType.setField(
                    fieldName,
                    makeFieldsNullRecusive(fieldTC, newName, (depth - 1), fieldName)
                );
            }
        }

        modelNullType.makeFieldNullable(fieldName)

    });

    return modelNullType

}