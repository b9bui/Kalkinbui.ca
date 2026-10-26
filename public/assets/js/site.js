(() => {
  "use strict";

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  const safeUrl = (value) => {
    const url = String(value || "").trim();
    if (/^(https?:\/\/|\/media\/uploads\/)/i.test(url)) return url;
    return "";
  };

  function inlineMarkdown(text) {
    let out = escapeHtml(text);
    out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
    out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
    return out;
  }

  function markdownToHtml(markdown) {
    const lines = String(markdown || "").replace(/\r/g, "").split("\n");
    const blocks = [];
    let paragraph = [];
    let list = [];

    const flushParagraph = () => {
      if (paragraph.length) {
        blocks.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
        paragraph = [];
      }
    };
    const flushList = () => {
      if (list.length) {
        blocks.push(`<ul>${list.map(item => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
        list = [];
      }
    };

    for (const line of lines) {
      const trimmed = line.trim();
      const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
      const bullet = trimmed.match(/^[-*]\s+(.+)$/);
      if (!trimmed) { flushParagraph(); flushList(); continue; }
      if (heading) {
        flushParagraph(); flushList();
        blocks.push(`<h${Math.min(heading[1].length + 1, 5)}>${inlineMarkdown(heading[2])}</h${Math.min(heading[1].length + 1, 5)}>`);
      } else if (bullet) {
        flushParagraph();
        list.push(bullet[1]);
      } else {
        flushList();
        paragraph.push(trimmed);
      }
    }
    flushParagraph(); flushList();
    return blocks.join("\n");
  }

  function bodySections(markdown) {
    const lines = String(markdown || "").replace(/\r/g, "").split("\n");
    const sections = [];
    let current = { title: "Overview", lines: [] };
    for (const line of lines) {
      const heading = line.trim().match(/^##\s+(.+)$/);
      if (heading) {
        if (current.lines.some(item => item.trim())) sections.push(current);
        current = { title: heading[1].trim(), lines: [] };
      } else {
        current.lines.push(line);
      }
    }
    if (current.lines.some(item => item.trim())) sections.push(current);
    return sections;
  }

  function visualClass(project) {
    const text = `${project.slug} ${project.category}`.toLowerCase();
    if (/optic|payload|thermal|swir|lwir/.test(text)) return "visual-optics";
    if (/guild|software|app|code/.test(text)) return "visual-code";
    return "visual-arm";
  }

  function projectCard(project, index, featured) {
    const visual = visualClass(project);
    const cover = safeUrl(project.cover);
    const number = String(index + 1).padStart(2, "0");
    const visualInner = visual === "visual-optics"
      ? '<div class="optic-rings" aria-hidden="true"><i></i><i></i><i></i></div>'
      : visual === "visual-code"
        ? '<div class="code-lines" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>'
        : '<div class="arm-diagram" aria-hidden="true"><span></span><span></span><span></span><i></i></div>';
    const visualStyle = cover ? ` style="background-image:linear-gradient(180deg,rgba(20,23,25,.08),rgba(20,23,25,.45)),url('${escapeHtml(cover)}');background-size:cover;background-position:center"` : "";
    const linkText = featured ? "Explore project" : "View project";
    return `<article class="project-card${featured ? " project-card-featured" : ""}">
      <a class="project-visual ${visual}" href="${project.url}"${visualStyle}>
        <span class="visual-label">${escapeHtml((project.category || "PROJECT").toUpperCase())} / ${number}</span>${visualInner}
      </a>
      <div class="project-card-body">
        <div class="project-meta"><span>${escapeHtml((project.category || "PROJECT").toUpperCase())}</span><span>${number}${featured ? ` / ${String(index + 1).padStart(2, "0")}` : ""}</span></div>
        <h3>${escapeHtml(project.title)}</h3>
        <p>${escapeHtml(project.description)}</p>
        <a href="${project.url}" class="card-link">${linkText} <span>↗</span></a>
      </div>
    </article>`;
  }

  function renderProjectBody(container, markdown) {
    const sections = bodySections(markdown);
    if (!sections.length) {
      container.innerHTML = '<div class="eyebrow">OVERVIEW</div><p>Project details coming soon.</p>';
      return;
    }
    container.innerHTML = sections.map((section, index) => {
      const content = markdownToHtml(section.lines.join("\n"));
      if (index === 0) {
        return `<div class="eyebrow">${escapeHtml(section.title.toUpperCase())}</div>${content}`;
      }
      return `<div class="project-body-section"><div class="eyebrow">${escapeHtml(section.title.toUpperCase())}</div><h2>${escapeHtml(section.title)}</h2>${content}</div>`;
    }).join("\n");
  }

  async function loadProjects() {
    try {
      const response = await fetch("/projects.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`Could not load project content (${response.status}).`);
      const projects = await response.json();
      if (!Array.isArray(projects)) throw new Error("Project index has an unexpected format.");

      const list = document.querySelector(".projects-list");
      if (list) {
        list.innerHTML = projects.map((project, index) => projectCard(project, index, false)).join("\n");
        document.querySelectorAll(".sample-note").forEach(el => el.remove());
      }
      const featured = document.querySelector("#featured-projects");
      if (featured) {
        featured.innerHTML = projects.slice(0, 3).map((project, index) => projectCard(project, index, true)).join("\n");
        const note = featured.parentElement?.querySelector(".sample-note");
        if (note) note.remove();
      }

      const detail = document.querySelector("[data-project-detail]");
      if (detail) {
        const slug = location.pathname.split("/").filter(Boolean).pop();
        const project = projects.find(item => item.slug === slug);
        if (!project) {
          detail.innerHTML = '<a class="back-link" href="/projects/">← All projects</a><h1>Project not found.</h1><p class="page-intro">This project may have been removed or renamed.</p>';
          return;
        }
        document.title = `${project.title} — Kalkin Bui`;
        const title = detail.querySelector("[data-project-title]");
        const words = String(project.title || "Project").trim().split(/\s+/);
        const firstLine = words.length > 2 ? words.slice(0, 1).join(" ") : words.slice(0, 1).join(" ");
        const secondLine = words.length > 1 ? words.slice(1).join(" ") : "";
        if (title) title.innerHTML = `${escapeHtml(firstLine)}${secondLine ? `<br><span class="muted-heading">${escapeHtml(secondLine)}.</span>` : "."}`;
        const description = detail.querySelector("[data-project-description]");
        if (description) description.textContent = project.description || "";
        detail.querySelectorAll("[data-project-category]").forEach(el => el.textContent = project.category || "Project");
        detail.querySelectorAll("[data-project-status]").forEach(el => el.textContent = project.status || "Case study");
        const categoryNote = detail.querySelector("[data-project-category-note]");
        if (categoryNote) categoryNote.textContent = project.category || "Project";
        const statusNote = detail.querySelector("[data-project-status-note]");
        if (statusNote) statusNote.textContent = project.status || "In progress";
        const visual = detail.querySelector("[data-project-visual]");
        if (visual) {
          visual.classList.add(visualClass(project));
          const label = visual.querySelector("[data-project-visual-label]");
          if (label) label.textContent = `${(project.category || "PROJECT").toUpperCase()} / CASE STUDY`;
          const cover = safeUrl(project.cover);
          if (cover) {
            visual.style.backgroundImage = `linear-gradient(180deg,rgba(20,23,25,.08),rgba(20,23,25,.45)),url("${cover.replace(/"/g, "%22")}")`;
            visual.style.backgroundSize = "cover";
            visual.style.backgroundPosition = "center";
          }
          const arm = visual.querySelector("[data-visual-arm]");
          const optics = visual.querySelector("[data-visual-optics]");
          const code = visual.querySelector("[data-visual-code]");
          if (arm) arm.hidden = visualClass(project) !== "visual-arm";
          if (optics) optics.hidden = visualClass(project) !== "visual-optics";
          if (code) code.hidden = visualClass(project) !== "visual-code";
        }
        const body = detail.querySelector("[data-project-body]");
        if (body) renderProjectBody(body, project.body);
        const linkRow = detail.querySelector("[data-project-link-row]");
        const projectLink = detail.querySelector("[data-project-link]");
        const externalLink = safeUrl(project.project_url);
        if (linkRow && projectLink && externalLink) {
          linkRow.hidden = false;
          projectLink.href = externalLink;
        } else if (linkRow) {
          linkRow.hidden = true;
        }
      }
    } catch (error) {
      console.error("Portfolio content could not be loaded:", error);
    }
  }

  async function loadAboutAndSettings() {
    try {
      const [aboutResponse, settingsResponse] = await Promise.all([
        fetch("/about.json", { cache: "no-store" }),
        fetch("/settings.json", { cache: "no-store" })
      ]);
      if (aboutResponse.ok) {
        const about = await aboutResponse.json();
        const heading = document.querySelector("[data-about-headline]");
        if (heading && about.headline) {
          const parts = about.headline.split(/\s+—\s+/);
          if (parts.length === 2) {
            heading.innerHTML = `${escapeHtml(parts[0])}<br><span class="muted-heading">${escapeHtml(parts[1])}</span>`;
          } else {
            const words = about.headline.split(/\s+/);
            const midpoint = Math.max(1, Math.ceil(words.length / 2));
            heading.innerHTML = `${escapeHtml(words.slice(0, midpoint).join(" "))}<br><span class="muted-heading">${escapeHtml(words.slice(midpoint).join(" "))}</span>`;
          }
        }
        const intro = document.querySelector("[data-about-intro]");
        const body = document.querySelector("[data-about-body]");
        if (intro && about.intro) intro.textContent = about.intro;
        if (body && about.body) body.innerHTML = markdownToHtml(about.body);
      }
      if (settingsResponse.ok) {
        const settings = await settingsResponse.json();
        if (settings.email) {
          document.querySelectorAll("[data-contact-link]").forEach(el => el.href = `mailto:${settings.email}`);
          document.querySelectorAll('a[href^="mailto:"]').forEach(el => {
            if (el.textContent.toLowerCase().includes("get in touch") || el.textContent.toLowerCase().includes("conversation")) el.href = `mailto:${settings.email}`;
          });
        }
      }
    } catch (error) {
      console.error("Portfolio profile content could not be loaded:", error);
    }
  }

  document.querySelectorAll("[data-year]").forEach(el => { el.textContent = new Date().getFullYear(); });
  loadProjects();
  loadAboutAndSettings();
})();
