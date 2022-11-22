import {
    getProjectionFromAST,
    InputTypeComposer,
    ObjectTypeComposer,
    InputTypeComposerFieldConfigMapDefinition,
    SchemaComposer,
    deepmerge,
    ProjectionType,
    ObjectTypeComposerArgumentConfigAsObjectDefinition,
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
    deepMapKeys,
    BaseType,
    FieldType,
    pickModifiers,
    pickRelation,
    pickFieldGraph,
    FieldConfigMap,
    ArgType
} from ".";
import {
    deleteFromDb,
    insertToDB,
    readFromDb,
    updateDb
} from "../controllers";

// create interface that can that kepp common properties

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
                if (operation === 'update'){

                    const updateRTC = getOrCreateITC(
                        sc,
                        `${model.name}UpdateRecordITC`,
                        model,
                        modelTC,
                        updateRecordITC
                    );

                    modelArg.record = isSingle ? updateRTC : updateRTC.NonNull.List.NonNull

                }

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
    operation: string,
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
            cleanRecord = editRecord(record, operation);

        const relField = pickRelation(fieldProjection, model, pickModifiers);

        const relInfo  = pickFieldGraph(infoMap, cleanRP?.sort ?? {}, model);

        const baseModifier = _.union(
            pickModifiers(infoMap, model),
            pickModifiers(fieldProjection, model)
        );

        let returnDB: typeof readFromDb

        switch (operation){

            case 'create': {
                returnDB = insertToDB;
                break;
            }

            case 'update': {
                returnDB = updateDb;
                break;
            }

            case 'deletek': {
                returnDB = deleteFromDb;
                break;
            }

            default: {
                returnDB = readFromDb;
            }
        }

        return await returnDB({
            model: model,
            single: isSingle,
            relInfo : relInfo,
            where: whereFilter,
            relField: relField,
            modifiers: baseModifier,
            order: sortArray,
            record: cleanRecord
        });

    }
}

function editRecord(record: DeepBaseType| DeepBaseType[], operation: string){
    let cleanRecord: DeepBaseType | DeepBaseType[] = {};

    cleanRecord = deepMapKeys(record, key => ({dbRef : '#dbRef'}[key] ?? key));

        if (operation === 'update' && !_.isArray(record)){

            cleanRecord = _.reduce(cleanRecord, (accumulator, curVal, key) => {
                if(_.isArray(curVal)){

                    accumulator[key] = (curVal as BaseType[]).reduce((cont, val) => {

                        // similar lines abstract to function

                        if(val.dbAdd)
                            (cont.dbAdd as FieldType[]).push(val.dbAdd);

                        if(val.dbRem)
                            (cont.dbRem as FieldType[]).push(val.dbRem);

                        return cont
                    }, {dbAdd: [], dbRem : []});
                }
                else
                    accumulator[key] = curVal as FieldType;
                return accumulator;

            }, {} as DeepBaseType);
        }

        return cleanRecord

}

export function orderModel<TSource extends typeof GenericModel>
(sortArg: SortType, model: TSource) {
    const newSort = _.mapValues(
        flattenObj(
            _.omitBy(sortArg, value => _.isPlainObject(value)),
            model.name
        ),
        sortVal => sortVal ? 'ASC' : 'DESC'
    );

    const sortArray: Array<ModelOrder> = [];

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

    return newFilterMap;
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

function updateRecordITC<TSource extends typeof GenericModel, TContext>
(
    model: TSource,
    modelTC: ObjectTypeComposer<TSource, TContext>,
    sc: SchemaComposer<TContext>,
) {

    const updateRTC = makeFieldsNullRecusive(
        sc.getITC(`${model.name}CreateRecordITC`),
        'UpdateRecordITC',
        `${model.name}`
    );

    updateRTC.getFieldNames().forEach(fieldName => {

        const fieldTC = updateRTC.getFieldTC(fieldName);

        if(fieldTC instanceof InputTypeComposer){

            if (fieldTC.hasField('dbRef')){

                const nameTC = `${model.name}UpdateRecordITC`;

                updateRTC.setField(
                    fieldName,
                    initializeITCRecusive({dbAdd: 'ID', dbRem: 'ID'}, nameTC, fieldName).NonNull.List
                );

            }
            else
                updateRTC.removeField(fieldName);

        }

    });

    return updateRTC;
}

function createRecordITC<TSource extends typeof GenericModel, TContext>
(
    model: TSource,
    modelTC: ObjectTypeComposer<TSource, TContext>,
    sc: SchemaComposer<TContext>,
) {

    const recordInput = recordTCRecursive(
        model,
        modelTC,
        sc,
        'CreateRecordITC',
        model.name,
        1
    );

    sc.add(recordInput);

    return recordInput;

}

export function recordTCRecursive<TSource extends typeof GenericModel, TContext>(
    model: TSource,
    typeComposer: ObjectTypeComposer<TSource, TContext> | InputTypeComposer<TContext>,
    sc: SchemaComposer<TContext>,
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

        if (inputOpt === 'omit' || fieldName === 'id' || inputOpt === 'never')
            createRITC.removeField(fieldName);

        if (inputOpt === 'null')
            createRITC.makeFieldNullable(fieldName);

        if (fieldTC instanceof InputTypeComposer){

            createRITC.makeFieldNullable(fieldName);

            const relationMap = resolveVal(model.relationMappings);

            const relInfo = relationMap[fieldName];

            if (depth > 0){

                if (relInfo.relation === Model.ManyToManyRelation)
                    createRITC.setField(
                        fieldName,
                        initializeITCRecusive({dbRef : 'ID!'}, TCName, fieldName).NonNull.List
                    );

                else{

                    const RTC = relInfo.typeComposer;

                    const relTC = RTC instanceof ObjectTypeComposer ? RTC : sc.getOTC(RTC);

                    createRITC.setField(
                        fieldName,
                        recordTCRecursive(
                            relInfo.modelClass,
                            relTC,
                            sc,
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

    const excluded_fields = _.pickBy(
        graphqlSchema,
        (value: any) => value.input === 'only'
    );

    createRITC.addFields(excluded_fields as any);

    return createRITC;

}

const createSortInput = <TSource extends typeof GenericModel, TContext>(
    model: TSource,
    modelTC: ObjectTypeComposer<TSource, TContext>,
    sc: SchemaComposer<TContext>,
) => {
    const modelNullInputType = makeFieldsNullRecusive(modelTC.getITC(), 'NullInput', model.name, 1);

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
    );

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
    });

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

export function makeFieldsNullRecusive<TContext>(
    inputTC: InputTypeComposer<TContext>,
    baseName: string,
    modelName: string,
    depth = Number.POSITIVE_INFINITY,
    ITCFieldName?: string
) {

    const newName = (ITCFieldName ?? '') + modelName;

    const modelNullType = inputTC.clone(newName + baseName);

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
                    makeFieldsNullRecusive(fieldTC, newName, baseName, depth - 1, fieldName)
                );
            }
        }

        modelNullType.makeFieldNullable(fieldName)

    });

    return modelNullType;

}