import { GraphQLID, GraphQLObjectType, GraphQLNonNull } from "graphql";
import { SchemaComposer } from "graphql-compose";
import _ from 'lodash';
import { Model } from "objection";
import { GenericModel, resolveVal } from ".";

export function createGraphqlType<TSource extends typeof GenericModel, TContext = any>
(
    model: TSource,
    schemaComposer: SchemaComposer<TContext>,
) {
    const modelSchema = resolveVal(model.graqhqlSchema);

    // console.log(model.name)

    const modelTC = schemaComposer.createObjectTC(
        new GraphQLObjectType<TSource>({
            name: model.name,
            fields: modelSchema
    }));

    const excluded_fields = _.pickBy(
        modelSchema,
        (value: any) => value.input === 'only' || value.input === 'never'
    );

    modelTC.removeField(Object.keys(excluded_fields));

    const addIDField = (idCol: string) => {
        modelTC.addFields({
            [idCol]:{
                type: new GraphQLNonNull(GraphQLID)
        }
    })};

    const idCol = model.idColumn;

    if (_.isArray(idCol)){

        idCol.forEach(addIDField);

    } 
    
    else if (idCol) addIDField(idCol);

    const relMaps = resolveVal(model.relationMappings);

    Object.entries(relMaps).forEach(([key, value])  => {
        const relType = () => {

            const vtc = value.typeComposer;

            switch(value.relation){
                case Model.BelongsToOneRelation:
                case Model.HasOneRelation:{

                    if (_.isString(vtc)) return `${vtc}!`;

                    return vtc.NonNull;
                }
                default:{
                    if (_.isString(vtc)) return `[${vtc}]!`;

                    return vtc.List.NonNull;
                }
            }
        };
    
        modelTC.addFields({
            [key]:{
                type: relType()
            }
        });
    });

    return modelTC;

}
