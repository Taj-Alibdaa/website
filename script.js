// ===== Fix Google Drive images =====
function convertDriveLink(url){
if(!url) return "";

if(url.includes("drive.google.com")){
let id = "";

if(url.includes("/d/")){
id = url.split("/d/")[1].split("/")[0];
}

if(url.includes("id=")){
id = url.split("id=")[1];
}

if(id){
return "https://drive.google.com/uc?export=view&id=" + id;
}
}

return url;
}


// ===== Fix project title =====
function getProjectTitle(project){

return (
project.title ||
project.name ||
project.projectName ||
project.project_title ||
"بدون عنوان"
);

}


// ===== Render projects =====
function renderProjects(projects){

const container = document.getElementById("projects-grid");
if(!container) return;

container.innerHTML = "";

projects.forEach(project => {

const title = getProjectTitle(project);
const image = convertDriveLink(project.image || project.img || "");

const card = document.createElement("div");
card.className = "project-card";

card.innerHTML = `
<img src="${image}" loading="lazy">
<h3>${title}</h3>
`;

container.appendChild(card);

});

}


// ===== Fix async signature / stamp =====
document.addEventListener("DOMContentLoaded", function(){

const signature = document.getElementById("signature");
const stamp = document.getElementById("stamp");

if(signature){
signature.style.display = "block";
}

if(stamp){
stamp.style.display = "block";
}

});
