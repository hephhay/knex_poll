import { GraphQLID, GraphQLNonNull } from "graphql";
import { GraphQLDate } from "graphql-compose";
import { Model } from "objection";

import { schemaComposer } from "./";
import { Choice, ChoiceTC  } from "./choice.model";
import { User, UserTC } from "./user.model";
import { GenericModel, createGraphqlType } from "../generator";

export class Vote extends GenericModel{
    userID!: string;
    choiceID!: string;
    votedOn!: Date;

    static tableName = 'vote';

    static relationMappings(){
        return {
            decision: {
                relation: Model.BelongsToOneRelation,
                modelClass: Choice,
                typeComposer: ChoiceTC,
                join: {
                    from: 'vote.choiceId',
                    to: 'choice.id'
                }
            },

            voter: {
                relation: Model.BelongsToOneRelation,
                typeComposer: UserTC,
                modelClass: User,
                join: {
                    from: 'vote.userId',
                    to: 'user.id'
                }
            },
        }
    };

    static get graqhqlSchema(){
        return{
            userId: {
                type: new GraphQLNonNull(GraphQLID)
            },
            choiceId: {
                type: new GraphQLNonNull(GraphQLID)
            },
            votedOn: {
                type: new GraphQLNonNull(GraphQLDate),
                input: 'omit'
            }
        }
    }

}

export const VoteTC = createGraphqlType(Vote, schemaComposer);

schemaComposer.Query.addFields({
    ourvotes:{
        type: VoteTC.List.NonNull,
        resolve: async () => (await Vote.query().withGraphJoined({
                voter: true,
                decision: true
            }))
    }
});