import { GraphQLID, GraphQLInt, GraphQLNonNull, GraphQLString } from "graphql";
import { GraphQLDate } from "graphql-compose";

import { schemaComposer } from "./";
import { Model, QueryBuilder } from "objection";
import { Poll, PollTC } from "./poll.model";
import { User } from "./user.model";
import { GenericModel, createGraphqlType } from "../generator";
import _ from "lodash";

export class Choice extends GenericModel{
    id!: string;

    pollId!: string;

    name!: string;

    numVotes!: number

    createdAt!: Date;

    UpdatedAt!: Date;

    refrendum!: Poll[];

    voters!: User[];

    static tableName = 'choice';

    static idColumn = 'id';

    static modifiers = {
        numVotes(query: QueryBuilder<Choice>){
            query.select(
                'choice.*',
                Choice.relatedQuery('voters').count().as('numVotes')
            );
        }
    }

    static relationMappings = () => ({
        referendum: {
            relation: Model.BelongsToOneRelation,
            modelClass: Poll,
            typeComposer: PollTC,
            join: {
                from: 'choice.pollId',
                to: 'poll.id'
            }
        },

        voters: {
            relation: Model.ManyToManyRelation,
            modelClass: User,
            typeComposer: 'User',
            join: {
                from: 'choice.id',
                through: {
                    from: 'vote.choiceId',
                    to: 'vote.userId',
                    extra: ['votedOn'],
                },
                to: 'user.id'
            }
        },
    });

    static get graqhqlSchema(){
        return {
            name: {
                type: new GraphQLNonNull(GraphQLString)
            },
            pollId:{
                type: new GraphQLNonNull(GraphQLID)
            },
            numVotes: {
                type: new GraphQLNonNull(GraphQLInt),
                input: 'omit'
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

export const ChoiceTC = createGraphqlType(Choice, schemaComposer)