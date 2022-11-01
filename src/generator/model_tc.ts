import { GraphQLID, GraphQLObjectType, GraphQLNonNull } from "graphql";
import { ObjectTypeComposer, SchemaComposer } from "graphql-compose";
import _ from 'lodash';
import { Model } from "objection";
import { GenericModel, RelMaps, RelMapsThunk } from ".";

export function creteGraphqlType<TSource extends typeof GenericModel, TContext = any>
(
    model: TSource,
    schemaComposer: SchemaComposer<TContext>,
) {
    const modelTC = schemaComposer.createObjectTC(
        new GraphQLObjectType<TSource>({
            name: model.name,
            fields: model.graqhqlSchema
    }));

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

    const relMaps = resolveRelMap(model.relationMappings);

    Object.entries(relMaps).forEach(([key, value])  => {
        const relType = () => {

            const vtc = value.typeComposer;

            switch(value.relation){
                case Model.BelongsToOneRelation:
                case Model.HasOneRelation:{

                    if (_.isString(vtc)) return `${vtc}!`

                    return vtc.NonNull
                }
                default:{
                    if (_.isString(vtc)) return `[${vtc}]!`

                    return vtc.List.NonNull
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

export const resolveRelMap = (relMaps: RelMaps | RelMapsThunk) =>  
    _.isFunction(relMaps)? relMaps() : relMaps;
