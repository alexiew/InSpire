// ABOUTME: Blog RSS/Atom feed parsing and article text extraction.
// ABOUTME: Provides feed parsing, fetching, and article content extraction via summarize CLI.

import { execFile } from "child_process";

export interface BlogArticle {
  guid: string;
  title: string;
  url: string;
}

export interface BlogFeed {
  title: string;
  articles: BlogArticle[];
}

export function parseBlogFeed(xml: string): BlogFeed {
  const isAtom = /<feed[\s>]/i.test(xml);

  if (isAtom) {
    return parseAtomFeed(xml);
  }

  return parseRssFeed(xml);
}

function parseRssFeed(xml: string): BlogFeed {
  const channelContent = xml.replace(/<item>[\s\S]*$/m, "");
  const titleMatch = channelContent.match(/<title>([\s\S]*?)<\/title>/);
  const title = titleMatch?.[1]?.trim() || "";

  const articles: BlogArticle[] = [];
  const itemRegex = /<item>[\s\S]*?<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[0];

    const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
    if (!linkMatch) continue;

    const url = linkMatch[1].trim();
    const itemTitleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
    const guidMatch = item.match(/<guid[^>]*>([\s\S]*?)<\/guid>/);

    articles.push({
      guid: guidMatch?.[1]?.trim() || url,
      title: itemTitleMatch?.[1]?.trim() || "",
      url,
    });
  }

  return { title, articles };
}

function parseAtomFeed(xml: string): BlogFeed {
  // Extract feed title (before first <entry>)
  const feedContent = xml.replace(/<entry[\s>][\s\S]*$/m, "");
  const titleMatch = feedContent.match(/<title>([\s\S]*?)<\/title>/);
  const title = titleMatch?.[1]?.trim() || "";

  const articles: BlogArticle[] = [];
  const entryRegex = /<entry>[\s\S]*?<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[0];

    const linkMatch = entry.match(/<link[^>]+href="([^"]+)"/);
    if (!linkMatch) continue;

    const url = linkMatch[1];
    const entryTitleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
    const idMatch = entry.match(/<id>([\s\S]*?)<\/id>/);

    articles.push({
      guid: idMatch?.[1]?.trim() || url,
      title: entryTitleMatch?.[1]?.trim() || "",
      url,
    });
  }

  return { title, articles };
}

export async function fetchBlogFeed(feedUrl: string): Promise<BlogFeed> {
  const res = await fetch(feedUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch blog feed: ${res.status}`);
  }
  const xml = await res.text();

  if (!/<rss|<feed/i.test(xml)) {
    throw new Error("URL does not appear to be an RSS or Atom feed");
  }

  return parseBlogFeed(xml);
}

export function parsePageTitle(html: string): string {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  return match?.[1]?.trim() || "";
}

export async function fetchPageTitle(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) return "";
  const html = await res.text();
  return parsePageTitle(html);
}

export function fetchArticleText(articleUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "summarize",
      [articleUrl, "--extract"],
      { maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
          return;
        }
        const text = stdout.trim();
        if (!text) {
          reject(new Error("Empty article text returned"));
          return;
        }
        resolve(text);
      }
    );
  });
}
