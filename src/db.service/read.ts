import _ from "lodash";
import { ColumnRefOrOrderByDescriptor } from "objection";

import { DBHelper, QueryProperties } from ".";
import { GenericModel } from "../generator";

export function prepareDB({
        beforeQuery,
        actionQuery,
    }: DBHelper,
    initialOne = true,
) {
    return <TSource extends typeof GenericModel>(
        model : TSource,
        queryProp: QueryProperties
    ) => {
        const retQuery = model.query();

        const { single, where, order, relInfo, relField } = queryProp;

        if (beforeQuery) beforeQuery(retQuery, queryProp)

        if (!_.isEmpty(relField)) retQuery.joinRelated(relField);

        where?.forEach(whereVal => {
            retQuery.where(...whereVal as [any, any, any]);
        });

        if (!(_.isEmpty(order))) retQuery.orderBy(order as ColumnRefOrOrderByDescriptor[])

        if (single && initialOne) retQuery.first();

        if (actionQuery) actionQuery(retQuery, queryProp);

        if (!(_.isEmpty(relInfo))) retQuery.withGraphFetched(relInfo);

        return retQuery;
    }
}

export const readFromDb = prepareDB({});

export const insertToDB = prepareDB({
    beforeQuery: (retQuery, { record }) => {
        retQuery.insertGraphAndFetch(record as object);
    }
}, false);