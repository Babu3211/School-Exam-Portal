// Presentation-only navigation. Existing Firebase permissions and save flows stay unchanged.
const groups=[
 ['Overview',['School Data Overview']],
 ['Students',['Students','Student Subject Assignment']],
 ['Staff',['Staff / Teacher','Teacher / Viewer Accounts','Teacher Assignments']],
 ['Subjects',['Subjects']],
 ['Attendance',['Daily Attendance']],
 ['Examination',['Exam Terms','Marks Entry']],
 ['Reports',['Marks Ledger']]
];
const dashboard=document.getElementById('dashboard');
const nav=document.getElementById('workspaceNav');
const sections=Array.from(dashboard.querySelectorAll('section[aria-label]'));
const headings=new Map(sections.map(section=>[section.querySelector('h3')?.textContent?.trim(),section]));
let active='Overview';
const buttons=new Map();
for(const [name,titles] of groups){
 const button=document.createElement('button');button.type='button';button.textContent=name;button.setAttribute('aria-selected','false');
 button.onclick=()=>show(name);nav.append(button);buttons.set(name,button);
 for(const title of titles){const section=headings.get(title);if(section){section.classList.add('workspace-panel');section.dataset.workspace=name}}
}
function show(name){
 active=name;
 for(const section of sections){section.hidden=section.dataset.workspace!==name}
 for(const [key,button] of buttons){button.setAttribute('aria-selected',String(key===name))}
}
show(active);
