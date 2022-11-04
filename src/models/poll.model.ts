import { schemaComposer } from "./";
import { Model } from "objection";
import {Choice, ChoiceTC } from "./choice.model";
import { User, UserTC } from "./user.model";
import {
    GraphQLObjectType,
    GraphQLNonNull,
    GraphQLString
} from "graphql";
import { GraphQLDate } from "graphql-compose";
import { GenericModel, creteGraphqlType } from "../generator";

export class Poll extends GenericModel{
    id!: string;

    title!: string;

    createdBy!: string;

    description!: string;

    createdAt!: Date;

    UpdatedAt!: Date;

    choices!: Choice[];

    creator!: Choice[]

    static tableName = 'poll';

    static get idColumn(){
        return ['id', 'createdBy'];
    };

    static relationMappings = () => ({
        creator: {
            relation: Model.BelongsToOneRelation,
            modelClass: User,
            typeComposer: 'User',
            join: {
                from: 'poll.createdBy',
                to: 'user.id'
            }
        },
        choices: {
            relation: Model.HasManyRelation,
            modelClass: Choice,
            typeComposer: 'Choice',
            join: {
                from: 'poll.id',
                to: 'choice.pollID'
            }
        }
    });

    static get graqhqlSchema(){
        return{
            title: {
                type: new GraphQLNonNull(GraphQLString)
            },
            description: {
                type: new GraphQLNonNull(GraphQLString)
            },
            createdAt: {
                type: new GraphQLNonNull(GraphQLDate),
                input: 'omit'
            },
            updatedAt: {
                type: new GraphQLNonNull(GraphQLDate),
                input: 'omit'
            }
        }
    }

}

export const PollTC = creteGraphqlType(Poll, schemaComposer);