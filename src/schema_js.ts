import { Choice } from "./models";

let blab:[string, string, string] = ['choice.name', 'ilike', '%b%'];

(async() => {
    let a = Choice.query().joinRelated('[referendum, voters.createdPolls]');
    a.where(...blab).where('choice.name', 'ilike', '%a%');
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
