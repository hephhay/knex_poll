import { GraphQLID, GraphQLNonNull, GraphQLString } from 'graphql';
import { ObjectTypeComposer, SchemaComposer } from 'graphql-compose';
import _ from 'lodash';

import {
    readFromDb,
    setCache,
    getCache,
    insertToDB,
    updateDb,
} from '../controllers';
import {
    addCRUD,
    ArgType,
    BaseType,
    DeepBaseType,
    FieldConfigMap,
    GenericModel,
    makeFieldsNullRecusive,
    operators,
    recordTCRecursive,
    resolveVal,
    WhereOp
} from '../generator';
import { User, UserTC, schemaComposer } from '../models';

addCRUD(schemaComposer, User, UserTC);
addRegister(User, UserTC, schemaComposer, {
    relName: 'createdPolls',
    omit: 'createdBy'
});

schemaComposer.Mutation.addFields({
    confirmToken: {
        type: createFlatType(
            'tokenConfirm',
            {
                id : {
                    type: GraphQLID
                },
                type: {
                    type: GraphQLString
                }
            },
            schemaComposer
        ),
        args: {
            secret: new GraphQLNonNull(GraphQLString)
        },
        resolve: confirmToken
    }
});

export function updateRegsiterRecordInput<TSource extends typeof GenericModel, TContext>
(
    model: TSource,
    sc: SchemaComposer<TContext>,
) {

    const updateRITC = makeFieldsNullRecusive(
        sc.getITC(`${model.name}RegisterITC`),
        'UpdateRegister',
        model.name,
        0
    );

    updateRITC.makeFieldNonNull('email');

    return updateRITC

}

export function regsiterRecordInput<TSource extends typeof GenericModel, TContext>
(
    model: TSource,
    modelTC: ObjectTypeComposer<TSource, TContext>,
    sc: SchemaComposer<TContext>,
    extra?: {relName: string, omit?: string}
) {

    const recordRITC = recordTCRecursive(
        model,
        modelTC,
        sc,
        `${model.name}RegisterITC`,
        '',
        0
    );

    const modelSchema = resolveVal(model.graqhqlSchema)

    recordRITC.addFields(
        _.pick(modelSchema, ['email', 'password']) as any
    );

    if (extra){
        const mapsRels = resolveVal(model.relationMappings)[extra.relName];

        let nestedTC = mapsRels.typeComposer;

        if (_.isString(nestedTC)){
                nestedTC = sc.getOTC(nestedTC);

                const nestedITC = recordTCRecursive(
                    mapsRels.modelClass as TSource,
                    nestedTC,
                    sc,
                    `${extra.relName}${model.name}RegisterITC`,
                    '',
                    0
                );

                if (extra.omit)
                    nestedITC.removeField(extra.omit);

                recordRITC.addFields({
                    [extra.relName]: nestedITC.NonNull
                });

        }
    }

    return recordRITC

}

export function addRegister<TSource extends typeof GenericModel, TContext>
(
    model: TSource,
    modelTC: ObjectTypeComposer<TSource, TContext>,
    sc: SchemaComposer<TContext>,
    extra?: {relName: string, omit?: string}
) {

    sc.Mutation.addFields({
        [`${model.name}Register`]: {
            type : createFlatType(
                'InputSuccess',
                {
                    message: {
                    type: new GraphQLNonNull(GraphQLString),
                    },
                    secret: {
                        type: GraphQLString
                    }
                },
                sc
            ),
            args: {record: regsiterRecordInput(model, modelTC, sc, extra)},
            resolve: registerResolver(model, modelTC)
        },
        [`${model.name}UpdateRegister`]: {
            type: sc.getOTC('InputSuccess'),
            args: {record : updateRegsiterRecordInput(model, sc)},
            resolve: updateRegisterResolver(model, modelTC)
        }
    });

}

export function createFlatType<TContext>(
    typeName: string,
    fieldConfig: FieldConfigMap,
    sc: SchemaComposer<TContext>
) {

    return sc.getOrCreateOTC(typeName, (tc) => {
        tc.addFields(fieldConfig as any)
    });

}

function getUniqueKeys<TSource extends typeof GenericModel>
(model: TSource) {

    const modelSchema = resolveVal(model.graqhqlSchema);

    return _.keys(_.pickBy(modelSchema, value => value?.unique));

}

async function getDbData<TSource extends typeof GenericModel>
(
    model: TSource,
    record: DeepBaseType,
    isNew = true
) {

    const uniqueKeys = getUniqueKeys(model);
    const uniqueVals = _.pick(record, uniqueKeys);
    const whereFilter = Object.entries(uniqueVals).map(
        value => [value[0], operators.like.map, value[1]] as WhereOp
    )

    const data = await readFromDb({
        model: model,
        single: true,
        modifiers: [],
        where: whereFilter
    });

    if (data && isNew)
        throw new Error(`values of ${uniqueKeys.toString()} already exits`);

    if (!data && !isNew)
        throw new Error(`${model.name} with email ${record?.email} does not exist`);

    return data;

}

async function cacheData<TSource extends typeof GenericModel>
(
    model: TSource,
    record: DeepBaseType,
    isNew = true
) {

    record.type = model.name;
    record.function = isNew ? 'new' :  'update';

    const otp = Math.floor(Math.random() * 1_000_000);
    const secret =addLeadingZeros(otp, 6);

    await setCache(secret, record);

    return {
        message: `otp sent to ${record?.email ?? ''}`,
        secret: secret
    }

}

function registerResolver<TSource extends typeof GenericModel, TContext>
(model: TSource, modelTC: ObjectTypeComposer<TSource, TContext>){

    return async (__: TSource, { record }: ArgType ) => {

        record = record as DeepBaseType;

        const nestedVals = _.pickBy(record, value => _.isPlainObject(value));

        for (let [key, value] of Object.entries(nestedVals)) {
            const modelRel = resolveVal(model.relationMappings);

            const nestedModel = modelRel[key].modelClass as TSource

            await getDbData(nestedModel, value as DeepBaseType);

        }

        await getDbData(model, record);
        return await cacheData(model, record);
    }
}

function updateRegisterResolver<TSource extends typeof GenericModel, TContext>
(model: TSource, modelTC: ObjectTypeComposer<TSource, TContext>){

    return async (__: TSource, { record }: ArgType ) => {

        record = record as DeepBaseType;

        await getDbData(model, record, false);
        return await cacheData(model, record, false);
    }
}

async function confirmToken(__: any, { secret }: {secret: string}) {

    const cachedString = await getCache(secret);
    if (!cachedString)
        throw new Error('Invalid Token')

    let cacheData: BaseType = JSON.parse(cachedString);
    const modelName = cacheData.type;
    delete cacheData.type;
    const mutateType = cacheData.function;
    delete cacheData.function;

    console.log(cacheData);

    _.unset(cacheData, ['name', 'function']);

    let model: typeof GenericModel;
    let mutateDB: typeof readFromDb

    switch (modelName){
        default: {
            model = User;
            break;
        }
    }

    switch (mutateType){
        case 'new': {
            mutateDB = insertToDB;
            break;
        }
        default: {
            mutateDB = updateDb;
            break;
        }
    }

    const saved = await mutateDB({
        model: model,
        single: true,
        modifiers: [],
        where: [[`email`, cacheData.email]],
        record: cacheData
    }) as any;

    return {
        id: saved.id,
        type: modelName
    }

}

const addLeadingZeros = (num: number, totalLength: number) =>
    String(num).padStart(totalLength, '0');