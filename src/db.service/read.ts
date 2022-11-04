import { ProjectionType } from "graphql-compose";
import _ from "lodash";
import { ColumnRefOrOrderByDescriptor } from "objection";

import {
    GenericModel,
    ModelOrder,
    WhereParams
} from "../generator";

export async function read_db<TSource extends typeof GenericModel>(
    model : TSource,
    single: boolean = true,
    queryProp: {
        where?: WhereParams,
        order?: ModelOrder[],
        relInfo?: ProjectionType,
        relField?: ProjectionType
    }
) {
    const retQuery = model.query();

    const { where, order, relInfo, relField } = queryProp;

    retQuery.joinRelated( relField as object );

    where?.forEach((whereVal => {
        retQuery.where(...whereVal as [any, any, any]);
    }))

    if (!(_.isEmpty(order))) retQuery.orderBy(order as ColumnRefOrOrderByDescriptor[])

    if (single) retQuery.first();

    if (!(_.isEmpty(relInfo))) retQuery.withGraphFetched(relInfo);

    return retQuery;
}