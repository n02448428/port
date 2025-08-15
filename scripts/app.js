let isGrid=false;
const content=document.getElementById('content');
const toggle=document.getElementById('toggleView');
const modeBtn=document.getElementById('toggleMode');
const yearText=document.getElementById('yearText');

let expandedCard=null;

const sampleData=[
  {
    "id":"2025-001",
    "title":"Celestial Fragments",
    "date":"2025-07-12",
    "type":"Music",
    "mini":[
      {"media_type":"image","src":"https://via.placeholder.com/300"},
      {"media_type":"audio","src":"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"}
    ]
  },
  {
    "id":"2024-015",
    "title":"Unwritten Poem",
    "date":"2024-02-18",
    "type":"Poetry",
    "mini":[
      {"media_type":"text","content":"A stanza without words."}
    ]
  }
];

function renderProjects(data){
  content.innerHTML='';
  content.className=isGrid?'grid':'';
  
  data.sort((a,b)=>new Date(b.date)-new Date(a.date));
  data.forEach(proj=>{
    const card=document.createElement('div');
    card.className='card';
    card.innerHTML=`<strong>${proj.title}</strong> ${proj.date} [${proj.type}]`;
    
    // Mini modules hidden initially
    const miniContainer=document.createElement('div');
    miniContainer.className='miniContainer';
    proj.mini.forEach(m=>{
      const mini=document.createElement('div');
      mini.className='mini';
      if(m.media_type==='image') mini.innerHTML=`<img src="${m.src}" style="width:100%;">`;
      if(m.media_type==='audio') mini.innerHTML=`<audio src="${m.src}" controls muted></audio>`;
      if(m.media_type==='text') mini.innerHTML=`<p>${m.content}</p>`;
      miniContainer.appendChild(mini);
    });
    card.appendChild(miniContainer);
    
    // Expand / Collapse
    card.addEventListener('click',()=>{
      if(expandedCard && expandedCard!==card){
        expandedCard.classList.remove('expanded');
      }
      const isExpanded=card.classList.toggle('expanded');
      expandedCard=isExpanded?card:null;
    });
    
    // Close button
    const closeBtn=document.createElement('span');
    closeBtn.className='closeBtn';
    closeBtn.innerHTML='×';
    closeBtn.addEventListener('click',e=>{
      e.stopPropagation();
      card.classList.remove('expanded');
      expandedCard=null;
    });
    card.appendChild(closeBtn);
    
    content.appendChild(card);
  });
}

// Initial render
renderProjects(sampleData);

// Toggle View
toggle.addEventListener('click',()=>{isGrid=!isGrid; renderProjects(sampleData);});

// Dark/Light mode
modeBtn.addEventListener('click',()=>{
  document.body.classList.toggle('light');
  document.body.classList.toggle('dark');
});

// Year Label - updates on scroll
window.addEventListener('scroll',()=>{
  const modules=document.querySelectorAll('.card');
  for(const mod of modules){
    const rect=mod.getBoundingClientRect();
    if(rect.top<window.innerHeight/2 && rect.bottom>window.innerHeight/2){
      const year=new Date(mod.innerText.split(' ')[1]).getFullYear();
      yearText.innerText=year;
      break;
    }
  }
});
