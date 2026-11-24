/** Public-domain original poems listed in the CDC English Grade 9
 * first edition (2022), printed pp. 8–9 and 45–46. These are original
 * literary works, not a reproduction of CDC's textbook exercises.
 * Source-specific SMSS questions are newly written and unreviewed.
 * The 10-mark seen prose group still requires an authorized passage.
 */
export const SEEN_BOOK='https://giwmscdnone.gov.np/media/pdf_upload/English%20Grade-9_yoc9xcn.pdf';
const item=(domain,text,answer)=>({type:'short_answer',domain,text,answer,marks:1});
const poems=[
 {unit:0,sourcePage:8,title:'Stopping by Woods on a Snowy Evening',author:'Robert Frost',publicationYear:1923,passage:`Whose woods these are I think I know.
His house is in the village though;
He will not see me stopping here
To watch his woods fill up with snow.

My little horse must think it queer
To stop without a farmhouse near
Between the woods and frozen lake
The darkest evening of the year.

He gives his harness bells a shake
To ask if there is some mistake.
The only other sound's the sweep
Of easy wind and downy flake.

The woods are lovely, dark and deep,
But I have promises to keep,
And miles to go before I sleep,
And miles to go before I sleep.`,
 items:[item('literal','Which animal accompanies the speaker?','A horse.'),item('literal','Where does the owner of the woods live?','In the village.'),item('literal','What sound comes from the horse?','The shaking of its harness bells.'),item('reorganization','Name two features of the surroundings that make the stop unusual.','A frozen lake and no farmhouse nearby (accept darkness or snowy woods).'),item('inference','Why does the speaker decide to continue despite enjoying the scene?','The speaker has duties or promises to fulfil and a journey to complete.')]},
 {unit:3,sourcePage:45,title:'Crossing the Bar',author:'Alfred, Lord Tennyson',publicationYear:1889,passage:`Sunset and evening star,
And one clear call for me!
And may there be no moaning of the bar,
When I put out to sea,

But such a tide as moving seems asleep,
Too full for sound and foam,
When that which drew from out the boundless deep
Turns again home.

Twilight and evening bell,
And after that the dark!
And may there be no sadness of farewell,
When I embark;

For tho' from out our bourne of Time and Place
The flood may bear me far,
I hope to see my Pilot face to face
When I have crost the bar.`,
 items:[item('literal','Which celestial object appears at the start of the poem?','The evening star (accept the setting sun).'),item('literal','What sound does the speaker hear at twilight?','The evening bell.'),item('literal','Whom does the speaker hope to meet after the crossing?','The Pilot.'),item('reorganization','What two kinds of disturbance does the speaker hope to avoid during departure?','Noise from the bar and sadness at farewell.'),item('inference','What attitude towards the final journey is conveyed by the speaker’s wishes?','A calm or hopeful acceptance rather than panic or distress.')]}
];
export function englishSeenPoemDrafts({grade,subject,units}={}){
 if(grade!==9||!Array.isArray(units)||units.length<4)return [];
 return poems.map(({unit,...poem},v)=>{const u=units[unit];return {id:'smss_eng_seen1_'+v,gradeNumber:9,subject,unitCode:u.unitCode,unitId:u.id,unitTitle:u.unitTitle,topicId:u.id+'_1',topicName:u.topics[1],slot:'reading1',marks:5,genre:'poem',text:'Read '+poem.title+' by '+poem.author+' and answer the questions.',...poem,sourceKind:'textbook',sourceTitle:'English Grade 9',sourceEdition:'2022 first edition',sourceUrl:SEEN_BOOK,passageRights:'public_domain_original',status:'active',bundled:true,teacherReviewRequired:true,reviewStatus:'draft',officialCdcQuestion:false,sourceStatus:'SMSS_original_reference_draft'};});
}
// The source has copyright-protected editorial content. Do not bundle
// modern textbook prose, substitute a paraphrase as a seen text or fake
// teacher review. These original questions are ready to pair with the
// corresponding authorized excerpt, but are not eligible bank rows yet.
export const SEEN_PROSE_PENDING=Object.freeze({
 title:'The Ant and the Grasshopper',author:'W. Somerset Maugham',sourcePage:108,sourceUrl:SEEN_BOOK,
 reason:'Exact authorized excerpt and page alignment must be supplied and checked before activating the 10-mark seen group.',
 requiredMarks:10,requiredTypes:2,requiredWords:200,
 items:Object.freeze([
 {type:'true_false',domain:'literal',text:'Tom left both his office and his wife.',answer:'True',marks:1},
 {type:'true_false',domain:'literal',text:'Tom spent two years travelling in Europe.',answer:'True',marks:1},
 {type:'true_false',domain:'literal',text:'Tom supported his lifestyle entirely through his own work.',answer:'False',marks:1},
 {type:'true_false',domain:'literal',text:'George sometimes gave Tom money for a fresh start.',answer:'True',marks:1},
 item('reorganization','Name two expensive things Tom bought after receiving money from George.','A car and jewellery.'),
 item('reorganization','Describe two ways Tom obtained money.','Borrowing from friends and receiving money from George.'),
 item('reorganization','How did the brothers differ in their attitude toward responsibility?','George was serious and respectable; Tom avoided work and sought pleasure.'),
 item('inference','Why were Tom’s relatives concerned about his spending?','They doubted how he would support himself after spending his money.'),
 item('inference','Why did George initially continue to support Tom?','He hoped Tom would change and start again.'),
 item('evaluation','Was giving Tom more money an effective way to help him become responsible? Explain using the events in the passage.','No, the money was used for luxuries rather than a lasting fresh start; accept a reasoned response supported by the passage.')
 ])
});
