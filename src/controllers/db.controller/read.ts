import _ from "lodash";
import { ColumnRefOrOrderByDescriptor } from "objection";

import { DBHelper, QueryProperties } from ".";
import { BaseType, GenericModel } from "../../generator";

export function prepareDB({
        beforeQuery,
        actionQuery,
    }: DBHelper,
    initialOne = true,
) {
    return async <TSource extends typeof GenericModel>(
        queryProp: QueryProperties<TSource>
    ) => {
        const { model, single, where, order, relInfo, relField, modifiers } = queryProp;

        let retQuery = model.query();

        if (beforeQuery) retQuery = beforeQuery(retQuery, queryProp) as any;

        if(!_.isEmpty(modifiers))
            retQuery = model.query().with(
                model.name,
                retQuery.modify(modifiers)
        );

        if (!_.isEmpty(relField)) retQuery.leftJoinRelated(relField);

        where?.forEach(whereVal => {
            retQuery.where(...whereVal as [any, any, any]);
        });

        if (!(_.isEmpty(order))) retQuery.orderBy(order as ColumnRefOrOrderByDescriptor[]);

        if (actionQuery) retQuery = actionQuery(retQuery, queryProp) as any;

        const orderColumns = order?.map(value => value.column) ?? []

        orderColumns.push(model.name + '.id');

        retQuery.distinctOn(...orderColumns).select(model.name + '.*');

        if (single && initialOne) retQuery.limit(1).first();

        if (!(_.isEmpty(relInfo))) retQuery.withGraphFetched(relInfo);

        return retQuery;
    }
}

export const readFromDb = prepareDB({});

export const insertToDB = prepareDB({
    beforeQuery: (retQuery, { record }) => {
        return retQuery.insertGraphAndFetch(record as object);
    }
}, false);

export const updateDb = prepareDB({

    actionQuery: (retQuery, {model, record, modifiers}) => {

        retQuery.limit(1);

        if(!_.isEmpty(record)){

            for(const [key, val] of Object.entries(record)){

                const value = val as BaseType;

                if (_.isPlainObject(value)){
                    _.unset(record, key);

                    if(!_.isEmpty(value.dbAdd))
                        model.relatedQuery(key).for(retQuery).relate(value.dbAdd).execute();

                    if(!_.isEmpty(value.dbRem))
                        model.relatedQuery(key).for(retQuery).unrelate()
                                    .whereIn('id', value.dbRem as string[]).execute();

                }

            };

            let updated: GenericModel | undefined;

            retQuery.first().execute().then(
                value => { updated = value},
                error => {throw error}
            );

            return updated?.$query()
                .patchAndFetch(record).modify(modifiers as any) as any;

        }

    }
},false);

export const deleteFromDb = prepareDB({
    actionQuery: (retQuery, { single, model }) => {

        if (single) retQuery.limit(1);

        retQuery.select(model.name + '.id');

        return model.query().del().whereIn('id', retQuery) as any;
    }
})