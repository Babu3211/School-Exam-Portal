// Stable term identifiers shared by V47 mark entry and exam validation.
export const EXAM_TERMS=Object.freeze(['weekly','monthly','1st','2nd','3rd','final']);
export function validateExamTerm(term){if(!EXAM_TERMS.includes(term))throw new Error('Unsupported exam term');return term;}
