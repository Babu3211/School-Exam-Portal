export const EXAM_TERMS=Object.freeze(['1st','2nd','final']);
export function validateExamTerm(term){if(!EXAM_TERMS.includes(term))throw new Error('Unsupported exam term');return term;}
