import { Knex } from "knex";
import { User } from "../../models";
import { Model } from "objection";

export async function seed(knex: Knex): Promise<void> {
    Model.knex(knex);
    // Deletes ALL existing entries
    await knex("user").del();

    // Inserts seed entries
    await User.query().insertGraph([
        {
            id: 'e5d65a17-f362-433e-b13a-5d5544c159f5',
            firstName: 'daniel',
            lastName: 'farayola',
            email: 'daniel@gmail.com',
            isAdmin: true,
            createdPolls: [
                {
                    title: 'President of Nigeria',
                    description: 'The National Election for the new president in Nigeria 2023',
                    choices: [
                        {
                            id: '23647e3a-9bf9-4089-91ad-f1e09176406d',
                            name: 'Bola Tinubu'
                        },
                        {
                            id: 'f8a43276-16bd-402e-81d2-a7ee468dd342',
                            name: 'Abubaka Atiku'
                        },
                        {
                            id: 'bbb19816-691a-4ae0-ad3d-4891010ec76f',
                            name: 'Peter Obi'
                        },
                    ]
                },
                {
                    title: 'ASUU Strike',
                    description: 'Voting to end ASSU stop or not',
                    choices: [
                        {
                            id: 'ac9c0c0c-32e9-4b06-9cb6-32479af68fcf',
                            name: 'Stop'
                        },
                        {
                            id: 'e3e7d640-1868-47c5-9825-611247850d66',
                            name: 'Continue'
                        }
                    ]
                }
            ]
        },
        {
            id: '17379e14-62be-4b3a-9788-36e1dc95ff43',
            firstName: 'meekness',
            lastName: 'adesina',
            email: 'meekness@gmail.com',
        },
        {
            id: 'deb9b6f9-b302-4987-820f-a3e9133f4d26',
            firstName: 'chuka',
            lastName: 'morka',
            email: 'chuka@gmail.com',
        },
        {
            id: 'dd1ff72a-11ec-442a-a794-529e656ffb38',
            firstName: 'tegiri',
            lastName: 'odiase',
            email: 'tegiri@gmail.com',
        },
        {
            id: 'd8c330e8-f5a1-4a83-b785-993fcd044552',
            firstName: 'wisdom',
            lastName: 'adetunji',
            email: 'wisdom@gmail.com',
        },
        {
            id: '8bd53998-1426-4137-9110-cfc913f1fba2',
            firstName: 'dafe',
            lastName: 'ogenne',
            email: 'dafe@gmail.com',
        },
        {
            id: 'aad9a3a0-6602-4f98-b32f-914340ae095c',
            firstName: 'tobias',
            lastName: 'giwa',
            email: 'tobias@gmail.com',
            isAdmin: true,
            createdPolls: [
                {
                    title: 'Favourite Food',
                    description: 'voting to choose our favourite food',
                    choices: [
                        {
                            id: '5014ae5c-ad7d-4031-8c19-c2a3c1dadba3',
                            name: 'Rice'
                        },
                        {
                            id: 'dc20cbfd-cc92-45bc-a582-adbb5cae7f8b',
                            name: 'Beans'
                        }
                    ]
                }
            ]
        }
    ])
};
