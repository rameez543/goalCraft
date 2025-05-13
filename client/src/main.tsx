import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add meta tags for SEO
const metaDescription = document.createElement('meta');
metaDescription.name = 'description';
metaDescription.content = 'TaskBreaker - Break down your goals into manageable tasks with AI assistance. Increase productivity and accomplish more.';
document.head.appendChild(metaDescription);

// Add title
const titleElement = document.createElement('title');
titleElement.textContent = 'TaskBreaker - AI Task Breakdown';
document.head.appendChild(titleElement);

// Add Open Graph meta tags
const ogTitle = document.createElement('meta');
ogTitle.property = 'og:title';
ogTitle.content = 'TaskBreaker - AI Task Breakdown';
document.head.appendChild(ogTitle);

const ogDescription = document.createElement('meta');
ogDescription.property = 'og:description';
ogDescription.content = 'Break down your goals into manageable tasks with AI assistance. Increase productivity and accomplish more.';
document.head.appendChild(ogDescription);

const ogType = document.createElement('meta');
ogType.property = 'og:type';
ogType.content = 'website';
document.head.appendChild(ogType);

createRoot(document.getElementById("root")!).render(<App />);
