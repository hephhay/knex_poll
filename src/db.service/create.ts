import { ProjectionType } from "graphql-compose";
import { DeepBaseType, GenericModel } from "../generator";

export async function create_db<TSource extends typeof GenericModel>
(
    model: TSource,
    data: DeepBaseType | DeepBaseType[] | undefined,
    relInfo?: ProjectionType
) {

    const retQuery = model.query()

    retQuery.insertGraphAndFetch(data as object, {relate: true})

    if (relInfo !== undefined)
        retQuery.withGraphFetched(relInfo);

    return retQuery
}