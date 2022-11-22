import { Model } from "objection";
import { Choice, ChoiceTC } from "./choice.model";
import { Poll, PollTC } from "./poll.model";
import { schemaComposer } from "./";
import { GenericModel, createGraphqlType } from "../generator";
import { GraphQLNonNull, GraphQLString, GraphQLBoolean } from "graphql";
import { GraphQLDate } from "graphql-compose";

export class User extends GenericModel{
    id!: string;

    email!: string;

    firstName!: string;

    lastName!: string;

    isAdmin!: boolean;

    createdAt!: Date;

    UpdatedAt!: Date;

    createdPolls!: Poll[];

    voting!: Choice[];

    static tableName = 'user';

    static idColumn = 'id';

    static relationMappings = () => ({
        createdPolls: {
            relation: Model.HasManyRelation,
            modelClass: Poll,
            typeComposer: 'Poll',
            join: {
                from: 'user.id',
                to: 'poll.createdBy'
            }
        },

        voting: {
            relation: Model.ManyToManyRelation,
            modelClass: Choice,
            typeComposer: 'Choice',
            join: {
                from: 'user.id',
                through: {
                    from: 'vote.userId',
                    to: 'vote.choiceId',
                    extra: ['votedOn'],
                },
                to: 'choice.id'
            }
        }
    });

    static get graqhqlSchema(){
        return{
            email: {
                type: new GraphQLNonNull(GraphQLString),
                unique: true
            },
            password: {
                type: new GraphQLNonNull(GraphQLString),
                input: 'never'
            },
            firstName: {
                type: new GraphQLNonNull(GraphQLString)
            },
            lastName: {
                type: new GraphQLNonNull(GraphQLString)
            },
            isAdmin: {
                type: new GraphQLNonNull(GraphQLBoolean),
                input: 'null'
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

export const UserTC = createGraphqlType(User, schemaComposer);