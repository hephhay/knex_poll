import { schemaComposer } from "./";
import { Model, QueryBuilder } from "objection";
import {Choice, ChoiceTC } from "./choice.model";
import { User, UserTC } from "./user.model";
import {
    GraphQLObjectType,
    GraphQLNonNull,
    GraphQLString,
    GraphQLID,
    GraphQLInt
} from "graphql";
import { GraphQLDate } from "graphql-compose";
import { GenericModel, createGraphqlType } from "../generator";

export class Poll extends GenericModel{
    id!: string;

    title!: string;

    numChoices!: number;

    createdBy!: string;

    description!: string;

    createdAt!: Date;

    UpdatedAt!: Date;

    choices!: Choice[];

    creator!: Choice[]

    static tableName = 'poll';

    static idColumn = 'id';

    static modifiers = {
        numChoices(query: QueryBuilder<Poll>){
            query.select(
                'poll.*', 
                Poll.relatedQuery('choices').count().as('numChoices')
            );
        }
    }

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
                type: new GraphQLNonNull(GraphQLString),
                unique: true
            },
            description: {
                type: new GraphQLNonNull(GraphQLString)
            },
            numChoices: {
                type: new GraphQLNonNull(GraphQLInt),
                input: 'omit'
            },
            createdBy: {
                type: new GraphQLNonNull(GraphQLID)
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

export const PollTC = createGraphqlType(Poll, schemaComposer);