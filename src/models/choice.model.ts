import { GraphQLNonNull, GraphQLString } from "graphql";
import { GraphQLDate, getProjectionFromAST, ProjectionType } from "graphql-compose";

import { schemaComposer } from "./";
import { Model } from "objection";
import { Poll, PollTC } from "./poll.model";
import { User, UserTC } from "./user.model";
import { GenericModel, creteGraphqlType, resolveRelMap } from "../generator";
import _ from "lodash";

export class Choice extends GenericModel{
    id!: string;

    pollId!: string;

    name!: string;

    createdAt!: Date;

    UpdatedAt!: Date;

    refrendum!: Poll[];

    voters!: User[];

    static tableName = 'choice';

    static get idColumn(){
        return ['id', 'pollId']
    };

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
                    from: 'vote.choiceID',
                    to: 'vote.userID',
                    extra: ['votedON'],
                },
                to: 'user.id'
            }
        },
    });

    static graqhqlSchema(){
        return {
            name: {
                type: new GraphQLNonNull(GraphQLString)
            },
            createdAt: {
                type: new GraphQLNonNull(GraphQLDate)
            },
            updatedAt: {
                type: new GraphQLNonNull(GraphQLDate)
            }
        }
    }
}

export const ChoiceTC = creteGraphqlType(Choice, schemaComposer)