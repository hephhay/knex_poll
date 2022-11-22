import { Choice, User } from "./models";

let blab:[string, string, string] = ['choice.name', 'ilike', '%b%'];

(async() => {
    function modifierFunc (query: any) {
            query.select('*').select(Choice.relatedQuery('voters').count().as('number'));
        }
        function helpFunc (query: any) {
            query.select('*').select(User.relatedQuery('createdPolls').count().as('number'));
        }

    let a = Choice.query().with('choice', Choice.query().modify(modifierFunc)).joinRelated(({voters: {$modify: [helpFunc]}})).where('voters.number', '>', 0).withGraphFetched({voters: true});
    // let a = Choice.query().joinRelated({voters: {$modify: [helpFunc]}}).where('voters.number', 0).withGraphFetched({voters: true}).modify(modifierFunc).first();
    console.log(
        await a
)})();

// {
//     "filter": {
//       "_operator": {
//         "like": {
//           "voters": {
//             "firstName": "e"
//           },
//           "name": "a"
//         }
//       },
//       "name": "beans",
//       "createdAt": "2022-10-08T23:43:26.858Z"
//     },
//     "sort": {
//       "name": true,
//       "referendum": {
//         "title": false
//       }
//     }
//   }

//   query FindChoices($filter: ChoiceFilterInput, $sort: ChoiceSortInput) {
//     findChoices(filter: $filter, sort: $sort) {
//       name
//       updatedAt
//       referendum {
//         title
//         description
//         creator {
//           id
//         }
//         choices {
//           createdAt
//         }
//       }
//     }
//   }
