import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
for(const message of ['Loading your assignment...','Subjects appear after assignment loads','No classes available','Assignment or permission unavailable','No subjects available','No assessment settings for this class']){
 assert.ok(html.includes(message),'Expected English dropdown message: '+message);
}
for(const legacy of ['तपाईंको Assignment लोड हुँदैछ...','Assignment लोड भएपछि विषय देखिन्छ','कक्षा उपलब्ध छैन','Assignment/अनुमति उपलब्ध छैन','विषय उपलब्ध छैन','यस कक्षाको Assessment Settings भेटिएन']){
 assert.ok(!html.includes(legacy),'Legacy Nepali dropdown message remains: '+legacy);
}
assert.ok(html.includes('classEnglishLabel(x)'),'Class display helper must remain');
assert.ok(html.includes('subjectEnglishLabel(x)'),'Subject display helper must remain');
console.log('V46 English dropdown status text regression passed.');
