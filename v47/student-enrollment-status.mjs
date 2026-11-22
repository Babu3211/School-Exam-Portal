// Firestore student rules explicitly treat an omitted "active" field as true.
// Legacy V46 student documents may omit it. Only explicit true or omission is active;
// false or malformed values must fail closed before a complete-class marks review.
export function isActiveEnrolledStudent(student){
 return !!student&&typeof student==='object'&&!Array.isArray(student)&&
  (!Object.hasOwn(student,'active')||student.active===true);
}
