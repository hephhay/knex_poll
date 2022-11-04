import { addCRUD } from '../generator';
import { Choice, ChoiceTC, schemaComposer } from '../models';

addCRUD(schemaComposer, Choice,  ChoiceTC);

schemaComposer.Query.addFields({
    findChoices: ChoiceTC.getResolver('findMany'),
    findOneChoices : ChoiceTC.getResolver('findOne')
});

schemaComposer.Mutation.addFields({
    createOneChoice: ChoiceTC.getResolver('createOne')
});``