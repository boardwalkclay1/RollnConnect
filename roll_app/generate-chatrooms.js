// ---------------------------------------------
// Roll ’n Connect Chatroom Auto‑Generator
// Generates: city pages, discipline pages, 56 chatrooms
// ---------------------------------------------

const fs = require("fs");
const path = require("path");

// Cities
const cities = [
  "atlanta",
  "losangeles",
  "chicago",
  "newyork",
  "detroit",
  "miami",
  "houston"
];

// Disciplines
const disciplines = [
  "longboard",
  "downhill",
  "street",
  "roller",
  "inline",
  "cruising",
  "beginners",
  "rinks"
];

// Load templates
const cityTemplate = fs.readFileSync("./chat_templates/city-template.html", "utf8");
const disciplineTemplate = fs.readFileSync("./chat_templates/discipline-template.html", "utf8");
const chatroomTemplate = fs.readFileSync("./chat_templates/chatroom-template.html", "utf8");

// Output folder
const outputDir = "./";
console.log("Generating chat system...");

// Generate city pages
cities.forEach(city => {
  const cityName = city.charAt(0).toUpperCase() + city.slice(1);
  const html = cityTemplate
    .replace(/{{CITY}}/g, city)
    .replace(/{{CITYNAME}}/g, cityName);

  fs.writeFileSync(path.join(outputDir, `chat-city-${city}.html`), html);
  console.log(`Created chat-city-${city}.html`);
});

// Generate discipline pages
cities.forEach(city => {
  const cityName = city.charAt(0).toUpperCase() + city.slice(1);

  let disciplineButtons = "";
  disciplines.forEach(d => {
    disciplineButtons += `
      <div class="disc-card" onclick="location.href='chat-room-${city}-${d}.html'">
        ${d.charAt(0).toUpperCase() + d.slice(1).replace(/-/g, " ")}
      </div>
    `;
  });

  const html = disciplineTemplate
    .replace(/{{CITY}}/g, city)
    .replace(/{{CITYNAME}}/g, cityName)
    .replace("{{DISCIPLINE_BUTTONS}}", disciplineButtons);

  fs.writeFileSync(path.join(outputDir, `chat-city-${city}.html`), html);
  console.log(`Updated chat-city-${city}.html with disciplines`);
});

// Generate chatroom pages
cities.forEach(city => {
  const cityName = city.charAt(0).toUpperCase() + city.slice(1);

  disciplines.forEach(d => {
    const disciplineName = d.charAt(0).toUpperCase() + d.slice(1).replace(/-/g, " ");

    const html = chatroomTemplate
      .replace(/{{CITY}}/g, city)
      .replace(/{{CITYNAME}}/g, cityName)
      .replace(/{{DISCIPLINE}}/g, d)
      .replace(/{{DISCIPLINENAME}}/g, disciplineName);

    fs.writeFileSync(path.join(outputDir, `chat-room-${city}-${d}.html`), html);
    console.log(`Created chat-room-${city}-${d}.html`);
  });
});

console.log("✔ All chat pages generated successfully!");
