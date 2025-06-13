window.onload=()=>{
  const first=document.querySelector("nav li")
  activate(first,'home')
}

function activate(element, sectionId) {
  showSection(sectionId);

  const selector = document.getElementById("nav-selector");
  const rect = element.getBoundingClientRect();
  const parentRect = element.parentElement.getBoundingClientRect();

  selector.style.left = (rect.left - parentRect.left+10) + "px";
  selector.style.width = rect.width + "px";
  document.querySelectorAll('nav li').forEach(li=>{
    li.style.fontWeight="normal"
  })
  element.style.fontWeight="bold"
}

function showSection(id){
  document.querySelectorAll('.section').forEach(sec=>{
    sec.classList.add('hidden');
  });
  document.getElementById(id).classList.remove('hidden')
}


async function openChat(){
  try{
  console.log("Open chat triggered")
  const screenText=document.body.innerText

  const response=await fetch("http://localhost:3000/chat",{
    method:"POST",
    headers: { "Content-Type":"application/json"},
    body: JSON.stringify({screenText })
  });
  const data=await response.json();
  alert("🤖"+data.reply);
  }
  catch(err){
    console.error("Error from /caht:",err);
  }
}
