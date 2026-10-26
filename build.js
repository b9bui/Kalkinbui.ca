const fs = require("fs");
const path = require("path");

const PUBLIC = path.join(__dirname, "public");
const CONTENT = path.join(PUBLIC, "content");
const PROJECTS_DIR = path.join(CONTENT, "projects");

function scalar(value) {
  value = value.trim();
  if (!value) return "";
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    const inner = value.slice(1, -1);
    return value[0] === '"' ? inner.replace(/\\"/g, '"').replace(/\\n/g, "\n") : inner.replace(/''/g, "'");
  }
  if (value === "null" || value === "~") return "";
  return value;
}

function parseMarkdownFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const match = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n)?([\s\S]*)$/);
  const fields = {};
  let body = raw;
  if (match) {
    body = match[2] || "";
    const lines = match[1].split(/\r?\n/);
    let previousKey = null;
    for (const line of lines) {
      const m = line.match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
      if (m) {
        previousKey = m[1];
        fields[previousKey] = scalar(m[2] || "");
      } else if (/^\s+/.test(line) && previousKey && line.trim()) {
        fields[previousKey] += (fields[previousKey] ? " " : "") + line.trim();
      } else if (!line.trim()) {
        previousKey = null;
      }
    }
  }
  return { fields, body: body.trim() };
}

function slugify(value) {
  return String(value || "")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function main() {
  if (!fs.existsSync(PROJECTS_DIR)) throw new Error("Missing public/content/projects directory.");
  const files = fs.readdirSync(PROJECTS_DIR).filter(name => name.endsWith(".md")).sort();
  const projects = files.map(file => {
    const parsed = parseMarkdownFile(path.join(PROJECTS_DIR, file));
    const fields = parsed.fields;
    const slug = path.basename(file, ".md");
    return {
      slug,
      title: fields.title || slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      description: fields.description || "",
      category: fields.category || "Project",
      status: fields.status || "",
      cover: fields.cover || "",
      project_url: fields.project_url || "",
      body: parsed.body,
      url: `/projects/${slug}/`
    };
  });

  fs.writeFileSync(path.join(PUBLIC, "projects.json"), JSON.stringify(projects, null, 2) + "\n");
  const templatePath = path.join(PUBLIC, "project-template.html");
  if (!fs.existsSync(templatePath)) throw new Error("Missing public/project-template.html.");
  const template = fs.readFileSync(templatePath, "utf8");
  for (const project of projects) {
    const dir = path.join(PUBLIC, "projects", project.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), template);
  }

  const aboutPath = path.join(CONTENT, "about.md");
  if (fs.existsSync(aboutPath)) {
    const about = parseMarkdownFile(aboutPath);
    fs.writeFileSync(path.join(PUBLIC, "about.json"), JSON.stringify({
      headline: about.fields.headline || "",
      intro: about.fields.intro || "",
      body: about.body
    }, null, 2) + "\n");
  }
  const settingsPath = path.join(CONTENT, "settings.yml");
  if (fs.existsSync(settingsPath)) {
    const settings = {};
    let lastKey = null;
    for (const line of fs.readFileSync(settingsPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (m) { settings[m[1]] = scalar(m[2]); lastKey = m[1]; }
      else if (/^\s+/.test(line) && lastKey && line.trim()) settings[lastKey] += " " + line.trim();
    }
    fs.writeFileSync(path.join(PUBLIC, "settings.json"), JSON.stringify(settings, null, 2) + "\n");
  }
  console.log(`Generated projects.json and ${projects.length} project pages.`);
}
main();
